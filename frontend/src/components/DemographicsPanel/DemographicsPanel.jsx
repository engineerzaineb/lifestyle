import { useState } from "react";
import { Users, MapPin, Cake, UserRound } from "lucide-react";
import styles from "./DemographicsPanel.module.css";

/**
 * Panneau démographique : répartition par ville, âge et genre.
 * Bascule entre les utilisateurs qui RÉSERVENT et ceux qui CONSULTENT.
 * @param {object} data - { reservateurs: {...}, visiteurs: {...} }
 */
export default function DemographicsPanel({ data }) {
  const [vue, setVue] = useState("reservateurs");

  if (!data) {
    return (
      <div className={styles.card}>
        <p className={styles.empty}>Chargement du profil des participants…</p>
      </div>
    );
  }

  const profil = data[vue] || { total: 0, villes: [], ages: [], genres: [] };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h3 className={styles.title}>
          <Users size={16} /> Profil des participants
        </h3>
        <div className={styles.toggle}>
          <button
            type="button"
            className={`${styles.toggleBtn} ${vue === "reservateurs" ? styles.toggleActive : ""}`}
            onClick={() => setVue("reservateurs")}
          >
            Réservations
          </button>
          <button
            type="button"
            className={`${styles.toggleBtn} ${vue === "visiteurs" ? styles.toggleActive : ""}`}
            onClick={() => setVue("visiteurs")}
          >
            Visiteurs
          </button>
        </div>
      </div>

      <p className={styles.count}>
        {profil.total} {vue === "reservateurs" ? "personne(s) ayant réservé" : "visiteur(s) identifié(s)"}
      </p>

      {profil.total === 0 ? (
        <p className={styles.empty}>
          Aucune donnée pour l'instant. Les informations apparaîtront dès que des
          utilisateurs {vue === "reservateurs" ? "réserveront" : "consulteront"} vos événements.
        </p>
      ) : (
        <div className={styles.sections}>
          <BarGroup icon={MapPin} titre="Villes" items={profil.villes} total={profil.total} />
          <BarGroup icon={Cake} titre="Tranches d'âge" items={profil.ages} total={profil.total} />
          <BarGroup icon={UserRound} titre="Genre" items={profil.genres} total={profil.total} />
        </div>
      )}
    </div>
  );
}

function BarGroup({ icon: Icon, titre, items, total }) {
  if (!items || items.length === 0) return null;
  const max = Math.max(...items.map((i) => i.value), 1);

  return (
    <div className={styles.group}>
      <p className={styles.groupTitle}>
        <Icon size={13} /> {titre}
      </p>
      <div className={styles.bars}>
        {items.map((it) => {
          const pct = Math.round((it.value / total) * 100);
          return (
            <div key={it.label} className={styles.barRow}>
              <span className={styles.barLabel}>{it.label}</span>
              <div className={styles.barTrack}>
                <div
                  className={styles.barFill}
                  style={{ width: `${(it.value / max) * 100}%` }}
                />
              </div>
              <span className={styles.barValue}>{it.value} · {pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}