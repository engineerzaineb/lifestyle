import re
from datetime import timedelta, datetime, time
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.db.models import Q, F, Exists, OuterRef
from django.contrib.postgres.search import SearchVector, SearchQuery, SearchRank
from .models import Event, Categorie, Tag, TypeBillet, EventView, Reservation
from .serializers import (
    EventListSerializer, EventDetailSerializer,
    CategorieSerializer, TagSerializer,
    ReservationReadSerializer, ReservationCreateSerializer,
)


# Mapping des mois français vers leur numéro
MOIS_FR = {
    'janvier': 1, 'fevrier': 2, 'février': 2, 'mars': 3, 'avril': 4,
    'mai': 5, 'juin': 6, 'juillet': 7, 'aout': 8, 'août': 8,
    'septembre': 9, 'octobre': 10, 'novembre': 11, 'decembre': 12, 'décembre': 12,
}


# Folding d'accents (utilisé pour la détection de mois : "août" == "aout")
_ACCENTS = str.maketrans(
    'àâäéèêëîïôöùûüçÀÂÄÉÈÊËÎÏÔÖÙÛÜÇ',
    'aaaeeeeiioouuucAAAEEEEIIOOUUUC'
)


def strip_accents(text):
    """'théâtre' -> 'theatre'. O(n), aucune dépendance externe."""
    return text.translate(_ACCENTS) if text else text


# Permission : lecture pour tous, écriture pour organisateur/admin
# OU user avec demande en_attente (pour les brouillons uniquement)
class IsOrganisateurOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        if not (request.user and request.user.is_authenticated):
            return False

        # Admin et organisateurs : OK
        if request.user.role == 'admin' or request.user.is_organisateur:
            return True

        # User avec demande en_attente : autorisé à gérer ses brouillons
        # (création POST + modification/suppression de SES objets via has_object_permission)
        from users.models import DemandeOrganisateur
        has_pending = DemandeOrganisateur.objects.filter(
            user=request.user, statut='en_attente'
        ).exists()

        if has_pending:
            return True  # has_object_permission verrouille sur le propriétaire

        return False

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        if request.user.role == 'admin':
            return True
        # Le propriétaire peut modifier/supprimer ses propres events
        # (un user en_attente ne peut toucher qu'à ses brouillons)
        if obj.organisateur != request.user:
            return False
        # Sécurité : un user pas encore organisateur ne touche QUE ses brouillons
        if not request.user.is_organisateur and obj.statut != 'brouillon':
            return False
        return True


# Filtre par période (today, weekend, month)
def apply_date_filter(qs, period):
    now = timezone.now()

    if period == 'today':
        end_of_day = now.replace(hour=23, minute=59, second=59)
        return qs.filter(date_evenement__gte=now, date_evenement__lte=end_of_day)

    elif period == 'weekend':
        today = now.date()
        days_until_saturday = (5 - today.weekday()) % 7
        if days_until_saturday == 0 and today.weekday() != 5:
            days_until_saturday = 7
        saturday = today + timedelta(days=days_until_saturday)
        sunday = saturday + timedelta(days=1)

        sat_start = timezone.make_aware(datetime.combine(saturday, time.min))
        sun_end = timezone.make_aware(datetime.combine(sunday, time.max))
        return qs.filter(date_evenement__gte=sat_start, date_evenement__lte=sun_end)

    elif period == 'month':
        end_of_month = now + timedelta(days=30)
        return qs.filter(date_evenement__gte=now, date_evenement__lte=end_of_month)

    return qs


# Détecte un mois dans la requête.
# Règles : mot d'au moins 3 lettres ET (mot complet OU préfixe désignant
# au plus 2 mois — "jui" -> juin+juillet est acceptable, "ma" -> non).
def detect_months_in_query(query):
    if not query:
        return []

    words = strip_accents(query.lower().strip()).split()
    mois_ascii = {strip_accents(k): v for k, v in MOIS_FR.items()}
    matching_months = set()

    for word in words:
        if len(word) < 3:
            continue
        # Mois exact ("mars", "aout")
        if word in mois_ascii:
            matching_months.add(mois_ascii[word])
            continue
        # Préfixe : accepté seulement s'il désigne au plus 2 mois
        candidates = {v for k, v in mois_ascii.items() if k.startswith(word)}
        if 0 < len(candidates) <= 2:
            matching_months.update(candidates)

    return sorted(matching_months)


