import { useState, useEffect } from "react";
import { Inbox, Calendar, Users, Tag, TrendingUp } from "lucide-react";
import { fetchDemandes } from "../../services/adminService";
import styles from "./AdminOverview.module.css";

export default function AdminOverview() {
  const [stats, setStats] = useState({
    demandesEnAttente: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Pour l'instant on charge juste les demandes en attente
    fetchDemandes("en_attente")
      .then((demandes) => {
        setStats({ demandesEnAttente: demandes.length });
      })
      .catch((err) => console.error("Erreur stats:", err))
      .finally(() => setLoading(false));
  }, []);

  const cards = [
    {
      label: "Demandes en attente",
      value: stats.demandesEnAttente,
      icon: Inbox,
      color: styles.cardOrange,
      link: "/admin/demandes",
    },
    {
      label: "Événements",
      value: "—",
      icon: Calendar,
      color: styles.cardBlue,
      link: "/admin/events",
    },
    {
      label: "Utilisateurs",
      value: "—",
      icon: Users,
      color: styles.cardGreen,
      link: "/admin/users",
    },
    {
      label: "Catégories",
      value: "—",
      icon: Tag,
      color: styles.cardPurple,
      link: "/admin/categories",
    },
  ];

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>Vue d'ensemble</h1>
        <p className={styles.subtitle}>Tableau de bord administrateur</p>
      </div>

      <div className={styles.cardsGrid}>
        {cards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} className={`${styles.statCard} ${card.color}`}>
              <div className={styles.statIcon}>
                <Icon size={22} />
              </div>
              <div className={styles.statInfo}>
                <p className={styles.statValue}>
                  {loading ? "..." : card.value}
                </p>
                <p className={styles.statLabel}>{card.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className={styles.welcomeBox}>
        <TrendingUp size={20} className={styles.welcomeIcon} />
        <div>
          <h3 className={styles.welcomeTitle}>Bienvenue dans l'administration</h3>
          <p className={styles.welcomeText}>
            Gérez les demandes d'organisateurs, validez les événements et supervisez la plateforme depuis ce tableau de bord.
          </p>
        </div>
      </div>
    </div>
  );
}