"""Logique des paiements : démarrage, confirmation (webhook ou retour), échec,
expiration, remboursement, et souscription d'un pack par un organisateur.

Règle d'or : seule une confirmation venant de Stripe (webhook signé, ou session
relue auprès de Stripe) confirme une réservation. Le retour du navigateur ne suffit jamais.
"""
from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from events.models import Reservation, notifier, notifier_admins
from events.reservations import annuler_reservation, confirmer_reservation, delai_paiement
from users.models import Abonnement, journaliser, resume_abonnement

from . import stripe_service
from .models import Paiement
from .stripe_service import PaiementIndisponible


# ---------------------------------------------------------------------------
# Outils
# ---------------------------------------------------------------------------
def _get(obj, cle, defaut=None):
    """Lit un champ d'un objet Stripe (ou d'un dict) sans dépendre de la version de la bibliothèque."""
    try:
        valeur = obj[cle]
    except (KeyError, TypeError, AttributeError):
        valeur = getattr(obj, cle, defaut)
    return defaut if valeur is None else valeur


def _urls_retour():
    front = settings.FRONTEND_URL.rstrip('/')
    return (
        f"{front}/paiement/succes?session_id={{CHECKOUT_SESSION_ID}}",
        f"{front}/paiement/annule?session_id={{CHECKOUT_SESSION_ID}}",
    )


def _cible(p):
    return f"Réservation {p.reservation.code_reference}" if p.reservation_id else f"Pack {p.pack.nom}"


def _journal(p, action, acteur=None, motif=''):
    journaliser(
        'paiement', action, cible_id=p.pk, cible_nom=_cible(p),
        acteur=acteur, concerne=p.user, motif=motif,
        details={
            'montant': f"{p.montant} DT",
            'reference_stripe': p.stripe_payment_intent or p.stripe_session_id or '',
        },
    )


def _demarrer(paiement, libelle, description):
    """Crée la page de paiement Stripe ; en cas de refus, le paiement est marqué échoué."""
    succes, annule = _urls_retour()
    try:
        sid, url = stripe_service.creer_session(paiement, libelle, description, succes, annule)
    except PaiementIndisponible as e:
        paiement.statut = 'echoue'
        paiement.erreur = str(e)
        paiement.save(update_fields=['statut', 'erreur', 'updated_at'])
        raise
    paiement.stripe_session_id = sid
    paiement.checkout_url = url
    paiement.save(update_fields=['stripe_session_id', 'checkout_url', 'updated_at'])
    return paiement


# ---------------------------------------------------------------------------
# Démarrer un paiement
# ---------------------------------------------------------------------------
def demarrer_paiement_reservation(reservation):
    """Réservation payante en attente : crée le paiement et la page Stripe."""
    expire = reservation.expire_le or (timezone.now() + delai_paiement())
    paiement = Paiement.objects.create(
        user=reservation.user, type='reservation', reservation=reservation,
        montant=reservation.total_prix, devise=stripe_service.devise(), expire_le=expire,
    )
    items = reservation.items.select_related('type_billet')
    detail = ", ".join(f"{i.quantite}x {i.type_billet.nom}" for i in items)
    return _demarrer(
        paiement,
        libelle=f"{reservation.event.titre} — {reservation.total_places} billet(s)",
        description=f"{detail} · Réf {reservation.code_reference}",
    )


def demarrer_paiement_pack(user, pack):
    """Un organisateur souscrit à un pack payant : crée le paiement et la page Stripe."""
    paiement = Paiement.objects.create(
        user=user, type='pack', pack=pack, montant=pack.prix,
        devise=stripe_service.devise(), expire_le=timezone.now() + delai_paiement(),
    )
    duree = "1 an" if pack.duree == 'annuel' else "1 mois"
    return _demarrer(
        paiement,
        libelle=f"Pack {pack.nom} — {duree}",
        description=pack.description or f"Abonnement organisateur, pack {pack.nom}",
    )


# ---------------------------------------------------------------------------
# Résultat d'un paiement (webhook Stripe, ou session relue auprès de Stripe)
# ---------------------------------------------------------------------------
def _paiement_depuis_session(session):
    p = Paiement.objects.filter(stripe_session_id=_get(session, 'id')).first()
    if p is None:
        pid = _get(_get(session, 'metadata', {}), 'paiement_id') or _get(session, 'client_reference_id')
        if pid and str(pid).isdigit():
            p = Paiement.objects.filter(pk=int(pid)).first()
    return p


