import { Link } from "react-router-dom";
import { ArrowLeft, Heart, Share2, Sparkles, Zap } from "lucide-react";
import { getCategoryInfo } from "../../../services/eventDisplayService";
import styles from "./EventHero.module.css";
import ShareMenu from "../../ShareMenu/ShareMenu";


export default function EventHero({
  event,
  favorite = false,
  onFavorite,
  onShare,
  backTo = "/",
}) {
  const categoryInfo = getCategoryInfo(event);

  return (
    <div className={styles.hero}>
      {event.cover && (
        <img src={event.cover} alt={event.titre} className={styles.img} />
      )}
      <div className={styles.overlay} />

      {/* Barre du haut */}
      <div className={styles.topBar}>
        <Link to={backTo} className={styles.iconBtn}>
          <ArrowLeft size={14} />
          Retour
        </Link>
        <div className={styles.actions}>
          <button
            onClick={onFavorite}
            className={`${styles.iconBtn} ${styles.iconBtnSolo}`}
            aria-label="Ajouter aux favoris"
            title="Favori"
          >
            <Heart
              size={16}
              fill={favorite ? "var(--color-pink)" : "none"}
              color={favorite ? "var(--color-pink)" : "currentColor"}
            />
          </button>
          {event.statut === "publie" && (
            <ShareMenu
              url={`${window.location.origin}/event/${event.id}`}
              text={`${event.titre} — ${event.ville || "Eventu"}`}
              trigger={
                <button
                  className={`${styles.iconBtn} ${styles.iconBtnSolo}`}
                  aria-label="Partager"
                  title="Partager"
                >
                  <Share2 size={16} />
                </button>
              }
            />
          )}
        </div>
      </div>

      {/* Titre + badges */}
      <div className={styles.content}>
        <div className={styles.contentInner}>
          <div className={styles.badges}>
            <span className={styles.badge}>
              {categoryInfo.emoji} {categoryInfo.nom}
            </span>
            {event.hot && (
              <span className={`${styles.badge} ${styles.badgeHot}`}>
                <Sparkles size={11} />
                Très demandé
              </span>
            )}
            {event.has_bon_plan && (
              <span className={`${styles.badge} ${styles.badgeDeal}`}>
                <Zap size={11} fill="currentColor" />
                -{event.reduction_max}%
              </span>
            )}
          </div>
          <h1 className={styles.title}>{event.titre}</h1>
        </div>
      </div>
    </div>
  );
}