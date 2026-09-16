import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";

import {
  Eye, Edit3, MoreVertical, Calendar, MapPin, Users,
  Banknote, BarChart3, Copy, Trash2, XCircle, Send, Share2,
} from "lucide-react";
import {
  getStatusDisplay,
  getAvailableActions,
} from "../../../services/organizerService";
import { formatDate, formatPrice, formatCompactNumber } from "../../../utils/formatters";
import styles from "./OrganizerEventCard.module.css";
import ShareMenu from "../../ShareMenu/ShareMenu";


export default function OrganizerEventCard({ event, view = "grid", onAction }) {
  if (view === "list") {
    return <ListVariant event={event} onAction={onAction} />;
  }
  return <GridVariant event={event} onAction={onAction} />;
}


function GridVariant({ event, onAction }) {
  const status = getStatusDisplay(event.statut);
  const actions = getAvailableActions(event.statut);
  const fillRate = event.capacite_totale
    ? Math.round((event.inscriptions / event.capacite_totale) * 100)
    : 0;

  return (
    <div className={styles.card}>
      <div className={styles.cover}>
        {event.cover ? (
          <img src={event.cover} alt={event.titre} className={styles.coverImg} />
        ) : (
          <div className={styles.coverPlaceholder}>
            {event.categorie?.emoji || "📅"}
          </div>
        )}
        <div className={`${styles.statusBadge} ${styles[`status${capitalize(status.color)}`]}`}>
          <span className={styles.statusDot} />
          {status.label}
        </div>
      </div>

      <div className={styles.body}>
        <h3 className={styles.title}>{event.titre || "Sans titre"}</h3>
        <p className={styles.meta}>
          <span className={styles.metaIcon}><Calendar size={11} /></span>
          {event.date_evenement
            ? formatDate(event.date_evenement, { withTime: true })
            : "Date non définie"}
        </p>

        <div className={styles.miniStats}>
          <div className={styles.miniStat}>
            <p className={styles.miniStatValue}>{formatCompactNumber(event.vues || 0)}</p>
            <p className={styles.miniStatLabel}>Vues</p>
          </div>
          <div className={styles.miniStat}>
            <p className={styles.miniStatValue}>{event.inscriptions || 0}</p>
            <p className={styles.miniStatLabel}>Inscrits</p>
          </div>
          <div className={styles.miniStat}>
            <p className={styles.miniStatValue}>{fillRate}%</p>
            <p className={styles.miniStatLabel}>Rempli</p>
          </div>
        </div>

        <div className={styles.footer}>
          {actions.includes("view") && (
            <Link to={`/event/${event.id}`} className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}>
              <Eye size={12} />
              Voir
            </Link>
          )}
          {actions.includes("edit") && (
            <Link to={`/organizer/edit/${event.id}`} className={styles.actionBtn}>
              <Edit3 size={12} />
              Modifier
            </Link>
          )}
          {event.statut === "publie" && (
            <ShareMenu
              url={`${window.location.origin}/event/${event.id}`}
              text={`${event.titre} — ${event.ville || "Eventu"}`}
              trigger={
                <button className={styles.actionBtn} type="button" title="Partager">
                  <Share2 size={12} />
                  Partager
                </button>
              }
            />
          )}
          <ActionMenu actions={actions} event={event} onAction={onAction} />
        </div>
      </div>
    </div>
  );
}


function ListVariant({ event, onAction }) {
  const status = getStatusDisplay(event.statut);
  const actions = getAvailableActions(event.statut);

  return (
    <div className={styles.cardList}>
      <div className={styles.coverList}>
        {event.cover && <img src={event.cover} alt={event.titre} />}
      </div>

      <div className={styles.contentList}>
        <div className={styles.titleRowList}>
          <h3 className={styles.titleList}>{event.titre || "Sans titre"}</h3>
          <span
            className={`${styles.statusBadge} ${styles[`status${capitalize(status.color)}`]}`}
            style={{ position: "static" }}
          >
            <span className={styles.statusDot} />
            {status.label}
          </span>
        </div>

        <div className={styles.metaList}>
          <span className={styles.metaItem}>
            <Calendar size={11} />
            {event.date_evenement
              ? formatDate(event.date_evenement, { withTime: true })
              : "—"}
          </span>
          <span className={styles.metaItem}>
            <MapPin size={11} />
            {event.lieu ? `${event.lieu}, ${event.ville}` : "—"}
          </span>
        </div>

        <div className={styles.statsList}>
          <span>
            <Eye size={11} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />
            <strong>{formatCompactNumber(event.vues || 0)}</strong> vues
          </span>
          <span>
            <Users size={11} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />
            <strong>{event.inscriptions || 0}</strong> / {event.capacite_totale}
          </span>
          {event.revenue > 0 && (
            <span>
              <Banknote size={11} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />
              <strong>{formatPrice(event.revenue)}</strong>
            </span>
          )}
        </div>
      </div>

      <div className={styles.actionsList}>
        {actions.includes("view") && (
          <Link to={`/event/${event.id}`} className={styles.actionBtn}>
            <Eye size={12} />
            Voir
          </Link>
        )}
        {actions.includes("edit") && (
          <Link to={`/organizer/edit/${event.id}`} className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}>
            <Edit3 size={12} />
            Modifier
          </Link>
        )}
        {event.statut === "publie" && (
            <ShareMenu
              url={`${window.location.origin}/event/${event.id}`}
              text={`${event.titre} — ${event.ville || "Eventu"}`}
              trigger={
                <button className={styles.actionBtn} type="button" title="Partager">
                  <Share2 size={12} />
                  Partager
                </button>
              }
            />
          )}
        <ActionMenu actions={actions} event={event} onAction={onAction} />
      </div>
    </div>
  );
}

function ActionMenu({ actions, event, onAction }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const handleAction = (action) => {
    setOpen(false);
    onAction(action, event);
  };

  return (
    <div className={styles.menuWrapper} ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`${styles.actionBtn} ${styles.menuBtn}`}
        aria-label="Plus d'actions"
      >
        <MoreVertical size={14} />
      </button>

      {open && (
        <div className={styles.menu}>
          {actions.includes("publish") && (
            <button type="button" onClick={() => handleAction("publish")} className={styles.menuItem}>
              <Send size={13} />
              Publier
            </button>
          )}
          {actions.includes("stats") && (
            <button type="button" onClick={() => handleAction("stats")} className={styles.menuItem}>
              <BarChart3 size={13} />
              Statistiques
            </button>
          )}
          {actions.includes("duplicate") && (
            <button type="button" onClick={() => handleAction("duplicate")} className={styles.menuItem}>
              <Copy size={13} />
              Dupliquer
            </button>
          )}
          {actions.includes("cancel") && (
            <>
              <div className={styles.menuDivider} />
              <button
                type="button"
                onClick={() => handleAction("cancel")}
                className={`${styles.menuItem} ${styles.menuItemDanger}`}
              >
                <XCircle size={13} />
                Annuler l'événement
              </button>
            </>
          )}
          {actions.includes("delete") && (
            <>
              <div className={styles.menuDivider} />
              <button
                type="button"
                onClick={() => handleAction("delete")}
                className={`${styles.menuItem} ${styles.menuItemDanger}`}
              >
                <Trash2 size={13} />
                Supprimer
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : "";
}