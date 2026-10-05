"""
Envoi des emails transactionnels de la plateforme.

Le HTML est construit en Python plutôt qu'en templates Django : cela évite
toute configuration de répertoires de templates et garde chaque email
autonome et lisible. Si le nombre d'emails grandit, un passage aux templates
sera préférable.
"""

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode


# Gabarit commun

def _wrap(titre, corps_html):
    """Enveloppe un contenu dans la charte visuelle d'Eventu."""
    return f"""<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f9f8f5;
             font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f8f5;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0"
             style="max-width:520px;background:#ffffff;border-radius:16px;
                    overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);">

        <tr><td style="background:linear-gradient(135deg,#4F46E5,#EC4899);padding:26px 32px;">
          <span style="color:#ffffff;font-size:22px;font-weight:700;
                       letter-spacing:-0.02em;">Eventu</span>
        </td></tr>

        <tr><td style="padding:32px;">
          <h1 style="margin:0 0 18px;font-size:20px;color:#1f2937;
                     font-weight:700;line-height:1.3;">{titre}</h1>
          {corps_html}
        </td></tr>

        <tr><td style="padding:20px 32px;background:#f9f8f5;
                       border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:12px;color:#6b7280;line-height:1.6;">
            Cet email vous a été envoyé automatiquement, merci de ne pas y répondre.<br>
            Eventu — la plateforme tunisienne des événements.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>"""


def _bouton(url, libelle):
    return f"""
      <table cellpadding="0" cellspacing="0" style="margin:24px 0;">
        <tr><td style="border-radius:10px;
                       background:linear-gradient(135deg,#4F46E5,#EC4899);">
          <a href="{url}" style="display:inline-block;padding:13px 28px;
                                 color:#ffffff;text-decoration:none;
                                 font-size:15px;font-weight:600;">{libelle}</a>
        </td></tr>
      </table>"""


def _envoyer(destinataire, sujet, html, texte):
    """Envoi effectif. Les erreurs ne doivent jamais interrompre le flux métier."""
    message = EmailMultiAlternatives(
        subject=sujet,
        body=texte,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[destinataire],
    )
    message.attach_alternative(html, "text/html")
    message.send(fail_silently=False)


# Réinitialisation de mot de passe

def build_password_reset_link(user):
    """Construit le lien de réinitialisation contenant l'identifiant encodé
    et un jeton signé. Le jeton devient invalide dès que le mot de passe
    change, ou après expiration (PASSWORD_RESET_TIMEOUT)."""
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    return f"{settings.FRONTEND_URL}/reset-password/{uid}/{token}"


def send_password_reset_email(user):
    lien = build_password_reset_link(user)
    prenom = user.prenom or "Bonjour"

    corps = f"""
      <p style="margin:0 0 14px;font-size:15px;color:#374151;line-height:1.6;">
        {prenom}, vous avez demandé à réinitialiser votre mot de passe Eventu.
      </p>
      <p style="margin:0;font-size:15px;color:#374151;line-height:1.6;">
        Cliquez sur le bouton ci-dessous pour en choisir un nouveau. Ce lien
        est valable 24&nbsp;heures.
      </p>
      {_bouton(lien, "Réinitialiser mon mot de passe")}
      <p style="margin:0 0 8px;font-size:13px;color:#6b7280;line-height:1.6;">
        Si le bouton ne fonctionne pas, copiez cette adresse dans votre navigateur :
      </p>
      <p style="margin:0 0 20px;font-size:12px;color:#4F46E5;
                word-break:break-all;line-height:1.5;">{lien}</p>
      <p style="margin:0;padding:12px 14px;background:#fffbeb;
                border-left:3px solid #d97706;border-radius:8px;
                font-size:13px;color:#92400e;line-height:1.6;">
        Vous n'êtes pas à l'origine de cette demande ? Ignorez simplement cet
        email, votre mot de passe reste inchangé.
      </p>"""

    texte = (
        f"{prenom},\n\n"
        f"Vous avez demandé à réinitialiser votre mot de passe Eventu.\n"
        f"Ouvrez ce lien pour en choisir un nouveau (valable 24 heures) :\n\n"
        f"{lien}\n\n"
        f"Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.\n"
    )

    _envoyer(user.email, "Réinitialisation de votre mot de passe Eventu",
             _wrap("Réinitialisation de mot de passe", corps), texte)


def send_password_changed_email(user):
    """Notification après un changement effectif. Permet à l'utilisateur de
    réagir vite si le changement ne vient pas de lui."""
    prenom = user.prenom or "Bonjour"

    corps = f"""
      <p style="margin:0 0 14px;font-size:15px;color:#374151;line-height:1.6;">
        {prenom}, le mot de passe de votre compte Eventu vient d'être modifié.
      </p>
      <p style="margin:0;padding:12px 14px;background:#fef2f2;
                border-left:3px solid #dc2626;border-radius:8px;
                font-size:13px;color:#991b1b;line-height:1.6;">
        Vous n'êtes pas à l'origine de ce changement ? Réinitialisez
        immédiatement votre mot de passe et contactez-nous.
      </p>"""

    texte = (
        f"{prenom},\n\n"
        f"Le mot de passe de votre compte Eventu vient d'être modifié.\n\n"
        f"Si vous n'êtes pas à l'origine de ce changement, réinitialisez "
        f"immédiatement votre mot de passe.\n"
    )

    _envoyer(user.email, "Votre mot de passe Eventu a été modifié",
             _wrap("Mot de passe modifié", corps), texte)