def traiter_session(session, evenement=None):
    """Applique l'état d'une session Stripe Checkout au paiement correspondant."""
    p = _paiement_depuis_session(session)
    if p is None:
        return None
    if _get(session, 'payment_status') in ('paid', 'no_payment_required'):
        return _paiement_reussi(p, _get(session, 'payment_intent', ''))
    if evenement == 'checkout.session.async_payment_failed':
        return _paiement_termine_sans_succes(p, 'echoue', "Paiement refusé.")
    if evenement == 'checkout.session.expired' or _get(session, 'status') == 'expired':
        return _paiement_termine_sans_succes(p, 'expire', "Délai de paiement dépassé.")
    return p  # page encore ouverte : rien à faire


def _paiement_reussi(p, payment_intent):
    with transaction.atomic():
        p = Paiement.objects.select_for_update().get(pk=p.pk)
        if p.statut in ('reussi', 'rembourse'):
            return p  # déjà traité (webhook reçu deux fois, ou retour + webhook)
        p.statut = 'reussi'
        p.paye_le = timezone.now()
        p.stripe_payment_intent = payment_intent or p.stripe_payment_intent
        p.save(update_fields=['statut', 'paye_le', 'stripe_payment_intent', 'updated_at'])
    _journal(p, 'paye', acteur=p.user)

    if p.type == 'reservation':
        r, _ = confirmer_reservation(p.reservation, via_paiement=True)
        if r.statut == 'annulee':
            # Paiement arrivé après l'annulation (délai dépassé, annulation) : on rembourse
            try:
                rembourser_paiement(p, motif="Paiement reçu après l'annulation de la réservation.")
                notifier(p.user, f"Votre paiement pour « {r.event.titre} » est arrivé après l'annulation "
                                 "de la réservation : il vous a été remboursé.", lien="/my-reservations")
            except PaiementIndisponible as e:
                _signaler_remboursement_manuel(p, e)
    elif p.type == 'pack':
        activer_pack(p)
    return p


def _paiement_termine_sans_succes(p, statut, motif):
    with transaction.atomic():
        p = Paiement.objects.select_for_update().get(pk=p.pk)
        if p.statut != 'en_attente':
            return p
        p.statut = statut
        p.save(update_fields=['statut', 'updated_at'])
    if p.type == 'reservation' and p.reservation.statut == 'en_attente_paiement':
        annuler_reservation(p.reservation, motif=f"Paiement non effectué : {motif.lower()}")
    if statut == 'echoue':
        _journal(p, 'echoue', acteur=p.user, motif=motif)
    return p


def synchroniser(p):
    """Relit la session auprès de Stripe (utile si le webhook n'est pas encore arrivé)."""
    if p.statut != 'en_attente' or not p.stripe_session_id:
        return p
    try:
        traiter_session(stripe_service.recuperer_session(p.stripe_session_id))
    except Exception:  # Stripe injoignable : on garde l'état connu, le webhook prendra le relais
        return p
    p.refresh_from_db()
    return p


def annuler_paiement_en_cours(p):
    """L'utilisateur a quitté la page Stripe sans payer : ferme la page et libère les places."""
    if p.statut != 'en_attente':
        return p
    if p.stripe_session_id:
        stripe_service.expirer_session(p.stripe_session_id)
    return _paiement_termine_sans_succes(p, 'annule', "Paiement abandonné.")


def expirer_paiements():
    """Annule les réservations et paiements dont le délai de paiement est dépassé.
    Les places sont déjà libérées par le calcul du stock ; ceci met les statuts à jour."""
    maintenant = timezone.now()
    for p in Paiement.objects.filter(statut='en_attente', expire_le__lte=maintenant):
        _paiement_termine_sans_succes(p, 'expire', "Délai de paiement dépassé.")
    for r in Reservation.objects.filter(statut='en_attente_paiement', expire_le__lte=maintenant):
        annuler_reservation(r, motif="Paiement non effectué dans le délai.")


