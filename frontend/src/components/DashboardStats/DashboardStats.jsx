import { Eye, Users, Banknote, TrendingUp, ArrowUp, ArrowDown } from "lucide-react";
import styles from "./DashboardStats.module.css";


export default function DashboardStats({ stats }) {
  const defaultStats = {
    views: { value: 2847, delta: 12 },
    inscriptions: { value: 142, total: 200, delta: 8 },
    revenue: { value: 4970, delta: 24 },
    fillRate: { value: 71, delta: 5 },
  };

  const data = stats || defaultStats;

  return (
    <div className={styles.grid}>
      <StatCard
        icon={Eye}
        label="Vues"
        value={data.views.value.toLocaleString("fr-FR")}
        delta={data.views.delta}
        deltaLabel="vs semaine passée"
        color="primary"
      />
      <StatCard
        icon={Users}
        label="Inscriptions"
        value={`${data.inscriptions.value}${data.inscriptions.total ? ` / ${data.inscriptions.total}` : ""}`}
        delta={data.inscriptions.delta}
        deltaLabel="cette semaine"
        color="pink"
      />
      <StatCard
        icon={Banknote}
        label="Revenus"
        value={`${data.revenue.value.toLocaleString("fr-FR")} DT`}
        delta={data.revenue.delta}
        deltaLabel="ce mois"
        color="coral"
      />
      <StatCard
        icon={TrendingUp}
        label="Taux remplissage"
        value={`${data.fillRate.value}%`}
        delta={data.fillRate.delta}
        deltaLabel="vs mois passé"
        color="success"
      />
    </div>
  );
}

//StatCard — une carte de stat individuelle
function StatCard({ icon: Icon, label, value, delta, deltaLabel, color }) {
  const cardClass = {
    primary: styles.cardPrimary,
    pink: styles.cardPink,
    coral: styles.cardCoral,
    success: styles.cardSuccess,
  }[color];

  const iconClass = {
    primary: styles.iconPrimary,
    pink: styles.iconPink,
    coral: styles.iconCoral,
    success: styles.iconSuccess,
  }[color];

  const isPositive = delta > 0;
  const isNegative = delta < 0;
  const deltaClass = isPositive
    ? styles.deltaPositive
    : isNegative
    ? styles.deltaNegative
    : styles.deltaNeutral;
  const DeltaIcon = isPositive ? ArrowUp : isNegative ? ArrowDown : null;

  return (
    <div className={`${styles.card} ${cardClass}`}>
      <div className={styles.cardDecor} />

      <div className={`${styles.iconWrapper} ${iconClass}`}>
        <Icon size={18} />
      </div>

      <p className={styles.label}>{label}</p>
      <p className={styles.value}>{value}</p>

      {delta !== undefined && (
        <p className={`${styles.delta} ${deltaClass}`}>
          {DeltaIcon && <DeltaIcon size={12} strokeWidth={3} />}
          {Math.abs(delta)}% {deltaLabel}
        </p>
      )}
    </div>
  );
}