from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework import viewsets

from .models import User, UserLocation, Interet
from events.models import Categorie
from .serializers import (
    RegisterSerializer,
    UserSerializer,
    UserLocationSerializer,
    UpdateLocationSerializer,
    InteretSerializer,
    UpdateInteretsSerializer,
    AuthResponseSerializer,
    UserUpdateSerializer,
    ChangePasswordSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
)
from .emails import send_password_reset_email, send_password_changed_email

# vue d'inscription 
class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Génère les tokens et renvoie tout au frontend
        response_data = AuthResponseSerializer.get_response_data(user)
        return Response(response_data, status=status.HTTP_201_CREATED)


# serializer le login 
class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = User.USERNAME_FIELD

    def validate(self, attrs):
        if 'email' in attrs:
            attrs['email'] = attrs['email'].lower()

        data = super().validate(attrs)
        data['user'] = UserSerializer(self.user).data
        return data


# vue de login personnalisée
class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


# vue de logout : blacklist le refresh token
class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data["refresh"]
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response(
                {"message": "Déconnexion réussie"},
                status=status.HTTP_200_OK
            )
        except KeyError:
            return Response(
                {"error": "Le refresh token est requis"},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


# vue pour récupérer le user connecté
class MeView(generics.RetrieveUpdateAPIView):
    """GET  /api/auth/me/  -> profil complet
    PATCH /api/auth/me/  -> modifie nom, prenom, telephone, ville
    """
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['get', 'patch', 'head', 'options']

    def get_object(self):
        return self.request.user

    def get_serializer_class(self):
        if self.request.method in ('PATCH', 'PUT'):
            return UserUpdateSerializer
        return UserSerializer

    def update(self, request, *args, **kwargs):
        # on valide avec le serializer restreint, mais on renvoie
        # le profil complet pour que le frontend puisse rafraichir son state.
        response = super().update(request, *args, **kwargs)
        return Response(UserSerializer(request.user).data)


# vue pour mettre à jour la localisation 
# met à jour current_lat/lng ET ajoute à l'historique UserLocation
class UpdateLocationView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request):
        serializer = UpdateLocationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user

        # utilise la méthode du modèle qui gère tout (current + historique)
        user.update_location(
            latitude=serializer.validated_data['latitude'],
            longitude=serializer.validated_data['longitude'],
            source=serializer.validated_data.get('source', 'login'),
        )

        return Response(UserSerializer(user).data, status=status.HTTP_200_OK)


# vue pour récupérer l'historique des localisations
class MyLocationsView(generics.ListAPIView):
    serializer_class = UserLocationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Retourne les 50 dernières positions du user
        return UserLocation.objects.filter(user=self.request.user)[:50]
# liste les intérets officiels
class InteretListView(generics.ListAPIView):
    queryset = Categorie.objects.filter(is_validee=True).order_by('nom')
    serializer_class = InteretSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None


# met à jour les intérêts du user connecté
class UpdateUserInteretsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request):
        serializer = UpdateInteretsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        interet_ids = serializer.validated_data.get('interet_ids', [])
        custom_interets = serializer.validated_data.get('custom_interets', [])

        # ajouter les Intérets officiels = catégories validées choisies
        if interet_ids:
            categories = Categorie.objects.filter(id__in=interet_ids, is_validee=True)
            user.interets.set(categories)
        else:
            user.interets.clear()

        # intérets personnalisés → nouvelle catégorie (en attente d'admin)
        for nom_custom in custom_interets:
            nom_custom = nom_custom.strip()
            if not nom_custom:
                continue
            cat, _ = Categorie.objects.get_or_create(
                nom__iexact=nom_custom,
                defaults={'nom': nom_custom.title(), 'is_validee': False, 'proposee_par': user},
            )
            user.interets.add(cat)

        return Response(UserSerializer(user).data, status=status.HTTP_200_OK)
class ChangePasswordView(APIView):
    """POST /api/auth/me/password/  body: { old_password, new_password }"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data, context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({'detail': 'Mot de passe modifié avec succès.'})
class PasswordResetRequestView(APIView):
    """POST /api/auth/password-reset/  body: { email }
    Réponse toujours identique, que le compte existe ou non."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.get_user()
        if user:
            try:
                send_password_reset_email(user)
            except Exception as e:
                # Un échec d'envoi ne doit pas révéler l'existence du compte
                print(f"[EMAIL] Échec envoi réinitialisation : {e}")

        return Response({
            'detail': "Si un compte existe pour cette adresse, "
                      "un email vient d'être envoyé."
        })


class PasswordResetConfirmView(APIView):
    """POST /api/auth/password-reset/confirm/
    body: { uid, token, new_password }"""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        try:
            send_password_changed_email(user)
        except Exception as e:
            print(f"[EMAIL] Échec notification changement : {e}")

        return Response({'detail': 'Mot de passe réinitialisé avec succès.'})