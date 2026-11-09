from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Q, Count

from datetime import timedelta
from django.utils import timezone

from .models import User, DemandeOrganisateur, Interet, Pack, Abonnement, journaliser, resume_abonnement
from .serializers import AdminUserListSerializer
from events.models import notifier
from .models import historiser_demande


class IsAdminRole(permissions.BasePermission):
    """Autorise uniquement les utilisateurs dont le rôle est 'admin'."""
    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == 'admin'
        )


class AdminUsersListView(generics.ListAPIView):
    """GET /api/auth/admin/users/
    Filtres : ?q=  ?role=  ?is_organisateur=true  ?is_active=false
    """
    serializer_class = AdminUserListSerializer
    permission_classes = [IsAdminRole]

    def get_queryset(self):
        qs = User.objects.all().order_by('-created_at')
        params = self.request.query_params

        q = (params.get('q') or '').strip()
        if len(q) >= 2:
            qs = qs.filter(
                Q(email__icontains=q)
                | Q(nom__icontains=q)
                | Q(prenom__icontains=q)
                | Q(ville__icontains=q)
            )

        role = params.get('role')
        if role in ('utilisateur', 'admin'):
            qs = qs.filter(role=role)

        is_orga = params.get('is_organisateur')
        if is_orga == 'true':
            qs = qs.filter(is_organisateur=True)
        elif is_orga == 'false':
            qs = qs.filter(is_organisateur=False)

        is_active = params.get('is_active')
        if is_active == 'true':
            qs = qs.filter(is_active=True)
        elif is_active == 'false':
            qs = qs.filter(is_active=False)

        return qs


