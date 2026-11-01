from django.contrib import admin
from .models import User, UserLocation, Interet, Pack, Abonnement


# affichage du modèle User dans l'admin
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
        ('Profil', {
            'fields': ('date_naissance', 'genre')
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


# historique des positions
@admin.register(UserLocation)
class UserLocationAdmin(admin.ModelAdmin):
    list_display = ['user', 'latitude', 'longitude', 'source', 'detected_at']
    list_filter = ['source', 'detected_at']
    search_fields = ['user__email', 'user__nom']
    ordering = ['-detected_at']
    readonly_fields = ['detected_at']


# centres d'intérêt
@admin.register(Interet)
class InteretAdmin(admin.ModelAdmin):
    list_display = ['icone', 'nom', 'slug', 'is_official', 'created_at']
    list_filter = ['is_official']
    search_fields = ['nom']
    prepopulated_fields = {'slug': ('nom',)}
    ordering = ['-is_official', 'nom']


# packs organisateurs
@admin.register(Pack)
class PackAdmin(admin.ModelAdmin):
    list_display = ['nom', 'prix', 'duree', 'limite_evenements', 'commission_pct', 'etiquette', 'is_actif', 'ordre']
    list_filter = ['is_actif', 'duree']
    search_fields = ['nom']
    ordering = ['ordre', 'prix']


# abonnements des organisateurs
@admin.register(Abonnement)
class AbonnementAdmin(admin.ModelAdmin):
    list_display = ['organisateur', 'pack', 'statut', 'date_debut', 'date_fin']
    list_filter = ['statut', 'pack']
    search_fields = ['organisateur__email', 'organisateur__nom']
    ordering = ['-date_debut']
