import { useNavigate } from "react-router-dom";
import {
  Music, Utensils, Theater, Trophy, BookOpen, Palette,
  Sparkles, Award
} from "lucide-react";
import Header from "../Header/Header";
import styles from "./CategoriesGrid.module.css";

const CATEGORIES = [
  { slug: "musique", nom: "Musique", icon: Music, color: "#EC4899", count: 248, label: "Concerts" },
  { slug: "food", nom: "Food", icon: Utensils, color: "#F97316", count: 142, label: "Gastronomie" },
  { slug: "spectacle", nom: "Spectacle", icon: Theater, color: "#A855F7", count: 38, label: "Théâtre" },
  { slug: "sport", nom: "Sport", icon: Trophy, color: "#06B6D4", count: 87, label: "Activités" },
  { slug: "culture", nom: "Culture", icon: BookOpen, color: "#4F46E5", count: 95, label: "Découverte" },
  { slug: "art", nom: "Art", icon: Palette, color: "#84CC16", count: 64, label: "Expositions" },
  { slug: "bien-etre", nom: "Bien-être", icon: Sparkles, color: "#16A34A", count: 52, label: "Wellness" },
  { slug: "tech", nom: "Tech", icon: Award, color: "#0891B2", count: 28, label: "Innovation" },
];

export default function CategoriesGrid({ showHeader = true }) {
  const navigate = useNavigate();

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        {showHeader && (
          <Header
            eyebrow="Explorer"
            title={<>Trouvez votre <em>vibe</em></>}
            subtitle="Du jazz intimiste au festival open air, parcourez par catégorie."
          />
        )}

        <div className={styles.grid}>
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.slug}
                onClick={() => navigate(`/search?cat=${cat.slug}`)}
                className={styles.card}
                style={{
                  background: `linear-gradient(135deg, ${cat.color}, ${cat.color}DD)`,
                  boxShadow: `0 8px 24px ${cat.color}33`,
                }}
              >
                <div className={styles.cardDecor} />
                <div className={styles.cardDecor2} />
                <span className={styles.cardLabel}>{cat.label}</span>

                <div className={styles.cardContent}>
                  <div className={styles.iconBox}>
                    <Icon size={20} color="white" />
                  </div>
                  <div className={styles.cardText}>
                    <p className={styles.cardTitle}>{cat.nom}</p>
                    <p className={styles.cardCount}>
                      {cat.count} événements →
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}