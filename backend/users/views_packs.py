from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils import timezone
from datetime import timedelta

from .models import Pack, Abonnement, User
from .serializers_packs import PackSerializer, AbonnementSerializer
from .views_admin import IsAdminRole
from events.models import notifier


# =========================================================================
#  PACKS — côté public (organisateurs) : lecture seule des packs actifs
# =========================================================================

class PackListPublicView(generics.ListAPIView):
    """GET /api/auth/packs/
    Liste des packs actifs (visible par tous les utilisateurs connectés)."""
    serializer_class = PackSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return Pack.objects.filter(is_actif=True)


class MonAbonnementView(APIView):
    """GET /api/auth/mon-abonnement/
    Abonnement de l'organisateur connecté (ou null s'il n'en a pas)."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        abo = getattr(request.user, 'abonnement', None)
        if not abo:
            return Response(None)
        return Response(AbonnementSerializer(abo).data)


# =========================================================================
#  PACKS — côté admin : CRUD complet
# =========================================================================

class AdminPackListCreateView(generics.ListCreateAPIView):
    """GET  /api/auth/admin/packs/  -> tous les packs (actifs + archivés)
    POST /api/auth/admin/packs/  -> créer un pack"""
    serializer_class = PackSerializer
    permission_classes = [IsAdminRole]
    pagination_class = None
    queryset = Pack.objects.all()


class AdminPackDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/auth/admin/packs/<id>/
    Suppression bloquée si le pack est encore utilisé par un abonnement."""
    serializer_class = PackSerializer
    permission_classes = [IsAdminRole]
    queryset = Pack.objects.all()

    def destroy(self, request, *args, **kwargs):
        pack = self.get_object()
        if pack.abonnements.exists():
            return Response(
                {'detail': "Ce pack est utilisé par des organisateurs. "
                           "Désactivez-le plutôt que de le supprimer."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)


# =========================================================================
#  ABONNEMENTS — côté admin : assigner un pack à un organisateur
# =========================================================================

class AdminAbonnementListView(generics.ListAPIView):
    """GET /api/auth/admin/abonnements/  -> tous les abonnements"""
    serializer_class = AbonnementSerializer
    permission_classes = [IsAdminRole]
    pagination_class = None
    queryset = Abonnement.objects.select_related(
        'organisateur', 'pack', 'assigne_par'
    ).all()


class AdminAssignerPackView(APIView):
    """POST /api/auth/admin/users/<id>/assigner-pack/
    body: { pack_id }
    Assigne (ou remplace) le pack d'un organisateur."""
    permission_classes = [IsAdminRole]

    def post(self, request, pk):
        user = get_object_or_404(User, pk=pk)

        if not user.is_organisateur:
            return Response(
                {'detail': "Seul un organisateur peut recevoir un pack."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        pack_id = request.data.get('pack_id')
        if not pack_id:
            return Response(
                {'detail': "Le pack_id est requis."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        pack = get_object_or_404(Pack, pk=pack_id)

        # Date de fin selon la durée du pack (gratuit = pas d'expiration)
        date_fin = None
        if not pack.est_gratuit:
            jours = 365 if pack.duree == 'annuel' else 30
            date_fin = timezone.now() + timedelta(days=jours)

        # Un organisateur a au plus un abonnement (OneToOne) : on met à jour
        abo, cree = Abonnement.objects.update_or_create(
            organisateur=user,
            defaults={
                'pack': pack,
                'date_fin': date_fin,
                'statut': 'actif',
                'assigne_par': request.user,
            },
        )

        # Notifier l'organisateur
        notifier(
            user,
            f"Votre abonnement a été mis à jour : pack « {pack.nom} ».",
            lien="/dashboard",
        )

        return Response(AbonnementSerializer(abo).data, status=status.HTTP_200_OK)


class AdminRetirerPackView(APIView):
    """POST /api/auth/admin/users/<id>/retirer-pack/
    Retire l'abonnement d'un organisateur."""
    permission_classes = [IsAdminRole]

    def post(self, request, pk):
        user = get_object_or_404(User, pk=pk)
        abo = getattr(user, 'abonnement', None)
        if not abo:
            return Response(
                {'detail': "Cet organisateur n'a pas d'abonnement."},
                status=status.HTTP_404_NOT_FOUND,
            )
        abo.delete()
        return Response({'detail': "Abonnement retiré."}, status=status.HTTP_200_OK)