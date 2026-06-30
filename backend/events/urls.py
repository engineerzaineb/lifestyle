from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EventViewSet, CategorieViewSet, TagViewSet

router = DefaultRouter()
router.register(r'events', EventViewSet, basename='event')
router.register(r'categories', CategorieViewSet, basename='categorie')
router.register(r'tags', TagViewSet, basename='tag')

urlpatterns = [
    path('', include(router.urls)),
]