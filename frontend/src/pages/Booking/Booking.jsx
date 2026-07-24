import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, Calendar, MapPin, CheckCircle,
  Ticket, User as UserIcon, Mail,
} from "lucide-react";
import { fetchEvent } from "../../services/eventService";
import { createReservation } from "../../services/bookingService";
import { useAuth } from "../../context/useAuth";
import { useToastContext } from "../../components/iu/Toast/ToastProvider";
import { formatDate } from "../../utils/formatters";

import styles from "./Booking.module.css";


export default function Booking() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const toast = useToastContext();

  // Sélection reçue depuis EventDetail via `state`
  const initialSelection = location.state?.selection || {};

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(null);

  // Si aucune sélection valide → retour à l'événement
  useEffect(() => {
    const hasAny = Object.values(initialSelection).some((v) => v > 0);
    if (!hasAny) {
      navigate(`/event/${id}`, { replace: true });
    }
  }, [initialSelection, id, navigate]);

  // Charger l'événement
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await fetchEvent(id);
        if (cancelled) return;
        if (!data) {
          navigate("/", { replace: true });
          return;
        }
        setEvent(data);
      } catch (err) {
        console.error("Erreur Booking (load event):", err);
        toast.error("Impossible de charger l'événement");
        navigate("/", { replace: true });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Calcul des lignes de billets à afficher + total
  const { items, total, totalPlaces } = useMemo(() => {
    if (!event?.types_billets) return { items: [], total: 0, totalPlaces: 0 };
    const rows = event.types_billets
      .filter((t) => (initialSelection[t.id] || 0) > 0)
      .map((t) => ({
        ...t,
        quantite: initialSelection[t.id],
        sousTotal: (parseFloat(t.prix) || 0) * initialSelection[t.id],
      }));
    return {
      items: rows,
      total: rows.reduce((sum, r) => sum + r.sousTotal, 0),
      totalPlaces: rows.reduce((sum, r) => sum + r.quantite, 0),
    };
  }, [event, initialSelection]);

  const handleConfirm = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const reservation = await createReservation(
        id,
        initialSelection,
        event.types_billets
      );
      setConfirmed(reservation);
      toast.success("Réservation confirmée !");
    } catch (err) {
      console.error("Erreur création réservation :", err);
      // Le backend peut renvoyer plusieurs formats d'erreur
      const data = err.response?.data;
      let msg = "Erreur lors de la réservation";
      if (data?.detail) msg = data.detail;
      else if (Array.isArray(data?.items)) msg = data.items[0];
      else if (data?.event_id) msg = data.event_id;
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // === Loading ===
  if (loading || !event) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.skeleton} />
        </div>
      </div>
    );
  }

  // === Success ===
  if (confirmed) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.successCard}>
            <div className={styles.successIcon}>
              <CheckCircle size={40} strokeWidth={2} />
            </div>
            <h1 className={styles.successTitle}>
              Réservation <em className={styles.titleEm}>confirmée</em>
            </h1>
            <p className={styles.successText}>
              Votre réservation <strong>{confirmed.code_reference}</strong> a bien
              été enregistrée. Présentez-la à l'entrée de l'événement.
            </p>

            <div className={styles.successMeta}>
              <div className={styles.successMetaItem}>
                <span className={styles.successMetaLabel}>Total</span>
                <span className={styles.successMetaValue}>
                  {parseFloat(confirmed.total_prix).toFixed(2)} DT
                </span>
              </div>
              <div className={styles.successMetaDivider} />
              <div className={styles.successMetaItem}>
                <span className={styles.successMetaLabel}>Places</span>
                <span className={styles.successMetaValue}>
                  {confirmed.total_places}
                </span>
              </div>
            </div>

            <div className={styles.successActions}>
              <Link to="/my-reservations" className={styles.primaryBtn}>
                Voir mes réservations
                <ArrowRight size={16} />
              </Link>
              <Link to={`/event/${id}`} className={styles.secondaryBtn}>
                Retour à l'événement
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // === Main content ===
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <button onClick={() => navigate(-1)} className={styles.backBtn}>
          <ArrowLeft size={16} />
          Retour
        </button>

        <h1 className={styles.title}>
          Confirmer votre <em className={styles.titleEm}>réservation</em>
        </h1>
        <p className={styles.subtitle}>
          Vérifie les détails avant de confirmer. Aucun paiement n'est requis.
        </p>

        <div className={styles.grid}>
          {/* Colonne gauche : event + user */}
          <div className={styles.leftCol}>
            {/* Event card */}
            <div className={styles.eventCard}>
              {event.image_url && (
                <img
                  src={event.image_url}
                  alt={event.titre}
                  className={styles.eventImage}
                />
              )}
              <div className={styles.eventBody}>
                {event.categorie?.nom && (
                  <span className={styles.categoryBadge}>
                    {event.categorie.nom}
                  </span>
                )}
                <h2 className={styles.eventTitle}>{event.titre}</h2>
                <div className={styles.eventMetaList}>
                  <div className={styles.eventMeta}>
                    <Calendar size={14} />
                    <span>{formatDate(event.date_evenement, { includeTime: true })}</span>
                  </div>
                  <div className={styles.eventMeta}>
                    <MapPin size={14} />
                    <span>{event.lieu}{event.ville ? `, ${event.ville}` : ""}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* User info */}
            <div className={styles.userCard}>
              <h3 className={styles.cardTitle}>Informations de contact</h3>
              <div className={styles.field}>
                <div className={styles.fieldLabel}>
                  <UserIcon size={14} />
                  Nom complet
                </div>
                <div className={styles.fieldValue}>
                  {user?.prenom} {user?.nom}
                </div>
              </div>
              <div className={styles.field}>
                <div className={styles.fieldLabel}>
                  <Mail size={14} />
                  Email
                </div>
                <div className={styles.fieldValue}>{user?.email}</div>
              </div>
              <p className={styles.fieldHint}>
                Ces informations sont utilisées pour envoyer la confirmation.
              </p>
            </div>
          </div>

          {/* Colonne droite : récap + confirmer */}
          <aside className={styles.rightCol}>
            <div className={styles.summary}>
              <div className={styles.summaryHeader}>
                <Ticket size={18} />
                <h3 className={styles.summaryTitle}>Récapitulatif</h3>
              </div>

              <div className={styles.itemsList}>
                {items.map((item) => (
                  <div key={item.id} className={styles.item}>
                    <div className={styles.itemInfo}>
                      <div className={styles.itemName}>{item.nom}</div>
                      <div className={styles.itemPricing}>
                        {item.quantite} × {parseFloat(item.prix).toFixed(2)} DT
                      </div>
                    </div>
                    <div className={styles.itemTotal}>
                      {item.sousTotal.toFixed(2)} DT
                    </div>
                  </div>
                ))}
              </div>

              <div className={styles.divider} />

              <div className={styles.totalRow}>
                <div>
                  <div className={styles.totalLabel}>Total</div>
                  <div className={styles.totalPlaces}>
                    {totalPlaces} place{totalPlaces > 1 ? "s" : ""}
                  </div>
                </div>
                <div className={styles.totalValue}>
                  {total.toFixed(2)} DT
                </div>
              </div>

              <button
                onClick={handleConfirm}
                disabled={submitting}
                className={styles.confirmBtn}
              >
                {submitting ? (
                  "Confirmation en cours..."
                ) : (
                  <>
                    Confirmer la réservation
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              <p className={styles.notice}>
                En confirmant, vous acceptez les conditions de l'événement.
                Vous pouvez annuler à tout moment depuis <em>Mes réservations</em>.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}