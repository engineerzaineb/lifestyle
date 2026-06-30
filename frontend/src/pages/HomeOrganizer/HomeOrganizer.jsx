import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Plus, ArrowRight, FileText, Sparkles, BarChart3
} from "lucide-react";
import { useAuth } from "../../context/useAuth";
import { fetchEvents } from "../../services/eventService";
import { getInitials, formatPrice, timeAgo } from "../../utils/formatters";
import DashboardStats from "../../components/DashboardStats/DashboardStats";
import EventsGrid from "../../components/EventsGrid/EventsGrid";
import styles from "./HomeOrganizer.module.css";


export default function HomeOrganizer() {
  const { user } = useAuth();
  const [publishedEvents, setPublishedEvents] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [recentBookings, setRecentBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      try {
        // à Remplacer par fetchEvents({ mes_events: true })
        const data = await fetchEvents();
        if (cancelled) return;

        const allEvents = data.results || [];

        // Pour  démo 
        setPublishedEvents(allEvents.slice(0, 3));

        // Mock de brouillons 
        const mockDrafts = allEvents.slice(3, 5).map((e) => ({
          ...e,
          statut: "brouillon",
          titre: e.titre + " (brouillon)",
        }));
        setDrafts(mockDrafts);

        // Mock de réservations récentes
        setRecentBookings(getMockBookings());
      } catch (err) {
        console.error("Erreur HomeOrganizer:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();
    return () => {
      cancelled = true;
    };
  }, []);

  const initials = getInitials(user?.prenom, user?.nom);

  return (
    <div className={styles.page}>
      {/* HERO */}
      <section className={styles.hero}>
        <div className={styles.blob1} />
        <div className={styles.blob2} />

        <div className={styles.heroInner}>
          <div className={styles.greeting}>
            <div className={styles.avatar}>{initials}</div>
            <div className={styles.greetingText}>
              <p className={styles.welcome}>Tableau de bord organisateur</p>
              <h1 className={styles.name}>
                Bonjour <span className={styles.nameAccent}>{user?.prenom || "vous"}</span>
              </h1>
            </div>
          </div>

          <Link to="/organizer/create" className={styles.createBtn}>
            <Plus size={16} />
            Créer un événement
          </Link>
        </div>
      </section>

      {/* STATS */}
      <section className={styles.section}>
        <div className={styles.sectionContainer}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitleBlock}>
              <h2 className={styles.sectionTitle}>
                Vos <em className={styles.sectionTitleEm}>performances</em>
              </h2>
              <p className={styles.sectionSubtitle}>
                Vue d'ensemble de vos événements ce mois-ci
              </p>
            </div>
            <Link to="/organizer" className={styles.sectionAction}>
              <BarChart3 size={13} />
              Détails complets
            </Link>
          </div>

          <DashboardStats />
        </div>
      </section>

      {/* MES ÉVÉNEMENTS */}
      <section className={`${styles.section} ${styles.sectionAlt}`}>
        <div className={styles.sectionContainer}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitleBlock}>
              <h2 className={styles.sectionTitle}>
                Mes événements <em className={styles.sectionTitleEm}>publiés</em>
              </h2>
              <p className={styles.sectionSubtitle}>
                {publishedEvents.length} événement{publishedEvents.length > 1 ? "s" : ""} en ligne
              </p>
            </div>
            <Link to="/organizer" className={styles.sectionAction}>
              Voir tous <ArrowRight size={13} />
            </Link>
          </div>

          <EventsGrid
            events={publishedEvents}
            loading={loading}
            skeletonCount={3}
            emptyTitle="Aucun événement publié"
            emptyMessage="Créez votre premier événement et commencez à toucher la communauté Eventu."
            emptyActionLabel="Créer un événement"
            emptyActionTo="/organizer/create"
          />
        </div>
      </section>

      {/* BROUILLONS */}
      <section className={styles.section}>
        <div className={styles.sectionContainer}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitleBlock}>
              <h2 className={styles.sectionTitle}>
                Brouillons <em className={styles.sectionTitleEm}>à finaliser</em>
              </h2>
              <p className={styles.sectionSubtitle}>
                {drafts.length} brouillon{drafts.length > 1 ? "s" : ""} en attente
              </p>
            </div>
            <Link to="/organizer/drafts" className={styles.sectionAction}>
              <FileText size={13} />
              Tous les brouillons
            </Link>
          </div>

          <EventsGrid
            events={drafts}
            loading={loading}
            skeletonCount={2}
            emptyTitle="Aucun brouillon"
            emptyMessage="Tous vos événements sont publiés. Beau travail !"
            emptyActionLabel="Créer un événement"
            emptyActionTo="/organizer/create"
          />
        </div>
      </section>

      {/* DERNIÈRES RÉSERVATIONS */}
      <section className={`${styles.section} ${styles.sectionAlt}`}>
        <div className={styles.sectionContainer}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitleBlock}>
              <h2 className={styles.sectionTitle}>
                Dernières <em className={styles.sectionTitleEm}>réservations</em>
              </h2>
              <p className={styles.sectionSubtitle}>
                Activité récente sur vos événements
              </p>
            </div>
          </div>

          <BookingsFeed bookings={recentBookings} loading={loading} />
        </div>
      </section>

      {/* TIPS */}
      <section className={styles.section}>
        <div className={styles.sectionContainer}>
          <div className={styles.tipsCard}>
            <div className={styles.tipsIcon}>
              <Sparkles size={24} />
            </div>
            <div className={styles.tipsContent}>
              <h3 className={styles.tipsTitle}>Astuce du jour</h3>
              <p className={styles.tipsText}>
                Ajoutez une <strong>image de qualité</strong> à vos événements augmente
                les inscriptions de <strong>+40%</strong>. Les meilleurs formats : photo
                de l'ambiance, du lieu, ou des intervenants.
              </p>
            </div>
            <Link to="/organizer/create" className={styles.tipsBtn}>
              Créer maintenant <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}


