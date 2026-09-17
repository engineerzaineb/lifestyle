import { useState, useEffect, useMemo } from "react";
import { SlidersHorizontal, MapPin, Zap, Search } from "lucide-react";
import { VILLES_TUNISIE } from "../../../utils/constants";
import { countActiveFilters, PRIX_MIN_DEFAULT, PRIX_MAX_DEFAULT } from "../../../services/searchService";
import { fetchCategories } from "../../../services/eventService";
import styles from "./SearchFilters.module.css";

export default function SearchFilters({ filters, onChange, onReset }) {
  const activeCount = countActiveFilters(filters);
  const [villeSearch, setVilleSearch] = useState("");
  const [categorieSearch, setCategorieSearch] = useState("");
  const [categories, setCategories] = useState([]);

  // Charge les catégories validées depuis la base
  useEffect(() => {
    let cancelled = false;
    fetchCategories()
      .then((data) => { if (!cancelled) setCategories(data); })
      .catch(() => { /* silencieux */ });
    return () => { cancelled = true; };
  }, []);


  // Helper pour update un champ
  const update = (field, value) => {
    onChange({ ...filters, [field]: value });
  };

  // Toggle catégorie (ajoute/retire de la liste)
  const toggleCategorie = (slug) => {
    const current = filters.categorie_slugs || [];
    const newList = current.includes(slug)
      ? current.filter((s) => s !== slug)
      : [...current, slug];
    update("categorie_slugs", newList);
  };

  // Toggle ville
  const toggleVille = (ville) => {
    const current = filters.villes || [];
    const newList = current.includes(ville)
      ? current.filter((v) => v !== ville)
      : [...current, ville];
    update("villes", newList);
  };

  // Filtrer les villes selon la recherche
  const villesFiltered = useMemo(() => {
    if (!villeSearch) return VILLES_TUNISIE;
    const q = villeSearch.toLowerCase();
    return VILLES_TUNISIE.filter((v) => v.toLowerCase().includes(q));
  }, [villeSearch]);
    // Filtrer les catégories selon la recherche
  const categoriesFiltered = useMemo(() => {
    if (!categorieSearch) return categories;
    const q = categorieSearch.toLowerCase();
    return categories.filter((cat) => cat.nom.toLowerCase().includes(q));
  }, [categorieSearch, categories]);

  // Slider prix
  const handlePriceMinChange = (e) => {
    const value = parseInt(e.target.value, 10);
    if (value <= filters.prix_max - 10) {
      update("prix_min", value);
    }
  };

  const handlePriceMaxChange = (e) => {
    const value = parseInt(e.target.value, 10);
    if (value >= filters.prix_min + 10) {
      update("prix_max", value);
    }
  };

  // Calcule la position du range pour le slider visuel
  const minPercent = ((filters.prix_min - PRIX_MIN_DEFAULT) / (PRIX_MAX_DEFAULT - PRIX_MIN_DEFAULT)) * 100;
  const maxPercent = ((filters.prix_max - PRIX_MIN_DEFAULT) / (PRIX_MAX_DEFAULT - PRIX_MIN_DEFAULT)) * 100;

  return (
    <aside className={styles.sidebar}>
      <div className={styles.card}>
        {/* Header */}
        <div className={styles.header}>
          <p className={styles.headerTitle}>
            <SlidersHorizontal size={14} />
            Filtres
            {activeCount > 0 && <span className={styles.badge}>{activeCount}</span>}
          </p>
          <button
            type="button"
            onClick={onReset}
            disabled={activeCount === 0}
            className={styles.resetBtn}
          >
            Réinitialiser
          </button>
        </div>

                {/* Catégories (multi-sélection + recherche) */}
        <FilterSection title="Catégories">
          <div style={{ position: "relative" }}>
            <Search size={12} style={{ position: "absolute", left: 10, top: 11, color: "var(--color-text-muted)" }} />
            <input
              type="text"
              value={categorieSearch}
              onChange={(e) => setCategorieSearch(e.target.value)}
              placeholder="Rechercher une catégorie..."
              className={styles.searchInput}
              style={{ paddingLeft: 28 }}
            />
          </div>
          <div className={styles.chipsGrid} style={{ marginTop: 10 }}>
            {categoriesFiltered.map((cat) => {
              const isSelected = filters.categorie_slugs?.includes(cat.slug);
              return (
                <button
                  key={cat.slug}
                  type="button"
                  onClick={() => toggleCategorie(cat.slug)}
                  className={`${styles.chip} ${isSelected ? styles.selected : ""}`}
                >
                  {cat.nom}
                </button>
              );
            })}
          </div>
        </FilterSection>

        {/* Villes (multi-sélection + recherche) */}
        <FilterSection title="Villes">
          <div style={{ position: "relative" }}>
            <Search size={12} style={{ position: "absolute", left: 10, top: 11, color: "var(--color-text-muted)" }} />
            <input
              type="text"
              value={villeSearch}
              onChange={(e) => setVilleSearch(e.target.value)}
              placeholder="Rechercher une ville..."
              className={styles.searchInput}
              style={{ paddingLeft: 28 }}
            />
          </div>

          <div className={styles.villesScroll}>
            <div className={styles.chipsGrid}>
              {villesFiltered.map((ville) => {
                const isSelected = filters.villes?.includes(ville);
                return (
                  <button
                    key={ville}
                    type="button"
                    onClick={() => toggleVille(ville)}
                    className={`${styles.chip} ${isSelected ? styles.selected : ""}`}
                  >
                    <MapPin size={10} />
                    {ville}
                  </button>
                );
              })}
            </div>
          </div>
        </FilterSection>

        {/* Date prédéfinie */}
        <FilterSection title="Quand ?">
          <div className={styles.datePills}>
            <DatePill label="Aujourd'hui" value="today" current={filters.date} onClick={(v) => update("date", v)} />
            <DatePill label="Ce week-end" value="weekend" current={filters.date} onClick={(v) => update("date", v)} />
            <DatePill label="Ce mois-ci" value="month" current={filters.date} onClick={(v) => update("date", v)} />
          </div>

          {/* Date spécifique */}
          <input
            type="date"
            value={filters.date_exacte || ""}
            onChange={(e) => update("date_exacte", e.target.value)}
            className={styles.dateInput}
            placeholder="Date précise"
          />
        </FilterSection>

        {/* Prix (slider double) */}
        <FilterSection title={`Prix (${filters.prix_min} — ${filters.prix_max} DT)`}>
          <div className={styles.priceSliderWrapper}>
            <div className={styles.priceValues}>
              <span>{filters.prix_min} DT</span>
              <span>{filters.prix_max} DT</span>
            </div>

            <div className={styles.sliderTrack}>
              <div
                className={styles.sliderRange}
                style={{
                  left: `${minPercent}%`,
                  width: `${maxPercent - minPercent}%`,
                }}
              />
              <input
                type="range"
                min={PRIX_MIN_DEFAULT}
                max={PRIX_MAX_DEFAULT}
                step={10}
                value={filters.prix_min}
                onChange={handlePriceMinChange}
                className={styles.sliderInput}
              />
              <input
                type="range"
                min={PRIX_MIN_DEFAULT}
                max={PRIX_MAX_DEFAULT}
                step={10}
                value={filters.prix_max}
                onChange={handlePriceMaxChange}
                className={styles.sliderInput}
              />
            </div>
          </div>
        </FilterSection>

        {/* Bons plans */}
        <FilterSection title="Offres">
          <button
            type="button"
            onClick={() => update("bon_plan", !filters.bon_plan)}
            className={`${styles.toggleBtn} ${filters.bon_plan ? styles.active : ""}`}
          >
            <span className={styles.toggleIcon}>
              <Zap size={13} fill={filters.bon_plan ? "currentColor" : "none"} />
            </span>
            Bons plans uniquement
          </button>
        </FilterSection>
      </div>
    </aside>
  );
}

// Helper : section de filtre
function FilterSection({ title, children }) {
  return (
    <div className={styles.section}>
      <p className={styles.sectionTitle}>{title}</p>
      {children}
    </div>
  );
}

// Pill de date prédéfinie
function DatePill({ label, value, current, onClick }) {
  const isActive = current === value;
  return (
    <button
      type="button"
      onClick={() => onClick(isActive ? "" : value)}
      className={`${styles.datePill} ${isActive ? styles.active : ""}`}
    >
      {label}
    </button>
  );
}