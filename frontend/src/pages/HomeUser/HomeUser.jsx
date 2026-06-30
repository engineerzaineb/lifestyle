import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Sparkles, ArrowRight, Compass, Flame, Clock, MapPin, Zap } from "lucide-react";
import { useAuth } from "../../context/useAuth";
import {
  fetchEvents,
  fetchRecommendations,
  fetchDiscoveries,
  fetchPopular,
  fetchSoon,
} from "../../services/eventService";
import HeroPersonalized from "../../components/HeroPersonalized/HeroPersonalized";
import EventsGrid from "../../components/EventsGrid/EventsGrid";
import CategoriesGrid from "../../components/CategoriesGrid/CategoriesGrid";
import CTAFinal from "../../components/CTAFinal/CTAFinal";
import styles from "./HomeUser.module.css";

export default function HomeUser() {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState([]);
  const [nearbyEvents, setNearbyEvents] = useState([]);
  const [bonsPlans, setBonsPlans] = useState([]);
  const [discoveries, setDiscoveries] = useState([]);
  const [popularEvents, setPopularEvents] = useState([]);
  const [soonEvents, setSoonEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Chargement parallèle de toutes les sections
  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      try {
        const [reco, nearby, deals, discov, popular, soon] = await Promise.all([
          fetchRecommendations().catch(() => ({ results: [] })),
          user?.ville
            ? fetchEvents({ ville: user.ville }).catch(() => ({ results: [] }))
            : Promise.resolve({ results: [] }),
          fetchEvents({ has_bon_plan: true }).catch(() => ({ results: [] })),
          fetchDiscoveries().catch(() => ({ results: [] })),
          fetchPopular().catch(() => ({ results: [] })),
          fetchSoon().catch(() => ({ results: [] })),
        ]);

        if (cancelled) return;

        setRecommendations((reco.results || []).slice(0, 3));
        setNearbyEvents((nearby.results || []).slice(0, 3));
        setBonsPlans((deals.results || []).slice(0, 3));
        setDiscoveries((discov.results || []).slice(0, 3));
        setPopularEvents((popular.results || []).slice(0, 3));
        setSoonEvents((soon.results || []).slice(0, 3));
      } catch (err) {
        console.error("Erreur chargement HomeUser:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();
    return () => {
      cancelled = true;
    };
  }, [user?.ville]);

  return (
    <div className={styles.page}>
      {/* HERO PERSONNALISÉ */}
      <HeroPersonalized user={user} />

      {/* 1. POUR VOUS (intérêts) */}
      <section className={styles.section}>
        <div className={styles.sectionContainer}>
          <div className={styles.aiBanner}>
            <div className={styles.aiBannerIcon}>
              <Sparkles size={18} />
            </div>
            <p className={styles.aiBannerText}>
              <strong>✨ Sélection personnalisée</strong> — Notre IA a sélectionné
              ces événements selon vos centres d'intérêt et votre ville.
            </p>
          </div>

          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitleBlock}>
              <h2 className={styles.sectionTitle}>
                Recommandés <em className={styles.sectionTitleEm}>pour vous</em>
              </h2>
              <p className={styles.sectionSubtitle}>
                Basés sur vos goûts et votre localisation
              </p>
            </div>
            <Link to="/search" className={styles.sectionAction}>
              Voir tout <ArrowRight size={13} />
            </Link>
          </div>

          <EventsGrid
            events={recommendations}
            loading={loading}
            skeletonCount={3}
            emptyTitle="Aucune recommandation"
            emptyMessage="Ajoutez des centres d'intérêt pour des recommandations personnalisées."
          />
        </div>
      </section>

      {/* 2. À DÉCOUVRIR (exploration hors zone de confort) */}
      {discoveries.length > 0 && (
        <section className={`${styles.section} ${styles.sectionAlt}`}>
          <div className={styles.sectionContainer}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitleBlock}>
                <h2 className={styles.sectionTitle}>
                  <Compass size={20} style={{ display: "inline", verticalAlign: "middle", marginRight: 8 }} />
                  À <em className={styles.sectionTitleEm}>découvrir</em>
                </h2>
                <p className={styles.sectionSubtitle}>
                  Sortez de votre zone de confort — explorez de nouvelles expériences
                </p>
              </div>
              <Link to="/search" className={styles.sectionAction}>
                Explorer <ArrowRight size={13} />
              </Link>
            </div>

            <EventsGrid events={discoveries} loading={loading} skeletonCount={3} />
          </div>
        </section>
      )}

      {/* 3. PRÈS DE CHEZ VOUS */}
      {user?.ville && nearbyEvents.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionContainer}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitleBlock}>
                <h2 className={styles.sectionTitle}>
                  <MapPin size={20} style={{ display: "inline", verticalAlign: "middle", marginRight: 8 }} />
                  Près de <em className={styles.sectionTitleEm}>{user.ville}</em>
                </h2>
                <p className={styles.sectionSubtitle}>
                  Les événements à proximité de chez vous
                </p>
              </div>
              <Link
                to={`/search?ville=${encodeURIComponent(user.ville)}`}
                className={styles.sectionAction}
              >
                Tout voir <ArrowRight size={13} />
              </Link>
            </div>

            <EventsGrid events={nearbyEvents} loading={loading} skeletonCount={3} />
          </div>
        </section>
      )}

      {/* 4. POPULAIRES */}
      {popularEvents.length > 0 && (
        <section className={`${styles.section} ${styles.sectionAlt}`}>
          <div className={styles.sectionContainer}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitleBlock}>
                <h2 className={styles.sectionTitle}>
                  <Flame size={20} style={{ display: "inline", verticalAlign: "middle", marginRight: 8 }} />
                  Événements <em className={styles.sectionTitleEm}>populaires</em>
                </h2>
                <p className={styles.sectionSubtitle}>
                  Les plus demandés du moment
                </p>
              </div>
              <Link to="/search" className={styles.sectionAction}>
                Tout voir <ArrowRight size={13} />
              </Link>
            </div>

            <EventsGrid events={popularEvents} loading={loading} skeletonCount={3} />
          </div>
        </section>
      )}

      {/* 5. BONS PLANS */}
      <section className={styles.section}>
        <div className={styles.sectionContainer}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitleBlock}>
              <h2 className={styles.sectionTitle}>
                <Zap size={20} style={{ display: "inline", verticalAlign: "middle", marginRight: 8 }} />
                Bons plans <em className={styles.sectionTitleEm}>de la semaine</em>
              </h2>
              <p className={styles.sectionSubtitle}>
                Réductions exclusives à ne pas manquer
              </p>
            </div>
            <Link to="/search?has_bon_plan=true" className={styles.sectionAction}>
              Tous les bons plans <ArrowRight size={13} />
            </Link>
          </div>

          <EventsGrid
            events={bonsPlans}
            loading={loading}
            skeletonCount={3}
            emptyTitle="Aucun bon plan"
            emptyMessage="Pas de réductions disponibles pour l'instant."
          />
        </div>
      </section>

      {/* 6. BIENTÔT (urgence) */}
      {soonEvents.length > 0 && (
        <section className={`${styles.section} ${styles.sectionAlt}`}>
          <div className={styles.sectionContainer}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitleBlock}>
                <h2 className={styles.sectionTitle}>
                  <Clock size={20} style={{ display: "inline", verticalAlign: "middle", marginRight: 8 }} />
                  Cette <em className={styles.sectionTitleEm}>semaine</em>
                </h2>
                <p className={styles.sectionSubtitle}>
                  Les événements dans les 7 prochains jours
                </p>
              </div>
              <Link to="/search" className={styles.sectionAction}>
                Tout voir <ArrowRight size={13} />
              </Link>
            </div>

            <EventsGrid events={soonEvents} loading={loading} skeletonCount={3} />
          </div>
        </section>
      )}

      {/* 7. CATÉGORIES (existant) */}
      <CategoriesGrid />

      {/* CTA FINAL */}
      <CTAFinal
        title={
          <>
            Vous aussi, créez<br />
            <em className={styles.sectionTitleEm}>vos événements</em>
          </>
        }
        subtitle="Devenez organisateur sur Eventu et partagez vos passions avec la communauté tunisienne."
        showBadge={false}
      />
    </div>
  );
}