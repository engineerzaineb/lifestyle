import { useState, useEffect, useMemo, useRef } from "react";
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
import { useSync } from "../../context/useSync";


export default function MyReservations() {
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToastContext();

  // etats
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(searchParams.get("tab") || "all");

  // Chargement
  // Recharge silencieusement à chaque nouveauté (décision de l'admin,
  // annulation par l'organisateur…) : la page reste cohérente avec les notifications.
  const { version } = useSync();
  const dejaCharge = useRef(false);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!dejaCharge.current) setLoading(true);
      try {
        const data = await fetchMyReservations();
        if (!cancelled) { setReservations(data); dejaCharge.current = true; }
      } catch (err) {
        toast.error("Impossible de charger vos réservations");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [toast, version]);

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
    if (action === "payer") {
      // Reprend le paiement sur la page Stripe tant que les places sont gardées
      window.location.assign(reservation.paiement.url);
    } else if (action === "cancel") {
      const paye = reservation.paiement?.statut === "reussi";
      const question = reservation.statut === "en_attente_paiement"
        ? `Annuler votre réservation pour "${reservation.event.titre}" ?\n\nLes places seront libérées.`
        : paye
          ? `Annuler votre réservation pour "${reservation.event.titre}" ?\n\nLe montant payé (${reservation.total} DT) vous sera remboursé sur votre carte.`
          : `Annuler votre réservation pour "${reservation.event.titre}" ?`;
      if (!confirm(question)) return;
      try {
        const maj = await cancelReservation(reservation.id);
        setReservations((prev) =>
          prev.map((r) =>
            r.id === reservation.id
              ? { ...r, statut: "annule", cancelled_at: maj.date_annulation, paiement: maj.paiement }
              : r
          )
        );
        toast.success(maj.issue_annulation === "rembourse"
          ? "Réservation annulée. Le remboursement a été effectué."
          : "Réservation annulée.");
      } catch (err) {
        toast.error(err.response?.data?.detail || "Erreur lors de l'annulation");
      }
    } else if (action === "download") {
      try {
        await downloadTickets(reservation.id, reservation.code);
        toast.success("Billets téléchargés.");
      } catch {
        toast.error("Impossible de télécharger les billets");
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