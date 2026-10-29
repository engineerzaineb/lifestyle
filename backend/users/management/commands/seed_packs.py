from django.core.management.base import BaseCommand
from users.models import Pack


class Command(BaseCommand):
    help = "Seed la base de données avec les packs organisateurs par défaut (Gratuit, Pro, Premium)"

    def handle(self, *args, **options):
        packs = [
            {
                "nom": "Gratuit",
                "description": "Pour démarrer et tester Eventu.",
                "prix": 0,
                "duree": "mensuel",
                "limite_evenements": 3,
                "commission_pct": 10,
                "avantages": "3 événements actifs\nBilletterie en ligne\nStatistiques de base",
                "ordre": 1,
            },
            {
                "nom": "Pro",
                "description": "Pour les organisateurs réguliers.",
                "prix": 49,
                "duree": "mensuel",
                "limite_evenements": 15,
                "commission_pct": 7,
                "avantages": "15 événements actifs\nCommission réduite à 7 %\nStatistiques détaillées\nSupport prioritaire",
                "ordre": 2,
            },
            {
                "nom": "Premium",
                "description": "Pour les professionnels de l'événementiel.",
                "prix": 99,
                "duree": "mensuel",
                "limite_evenements": None,
                "commission_pct": 5,
                "avantages": "Événements illimités\nCommission réduite à 5 %\nMise en avant des événements\nSupport dédié",
                "ordre": 3,
            },
        ]

        created_count = 0
        for data in packs:
            nom = data.pop("nom")
            _, created = Pack.objects.get_or_create(nom=nom, defaults=data)
            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f"  ✓ Créé : {nom}"))
            else:
                self.stdout.write(f"  - Existe déjà : {nom}")

        self.stdout.write(self.style.SUCCESS(f"\n{created_count} pack(s) créé(s)."))
