import { useState, useEffect } from "react";
import { X, Plus } from "lucide-react";
import { fetchInterets } from "../../services/interetService";
import styles from "./InterestsPicker.module.css";

/**
 * InterestsPicker - Sélecteur de centres d'intérêt
 *
 * Props:
 * - selectedIds: number[] - IDs des intérêts officiels sélectionnés
 * - customInterets: string[] - Liste des intérêts personnalisés
 * - onChange: ({ selectedIds, customInterets }) => void
 */
export default function InterestsPicker({
  selectedIds = [],
  customInterets = [],
  onChange,
}) {
  const [interets, setInterets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [customInput, setCustomInput] = useState("");

  // Charge les intérêts officiels au montage
  useEffect(() => {
    fetchInterets()
      .then((data) => {
        setInterets(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Erreur chargement intérêts :", err);
        setError("Impossible de charger les centres d'intérêt");
        setIsLoading(false);
      });
  }, []);

  // Toggle d'un intérêt officiel
  const toggleInteret = (id) => {
    const newSelectedIds = selectedIds.includes(id)
      ? selectedIds.filter((i) => i !== id)
      : [...selectedIds, id];

    onChange({ selectedIds: newSelectedIds, customInterets });
  };

  // Ajouter un intérêt personnalisé
  const addCustomInteret = () => {
    const trimmed = customInput.trim();
    if (!trimmed) return;
    if (customInterets.includes(trimmed)) return;
    if (customInterets.length >= 5) return;

    onChange({
      selectedIds,
      customInterets: [...customInterets, trimmed],
    });
    setCustomInput("");
  };

  // Supprimer un intérêt personnalisé
  const removeCustomInteret = (nom) => {
    onChange({
      selectedIds,
      customInterets: customInterets.filter((c) => c !== nom),
    });
  };

  // Submit du champ custom à l'appui sur Entrée
  const handleCustomKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addCustomInteret();
    }
  };

  const totalSelected = selectedIds.length + customInterets.length;

  if (isLoading) {
    return <div className={styles.loading}>Chargement des centres d'intérêt...</div>;
  }

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  return (
    <div className={styles.container}>
      {/* Compteur */}
      <div className={styles.counter}>
        <span className={styles.counterText}>Sélectionnés</span>
        <span className={styles.counterValue}>
          {totalSelected} {totalSelected > 1 ? "intérêts" : "intérêt"}
        </span>
      </div>

      {/* Grille des intérêts officiels */}
      <div className={styles.grid}>
        {interets.map((interet) => {
          const isSelected = selectedIds.includes(interet.id);
          return (
            <button
              key={interet.id}
              type="button"
              onClick={() => toggleInteret(interet.id)}
              className={`${styles.chip} ${isSelected ? styles.selected : ""}`}
            >
              <span className={styles.chipIcon}>{interet.icone}</span>
              <span className={styles.chipLabel}>{interet.nom}</span>
            </button>
          );
        })}
      </div>

      {/* Section "Ajouter un autre intérêt" */}
      <div className={styles.customSection}>
        <p className={styles.customTitle}>
          Vous avez d'autres centres d'intérêt ?
        </p>
        <div className={styles.customInputWrapper}>
          <input
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={handleCustomKeyDown}
            placeholder="Ex: Surf, Calligraphie arabe..."
            maxLength={40}
            className={styles.customInput}
          />
          <button
            type="button"
            onClick={addCustomInteret}
            disabled={!customInput.trim() || customInterets.length >= 5}
            className={styles.customBtn}
          >
            <Plus size={14} style={{ verticalAlign: "middle", marginRight: 4 }} />
            Ajouter
          </button>
        </div>

        {/* Liste des intérêts custom */}
        {customInterets.length > 0 && (
          <div className={styles.customList}>
            {customInterets.map((nom) => (
              <span key={nom} className={styles.customChip}>
                {nom}
                <button
                  type="button"
                  onClick={() => removeCustomInteret(nom)}
                  className={styles.customChipRemove}
                  aria-label={`Retirer ${nom}`}
                >
                  <X size={10} strokeWidth={3} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}