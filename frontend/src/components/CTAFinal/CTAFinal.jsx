import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "../../context/useAuth";

import styles from "./CTAFinal.module.css";


export default function CTAFinal({
  title,
  subtitle = "Rejoignez 350 000 personnes qui sortent intelligemment grâce à Eventu.",
  primaryLabel,
  primaryTo,
  secondaryLabel,
  secondaryTo,
  showBadge = true,
  showNote = true,
}) {
  const { user, isAuthenticated } = useAuth();

  // Détermine les boutons selon le contexte de l'utilisateur
  let computedPrimaryLabel = primaryLabel;
  let computedPrimaryTo = primaryTo;
  let computedSecondaryLabel = secondaryLabel;
  let computedSecondaryTo = secondaryTo;

  // Si les props ne sont pas fournies, on calcule selon le statut
  if (!primaryTo) {
    if (!isAuthenticated) {
      // Pas connecté : inviter à créer un compte
      computedPrimaryLabel = primaryLabel || "Créer mon compte gratuit";
      computedPrimaryTo = "/register";
      computedSecondaryLabel = secondaryLabel || "Devenir organisateur";
      computedSecondaryTo = "/register";
    } else if (user?.is_organisateur) {
      // Déjà organisateur : accès au dashboard
      computedPrimaryLabel = primaryLabel || "Mon tableau de bord";
      computedPrimaryTo = "/dashboard";
      computedSecondaryLabel = secondaryLabel || "Découvrir des événements";
      computedSecondaryTo = "/search";
    } else {
      // Connecté mais pas organisateur : inviter à faire une demande
      computedPrimaryLabel = primaryLabel || "Devenir organisateur";
      computedPrimaryTo = "/devenir-organisateur";
      computedSecondaryLabel = secondaryLabel || "Découvrir des événements";
      computedSecondaryTo = "/search";
    }
  }

  // Particules flottantes
  const [particles] = useState(() => Array.from(
    { length: 12 },
    (_, i) => ({
      id: i,
      top: Math.random() * 100,
      left: Math.random() * 100,
      size: 8 + Math.random() * 14,
      color: ["primary", "pink", "coral"][i % 3],
      delay: Math.random() * 2,
      duration: 4 + Math.random() * 4,
    })
  ));

  return (
    <section className={styles.section}>
      {/* Particules flottantes */}
      {particles.map((p) => (
        <span
          key={p.id}
          className={`${styles.particle} ${
            styles[`particle${capitalize(p.color)}`]
          }`}
          style={{
            top: `${p.top}%`,
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}

      <div className={styles.inner}>
        {/* Badge */}
        {showBadge && (
          <div className={styles.badge}>
            <span className={styles.badgeDot} />
            <Sparkles size={13} color="var(--color-pink)" />
            <span>Inscription gratuite, 2 minutes</span>
          </div>
        )}

        {/* Titre */}
        <h2 className={styles.title}>
          {title || (
            <>
              Votre prochaine soirée
              <br />
              <em className={styles.titleHighlight}>
                commence maintenant
              </em>
            </>
          )}
        </h2>

        {/* Sous-titre */}
        <p className={styles.subtitle}>{subtitle}</p>

        {/* Boutons */}
        <div className={styles.actions}>
          <Link to={computedPrimaryTo} className={styles.btnPrimary}>
            {computedPrimaryLabel}
            <ArrowRight size={16} />
          </Link>

          {computedSecondaryLabel && (
            <Link to={computedSecondaryTo} className={styles.btnSecondary}>
              {computedSecondaryLabel}
            </Link>
          )}
        </div>

        {/* Note */}
        {showNote && (
          <p className={styles.note}>
            <ShieldCheck size={14} className={styles.noteIcon} />
            Sans engagement · Annulation gratuite · Paiement sécurisé
          </p>
        )}
      </div>
    </section>
  );
}

// Helper pour capitaliser la première lettre d'une chaîne
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}