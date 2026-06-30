import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  fetchMyReservations,
  filterByReservationTab,
  countByReservationTab,
  calculateUserStats,
  cancelReservation,
  downloadTickets,
} from "../../services/reservationService";
import { useToastContext } from "../../components/iu/Toast/ToastProvider";


import ReservationsHeader from "../../components/Reservations/ReservationsHeader/ReservationsHeader";
import ReservationsTabs from "../../components/Reservations/ReservationsTabs/ReservationsTabs";
import ReservationCard from "../../components/Reservations/ReservationCard/ReservationCard";
import ReservationsEmptyState from "../../components/Reservations/ReservationsEmptyState/ReservationsEmptyState";

import styles from "./MyReservations.module.css";


export default function MyReservations() {
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToastContext();

  // etats
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(searchParams.get("tab") || "all");

  // Chargement
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await fetchMyReservations();
        if (!cancelled) setReservations(data);
      } catch (err) {
        toast.error("Impossible de charger vos réservations");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [toast]);

  // Sync URL → tab
  useEffect(() => {
    const params = new URLSearchParams();
    if (tab !== "all") params.set("tab", tab);
    setSearchParams(params, { replace: true });
  }, [tab, setSearchParams]);

  // Filtrage + calculs 
  const filteredReservations = useMemo(
    () => filterByReservationTab(reservations, tab),
    [reservations, tab]
  );
  const stats = useMemo(() => calculateUserStats(reservations), [reservations]);
  const counts = useMemo(() => countByReservationTab(reservations), [reservations]);

  // ACTIONS
  const handleAction = async (action, reservation) => {
    if (action === "cancel") {
      if (!confirm(`Annuler votre réservation pour "${reservation.event.titre}" ?\n\nVous serez remboursé sous 3-5 jours ouvrés.`)) return;
      try {
        await cancelReservation(reservation.id);
        setReservations((prev) =>
          prev.map((r) =>
            r.id === reservation.id
              ? { ...r, statut: "annule", cancelled_at: new Date().toISOString() }
              : r
          )
        );
        toast.success("Réservation annulée. Remboursement en cours.");
      } catch (err) {
        toast.error("Erreur lors de l'annulation");
      }
    } else if (action === "download") {
      try {
        await downloadTickets(reservation.id);
        toast.success("Téléchargement des billets en cours...");
        // En vrai : window.open(result.url) ou triggers download
      } catch (err) {
        toast.error("Erreur lors du téléchargement");
      }
    }
  };

  return (
    <div className={styles.page}>
      <ReservationsHeader stats={stats} />

      <div className={styles.main}>
        <ReservationsTabs
          currentTab={tab}
          counts={counts}
          onChange={setTab}
        />

        {loading ? (
          <SkeletonList />
        ) : filteredReservations.length === 0 ? (
          <ReservationsEmptyState tab={tab} />
        ) : (
          <div className={styles.list}>
            {filteredReservations.map((reservation) => (
              <ReservationCard
                key={reservation.id}
                reservation={reservation}
                onAction={handleAction}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

//Skeletons de chargement 
function SkeletonList() {
  return (
    <div className={styles.list}>
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className={styles.skeleton}>
          <div className={styles.skeletonCover} />
          <div className={styles.skeletonContent}>
            <div className={`${styles.skeletonLine} ${styles.w60}`} />
            <div className={`${styles.skeletonLine} ${styles.w40}`} />
            <div className={`${styles.skeletonLine} ${styles.w80}`} />
          </div>
        </div>
      ))}
    </div>
  );
}