import { Search as SearchIcon, ArrowRight, X } from "lucide-react";
import styles from "./SearchHero.module.css";


export default function SearchHero({ query, onQueryChange, onSubmit, resultsCount }) {
  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSubmit) onSubmit();
  };

  const handleClear = () => {
    onQueryChange("");
  };

  return (
    <section className={styles.hero}>
      <div className={styles.blob1} />
      <div className={styles.blob2} />

      <div className={styles.inner}>
        <h1 className={styles.title}>
          Trouvez votre <em className={styles.titleEm}>prochaine sortie</em>
        </h1>
        <p className={styles.subtitle}>
          {resultsCount !== undefined
            ? `${resultsCount} événement${resultsCount > 1 ? "s" : ""} disponible${resultsCount > 1 ? "s" : ""}`
            : "Concerts, food, art, sport… tout est ici"}
        </p>

        <form onSubmit={handleSubmit} className={styles.searchBar}>
          <div className={styles.searchInputWrapper}>
            <SearchIcon size={16} color="var(--color-text-muted)" />
            <input
              type="text"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="Rechercher : jazz, brunch, marathon..."
              className={styles.searchInput}
              autoFocus
            />
            {query && (
              <button
                type="button"
                onClick={handleClear}
                className={styles.clearBtn}
                aria-label="Effacer"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <button type="submit" className={styles.searchBtn}>
            Rechercher
            <ArrowRight size={13} />
          </button>
        </form>
      </div>
    </section>
  );
}