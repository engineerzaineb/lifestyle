import { useState, useEffect } from "react";
import { X, Save } from "lucide-react";
import { updateMyInterets } from "../../services/interetService";
import InterestsPicker from "../InterestsPicker/InterestsPicker";
import styles from "./EditInterestsModal.module.css";

// Modal pour modifier les centres d'intérêt du user
export default function EditInterestsModal({ currentInterets = [], onClose, onSaved }) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [customInterets, setCustomInterets] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  // Pré-remplit le modal avec les intérêts actuels du user
  useEffect(() => {
    const officialIds = currentInterets.filter((i) => i.is_official).map((i) => i.id);
    const customs = currentInterets.filter((i) => !i.is_official).map((i) => i.nom);
    setSelectedIds(officialIds);
    setCustomInterets(customs);
  }, [currentInterets]);

  // Callback du InterestsPicker
  const handleChange = ({ selectedIds: ids, customInterets: customs }) => {
    setSelectedIds(ids);
    setCustomInterets(customs);
  };

  // Sauvegarde les intérêts au backend
  const handleSave = async () => {
    setError(null);
    setIsSaving(true);

    try {
      const updatedUser = await updateMyInterets({
        interet_ids: selectedIds,
        custom_interets: customInterets,
      });
      onSaved(updatedUser);
      onClose();
    } catch (err) {
      console.error("Erreur sauvegarde intérêts :", err);
      setError("Une erreur est survenue. Réessayez.");
      setIsSaving(false);
    }
  };

  const total = selectedIds.length + customInterets.length;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.titleBlock}>
            <h2 className={styles.title}>
              Mes <span className={styles.titleEm}>centres d'intérêt</span>
            </h2>
            <p className={styles.subtitle}>
              Ajoutez ou retirez des catégories pour affiner vos recommandations.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={styles.closeBtn}
            aria-label="Fermer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Erreur */}
        {error && <div className={styles.errorMsg}>{error}</div>}

        {/* Sélecteur d'intérêts */}
        <div className={styles.content}>
          <InterestsPicker
            selectedIds={selectedIds}
            customInterets={customInterets}
            onChange={handleChange}
          />
        </div>

        {/* Boutons */}
        <div className={styles.footer}>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className={styles.btnCancel}
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || total === 0}
            className={styles.btnSave}
          >
            {isSaving ? (
              <>
                <span className={styles.spinner} />
                Sauvegarde...
              </>
            ) : (
              <>
                <Save size={14} />
                Enregistrer
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}