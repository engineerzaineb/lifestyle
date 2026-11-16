import { Link } from "react-router-dom";
import {
  Inbox, Calendar, Users, Tag, TrendingUp, Ticket, ArrowRight,
} from "lucide-react";
import { useSync } from "../../context/useSync";
import styles from "./AdminOverview.module.css";

export default function AdminOverview() {
  // Les statistiques viennent de la source commune : ce sont exactement les
  // chiffres des badges du menu, mis à jour en même temps (toutes les 10 s,
  // à chaque changement de page et après chaque décision de l'admin).
  const { adminStats: stats } = useSync();
  const loading = stats === null;

  const cards = [
    {
      label: "Demandes en attente",
      value: stats?.demandes.en_attente ?? 0,
      hint: "à traiter",
      icon: Inbox,
      color: styles.cardOrange,
      link: "/admin/demandes",
      urgent: (stats?.demandes.en_attente ?? 0) > 0,
    },
    {
      label: "Événements",
      value: stats?.events.total ?? 0,
      hint:
        stats?.events.en_attente > 0
          ? `${stats.events.en_attente} à modérer`
          : `${stats?.events.publies ?? 0} publiés`,
      icon: Calendar,
      color: styles.cardBlue,
      link: "/admin/events",
      urgent: (stats?.events.en_attente ?? 0) > 0,
    },
    {
      label: "Utilisateurs",
      value: stats?.users.total ?? 0,
      hint: `${stats?.users.organisateurs ?? 0} organisateurs`,
      icon: Users,
      color: styles.cardGreen,
      link: "/admin/users",
    },
    {
      label: "Catégories",
      value: stats?.categories.total ?? 0,
      hint:
        stats?.categories.en_attente > 0
          ? `${stats.categories.en_attente} proposée(s)`
          : "toutes validées",
      icon: Tag,
      color: styles.cardPurple,
      link: "/admin/categories",
      urgent: (stats?.categories.en_attente ?? 0) > 0,
    },
  ];

  // Actions nécessitant l'attention de l'admin
  const todos = [];
  if (stats) {
    if (stats.demandes.en_attente > 0) {
      todos.push({
        label: `${stats.demandes.en_attente} demande(s) d'organisateur à examiner`,
        link: "/admin/demandes",
      });
    }
    if (stats.events.en_attente > 0) {
      todos.push({
        label: `${stats.events.en_attente} événement(s) en attente de validation`,
        link: "/admin/events",
      });
    }
    if (stats.categories.en_attente > 0) {
      todos.push({
        label: `${stats.categories.en_attente} catégorie(s) proposée(s) à modérer`,
        link: "/admin/categories",
      });
    }
    if (stats.users.inactifs > 0) {
      todos.push({
        label: `${stats.users.inactifs} compte(s) désactivé(s)`,
        link: "/admin/users",
      });
    }
  }

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>Vue d'ensemble</h1>
        <p className={styles.subtitle}>Tableau de bord administrateur</p>
      </div>

      {/* Cartes de statistiques */}
      <div className={styles.cardsGrid}>
        {cards.map((card, i) => {
          const Icon = card.icon;
          return (
            <Link
              key={i}
              to={card.link}
              className={`${styles.statCard} ${card.color}`}
            >
              <div className={styles.statIcon}>
                <Icon size={22} />
              </div>
              <div className={styles.statInfo}>
                <p className={styles.statValue}>
                  {loading ? "..." : card.value}
                </p>
                <p className={styles.statLabel}>{card.label}</p>
                {!loading && card.hint && (
                  <p
                    className={`${styles.statHint} ${
                      card.urgent ? styles.statHintUrgent : ""
                    }`}
                  >
                    {card.hint}
                  </p>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Réservations */}
      {!loading && stats && (
        <div className={styles.secondaryRow}>
          <div className={styles.miniCard}>
            <Ticket size={16} className={styles.miniIcon} />
            <span className={styles.miniValue}>
              {stats.reservations.confirmees}
            </span>
            <span className={styles.miniLabel}>
              réservation{stats.reservations.confirmees > 1 ? "s" : ""} confirmée
              {stats.reservations.confirmees > 1 ? "s" : ""}
            </span>
          </div>
        </div>
      )}

      {/* À traiter */}
      {!loading && (
        <div className={styles.welcomeBox}>
          <TrendingUp size={20} className={styles.welcomeIcon} />
          <div className={styles.welcomeContent}>
            {todos.length === 0 ? (
              <>
                <p className={styles.welcomeTitle}>Tout est à jour</p>
                <p className={styles.welcomeText}>
                  Aucune action ne requiert votre attention pour le moment.
                </p>
              </>
            ) : (
              <>
                <p className={styles.welcomeTitle}>À traiter</p>
                <ul className={styles.todoList}>
                  {todos.map((todo, i) => (
                    <li key={i}>
                      <Link to={todo.link} className={styles.todoLink}>
                        {todo.label}
                        <ArrowRight size={13} />
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