# Retire les mots identifiés comme mois (mêmes règles que detect_months_in_query)
def remove_months_from_query(query):
    if not query:
        return query

    mois_ascii = set(strip_accents(k) for k in MOIS_FR.keys())
    filtered = []

    for word in query.lower().strip().split():
        w = strip_accents(word)
        is_month = len(w) >= 3 and (
            w in mois_ascii
            or 0 < len({m for m in mois_ascii if m.startswith(w)}) <= 2
        )
        if not is_month:
            filtered.append(word)

    return ' '.join(filtered).strip()


# Construit un pattern regex sûr à partir de noms d'intérêts saisis par les users.
# re.escape() évite qu'un intérêt type "Rock (live)" ou "C++" casse la requête.
def build_interets_pattern(noms):
    return r'(' + '|'.join(re.escape(n) for n in noms) + r')'


class EventViewSet(viewsets.ModelViewSet):
    queryset = Event.objects.all()
    permission_classes = [IsOrganisateurOrReadOnly]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['statut']

    def get_serializer_class(self):
        if self.action == 'list':
            return EventListSerializer
        return EventDetailSerializer

    def get_queryset(self):
        qs = Event.objects.select_related('categorie', 'organisateur') \
                          .prefetch_related('tags', 'types_billets')
        user = self.request.user
        params = self.request.query_params

        # === FILTRES ===

        # === RECHERCHE TEXTUELLE (PostgreSQL full-text + unaccent) ===
        # - min 2 caractères
        # - mois détecté en AND avec le texte ("concert juillet" = concerts DE juillet)
        # - stemming français : "festivals" trouve "festival"
        # - insensible aux accents dans les deux sens
        q = (params.get('q') or '').strip()
        self._search_active = False

        if len(q) >= 2:
            mois_list = detect_months_in_query(q)
            q_texte = remove_months_from_query(q)

            if len(q_texte) >= 2:
                # Vecteur pondéré : titre (A) > ville/lieu/catégorie (B) > description (C)
                vector = (
                    SearchVector('titre', weight='A', config='french')
                    + SearchVector('ville', weight='B', config='french')
                    + SearchVector('lieu', weight='B', config='french')
                    + SearchVector('categorie__nom', weight='B', config='french')
                    + SearchVector('description', weight='C', config='french')
                )
                search_query = SearchQuery(q_texte, config='french', search_type='websearch')

                qs = qs.annotate(
                    search_rank=SearchRank(vector, search_query)
                ).filter(
                    # full-text OU sous-chaîne sans accents (rattrape les noms propres
                    # et les recherches partielles que le stemming ne couvre pas)
                    Q(search_rank__gt=0)
                    | Q(titre__unaccent__icontains=q_texte)
                    | Q(ville__unaccent__icontains=q_texte)
                    | Q(lieu__unaccent__icontains=q_texte)
                    | Q(tags__nom__unaccent__icontains=q_texte)
                    | Q(categorie__nom__unaccent__icontains=q_texte)
                ).distinct()

                self._search_active = True

            if mois_list:
                qs = qs.filter(date_evenement__month__in=mois_list)

        # Multi-catégories
        categorie = params.get('categorie')
        if categorie:
            categorie_slugs = [c.strip() for c in categorie.split(',') if c.strip()]
            if categorie_slugs:
                qs = qs.filter(categorie__slug__in=categorie_slugs)

        # Multi-villes
        ville = params.get('ville')
        if ville:
            villes_list = [v.strip() for v in ville.split(',') if v.strip()]
            if villes_list:
                ville_query = Q()
                for v in villes_list:
                    ville_query |= Q(ville__iexact=v)
                qs = qs.filter(ville_query)

        # Bons plans
        if params.get('has_bon_plan') == 'true' or params.get('bon_plan') == 'true':
            bon_plan_subquery = TypeBillet.objects.filter(
                event=OuterRef('pk'), is_bon_plan=True
            )
            qs = qs.annotate(has_bp=Exists(bon_plan_subquery)).filter(has_bp=True)

        # Tags
        tag = params.get('tag')
        if tag:
            tag_slugs = [t.strip() for t in tag.split(',') if t.strip()]
            if tag_slugs:
                qs = qs.filter(tags__slug__in=tag_slugs).distinct()

        # Prix
        prix_min = params.get('prix_min')
        prix_max = params.get('prix_max')
        if prix_min:
            try:
                qs = qs.filter(prix__gte=float(prix_min))
            except (ValueError, TypeError):
                pass
        if prix_max:
            try:
                qs = qs.filter(prix__lte=float(prix_max))
            except (ValueError, TypeError):
                pass

        # Filtre date prédéfini (today, weekend, month)
        date_period = params.get('date')
        if date_period:
            qs = apply_date_filter(qs, date_period)

        # Filtre date spécifique (YYYY-MM-DD)
        date_exacte = params.get('date_exacte')
        if date_exacte:
            try:
                target_date = datetime.strptime(date_exacte, '%Y-%m-%d').date()
                qs = qs.filter(date_evenement__date=target_date)
            except (ValueError, TypeError):
                pass

        # === FILTRAGE PAR RÔLE ===

        if not user.is_authenticated:
            qs = qs.filter(statut='publie', is_valide=True)
        elif user.role == 'admin':
            pass
        elif self.action == 'list':
            mes_events = params.get('mes_events')
            mes_brouillons = params.get('mes_brouillons')
            if mes_brouillons == 'true':
                qs = qs.filter(organisateur=user, statut='brouillon')
            elif mes_events == 'true':
                qs = qs.filter(organisateur=user)
            else:
                qs = qs.filter(statut='publie', is_valide=True)

        # === EXCLURE LES EVENTS PASSES PAR DEFAUT ===
        include_past = params.get('include_past') == 'true'
        is_mes_events = params.get('mes_events') == 'true'
        is_mes_brouillons = params.get('mes_brouillons') == 'true'
        is_admin = user.is_authenticated and user.role == 'admin'

        if not include_past and not is_mes_events and not is_mes_brouillons and not is_admin:
            now = timezone.now()
            qs = qs.filter(date_evenement__gte=now)

        # === TRI ===
        sort = params.get('sort')

        if sort == 'date_asc':
            qs = qs.order_by('date_evenement')
        elif sort == 'date_desc':
            qs = qs.order_by('-date_evenement')
        elif sort == 'price_asc':
            qs = qs.order_by(F('prix').asc(nulls_last=True))
        elif sort == 'price_desc':
            qs = qs.order_by(F('prix').desc(nulls_last=True))
        elif sort == 'popular':
            qs = qs.order_by(F('capacite').desc(nulls_last=True), '-created_at')
        else:
            # Pertinence : score du match si recherche active, sinon bons plans + date
            if getattr(self, '_search_active', False):
                qs = qs.order_by('-search_rank', 'date_evenement')
            else:
                bon_plan_subquery = TypeBillet.objects.filter(
                    event=OuterRef('pk'), is_bon_plan=True
                )
                qs = qs.annotate(
                    has_bon_plan_annot=Exists(bon_plan_subquery),
                ).order_by(
                    '-has_bon_plan_annot',
                    'date_evenement',
                )

        return qs

    # Empêche un user pas encore organisateur de soumettre autre chose qu'un brouillon.
    # Le serializer recalcule statut via is_draft : on force donc is_draft=True ici
    # directement dans validated_data pour ne pas dépendre du payload frontend.
    def perform_create(self, serializer):
        user = self.request.user
        is_organisateur = user.is_organisateur or user.role == 'admin'

        if not is_organisateur:
            serializer.validated_data['is_draft'] = True

        serializer.save(organisateur=user, is_valide=False)

    # GET /api/events/recommandations/
    # Recommandations personnalisées : intérêts + boost ville
    @action(
        detail=False,
        methods=['get'],
        url_path='recommandations',
        permission_classes=[permissions.IsAuthenticated]
    )
    def recommandations(self, request):
        user = request.user
        now = timezone.now()
        user_interets_noms = [
            i.nom.lower() for i in user.interets.filter(is_official=True)
        ]

        # Events publiés ET futurs uniquement
        base_qs = Event.objects.filter(
            statut='publie',
            is_valide=True,
            date_evenement__gte=now
        ).select_related('categorie', 'organisateur') \
         .prefetch_related('tags', 'types_billets')

        if user_interets_noms:
            pattern = build_interets_pattern(user_interets_noms)
            recommended = base_qs.filter(categorie__nom__iregex=pattern)
            if not recommended.exists() and user.ville:
                recommended = base_qs.filter(ville__iexact=user.ville)
            if not recommended.exists():
                recommended = base_qs
        elif user.ville:
            recommended = base_qs.filter(ville__iexact=user.ville)
        else:
            recommended = base_qs

        # Boost ville (events de la ville du user en premier)
        if user.ville:
            same_city = list(recommended.filter(ville__iexact=user.ville)[:10])
            other_city = list(recommended.exclude(ville__iexact=user.ville)[:10])
            results = same_city + other_city
        else:
            results = list(recommended[:20])

        results = results[:20]
        serializer = EventListSerializer(results, many=True, context={'request': request})
        return Response({'results': serializer.data, 'count': len(results)})

    # POST /api/events/{id}/track-view/
    # Enregistre une vue (anonyme ou authentifié). Déduplique si même user < 1h.
    @action(
        detail=True,
        methods=['post'],
        url_path='track-view',
        permission_classes=[permissions.AllowAny],
    )
    def track_view(self, request, pk=None):
        event = self.get_object()

        # Déduplication : même user (ou même IP anon) < 1h => on ne recompte pas
        cutoff = timezone.now() - timedelta(hours=1)
        ip = request.META.get('HTTP_X_FORWARDED_FOR', request.META.get('REMOTE_ADDR', ''))
        ip = ip.split(',')[0].strip() if ip else None

        recent_filter = {'event': event, 'viewed_at__gte': cutoff}
        if request.user.is_authenticated:
            recent_filter['user'] = request.user
        else:
            recent_filter['user__isnull'] = True
            recent_filter['ip_address'] = ip

        if not EventView.objects.filter(**recent_filter).exists():
            EventView.objects.create(
                event=event,
                user=request.user if request.user.is_authenticated else None,
                ip_address=ip,
                user_agent=request.META.get('HTTP_USER_AGENT', '')[:255],
            )

        return Response({'vues': event.vues_count})

    # GET /api/events/decouvertes/
    # Events de catégories hors intérêts du user (élargir les horizons)
    @action(
        detail=False,
        methods=['get'],
        url_path='decouvertes',
        permission_classes=[permissions.IsAuthenticated]
    )
    def decouvertes(self, request):
        user = request.user
        now = timezone.now()
        user_interets_noms = [
            i.nom.lower() for i in user.interets.filter(is_official=True)
        ]

        base_qs = Event.objects.filter(
            statut='publie',
            is_valide=True,
            date_evenement__gte=now
        ).select_related('categorie', 'organisateur') \
         .prefetch_related('tags', 'types_billets')

        if user_interets_noms:
            pattern = build_interets_pattern(user_interets_noms)
            decouvertes = base_qs.exclude(categorie__nom__iregex=pattern)
        else:
            decouvertes = base_qs

        if user.ville:
            same_city = list(decouvertes.filter(ville__iexact=user.ville)[:6])
            other_city = list(decouvertes.exclude(ville__iexact=user.ville)[:6])
            results = same_city + other_city
        else:
            results = list(decouvertes[:12])

        results = results[:6]
        serializer = EventListSerializer(results, many=True, context={'request': request})
        return Response({'results': serializer.data, 'count': len(results)})

    # GET /api/events/populaires/
    # Events triés par capacité (les plus "gros" en attendant le modèle Vue)
    @action(
        detail=False,
        methods=['get'],
        url_path='populaires',
        permission_classes=[permissions.AllowAny]
    )
    def populaires(self, request):
        now = timezone.now()
        base_qs = Event.objects.filter(
            statut='publie',
            is_valide=True,
            date_evenement__gte=now
        ).select_related('categorie', 'organisateur') \
         .prefetch_related('tags', 'types_billets')

        populaires = base_qs.filter(capacite__isnull=False).order_by('-capacite', '-created_at')

        results = list(populaires[:6])
        serializer = EventListSerializer(results, many=True, context={'request': request})
        return Response({'results': serializer.data, 'count': len(results)})

    # GET /api/events/bientot/
    # Events dans les 7 prochains jours (sentiment d'urgence)
    @action(
        detail=False,
        methods=['get'],
        url_path='bientot',
        permission_classes=[permissions.AllowAny]
    )
    def bientot(self, request):
        now = timezone.now()
        end_window = now + timedelta(days=7)

        base_qs = Event.objects.filter(
            statut='publie',
            is_valide=True,
            date_evenement__gte=now,
            date_evenement__lte=end_window,
        ).select_related('categorie', 'organisateur') \
         .prefetch_related('tags', 'types_billets').order_by('date_evenement')

        user = request.user
        if user.is_authenticated and user.ville:
            same_city = list(base_qs.filter(ville__iexact=user.ville)[:3])
            other_city = list(base_qs.exclude(ville__iexact=user.ville)[:3])
            results = same_city + other_city
        else:
            results = list(base_qs[:6])

        results = results[:6]
        serializer = EventListSerializer(results, many=True, context={'request': request})
        return Response({'results': serializer.data, 'count': len(results)})

    # GET /api/events/{id}/similaires/
    # Events similaires à celui consulté
    @action(
        detail=True,
        methods=['get'],
        url_path='similaires'
    )
    def similaires(self, request, pk=None):
        event = self.get_object()
        now = timezone.now()

        similar = Event.objects.filter(
            statut='publie',
            is_valide=True,
            date_evenement__gte=now,
        ).exclude(pk=event.pk).select_related('categorie') \
         .prefetch_related('tags', 'types_billets')

        if event.categorie:
            categorie_match = similar.filter(categorie=event.categorie)
            if categorie_match.exists():
                similar = categorie_match

        if similar.count() > 6 and event.ville:
            same_city = similar.filter(ville__iexact=event.ville)
            if same_city.count() >= 3:
                similar = same_city

        results = list(similar[:6])
        serializer = EventListSerializer(results, many=True, context={'request': request})
        return Response({'results': serializer.data, 'count': len(results)})

    # GET /api/events/stats-organisateur/
    # Stats agrégées + deltas période sur période, pour le dashboard organisateur.
    @action(
        detail=False,
        methods=['get'],
        url_path='stats-organisateur',
        permission_classes=[permissions.IsAuthenticated],
    )
    def stats_organisateur(self, request):
        from decimal import Decimal
        from django.db.models import Sum

        user = request.user
        if not (user.is_organisateur or user.role == 'admin'):
            return Response(
                {'detail': "Réservé aux organisateurs."},
                status=status.HTTP_403_FORBIDDEN,
            )

        now = timezone.now()
        week_ago = now - timedelta(days=7)
        two_weeks_ago = now - timedelta(days=14)
        month_ago = now - timedelta(days=30)
        two_months_ago = now - timedelta(days=60)

        def pct_delta(current, previous):
            """Variation en % entre deux périodes. 0 -> quelque chose = +100%."""
            current, previous = float(current), float(previous)
            if previous == 0:
                return 100 if current > 0 else 0
            return round(((current - previous) / previous) * 100)

        mes_events = Event.objects.filter(organisateur=user)
        event_ids = list(mes_events.values_list('id', flat=True))
        published_ids = list(
            mes_events.filter(statut='publie').values_list('id', flat=True)
        )

        # === VUES (semaine vs semaine précédente) ===
        views_qs = EventView.objects.filter(event_id__in=event_ids)
        total_views = views_qs.count()
        views_w1 = views_qs.filter(viewed_at__gte=week_ago).count()
        views_w0 = views_qs.filter(
            viewed_at__gte=two_weeks_ago, viewed_at__lt=week_ago
        ).count()

        # === RÉSERVATIONS CONFIRMÉES ===
        resa_qs = Reservation.objects.filter(
            event_id__in=event_ids, statut='confirmee'
        )

        def places(qs):
            return qs.aggregate(t=Sum('items__quantite'))['t'] or 0

        def revenue(qs):
            return qs.aggregate(t=Sum('total_prix'))['t'] or Decimal('0')

        total_places = places(resa_qs)
        places_w1 = places(resa_qs.filter(date_reservation__gte=week_ago))
        places_w0 = places(resa_qs.filter(
            date_reservation__gte=two_weeks_ago, date_reservation__lt=week_ago
        ))

        # === REVENUS (mois vs mois précédent) ===
        total_revenue = revenue(resa_qs)
        rev_m1 = revenue(resa_qs.filter(date_reservation__gte=month_ago))
        rev_m0 = revenue(resa_qs.filter(
            date_reservation__gte=two_months_ago, date_reservation__lt=month_ago
        ))

        # === TAUX DE REMPLISSAGE (sur les events publiés uniquement) ===
        published = mes_events.filter(statut='publie')
        total_capacite = sum(e.capacite_totale or 0 for e in published)

        resa_pub = resa_qs.filter(event_id__in=published_ids)
        places_pub_now = places(resa_pub)
        places_pub_before = places(resa_pub.filter(date_reservation__lt=month_ago))

        if total_capacite:
            fill_now = round((places_pub_now / total_capacite) * 100)
            fill_before = round((places_pub_before / total_capacite) * 100)
        else:
            fill_now = fill_before = 0

        return Response({
            'views': {
                'value': total_views,
                'delta': pct_delta(views_w1, views_w0),
            },
            'inscriptions': {
                'value': total_places,
                'total': total_capacite,
                'delta': pct_delta(places_w1, places_w0),
            },
            'revenue': {
                'value': float(total_revenue),
                'delta': pct_delta(rev_m1, rev_m0),
            },
            'fillRate': {
                # delta en points de pourcentage (pas en %)
                'value': fill_now,
                'delta': fill_now - fill_before,
            },
        })

    # POST /api/events/{id}/duplicate/
    # Crée une copie d'un événement (en brouillon, date remise à blanc)
    # Réservé au propriétaire ou à un admin (via has_object_permission).
    @action(
        detail=True,
        methods=['post'],
        url_path='duplicate'
    )
    def duplicate(self, request, pk=None):
        original = self.get_object()  # déclenche has_object_permission

        # On garde les relations AVANT de muter l'instance
        tags = list(original.tags.all())
        types_billets_data = [
            {
                'nom': tb.nom,
                'description': tb.description,
                'prix': tb.prix,
                'is_bon_plan': tb.is_bon_plan,
                'prix_original': tb.prix_original,
                'capacite': tb.capacite,
                'ordre': tb.ordre,
            }
            for tb in original.types_billets.all()
        ]

        # Astuce Django pour cloner l'instance
        original.pk = None
        original._state.adding = True
        original.titre = f"{original.titre} (copie)"
        original.statut = 'brouillon'
        original.is_valide = False
        original.valide_par = None
        original.motif_refus = ''
        original.date_evenement = None  # le user choisira une nouvelle date
        original.capacite = None
        original.prix = None
        original.organisateur = request.user
        original.save()

        # Recrée les tags et types de billets
        if tags:
            original.tags.set(tags)
        for data in types_billets_data:
            TypeBillet.objects.create(event=original, **data)
        original.update_capacite_et_prix()

        serializer = EventDetailSerializer(original, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    # POST /api/events/{id}/cancel/
    # Annule un événement publié ou en attente. body: { reason | motif }
    # Réservé au propriétaire ou à un admin.
    @action(
        detail=True,
        methods=['post'],
        url_path='cancel'
    )
    def cancel(self, request, pk=None):
        event = self.get_object()

        if event.statut not in ('publie', 'en_attente'):
            return Response(
                {'detail': "Seuls les événements publiés ou en attente peuvent être annulés."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Frontend envoie 'reason', backend utilise aussi 'motif' (cohérence)
        motif = (request.data.get('reason') or request.data.get('motif') or '').strip()

        event.statut = 'annule'
        if motif:
            event.motif_refus = motif
        event.save()

        serializer = EventDetailSerializer(event, context={'request': request})
        return Response(serializer.data)

    # POST /api/events/{id}/publish/
    # Soumet un brouillon à validation admin (passe en 'en_attente').
    # Doit avoir tous les champs obligatoires (mêmes règles que EventDetailSerializer.validate)
    @action(
        detail=True,
        methods=['post'],
        url_path='publish'
    )
    def publish(self, request, pk=None):
        event = self.get_object()

        # Seul un vrai organisateur (ou admin) peut publier — un user avec
        # demande en_attente ne peut que créer/éditer ses brouillons.
        if not (request.user.is_organisateur or request.user.role == 'admin'):
            return Response(
                {'detail': "Vous devez être organisateur pour publier un événement."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if event.statut != 'brouillon':
            return Response(
                {'detail': "Seul un brouillon peut être publié."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validation des champs requis pour publier
        missing = []
        if not event.titre:
            missing.append('titre')
        if not event.description or len(event.description) < 20:
            missing.append('description')
        if not event.date_evenement:
            missing.append('date_evenement')
        if not event.lieu:
            missing.append('lieu')
        if not event.ville:
            missing.append('ville')
        if not event.categorie_id:
            missing.append('categorie')
        if not event.types_billets.exists():
            missing.append('types_billets')

        if missing:
            return Response(
                {
                    'detail': "Champs manquants pour publier.",
                    'missing_fields': missing,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        event.statut = 'en_attente'
        event.save()

        serializer = EventDetailSerializer(event, context={'request': request})
        return Response(serializer.data)

    # POST /api/events/{id}/valider/ (admin uniquement)
    @action(
        detail=True,
        methods=['post'],
        url_path='valider',
        permission_classes=[permissions.IsAdminUser]
    )
    def valider(self, request, pk=None):
        event = self.get_object()
        event.is_valide = True
        event.statut = 'publie'
        event.valide_par = request.user
        event.save()
        return Response({'status': 'validé'})

    # POST /api/events/{id}/refuser/ (admin uniquement)
    @action(
        detail=True,
        methods=['post'],
        url_path='refuser',
        permission_classes=[permissions.IsAdminUser]
    )
    def refuser(self, request, pk=None):
        event = self.get_object()
        event.statut = 'refuse'
        event.motif_refus = request.data.get('motif', '')
        event.valide_par = request.user
        event.save()
        return Response({'status': 'refusé', 'motif': event.motif_refus})


# ViewSet pour les catégories
class CategorieViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = CategorieSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated and user.role == 'admin':
            return Categorie.objects.all()
        return Categorie.objects.filter(is_validee=True)

    @action(
        detail=False,
        methods=['get'],
        url_path='en-attente',
        permission_classes=[permissions.IsAdminUser]
    )
    def en_attente(self, request):
        cats = Categorie.objects.filter(is_validee=False)
        serializer = self.get_serializer(cats, many=True)
        return Response(serializer.data)

    @action(
        detail=True,
        methods=['post'],
        url_path='valider',
        permission_classes=[permissions.IsAdminUser]
    )
    def valider(self, request, pk=None):
        cat = self.get_object()
        cat.is_validee = True
        cat.save()
        return Response({'status': 'validée'})


# ViewSet pour les tags
class TagViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Tag.objects.all()
    serializer_class = TagSerializer
    permission_classes = [permissions.AllowAny]


# ============================================================
# ViewSet pour les réservations
# ============================================================
class ReservationViewSet(viewsets.ModelViewSet):
    """CRUD des réservations pour le user connecté."""
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['get', 'post', 'head', 'options']  # pas de put/patch/delete direct

    def get_queryset(self):
        # Un user ne voit que SES réservations (l'admin voit tout via /admin/ si besoin)
        return Reservation.objects.filter(user=self.request.user) \
            .select_related('event', 'event__categorie', 'event__organisateur') \
            .prefetch_related('items', 'items__type_billet')

    def get_serializer_class(self):
        if self.action == 'create':
            return ReservationCreateSerializer
        return ReservationReadSerializer

    # GET /api/reservations/mes-reservations/
    # Alias pour matcher l'URL utilisée par le frontend (identique au GET /reservations/)
    @action(detail=False, methods=['get'], url_path='mes-reservations')
    def mes_reservations(self, request):
        qs = self.get_queryset()
        serializer = ReservationReadSerializer(qs, many=True, context={'request': request})
        return Response(serializer.data)

    # POST /api/reservations/{id}/cancel/
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        reservation = self.get_object()
        if reservation.statut == 'annulee':
            return Response(
                {'detail': 'Cette réservation est déjà annulée.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        reservation.statut = 'annulee'
        reservation.date_annulation = timezone.now()
        reservation.motif_annulation = (request.data.get('reason') or '').strip()
        reservation.save()
        return Response(
            ReservationReadSerializer(reservation, context={'request': request}).data
        )

    # GET /api/reservations/{id}/tickets-pdf/
    # Placeholder : renvoie les infos billets en JSON pour l'instant (PDF plus tard)
    @action(detail=True, methods=['get'], url_path='tickets-pdf')
    def tickets_pdf(self, request, pk=None):
        reservation = self.get_object()
        return Response({
            'code_reference': reservation.code_reference,
            'event': reservation.event.titre,
            'date': reservation.event.date_evenement,
            'items': [
                {
                    'type': item.type_billet.nom,
                    'quantite': item.quantite,
                    'prix_unitaire': str(item.prix_unitaire),
                }
                for item in reservation.items.all()
            ],
            'total': str(reservation.total_prix),
            'detail': 'Génération PDF à venir. Pour l\'instant, imprime cette page.',
        })