import { Link } from "react-router-dom";
import { FileText, Plus, Lightbulb, Save, Clock } from "lucide-react";
import styles from "./DraftsEmptyState.module.css";


export default function DraftsEmptyState() {
  return (
    <div className={styles.empty}>
      <div className={styles.iconWrapper}>
        <FileText size={36} />
      </div>

      <h2 className={styles.title}>
        Aucun <em className={styles.titleEm}>brouillon</em>
      </h2>
      <p className={styles.desc}>
        Vous n'avez pas encore de brouillon. Commencez à créer un événement et
        sauvegardez-le en brouillon pour le finaliser plus tard.
      </p>

      <Link to="/organizer/create" className={styles.btn}>
        <Plus size={14} />
        Créer mon premier événement
      </Link>

      {/* Conseils */}
      <div className={styles.tips}>
        <div className={styles.tip}>
          <span className={styles.tipIcon}>
            <Save size={14} />
          </span>
          <p className={styles.tipTitle}>Sauvegardez à tout moment</p>
          <p className={styles.tipDesc}>
            Pas besoin de tout remplir d'un coup. Vous pouvez revenir plus tard.
          </p>
        </div>
        <div className={styles.tip}>
          <span className={styles.tipIcon}>
            <Clock size={14} />
          </span>
          <p className={styles.tipTitle}>Modifiez quand vous voulez</p>
          <p className={styles.tipDesc}>
            Vos brouillons restent privés jusqu'à publication.
          </p>
        </div>
        <div className={styles.tip}>
          <span className={styles.tipIcon}>
            <Lightbulb size={14} />
          </span>
          <p className={styles.tipTitle}>Astuce</p>
          <p className={styles.tipDesc}>
            Publiez quand votre événement est à 100% pour valider rapidement.
          </p>
        </div>
      </div>
    </div>
  );
}