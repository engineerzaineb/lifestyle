import { Ticket, CalendarCheck, Banknote, Hash } from "lucide-react";
import { formatCompactNumber } from "../../../utils/formatters";
import styles from "./ReservationsHeader.module.css";

export default function ReservationsHeader({ stats }) {
  return (
    <header className={styles.header}>
      <div className={styles.blob} />

      <div className={styles.inner}>
        <h1 className={styles.title}>
          Mes <em className={styles.titleEm}>réservations</em>
        </h1>
        <p className={styles.subtitle}>
          Retrouvez tous vos billets et événements à venir
        </p>

        <div className={styles.stats}>
          <StatCard
            icon={Ticket}
            label="Réservations"
            value={stats.totalReservations}
            color="primary"
          />
          <StatCard
            icon={CalendarCheck}
            label="À venir"
            value={stats.upcomingCount}
            color="success"
          />
          <StatCard
            icon={Hash}
            label="Billets"
            value={stats.ticketsCount}
            color="pink"
          />
          <StatCard
            icon={Banknote}
            label="Total dépensé"
            value={formatCompactNumber(stats.totalSpent)}
            suffix="DT"
            color="coral"
          />
        </div>
      </div>
    </header>
  );
}

function StatCard({ icon: Icon, label, value, suffix, color }) {
  const iconClass = {
    primary: styles.iconPrimary,
    success: styles.iconSuccess,
    coral: styles.iconCoral,
    pink: styles.iconPink,
  }[color];

  return (
    <div className={styles.statCard}>
      <div className={`${styles.statIcon} ${iconClass}`}>
        <Icon size={18} />
      </div>
      <div className={styles.statInfo}>
        <p className={styles.statLabel}>{label}</p>
        <p className={styles.statValue}>
          {value}
          {suffix && <span className={styles.statSuffix}>{suffix}</span>}
        </p>
      </div>
    </div>
  );
}