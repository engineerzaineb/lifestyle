import { CATEGORIES } from "../utils/constants";

//détermine le statut d'affichage d'un événement
export function getEventDisplayStatus(event) {
  if (!event) return "upcoming";

  // si capacité dépassée
  if (event.places_restantes === 0) return "soldout";

  const now = new Date();
  const eventDate = new Date(event.date_evenement);
  const hoursUntil = (eventDate - now) / (1000 * 60 * 60);

  if (hoursUntil < 0) return "past";
  if (hoursUntil < 1) return "now";
  if (hoursUntil < 48) return "soon";
  return "upcoming";
}

//retourne les infos visuelles d'un statut
export function getStatusBadge(status) {
  const badges = {
    upcoming: { label: "À venir", variant: "info" },
    soon: { label: "Bientôt", variant: "warning" },
    now: { label: "🔴 En cours", variant: "danger" },
    past: { label: "Terminé", variant: "neutral" },
    soldout: { label: "Complet", variant: "danger" },
  };
  return badges[status] || badges.upcoming;
}

//message d'urgence selon les places restantes
export function getUrgencyMessage(event) {
  const total = event.capacite_totale || 0;
  const restantes = event.places_restantes;

  if (restantes === undefined || restantes === null) return null;
  if (restantes === 0) return "Complet";
  if (restantes <= 5) return `Plus que ${restantes} place${restantes > 1 ? "s" : ""} !`;
  if (total > 0 && restantes / total < 0.2) return "Dernières places";
  return null;
}

// pourcentage de remplissage 
export function getFillPercentage(event) {
  const total = event.capacite_totale || 0;
  const restantes = event.places_restantes;
  if (!total || restantes === undefined) return 0;
  return Math.round(((total - restantes) / total) * 100);
}

// récupère les infos de catégorie 
export function getCategoryInfo(event) {
  const slug = event?.categorie?.slug;
  if (!slug) return { nom: "Autre", emoji: "✨", color: "var(--color-primary)" };

  const cat = CATEGORIES[slug];
  if (!cat) {
    return {
      nom: event.categorie.nom || "Autre",
      emoji: "✨",
      color: event.categorie.couleur || "var(--color-primary)",
    };
  }

  return cat;
}

//génère le titre formatté pour le partage
export function getShareInfo(event) {
  if (!event) return { title: "", text: "", url: "" };

  return {
    title: event.titre,
    text: `${event.titre} - ${event.lieu}, ${event.ville}`,
    url: `${window.location.origin}/event/${event.id}`,
  };
}

// calcule la durée en minutes entre date_evenement et date_fin
export function getDurationMinutes(event) {
  if (!event.date_evenement || !event.date_fin) return null;
  const start = new Date(event.date_evenement);
  const end = new Date(event.date_fin);
  return Math.round((end - start) / (1000 * 60));
}

//formate la durée en texte 
export function formatDuration(minutes) {
  if (!minutes || minutes <= 0) return "";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins} min`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h${mins.toString().padStart(2, "0")}`;
}

//construit l'URL Google Maps pour un événement
export function getMapUrl(event) {
  const query = encodeURIComponent(`${event.lieu}, ${event.ville}, Tunisia`);
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

//construit l'URL "Ajouter au calendrier" Google
export function getCalendarUrl(event) {
  if (!event.date_evenement) return "";

  const start = new Date(event.date_evenement);
  const end = event.date_fin ? new Date(event.date_fin) : new Date(start.getTime() + 2 * 3600 * 1000);

  const formatDate = (d) => d.toISOString().replace(/-|:|\.\d+/g, "");

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.titre,
    dates: `${formatDate(start)}/${formatDate(end)}`,
    details: event.description || "",
    location: `${event.lieu}, ${event.ville}`,
  });

  return `https://calendar.google.com/calendar/render?${params}`;
}