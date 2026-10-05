"""Système de fidélité : paliers et remises calculés depuis les réservations.

Le palier n'est jamais stocké : il est dérivé du nombre de réservations
confirmées du user. Le palier est recalculé à chaque fois qu'on en a besoin, et la remise est appliquée au moment de payer. Cela permet de ne pas avoir à gérer de
synchronisation entre le nombre de réservations et le palier stocké, et de ne pas avoir à recalculer la remise à chaque changement de palier.
Le palier est calculé à partir de la liste PALIERS, qui contient les paliers ordonnés du plus haut au plus bas, avec le seuil minimum de réservations pour atteindre le palier, le nom du palier, le pourcentage de remise et la couleur associée.  
"""

# Paliers ordonnés du plus haut au plus bas : (seuil_min, nom, remise_pct, couleur)
PALIERS = [
    (15, 'Platinum', 15, '#7C3AED'),   # violet platine
    (7,  'Gold',     10, '#EAB308'),   # doré
    (3,  'Silver',   5,  '#94A3B8'),   # argenté
    (0,  'Membre',   0,  '#64748B'),   # gris neutre
]


def compter_reservations_confirmees(user):
    """Nombre de réservations confirmées du user (la base de tout le calcul)."""
    if not user.is_authenticated:
        return 0
    return user.reservations.filter(statut='confirmee').count()


def get_palier_info(user):
    """Renvoie le palier complet du user + sa progression vers le suivant."""
    nb = compter_reservations_confirmees(user)

    # Trouver le palier actuel (le premier dont le seuil est atteint)
    for i, (seuil, nom, remise, couleur) in enumerate(PALIERS):
        if nb >= seuil:
            palier_actuel = {'nom': nom, 'remise_pct': remise, 'couleur': couleur, 'seuil': seuil}
            # Le palier suivant est celui juste au-dessus dans la liste (i-1)
            if i > 0:
                seuil_suivant, nom_suivant, remise_suivante, _ = PALIERS[i - 1]
                suivant = {
                    'nom': nom_suivant,
                    'remise_pct': remise_suivante,
                    'seuil': seuil_suivant,
                    'reservations_restantes': seuil_suivant - nb,
                }
            else:
                suivant = None  # déjà au palier max
            return {
                'nb_reservations': nb,
                'palier': palier_actuel,
                'palier_suivant': suivant,
            }

    # Ne devrait jamais arriver (le seuil 0 attrape tout)
    return {'nb_reservations': nb, 'palier': None, 'palier_suivant': None}


def remise_fidelite_pct(user):
    """Juste le pourcentage de remise du user (utilisé au moment de payer)."""
    info = get_palier_info(user)
    return info['palier']['remise_pct'] if info['palier'] else 0