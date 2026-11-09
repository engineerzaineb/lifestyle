import { API_BASE_URL } from "./constants";

// Lien de partage servi par le backend : il contient les balises Open Graph
// (photo, titre, date, lieu) que Facebook, WhatsApp, Instagram... lisent pour
// afficher l'aperçu, puis redirige le visiteur vers la page de l'événement.
const BACKEND_ORIGIN = new URL(API_BASE_URL).origin;

export function lienPartageEvent(eventId) {
  return `${BACKEND_ORIGIN}/share/event/${eventId}/`;
}

// Texte détaillé : titre, date, lieu, prix
export function textePartageEvent(event) {
  const lignes = [event.titre];
  if (event.date_evenement) {
    const d = new Date(event.date_evenement);
    lignes.push(`📅 ${d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} à ${d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`);
  }
  const lieu = [event.lieu, event.ville].filter(Boolean).join(", ");
  if (lieu) lignes.push(`📍 ${lieu}`);
  const prix = event.prix_min ?? event.prix;
  if (prix !== null && prix !== undefined) {
    lignes.push(Number(prix) === 0 ? "🎟 Gratuit" : `🎟 À partir de ${Number(prix)} DT`);
  }
  return lignes.join("\n");
}
