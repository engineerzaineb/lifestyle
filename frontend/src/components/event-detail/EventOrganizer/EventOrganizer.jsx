import { CheckCircle2 } from "lucide-react";
import { getInitials } from "../../../utils/formatters";
import styles from "./EventOrganizer.module.css";


export default function EventOrganizer({ organisateur }) {
  if (!organisateur) return null;

  return (
    <section className={styles.section}>
      <h2 className={styles.title}>
        <em className={styles.titleEm}>Organisateur</em>
      </h2>
      <div className={styles.card}>
        <div className={styles.avatar}>
          {getInitials(organisateur.prenom, organisateur.nom)}
        </div>
        <div className={styles.info}>
          <p className={styles.name}>
            {organisateur.prenom} {organisateur.nom}
            {organisateur.verifie && (
              <span className={styles.verified}>
                <CheckCircle2 size={14} fill="currentColor" color="white" />
              </span>
            )}
          </p>
          <p className={styles.stats}>
            <strong>{organisateur.events_count}</strong> événements ·{" "}
            <strong>★ {organisateur.rating}</strong>
          </p>
        </div>
      </div>
    </section>
  );
}