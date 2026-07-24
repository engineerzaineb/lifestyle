from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EventViewSet, CategorieViewSet, TagViewSet, ReservationViewSet

router = DefaultRouter()
router.register(r'events', EventViewSet, basename='event')
router.register(r'categories', CategorieViewSet, basename='categorie')
router.register(r'tags', TagViewSet, basename='tag')
router.register(r'reservations', ReservationViewSet, basename='reservation')

urlpatterns = [
    path('', include(router.urls)),
]