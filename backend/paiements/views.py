import stripe
from django.shortcuts import get_object_or_404
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from users.models import Pack

from . import services, stripe_service
from .models import Paiement
from .serializers import PaiementSerializer
from .stripe_service import PaiementIndisponible


class StripeWebhookView(APIView):
    """POST /api/paiements/stripe/webhook/ — appelé par Stripe, jamais par le navigateur.
    La signature (en-tête Stripe-Signature) prouve que l'appel vient bien de Stripe."""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        try:
            event = stripe_service.lire_webhook(request.body, request.META.get('HTTP_STRIPE_SIGNATURE'))
        except (ValueError, stripe.SignatureVerificationError) as e:
            return Response({'detail': f"Webhook refusé : {e}"}, status=status.HTTP_400_BAD_REQUEST)

        type_evenement = event['type']
        if type_evenement.startswith('checkout.session.'):
            services.traiter_session(event['data']['object'], type_evenement)
        return Response({'recu': True})


class PaiementSessionView(APIView):
    """GET /api/paiements/session/<session_id>/ — page de retour après Stripe.
    Relit la session auprès de Stripe si le webhook n'est pas encore arrivé."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, session_id):
        services.expirer_paiements()
        p = get_object_or_404(Paiement, stripe_session_id=session_id, user=request.user)
        p = services.synchroniser(p)
        return Response(PaiementSerializer(p).data)


class AnnulerPaiementView(APIView):
    """POST /api/paiements/session/<session_id>/annuler/ — l'utilisateur a quitté la page
    de paiement : la page Stripe est fermée et les places sont libérées."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, session_id):
        p = get_object_or_404(Paiement, stripe_session_id=session_id, user=request.user)
        p = services.synchroniser(p)  # au cas où il aurait payé entre-temps
        p = services.annuler_paiement_en_cours(p)
        p.refresh_from_db()
        return Response(PaiementSerializer(p).data)


class PayerPackView(APIView):
    """POST /api/paiements/pack/ {pack_id} — un organisateur souscrit à un pack payant."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if not request.user.is_organisateur:
            return Response({'detail': "Seul un organisateur peut souscrire à un pack."},
                            status=status.HTTP_403_FORBIDDEN)
        pack = get_object_or_404(Pack, pk=request.data.get('pack_id'), is_actif=True)
        if pack.est_gratuit:
            return Response({'detail': "Ce pack est gratuit : il s'applique automatiquement."},
                            status=status.HTTP_400_BAD_REQUEST)
        try:
            p = services.demarrer_paiement_pack(request.user, pack)
        except PaiementIndisponible as e:
            return Response({'detail': str(e)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        return Response(PaiementSerializer(p).data, status=status.HTTP_201_CREATED)


class MesPaiementsView(APIView):
    """GET /api/paiements/ — historique des paiements de l'utilisateur connecté."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        services.expirer_paiements()
        qs = Paiement.objects.filter(user=request.user).select_related('reservation__event', 'pack')
        type_ = request.query_params.get('type')
        if type_:
            qs = qs.filter(type=type_)
        return Response(PaiementSerializer(qs[:50], many=True).data)
