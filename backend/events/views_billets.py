"""Contrôle des billets à l'entrée (organisateur de l'événement ou administrateur).

GET  /api/billets/<code>/          -> état du billet et verdict (valide, déjà utilisé, annulé…)
POST /api/billets/<code>/valider/  -> marque le billet comme utilisé (une seule fois)
"""
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Billet

MESSAGES = {
    'valide': "Billet valide : l'entrée peut être autorisée.",
    'deja_utilise': "Ce billet a déjà été utilisé.",
    'annule': "Ce billet a été annulé.",
    'evenement_annule': "L'événement a été annulé : ce billet n'est plus valable.",
    'reservation_non_confirmee': "La réservation n'est pas confirmée (paiement non reçu).",
}


def _verdict(billet):
    if billet.reservation.event.statut == 'annule':
        return 'evenement_annule'
    if billet.statut == 'annule':
        return 'annule'
    if billet.reservation.statut != 'confirmee':
        return 'reservation_non_confirmee'
    if billet.statut == 'utilise':
        return 'deja_utilise'
    return 'valide'


def _donnees(billet):
    r, event = billet.reservation, billet.reservation.event
    verdict = _verdict(billet)
    controleur = billet.controle_par
    return {
        'code': billet.code,
        'statut': billet.statut,
        'statut_label': billet.get_statut_display(),
        'verdict': verdict,
        'message': MESSAGES[verdict],
        'type_billet': billet.type_billet.nom,
        'prix': str(billet.type_billet.prix),
        'titulaire': f"{r.user.prenom} {r.user.nom}".strip() or r.user.email,
        'reservation': r.code_reference,
        'event': {
            'id': event.id, 'titre': event.titre, 'date_evenement': event.date_evenement,
            'lieu': event.lieu, 'ville': event.ville, 'statut': event.statut,
        },
        'utilise_le': billet.utilise_le,
        'controle_par': f"{controleur.prenom} {controleur.nom}".strip() if controleur else None,
    }


def _billet_autorise(request, code):
    billet = get_object_or_404(
        Billet.objects.select_related('reservation__event', 'reservation__user', 'type_billet', 'controle_par'),
        code=code.strip().upper(),
    )
    user = request.user
    if user.role != 'admin' and billet.reservation.event.organisateur_id != user.id:
        return billet, Response({'detail': "Ce billet ne concerne pas vos événements."},
                                status=status.HTTP_403_FORBIDDEN)
    return billet, None


class BilletDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, code):
        billet, refus = _billet_autorise(request, code)
        return refus or Response(_donnees(billet))


class ValiderBilletView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, code):
        billet, refus = _billet_autorise(request, code)
        if refus:
            return refus
        with transaction.atomic():
            billet = Billet.objects.select_for_update().select_related(
                'reservation__event', 'reservation__user', 'type_billet').get(pk=billet.pk)
            if _verdict(billet) != 'valide':
                # Refus : déjà utilisé, annulé, événement annulé, paiement non reçu
                return Response(_donnees(billet), status=status.HTTP_409_CONFLICT)
            billet.statut = 'utilise'
            billet.utilise_le = timezone.now()
            billet.controle_par = request.user
            billet.save(update_fields=['statut', 'utilise_le', 'controle_par'])
        donnees = _donnees(billet)
        donnees['message'] = "Entrée validée."
        return Response(donnees)
