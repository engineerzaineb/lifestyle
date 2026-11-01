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

    # Profil démographique (statistiques des organisateurs)
    GENRE_CHOICES = [
        ('homme', 'Homme'),
        ('femme', 'Femme'),
        ('autre', 'Autre'),
    ]
    date_naissance = models.DateField(null=True, blank=True)
    genre = models.CharField(max_length=10, choices=GENRE_CHOICES, blank=True)

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

    nom = models.CharField(max_length=100)
    description = models.TextField(blank=True, default='')
    prix = models.DecimalField(
        max_digits=8, decimal_places=2, default=0,
        help_text="Prix en DT (0 = pack gratuit)",
    )
    duree = models.CharField(max_length=10, choices=DUREE_CHOICES, default='mensuel')
    limite_evenements = models.PositiveIntegerField(
        null=True, blank=True,
        help_text="Nombre max d'événements. Laisser vide = illimité.",
    )
    commission_pct = models.DecimalField(
        max_digits=5, decimal_places=2, default=0,
        help_text="Taux de commission en % sur les ventes de billets.",
    )
    avantages = models.TextField(
        blank=True, default='',
        help_text="Un avantage par ligne (mise en avant, stats avancées, support...).",
    )
    is_actif = models.BooleanField(
        default=True, help_text="Un pack inactif n'est plus assignable (archivé).",
    )
    ordre = models.PositiveIntegerField(default=0, help_text="Ordre d'affichage (0 = en premier).")

    # Options incluses
    mise_en_avant = models.BooleanField(default=False, help_text="Événements mis en avant sur l'accueil")
    stats_avancees = models.BooleanField(default=False, help_text="Accès aux statistiques détaillées")
    support_prioritaire = models.BooleanField(default=False)
    badge_verifie = models.BooleanField(default=False, help_text="Badge « Organisateur vérifié »")

    # Limites supplémentaires (vide = illimité)
    max_billets_par_event = models.PositiveIntegerField(
        null=True, blank=True,
        help_text="Capacité totale max d'un événement (tous types de billets). Vide = illimité.",
    )
    max_types_billets = models.PositiveIntegerField(
        null=True, blank=True,
        help_text="Nombre max de types de billets par événement. Vide = illimité.",
    )
    mises_en_avant_mois = models.PositiveIntegerField(
        default=0, help_text="Nombre d'événements pouvant être mis en avant par mois.",
    )

    # Présentation commerciale
    couleur = models.CharField(max_length=7, default='#4F46E5', help_text="Couleur du pack (#RRGGBB)")
    etiquette = models.CharField(max_length=30, blank=True, help_text="Ex. « Populaire », « Meilleure offre »")
    prix_barre = models.DecimalField(
        max_digits=8, decimal_places=2, null=True, blank=True,
        help_text="Ancien prix affiché barré (réduction). Vide = pas de réduction.",
    )
    essai_jours = models.PositiveIntegerField(default=0, help_text="Période d'essai gratuite (0 = aucune)")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['ordre', 'prix']
        verbose_name = "Pack d'abonnement"
        verbose_name_plural = "Packs d'abonnement"

    def __str__(self):
        return f"{self.nom} ({self.prix} DT / {self.get_duree_display().lower()})"

    @property
    def est_gratuit(self):
        return self.prix == 0

    # Alias utilisé par le code des vues admin
    is_gratuit = est_gratuit

    @property
    def est_illimite(self):
        return self.limite_evenements is None

    @property
    def avantages_liste(self):
        return [a.strip() for a in (self.avantages or '').splitlines() if a.strip()]

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
    date_debut = models.DateTimeField(auto_now_add=True)
    # Vide = sans échéance (pack gratuit)
    date_fin = models.DateTimeField(null=True, blank=True)
    statut = models.CharField(max_length=10, choices=STATUT_CHOICES, default='actif')
    assigne_par = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='abonnements_assignes',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Abonnement'
        verbose_name_plural = 'Abonnements'

    def __str__(self):
        return f"{self.organisateur.email} — {self.pack.nom} ({self.statut})"

    @property
    def est_expire(self):
        from django.utils import timezone
        return self.date_fin is not None and self.date_fin < timezone.now()

    @property
    def est_actif(self):
        return self.statut == 'actif' and not self.est_expire

    def events_utilises(self):
        return compter_evenements_actifs(self.organisateur)

    def events_restants(self):
        if self.pack.limite_evenements is None:
            return None
        return max(self.pack.limite_evenements - self.events_utilises(), 0)


def pack_par_defaut():
    """Pack appliqué à un organisateur sans abonnement actif : le premier pack gratuit actif."""
    return Pack.objects.filter(is_actif=True, prix=0).order_by('ordre').first()


def pack_effectif(user):
    """Pack qui s'applique réellement à l'organisateur (abonnement actif, sinon pack gratuit)."""
    abonnement = getattr(user, 'abonnement', None)
    if abonnement and abonnement.est_actif:
        return abonnement.pack
    return pack_par_defaut()


def compter_evenements_actifs(user):
    """Événements en attente ou publiés, pas encore passés. Les brouillons ne comptent pas."""
    from django.db.models import Q
    from django.utils import timezone
    from events.models import Event

    return Event.objects.filter(
        organisateur=user, statut__in=['en_attente', 'publie'],
    ).filter(
        Q(date_evenement__gte=timezone.now()) | Q(date_evenement__isnull=True)
    ).count()


def quota_evenements(user):
    """Utilisation du quota d'événements actifs de l'organisateur.
    limite/restants = None si illimité."""
    pack = pack_effectif(user)
    utilises = compter_evenements_actifs(user)

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


def verifier_limites_billets(user, billets):
    """Vérifie les limites de billetterie du pack pour une liste de types de billets.
    billets : liste de dicts (ou objets) ayant une « capacite ».
    Renvoie un message d'erreur, sinon None."""
    if user.role == 'admin':
        return None
    pack = pack_effectif(user)
    if not pack:
        return None

    capacites = [
        int((b.get('capacite') if isinstance(b, dict) else b.capacite) or 0)
        for b in billets
    ]

    if pack.max_types_billets is not None and len(capacites) > pack.max_types_billets:
        return (
            f"Votre pack {pack.nom} autorise {pack.max_types_billets} type(s) de billets "
            f"par événement (vous en avez {len(capacites)})."
        )
    if pack.max_billets_par_event is not None and sum(capacites) > pack.max_billets_par_event:
        return (
            f"Votre pack {pack.nom} autorise {pack.max_billets_par_event} billets par événement "
            f"(capacité demandée : {sum(capacites)})."
        )
    return None
