import { Link } from "react-router-dom";
import styles from "./EventDescription.module.css";


export default function EventDescription({ event }) {
  return (
    <section className={styles.section}>
      <h2 className={styles.title}>
        À propos de <em className={styles.titleEm}>l'événement</em>
      </h2>
      <p className={styles.text}>{event.description}</p>

      {event.tags && event.tags.length > 0 && (
        <div className={styles.tagsList}>
          {event.tags.map((tag) => (
            <Link key={tag} to={`/search?tag=${tag}`} className={styles.tag}>
              #{tag}
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}