import HeroLanding from "../components/HeroLanding/HeroLanding";
import Ticker from "../components/Ticker/Ticker";
import Stats from "../components/Stats/Stats";
import CategoriesGrid from "../components/CategoriesGrid/CategoriesGrid";
import EventsGrid from "../components/EventsGrid/EventsGrid";
import Header from "../components/Header/Header";
import HowItWorks from "../components/HowItWorks/HowItWorks";
import OrganizerCTA from "../components/OrganizerCTA/OrganizerCTA";
import Testimonials from "../components/Testimonials/Testimonials";
import FAQ from "../components/FAQ/FAQ";
import CTAFinal from "../components/CTAFinal/CTAFinal";
import { mockEvents } from "../mocks/mockEvents";


export default function LandingPage() {
  
  const featuredEvents = mockEvents.slice(0, 3);

  return (
    <>
      {/* HERO — section principale d'accueil */}
      <HeroLanding />

      {/* TICKER — bandeau défilant */}
      <Ticker />

      {/* STATS — chiffres clés animés */}
      <Stats />

      {/* CATÉGORIES — grille des catégories */}
      <CategoriesGrid />

      {/* ÉVÉNEMENTS À L'AFFICHE */}
      <section style={{ padding: "80px 24px", background: "var(--color-surface)" }}>
        <div className="container">
          <Header
            eyebrow="À l'affiche"
            title={<>Les événements <em>incontournables</em></>}
            subtitle="Sélection éditoriale de la semaine"
          />
          <div style={{ marginTop: 40 }}>
            <EventsGrid events={featuredEvents} />
          </div>
        </div>
      </section>

      {/* COMMENT ÇA MARCHE */}
      <HowItWorks />

      {/* CTA ORGANISATEUR */}
      <OrganizerCTA />

      {/* TÉMOIGNAGES */}
      <Testimonials />

      {/* FAQ */}
      <FAQ />

      {/* CTA FINAL */}
      <CTAFinal />
    </>
  );
}