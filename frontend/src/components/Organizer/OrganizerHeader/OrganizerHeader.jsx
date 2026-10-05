import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { formatCompactNumber } from "../../../utils/formatters";
import styles from "./OrganizerHeader.module.css";


export default function OrganizerHeader({ stats }) {
  return (
    <header className={styles.header}>
      <div className={styles.blob} />

      <div className={styles.inner}>
        <div className={styles.top}>
          <div className={styles.titleBlock}>
            <h1 className={styles.title}>
              Mes <em className={styles.titleEm}>événements</em>
            </h1>
            <p className={styles.subtitle}>
              Gérez tous vos événements en un seul endroit
            </p>
          </div>
          <Link to="/organizer/create" className={styles.createBtn}>
            <Plus size={16} />
            Créer un événement
          </Link>
        </div>

        <div className={styles.stats}>
          <StatCard
            label="Événements"
            value={stats.totalEvents}
            suffix={stats.publishedEvents > 0 ? `dont ${stats.publishedEvents} publiés` : null}
          />
          <StatCard
            label="Vues totales"
            value={formatCompactNumber(stats.totalViews)}
          />
          <StatCard
            label="Inscriptions"
            value={stats.totalRegistrations}
          />
          <StatCard
            label="Revenus"
            value={formatCompactNumber(stats.totalRevenue)}
            suffix="DT"
          />
          <StatCard
            label="Taux remplissage"
            value={`${stats.avgFillRate}%`}
          />
        </div>
      </div>
    </header>
  );
}

function StatCard({ label, value, suffix }) {
  return (
    <div className={styles.statCard}>
      <p className={styles.statLabel}>{label}</p>
      <p className={styles.statValue}>
        {value}
        {suffix && <span className={styles.statSuffix}> {suffix}</span>}
      </p>
    </div>
  );
}