from django.utils import timezone
from rest_framework import serializers

from .models import Paiement


class PaiementSerializer(serializers.ModelSerializer):
    statut_label = serializers.CharField(source='get_statut_display', read_only=True)
    type_label = serializers.CharField(source='get_type_display', read_only=True)
    reservation = serializers.SerializerMethodField()
    pack = serializers.SerializerMethodField()
    checkout_url = serializers.SerializerMethodField()

    class Meta:
        model = Paiement
        fields = [
            'id', 'type', 'type_label', 'statut', 'statut_label', 'montant', 'devise',
            'created_at', 'expire_le', 'paye_le', 'rembourse_le',
            'reservation', 'pack', 'checkout_url',
        ]

    def get_reservation(self, obj):
        r = obj.reservation
        if r is None:
            return None
        return {
            'id': r.id, 'code_reference': r.code_reference, 'statut': r.statut,
            'event': {'id': r.event_id, 'titre': r.event.titre},
            'nb_billets': r.billets.count(),
        }

    def get_pack(self, obj):
        return {'id': obj.pack_id, 'nom': obj.pack.nom} if obj.pack_id else None

    def get_checkout_url(self, obj):
        # Lien de paiement utilisable seulement tant que la page Stripe est ouverte
        ouvert = obj.statut == 'en_attente' and obj.expire_le and obj.expire_le > timezone.now()
        return obj.checkout_url if ouvert else None
