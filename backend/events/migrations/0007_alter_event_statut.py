# Generated manually to add the 'annule' (Annulé) statut choice.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('events', '0006_alter_event_statut'),
    ]

    operations = [
        migrations.AlterField(
            model_name='event',
            name='statut',
            field=models.CharField(
                choices=[
                    ('brouillon', 'Brouillon'),
                    ('en_attente', 'En attente'),
                    ('publie', 'Publié'),
                    ('refuse', 'Refusé'),
                    ('annule', 'Annulé'),
                ],
                default='brouillon',
                max_length=20,
            ),
        ),
    ]