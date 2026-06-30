from django.core.management.base import BaseCommand
from django.utils import timezone
from users.models import User, DemandeOrganisateur
from events.models import Categorie


class Command(BaseCommand):
    help = "Migre les anciens 'client' vers 'organisateur' avec une demande validée"

    def handle(self, *args, **options):
        # Récupère tous les users avec l'ancien rôle "client"
        # (s'ils existent encore - sinon on cherche ceux qui ont créé des events)
        from events.models import Event
        
        # Tous les users qui sont organisateurs d'au moins un event
        organisateurs_ids = Event.objects.values_list('organisateur_id', flat=True).distinct()
        users = User.objects.filter(id__in=organisateurs_ids)

        admin_user = User.objects.filter(role='admin').first()

        for user in users:
            # Le user devient organisateur validé
            user.is_organisateur = True
            if user.role != 'admin':
                user.role = 'utilisateur'  # garde le rôle de base
            user.save()

            # Crée une demande validée fictive si elle n'existe pas
            if not hasattr(user, 'demande_organisateur'):
                DemandeOrganisateur.objects.create(
                    user=user,
                    nom_organisation=f"{user.prenom} {user.nom}",
                    type_organisation='independant',
                    matricule_fiscal='MIGRATED',
                    adresse='Tunisie',
                    telephone_pro=user.telephone or 'N/A',
                    description='Compte migré depuis l\'ancien système',
                    statut='valide',
                    date_traitement=timezone.now(),
                    traite_par=admin_user,
                )

            self.stdout.write(self.style.SUCCESS(
                f"✅ Migré : {user.email}"
            ))

        self.stdout.write(self.style.SUCCESS(
            f"\n🎉 {users.count()} utilisateur(s) migré(s) avec succès"
        ))
        