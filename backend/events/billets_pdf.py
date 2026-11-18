"""Génération des billets en PDF : deux billets par page A4, chacun avec son QR code.

Le QR code contient l'adresse de la page de contrôle : en le scannant avec
l'appareil photo d'un téléphone, l'organisateur ouvre directement le billet.
"""
import io
import os

import reportlab
from django.conf import settings
from django.utils import timezone
from reportlab.graphics import renderPDF
from reportlab.graphics.barcode.qr import QrCodeWidget
from reportlab.graphics.shapes import Drawing
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

# Police fournie avec ReportLab : accents français garantis sur tous les systèmes
_DOSSIER_POLICES = os.path.join(os.path.dirname(reportlab.__file__), 'fonts')
if 'Vera' not in pdfmetrics.getRegisteredFontNames():
    pdfmetrics.registerFont(TTFont('Vera', os.path.join(_DOSSIER_POLICES, 'Vera.ttf')))
    pdfmetrics.registerFont(TTFont('Vera-Bold', os.path.join(_DOSSIER_POLICES, 'VeraBd.ttf')))

VIOLET = colors.HexColor('#4F46E5')
GRIS = colors.HexColor('#6B7280')
ENCRE = colors.HexColor('#111827')
MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet',
        'août', 'septembre', 'octobre', 'novembre', 'décembre']


def url_controle(code):
    return f"{settings.FRONTEND_URL.rstrip('/')}/controle/{code}"


def _date_fr(dt):
    dt = timezone.localtime(dt)
    return f"{dt.day} {MOIS[dt.month - 1]} {dt.year} à {dt:%H:%M}"


def _texte_coupe(c, texte, police, taille, largeur_max, max_lignes=2):
    """Coupe un texte en lignes qui tiennent dans la largeur donnée."""
    mots, lignes, courante = texte.split(), [], ""
    for mot in mots:
        essai = f"{courante} {mot}".strip()
        if c.stringWidth(essai, police, taille) <= largeur_max:
            courante = essai
        else:
            lignes.append(courante)
            courante = mot
    if courante:
        lignes.append(courante)
    if len(lignes) > max_lignes:
        lignes = lignes[:max_lignes]
        lignes[-1] = lignes[-1].rstrip(" .,") + "…"
    return lignes


def _dessiner_billet(c, billet, x, y, largeur, hauteur, numero, total):
    r = billet.reservation
    event = r.event
    marge = 8 * mm

    # Cadre et bandeau
    c.setStrokeColor(colors.HexColor('#D1D5DB'))
    c.setLineWidth(0.8)
    c.roundRect(x, y, largeur, hauteur, 4 * mm, stroke=1, fill=0)
    c.setFillColor(VIOLET)
    c.roundRect(x, y + hauteur - 14 * mm, largeur, 14 * mm, 4 * mm, stroke=0, fill=1)
    c.rect(x, y + hauteur - 14 * mm, largeur, 5 * mm, stroke=0, fill=1)
    c.setFillColor(colors.white)
    c.setFont('Vera-Bold', 12)
    c.drawString(x + marge, y + hauteur - 9 * mm, "Eventu · Billet électronique")
    c.setFont('Vera', 9)
    c.drawRightString(x + largeur - marge, y + hauteur - 9 * mm, f"Billet {numero} / {total}")

    # QR code à droite
    taille_qr = 52 * mm
    qr = QrCodeWidget(url_controle(billet.code))
    x0, y0, x1, y1 = qr.getBounds()
    dessin = Drawing(taille_qr, taille_qr,
                     transform=[taille_qr / (x1 - x0), 0, 0, taille_qr / (y1 - y0), 0, 0])
    dessin.add(qr)
    qr_x = x + largeur - marge - taille_qr
    qr_y = y + hauteur - 20 * mm - taille_qr
    renderPDF.draw(dessin, c, qr_x, qr_y)
    c.setFillColor(ENCRE)
    c.setFont('Vera-Bold', 11)
    c.drawCentredString(qr_x + taille_qr / 2, qr_y - 6 * mm, billet.code)
    c.setFont('Vera', 7.5)
    c.setFillColor(GRIS)
    c.drawCentredString(qr_x + taille_qr / 2, qr_y - 10 * mm, "Code à présenter à l'entrée")

    # Informations à gauche
    zone = largeur - 2 * marge - taille_qr - 8 * mm
    ty = y + hauteur - 25 * mm
    c.setFillColor(ENCRE)
    for ligne in _texte_coupe(c, event.titre, 'Vera-Bold', 16, zone):
        c.setFont('Vera-Bold', 16)
        c.drawString(x + marge, ty, ligne)
        ty -= 7 * mm
    ty -= 2 * mm

    lieu = ", ".join(v for v in (event.lieu, event.ville) if v)
    lignes = [
        ("Date", _date_fr(event.date_evenement)),
        ("Lieu", lieu or "—"),
        ("Billet", f"{billet.type_billet.nom} · {billet.type_billet.prix} DT"),
        ("Titulaire", f"{r.user.prenom} {r.user.nom}".strip() or r.user.email),
        ("Réservation", r.code_reference),
    ]
    for etiquette, valeur in lignes:
        c.setFont('Vera', 8)
        c.setFillColor(GRIS)
        c.drawString(x + marge, ty, etiquette.upper())
        ty -= 4.5 * mm
        c.setFont('Vera-Bold', 10.5)
        c.setFillColor(ENCRE)
        for morceau in _texte_coupe(c, valeur, 'Vera-Bold', 10.5, zone, max_lignes=2):
            c.drawString(x + marge, ty, morceau)
            ty -= 4.8 * mm
        ty -= 1.5 * mm

    # Pied : consigne, ou tampon si le billet a déjà servi
    c.setFont('Vera', 8)
    c.setFillColor(GRIS)
    c.drawString(x + marge, y + 6 * mm,
                 "Chaque billet ne peut être utilisé qu'une seule fois. Ne le partagez pas.")
    if billet.statut == 'utilise' and billet.utilise_le:
        c.setFillColor(colors.HexColor('#DC2626'))
        c.setFont('Vera-Bold', 10)
        c.drawRightString(x + largeur - marge, y + 6 * mm,
                          f"Utilisé le {_date_fr(billet.utilise_le)}")


def generer_pdf_billets(reservation):
    """PDF de tous les billets (valides ou déjà utilisés) d'une réservation confirmée."""
    billets = list(reservation.billets.exclude(statut='annule')
                   .select_related('type_billet', 'reservation__event', 'reservation__user'))
    tampon = io.BytesIO()
    c = canvas.Canvas(tampon, pagesize=A4)
    c.setTitle(f"Billets {reservation.code_reference}")
    c.setAuthor("Eventu")
    largeur_page, hauteur_page = A4
    marge = 12 * mm
    hauteur = (hauteur_page - 3 * marge) / 2
    largeur = largeur_page - 2 * marge
    for i, billet in enumerate(billets):
        haut = i % 2 == 0
        if i and haut:
            c.showPage()
        y = hauteur_page - marge - hauteur if haut else marge
        _dessiner_billet(c, billet, marge, y, largeur, hauteur, i + 1, len(billets))
    c.save()
    return tampon.getvalue()
