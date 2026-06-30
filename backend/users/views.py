from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework import viewsets

from .models import User, UserLocation, Interet
from .serializers import (
    RegisterSerializer,
    UserSerializer,
    UserLocationSerializer,
    UpdateLocationSerializer,
    InteretSerializer,
    UpdateInteretsSerializer,
    AuthResponseSerializer,
)


# Vue d'inscription 
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


# Serializer personnalisé pour le login 
class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = User.USERNAME_FIELD

    def validate(self, attrs):
        if 'email' in attrs:
            attrs['email'] = attrs['email'].lower()

        data = super().validate(attrs)
        data['user'] = UserSerializer(self.user).data
        return data


# Vue de login personnalisée
class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


# Vue de logout : blacklist le refresh token
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


# Vue pour récupérer le user connecté
class MeView(generics.RetrieveAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


# Vue pour mettre à jour la localisation 
# Met à jour current_lat/lng ET ajoute à l'historique UserLocation
class UpdateLocationView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request):
        serializer = UpdateLocationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user

        # Utilise la méthode du modèle qui gère tout (current + historique)
        user.update_location(
            latitude=serializer.validated_data['latitude'],
            longitude=serializer.validated_data['longitude'],
            source=serializer.validated_data.get('source', 'login'),
        )

        return Response(UserSerializer(user).data, status=status.HTTP_200_OK)


# Vue pour récupérer l'historique des localisations
class MyLocationsView(generics.ListAPIView):
    serializer_class = UserLocationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Retourne les 50 dernières positions du user
        return UserLocation.objects.filter(user=self.request.user)[:50]
# Liste les intérêts officiels
class InteretListView(generics.ListAPIView):
    queryset = Interet.objects.filter(is_official=True)
    serializer_class = InteretSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None


# Met à jour les intérêts du user connecté
class UpdateUserInteretsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request):
        serializer = UpdateInteretsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        interet_ids = serializer.validated_data.get('interet_ids', [])
        custom_interets = serializer.validated_data.get('custom_interets', [])

        # Ajoute les intérêts officiels
        if interet_ids:
            interets_officiels = Interet.objects.filter(
                id__in=interet_ids,
                is_official=True,
            )
            user.interets.set(interets_officiels)
        else:
            user.interets.clear()

        # Crée et ajoute les intérêts personnalisés
        for nom_custom in custom_interets:
            nom_custom = nom_custom.strip()
            if not nom_custom:
                continue
            interet, _ = Interet.objects.get_or_create(
                nom__iexact=nom_custom,
                defaults={'nom': nom_custom.title(), 'is_official': False},
            )
            user.interets.add(interet)

        return Response(UserSerializer(user).data, status=status.HTTP_200_OK)