# ---------------------------------------------------------------------------
# Packs
# ---------------------------------------------------------------------------
def activer_pack(p):
    """Paiement d'un pack réussi : l'abonnement est activé (ou prolongé)."""
    user, pack = p.user, p.pack
    maintenant = timezone.now()
    abo = Abonnement.objects.filter(organisateur=user).select_related('pack').first()
    ancien_pack = abo.pack.nom if abo else None
    # Même pack encore actif : la nouvelle période s'ajoute à la fin de l'actuelle
    debut = maintenant
    if abo and abo.pack_id == pack.id and abo.est_actif and abo.date_fin and abo.date_fin > maintenant:
        debut = abo.date_fin
    date_fin = debut + timedelta(days=pack.nb_jours)
    abo, _ = Abonnement.objects.update_or_create(
        organisateur=user,
        defaults={'pack': pack, 'date_fin': date_fin, 'statut': 'actif', 'assigne_par': None},
    )
    journaliser('abonnement', 'attribue', cible_id=abo.pk, cible_nom=pack.nom,
                acteur=user, concerne=user,
                details={**resume_abonnement(abo), 'ancien_pack': ancien_pack, 'via': 'Paiement en ligne'})
    notifier(user, f"Paiement reçu : votre pack « {pack.nom} » est actif jusqu'au "
                   f"{timezone.localtime(date_fin):%d/%m/%Y}.", lien="/organizer/abonnement")
    notifier_admins(f"{user.prenom} {user.nom} a souscrit au pack « {pack.nom} » ({p.montant} DT).",
                    lien="/admin/users")
    return abo


# ---------------------------------------------------------------------------
# Remboursements et annulations
# ---------------------------------------------------------------------------
def rembourser_paiement(p, motif='', acteur=None):
    """Rembourse intégralement un paiement réussi. Lève PaiementIndisponible si Stripe refuse."""
    if p.statut == 'rembourse':
        return p
    if p.statut != 'reussi' or not p.stripe_payment_intent:
        raise PaiementIndisponible("Aucun paiement réussi à rembourser.")
    stripe_service.rembourser(p.stripe_payment_intent)
    p.statut = 'rembourse'
    p.rembourse_le = timezone.now()
    p.save(update_fields=['statut', 'rembourse_le', 'updated_at'])
    _journal(p, 'rembourse', acteur=acteur, motif=motif)
    return p


def _signaler_remboursement_manuel(p, erreur):
    p.erreur = str(erreur)
    p.save(update_fields=['erreur', 'updated_at'])
    notifier_admins(f"Remboursement à faire manuellement : paiement #{p.pk} ({_cible(p)}, "
                    f"{p.montant} DT). Raison : {erreur}", lien="/admin/journal")


def annuler_reservation_avec_paiement(r, motif='', acteur=None, forcer_remboursement=False):
    """Annule une réservation en tenant compte du paiement.
    Renvoie 'avant_paiement', 'rembourse' ou 'gratuite'.
    Lève PaiementIndisponible si le remboursement est impossible (rien n'est annulé)."""
    if r.statut == 'en_attente_paiement':
        for p in r.paiements.filter(statut='en_attente'):
            annuler_paiement_en_cours(p)
        annuler_reservation(r, motif)
        return 'avant_paiement'
    paye = r.paiements.filter(statut='reussi').first()
    if paye:
        if not (forcer_remboursement or getattr(settings, 'REMBOURSEMENT_AUTORISE', True)):
            raise PaiementIndisponible("Les billets payés ne sont pas remboursables.")
        rembourser_paiement(paye, motif=motif or "Annulation de la réservation", acteur=acteur)
        annuler_reservation(r, motif)
        return 'rembourse'
    annuler_reservation(r, motif)
    return 'gratuite'


def annuler_reservations_evenement(event, motif='', acteur=None):
    """Événement annulé par l'organisateur : toutes les réservations sont annulées
    et les paiements remboursés. Un remboursement refusé est signalé aux admins."""
    resultat = {'annulees': 0, 'remboursees': 0, 'a_rembourser': 0}
    for r in Reservation.objects.filter(event=event, statut__in=('confirmee', 'en_attente_paiement')):
        try:
            issue = annuler_reservation_avec_paiement(
                r, motif=f"Événement annulé. {motif}".strip(), acteur=acteur, forcer_remboursement=True)
            resultat['annulees'] += 1
            resultat['remboursees'] += issue == 'rembourse'
        except PaiementIndisponible as e:
            resultat['a_rembourser'] += 1
            paye = r.paiements.filter(statut='reussi').first()
            if paye:
                _signaler_remboursement_manuel(paye, e)
    return resultat
