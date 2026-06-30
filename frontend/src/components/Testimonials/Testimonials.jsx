import { useState, useEffect, useRef } from "react";
import { Quote, Star, CheckCircle2 } from "lucide-react";
import Header from "../Header/Header";
import styles from "./Testimonials.module.css";


export default function Testimonials({ showHeader = true, testimonials }) {
  const defaultTestimonials = [
    {
      name: "Yasmine B.",
      role: "Membre depuis 2024",
      text: "J'ai découvert tellement de petites pépites grâce aux recos IA ! Soirées jazz, ateliers cuisine... je sors deux fois plus qu'avant.",
      color: "primary",
      verified: true,
    },
    {
      name: "Karim M.",
      role: "Organisateur, La Villa Carthage",
      text: "Eventu a transformé ma façon de gérer mes événements. Le dashboard est ultra clair et le système de bons plans m'aide à remplir mes soirées.",
      color: "pink",
      verified: true,
    },
    {
      name: "Sami L.",
      role: "Membre depuis 2025",
      text: "L'interface est belle et fluide, le paiement par D17 fonctionne parfaitement. Je recommande à tous mes amis.",
      color: "coral",
      verified: false,
    },
  ];

  const list = testimonials || defaultTestimonials;

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        {showHeader && (
          <Header
            eyebrow="Témoignages"
            title={<>Ils <em>vivent Eventu</em> au quotidien</>}
            subtitle="350 000 utilisateurs et organisateurs en Tunisie"
          />
        )}

        <div className={styles.grid}>
          {list.map((testimonial, index) => (
            <TestimonialCard
              key={index}
              testimonial={testimonial}
              index={index}
            />
          ))}
        </div>
      </div>
    </section>
  );
}


function TestimonialCard({ testimonial, index }) {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  // Initiales depuis le nom
  const initials = testimonial.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // Mapping classes
  const colorClass = {
    primary: styles.colorPrimary,
    pink: styles.colorPink,
    coral: styles.colorCoral,
  }[testimonial.color] || styles.colorPrimary;

  const avatarClass = {
    primary: styles.avatarPrimary,
    pink: styles.avatarPink,
    coral: styles.avatarCoral,
  }[testimonial.color] || styles.avatarPrimary;

  return (
    <div
      ref={ref}
      className={`${styles.card} ${colorClass} ${isVisible ? styles.visible : ""}`}
      style={{ transitionDelay: `${index * 100}ms` }}
    >
      {/* Gros guillemet décoratif */}
      <Quote size={48} className={styles.quote} />

      {/* Étoiles */}
      <div className={styles.stars}>
        {[...Array(5)].map((_, i) => (
          <Star key={i} size={15} fill="currentColor" />
        ))}
      </div>

      {/* Texte */}
      <p className={styles.text}>"{testimonial.text}"</p>

      {/* Auteur */}
      <div className={styles.author}>
        <div className={`${styles.avatar} ${avatarClass}`}>
          {initials}
        </div>
        <div className={styles.authorInfo}>
          <p className={styles.authorName}>
            {testimonial.name}
            {testimonial.verified && (
              <span className={styles.verifiedBadge}>
                <CheckCircle2 size={9} fill="currentColor" />
                Vérifié
              </span>
            )}
          </p>
          <p className={styles.authorRole}>{testimonial.role}</p>
        </div>
      </div>
    </div>
  );
}