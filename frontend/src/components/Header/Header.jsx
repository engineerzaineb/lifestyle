import { useState, useEffect, useRef } from "react";
import styles from "./Header.module.css";


export default function Header({
  eyebrow,
  title,
  subtitle,
  align = "center",
  showStar = true,
  action,
}) {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  // Animation au scroll : fade-up quand le composant entre dans le viewport
  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  // Mode split : titre + action à droite
  if (action) {
    return (
      <div
        ref={ref}
        className={`${styles.wrapper} ${styles.alignLeft} ${styles.split} ${isVisible ? styles.visible : ""}`}
      >
        <div className={styles.splitContent}>
          <HeaderContent
            eyebrow={eyebrow}
            title={title}
            subtitle={subtitle}
            showStar={showStar}
          />
        </div>
        <div>{action}</div>
      </div>
    );
  }

  // Mode normal (centré ou aligné à gauche)
  const alignClass =
    align === "left" ? styles.alignLeft : styles.alignCenter;

  return (
    <div
      ref={ref}
      className={`${styles.wrapper} ${alignClass} ${isVisible ? styles.visible : ""}`}
    >
      <HeaderContent
        eyebrow={eyebrow}
        title={title}
        subtitle={subtitle}
        showStar={showStar}
      />
    </div>
  );
}


function HeaderContent({ eyebrow, title, subtitle, showStar }) {
  return (
    <>
      {eyebrow && (
        <p className={styles.eyebrow}>
          {showStar && <span className={styles.eyebrowStar}>✦</span>}
          {eyebrow}
        </p>
      )}
      {title && <h2 className={styles.title}>{title}</h2>}
      {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
    </>
  );
}