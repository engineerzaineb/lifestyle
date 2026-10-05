from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.generics import ListAPIView
from django.utils import timezone
from django.shortcuts import get_object_or_404
from .models import DemandeOrganisateur, User
from .serializers import (
    DemandeOrganisateurCreateSerializer,
    DemandeOrganisateurReadSerializer,
)


# COTÉ USER

class DemandeOrganisateurView(APIView):
    """Gère ma demande d'organisateur (créer/voir/annuler)"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """GET /api/auth/demande-organisateur/ : voir ma demande"""
        try:
            demande = DemandeOrganisateur.objects.get(user=request.user)
            serializer = DemandeOrganisateurReadSerializer(demande)
            return Response(serializer.data)
        except DemandeOrganisateur.DoesNotExist:
            return Response({'detail': 'Aucune demande trouvée'}, status=status.HTTP_404_NOT_FOUND)

    def post(self, request):
        """POST /api/auth/demande-organisateur/ : créer une demande"""
        # Vérifier qu'il n'y a pas déjà une demande
        if DemandeOrganisateur.objects.filter(user=request.user).exists():
            return Response(
                {'detail': 'Vous avez déjà une demande en cours'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Vérifier qu'il n'est pas déjà organisateur
        if request.user.is_organisateur:
            return Response(
                {'detail': 'Vous êtes déjà organisateur'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = DemandeOrganisateurCreateSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=request.user)
            return Response(
                DemandeOrganisateurReadSerializer(serializer.instance).data,
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request):
        """DELETE /api/auth/demande-organisateur/ : annule / supprime ma demande.
        Autorisé si la demande est en_attente (annulation) ou refuse
        (permet de repartir sur une nouvelle demande après un refus).
        """
        try:
            demande = DemandeOrganisateur.objects.get(user=request.user)
            if demande.statut not in ('en_attente', 'refuse'):
                return Response(
                    {'detail': "Vous ne pouvez pas supprimer une demande déjà validée."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            demande.delete()
            return Response({'detail': 'Demande supprimée'}, status=status.HTTP_200_OK)
        except DemandeOrganisateur.DoesNotExist:
            return Response({'detail': 'Aucune demande'}, status=status.HTTP_404_NOT_FOUND)


# CÔTÉ ADMIN 

class IsAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'admin'


class AdminDemandesListView(ListAPIView):
    """GET /api/admin/demandes-organisateur/ : liste des demandes"""
    serializer_class = DemandeOrganisateurReadSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        statut = self.request.query_params.get('statut')
        qs = DemandeOrganisateur.objects.select_related('user', 'traite_par') \
                                       .prefetch_related('categories_prevues')
        if statut:
            qs = qs.filter(statut=statut)
        return qs


class AdminDemandeDetailView(APIView):
    """GET /api/admin/demandes-organisateur/{id}/ : détail d'une demande"""
    permission_classes = [IsAdmin]

    def get(self, request, pk):
        demande = get_object_or_404(DemandeOrganisateur, pk=pk)
        serializer = DemandeOrganisateurReadSerializer(demande)
        
        # Ajouter les brouillons du user (bonus pour décider)
        from events.models import Event
        brouillons = Event.objects.filter(
            organisateur=demande.user,
            statut='brouillon'
        ).values('id', 'titre', 'description', 'categorie__nom', 'ville')
        
        data = serializer.data
        data['brouillons'] = list(brouillons)
        return Response(data)


class AdminValiderDemandeView(APIView):
    """POST /api/admin/demandes-organisateur/{id}/valider/"""
    permission_classes = [IsAdmin]

    def post(self, request, pk):
        demande = get_object_or_404(DemandeOrganisateur, pk=pk)
        
        if demande.statut != 'en_attente':
            return Response(
                {'detail': 'Cette demande a déjà été traitée'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Marquer la demande comme validée
        demande.statut = 'valide'
        demande.date_traitement = timezone.now()
        demande.traite_par = request.user
        demande.save()

        # Donner le rôle organisateur au user
        demande.user.is_organisateur = True
        demande.user.save()

        return Response({
            'detail': 'Demande validée. L\'utilisateur est maintenant organisateur.',
            'demande': DemandeOrganisateurReadSerializer(demande).data
        })


class AdminRefuserDemandeView(APIView):
    """POST /api/admin/demandes-organisateur/{id}/refuser/"""
    permission_classes = [IsAdmin]

    def post(self, request, pk):
        demande = get_object_or_404(DemandeOrganisateur, pk=pk)
        motif = request.data.get('motif', '').strip()

        if not motif:
            return Response(
                {'detail': 'Le motif est obligatoire'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if demande.statut != 'en_attente':
            return Response(
                {'detail': 'Cette demande a déjà été traitée'},
                status=status.HTTP_400_BAD_REQUEST
            )

        demande.statut = 'refuse'
        demande.motif_refus = motif
        demande.date_traitement = timezone.now()
        demande.traite_par = request.user
        demande.save()

        return Response({
            'detail': 'Demande refusée.',
            'demande': DemandeOrganisateurReadSerializer(demande).data
        })