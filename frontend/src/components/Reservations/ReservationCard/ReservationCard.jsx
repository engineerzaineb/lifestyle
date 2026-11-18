import { Link } from "react-router-dom";
import {
  Calendar, MapPin, Hash, Eye, Download, XCircle, Ticket, CreditCard, Clock
} from "lucide-react";
import {
  getReservationStatus,
  getReservationStatusDisplay,
  canCancelReservation,
} from "../../../services/reservationService";
import { formatDate, formatPrice, timeAgo } from "../../../utils/formatters";
import styles from "./ReservationCard.module.css";


export default function ReservationCard({ reservation, onAction }) {
  const status = getReservationStatus(reservation);
  const statusDisplay = getReservationStatusDisplay(status);
  const canCancel = canCancelReservation(reservation);
  const isCancelled = status === "cancelled";
  const isPending = status === "pending";
  const isConfirmed = reservation.statut === "confirmee";
  const rembourse = reservation.paiement?.statut === "rembourse";
  const lienPaiement = reservation.paiement?.url;

  return (
    <div className={`${styles.card} ${isCancelled ? styles.cancelled : ""}`}>
      {/* Cover */}
      <div className={styles.cover}>
        {reservation.event.cover && (
          <img
            src={reservation.event.cover}
            alt={reservation.event.titre}
            className={styles.coverImg}
          />
        )}
        <div className={`${styles.statusBadge} ${styles[`status${capitalize(statusDisplay.color)}`]}`}>
          <span className={styles.statusDot} />
          {statusDisplay.label}
        </div>
      </div>

      {/* Contenu */}
      <div className={styles.content}>
        {/* Header : titre + total */}
        <div className={styles.header}>
          <div className={styles.titleBlock}>
            <h3 className={styles.title}>{reservation.event.titre}</h3>
            <p className={styles.code}>
              <Hash size={11} />
              {reservation.code}
            </p>
          </div>
          <div className={styles.totalBlock}>
            <p className={styles.totalLabel}>
              {rembourse ? "Remboursé" : isPending ? "À payer" : "Total"}
            </p>
            <p className={`${styles.totalValue} ${reservation.total === 0 ? styles.totalGratuit : ""}`}>
              {reservation.total === 0 ? "Gratuit" : formatPrice(reservation.total)}
            </p>
          </div>
        </div>

        {/* Métadonnées */}
        <div className={styles.metaList}>
          <span className={styles.metaItem}>
            <span className={styles.metaIcon}><Calendar size={11} /></span>
            {formatDate(reservation.event.date_evenement, { withTime: true })}
          </span>
          <span className={styles.metaItem}>
            <span className={styles.metaIcon}><MapPin size={11} /></span>
            {reservation.event.lieu}, {reservation.event.ville}
          </span>
        </div>

        {/* Billets */}
        <div className={styles.tickets}>
          {reservation.items?.map((item, i) => (
            <span key={i} className={styles.ticket}>
              <Ticket size={11} />
              {item.type_billet_nom}
              <span className={styles.ticketQty}>×{item.quantity}</span>
            </span>
          ))}
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          <Link to={`/event/${reservation.event.id}`} className={styles.btnSecondary}>
            <Eye size={12} />
            Voir l'événement
          </Link>

          {isPending && lienPaiement && (
            <button
              type="button"
              onClick={() => onAction("payer", reservation)}
              className={styles.btnPrimary}
            >
              <CreditCard size={12} />
              Payer maintenant
            </button>
          )}

          {isConfirmed && (
            <button
              type="button"
              onClick={() => onAction("download", reservation)}
              className={styles.btnPrimary}
            >
              <Download size={12} />
              Télécharger billets
            </button>
          )}

          {canCancel && (
            <button
              type="button"
              onClick={() => onAction("cancel", reservation)}
              className={styles.btnDanger}
              title="Annuler cette réservation"
            >
              <XCircle size={12} />
              Annuler
            </button>
          )}

          {isPending && reservation.expire_le && (
            <span className={styles.cancelInfo}>
              <Clock size={11} /> Places gardées jusqu'à{" "}
              {new Date(reservation.expire_le).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}

          {isCancelled && reservation.cancelled_at && (
            <span className={styles.cancelInfo}>
              Annulée {timeAgo(reservation.cancelled_at)}
              {rembourse && " · remboursée"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : "";
}