import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, MessageCircle, ArrowRight } from "lucide-react";
import Header from "../Header/Header";
import styles from "./FAQ.module.css";


export default function FAQ({
  showHeader = true,
  faqs,
  showContactCard = true,
}) {
  const defaultFaqs = [
    {
      q: "Eventu est-il gratuit pour les utilisateurs ?",
      a: "Oui ! Créer un compte et utiliser l'application est entièrement gratuit. Vous ne payez que le prix des billets que vous achetez, sans frais cachés.",
    },
    {
      q: "Comment fonctionne la recommandation par IA ?",
      a: "Notre IA analyse vos centres d'intérêt, votre localisation et les événements que vous avez aimés pour vous suggérer ceux qui correspondent le mieux à vos goûts.",
    },
    {
      q: "Puis-je annuler ma réservation ?",
      a: "Oui, vous pouvez annuler gratuitement jusqu'à 48 heures avant l'événement. Le remboursement est automatique et arrive sous 3-5 jours ouvrés.",
    },
    {
      q: "Comment devenir organisateur ?",
      a: "Cliquez sur S'inscrire et choisissez 'Organiser'. La publication est gratuite. Petite commission uniquement sur les événements payants.",
    },
    {
      q: "Quels modes de paiement acceptez-vous ?",
      a: "Carte bancaire, D17, e-DINAR, Apple Pay et notre portefeuille interne Eventu. Tous sécurisés par Stripe.",
    },
    {
      q: "Les événements sont-ils vérifiés ?",
      a: "Chaque événement est vérifié par notre équipe avant publication. Les organisateurs vérifiés ont un badge bleu sur leur profil.",
    },
  ];

  const list = faqs || defaultFaqs;
  const [openIndex, setOpenIndex] = useState(0); // Le premier est ouvert par défaut

  const handleToggle = (index) => {
    setOpenIndex(openIndex === index ? -1 : index);
  };

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        {showHeader && (
          <Header
            eyebrow="FAQ"
            title={<>Questions <em>fréquentes</em></>}
            subtitle="Tout ce que vous voulez savoir avant de commencer"
          />
        )}

        <div className={styles.list}>
          {list.map((faq, index) => (
            <FAQItem
              key={index}
              question={faq.q}
              answer={faq.a}
              isOpen={openIndex === index}
              onToggle={() => handleToggle(index)}
            />
          ))}
        </div>

        {showContactCard && (
          <div className={styles.contactCard}>
            <div className={styles.contactIcon}>
              <MessageCircle size={22} />
            </div>
            <div className={styles.contactText}>
              <p className={styles.contactTitle}>Pas trouvé votre réponse ?</p>
              <p className={styles.contactDesc}>
                Notre équipe vous répond en moins de 24h. Contactez-nous directement.
              </p>
            </div>
            <Link to="/contact" className={styles.contactBtn}>
              Nous contacter
              <ArrowRight size={13} />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

/* ============================================================
   FAQItem — un item d'accordéon
   ============================================================ */
function FAQItem({ question, answer, isOpen, onToggle }) {
  return (
    <div className={`${styles.item} ${isOpen ? styles.open : ""}`}>
      <button
        onClick={onToggle}
        className={styles.question}
        aria-expanded={isOpen}
      >
        <span className={styles.questionText}>{question}</span>
        <span className={styles.toggleIcon}>
          <ChevronDown size={16} />
        </span>
      </button>

      <div className={styles.answerWrapper}>
        <p className={styles.answer}>{answer}</p>
      </div>
    </div>
  );
}