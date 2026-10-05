import {
  Ticket, ShieldCheck, Zap, Minus, Plus
} from "lucide-react";
import {
  getTotalQuantity,
  calculateTotal,
  calculateSavings,
} from "../../../services/bookingService";
import { getFillPercentage, getEventDisplayStatus } from "../../../services/eventDisplayService";
import { formatPrice } from "../../../utils/formatters";
import styles from "./BookingCard.module.css";


export default function BookingCard({ event, selection, onQtyChange, onBook }) {
  const totalQty = getTotalQuantity(selection);
  const total = calculateTotal(selection, event.types_billets);
  const savings = calculateSavings(selection, event.types_billets);
  const fillPercent = getFillPercentage(event);
  const isSoldout = getEventDisplayStatus(event) === "soldout";

  // Texte du bouton selon le contexte
  const getBtnLabel = () => {
    if (isSoldout) return "Événement complet";
    if (event.prix_min === 0 && totalQty === 0) return "S'inscrire gratuitement";
    if (totalQty === 0) return "Sélectionnez vos billets";
    return "Réserver maintenant";
  };

  const isBtnDisabled = isSoldout || (totalQty === 0 && event.prix_min !== 0);

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        {/* Prix de départ */}
        <PriceSection event={event} fillPercent={fillPercent} />

        {/* Liste des types de billets */}
        <p className={styles.ticketsTitle}>
          <Ticket size={11} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />
          Choisissez vos billets
        </p>

        {event.types_billets?.map((ticket) => (
          <TicketRow
            key={ticket.id || ticket.nom}
            ticket={ticket}
            qty={selection[ticket.id || ticket.nom] || 0}
            onQtyChange={(delta) => onQtyChange(ticket.id || ticket.nom, delta)}
          />
        ))}

        {/* Total */}
        {totalQty > 0 && (
          <div className={styles.total}>
            <div>
              <p className={styles.totalLabel}>
                Total ({totalQty} billet{totalQty > 1 ? "s" : ""})
              </p>
              {savings > 0 && (
                <p className={styles.savings}>
                  Vous économisez {savings} DT 🎉
                </p>
              )}
            </div>
            <p className={styles.totalValue}>{formatPrice(total)}</p>
          </div>
        )}

        {/* Bouton réserver */}
        <button
          type="button"
          onClick={onBook}
          disabled={isBtnDisabled}
          className={styles.bookBtn}
        >
          <Ticket size={16} />
          {getBtnLabel()}
        </button>

        {/* Note rassurante */}
        <p className={styles.note}>
          <ShieldCheck size={11} className={styles.noteIcon} />
          {" "}Paiement sécurisé · Annulation gratuite jusqu'à 48h avant
        </p>
      </div>
    </div>
  );
}


function PriceSection({ event, fillPercent }) {
  return (
    <div className={styles.priceSection}>
      <p className={styles.priceFrom}>À partir de</p>
      <p className={`${styles.priceValue} ${event.prix_min === 0 ? styles.priceGratuit : ""}`}>
        {event.prix_min === 0 ? "Gratuit" : `${event.prix_min} DT`}
        {event.has_bon_plan && event.prix_original && (
          <span className={styles.priceOriginal}>{event.prix_original} DT</span>
        )}
      </p>
      {event.has_bon_plan && (
        <span className={styles.priceDeal}>
          <Zap size={11} fill="currentColor" />
          Économisez {event.reduction_max}%
        </span>
      )}

      <div className={styles.fillBar}>
        <div className={styles.fillTrack}>
          <div
            className={styles.fillFill}
            style={{ width: `${fillPercent}%` }}
          />
        </div>
        <p className={styles.fillText}>{fillPercent}% rempli</p>
      </div>
    </div>
  );
}


function TicketRow({ ticket, qty, onQtyChange }) {
  const soldout = ticket.places_restantes === 0;
  const maxQty = Math.min(ticket.places_restantes, 10);

  return (
    <div className={`${styles.ticketRow} ${soldout ? styles.ticketSoldout : ""}`}>
      <div className={styles.ticketHeader}>
        <div className={styles.ticketInfo}>
          <p className={styles.ticketName}>
            {ticket.nom}
            {ticket.is_bon_plan && (
              <Zap size={11} color="var(--color-coral)" fill="currentColor" />
            )}
          </p>
          <p className={styles.ticketSubtitle}>
            {ticket.places_restantes} places restantes
          </p>
        </div>
        <div className={`${styles.ticketPrice} ${ticket.prix === 0 ? styles.ticketGratuit : ""}`}>
          {ticket.prix === 0 ? "Gratuit" : `${ticket.prix} DT`}
          {ticket.is_bon_plan && ticket.prix_original && (
            <span className={styles.ticketPriceOriginal}>
              {ticket.prix_original} DT
            </span>
          )}
        </div>
      </div>

      <div className={styles.qtySelector}>
        {soldout ? (
          <span className={styles.qtySoldout}>Complet</span>
        ) : (
          <>
            <span className={styles.qtyLabel}>Quantité</span>
            <div className={styles.qtyControls}>
              <button
                type="button"
                onClick={() => onQtyChange(-1)}
                disabled={qty === 0}
                className={styles.qtyBtn}
                aria-label="Diminuer"
              >
                <Minus size={14} />
              </button>
              <span className={styles.qtyValue}>{qty}</span>
              <button
                type="button"
                onClick={() => onQtyChange(1)}
                disabled={qty >= maxQty}
                className={styles.qtyBtn}
                aria-label="Augmenter"
              >
                <Plus size={14} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}