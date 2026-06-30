import { Link } from "react-router-dom";
import {
  Calendar, MapPin, Tag, Users, Edit3, Send,
  Copy, Trash2, Clock, 
} from "lucide-react";
import { formatDate, timeAgo } from "../../../utils/formatters";
import styles from "./DraftCard.module.css";


export default function DraftCard({ event, onAction }) {
  // Calcule la complétude du brouillon 
  const completion = calculateCompletion(event);
  const isReadyToPublish = completion === 100;

  return (
    <div className={styles.card}>
      {/* Cover */}
      <div className={styles.cover}>
        {event.cover ? (
          <img src={event.cover} alt={event.titre || "Brouillon"} className={styles.coverImg} />
        ) : (
          <span className={styles.coverPlaceholder}>
            {event.categorie?.emoji || "📝"}
          </span>
        )}
        <div className={styles.statusBadge}>
          <span className={styles.statusDot} />
          Brouillon
        </div>
      </div>

      {/* Contenu */}
      <div className={styles.content}>
        <h3 className={`${styles.title} ${!event.titre ? styles.titleEmpty : ""}`}>
          {event.titre || "Sans titre"}
        </h3>

        <p className={`${styles.description} ${!event.description ? styles.descriptionEmpty : ""}`}>
          {event.description || "Aucune description"}
        </p>

        {/* Métadonnées */}
        <div className={styles.metaList}>
          {event.date_evenement ? (
            <span className={styles.metaItem}>
              <span className={styles.metaIcon}><Calendar size={11} /></span>
              {formatDate(event.date_evenement, { withTime: true })}
            </span>
          ) : (
            <span className={`${styles.metaItem} ${styles.metaEmpty}`}>
              <span className={styles.metaIcon}><Calendar size={11} /></span>
              Date non définie
            </span>
          )}

          {event.lieu ? (
            <span className={styles.metaItem}>
              <span className={styles.metaIcon}><MapPin size={11} /></span>
              {event.lieu}, {event.ville}
            </span>
          ) : (
            <span className={`${styles.metaItem} ${styles.metaEmpty}`}>
              <span className={styles.metaIcon}><MapPin size={11} /></span>
              Lieu non défini
            </span>
          )}

          {event.categorie?.nom && (
            <span className={styles.metaItem}>
              <span className={styles.metaIcon}><Tag size={11} /></span>
              {event.categorie.nom}
            </span>
          )}

          {event.capacite_totale > 0 && (
            <span className={styles.metaItem}>
              <span className={styles.metaIcon}><Users size={11} /></span>
              {event.capacite_totale} places
            </span>
          )}

          <span className={styles.metaItem}>
            <span className={styles.metaIcon}><Clock size={11} /></span>
            Modifié {timeAgo(event.created_at)}
          </span>
        </div>

        {/* Barre de complétude */}
        <div className={styles.completion}>
          <div className={styles.completionHeader}>
            <span className={styles.completionLabel}>Complétude</span>
            <span className={styles.completionPercent}>{completion}%</span>
          </div>
          <div className={styles.completionTrack}>
            <div
              className={styles.completionFill}
              style={{ width: `${completion}%` }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          <Link to={`/organizer/edit/${event.id}`} className={styles.btnPrimary}>
            <Edit3 size={12} />
            Continuer
          </Link>

          <button
            type="button"
            onClick={() => onAction("publish", event)}
            disabled={!isReadyToPublish}
            className={styles.btnPublish}
            title={!isReadyToPublish ? "Complétez le brouillon avant de publier" : "Publier l'événement"}
          >
            <Send size={12} />
            Publier
          </button>

          <button
            type="button"
            onClick={() => onAction("duplicate", event)}
            className={styles.btnSecondary}
            title="Dupliquer"
          >
            <Copy size={12} />
            Dupliquer
          </button>

          <button
            type="button"
            onClick={() => onAction("delete", event)}
            className={styles.btnDanger}
            title="Supprimer"
            aria-label="Supprimer"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}


function calculateCompletion(event) {
  let filled = 0;
  const total = 5;

  if (event.titre && event.titre.trim().length > 0) filled++;
  if (event.description && event.description.trim().length > 20) filled++;
  if (event.date_evenement) filled++;
  if (event.lieu && event.ville) filled++;
  if (event.capacite_totale > 0 && event.types_billets?.length > 0) filled++;

  return Math.round((filled / total) * 100);
}