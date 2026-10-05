import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { fetchEvents, fetchRecommendations } from "../../services/eventService";
import {
  getDefaultFilters,
  parseFiltersFromUrl,
  buildUrlFromFilters,
  buildApiParamsFromFilters,
  hasActiveFilters,
} from "../../services/searchService";
import { useDebounce } from "../../hooks/useDebounce";
import { useAuth } from "../../context/useAuth";

import SearchHero from "../../components/search/SearchHero/SearchHero";
import SearchFilters from "../../components/search/SearchFilters/SearchFilters";
import SearchSortBar from "../../components/search/SearchSortBar/SearchSortBar";
import EventsGrid from "../../components/EventsGrid/EventsGrid";

import styles from "./Search.module.css";

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(() => parseFiltersFromUrl(searchParams));
  const [sort, setSort] = useState(searchParams.get("sort") || "relevance");
  const [isPersonalized, setIsPersonalized] = useState(false);

  const debouncedFilters = useDebounce(filters, 200);

  // Chargement des événements
  useEffect(() => {
    let cancelled = false;

    async function loadEvents() {
      setLoading(true);
      try {
        let data;

        // Mode recommandations : aucun filtre ET tri = relevance ET user connecté
        const noFiltersNoSort = !hasActiveFilters(debouncedFilters) && sort === "relevance";

        if (noFiltersNoSort && isAuthenticated) {
          data = await fetchRecommendations();
          if (!cancelled) setIsPersonalized(true);
        } else {
          // Mode recherche : respecte les filtres et le tri du user
          const params = buildApiParamsFromFilters(debouncedFilters, sort);
          data = await fetchEvents(params);
          if (!cancelled) setIsPersonalized(false);
        }

        if (!cancelled) {
          setResults(data.results || []);
        }
      } catch (err) {
        console.error("Erreur Search:", err);
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadEvents();
    return () => {
      cancelled = true;
    };
  }, [debouncedFilters, sort, isAuthenticated]);

  // Synchronise les filtres avec l'URL
  useEffect(() => {
    const params = buildUrlFromFilters(debouncedFilters, sort);
    setSearchParams(params, { replace: true });
  }, [debouncedFilters, sort, setSearchParams]);

  const handleReset = () => {
    setFilters(getDefaultFilters());
    setSort("relevance");
  };

  const handleRemoveFilter = (field, value) => {
    if (field === "categorie_slugs" && value) {
      setFilters({
        ...filters,
        categorie_slugs: filters.categorie_slugs.filter((s) => s !== value),
      });
      return;
    }
    if (field === "villes" && value) {
      setFilters({
        ...filters,
        villes: filters.villes.filter((v) => v !== value),
      });
      return;
    }
    if (field === "prix") {
      setFilters({ ...filters, prix_min: 0, prix_max: 500 });
      return;
    }
    setFilters({ ...filters, [field]: field === "bon_plan" ? false : "" });
  };

  return (
    <div className={styles.page}>
      <SearchHero
        query={filters.q}
        onQueryChange={(q) => setFilters({ ...filters, q })}
        resultsCount={results.length}
      />

      <div className={styles.main}>
        <SearchFilters
          filters={filters}
          onChange={setFilters}
          onReset={handleReset}
        />

        <div className={styles.content}>
          {isPersonalized && !loading && results.length > 0 && (
            <div className={styles.personalizedBanner}>
              <Sparkles size={16} />
              <p>
                <strong>Sélection personnalisée</strong> — basée sur vos centres d'intérêt et votre localisation.
                Appliquez des filtres ou un tri pour affiner.
              </p>
            </div>
          )}

          <SearchSortBar
            count={results.length}
            filters={filters}
            sort={sort}
            onSortChange={setSort}
            onRemoveFilter={handleRemoveFilter}
          />

          <EventsGrid
            events={results}
            loading={loading}
            skeletonCount={6}
            emptyTitle="Aucun résultat"
            emptyMessage="Essayez d'autres mots-clés ou ajustez les filtres."
            emptyActionLabel="Réinitialiser les filtres"
            emptyActionTo="#"
          />
        </div>
      </div>
    </div>
  );
}