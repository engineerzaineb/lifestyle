import { MapPin, Calendar } from "lucide-react";
import { getMapUrl, getCalendarUrl } from "../../../services/eventDisplayService";
import styles from "./EventLocation.module.css";


export default function EventLocation({ event }) {
  return (
    <section className={styles.section}>
      <h2 className={styles.title}>
        <em className={styles.titleEm}>Lieu</em> de l'événement
      </h2>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.info}>
            <p className={styles.lieu}>{event.lieu}</p>
            <p className={styles.address}>
              {event.adresse || `${event.ville}, Tunisie`}
            </p>
          </div>
          <a
            href={getMapUrl(event)}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.btn}
          >
            <MapPin size={12} />
            Voir sur Maps
          </a>
        </div>

        <div className={styles.btnsRow}>
          <a
            href={getCalendarUrl(event)}
            target="_blank"
            rel="noopener noreferrer"
            className={`${styles.btn} ${styles.calendarBtn}`}
          >
            <Calendar size={12} />
            Ajouter à mon calendrier
          </a>
        </div>
      </div>
    </section>
  );
}