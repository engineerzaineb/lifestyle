import { useState, useEffect, useRef } from "react";
import { Compass, Ticket, Sparkles } from "lucide-react";
import Header from "../Header/Header";
import styles from "./HowItWorks.module.css";


export default function HowItWorks({ showHeader = true, steps }) {
  const defaultSteps = [
    {
      icon: Compass,
      title: "Découvrez",
      desc: "Explorez les événements près de vous ou laissez notre IA vous suggérer ce qui correspond à vos goûts.",
      color: "primary",
    },
    {
      icon: Ticket,
      title: "Réservez",
      desc: "Achetez votre billet en quelques clics. Paiement sécurisé par carte ou D17.",
      color: "pink",
    },
    {
      icon: Sparkles,
      title: "Profitez",
      desc: "Recevez votre billet par email avec QR code. Présentez-le à l'entrée et profitez de votre soirée.",
      color: "coral",
    },
  ];

  const list = steps || defaultSteps;

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        {showHeader && (
          <Header
            eyebrow="Simple comme bonjour"
            title={<>Trois étapes pour <em>vivre l'instant</em></>}
            subtitle="Pas besoin d'être expert. Notre app fait le travail pour vous."
          />
        )}

        <div className={styles.grid}>
          {list.map((step, index) => (
            <Step key={index} step={step} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Step({ step, index }) {
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

  const iconClass = {
    primary: styles.iconPrimary,
    pink: styles.iconPink,
    coral: styles.iconCoral,
  }[step.color] || styles.iconPrimary;

  const numberClass = {
    primary: styles.numberPrimary,
    pink: styles.numberPink,
    coral: styles.numberCoral,
  }[step.color] || styles.numberPrimary;

  const Icon = step.icon;

  return (
    <div
      ref={ref}
      className={`${styles.step} ${isVisible ? styles.visible : ""}`}
      style={{ transitionDelay: `${index * 150}ms` }}
    >
      <div className={styles.stepContent}>
        <div className={styles.iconWrapper}>
          <div className={`${styles.stepIcon} ${iconClass}`}>
            <Icon size={26} />
          </div>
          <span className={`${styles.stepNumber} ${numberClass}`}>
            {index + 1}
          </span>
        </div>
        <h3 className={styles.stepTitle}>{step.title}</h3>
        <p className={styles.stepDesc}>{step.desc}</p>
      </div>
    </div>
  );
}