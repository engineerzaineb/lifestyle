from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils.text import slugify



class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Email obligatoire')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save()
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('role', 'admin')
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(email, password, **extra_fields)


# Modèle utilisateur personnalisé
class User(AbstractBaseUser, PermissionsMixin):
    ROLE_CHOICES = [
        ('utilisateur', 'Utilisateur'),
        ('client', 'Client'),
        ('admin', 'Admin'),
    ]

    email = models.EmailField(unique=True)
    nom = models.CharField(max_length=100)
    prenom = models.CharField(max_length=100)
    telephone = models.CharField(max_length=15, blank=True)
    ville = models.CharField(max_length=50, blank=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='utilisateur')
    # NOUVEAU : flag organisateur
    is_organisateur = models.BooleanField(default=False)

    # Position actuelle (la plus récente) 
    current_latitude = models.DecimalField(max_digits=11, decimal_places=6, null=True, blank=True)
    current_longitude = models.DecimalField(max_digits=11, decimal_places=6, null=True, blank=True)
    last_location_update = models.DateTimeField(null=True, blank=True)
    
    # centres d'intérêt 
    interets = models.ManyToManyField(
        'events.Categorie',
        blank=True,
        related_name='users_interesses',
    )

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['nom', 'prenom']

    objects = UserManager()

    def __str__(self):
        return f"{self.nom} {self.prenom} ({self.role})"

    @property
    def is_client(self):
        return self.role == 'client'

    @property
    def is_admin_role(self):
        return self.role == 'admin'

    @property
    def is_utilisateur(self):
        return self.role == 'utilisateur'

    # indique si l'utilisateur a partagé sa position
    @property
    def has_location(self):
        return self.current_latitude is not None and self.current_longitude is not None

    # mettre à jour la position actuelle et ajouter à l'historique
    def update_location(self, latitude, longitude, source='login'):
        from django.utils import timezone

        # Mettre à jour la position actuelle
        self.current_latitude = latitude
        self.current_longitude = longitude
        self.last_location_update = timezone.now()
        self.save()

        # Ajouter une entrée dans l'historique
        UserLocation.objects.create(
            user=self,
            latitude=latitude,
            longitude=longitude,
            source=source,
        )


# Historique des positions du user 
class UserLocation(models.Model):
    SOURCE_CHOICES = [
        ('register', 'Inscription'),
        ('login', 'Connexion'),
        ('manual', 'Mise à jour manuelle'),
        ('event_view', 'Consultation événement'),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='locations',
    )
    latitude = models.DecimalField(max_digits=11, decimal_places=6)
    longitude = models.DecimalField(max_digits=11, decimal_places=6)
    detected_at = models.DateTimeField(auto_now_add=True)
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default='login')
    ville_detectee = models.CharField(max_length=100, blank=True)

    class Meta:
        ordering = ['-detected_at']
        indexes = [
            models.Index(fields=['user', '-detected_at']),
        ]

    def __str__(self):
        return f"{self.user.email} - ({self.latitude}, {self.longitude}) - {self.detected_at}"


# Modèle pour les centres d'intéret 
class Interet(models.Model):
    nom = models.CharField(max_length=50, unique=True)
    slug = models.SlugField(max_length=60, unique=True, blank=True)
    icone = models.CharField(max_length=10, blank=True, help_text="Emoji représentatif")
    is_official = models.BooleanField(
        default=True,
        help_text="True = intérêt officiel d'Eventu. False = créé par un utilisateur"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-is_official', 'nom']

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.nom)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.icone} {self.nom}" if self.icone else self.nom
    
    
# Demande pour devenir organisateur 
class DemandeOrganisateur(models.Model):
    STATUT_CHOICES = (
        ('en_attente', 'En attente'),
        ('valide', 'Validée'),
        ('refuse', 'Refusée'),
    )

    TYPE_CHOICES = (
        ('entreprise', 'Entreprise'),
        ('association', 'Association'),
        ('independant', 'Indépendant'),
    )

    # Lien avec l'utilisateur
    user = models.OneToOneField(
        User, 
        on_delete=models.CASCADE, 
        related_name='demande_organisateur'
    )

    # Champs du formulaire
    nom_organisation = models.CharField(max_length=200)
    type_organisation = models.CharField(max_length=20, choices=TYPE_CHOICES)
    matricule_fiscal = models.CharField(max_length=50)
    adresse = models.CharField(max_length=500)
    telephone_pro = models.CharField(max_length=20)
    description = models.TextField()
    site_web = models.URLField(blank=True, null=True)
    logo = models.ImageField(upload_to='logos_organisateurs/', blank=True, null=True)

    # Catégories prévues (lien vers le modèle Categorie d'events)
    categories_prevues = models.ManyToManyField(
        'events.Categorie',
        related_name='demandes_organisateurs',
        blank=True,
    )

    # Statut et traitement
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='en_attente')
    motif_refus = models.TextField(blank=True, null=True)

    # Métadonnées
    date_demande = models.DateTimeField(auto_now_add=True)
    date_traitement = models.DateTimeField(blank=True, null=True)
    traite_par = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='demandes_traitees',
    )

    class Meta:
        verbose_name = "Demande d'organisateur"
        verbose_name_plural = "Demandes d'organisateurs"
        ordering = ['-date_demande']

    def __str__(self):
        return f"{self.user.email} - {self.nom_organisation} ({self.statut})"