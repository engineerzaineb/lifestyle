import { useState, useEffect, useRef } from "react";
import { Calendar, Users, MapPin, Star } from "lucide-react";
import styles from "./Stats.module.css";


export default function Stats({ items }) {
  const defaultItems = [
    { icon: Calendar, value: 12000, suffix: "+", label: "Événements", color: "primary" },
    { icon: Users, value: 350000, suffix: "+", label: "Membres actifs", color: "pink" },
    { icon: MapPin, value: 8, suffix: "", label: "Villes", color: "coral" },
    { icon: Star, value: 4.8, suffix: "/5", label: "Note moyenne", color: "warning", isDecimal: true },
  ];

  const list = items || defaultItems;

  return (
    <section className={styles.section}>
      <div className={styles.grid}>
        {list.map((item, i) => (
          <StatItem key={i} item={item} delay={i * 100} />
        ))}
      </div>
    </section>
  );
}


function StatItem({ item, delay }) {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const [displayValue, setDisplayValue] = useState(0);

  //détection de visibilité (Intersection Observer)
  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  // Animation count-up
  useEffect(() => {
    if (!isVisible) return;

    const duration = 1500; // 1.5 secondes
    const steps = 60;
    const startTime = Date.now() + delay;
    const endValue = item.value;

    const interval = setInterval(() => {
      const now = Date.now();
      if (now < startTime) return;

      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing : ease-out cubique
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = endValue * eased;

      setDisplayValue(current);

      if (progress >= 1) {
        clearInterval(interval);
        setDisplayValue(endValue);
      }
    }, duration / steps);

    return () => clearInterval(interval);
  }, [isVisible, item.value, delay]);

  // Formattage du chiffre
  const formatValue = (val) => {
    if (item.isDecimal) {
      return val.toFixed(1);
    }
    if (val >= 1000) {
      return Math.floor(val / 1000) + "K";
    }
    return Math.floor(val);
  };

  // Mapping des classes de couleur
  const iconColorClass = {
    primary: styles.iconPrimary,
    pink: styles.iconPink,
    coral: styles.iconCoral,
    warning: styles.iconWarning,
  }[item.color] || styles.iconPrimary;

  const Icon = item.icon;

  return (
    <div
      ref={ref}
      className={`${styles.item} ${isVisible ? styles.visible : ""}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className={`${styles.iconWrapper} ${iconColorClass}`}>
        <Icon size={22} />
      </div>
      <p className={styles.value}>
        {formatValue(displayValue)}
        {item.suffix}
      </p>
      <p className={styles.label}>{item.label}</p>
    </div>
  );
}