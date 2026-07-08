from django.db import models
from django.utils.text import slugify
from users.models import User


class Categorie(models.Model):
    """Catégorie d'événement (Musique, Food, Sport, etc.)"""
    nom = models.CharField(max_length=50, unique=True)
    slug = models.SlugField(max_length=50, unique=True, blank=True)
    icone = models.CharField(
        max_length=50, 
        blank=True, 
        help_text="Nom de l'icône Lucide (ex: Music, Utensils)"
    )
    couleur = models.CharField(
        max_length=7, 
        default="#4F46E5", 
        help_text="Code hexadécimal (ex: #4F46E5)"
    )
    proposee_par = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='categories_proposees',
        help_text="Organisateur qui a proposé cette catégorie"
    )
    is_validee = models.BooleanField(
        default=True,
        help_text="False si proposée par un organisateur en attente de validation admin"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Catégorie"
        verbose_name_plural = "Catégories"
        ordering = ['nom']

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.nom)
        super().save(*args, **kwargs)

    def __str__(self):
        suffix = " (en attente)" if not self.is_validee else ""
        return f"{self.nom}{suffix}"


class Tag(models.Model):
    """Tags libres pour aider la recherche et la recommandation IA"""
    nom = models.CharField(max_length=30, unique=True)
    slug = models.SlugField(max_length=30, unique=True, blank=True)

    class Meta:
        ordering = ['nom']

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.nom)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.nom


class Event(models.Model):
    STATUT_CHOICES = (
    ('brouillon', 'Brouillon'),
    ('en_attente', 'En attente'),
    ('publie', 'Publié'),
    ('refuse', 'Refusé'),
    ('annule', 'Annulé'),
)

    titre = models.CharField(max_length=200)
    # Pour permettre les brouillons incomplets
    description = models.TextField(blank=True)
    date_evenement = models.DateTimeField(null=True, blank=True)
    lieu = models.CharField(max_length=200, blank=True)
    ville = models.CharField(max_length=100, blank=True)

    # Coordonnées GPS pour les recommandations par distance
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    
    # Capacité et prix calculés depuis les types de billets 
    capacite = models.PositiveIntegerField(
        null=True, 
        blank=True, 
        help_text="Calculé automatiquement depuis les types de billets"
    )
    prix = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        null=True, 
        blank=True,
        help_text="Prix minimum (calculé depuis les types de billets)"
    )

    statut = models.CharField(
        max_length=20, 
        choices=STATUT_CHOICES, 
        default='brouillon'
    )

    # Catégorisation
    categorie = models.ForeignKey(
        Categorie,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='evenements'
    )
    tags = models.ManyToManyField(
        Tag,
        blank=True,
        related_name='evenements'
    )

    # Relations utilisateurs
    organisateur = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='evenements_organises',
        limit_choices_to={'role': 'client'}
    )
    valide_par = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='evenements_valides',
        limit_choices_to={'role': 'admin'}
    )
    is_valide = models.BooleanField(default=False)
    motif_refus = models.TextField(
        blank=True, 
        help_text="Motif de refus (si applicable)"
    )

    image = models.ImageField(upload_to='events/', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date_evenement']

    def __str__(self):
        if self.organisateur:
            return f"{self.titre} par {self.organisateur.nom} {self.organisateur.prenom} - {self.date_evenement.strftime('%d/%m/%Y %H:%M')}"
        return f"{self.titre} par Admin - {self.date_evenement.strftime('%d/%m/%Y %H:%M')}"

    @property
    def organisateur_nom_complet(self):
        if self.organisateur:
            return f"{self.organisateur.nom} {self.organisateur.prenom}"
        return "Admin"

    @property
    def capacite_totale(self):
        """Somme des capacités de tous les types de billets."""
        return sum(tb.capacite for tb in self.types_billets.all())

    @property
    def prix_min(self):
        """Prix le plus bas parmi les types de billets."""
        types = self.types_billets.all()
        if not types.exists():
            return None
        return min(tb.prix for tb in types)

    @property
    def has_bon_plan(self):
        """True s'il y a au moins un type de billet en bon plan."""
        return self.types_billets.filter(is_bon_plan=True).exists()

    @property
    def reduction_max(self):
        """Pourcentage de réduction le plus élevé parmi les billets bon plan."""
        billets = self.types_billets.filter(is_bon_plan=True)
        reductions = [tb.pourcentage_reduction for tb in billets if tb.pourcentage_reduction]
        return max(reductions) if reductions else None

    def update_capacite_et_prix(self):
        """Met à jour capacite et prix depuis les types de billets."""
        if self.types_billets.exists():
            self.capacite = self.capacite_totale
            self.prix = self.prix_min
            Event.objects.filter(pk=self.pk).update(
                capacite=self.capacite,
                prix=self.prix
            )


class TypeBillet(models.Model):
    """
    Type de billet associé à un événement (Standard, VIP, Early Bird, etc.)
    Chaque type a sa propre capacité et son propre prix.
    """
    event = models.ForeignKey(
        Event,
        on_delete=models.CASCADE,
        related_name='types_billets'
    )
    nom = models.CharField(
        max_length=100, 
        help_text="Ex: Standard, VIP, Early Bird"
    )
    description = models.CharField(
        max_length=255,
        blank=True,
        help_text="Ce qui est inclus dans ce billet"
    )
    prix = models.DecimalField(max_digits=10, decimal_places=2)
    
    # Bon plan (par billet)
    is_bon_plan = models.BooleanField(default=False)
    prix_original = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Prix avant réduction (si bon plan)"
    )
    pourcentage_reduction = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="% de réduction (calculé automatiquement)"
    )
    
    capacite = models.PositiveIntegerField(
        help_text="Nombre de places disponibles pour ce type"
    )
    ordre = models.PositiveIntegerField(
        default=0, 
        help_text="Ordre d'affichage"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Type de billet"
        verbose_name_plural = "Types de billets"
        ordering = ['ordre', 'prix']

    def save(self, *args, **kwargs):
        # Calcul automatique du pourcentage de réduction
        if self.is_bon_plan and self.prix_original and self.prix:
            if self.prix_original > self.prix:
                reduction = ((self.prix_original - self.prix) / self.prix_original) * 100
                self.pourcentage_reduction = int(reduction)
            else:
                self.pourcentage_reduction = None
        else:
            self.pourcentage_reduction = None
        
        super().save(*args, **kwargs)
        
        # Mise à jour de l'événement 
        if self.event_id:
            self.event.update_capacite_et_prix()

    def delete(self, *args, **kwargs):
        event = self.event
        super().delete(*args, **kwargs)
        event.update_capacite_et_prix()

    def __str__(self):
        return f"{self.nom} - {self.event.titre} ({self.prix} DT)"

    @property
    def places_restantes(self):
        """À connecter avec le système de réservation plus tard."""
        return self.capacite