import api from "./api";

// Mode mock désactivé : on parle au vrai backend
const USE_MOCK = false;

// Récupère la liste des événements avec filtres optionnels
export async function fetchEvents(filters = {}) {
  if (USE_MOCK) return { results: [], count: 0 };
  const { data } = await api.get("/events/", { params: filters });
  return data;
}

// Stats réelles du dashboard organisateur (vues, inscriptions, revenus,
// taux de remplissage, avec variation période sur période).
export async function fetchOrganizerStats() {
  if (USE_MOCK) return null;
  const { data } = await api.get("/events/stats-organisateur/");
  return data;
}

// Dashboard détaillé de l'organisateur : série temporelle (graphique),
// réservations récentes, stats par event, taux de conversion.
// periode = 7, 30 ou 365 jours.
export async function fetchOrganizerDashboard(periode = 30) {
  if (USE_MOCK) return null;
  const { data } = await api.get("/events/dashboard-detaille/", {
    params: { periode },
  });
  return data;
}

// Profil démographique (ville / âge / genre) des utilisateurs qui réservent
// et qui consultent les événements de l'organisateur.
export async function fetchOrganizerDemographics() {
  if (USE_MOCK) return null;
  const { data } = await api.get("/events/demographie/");
  return data;
}

// Récupère un événement par ID.
// forEdit=true : charge aussi les events non publiés de l'organisateur
// (pour l'édition). Sinon, seule la version publique (publié + validé) est servie.
export async function fetchEvent(id, forEdit = false) {
  if (USE_MOCK) return null;
  const params = forEdit ? { edit: "true" } : {};
  const { data } = await api.get(`/events/${id}/`, { params });
  return data;
}

// Recommandations personnalisées.
// On utilise d'abord la reco COMPORTEMENTALE (basée sur les actions réelles :
// réservations, favoris, vues, recherches). Si elle échoue, on retombe sur
// l'ancienne reco (intérêts déclarés + ville) pour ne jamais casser la page.
export async function fetchRecommendations() {
  if (USE_MOCK) return { results: [], count: 0 };
  try {
    const { data } = await api.get("/events/recommandations-perso/");
    return data;
  } catch {
    const { data } = await api.get("/events/recommandations/");
    return data;
  }
}

/**
 * Découvertes : events de catégories qui ne sont PAS dans les intérêts du user
 * Pour élargir ses horizons (sortir de la bulle)
 */
export async function fetchDiscoveries() {
  if (USE_MOCK) return { results: [], count: 0 };
  const { data } = await api.get("/events/decouvertes/");
  return data;
}

// Suggestions d'autocomplétion pour la barre de recherche de la navbar.
// Renvoie { events: [{id, titre}], categories: [{id, nom, slug}] }
export async function fetchSuggestions(q) {
  if (USE_MOCK || !q || q.trim().length < 2) {
    return { events: [], categories: [] };
  }
  const { data } = await api.get("/events/suggestions/", { params: { q } });
  return data;
}

// Events populaires (en attendant le modèle Vue : tri par capacite)

export async function fetchPopular() {
  if (USE_MOCK) return { results: [], count: 0 };
  const { data } = await api.get("/events/populaires/");
  return data;
}

// Events dans les 7 prochains jours (sentiment d'urgence)

export async function fetchSoon() {
  if (USE_MOCK) return { results: [], count: 0 };
  const { data } = await api.get("/events/bientot/");
  return data;
}

// Events similaires à un événement donné

export async function fetchSimilarEvents(eventId) {
  if (USE_MOCK) return { results: [], count: 0 };
  const { data } = await api.get(`/events/${eventId}/similaires/`);
  return data;
}

// Crée un événement (organisateur)

export async function createEvent(eventData) {
  if (USE_MOCK) return { id: Date.now(), ...eventData };
  const { data } = await api.post("/events/", eventData);
  return data;
}

// Met à jour un événement

export async function updateEvent(id, eventData) {
  if (USE_MOCK) return { id, ...eventData };
  const { data } = await api.patch(`/events/${id}/`, eventData);
  return data;
}

// Supprime un événement

export async function deleteEvent(id) {
  if (USE_MOCK) return { success: true };
  await api.delete(`/events/${id}/`);
  return { success: true };
}

// Récupère les catégories d'événements

export async function fetchCategories() {
  if (USE_MOCK) return [];
  const { data } = await api.get("/categories/");
  return data.results || data;
}
// Récupère MES brouillons d'événements
 
export async function fetchMyBrouillons() {
  if (USE_MOCK) return [];
  const { data } = await api.get("/events/", { params: { mes_brouillons: "true" } });
  return data.results || data;
}

// Crée un brouillon d'événement (champs optionnels sauf titre)

export async function createBrouillon(brouillonData) {
  if (USE_MOCK) return { id: Date.now(), ...brouillonData };
  const payload = { ...brouillonData, statut: "brouillon", is_draft: true };
  const { data } = await api.post("/events/", payload);
  return data;
}

// Met à jour un brouillon
export async function updateBrouillon(id, brouillonData) {
  if (USE_MOCK) return { id, ...brouillonData };
  const { data } = await api.patch(`/events/${id}/`, brouillonData);
  return data;
}