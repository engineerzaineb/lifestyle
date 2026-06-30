from django.contrib import admin
from .models import User, UserLocation, Interet


# Affichage du modèle User dans l'admin
@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ['email', 'nom', 'prenom', 'role', 'ville', 'has_location', 'created_at']
    list_filter = ['role', 'is_active', 'created_at']
    search_fields = ['email', 'nom', 'prenom']
    ordering = ['-created_at']
    filter_horizontal = ['interets']

    fieldsets = (
        ('Informations principales', {
            'fields': ('email', 'nom', 'prenom', 'telephone', 'ville', 'role')
        }),
        ('Géolocalisation', {
            'fields': ('current_latitude', 'current_longitude', 'last_location_update')
        }),
        ("Centres d'intérêt", {
            'fields': ('interets',)
        }),
        ('Permissions', {
            'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')
        }),
        ('Dates', {
            'fields': ('last_login', 'created_at')
        }),
    )

    readonly_fields = ['created_at', 'last_login']


# Historique des positions
@admin.register(UserLocation)
class UserLocationAdmin(admin.ModelAdmin):
    list_display = ['user', 'latitude', 'longitude', 'source', 'detected_at']
    list_filter = ['source', 'detected_at']
    search_fields = ['user__email', 'user__nom']
    ordering = ['-detected_at']
    readonly_fields = ['detected_at']


# Centres d'intérêt
@admin.register(Interet)
class InteretAdmin(admin.ModelAdmin):
    list_display = ['icone', 'nom', 'slug', 'is_official', 'created_at']
    list_filter = ['is_official']
    search_fields = ['nom']
    prepopulated_fields = {'slug': ('nom',)}
    ordering = ['-is_official', 'nom']