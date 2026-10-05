import { useState, useEffect, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Calendar, Plus } from "lucide-react";
import {
  fetchMyEvents,
  filterByStatusTab,
  countByStatus,
  calculateGlobalStats,
  searchEvents,
  sortOrganizerEvents,
  deleteMyEvent,
  duplicateEvent,
  cancelEvent,
} from "../../services/organizerService";
import { useDebounce } from "../../hooks/useDebounce";
import { useToastContext } from "../../components/iu/Toast/ToastProvider";

// composants modulaires
import OrganizerHeader from "../../components/Organizer/OrganizerHeader/OrganizerHeader";
import OrganizerTabs from "../../components/Organizer/OrganizerTabs/OrganizerTabs";
import OrganizerEventsToolbar from "../../components/Organizer/OrganizerEventsToolbar/OrganizerEventsToolbar";
import OrganizerEventCard from "../../components/Organizer/OrganizerEventCard/OrganizerEventCard";

import styles from "./OrganizerEvents.module.css";


export default function OrganizerEvents() {
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToastContext();

  // etats
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(searchParams.get("tab") || "all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("recent");
  const [view, setView] = useState("grid");

  const debouncedQuery = useDebounce(query, 300);

  //chargement
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await fetchMyEvents();
        if (!cancelled) setEvents(data);
      } catch (err) {
        toast.error("Impossible de charger vos événements");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [toast]);

  // sync URL → tab
  useEffect(() => {
    const params = new URLSearchParams();
    if (tab !== "all") params.set("tab", tab);
    setSearchParams(params, { replace: true });
  }, [tab, setSearchParams]);

  // pipeline de filtrage 
  const filteredEvents = useMemo(() => {
    let result = filterByStatusTab(events, tab);
    result = searchEvents(result, debouncedQuery);
    result = sortOrganizerEvents(result, sort);
    return result;
  }, [events, tab, debouncedQuery, sort]);

  // stats globales et compteurs
  const stats = useMemo(() => calculateGlobalStats(events), [events]);
  const counts = useMemo(() => countByStatus(events), [events]);

  
  // ACTIONS
  
  const handleAction = async (action, event) => {
    if (action === "delete") {
      if (!confirm(`Supprimer "${event.titre}" ? Cette action est irréversible.`)) return;
      try {
        await deleteMyEvent(event.id);
        setEvents((prev) => prev.filter((e) => e.id !== event.id));
        toast.success("Événement supprimé");
      } catch (err) {
        toast.error("Erreur lors de la suppression");
      }
    } else if (action === "duplicate") {
      try {
        await duplicateEvent(event.id);
        toast.success(`"${event.titre}" dupliqué en brouillon`);
        const data = await fetchMyEvents();
        setEvents(data);
      } catch (err) {
        toast.error("Erreur lors de la duplication");
      }
    } else if (action === "cancel") {
      if (!confirm(`Annuler l'événement "${event.titre}" ?`)) return;
      try {
        await cancelEvent(event.id);
        setEvents((prev) =>
          prev.map((e) => (e.id === event.id ? { ...e, statut: "annule" } : e))
        );
        toast.success("Événement annulé");
      } catch (err) {
        toast.error("Erreur lors de l'annulation");
      }
    } else if (action === "publish") {
      toast.info("Fonctionnalité bientôt disponible");
    } else if (action === "stats") {
      toast.info("Page statistiques bientôt disponible");
    }
  };


  // RENDER
  
  return (
    <div className={styles.page}>
      <OrganizerHeader stats={stats} />

      <div className={styles.main}>
        <OrganizerTabs currentTab={tab} counts={counts} onChange={setTab} />

        <OrganizerEventsToolbar
          query={query}
          onQueryChange={setQuery}
          sort={sort}
          onSortChange={setSort}
          view={view}
          onViewChange={setView}
        />

        {loading ? (
          <SkeletonGrid view={view} />
        ) : filteredEvents.length === 0 ? (
          <EmptyState tab={tab} query={debouncedQuery} />
        ) : (
          <div className={view === "grid" ? styles.grid : styles.list}>
            {filteredEvents.map((event) => (
              <OrganizerEventCard
                key={event.id}
                event={event}
                view={view}
                onAction={handleAction}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

//emptyState 
   
function EmptyState({ tab, query }) {
  const isFiltered = tab !== "all" || query;

  return (
    <div className={styles.empty}>
      <div className={styles.emptyIcon}>
        <Calendar size={28} />
      </div>
      <h2 className={styles.emptyTitle}>
        {isFiltered ? "Aucun événement trouvé" : "Aucun événement pour l'instant"}
      </h2>
      <p className={styles.emptyDesc}>
        {isFiltered
          ? "Essayez d'ajuster vos filtres ou de réinitialiser la recherche."
          : "Créez votre premier événement et commencez à toucher la communauté Eventu."}
      </p>
      {!isFiltered && (
        <Link to="/organizer/create" className={styles.emptyBtn}>
          <Plus size={14} />
          Créer un événement
        </Link>
      )}
    </div>
  );
}

//SkeletonGrid 

function SkeletonGrid({ view }) {
  const count = 6;

  if (view === "list") {
    return (
      <div className={styles.list}>
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className={styles.skeleton} style={{ height: 110 }} />
        ))}
      </div>
    );
  }

  return (
    <div className={styles.grid}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={styles.skeleton}>
          <div className={styles.skeletonCover} />
          <div className={styles.skeletonBody}>
            <div className={`${styles.skeletonLine} ${styles.w90}`} />
            <div className={`${styles.skeletonLine} ${styles.w40}`} />
            <div className={`${styles.skeletonLine} ${styles.w70}`} style={{ marginTop: 12 }} />
          </div>
        </div>
      ))}
    </div>
  );
}