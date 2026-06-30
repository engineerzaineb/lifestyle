import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, MapPin, ArrowRight, Sparkles, Flame} from "lucide-react";
import styles from "./HeroLanding.module.css";


export default function HeroLanding() {
  const [searchQuery, setSearchQuery] = useState("");
  const [city, setCity] = useState("Tunis");
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery) params.set("q", searchQuery);
    if (city) params.set("ville", city);
    navigate(`/search?${params.toString()}`);
  };

  const handleTrendClick = (trend) => {
    navigate(`/search?q=${encodeURIComponent(trend)}`);
  };

  return (
    <section className={styles.hero}>
      {/* Blobs animés en arrière-plan (4 blobs pour plus de profondeur) */}
      <div className={styles.blob1} />
      <div className={styles.blob2} />
      <div className={styles.blob3} />
      <div className={styles.blob4} />

      {/* Emojis flottants (6 emojis répartis) */}
      <div className={`${styles.emoji} ${styles.emoji1}`}>🎷</div>
      <div className={`${styles.emoji} ${styles.emoji2}`}>🎭</div>
      <div className={`${styles.emoji} ${styles.emoji3}`}>🍷</div>
      <div className={`${styles.emoji} ${styles.emoji4}`}>✨</div>
      <div className={`${styles.emoji} ${styles.emoji5}`}>🎨</div>
      <div className={`${styles.emoji} ${styles.emoji6}`}>🎵</div>

      <div className={styles.inner}>
        {/* Badge */}
        <div className={styles.badge}>
          <span className={styles.badgeDot} />
          <span className={styles.badgeIcon}>
            <Sparkles size={13} />
          </span>
          <span>Plus de 12 000 événements en Tunisie</span>
        </div>

        {/* Titre */}
        <h1 className={styles.title}>
          Vivez ce qui vous fait
          <br />
          <em className={styles.titleHighlight}>vraiment vibrer</em>
        </h1>

        {/* Sous-titre */}
        <p className={styles.subtitle}>
          Concerts, restos, festivals, ateliers… Découvrez les meilleurs bons plans
          près de chez vous, sélectionnés pour vous par notre IA.
        </p>

        {/* Barre de recherche */}
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

          <div className={styles.searchDivider} />

          <div className={styles.citySelector}>
            <MapPin size={16} className={styles.cityIcon} />
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className={styles.citySelect}
            >
              <option value="Tunis">Tunis</option>
              <option value="La Marsa">La Marsa</option>
              <option value="Sidi Bou Saïd">Sidi Bou Saïd</option>
              <option value="Carthage">Carthage</option>
              <option value="Hammamet">Hammamet</option>
              <option value="Sousse">Sousse</option>
              <option value="Monastir">Monastir</option>
              <option value="Djerba">Djerba</option>
            </select>
          </div>

          <button type="submit" className={styles.searchBtn}>
            Rechercher <ArrowRight size={14} />
          </button>
        </form>

        {/* Tags tendance */}
        <div className={styles.trends}>
          <span className={styles.trendsLabel}>
            <Flame size={12} color="var(--color-coral)" />
            Tendance :
          </span>
          {["Jazz", "Brunch", "Stand-up", "Yoga", "Festival"].map((trend) => (
            <button
              key={trend}
              type="button"
              onClick={() => handleTrendClick(trend)}
              className={styles.trendBtn}
            >
              {trend}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}