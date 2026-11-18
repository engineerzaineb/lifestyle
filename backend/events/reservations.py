"""Cycle de vie d'une réservation : confirmation, émission des billets, annulation.

- Événement gratuit : la réservation est confirmée tout de suite et les billets émis.
- Événement payant : la réservation reste « en attente de paiement » (places
  bloquées jusqu'à `expire_le`) ; elle est confirmée par le paiement (webhook Stripe).
"""
import secrets
from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from .models import Billet, Reservation, notifier

# Sans 0/O ni 1/I : un code lisible et sans erreur de saisie au contrôle
ALPHABET_CODE = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def delai_paiement():
    """Durée pendant laquelle les places restent bloquées en attendant le paiement.
    Bornée entre 31 minutes et 24 heures : Stripe impose qu'une page de paiement
    reste ouverte au moins 30 minutes et au plus 24 heures."""
    minutes = int(getattr(settings, 'PAIEMENT_DELAI_MINUTES', 35))
    return timedelta(minutes=min(max(minutes, 31), 24 * 60))


def generer_code_billet():
    """Code aléatoire non devinable (32^10 possibilités) : c'est lui que porte le QR code."""
    while True:
        code = "BLT-" + "".join(secrets.choice(ALPHABET_CODE) for _ in range(10))
        if not Billet.objects.filter(code=code).exists():
            return code


def emettre_billets(reservation):
    """Crée un billet par place réservée. Sans effet si les billets existent déjà."""
    if reservation.billets.exists():
        return list(reservation.billets.all())
    billets = [
        Billet(reservation=reservation, type_billet=item.type_billet, code=generer_code_billet())
        for item in reservation.items.select_related('type_billet')
        for _ in range(item.quantite)
    ]
    Billet.objects.bulk_create(billets)
    return billets


def confirmer_reservation(reservation, via_paiement=False):
    """Confirme une réservation et émet ses billets. Idempotent : un deuxième
    appel (webhook reçu deux fois, retour de paiement + webhook) ne fait rien.
    Renvoie (réservation, True si elle vient d'être confirmée)."""
    with transaction.atomic():
        r = Reservation.objects.select_for_update().get(pk=reservation.pk)
        if r.statut != 'en_attente_paiement':
            return r, False
        r.statut = 'confirmee'
        r.expire_le = None
        r.date_confirmation = timezone.now()
        r.save(update_fields=['statut', 'expire_le', 'date_confirmation'])
        emettre_billets(r)

    event, user = r.event, r.user
    detail = ", ".join(f"{i.quantite}x {i.type_billet.nom}" for i in r.items.select_related('type_billet'))
    notifier(
        event.organisateur,
        f"Nouvelle réservation pour « {event.titre} » par {user.prenom} {user.nom} "
        f"({detail}) — total {r.total_prix} DT. Réf : {r.code_reference}.",
        lien=f"/event/{event.id}",
    )
    notifier(
        user,
        (f"Paiement reçu : votre réservation pour « {event.titre} » est confirmée. "
         if via_paiement else
         f"Votre réservation pour « {event.titre} » est confirmée. ")
        + "Vos billets sont disponibles.",
        lien="/my-reservations",
    )
    return r, True


def annuler_reservation(reservation, motif=''):
    """Annule une réservation et ses billets (les places redeviennent disponibles)."""
    with transaction.atomic():
        r = Reservation.objects.select_for_update().get(pk=reservation.pk)
        if r.statut == 'annulee':
            return r
        r.statut = 'annulee'
        r.date_annulation = timezone.now()
        r.motif_annulation = motif or r.motif_annulation
        r.expire_le = None
        r.save(update_fields=['statut', 'date_annulation', 'motif_annulation', 'expire_le'])
        r.billets.filter(statut='valide').update(statut='annule')
    return r
