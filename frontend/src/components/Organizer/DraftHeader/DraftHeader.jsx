import { Link } from "react-router-dom";
import { ArrowLeft, Plus, Info } from "lucide-react";
import styles from "./DraftHeader.module.css";


export default function DraftHeader({ count = 0 }) {
  return (
    <header className={styles.header}>
      <div className={styles.blob} />

      <div className={styles.inner}>
        <Link to="/organizer" className={styles.backLink}>
          <ArrowLeft size={14} />
          Retour à mes événements
        </Link>

        <div className={styles.top}>
          <div className={styles.titleBlock}>
            <h1 className={styles.title}>
              Mes <em className={styles.titleEm}>brouillons</em>
              {count > 0 && <span className={styles.count}>{count}</span>}
            </h1>
            <p className={styles.subtitle}>
              {count > 0
                ? `${count} événement${count > 1 ? "s" : ""} en cours de préparation`
                : "Vos événements en cours de préparation apparaîtront ici"}
            </p>
          </div>

          <Link to="/organizer/create" className={styles.createBtn}>
            <Plus size={16} />
            Nouveau brouillon
          </Link>
        </div>

        {count > 0 && (
          <div className={styles.infoBanner}>
            <span className={styles.infoIcon}>
              <Info size={14} />
            </span>
            Les brouillons sont privés. Publiez-les quand ils sont prêts pour validation par notre équipe.
          </div>
        )}
      </div>
    </header>
  );
}