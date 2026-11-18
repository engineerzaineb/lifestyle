import { MapPin, LocateFixed, Loader2 } from "lucide-react";
import { VILLES_TUNISIE } from "../../utils/constants";
import { useVilleDepuisPosition } from "../../hooks/useVilleDepuisPosition";
import styles from "./VilleSelector.module.css";

/**
 * VilleSelector — choix de la ville dans la liste, ou bouton facultatif
 * « Utiliser ma position » qui sélectionne la ville la plus proche.
 * La position n'est demandée qu'au clic sur ce bouton.
 *
 * Props :
 *  - value     : ville actuelle ("" si aucune)
 *  - onChange  : (ville, position|null) => void   position = { ville, distance, latitude, longitude }
 *  - onErreur  : (message) => void                 position refusée, hors Tunisie…
 *  - label     : texte affiché avant la liste
 *  - disabled  : pendant un enregistrement
 */
export default function VilleSelector({
  value = "", onChange, onErreur, label = "Votre ville", disabled = false,
}) {
  const { localiser, enCours } = useVilleDepuisPosition();

  const utiliserPosition = async () => {
    try {
      const resultat = await localiser();
      onChange?.(resultat.ville, resultat);
    } catch (err) {
      onErreur?.(err.message);
    }
  };

  return (
    <div className={styles.wrapper}>
      <label className={styles.label}>
        <MapPin size={15} />
        <span>{label}</span>
        <select
          className={styles.select}
          value={value || ""}
          onChange={(e) => onChange?.(e.target.value, null)}
          disabled={disabled || enCours}
          aria-label="Choisir votre ville"
        >
          <option value="">Choisir une ville</option>
          {VILLES_TUNISIE.map((v) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
      </label>
      <button
        type="button"
        className={styles.positionBtn}
        onClick={utiliserPosition}
        disabled={disabled || enCours}
        title="Trouve la ville la plus proche de vous, sans service externe"
      >
        {enCours
          ? <><Loader2 size={14} className={styles.spin} /> Localisation…</>
          : <><LocateFixed size={14} /> Utiliser ma position</>}
      </button>
    </div>
  );
}
