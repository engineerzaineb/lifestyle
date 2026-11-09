from django.http import HttpResponse, HttpResponseRedirect
from django.shortcuts import get_object_or_404
from django.conf import settings
from django.utils import timezone
from django.utils.html import escape
from .models import Event


# Robots des réseaux sociaux : ils lisent les balises Open Graph
# (titre, description, image) pour construire l'aperçu du lien.
ROBOTS_PARTAGE = (
    'facebookexternalhit', 'facebot', 'meta-externalagent', 'instagram',
    'whatsapp', 'twitterbot', 'telegrambot', 'linkedinbot', 'slackbot',
    'discordbot', 'pinterest', 'skypeuripreview', 'googlebot', 'bingbot',
)

MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet',
        'août', 'septembre', 'octobre', 'novembre', 'décembre']


def _est_robot(request):
    agent = request.META.get('HTTP_USER_AGENT', '').lower()
    return any(robot in agent for robot in ROBOTS_PARTAGE)


def _image_absolue(request, event):
    """Image de couverture en URL absolue : fichier uploadé, sinon lien collé."""
    if event.image:
        return request.build_absolute_uri(event.image.url)
    return event.image_url or ""


def _date_fr(dt):
    dt = timezone.localtime(dt)
    return f"{dt.day} {MOIS[dt.month - 1]} {dt.year} à {dt:%H:%M}"


def resume_partage(event):
    """Résumé lisible de l'événement : date, lieu, prix."""
    morceaux = []
    if event.date_evenement:
        morceaux.append(f"📅 {_date_fr(event.date_evenement)}")
    lieu = ", ".join(filter(None, [event.lieu, event.ville]))
    if lieu:
        morceaux.append(f"📍 {lieu}")
    if event.prix is not None:
        prix = event.prix
        # 25.00 -> « 25 », 12.50 -> « 12,50 »
        prix_txt = f"{int(prix)}" if prix == int(prix) else f"{prix:.2f}".replace('.', ',')
        morceaux.append("🎟 Gratuit" if prix == 0 else f"🎟 À partir de {prix_txt} DT")
    return " · ".join(morceaux)


def share_event(request, pk):
    """Page de partage d'un événement.
    - Robots (Facebook, WhatsApp, Instagram, X...) : page HTML avec les balises
      Open Graph → l'aperçu affiche la photo, le titre, la date et le lieu.
    - Visiteurs : redirection immédiate vers la page de l'événement."""
    # Seuls les events publiés et validés sont partageables
    event = get_object_or_404(Event, pk=pk, statut='publie', is_valide=True)
    front_url = f"{settings.FRONTEND_URL}/event/{event.id}"

    if not _est_robot(request):
        return HttpResponseRedirect(front_url)

    titre = escape(event.titre)
    resume = resume_partage(event)
    extrait = " ".join((event.description or "").split())[:180]
    description = escape(" — ".join(filter(None, [resume, extrait])) or "Réservez sur Eventu")
    image = escape(_image_absolue(request, event))

    balises_image = ""
    if image:
        balises_image = (
            f'<meta property="og:image" content="{image}">\n'
            f'<meta property="og:image:alt" content="{titre}">\n'
            f'<meta name="twitter:image" content="{image}">'
        )

    html = f"""<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>{titre} — Eventu</title>
<meta name="description" content="{description}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Eventu">
<meta property="og:locale" content="fr_FR">
<meta property="og:title" content="{titre}">
<meta property="og:description" content="{description}">
<meta property="og:url" content="{escape(request.build_absolute_uri())}">
{balises_image}
<meta name="twitter:card" content="{'summary_large_image' if image else 'summary'}">
<meta name="twitter:title" content="{titre}">
<meta name="twitter:description" content="{description}">
<link rel="canonical" href="{escape(front_url)}">
</head>
<body>
<h1>{titre}</h1>
<p>{description}</p>
<p><a href="{escape(front_url)}">Voir l'événement sur Eventu</a></p>
</body>
</html>"""
    return HttpResponse(html)
