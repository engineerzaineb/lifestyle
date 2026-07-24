from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Q, Count

from .models import User, DemandeOrganisateur, Interet
from .serializers import AdminUserListSerializer


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
        if demande and user.is_organisateur and demande.statut != 'valide':
            demande.statut = 'valide'
            demande.save(update_fields=['statut'])

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