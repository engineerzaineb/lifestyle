import { useState, useEffect } from "react";
import { Heart } from "lucide-react";
import { fetchFavoris } from "../../services/favoriService";
import { useToastContext } from "../../components/iu/Toast/ToastProvider";
import EventsGrid from "../../components/EventsGrid/EventsGrid";
import styles from "./Favoris.module.css";

export default function Favoris() {
  const toast = useToastContext();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetchFavoris()
      .then((data) => { if (!cancelled) setEvents(data); })
      .catch((err) => {
        if (cancelled) return;
        console.error("Erreur chargement favoris:", err);
        toast.error("Impossible de charger vos favoris");
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <Heart size={26} fill="var(--color-pink)" color="var(--color-pink)" />
          <h1 className={styles.title}>Mes favoris</h1>
        </div>
        <p className={styles.subtitle}>
          {loading
            ? "Chargement..."
            : `${events.length} événement${events.length > 1 ? "s" : ""} enregistré${events.length > 1 ? "s" : ""}`}
        </p>
      </div>

      <EventsGrid
        events={events}
        loading={loading}
        emptyTitle="Aucun favori pour l'instant"
        emptyMessage="Cliquez sur le cœur d'un événement pour l'ajouter à vos favoris."
        emptyActionLabel="Découvrir des événements"
        emptyActionTo="/discover"
      />
    </div>
  );
}