function BookingsFeed({ bookings, loading }) {
  if (loading) {
    return (
      <div className={styles.bookingsFeed}>
        {[...Array(4)].map((_, i) => (
          <div key={i} className={styles.bookingItem}>
            <div
              className={styles.bookingAvatar}
              style={{ background: "var(--color-surface-alt)" }}
            />
            <div className={styles.bookingInfo}>
              <div
                style={{
                  height: 12,
                  background: "var(--color-surface-alt)",
                  borderRadius: 4,
                  width: "40%",
                  marginBottom: 6,
                }}
              />
              <div
                style={{
                  height: 10,
                  background: "var(--color-surface-alt)",
                  borderRadius: 4,
                  width: "70%",
                }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!bookings || bookings.length === 0) {
    return (
      <div className={styles.bookingsFeed}>
        <p className={styles.bookingsEmpty}>
          Aucune réservation récente. Les nouvelles réservations apparaîtront ici.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.bookingsFeed}>
      {bookings.map((booking, i) => (
        <div key={i} className={styles.bookingItem}>
          <div className={styles.bookingAvatar}>
            {getInitials(booking.prenom, booking.nom)}
          </div>
          <div className={styles.bookingInfo}>
            <p className={styles.bookingName}>
              {booking.prenom} {booking.nom}
            </p>
            <p className={styles.bookingDetails}>
              {booking.places} place{booking.places > 1 ? "s" : ""} ·{" "}
              <strong>{booking.eventTitle}</strong>
            </p>
          </div>
          <div>
            <p className={styles.bookingPrice}>{formatPrice(booking.total)}</p>
            <p className={styles.bookingTime}>{timeAgo(booking.date)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}


// mock 
function getMockBookings() {
  const now = Date.now();
  return [
    {
      prenom: "Yasmine",
      nom: "Ben Ali",
      places: 2,
      total: 70,
      eventTitle: "Soirée Jazz au Carthage",
      date: new Date(now - 5 * 60 * 1000),
    },
    {
      prenom: "Mohamed",
      nom: "Trabelsi",
      places: 4,
      total: 240,
      eventTitle: "Brunch dominical à Sidi Bou Saïd",
      date: new Date(now - 35 * 60 * 1000),
    },
    {
      prenom: "Salma",
      nom: "Hammami",
      places: 1,
      total: 0,
      eventTitle: "Vernissage Galerie Selma",
      date: new Date(now - 2 * 3600 * 1000),
    },
    {
      prenom: "Karim",
      nom: "Lasram",
      places: 2,
      total: 70,
      eventTitle: "Soirée Jazz au Carthage",
      date: new Date(now - 5 * 3600 * 1000),
    },
    {
      prenom: "Nadia",
      nom: "Khelifa",
      places: 3,
      total: 90,
      eventTitle: "Marathon de la Médina",
      date: new Date(now - 24 * 3600 * 1000),
    },
  ];
}