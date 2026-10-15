"""
Authentification sociale (Google / Facebook).

Principe (flux "token côté client") :
  1. Le frontend ouvre la fenêtre Google/Facebook et récupère un token du
     fournisseur (id_token pour Google, access_token pour Facebook).
  2. Le frontend envoie ce token à ces vues.
  3. On VÉRIFIE le token directement auprès du fournisseur (on ne fait jamais
     confiance au front), on récupère l'email + le nom.
  4. On crée l'utilisateur s'il n'existe pas, sinon on le récupère.
  5. On renvoie EXACTEMENT le même format que le login classique :
     { access, refresh, user }  -> le front le stocke comme d'habitude.

NB : les clés (Client ID / Secret) viennent des comptes développeur de
l'entreprise et sont lues depuis le .env (voir settings.SOCIALACCOUNT_PROVIDERS).
Tant qu'elles ne sont pas renseignées, ces vues renvoient une erreur claire.
"""

import requests
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User
from .serializers import UserSerializer


def _jwt_response_for(user):
    """Génère { access, refresh, user } pour un utilisateur donné.
    Même format que le login classique (CustomTokenObtainPairView)."""
    refresh = RefreshToken.for_user(user)
    return {
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'user': UserSerializer(user).data,
    }


def _get_or_create_user(email, prenom='', nom=''):
    """Récupère l'utilisateur par email, ou le crée (compte social).
    Le compte social n'a pas de mot de passe utilisable (set_unusable_password)."""
    email = (email or '').lower().strip()
    user = User.objects.filter(email=email).first()
    if user:
        return user
    user = User(email=email, prenom=prenom or '', nom=nom or '')
    user.set_unusable_password()
    user.save()
    return user


class GoogleLoginView(APIView):
    """POST /api/auth/social/google/   body: { "token": "<id_token Google>" }
    Vérifie l'id_token auprès de Google puis renvoie { access, refresh, user }.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        token = request.data.get('token')
        if not token:
            return Response({'detail': 'Token Google manquant.'},
                            status=status.HTTP_400_BAD_REQUEST)

        # Vérification de l'id_token auprès de Google (endpoint officiel tokeninfo)
        try:
            resp = requests.get(
                'https://oauth2.googleapis.com/tokeninfo',
                params={'id_token': token},
                timeout=10,
            )
        except requests.RequestException:
            return Response({'detail': 'Impossible de contacter Google.'},
                            status=status.HTTP_502_BAD_GATEWAY)

        if resp.status_code != 200:
            return Response({'detail': 'Token Google invalide.'},
                            status=status.HTTP_401_UNAUTHORIZED)

        data = resp.json()

        # Sécurité : le token doit bien être émis pour NOTRE application (client_id)
        google_cfg = settings.SOCIALACCOUNT_PROVIDERS.get('google', {}).get('APP', {})
        expected_client_id = google_cfg.get('client_id')
        if expected_client_id and data.get('aud') != expected_client_id:
            return Response({'detail': "Ce token n'a pas été émis pour cette application."},
                            status=status.HTTP_401_UNAUTHORIZED)

        email = data.get('email')
        if not email:
            return Response({'detail': 'Email introuvable dans le token Google.'},
                            status=status.HTTP_400_BAD_REQUEST)

        user = _get_or_create_user(
            email=email,
            prenom=data.get('given_name', ''),
            nom=data.get('family_name', ''),
        )
        return Response(_jwt_response_for(user), status=status.HTTP_200_OK)


class FacebookLoginView(APIView):
    """POST /api/auth/social/facebook/   body: { "token": "<access_token Facebook>" }
    Vérifie l'access_token auprès de Facebook puis renvoie { access, refresh, user }.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        token = request.data.get('token')
        if not token:
            return Response({'detail': 'Token Facebook manquant.'},
                            status=status.HTTP_400_BAD_REQUEST)

        # On demande l'email + le nom à l'API Graph en présentant l'access_token
        try:
            resp = requests.get(
                'https://graph.facebook.com/me',
                params={'fields': 'id,email,first_name,last_name', 'access_token': token},
                timeout=10,
            )
        except requests.RequestException:
            return Response({'detail': 'Impossible de contacter Facebook.'},
                            status=status.HTTP_502_BAD_GATEWAY)

        if resp.status_code != 200:
            return Response({'detail': 'Token Facebook invalide.'},
                            status=status.HTTP_401_UNAUTHORIZED)

        data = resp.json()
        email = data.get('email')
        if not email:
            # Facebook peut ne pas renvoyer l'email si l'utilisateur ne l'a pas partagé
            return Response(
                {'detail': "Facebook n'a pas fourni d'email. Autorisez le partage de l'email."},
                status=status.HTTP_400_BAD_REQUEST)

        user = _get_or_create_user(
            email=email,
            prenom=data.get('first_name', ''),
            nom=data.get('last_name', ''),
        )
        return Response(_jwt_response_for(user), status=status.HTTP_200_OK)