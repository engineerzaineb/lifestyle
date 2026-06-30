import { Link } from "react-router-dom";
import { ShieldCheck, Globe } from "lucide-react";
import styles from "./Footer.module.css";


export default function Footer() {
  const columns = [
    {
      title: "Découvrir",
      links: [
        { label: "Tous les événements", to: "/discover" },
        { label: "Recherche", to: "/search" },
        { label: "Bons plans", to: "/discover?bon_plan=true" },
        { label: "Catégories", to: "/discover" },
      ],
    },
    {
      title: "Organisateurs",
      links: [
        { label: "Devenir organisateur", to: "/register" },
        { label: "Tarifs", to: "/pricing" },
        { label: "Outils", to: "/tools" },
        { label: "Témoignages", to: "/testimonials" },
      ],
    },
    {
      title: "Entreprise",
      links: [
        { label: "À propos", to: "/about" },
        { label: "Blog", to: "/blog" },
        { label: "Contact", to: "/contact" },
        { label: "Carrières", to: "/careers" },
      ],
    },
    {
      title: "Légal",
      links: [
        { label: "CGU", to: "/legal/cgu" },
        { label: "Confidentialité", to: "/legal/privacy" },
        { label: "Cookies", to: "/legal/cookies" },
        { label: "Mentions légales", to: "/legal/mentions" },
      ],
    },
  ];

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.grid}>
          {/* Colonne Brand */}
          <div className={styles.brand}>
            <Link to="/" className={styles.brandHeader}>
              <div className={styles.brandIcon}>E</div>
              <span className={styles.brandName}>Eventu</span>
            </Link>
            <p className={styles.brandDescription}>
              La plateforme tunisienne pour découvrir, réserver et organiser des événements qui comptent.
            </p>
          </div>

          {/* Colonnes de liens */}
          {columns.map((col, colIndex) => (
  <div key={`${col.title}-${colIndex}`} className={styles.column}>
    <p className={styles.columnTitle}>{col.title}</p>

    {col.links.map((link, linkIndex) => (
      <Link
        key={`${link.to}-${linkIndex}`}
        to={link.to}
        className={styles.link}
      >
        {link.label}
      </Link>
    ))}
  </div>
))}
        </div>

        {/* Barre du bas */}
        <div className={styles.bottomBar}>
          <p className={styles.copyright}>
            © 2026 Eventu. Tous droits réservés. Fait avec{" "}
            <span className={styles.heart}>♥</span> en Tunisie.
          </p>
          <div className={styles.badges}>
            <span className={styles.badge}>
              <ShieldCheck size={12} />
              Paiements sécurisés
            </span>
            <span className={styles.badge}>
              <Globe size={12} />
              Français · العربية
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}