from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    RegisterView,
    LogoutView,
    CustomTokenObtainPairView,
    MeView,
    UpdateLocationView,
    MyLocationsView,
    InteretListView,
    UpdateUserInteretsView,
)
from .views_organisateur import (
    DemandeOrganisateurView,
    AdminDemandesListView,
    AdminDemandeDetailView,
    AdminValiderDemandeView,
    AdminRefuserDemandeView,
)


urlpatterns = [
    # === Auth ===
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', CustomTokenObtainPairView.as_view(), name='login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('logout/', LogoutView.as_view(), name='logout'),

    # === Utilisateur connecté ===
    path('me/', MeView.as_view(), name='me'),
    path('me/location/', UpdateLocationView.as_view(), name='update_location'),
    path('me/locations/', MyLocationsView.as_view(), name='my_locations'),
    path('me/interets/', UpdateUserInteretsView.as_view(), name='update_interets'),

    # === Centres d'intérêt (catalogue public) ===
    path('interets/', InteretListView.as_view(), name='interets_list'),

    # === Demande organisateur (côté user) ===
    path('demande-organisateur/', DemandeOrganisateurView.as_view(), name='demande-organisateur'),

    # === Demandes organisateur (côté admin) ===
    path('admin/demandes-organisateur/', AdminDemandesListView.as_view(), name='admin-demandes-list'),
    path('admin/demandes-organisateur/<int:pk>/', AdminDemandeDetailView.as_view(), name='admin-demande-detail'),
    path('admin/demandes-organisateur/<int:pk>/valider/', AdminValiderDemandeView.as_view(), name='admin-demande-valider'),
    path('admin/demandes-organisateur/<int:pk>/refuser/', AdminRefuserDemandeView.as_view(), name='admin-demande-refuser'),
]