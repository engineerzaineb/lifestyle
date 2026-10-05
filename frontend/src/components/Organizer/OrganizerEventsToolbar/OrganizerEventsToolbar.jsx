import { Search, X, LayoutGrid, List } from "lucide-react";
import { ORGANIZER_SORT_OPTIONS } from "../../../services/organizerService";
import styles from "./OrganizerEventsToolbar.module.css";


export default function OrganizerEventsToolbar({
  query,
  onQueryChange,
  sort,
  onSortChange,
  view,
  onViewChange,
}) {
  return (
    <div className={styles.toolbar}>
      {/* Recherche */}
      <div className={styles.searchWrapper}>
        <span className={styles.searchIcon}>
          <Search size={15} />
        </span>
        <input
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Rechercher un événement..."
          className={styles.searchInput}
        />
        {query && (
          <button
            type="button"
            onClick={() => onQueryChange("")}
            className={styles.clearBtn}
            aria-label="Effacer"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Tri + Vue */}
      <div className={styles.controls}>
        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value)}
          className={styles.sortSelect}
        >
          {ORGANIZER_SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <div className={styles.viewToggle}>
          <button
            type="button"
            onClick={() => onViewChange("grid")}
            className={`${styles.viewBtn} ${view === "grid" ? styles.active : ""}`}
            aria-label="Vue grille"
            title="Vue grille"
          >
            <LayoutGrid size={14} />
          </button>
          <button
            type="button"
            onClick={() => onViewChange("list")}
            className={`${styles.viewBtn} ${view === "list" ? styles.active : ""}`}
            aria-label="Vue liste"
            title="Vue liste"
          >
            <List size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}