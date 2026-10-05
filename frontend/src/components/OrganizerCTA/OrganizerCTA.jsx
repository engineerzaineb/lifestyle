import { Link } from "react-router-dom";
import {
  ArrowRight, CheckCircle2, Zap, TrendingUp
} from "lucide-react";
import styles from "./OrganizerCTA.module.css";


export default function OrganizerCTA({
  ctaTo = "/register",
  ctaLabel = "Devenir organisateur",
}) {
  const features = [
    "Publication gratuite, vous gardez 100% des revenus sur événements gratuits",
    "Paiements sécurisés par Stripe et D17",
    "Tableau de bord en temps réel avec stats détaillées",
    "Recommandation IA pour toucher le bon public",
  ];

  return (
    <section className={styles.section}>
      {/* Blobs animés en arrière-plan */}
      <div className={styles.blob1} />
      <div className={styles.blob2} />

      <div className={styles.inner}>
        {/* Colonne gauche — Texte */}
        <div>
          <p className={styles.eyebrow}>Pour les organisateurs</p>
          <h2 className={styles.title}>
            Votre événement <br />
            <em className={styles.titleHighlight}>mérite d'être vu</em>
          </h2>
          <p className={styles.subtitle}>
            Publiez gratuitement. Notre IA recommande votre événement aux personnes
            les plus susceptibles d'y assister.
          </p>

          {/* Liste de features */}
          <div className={styles.features}>
            {features.map((f, i) => (
              <div key={i} className={styles.feature}>
                <div
                  className={styles.featureCheck}
                  style={{ animationDelay: `${i * 0.3}s` }}
                >
                  <CheckCircle2 size={13} strokeWidth={2.5} />
                </div>
                <span className={styles.featureText}>{f}</span>
              </div>
            ))}
          </div>

          <Link to={ctaTo} className={styles.ctaBtn}>
            {ctaLabel}
            <ArrowRight size={16} />
          </Link>
        </div>

        {/* Colonne droite — Mock dashboard */}
        <DashboardPreview />
      </div>
    </section>
  );
}


function DashboardPreview() {
  const bars = [30, 45, 25, 65, 80, 50, 95];

  return (
    <div className={styles.dashboard}>
      <p className={styles.dashboardLabel}>✨ Mon tableau de bord</p>
      <p className={styles.dashboardTitle}>Soirée Jazz au Carthage</p>

      {/* Stats clés */}
      <div className={styles.dashStats}>
        <div className={styles.dashStat}>
          <p className={styles.dashStatLabel}>Vues</p>
          <p className={styles.dashStatValue}>2 847</p>
          <p className={`${styles.dashStatDelta} ${styles.deltaPink}`}>+12%</p>
        </div>
        <div className={styles.dashStat}>
          <p className={styles.dashStatLabel}>Inscrits</p>
          <p className={styles.dashStatValue}>142 / 200</p>
          <p className={`${styles.dashStatDelta} ${styles.deltaSuccess}`}>71% rempli</p>
        </div>
      </div>

      {/* Graphique en barres */}
      <div className={styles.chartCard}>
        <div className={styles.chartHeader}>
          <p className={styles.chartLabel}>Inscriptions cette semaine</p>
          <span className={styles.chartTrend}>
            <TrendingUp size={14} />
          </span>
        </div>
        <div className={styles.chart}>
          {bars.map((h, i) => (
            <div
              key={i}
              className={styles.chartBar}
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </div>

      {/* Bandeau revenus */}
      <div className={styles.revenue}>
        <span className={styles.revenueLabel}>
          <Zap size={13} fill="currentColor" />
          Revenus
        </span>
        <span className={styles.revenueValue}>4 970 DT</span>
      </div>
    </div>
  );
}