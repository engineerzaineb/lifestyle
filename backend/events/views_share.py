from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.conf import settings
from django.utils.html import escape
from .models import Event


def share_event(request, pk):
    """Page de partage : sert les balises Open Graph aux robots (Facebook,
    WhatsApp...) puis redirige les visiteurs humains vers la page React."""
    # Seuls les events publiés et validés sont partageables
    event = get_object_or_404(Event, pk=pk, statut='publie', is_valide=True)

    front_url = f"{settings.FRONTEND_URL}/event/{event.id}"
    image_url = request.build_absolute_uri(event.image.url) if event.image else ""
    titre = escape(event.titre)

    # Description : début de la description de l'event, sinon phrase par défaut
    desc_brute = (event.description or "").strip()[:200]
    infos = " · ".join(filter(None, [
        event.date_evenement.strftime("%d/%m/%Y") if event.date_evenement else "",
        event.ville or "",
    ]))
    description = escape(desc_brute or f"{infos} — Réservez sur Eventu" if infos else "Réservez sur Eventu")

    balise_image = f'<meta property="og:image" content="{image_url}">' if image_url else ""

    html = f"""<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>{titre} — Eventu</title>
<meta property="og:type" content="website">
<meta property="og:site_name" content="Eventu">
<meta property="og:title" content="{titre}">
<meta property="og:description" content="{description}">
{balise_image}
<meta property="og:url" content="{request.build_absolute_uri()}">
<meta name="twitter:card" content="summary_large_image">
<meta http-equiv="refresh" content="0;url={front_url}">
</head>
<body>
<p>Redirection vers <a href="{front_url}">{titre}</a>…</p>
</body>
</html>"""
    return HttpResponse(html)