import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, ArrowRight, Calendar, Heart, Compass, Ticket } from "lucide-react";
import { getInitials } from "../../utils/formatters";
import styles from "./HeroPersonalized.module.css";


export default function HeroPersonalized({ user, subtitle }) {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) {
      navigate(`/search?q=${encodeURIComponent(q)}`);
    } else {
      navigate("/search");
    }
  };

  const initials = getInitials(user?.prenom, user?.nom);
  const defaultSubtitle = `Voici une sélection d'événements qu'on a triée rien que pour vous${user?.ville ? ` à ${user.ville}` : ""}.`;

  return (
    <section className={styles.hero}>
      <div className={styles.blob1} />
      <div className={styles.blob2} />

      <div className={styles.inner}>
        {/* Salutation */}
        <div className={styles.greeting}>
          <div className={styles.avatar}>{initials}</div>
          <div className={styles.greetingText}>
            <p className={styles.welcome}>Content de vous revoir</p>
            <h1 className={styles.name}>
              Bonjour <span className={styles.nameAccent}>{user?.prenom || "vous"}</span>
              <span className={styles.wave}>👋</span>
            </h1>
          </div>
        </div>

        <p className={styles.subtitle}>{subtitle || defaultSubtitle}</p>

        {/* Recherche */}
        <form onSubmit={handleSearch} className={styles.searchBar}>
          <div className={styles.searchInputWrapper}>
            <Search size={16} color="var(--color-text-muted)" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Concert jazz, brunch, expo..."
              className={styles.searchInput}
            />
          </div>
          <button type="submit" className={styles.searchBtn}>
            Rechercher <ArrowRight size={13} />
          </button>
        </form>

        {/* Raccourcis */}
        <div className={styles.quickActions}>
          <span className={styles.quickActionLabel}>Accès rapide :</span>
          <Link to="/discover" className={styles.quickActionBtn}>
            <Compass size={12} />
            Découvrir
          </Link>
          <Link to="/my-reservations" className={styles.quickActionBtn}>
            <Ticket size={12} />
            Mes billets
          </Link>
          <Link to="/search?bon_plan=true" className={styles.quickActionBtn}>
            <Heart size={12} />
            Mes favoris
          </Link>
          <Link to="/search?date=weekend" className={styles.quickActionBtn}>
            <Calendar size={12} />
            Ce week-end
          </Link>
        </div>
      </div>
    </section>
  );
}