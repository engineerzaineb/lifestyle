import { etapesEvent, formatDateHeure } from "../../utils/tracabilite";
import styles from "./EventTimeline.module.css";

const TON = { validation: "succes", publication: "succes", refus: "danger", annulation: "danger" };

/**
 * Frise des étapes datées d'un événement : création, soumission,
 * acceptation (par qui), publication, refus (par qui, motif), annulation.
 */
export default function EventTimeline({ event }) {
  const etapes = etapesEvent(event);
  if (!etapes.length) return null;

  return (
    <ol className={styles.timeline}>
      {etapes.map((e) => (
        <li key={e.cle} className={`${styles.step} ${styles[TON[e.cle]] || ""}`}>
          <span className={styles.dot} />
          <div>
            <p className={styles.label}>
              {e.label}
              <span className={styles.date}>le {formatDateHeure(e.date)}</span>
            </p>
            {e.par && <p className={styles.sub}>par {e.par}</p>}
            {e.motif && <p className={styles.motif}>Motif : {e.motif}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
