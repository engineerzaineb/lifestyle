import { Plus } from "lucide-react";
import TicketEditor from "./TicketEditor";
import {
  createEmptyTicket,
  updateTicketField,
  getTotalCapacity,
  getMinPrice,
  hasBonPlan,
} from "../../services/ticketService";
import styles from "./TicketsManager.module.css";


export default function TicketsManager({
  tickets = [],
  onChange,
  errors = {},
  maxTickets = 5,
  required = true,
}) {
  // HANDLERS

  // Ajouter un nouveau billet vide
  const handleAdd = () => {
    if (tickets.length >= maxTickets) return;
    const newTicket = createEmptyTicket({
      nom: tickets.length === 0 ? "Standard" : "",
    });
    onChange([...tickets, newTicket]);
  };

  // Supprimer un billet à un index donné
  const handleRemove = (index) => {
    if (tickets.length <= 1) return; // Au moins 1 billet
    const updated = tickets.filter((_, i) => i !== index);
    onChange(updated);
  };

  // Modifier un champ d'un billet
  const handleFieldChange = (index, field, value) => {
    const updated = [...tickets];
    updated[index] = updateTicketField(updated[index], field, value);
    onChange(updated);
  };

  // CALCULS pour résumé (total places, prix min, bon plan...)
  const totalCapacity = getTotalCapacity(tickets);
  const minPrice = getMinPrice(tickets);
  const hasDeals = hasBonPlan(tickets);

  // RENDER
  return (
    <div className={styles.container}>
      {/* Header avec résumé */}
      <div className={styles.header}>
        <label className={styles.label}>
          Types de billets
          {required && <span className={styles.required}>*</span>}
        </label>

        {tickets.length > 0 && totalCapacity > 0 && (
          <p className={styles.summary}>
            <strong>{tickets.length}</strong> type{tickets.length > 1 ? "s" : ""} ·{" "}
            <strong>{totalCapacity}</strong> place{totalCapacity > 1 ? "s" : ""}
            {minPrice > 0 && (
              <> · dès <strong>{minPrice} DT</strong></>
            )}
            {minPrice === 0 && <> · <strong>Gratuit disponible</strong></>}
            {hasDeals && <> · <strong style={{ color: "var(--color-coral-text)" }}>Bon plan ✨</strong></>}
          </p>
        )}
      </div>

      {/* Erreur globale */}
      {errors._global && (
        <div className={styles.globalError}>{errors._global}</div>
      )}

      {/* Liste des billets */}
      <div className={styles.list}>
        {tickets.map((ticket, index) => (
          <TicketEditor
            key={index}
            index={index}
            ticket={ticket}
            errors={errors}
            onChange={(field, value) => handleFieldChange(index, field, value)}
            onRemove={() => handleRemove(index)}
            canRemove={tickets.length > 1}
          />
        ))}
      </div>

      {/* Bouton ajouter */}
      <button
        type="button"
        onClick={handleAdd}
        disabled={tickets.length >= maxTickets}
        className={styles.addBtn}
      >
        <Plus size={14} />
        Ajouter un type de billet
        {tickets.length >= maxTickets && ` (max ${maxTickets})`}
      </button>
    </div>
  );
}