from django.contrib import admin

from .models import Paiement


@admin.register(Paiement)
class PaiementAdmin(admin.ModelAdmin):
    list_display = ('id', 'type', 'user', 'montant', 'statut', 'created_at', 'paye_le')
    list_filter = ('type', 'statut')
    search_fields = ('user__email', 'stripe_session_id', 'stripe_payment_intent')
    readonly_fields = ('stripe_session_id', 'stripe_payment_intent', 'checkout_url', 'created_at', 'updated_at')
