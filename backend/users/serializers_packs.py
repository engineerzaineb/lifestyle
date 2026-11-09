import re

from rest_framework import serializers
from .models import Pack, Abonnement


class PackSerializer(serializers.ModelSerializer):
    """Sérialise un pack d'abonnement (lecture + écriture admin)."""
    avantages_liste = serializers.ListField(read_only=True)
    est_gratuit = serializers.BooleanField(read_only=True)
    est_illimite = serializers.BooleanField(read_only=True)
    nb_abonnes = serializers.SerializerMethodField()

    class Meta:
        model = Pack
        fields = [
            'id', 'nom', 'description',
            'prix', 'duree',
            'limite_evenements', 'commission_pct',
            'avantages', 'avantages_liste',
            'is_actif', 'ordre',
            # Options incluses
            'mise_en_avant', 'stats_avancees', 'support_prioritaire', 'badge_verifie',
            # Limites supplémentaires
            'max_billets_par_event', 'max_types_billets', 'mises_en_avant_mois',
            # Présentation commerciale
            'couleur', 'etiquette', 'prix_barre', 'essai_jours',
            'est_gratuit', 'est_illimite', 'nb_abonnes',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_nb_abonnes(self, obj):
        return obj.abonnements.count()

    def validate_prix(self, value):
        if value < 0:
            raise serializers.ValidationError("Le prix ne peut pas être négatif.")
        return value

    def validate_commission_pct(self, value):
        if value < 0 or value > 100:
            raise serializers.ValidationError("La commission doit être comprise entre 0 et 100 %.")
        return value

    def validate_couleur(self, value):
        if not re.fullmatch(r"#[0-9A-Fa-f]{6}", value or ""):
            raise serializers.ValidationError("Couleur invalide (format attendu : #RRGGBB).")
        return value

    def validate(self, attrs):
        # Le prix barré n'a de sens que s'il est supérieur au prix actuel
        prix = attrs.get('prix', getattr(self.instance, 'prix', 0))
        prix_barre = attrs.get('prix_barre', getattr(self.instance, 'prix_barre', None))
        if prix_barre is not None and prix_barre <= prix:
            raise serializers.ValidationError(
                {'prix_barre': "Le prix barré doit être supérieur au prix du pack."})
        return attrs


class AbonnementSerializer(serializers.ModelSerializer):
    """Sérialise l'abonnement d'un organisateur (avec détails du pack)."""
    pack = PackSerializer(read_only=True)
    pack_id = serializers.PrimaryKeyRelatedField(
        queryset=Pack.objects.all(), source='pack', write_only=True
    )
    organisateur_email = serializers.EmailField(
        source='organisateur.email', read_only=True
    )
    organisateur_nom = serializers.SerializerMethodField()
    events_utilises = serializers.SerializerMethodField()
    events_restants = serializers.SerializerMethodField()
    est_expire = serializers.BooleanField(read_only=True)
    est_actif = serializers.BooleanField(read_only=True)

    class Meta:
        model = Abonnement
        fields = [
            'id', 'organisateur', 'organisateur_email', 'organisateur_nom',
            'pack', 'pack_id',
            'date_debut', 'date_fin', 'statut', 'est_expire', 'est_actif',
            'events_utilises', 'events_restants',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'organisateur', 'date_debut', 'created_at', 'updated_at',
        ]

    def get_organisateur_nom(self, obj):
        return f"{obj.organisateur.prenom} {obj.organisateur.nom}".strip()

    def get_events_utilises(self, obj):
        return obj.events_utilises()

    def get_events_restants(self, obj):
        return obj.events_restants()