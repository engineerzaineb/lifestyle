from django.contrib import admin
from .models import Categorie, Tag, Event, TypeBillet


@admin.register(Categorie)
class CategorieAdmin(admin.ModelAdmin):
    list_display = ['nom', 'slug', 'icone', 'couleur', 'is_validee', 'created_at']
    list_filter = ['is_validee']
    search_fields = ['nom']
    prepopulated_fields = {'slug': ('nom',)}


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ['nom', 'slug']
    search_fields = ['nom']
    prepopulated_fields = {'slug': ('nom',)}


# Inline pour gérer les types de billets directement dans la page Event
class TypeBilletInline(admin.TabularInline):
    model = TypeBillet
    extra = 1
    fields = ['nom', 'description', 'prix', 'is_bon_plan', 'prix_original', 'capacite', 'ordre']


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ['titre', 'ville', 'date_evenement', 'statut', 'categorie', 'organisateur', 'prix', 'is_valide']
    list_filter = ['statut', 'is_valide', 'categorie', 'ville', 'date_evenement']
    search_fields = ['titre', 'description', 'lieu', 'ville']
    ordering = ['-date_evenement']
    date_hierarchy = 'date_evenement'
    inlines = [TypeBilletInline]
    filter_horizontal = ['tags']

    fieldsets = (
        ('Informations principales', {
            'fields': ('titre', 'description', 'image')
        }),
        ('Date et lieu', {
            'fields': ('date_evenement', 'lieu', 'ville', 'latitude', 'longitude')
        }),
        ('Catégorisation', {
            'fields': ('categorie', 'tags')
        }),
        ('Statut et validation', {
            'fields': ('statut', 'is_valide', 'valide_par', 'motif_refus')
        }),
        ('Organisation', {
            'fields': ('organisateur',)
        }),
        ('Dates système', {
            'fields': ('created_at', 'updated_at')
        }),
    )

    readonly_fields = ['created_at', 'updated_at', 'capacite', 'prix']


@admin.register(TypeBillet)
class TypeBilletAdmin(admin.ModelAdmin):
    list_display = ['nom', 'event', 'prix', 'is_bon_plan', 'pourcentage_reduction', 'capacite']
    list_filter = ['is_bon_plan']
    search_fields = ['nom', 'event__titre']