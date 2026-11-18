from django.urls import path

from .views import (
    AnnulerPaiementView, MesPaiementsView, PaiementSessionView, PayerPackView, StripeWebhookView,
)

urlpatterns = [
    path('', MesPaiementsView.as_view(), name='mes-paiements'),
    path('stripe/webhook/', StripeWebhookView.as_view(), name='stripe-webhook'),
    path('session/<str:session_id>/', PaiementSessionView.as_view(), name='paiement-session'),
    path('session/<str:session_id>/annuler/', AnnulerPaiementView.as_view(), name='paiement-annuler'),
    path('pack/', PayerPackView.as_view(), name='paiement-pack'),
]
