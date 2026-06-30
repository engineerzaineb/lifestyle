import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Calendar, MapPin, Users, Heart, Zap, Flame, ArrowRight,
  Music, Utensils, Theater, Trophy, BookOpen, Palette,
  Sparkles, Award
} from "lucide-react";
import styles from "./EventCard.module.css";



// Mapping des catégories vers icônes et couleurs
const CATEGORY_MAP = {
  musique: { icon: Music, color: "#EC4899" },
  food: { icon: Utensils, color: "#F97316" },
  spectacle: { icon: Theater, color: "#A855F7" },
  sport: { icon: Trophy, color: "#06B6D4" },
  culture: { icon: BookOpen, color: "#4F46E5" },
  art: { icon: Palette, color: "#84CC16" },
  "bien-etre": { icon: Sparkles, color: "#16A34A" },
  tech: { icon: Award, color: "#0891B2" },
};

export default function EventCard({
  event,
  variant = "default",
  showLikeButton = true,
}) {
  const [liked, setLiked] = useState(false);

  // Récupère icône + couleur de la catégorie
  const cat = event.categorie ? CATEGORY_MAP[event.categorie.slug] : null;
  const CatIcon = cat?.icon || Sparkles;
  const catColor = cat?.color || "var(--color-primary)";

  // Format de la date
  const dateObj = event.date_evenement ? new Date(event.date_evenement) : null;
  const dateFormatted = dateObj
    ? dateObj.toLocaleDateString("fr-FR", {
        weekday: variant === "compact" ? undefined : "short",
        day: "numeric",
        month: "short",
        hour: variant === "compact" ? undefined : "2-digit",
        minute: variant === "compact" ? undefined : "2-digit",
      })
    : "Date à venir";

  // Format du prix
  const isFree = event.prix_min === 0;
  const priceLabel = isFree ? "Gratuit" : `${event.prix_min} DT`;

  // Gestion du like
  const handleLike = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setLiked(!liked);
  };

  // VARIANTE COMPACT — mini-carte (sidebar/recommandations)
  if (variant === "compact") {
    return (
      <Link
        to={`/event/${event.id}`}
        className={`${styles.card} ${styles.cardCompact}`}
      >
        <div
          className={styles.compactIcon}
          style={{ background: `linear-gradient(135deg, ${catColor}, ${catColor}AA)` }}
        >
          <CatIcon size={20} />
        </div>
        <div className={styles.compactBody}>
          <p className={styles.compactTitle}>{event.titre}</p>
          <p className={styles.compactMeta}>
            {dateFormatted} · {priceLabel}
          </p>
        </div>
      </Link>
    );
  }

  // VARIANTE HORIZONTAL — carte large
  if (variant === "horizontal") {
    return (
      <Link
        to={`/event/${event.id}`}
        className={`${styles.card} ${styles.cardHorizontal}`}
      >
        <Cover event={event} CatIcon={CatIcon} catColor={catColor} liked={liked} onLike={handleLike} showLikeButton={showLikeButton} isFree={isFree} />

        <div className={styles.content}>
          <CategoryBadge categorie={event.categorie} CatIcon={CatIcon} catColor={catColor} />

          <h3 className={styles.title}>{event.titre}</h3>

          {event.description && (
            <p className={styles.description}>{event.description}</p>
          )}

          <div className={styles.meta}>
            <span className={styles.metaItem}>
              <Calendar size={11} />
              {dateFormatted}
            </span>
            <span className={styles.metaItem}>
              <MapPin size={11} />
              {event.lieu}, {event.ville}
            </span>
            {event.capacite_totale && (
              <span className={styles.metaItem}>
                <Users size={11} />
                {event.capacite_totale} places
              </span>
            )}
          </div>

          <div className={styles.footer}>
            <PriceDisplay event={event} priceLabel={priceLabel} />
            <button className={styles.detailBtn}>
              Voir détail <ArrowRight size={12} />
            </button>
          </div>
        </div>
      </Link>
    );
  }

  // VARIANTE DEFAULT — carte verticale (grille standard)
  return (
    <Link to={`/event/${event.id}`} className={styles.card}>
      <Cover event={event} CatIcon={CatIcon} catColor={catColor} liked={liked} onLike={handleLike} showLikeButton={showLikeButton} isFree={isFree} />

      <div className={styles.content}>
        <CategoryBadge categorie={event.categorie} CatIcon={CatIcon} catColor={catColor} />

        <h3 className={styles.title}>{event.titre}</h3>

        <div className={styles.meta}>
          <span className={styles.metaItem}>
            <Calendar size={11} />
            {dateFormatted}
          </span>
          <span className={styles.metaItem}>
            <MapPin size={11} />
            {event.ville}
          </span>
        </div>

        <div className={styles.footer}>
          <PriceDisplay event={event} priceLabel={priceLabel} />
          <ArrowRight size={14} className={styles.arrow} />
        </div>
      </div>
    </Link>
  );
}

//Cover — image de couverture + badges + like
function Cover({ event, CatIcon, catColor, liked, onLike, showLikeButton, isFree }) {
  return (
    <div
      className={styles.cover}
      style={{
        background: `linear-gradient(135deg, ${catColor}, ${catColor}AA)`,
      }}
    >
      {event.cover ? (
        <img
          src={event.cover}
          alt={event.titre}
          className={styles.coverImage}
        />
      ) : (
        <CatIcon size={48} className={styles.coverIconFallback} strokeWidth={1.2} />
      )}

      {/* Badges (priorité : HOT > BON PLAN > GRATUIT) */}
      {event.hot && (
        <div className={`${styles.badgeTopLeft} ${styles.badgeHot}`}>
          <Flame size={11} fill="white" />
          HOT
        </div>
      )}
      {!event.hot && event.has_bon_plan && (
        <div className={`${styles.badgeTopLeft} ${styles.badgeDeal}`}>
          <Zap size={10} fill="white" />
          -{event.reduction_max}%
        </div>
      )}
      {!event.hot && !event.has_bon_plan && isFree && (
        <div className={`${styles.badgeTopLeft} ${styles.badgeFree}`}>
          GRATUIT
        </div>
      )}

      {/* Bouton like */}
      {showLikeButton && (
        <button
          onClick={onLike}
          className={`${styles.likeBtn} ${liked ? styles.liked : ""}`}
          aria-label={liked ? "Retirer des favoris" : "Ajouter aux favoris"}
        >
          <Heart
            size={14}
            fill={liked ? "currentColor" : "none"}
          />
        </button>
      )}
    </div>
  );
}

//CategoryBadge — petit badge de catégorie
function CategoryBadge({ categorie, CatIcon, catColor }) {
  if (!categorie) return null;
  return (
    <span
      className={styles.categoryBadge}
      style={{
        background: `${catColor}15`,
        color: catColor,
      }}
    >
      <CatIcon size={10} />
      {categorie.nom}
    </span>
  );
}

//PriceDisplay — affichage du prix avec gestion bon plan
function PriceDisplay({ event, priceLabel }) {
  return (
    <div className={styles.price}>
      {event.has_bon_plan && event.prix_original && (
        <span className={styles.priceOld}>{event.prix_original} DT</span>
      )}
      <span
        className={`${styles.priceCurrent} ${event.has_bon_plan ? styles.deal : ""}`}
      >
        {priceLabel}
      </span>
    </div>
  );
}