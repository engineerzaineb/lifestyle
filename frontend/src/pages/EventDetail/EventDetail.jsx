import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchEvent, fetchSimilarEvents } from "../../services/eventService";
import {
  createEmptySelection,
  updateQuantity,
  isSelectionValid,
} from "../../services/bookingService";
import { getShareInfo } from "../../services/eventDisplayService";
import { useAuth } from "../../context/useAuth";
import { useToastContext } from "../../components/iu/Toast/ToastProvider";

import EventHero from "../../components/event-detail/EventHero/EventHero";
import EventQuickInfo from "../../components/event-detail/EventQuickInfo/EventQuickInfo";
import EventDescription from "../../components/event-detail/EventDescription/EventDescription";
import EventOrganizer from "../../components/event-detail/EventOrganizer/EventOrganizer";
import EventLocation from "../../components/event-detail/EventLocation/EventLocation";
import BookingCard from "../../components/event-detail/BookingCard/BookingCard";
import EventsGrid from "../../components/EventsGrid/EventsGrid";

import styles from "./EventDetail.module.css";

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const toast = useToastContext();

  const [event, setEvent] = useState(null);
  const [similarEvents, setSimilarEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selection, setSelection] = useState({});
  const [favorite, setFavorite] = useState(false);

  // Chargement de l'événement + des similaires (en parallèle)
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        // Charge l'événement
        const data = await fetchEvent(id);
        if (cancelled) return;

        if (!data) {
          navigate("/");
          return;
        }

        setEvent(data);
        setSelection(createEmptySelection(data.types_billets || []));

        // Charge les événements similaires en parallèle
        try {
          const similar = await fetchSimilarEvents(id);
          if (!cancelled) {
            setSimilarEvents(similar.results || []);
          }
        } catch (err) {
          console.warn("Impossible de charger les événements similaires :", err);
        }
      } catch (err) {
        console.error("Erreur EventDetail:", err);
        if (err.response?.status === 404) {
          toast.error("Événement introuvable");
          navigate("/");
        } else {
          toast.error("Impossible de charger l'événement");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id, navigate, toast]);

  // Handlers
  const handleQtyChange = (key, delta) => {
    setSelection((prev) => updateQuantity(prev, key, delta));
  };

  const handleFavorite = () => {
    if (!isAuthenticated) {
      toast.info("Connectez-vous pour ajouter aux favoris");
      return navigate("/login");
    }
    setFavorite(!favorite);
    toast.success(favorite ? "Retiré des favoris" : "Ajouté aux favoris");
  };

  const handleShare = async () => {
    const info = getShareInfo(event);
    if (navigator.share) {
      try { await navigator.share(info); } catch { /* annulé par user */ }
    } else {
      navigator.clipboard.writeText(info.url);
      toast.success("Lien copié !");
    }
  };

  const handleBook = () => {
    if (!isSelectionValid(selection)) {
      return toast.warning("Sélectionnez au moins un billet");
    }
    if (!isAuthenticated) {
      toast.info("Connectez-vous pour réserver");
      return navigate("/login", { state: { from: `/event/${id}` } });
    }
    navigate(`/booking/${id}`, { state: { selection } });
  };

  // Loading state
  if (loading || !event) {
    return (
      <div className={styles.page}>
        <div style={{ height: 420, background: "var(--color-surface-alt)" }} />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <EventHero
        event={event}
        favorite={favorite}
        onFavorite={handleFavorite}
        onShare={handleShare}
      />

      <div className={styles.main}>
        <div className={styles.leftCol}>
          <EventQuickInfo event={event} />
          <EventDescription event={event} />
          <EventOrganizer organisateur={event.organisateur} />
          <EventLocation event={event} />
        </div>

        <BookingCard
          event={event}
          selection={selection}
          onQtyChange={handleQtyChange}
          onBook={handleBook}
        />
      </div>

      {similarEvents.length > 0 && (
        <section className={styles.similarSection}>
          <div className={styles.similarInner}>
            <h2 className={styles.similarTitle}>
              Événements <em className={styles.similarTitleEm}>similaires</em>
            </h2>
            <EventsGrid events={similarEvents} />
          </div>
        </section>
      )}
    </div>
  );
}