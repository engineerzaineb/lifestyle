from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import MeView, ChangePasswordView
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
    MonHistoriqueDemandesView,
    AdminDemandesListView,
    AdminDemandeDetailView,
    AdminValiderDemandeView,
    AdminRefuserDemandeView,
)
from .views_admin import (
    AdminUsersListView,
    AdminUserToggleActiveView,
    AdminUserToggleOrganisateurView,
    AdminStatsView,
    AdminUserAbonnementView,
)
from .views_packs import (
    PackListPublicView,
    MonAbonnementView,
    AdminPackListCreateView,
    AdminPackDetailView,
    AdminAbonnementListView,
    AdminAssignerPackView,
    AdminRetirerPackView,
)
from .views import (
    PasswordResetRequestView,
    PasswordResetConfirmView,
)
from .views_social import GoogleLoginView, FacebookLoginView

urlpatterns = [
    # Auth 
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', CustomTokenObtainPairView.as_view(), name='login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('logout/', LogoutView.as_view(), name='logout'),

    # Authentification sociale (OAuth Google / Facebook)
    path('social/google/', GoogleLoginView.as_view(), name='social_google'),
    path('social/facebook/', FacebookLoginView.as_view(), name='social_facebook'),

    # Utilisateur connecté 
    path('me/', MeView.as_view(), name='me'),
    path('me/password/', ChangePasswordView.as_view(), name='change_password'),
    path('me/location/', UpdateLocationView.as_view(), name='update_location'),
    path('me/locations/', MyLocationsView.as_view(), name='my_locations'),
    path('me/interets/', UpdateUserInteretsView.as_view(), name='update_interets'),

    #  Centres d'intérêt (catalogue public) 
    path('interets/', InteretListView.as_view(), name='interets_list'),

    # Packs organisateurs (catalogue public)
    path('packs/', PackListPublicView.as_view(), name='packs_list'),
    path('mon-abonnement/', MonAbonnementView.as_view(), name='mon_abonnement'),

    #  Demande organisateur (côté user) 
    path('demande-organisateur/', DemandeOrganisateurView.as_view(), name='demande-organisateur'),
    path('demande-organisateur/historique/', MonHistoriqueDemandesView.as_view(), name='demande-historique'),

    # Demandes organisateur (côté admin) 
    path('admin/demandes-organisateur/', AdminDemandesListView.as_view(), name='admin-demandes-list'),
    path('admin/demandes-organisateur/<int:pk>/', AdminDemandeDetailView.as_view(), name='admin-demande-detail'),
    path('admin/demandes-organisateur/<int:pk>/valider/', AdminValiderDemandeView.as_view(), name='admin-demande-valider'),
    path('admin/demandes-organisateur/<int:pk>/refuser/', AdminRefuserDemandeView.as_view(), name='admin-demande-refuser'),
    # Administration : utilisateurs et stats 
    path('admin/users/', AdminUsersListView.as_view(), name='admin-users-list'),
    path('admin/users/<int:pk>/toggle-active/', AdminUserToggleActiveView.as_view(), name='admin-user-toggle-active'),
    path('admin/users/<int:pk>/toggle-organisateur/', AdminUserToggleOrganisateurView.as_view(), name='admin-user-toggle-organisateur'),
    path('admin/stats/', AdminStatsView.as_view(), name='admin-stats'),
    # Administration : packs et abonnements
    path('admin/packs/', AdminPackListCreateView.as_view(), name='admin-packs-list'),
    path('admin/packs/<int:pk>/', AdminPackDetailView.as_view(), name='admin-pack-detail'),
    path('admin/abonnements/', AdminAbonnementListView.as_view(), name='admin-abonnements-list'),
    path('admin/users/<int:pk>/abonnement/', AdminUserAbonnementView.as_view(), name='admin-user-abonnement'),
    path('admin/users/<int:pk>/assigner-pack/', AdminAssignerPackView.as_view(), name='admin-user-assigner-pack'),
    path('admin/users/<int:pk>/retirer-pack/', AdminRetirerPackView.as_view(), name='admin-user-retirer-pack'),
    
    path('password-reset/', PasswordResetRequestView.as_view(), name='password_reset'),
    path('password-reset/confirm/', PasswordResetConfirmView.as_view(), name='password_reset_confirm'),
]