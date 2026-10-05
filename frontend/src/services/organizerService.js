import api from "./api";

const USE_MOCK = false;


/*
 * récupère tous les événements de l'organisateur connecté
 * @returns {Array} liste des événements
 */
export async function fetchMyEvents() {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 400));
    const { mockEvents } = await import("../mocks/mockEvents");
    return generateMockOrganizerEvents(mockEvents);
  }

  const { data } = await api.get("/events/", { params: { mes_events: true } });
  return data.results || [];
}

// génère des événements avec des statuts variés 
function generateMockOrganizerEvents(baseEvents) {
  // Variations de statuts pour avoir des brouillons, publiés, etc.
  const statuses = ["publie", "brouillon", "en_attente", "brouillon", "brouillon", "termine"];

  return baseEvents.map((e, i) => ({
    ...e,
    statut: statuses[i] || "brouillon",
    vues: Math.floor(Math.random() * 3000) + 500,
    inscriptions: Math.max(0, e.capacite_totale - (e.places_restantes || 0)),
    revenue: Math.max(0, e.capacite_totale - (e.places_restantes || 0)) * (e.prix_min || 25),
    created_at: new Date(Date.now() - i * 86400000 * 5).toISOString(),
  }));
}



// liste des onglets de filtrage par statut
export const STATUS_TABS = [
  { id: "all", label: "Tous", statuses: null },
  { id: "publie", label: "Publiés", statuses: ["publie"], color: "success" },
  { id: "en_attente", label: "En attente", statuses: ["en_attente"], color: "warning" },
  { id: "brouillon", label: "Brouillons", statuses: ["brouillon"], color: "neutral" },
  { id: "termine", label: "Terminés", statuses: ["termine"], color: "neutral" },
  { id: "refuse", label: "Refusés", statuses: ["refuse", "annule"], color: "danger" },
];

/*
 * filtre une liste d'événements selon l'onglet de statut sélectionné
 * @param {Array} events - liste d'événements*/
export function filterByStatusTab(events, tabId) {
  if (!events) return [];
  const tab = STATUS_TABS.find((t) => t.id === tabId);

  
  if (!tab || !tab.statuses) return events;

  return events.filter((e) => tab.statuses.includes(e.statut));
}

// Compte les événements par catégorie de statut
export function countByStatus(events) {
  if (!events) return {};
  const counts = { all: events.length };

  STATUS_TABS.forEach((tab) => {
    if (tab.statuses) {
      counts[tab.id] = events.filter((e) => tab.statuses.includes(e.statut)).length;
    }
  });

  return counts;
}


// Calcule les stats globales de l'organisateur
export function calculateGlobalStats(events) {
  if (!events || events.length === 0) {
    return {
      totalEvents: 0,
      publishedEvents: 0,
      totalViews: 0,
      totalRegistrations: 0,
      totalRevenue: 0,
      avgFillRate: 0,
    };
  }

  const published = events.filter((e) => e.statut === "publie");

  const totalViews = events.reduce((sum, e) => sum + (e.vues || 0), 0);
  const totalRegistrations = events.reduce((sum, e) => sum + (e.inscriptions || 0), 0);
  const totalRevenue = events.reduce((sum, e) => sum + (e.revenue || 0), 0);

  // taux de remplissage moyen 
  let avgFillRate = 0;
  if (published.length > 0) {
    const totalFill = published.reduce((sum, e) => {
      if (!e.capacite_totale) return sum;
      return sum + ((e.inscriptions || 0) / e.capacite_totale) * 100;
    }, 0);
    avgFillRate = Math.round(totalFill / published.length);
  }

  return {
    totalEvents: events.length,
    publishedEvents: published.length,
    totalViews,
    totalRegistrations,
    totalRevenue,
    avgFillRate,
  };
}

/*
 * recherche textuelle dans les événements
 * Cherche dans titre, lieu, ville
 */
export function searchEvents(events, query) {
  if (!query || !events) return events;
  const q = query.toLowerCase().trim();
  return events.filter(
    (e) =>
      e.titre?.toLowerCase().includes(q) ||
      e.lieu?.toLowerCase().includes(q) ||
      e.ville?.toLowerCase().includes(q)
  );
}

//options de tri pour la page OrganizerEvents
export const ORGANIZER_SORT_OPTIONS = [
  { value: "recent", label: "Plus récents" },
  { value: "oldest", label: "Plus anciens" },
  { value: "popular", label: "Plus populaires" },
  { value: "revenue", label: "Revenus (décroissant)" },
  { value: "date_event", label: "Date événement" },
];

//trie les événements selon le critère choisi
export function sortOrganizerEvents(events, sortBy) {
  if (!events) return [];
  const sorted = [...events];

  switch (sortBy) {
    case "oldest":
      return sorted.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    case "popular":
      return sorted.sort((a, b) => (b.vues || 0) - (a.vues || 0));
    case "revenue":
      return sorted.sort((a, b) => (b.revenue || 0) - (a.revenue || 0));
    case "date_event":
      return sorted.sort((a, b) => new Date(a.date_evenement) - new Date(b.date_evenement));
    case "recent":
    default:
      return sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }
}


//retourne le label et la couleur d'un statut
export function getStatusDisplay(statut) {
  const map = {
    publie: { label: "Publié", color: "success" },
    en_attente: { label: "En attente", color: "warning" },
    brouillon: { label: "Brouillon", color: "neutral" },
    refuse: { label: "Refusé", color: "danger" },
    annule: { label: "Annulé", color: "danger" },
    termine: { label: "Terminé", color: "neutral" },
  };
  return map[statut] || { label: statut, color: "neutral" };
}

// liste des actions disponibles selon le statut de l'événement
export function getAvailableActions(statut) {
  const actions = {
    publie: ["view", "edit", "duplicate", "stats", "cancel"],
    en_attente: ["view", "edit", "duplicate", "delete"],
    brouillon: ["edit", "duplicate", "publish", "delete"],
    refuse: ["view", "edit", "duplicate", "delete"],
    annule: ["view", "duplicate", "delete"],
    termine: ["view", "duplicate", "stats"],
  };
  return actions[statut] || [];
}


//supprime un événement
export async function deleteMyEvent(eventId) {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 400));
    return { success: true };
  }

  await api.delete(`/events/${eventId}/`);
  return { success: true };
}

// duplique un événement 
export async function duplicateEvent(eventId) {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 400));
    return { id: Date.now(), success: true };
  }

  const { data } = await api.post(`/events/${eventId}/duplicate/`);
  return data;
}

//annule un événement publié
export async function cancelEvent(eventId, reason = "") {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 400));
    return { success: true };
  }

  const { data } = await api.post(`/events/${eventId}/cancel/`, { reason });
  return data;
}

// publie un brouillon 
export async function publishDraft(eventId) {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 400));
    return { success: true };
  }

  const { data } = await api.post(`/events/${eventId}/publish/`);
  return data;
}