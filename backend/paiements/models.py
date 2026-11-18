from django.conf import settings
from django.db import models


class Paiement(models.Model):
    """Un paiement en ligne passé par Stripe : une réservation, ou la souscription
    d'un organisateur à un pack. L'identifiant Stripe est conservé pour la traçabilité."""

    TYPE_CHOICES = (
        ('reservation', 'Réservation'),
        ('pack', 'Pack organisateur'),
    )
    STATUT_CHOICES = (
        ('en_attente', 'En attente'),
        ('reussi', 'Réussi'),
        ('echoue', 'Échoué'),
        ('expire', 'Expiré'),
        ('annule', 'Annulé'),
        ('rembourse', 'Remboursé'),
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='paiements',
    )
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    reservation = models.ForeignKey(
        'events.Reservation', on_delete=models.PROTECT, null=True, blank=True, related_name='paiements',
    )
    pack = models.ForeignKey(
        'users.Pack', on_delete=models.PROTECT, null=True, blank=True, related_name='paiements',
    )
    montant = models.DecimalField(max_digits=10, decimal_places=3, help_text="Montant en DT")
    devise = models.CharField(max_length=3, default='tnd')
    statut = models.CharField(max_length=12, choices=STATUT_CHOICES, default='en_attente')

    # Références Stripe
    stripe_session_id = models.CharField(max_length=255, unique=True, null=True, blank=True)
    stripe_payment_intent = models.CharField(max_length=255, blank=True)
    checkout_url = models.TextField(blank=True)

    expire_le = models.DateTimeField(null=True, blank=True)
    paye_le = models.DateTimeField(null=True, blank=True)
    rembourse_le = models.DateTimeField(null=True, blank=True)
    erreur = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [models.Index(fields=['statut', 'expire_le'])]

    def __str__(self):
        cible = self.reservation.code_reference if self.reservation_id else (self.pack.nom if self.pack_id else '')
        return f"Paiement #{self.pk} — {self.get_type_display()} {cible} — {self.montant} DT ({self.statut})"
