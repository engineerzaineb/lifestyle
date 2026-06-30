import { X } from "lucide-react";
import { SORT_OPTIONS } from "../../../services/searchService";
import { CATEGORIES } from "../../../utils/constants";
import styles from "./SearchSortBar.module.css";


export default function SearchSortBar({
  count,
  filters,
  sort,
  onSortChange,
  onRemoveFilter,
}) {
  // Liste des chips actives à afficher
  const chips = buildActiveChips(filters);

  return (
    <>
      <div className={styles.bar}>
        <p className={styles.count}>
          <strong>{count}</strong>
          résultat{count !== 1 ? "s" : ""}
        </p>

        <div className={styles.sortWrapper}>
          <span className={styles.sortLabel}>Trier par :</span>
          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value)}
            className={styles.sortSelect}
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Chips des filtres actifs */}
      {chips.length > 0 && (
        <div className={styles.activeChips}>
          {chips.map((chip) => (
            <span key={chip.field} className={styles.chip}>
              {chip.label}
              <button
                type="button"
                onClick={() => onRemoveFilter(chip.field)}
                className={styles.chipClose}
                aria-label={`Retirer ${chip.label}`}
              >
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}
    </>
  );
}


function buildActiveChips(filters) {
  const chips = [];

  if (filters.categorie_slug) {
    const cat = CATEGORIES[filters.categorie_slug];
    chips.push({
      field: "categorie_slug",
      label: cat ? `${cat.emoji} ${cat.nom}` : filters.categorie_slug,
    });
  }

  if (filters.ville) {
    chips.push({ field: "ville", label: `📍 ${filters.ville}` });
  }

  if (filters.bon_plan) {
    chips.push({ field: "bon_plan", label: "⚡ Bons plans" });
  }

  if (filters.prix_min || filters.prix_max) {
    const min = filters.prix_min || "0";
    const max = filters.prix_max || "∞";
    chips.push({ field: "prix", label: `${min} - ${max} DT` });
  }

  if (filters.date) {
    const labels = { today: "Aujourd'hui", weekend: "Ce week-end", month: "Ce mois-ci" };
    chips.push({ field: "date", label: labels[filters.date] || filters.date });
  }

  if (filters.tag) {
    chips.push({ field: "tag", label: `#${filters.tag}` });
  }

  return chips;
}