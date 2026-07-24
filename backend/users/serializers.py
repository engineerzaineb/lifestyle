from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.password_validation import validate_password
from .models import User, UserLocation, Interet
from .models import DemandeOrganisateur


# Serializer pour un centre d'intérêt
class InteretSerializer(serializers.ModelSerializer):
    class Meta:
        model = Interet
        fields = ['id', 'nom', 'slug', 'icone', 'is_official']
        read_only_fields = ['id', 'slug', 'is_official']


# Serializer pour une entrée d'historique de position
class UserLocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserLocation
        fields = [
            'id',
            'latitude',
            'longitude',
            'detected_at',
            'source',
            'ville_detectee',
        ]
        read_only_fields = ['id', 'detected_at']


# Serializer pour afficher les infos publiques d'un utilisateur
class UserSerializer(serializers.ModelSerializer):
    has_location = serializers.BooleanField(read_only=True)
    interets = InteretSerializer(many=True, read_only=True)

    class Meta:
        model = User
        fields = [
            'id',
            'email',
            'nom',
            'prenom',
            'telephone',
            'ville',
            'role',
            'is_organisateur',
            'current_latitude',
            'current_longitude',
            'last_location_update',
            'has_location',
            'interets',
            'is_active',
            'created_at',
        ]
        read_only_fields = ['id', 'is_active', 'created_at', 'last_location_update']


# Serializer pour l'inscription
class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password],
        min_length=8,
    )

    # Champs temporaires (pas dans le modèle mais reçus du frontend)
    latitude = serializers.DecimalField(
        max_digits=9,
        decimal_places=6,
        required=False,
        allow_null=True,
        write_only=True,
    )
    longitude = serializers.DecimalField(
        max_digits=9,
        decimal_places=6,
        required=False,
        allow_null=True,
        write_only=True,
    )

    class Meta:
        model = User
        fields = [
            'email',
            'nom',
            'prenom',
            'telephone',
            'ville',
            'latitude',
            'longitude',
            'password',
        ]
        extra_kwargs = {
            'telephone': {'required': False, 'allow_blank': True},
            'ville': {'required': False, 'allow_blank': True},
        }

    # Validation : email unique et en minuscules
    def validate_email(self, value):
        if User.objects.filter(email=value.lower()).exists():
            raise serializers.ValidationError("Cet email est déjà utilisé.")
        return value.lower()

    # Validation : latitude entre -90 et 90
    def validate_latitude(self, value):
        if value is not None and (value < -90 or value > 90):
            raise serializers.ValidationError("La latitude doit être entre -90 et 90.")
        return value

    # Validation : longitude entre -180 et 180
    def validate_longitude(self, value):
        if value is not None and (value < -180 or value > 180):
            raise serializers.ValidationError("La longitude doit être entre -180 et 180.")
        return value

    # Crée le user et enregistre la position (si fournie)
    # Le rôle est TOUJOURS 'utilisateur' au signup.
    # Devenir organisateur passe par DemandeOrganisateur (validée par un admin).
    # Devenir admin passe par `createsuperuser`.
    def create(self, validated_data):
        latitude = validated_data.pop('latitude', None)
        longitude = validated_data.pop('longitude', None)
        password = validated_data.pop('password')

        # Forçage du rôle, peu importe ce que le frontend envoie
        validated_data['role'] = 'utilisateur'

        user = User.objects.create_user(password=password, **validated_data)

        # Si la position est fournie, on l'enregistre via la méthode du modèle
        if latitude is not None and longitude is not None:
            user.update_location(latitude, longitude, source='register')

        return user


# Serializer pour mettre à jour la localisation d'un user existant
class UpdateLocationSerializer(serializers.Serializer):
    latitude = serializers.DecimalField(max_digits=9, decimal_places=6)
    longitude = serializers.DecimalField(max_digits=9, decimal_places=6)
    source = serializers.ChoiceField(
        choices=['login', 'manual', 'event_view'],
        default='login',
        required=False,
    )

    def validate_latitude(self, value):
        if value < -90 or value > 90:
            raise serializers.ValidationError("La latitude doit être entre -90 et 90.")
        return value

    def validate_longitude(self, value):
        if value < -180 or value > 180:
            raise serializers.ValidationError("La longitude doit être entre -180 et 180.")
        return value


# Serializer pour mettre à jour les centres d'intérêt d'un user
class UpdateInteretsSerializer(serializers.Serializer):
    # Liste des IDs d'intérêts officiels que l'utilisateur a sélectionnés
    interet_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        default=list,
    )

    # Liste des noms d'intérêts personnalisés que l'utilisateur a tapés
    custom_interets = serializers.ListField(
        child=serializers.CharField(max_length=50),
        required=False,
        default=list,
    )


# Helper pour générer la réponse complète après login/register (user + tokens)
class AuthResponseSerializer:
    @staticmethod
    def get_response_data(user):
        refresh = RefreshToken.for_user(user)
        return {
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data,
        }



class DemandeOrganisateurCreateSerializer(serializers.ModelSerializer):
    """Pour créer une demande (côté user)"""
    
    class Meta:
        model = DemandeOrganisateur
        fields = [
            'nom_organisation', 'type_organisation', 'matricule_fiscal',
            'adresse', 'telephone_pro', 'description', 'site_web', 'logo',
            'categories_prevues',
        ]


class DemandeOrganisateurReadSerializer(serializers.ModelSerializer):
    """Pour afficher une demande (côté user et admin)"""
    user_email = serializers.CharField(source='user.email', read_only=True)
    user_nom = serializers.CharField(source='user.nom', read_only=True)
    user_prenom = serializers.CharField(source='user.prenom', read_only=True)
    categories_prevues_noms = serializers.SerializerMethodField()
    traite_par_email = serializers.CharField(source='traite_par.email', read_only=True)

    class Meta:
        model = DemandeOrganisateur
        fields = [
            'id', 'user_email', 'user_nom', 'user_prenom',
            'nom_organisation', 'type_organisation', 'matricule_fiscal',
            'adresse', 'telephone_pro', 'description', 'site_web', 'logo',
            'categories_prevues', 'categories_prevues_noms',
            'statut', 'motif_refus',
            'date_demande', 'date_traitement', 'traite_par_email',
        ]
        read_only_fields = ['statut', 'motif_refus', 'date_demande', 'date_traitement']

    def get_categories_prevues_noms(self, obj):
        return [c.nom for c in obj.categories_prevues.all()]