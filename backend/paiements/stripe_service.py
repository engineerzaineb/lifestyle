"""Seul endroit qui parle à Stripe. Le reste de l'application n'appelle que ces fonctions.

Les clés viennent du fichier .env (jamais du code ni du frontend) :
  STRIPE_SECRET_KEY      clé secrète de test (sk_test_...)
  STRIPE_WEBHOOK_SECRET  clé du webhook (whsec_...), donnée par Stripe CLI ou le tableau de bord
  STRIPE_DEVISE          tnd par défaut ; eur ou usd possibles avec STRIPE_TAUX_CONVERSION
"""
from decimal import Decimal, ROUND_HALF_UP

import stripe
from django.conf import settings

# Devises à trois décimales (le dinar tunisien compte en millimes)
DEVISES_3_DECIMALES = {'tnd', 'bhd', 'jod', 'kwd', 'omr'}


class PaiementIndisponible(Exception):
    """Stripe n'est pas configuré ou a refusé la demande : message prêt à afficher."""


def est_configure():
    return bool(getattr(settings, 'STRIPE_SECRET_KEY', ''))


def _client():
    if not est_configure():
        raise PaiementIndisponible(
            "Le paiement en ligne n'est pas configuré : ajoutez STRIPE_SECRET_KEY dans le fichier .env du backend."
        )
    stripe.api_key = settings.STRIPE_SECRET_KEY
    return stripe


def devise():
    return (getattr(settings, 'STRIPE_DEVISE', 'tnd') or 'tnd').lower()


def montant_stripe(montant_dt):
    """Montant en DT -> plus petite unité de la devise attendue par Stripe.
    TND : en millimes, arrondi à la dizaine (règle Stripe des devises à 3 décimales).
    Autre devise : conversion avec STRIPE_TAUX_CONVERSION, puis en centimes."""
    montant_dt = Decimal(str(montant_dt))
    d = devise()
    if d in DEVISES_3_DECIMALES:
        millimes = int((montant_dt * 1000).quantize(Decimal('1'), rounding=ROUND_HALF_UP))
        return int((Decimal(millimes) / 10).quantize(Decimal('1'), rounding=ROUND_HALF_UP)) * 10
    taux = Decimal(str(getattr(settings, 'STRIPE_TAUX_CONVERSION', 1)))
    return int((montant_dt * taux * 100).quantize(Decimal('1'), rounding=ROUND_HALF_UP))


def creer_session(paiement, libelle, description, success_url, cancel_url):
    """Crée une page de paiement Stripe Checkout. Renvoie (session_id, url)."""
    s = _client()
    metadata = {'paiement_id': str(paiement.pk), 'type': paiement.type}
    try:
        session = s.checkout.Session.create(
            mode='payment',
            line_items=[{
                'quantity': 1,
                'price_data': {
                    'currency': devise(),
                    'unit_amount': montant_stripe(paiement.montant),
                    'product_data': {'name': libelle, 'description': description[:500] or libelle},
                },
            }],
            customer_email=paiement.user.email,
            client_reference_id=str(paiement.pk),
            metadata=metadata,
            payment_intent_data={'metadata': metadata},
            success_url=success_url,
            cancel_url=cancel_url,
            expires_at=int(paiement.expire_le.timestamp()),
            locale='fr',
        )
    except stripe.StripeError as e:
        raise PaiementIndisponible(f"Stripe a refusé la demande de paiement : {e.user_message or e}") from e
    return session.id, session.url


def recuperer_session(session_id):
    return _client().checkout.Session.retrieve(session_id)


def expirer_session(session_id):
    """Ferme une page de paiement encore ouverte (sans effet si elle est déjà fermée)."""
    try:
        _client().checkout.Session.expire(session_id)
    except stripe.StripeError:
        pass


def rembourser(payment_intent):
    """Rembourse intégralement un paiement. Lève PaiementIndisponible en cas d'échec."""
    try:
        return _client().Refund.create(payment_intent=payment_intent)
    except stripe.StripeError as e:
        raise PaiementIndisponible(f"Remboursement refusé par Stripe : {e.user_message or e}") from e


def lire_webhook(payload, signature):
    """Vérifie la signature du webhook et renvoie l'événement Stripe.
    Lève ValueError (contenu illisible) ou stripe.SignatureVerificationError."""
    secret = getattr(settings, 'STRIPE_WEBHOOK_SECRET', '')
    if not secret:
        raise ValueError("STRIPE_WEBHOOK_SECRET manquant dans le fichier .env.")
    return stripe.Webhook.construct_event(payload, signature, secret)
