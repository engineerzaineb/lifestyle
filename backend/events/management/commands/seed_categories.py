from django.core.management.base import BaseCommand
from events.models import Categorie


class Command(BaseCommand):
    help = "Crée les catégories par défaut"

    def handle(self, *args, **kwargs):
        categories = [
            {'nom': 'Musique', 'icone': 'Music', 'couleur': '#EC4899'},
            {'nom': 'Food', 'icone': 'Utensils', 'couleur': '#F97316'},
            {'nom': 'Spectacle', 'icone': 'Theater', 'couleur': '#A855F7'},
            {'nom': 'Sport', 'icone': 'Trophy', 'couleur': '#06B6D4'},
            {'nom': 'Culture', 'icone': 'BookOpen', 'couleur': '#4F46E5'},
            {'nom': 'Art', 'icone': 'Palette', 'couleur': '#84CC16'},
            {'nom': 'Bien-être', 'icone': 'Sparkles', 'couleur': '#16A34A'},
            {'nom': 'Tech', 'icone': 'Award', 'couleur': '#0891B2'},
        ]

        created_count = 0
        for cat_data in categories:
            cat, created = Categorie.objects.get_or_create(
                nom=cat_data['nom'],
                defaults={
                    **cat_data,
                    'is_validee': True,
                }
            )
            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f"  ✓ {cat.nom} créée"))
            else:
                self.stdout.write(f"  · {cat.nom} existe déjà")

        self.stdout.write(self.style.SUCCESS(
            f"\n{created_count} nouvelle(s) catégorie(s) créée(s) sur {len(categories)}."
        ))