from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EventViewSet, CategorieViewSet, TagViewSet, ReservationViewSet, FavoriViewSet, NotificationViewSet
from .views import FideliteView
from .views_billets import BilletDetailView, ValiderBilletView

router = DefaultRouter()
router.register(r'events', EventViewSet, basename='event')
router.register(r'categories', CategorieViewSet, basename='categorie')
router.register(r'tags', TagViewSet, basename='tag')
router.register(r'reservations', ReservationViewSet, basename='reservation')
router.register(r'favoris', FavoriViewSet, basename='favori')
router.register(r'notifications', NotificationViewSet, basename='notification')
urlpatterns = [
    path('', include(router.urls)),
    path('fidelite/me/', FideliteView.as_view(), name='fidelite-me'),
    # Contrôle des billets à l'entrée
    path('billets/<str:code>/', BilletDetailView.as_view(), name='billet-detail'),
    path('billets/<str:code>/valider/', ValiderBilletView.as_view(), name='billet-valider'),
]