class AdminUserToggleActiveView(APIView):
    """POST /api/auth/admin/users/<id>/toggle-active/
    Active ou désactive un compte. Un admin ne peut pas se désactiver lui-même,
    ni désactiver un autre administrateur.
    """
    permission_classes = [IsAdminRole]

    def post(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({'detail': 'Utilisateur introuvable'},
                            status=status.HTTP_404_NOT_FOUND)

        if user.id == request.user.id:
            return Response(
                {'detail': "Vous ne pouvez pas désactiver votre propre compte."},
                status=status.HTTP_400_BAD_REQUEST)

        if user.role == 'admin':
            return Response(
                {'detail': "Un compte administrateur ne peut pas être désactivé ici."},
                status=status.HTTP_400_BAD_REQUEST)

        user.is_active = not user.is_active
        user.save(update_fields=['is_active'])
        journaliser('utilisateur', 'active' if user.is_active else 'desactive',
                    cible=user, cible_nom=user.email, acteur=request.user, concerne=user,
                    motif=(request.data.get('motif') or '').strip())

        return Response(AdminUserListSerializer(user).data)


class AdminUserToggleOrganisateurView(APIView):
    """POST /api/auth/admin/users/<id>/toggle-organisateur/
    Promeut ou rétrograde manuellement un organisateur, sans passer par
    le flux de demande. Réservé aux cas exceptionnels.
    """
    permission_classes = [IsAdminRole]

    def post(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({'detail': 'Utilisateur introuvable'},
                            status=status.HTTP_404_NOT_FOUND)

        if user.role == 'admin':
            return Response(
                {'detail': "Un administrateur a déjà tous les droits."},
                status=status.HTTP_400_BAD_REQUEST)

        user.is_organisateur = not user.is_organisateur
        user.save(update_fields=['is_organisateur'])
        journaliser('organisateur', 'promu' if user.is_organisateur else 'retrograde',
                    cible=user, cible_nom=user.email, acteur=request.user, concerne=user,
                    details={'via': 'gestion des utilisateurs'})

        # Cohérence : on aligne la demande éventuelle sur le nouvel état
        demande = getattr(user, 'demande_organisateur', None)
        if user.is_organisateur:
            # PROMOTION
            if demande and demande.statut != 'valide':
                demande.statut = 'valide'
                demande.save(update_fields=['statut'])
            notifier(
                user,
                "Vous êtes désormais organisateur sur Eventu ! Vous pouvez créer et publier vos événements.",
                lien="/dashboard",
            )
        else:
            # RÉTROGRADATION : on supprime la demande pour qu'il puisse en refaire une
            nom_org = demande.nom_organisation if demande else ''
            if demande:
                demande.delete()
            # Historique : statut organisateur retiré
            historiser_demande(user, 'retiree', nom_organisation=nom_org)
            notifier(
                user,
                "Votre statut d'organisateur a été retiré. Vous pouvez soumettre une nouvelle demande si vous le souhaitez.",
                lien="/devenir-organisateur",
            )

        return Response(AdminUserListSerializer(user).data)


class AdminStatsView(APIView):
    """GET /api/auth/admin/stats/
    Compteurs agrégés pour la vue d'ensemble du panneau admin.
    """
    permission_classes = [IsAdminRole]

    def get(self, request):
        from events.models import Event, Categorie, Reservation

        return Response({
            'users': {
                'total': User.objects.count(),
                'organisateurs': User.objects.filter(is_organisateur=True).count(),
                'inactifs': User.objects.filter(is_active=False).count(),
            },
            'demandes': {
                'en_attente': DemandeOrganisateur.objects.filter(
                    statut='en_attente').count(),
            },
            'events': {
                'total': Event.objects.count(),
                'publies': Event.objects.filter(statut='publie').count(),
                'en_attente': Event.objects.filter(statut='en_attente').count(),
            },
            'categories': {
                'total': Categorie.objects.count(),
                'en_attente': Categorie.objects.filter(is_validee=False).count(),
            },
            'reservations': {
                'confirmees': Reservation.objects.filter(
                    statut='confirmee').count(),
            },
        })


# PACKS ET ABONNEMENTS

class AdminUserAbonnementView(APIView):
    """POST   /api/auth/admin/users/<id>/abonnement/  { "pack_id": 2 }
    Attribue (ou change) le pack d'un organisateur depuis la page Utilisateurs
    et renvoie l'utilisateur mis à jour. La période repart d'aujourd'hui.
    DELETE /api/auth/admin/users/<id>/abonnement/
    Retire l'abonnement : l'organisateur retombe sur le pack gratuit par défaut.
    """
    permission_classes = [IsAdminRole]

    def _get_user(self, pk):
        try:
            return User.objects.get(pk=pk)
        except User.DoesNotExist:
            return None

    def post(self, request, pk):
        user = self._get_user(pk)
        if not user:
            return Response({'detail': 'Utilisateur introuvable'},
                            status=status.HTTP_404_NOT_FOUND)
        if not user.is_organisateur:
            return Response(
                {'detail': "Seul un organisateur peut recevoir un pack."},
                status=status.HTTP_400_BAD_REQUEST)

        try:
            pack = Pack.objects.get(pk=request.data.get('pack_id'), is_actif=True)
        except (Pack.DoesNotExist, ValueError, TypeError):
            return Response({'detail': 'Pack introuvable ou archivé'},
                            status=status.HTTP_400_BAD_REQUEST)

        ancien = getattr(user, 'abonnement', None)
        ancien_pack = ancien.pack.nom if ancien else None
        maintenant = timezone.now()
        date_fin = None if pack.is_gratuit else maintenant + timedelta(days=pack.nb_jours)
        abo, _ = Abonnement.objects.update_or_create(
            organisateur=user,
            defaults={
                'pack': pack,
                'date_debut': maintenant,
                'date_fin': date_fin,
                'statut': 'actif',
                'assigne_par': request.user,
            },
        )

        journaliser('abonnement', 'attribue', cible_id=abo.pk, cible_nom=pack.nom,
                    acteur=request.user, concerne=user,
                    details={**resume_abonnement(abo), 'ancien_pack': ancien_pack})

        notifier(
            user,
            f"Votre pack organisateur est désormais « {pack.nom} ».",
            lien="/dashboard",
        )
        user.refresh_from_db()
        return Response(AdminUserListSerializer(user).data)

    def delete(self, request, pk):
        user = self._get_user(pk)
        if not user:
            return Response({'detail': 'Utilisateur introuvable'},
                            status=status.HTTP_404_NOT_FOUND)
        abo = Abonnement.objects.filter(organisateur=user).select_related('pack').first()
        if abo:
            journaliser('abonnement', 'retire', cible_id=abo.pk, cible_nom=abo.pack.nom,
                        acteur=request.user, concerne=user, details=resume_abonnement(abo))
            abo.delete()
            notifier(user, "Votre abonnement a été retiré : le pack gratuit s'applique désormais.",
                     lien="/dashboard")
        user.refresh_from_db()
        return Response(AdminUserListSerializer(user).data)


# JOURNAL D'ACTIVITÉ

class AdminJournalView(generics.ListAPIView):
    """GET /api/auth/admin/journal/
    Toutes les actions tracées, des plus récentes aux plus anciennes (20 par page).
    Filtres : ?type=evenement|categorie|pack|abonnement|organisateur|utilisateur
              ?action=valide|refuse|...  ?concerne=<id user>  ?cible_id=<id>
              ?q=<texte>  ?depuis=AAAA-MM-JJ  ?jusqua=AAAA-MM-JJ
    """
    permission_classes = [IsAdminRole]

    def get_serializer_class(self):
        from .serializers import JournalActiviteSerializer
        return JournalActiviteSerializer

    def get_queryset(self):
        from .models import JournalActivite
        qs = JournalActivite.objects.all()
        p = self.request.query_params

        if p.get('type'):
            qs = qs.filter(type_cible=p['type'])
        if p.get('action'):
            qs = qs.filter(action=p['action'])
        if p.get('concerne'):
            qs = qs.filter(concerne_id=p['concerne'])
        if p.get('cible_id'):
            qs = qs.filter(cible_id=p['cible_id'])
        if p.get('depuis'):
            qs = qs.filter(created_at__date__gte=p['depuis'])
        if p.get('jusqua'):
            qs = qs.filter(created_at__date__lte=p['jusqua'])

        q = (p.get('q') or '').strip()
        if len(q) >= 2:
            qs = qs.filter(
                Q(cible_nom__icontains=q) | Q(acteur_nom__icontains=q)
                | Q(concerne_nom__icontains=q) | Q(motif__icontains=q)
            )
        return qs
