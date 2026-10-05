import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchEvent, fetchSimilarEvents } from "../../services/eventService";
import api from "../../services/api";
import {
  createEmptySelection,
  updateQuantity,
  isSelectionValid,
} from "../../services/bookingService";

import { useAuth } from "../../context/useAuth";
import { useToastContext } from "../../components/iu/Toast/ToastProvider";
import { toggleFavori } from "../../services/favoriService";

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

  // Ref sur toast pour éviter que sa nouvelle identité à chaque render
  // ne redéclenche le useEffect de chargement (bug de boucle infinie).
  const toastRef = useRef(toast);
  useEffect(() => { toastRef.current = toast; }, [toast]);

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
        setFavorite(data.is_favori || false);
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
        if (cancelled) return;
        console.error("Erreur EventDetail:", err);
        if (err.response?.status === 404) {
          toastRef.current.error("Événement introuvable");
          navigate("/");
        } else {
          toastRef.current.error("Impossible de charger l'événement");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id, navigate]);

  // Track view (fire-and-forget, ne bloque pas le rendu)
  useEffect(() => {
    if (!id) return;
    api.post(`/events/${id}/track-view/`).catch(() => {
      // On ignore les erreurs — c'est du tracking non-critique
    });
  }, [id]);

  // Handlers
  const handleQtyChange = (key, delta) => {
    setSelection((prev) => updateQuantity(prev, key, delta));
  };

  const handleFavorite = async () => {
    if (!isAuthenticated) {
      toast.info("Connectez-vous pour ajouter aux favoris");
      return navigate("/login");
    }
    const previous = favorite;
    setFavorite(!previous); // mise à jour optimiste
    try {
      await toggleFavori(event.id, previous);
      toast.success(previous ? "Retiré des favoris" : "Ajouté aux favoris");
    } catch {
      setFavorite(previous); // rollback si échec
      toast.error("Action impossible");
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