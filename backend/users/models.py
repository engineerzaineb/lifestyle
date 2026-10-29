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
    reseaux_sociaux = models.URLField(blank=True, null=True, help_text="Lien réseaux sociaux (Instagram, Facebook...)")
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


class HistoriqueDemandeOrganisateur(models.Model):
    """Journal des événements liés aux demandes d'organisateur d'un utilisateur.
    On y enregistre : soumission, acceptation, refus, retrait du statut.
    Ça permet au user de consulter son historique même après suppression
    de la demande courante."""

    EVENEMENT_CHOICES = (
        ('soumise', 'Demande soumise'),
        ('acceptee', 'Demande acceptée'),
        ('refusee', 'Demande refusée'),
        ('retiree', 'Statut organisateur retiré'),
        ('annulee', 'Demande annulée'),
    )

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='historique_demandes',
    )
    evenement = models.CharField(max_length=20, choices=EVENEMENT_CHOICES)
    motif = models.TextField(blank=True, default='')   # motif de refus, le cas échéant
    nom_organisation = models.CharField(max_length=200, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Historique demande organisateur"
        verbose_name_plural = "Historiques demandes organisateurs"

    def __str__(self):
        return f"{self.user.email} — {self.get_evenement_display()} ({self.created_at:%Y-%m-%d})"


def historiser_demande(user, evenement, motif='', nom_organisation=''):
    """Utilitaire : ajoute une entrée dans l'historique des demandes."""
    return HistoriqueDemandeOrganisateur.objects.create(
        user=user, evenement=evenement, motif=motif or '',
        nom_organisation=nom_organisation or '',
    )

# PACKS ET ABONNEMENTS ORGANISATEURS

class Pack(models.Model):
    """Offre d'abonnement proposée aux organisateurs (catalogue géré par l'admin)."""

    DUREE_CHOICES = (
        ('mensuel', 'Mensuel'),
        ('annuel', 'Annuel'),
    )

    nom = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    prix = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="Prix en DT")
    duree = models.CharField(max_length=10, choices=DUREE_CHOICES, default='mensuel')
    limite_evenements = models.PositiveIntegerField(
        null=True, blank=True,
        help_text="Nombre max d'événements actifs (en attente ou publiés, à venir). Vide = illimité",
    )
    commission_pct = models.DecimalField(
        max_digits=5, decimal_places=2, default=0,
        help_text="Pourcentage prélevé sur les ventes de billets",
    )
    avantages = models.TextField(blank=True, help_text="Un avantage par ligne")
    is_actif = models.BooleanField(default=True, help_text="False = pack archivé (plus assignable)")
    ordre = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['ordre', 'prix']

    def __str__(self):
        return f"{self.nom} ({self.prix} DT / {self.get_duree_display().lower()})"

    @property
    def is_gratuit(self):
        return self.prix == 0

    @property
    def nb_jours(self):
        return 365 if self.duree == 'annuel' else 30


class Abonnement(models.Model):
    """Pack actuellement attribué à un organisateur."""

    STATUT_CHOICES = (
        ('actif', 'Actif'),
        ('expire', 'Expiré'),
    )

    organisateur = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name='abonnement',
    )
    pack = models.ForeignKey(
        Pack, on_delete=models.PROTECT, related_name='abonnements',
    )
    date_debut = models.DateTimeField()
    # Vide = sans échéance (pack gratuit)
    date_fin = models.DateTimeField(null=True, blank=True)
    statut = models.CharField(max_length=10, choices=STATUT_CHOICES, default='actif')
    attribue_par = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='abonnements_attribues',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date_debut']

    def __str__(self):
        return f"{self.organisateur.email} — {self.pack.nom} ({self.statut})"

    @property
    def est_actif(self):
        from django.utils import timezone
        if self.statut != 'actif':
            return False
        return self.date_fin is None or self.date_fin >= timezone.now()


def pack_par_defaut():
    """Pack appliqué à un organisateur sans abonnement actif : le premier pack gratuit actif."""
    return Pack.objects.filter(is_actif=True, prix=0).order_by('ordre').first()


def pack_effectif(user):
    """Pack qui s'applique réellement à l'organisateur (abonnement actif, sinon pack gratuit)."""
    abonnement = getattr(user, 'abonnement', None)
    if abonnement and abonnement.est_actif:
        return abonnement.pack
    return pack_par_defaut()


def quota_evenements(user):
    """Utilisation du quota d'événements actifs de l'organisateur.
    Un événement est « actif » s'il est en attente ou publié, et pas encore passé.
    Les brouillons ne comptent pas. limite/restants = None si illimité."""
    from django.db.models import Q
    from django.utils import timezone
    from events.models import Event

    pack = pack_effectif(user)
    utilises = Event.objects.filter(
        organisateur=user, statut__in=['en_attente', 'publie'],
    ).filter(
        Q(date_evenement__gte=timezone.now()) | Q(date_evenement__isnull=True)
    ).count()

    limite = pack.limite_evenements if pack else None
    if user.role == 'admin':
        limite = None

    return {
        'pack': pack,
        'limite': limite,
        'utilises': utilises,
        'restants': None if limite is None else max(limite - utilises, 0),
    }


def verifier_quota_evenements(user):
    """Renvoie un message d'erreur si l'organisateur a atteint sa limite, sinon None."""
    quota = quota_evenements(user)
    if quota['limite'] is not None and quota['utilises'] >= quota['limite']:
        nom_pack = quota['pack'].nom if quota['pack'] else ''
        return (
            f"Limite atteinte : votre pack {nom_pack} autorise {quota['limite']} "
            f"événement(s) actif(s). Passez à un pack supérieur pour en soumettre davantage."
        )
    return None
