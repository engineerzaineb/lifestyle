import { Zap, Trash2, Tag, Users } from "lucide-react";
import Input from "../../components/iu/Input/Input";
import styles from "./TicketsManager.module.css";


export default function TicketEditor({
  ticket,
  index,
  errors = {},
  onChange,
  onRemove,
  canRemove = true,
}) {
  const prefix = `billet_${index}`;

  return (
    <div className={styles.ticket}>
      {/* Header avec badge + bouton supprimer */}
      <div className={styles.ticketHeader}>
        <div className={styles.ticketBadges}>
          <span className={styles.ticketBadge}>Billet {index + 1}</span>
          {ticket.is_bon_plan && ticket.pourcentage_reduction > 0 && (
            <span className={styles.dealBadge}>
              <Zap size={10} fill="currentColor" />
              -{ticket.pourcentage_reduction}%
            </span>
          )}
        </div>

        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className={styles.removeBtn}
            aria-label="Supprimer ce billet"
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>

      {/* Champs Nom / Prix / Capacité */}
      <div className={styles.fields}>
        <Input
          label="Nom"
          required
          icon={Tag}
          value={ticket.nom}
          onChange={(v) => onChange("nom", v)}
          placeholder="Standard, VIP..."
          error={errors[`${prefix}_nom`]}
        />
        <Input
          label="Prix (DT)"
          required
          type="number"
          value={ticket.prix}
          onChange={(v) => onChange("prix", v)}
          placeholder="0 = gratuit"
          error={errors[`${prefix}_prix`]}
          min={0}
          step="0.5"
        />
        <Input
          label="Capacité"
          required
          type="number"
          icon={Users}
          value={ticket.capacite}
          onChange={(v) => onChange("capacite", v)}
          placeholder="50"
          error={errors[`${prefix}_capacite`]}
          min={1}
        />
      </div>

      {/* Toggle bon plan */}
      <button
        type="button"
        onClick={() => onChange("is_bon_plan", !ticket.is_bon_plan)}
        className={`${styles.dealToggle} ${ticket.is_bon_plan ? styles.active : ""}`}
      >
        <span className={`${styles.toggleSwitch} ${ticket.is_bon_plan ? styles.on : ""}`}>
          <span className={styles.toggleDot} />
        </span>
        <Zap size={13} />
        <span className={styles.dealText}>
          Marquer comme bon plan (prix d'origine barré)
        </span>
      </button>

      {/* Zone extra : prix original + % calculé */}
      {ticket.is_bon_plan && (
        <div className={styles.dealExtra}>
          <Input
            label="Prix d'origine (DT)"
            required
            type="number"
            value={ticket.prix_original}
            onChange={(v) => onChange("prix_original", v)}
            placeholder="Prix avant réduction"
            error={errors[`${prefix}_prix_original`]}
            hint="Doit être supérieur au prix actuel"
            min={0}
            step="0.5"
          />

          {ticket.pourcentage_reduction > 0 && (
            <div className={styles.dealCalc}>
              <span className={styles.dealCalcLabel}>Réduction calculée</span>
              <span className={styles.dealCalcValue}>
                -{ticket.pourcentage_reduction}%
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}