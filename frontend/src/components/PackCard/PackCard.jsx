import { CheckCircle, Users, Calendar, Percent, Ticket, Gift } from "lucide-react";
import { PACK_OPTIONS, formatPrixPack } from "../../utils/packs";
import { formatDateHeure } from "../../utils/tracabilite";
import styles from "./PackCard.module.css";

/**
 * Carte d'un pack d'abonnement (liste admin et aperçu du formulaire).
 * @param {object} pack - pack tel que renvoyé par l'API
 * @param {ReactNode} actions - boutons affichés en haut à droite (optionnel)
 */
export default function PackCard({ pack, actions = null }) {
  const couleur = pack.couleur || "#4F46E5";
  const options = PACK_OPTIONS.filter((o) => pack[o.key]);
  const hasLimitesBilletterie =
    pack.max_types_billets != null || pack.max_billets_par_event != null;

  return (
    <div className={styles.card} style={{ borderTop: `4px solid ${couleur}` }}>
      <div className={styles.cardTop}>
        <div>
          <p className={styles.cardName}>
            {pack.nom || "Nom du pack"}
            {pack.etiquette && (
              <span className={styles.etiquette} style={{ background: couleur }}>
                {pack.etiquette}
              </span>
            )}
          </p>
          <p className={styles.cardPrice} style={{ color: couleur }}>
            {pack.prix_barre && (
              <span className={styles.prixBarre}>{Number(pack.prix_barre)} DT</span>
            )}
            {formatPrixPack(pack)}
          </p>
        </div>
        {actions && <div className={styles.cardActions}>{actions}</div>}
      </div>

      {pack.description && <p className={styles.cardDesc}>{pack.description}</p>}

      <div className={styles.cardStats}>
        <span>
          <Calendar size={12} />
          {pack.limite_evenements == null
            ? "Événements illimités"
            : `${pack.limite_evenements} événement${pack.limite_evenements > 1 ? "s" : ""} actif${pack.limite_evenements > 1 ? "s" : ""}`}
        </span>
        <span>
          <Percent size={12} /> Commission {Number(pack.commission_pct)} %
        </span>
        {pack.nb_abonnes !== undefined && (
          <span className={styles.cardCount}>
            <Users size={12} /> {pack.nb_abonnes} abonné{pack.nb_abonnes > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {(hasLimitesBilletterie || pack.essai_jours > 0) && (
        <div className={styles.cardStats}>
          {hasLimitesBilletterie && (
            <span>
              <Ticket size={12} />
              {pack.max_billets_par_event != null
                ? `${pack.max_billets_par_event} billets max`
                : "Billets illimités"}
              {pack.max_types_billets != null &&
                ` · ${pack.max_types_billets} type${pack.max_types_billets > 1 ? "s" : ""} max`}
            </span>
          )}
          {pack.essai_jours > 0 && (
            <span><Gift size={12} /> Essai {pack.essai_jours} j</span>
          )}
        </div>
      )}

      {options.length > 0 && (
        <div className={styles.optionChips}>
          {options.map((o) => (
            <span key={o.key} className={styles.optionChip}>
              {o.key === "mise_en_avant" && pack.mises_en_avant_mois > 0
                ? `${o.label} (${pack.mises_en_avant_mois}/mois)`
                : o.label}
            </span>
          ))}
        </div>
      )}

      {pack.avantages_liste?.length > 0 && (
        <ul className={styles.avantages}>
          {pack.avantages_liste.map((a, i) => (
            <li key={i}>
              <CheckCircle size={12} /> {a}
            </li>
          ))}
        </ul>
      )}

      {pack.created_at && (
        <p className={styles.dates}>
          Créé le {formatDateHeure(pack.created_at)}
          {pack.updated_at && pack.updated_at !== pack.created_at &&
            ` · modifié le ${formatDateHeure(pack.updated_at)}`}
        </p>
      )}
    </div>
  );
}
