import { useState, useEffect } from "react";
import { Award } from "lucide-react";
import { fetchMonPalier } from "../../services/fideliteService";
import styles from "./FideliteCard.module.css";

/* Labels avec accents (le backend renvoie des noms sans accents) */
const LABELS = {
  Membre: "Membre",
  Silver: "Silver",
  Gold: "Gold",
  Platinum: "Platinum",
};

export default function FideliteCard() {
  const [info, setInfo] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchMonPalier()
      .then((data) => { if (!cancelled) setInfo(data); })
      .catch(() => { /* silencieux : la carte ne s'affiche pas en cas d'erreur */ });
    return () => { cancelled = true; };
  }, []);

  if (!info || !info.palier) return null;

  const { nb_reservations, palier, palier_suivant } = info;
  const label = LABELS[palier.nom] || palier.nom;

  // Progression vers le palier suivant (en % de la barre)
  let progression = 100;
  if (palier_suivant) {
    const debut = palier.seuil;
    const fin = palier_suivant.seuil;
    progression = Math.round(((nb_reservations - debut) / (fin - debut)) * 100);
  }

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.badge} style={{ background: palier.couleur }}>
          <Award size={20} />
        </div>
        <div>
          <p className={styles.palierNom}>{label}</p>
          <p className={styles.sub}>
            {nb_reservations} réservation{nb_reservations > 1 ? "s" : ""}
            {palier.remise_pct > 0 && (
              <> · <strong>-{palier.remise_pct}%</strong> sur toutes vos réservations</>
            )}
          </p>
        </div>
      </div>

      {palier_suivant ? (
        <div className={styles.progressZone}>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${progression}%` }} />
          </div>
          <p className={styles.progressText}>
            Encore <strong>{palier_suivant.reservations_restantes}</strong> réservation
            {palier_suivant.reservations_restantes > 1 ? "s" : ""} pour devenir{" "}
            <strong>{LABELS[palier_suivant.nom] || palier_suivant.nom}</strong> (-{palier_suivant.remise_pct}%)
          </p>
        </div>
      ) : (
        <p className={styles.progressText}>🏆 Vous êtes au niveau maximum !</p>
      )}
    </div>
  );
}