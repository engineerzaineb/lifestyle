from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Q, Count

from datetime import timedelta
from django.utils import timezone

from .models import User, DemandeOrganisateur, Interet, Pack, Abonnement
from .serializers import AdminUserListSerializer, PackSerializer, serialiser_quota
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

class AdminPackListCreateView(generics.ListCreateAPIView):
    """GET  /api/auth/admin/packs/   (?is_actif=true|false)
    POST /api/auth/admin/packs/
    """
    serializer_class = PackSerializer
    permission_classes = [IsAdminRole]
    pagination_class = None

    def get_queryset(self):
        qs = Pack.objects.all()
        is_actif = self.request.query_params.get('is_actif')
        if is_actif == 'true':
            qs = qs.filter(is_actif=True)
        elif is_actif == 'false':
            qs = qs.filter(is_actif=False)
        return qs


class AdminPackDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/auth/admin/packs/<id>/
    Un pack déjà attribué ne peut pas être supprimé : il faut l'archiver (is_actif=false).
    """
    serializer_class = PackSerializer
    permission_classes = [IsAdminRole]
    queryset = Pack.objects.all()

    def destroy(self, request, *args, **kwargs):
        pack = self.get_object()
        if pack.abonnements.exists():
            return Response(
                {'detail': "Ce pack est attribué à des organisateurs : archivez-le plutôt que de le supprimer."},
                status=status.HTTP_400_BAD_REQUEST)
        pack.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminUserAbonnementView(APIView):
    """POST   /api/auth/admin/users/<id>/abonnement/  { "pack_id": 2 }
    Attribue (ou change) le pack d'un organisateur. La période repart d'aujourd'hui.
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

        maintenant = timezone.now()
        date_fin = None if pack.is_gratuit else maintenant + timedelta(days=pack.nb_jours)
        Abonnement.objects.update_or_create(
            organisateur=user,
            defaults={
                'pack': pack,
                'date_debut': maintenant,
                'date_fin': date_fin,
                'statut': 'actif',
                'attribue_par': request.user,
            },
        )

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
        Abonnement.objects.filter(organisateur=user).delete()
        user.refresh_from_db()
        return Response(AdminUserListSerializer(user).data)


class PackListView(generics.ListAPIView):
    """GET /api/auth/packs/ — catalogue public des packs actifs (page tarifs)."""
    serializer_class = PackSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None
    queryset = Pack.objects.filter(is_actif=True)


class MonAbonnementView(APIView):
    """GET /api/auth/me/abonnement/
    Pack effectif de l'organisateur connecté et utilisation de son quota d'événements.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(serialiser_quota(request.user))
