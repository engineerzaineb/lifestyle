import { useState, useEffect, useMemo } from "react";
import {
  fetchMyEvents,
  filterByStatusTab,
  deleteMyEvent,
  duplicateEvent,
  publishDraft,
} from "../../services/organizerService";
import { useToastContext } from "../../components/iu/Toast/ToastProvider";


import DraftHeader from "../../components/Organizer/DraftHeader/DraftHeader";
import DraftCard from "../../components/Organizer/DraftCard/DraftCard";
import DraftsEmptyState from "../../components/Organizer/DraftsEmptyState/DraftsEmptyState";

import styles from "./OrganizerDrafts.module.css";


export default function OrganizerDrafts() {
  const toast = useToastContext();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  //chargement initial
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await fetchMyEvents();
        if (!cancelled) setEvents(data);
      } catch {
        toast.error("Impossible de charger vos brouillons");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [toast]);

  // filtre uniquement les brouillons 
  const drafts = useMemo(
    () => filterByStatusTab(events, "brouillon"),
    [events]
  );

  // ACTIONS
  const handleAction = async (action, event) => {
    if (action === "delete") {
      if (!confirm(`Supprimer le brouillon "${event.titre || 'Sans titre'}" ?`)) return;
      try {
        await deleteMyEvent(event.id);
        setEvents((prev) => prev.filter((e) => e.id !== event.id));
        toast.success("Brouillon supprimé");
      } catch {
        toast.error("Erreur lors de la suppression");
      }
    } else if (action === "duplicate") {
      try {
        await duplicateEvent(event.id);
        toast.success("Brouillon dupliqué");
        // Recharge la liste
        const data = await fetchMyEvents();
        setEvents(data);
      } catch {
        toast.error("Erreur lors de la duplication");
      }
    } else if (action === "publish") {
      if (!confirm(`Publier "${event.titre}" ? Il sera soumis à validation.`)) return;
      try {
        await publishDraft(event.id);
        toast.success("Brouillon soumis pour validation");
        setEvents((prev) =>
          prev.map((e) => (e.id === event.id ? { ...e, statut: "en_attente" } : e))
        );
      } catch {
        toast.error("Erreur lors de la publication");
      }
    }
  };

  // RENDER
  return (
    <div className={styles.page}>
      <DraftHeader count={drafts.length} />

      <div className={styles.main}>
        {loading ? (
          <SkeletonList />
        ) : drafts.length === 0 ? (
          <DraftsEmptyState />
        ) : (
          <div className={styles.list}>
            {drafts.map((event) => (
              <DraftCard
                key={event.id}
                event={event}
                onAction={handleAction}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

//SkeletonList — Animation de chargement
function SkeletonList() {
  return (
    <div className={styles.list}>
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className={styles.skeleton}>
          <div className={styles.skeletonCover} />
          <div className={styles.skeletonContent}>
            <div className={`${styles.skeletonLine} ${styles.w70}`} />
            <div className={`${styles.skeletonLine} ${styles.w90}`} />
            <div className={`${styles.skeletonLine} ${styles.w50}`} />
            <div className={`${styles.skeletonLine} ${styles.w40}`} />
          </div>
        </div>
      ))}
    </div>
  );
}