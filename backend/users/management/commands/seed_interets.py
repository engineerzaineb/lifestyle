from django.core.management.base import BaseCommand
from users.models import Interet


class Command(BaseCommand):
    help = "Seed la base de données avec les centres d'intérêt officiels d'Eventu"

    def handle(self, *args, **options):
        interets_officiels = [
            {"nom": "Musique", "icone": "🎷"},
            {"nom": "Food", "icone": "🍽️"},
            {"nom": "Art", "icone": "🎨"},
            {"nom": "Sport", "icone": "⚽"},
            {"nom": "Cinéma", "icone": "🎬"},
            {"nom": "Théâtre", "icone": "🎭"},
            {"nom": "Tech", "icone": "💻"},
            {"nom": "Famille", "icone": "👨‍👩‍👧"},
            {"nom": "Nightlife", "icone": "🌙"},
            {"nom": "Bien-être", "icone": "🧘"},
            {"nom": "Voyage", "icone": "✈️"},
            {"nom": "Lecture", "icone": "📚"},
            {"nom": "Mode", "icone": "👗"},
            {"nom": "Photo", "icone": "📸"},
            {"nom": "Danse", "icone": "💃"},
            {"nom": "Gaming", "icone": "🎮"},
            {"nom": "Business", "icone": "💼"},
            {"nom": "Éducation", "icone": "🎓"},
            {"nom": "Nature", "icone": "🌿"},
            {"nom": "Festival", "icone": "🎉"},
        ]

        created_count = 0
        for data in interets_officiels:
            obj, created = Interet.objects.get_or_create(
                nom=data["nom"],
                defaults={
                    "icone": data["icone"],
                    "is_official": True,
                },
            )
            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f"✓ {obj.icone} {obj.nom}"))
            else:
                self.stdout.write(f"  Existe déjà : {obj.nom}")

        self.stdout.write(
            self.style.SUCCESS(f"\n✅ {created_count} intérêts créés sur {len(interets_officiels)}")
        )