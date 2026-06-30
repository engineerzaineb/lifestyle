from datetime import timedelta, datetime, time
from rest_framework import viewsets, permissions, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.db.models import Q, F, Case, When, BooleanField, Value, Exists, OuterRef
from .models import Event, Categorie, Tag, TypeBillet
from .serializers import (
    EventListSerializer, EventDetailSerializer,
    CategorieSerializer, TagSerializer
)


# Mapping des mois français vers leur numéro
MOIS_FR = {
    'janvier': 1, 'fevrier': 2, 'février': 2, 'mars': 3, 'avril': 4,
    'mai': 5, 'juin': 6, 'juillet': 7, 'aout': 8, 'août': 8,
    'septembre': 9, 'octobre': 10, 'novembre': 11, 'decembre': 12, 'décembre': 12,
}


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


# Détecte un ou plusieurs mois dans la requête (match dès la 1ère lettre)
def detect_months_in_query(query):
    if not query:
        return []

    query_lower = query.lower().strip()
    if not query_lower:
        return []

    words = query_lower.split()
    matching_months = set()

    for word in words:
        if not word:
            continue
        for nom_mois, num_mois in MOIS_FR.items():
            if nom_mois.startswith(word):
                matching_months.add(num_mois)

    return sorted(matching_months)


# Retire les mots qui correspondent à un préfixe de mois
def remove_months_from_query(query):
    if not query:
        return query

    result = query.lower().strip()
    words = result.split()

    filtered_words = []
    for word in words:
        is_month = False
        if word:
            for nom_mois in MOIS_FR.keys():
                if nom_mois.startswith(word):
                    is_month = True
                    break
        if not is_month:
            filtered_words.append(word)

    return ' '.join(filtered_words).strip()


class EventViewSet(viewsets.ModelViewSet):
    queryset = Event.objects.all()
    permission_classes = [IsOrganisateurOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['statut']
    search_fields = ['titre', 'description', 'lieu', 'ville']

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

        # Recherche textuelle avec détection de mois en français
        # Comportement : cherche dans texte ET dans les mois (OR)
        q = params.get('q')
        if q:
            mois_list = detect_months_in_query(q)
            q_sans_mois = remove_months_from_query(q)

            query_filters = Q()

            if q_sans_mois:
                query_filters |= (
                    Q(titre__icontains=q_sans_mois) |
                    Q(description__icontains=q_sans_mois) |
                    Q(lieu__icontains=q_sans_mois) |
                    Q(ville__icontains=q_sans_mois) |
                    Q(tags__nom__icontains=q_sans_mois) |
                    Q(categorie__nom__icontains=q_sans_mois)
                )

            if mois_list:
                query_filters |= Q(date_evenement__month__in=mois_list)

            if q.strip() and not q_sans_mois:
                query_filters |= (
                    Q(titre__icontains=q) |
                    Q(description__icontains=q) |
                    Q(lieu__icontains=q) |
                    Q(ville__icontains=q) |
                    Q(tags__nom__icontains=q) |
                    Q(categorie__nom__icontains=q)
                )

            if query_filters:
                qs = qs.filter(query_filters).distinct()

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
            # Pertinence par défaut : bons plans en premier + date proche
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
            pattern = r'(' + '|'.join(user_interets_noms) + r')'
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
            pattern = r'(' + '|'.join(user_interets_noms) + r')'
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