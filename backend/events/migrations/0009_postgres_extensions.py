from django.contrib.postgres.operations import UnaccentExtension, TrigramExtension
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('events', '0008_reservation_reservationitem_eventview'),
    ]

    operations = [
        UnaccentExtension(),
        TrigramExtension(),
    ]