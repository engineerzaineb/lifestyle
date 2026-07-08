import api from "./api";

// Mode mock désactivé : on parle au vrai backend
const USE_MOCK = false;

/**
 * Récupère la liste des événements avec filtres optionnels
 */
export async function fetchEvents(filters = {}) {
  if (USE_MOCK) return { results: [], count: 0 };
  const { data } = await api.get("/events/", { params: filters });
  return data;
}

/**
 * Récupère un événement par ID
 */
export async function fetchEvent(id) {
  if (USE_MOCK) return null;
  const { data } = await api.get(`/events/${id}/`);
  return data;
}

/**
 * Recommandations personnalisées : intérêts + ville
 */
export async function fetchRecommendations() {
  if (USE_MOCK) return { results: [], count: 0 };
  const { data } = await api.get("/events/recommandations/");
  return data;
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

/**
 * Events populaires (en attendant le modèle Vue : tri par capacite)
 */
export async function fetchPopular() {
  if (USE_MOCK) return { results: [], count: 0 };
  const { data } = await api.get("/events/populaires/");
  return data;
}

/**
 * Events dans les 7 prochains jours (sentiment d'urgence)
 */
export async function fetchSoon() {
  if (USE_MOCK) return { results: [], count: 0 };
  const { data } = await api.get("/events/bientot/");
  return data;
}

/**
 * Events similaires à un événement donné
 */
export async function fetchSimilarEvents(eventId) {
  if (USE_MOCK) return { results: [], count: 0 };
  const { data } = await api.get(`/events/${eventId}/similaires/`);
  return data;
}

/**
 * Crée un événement (organisateur)
 */
export async function createEvent(eventData) {
  if (USE_MOCK) return { id: Date.now(), ...eventData };
  const { data } = await api.post("/events/", eventData);
  return data;
}

/**
 * Met à jour un événement
 */
export async function updateEvent(id, eventData) {
  if (USE_MOCK) return { id, ...eventData };
  const { data } = await api.patch(`/events/${id}/`, eventData);
  return data;
}

/**
 * Supprime un événement
 */
export async function deleteEvent(id) {
  if (USE_MOCK) return { success: true };
  await api.delete(`/events/${id}/`);
  return { success: true };
}

/**
 * Récupère les catégories d'événements
 */
export async function fetchCategories() {
  if (USE_MOCK) return [];
  const { data } = await api.get("/categories/");
  return data.results || data;
}
/**
 * Récupère MES brouillons d'événements
 */
export async function fetchMyBrouillons() {
  if (USE_MOCK) return [];
  const { data } = await api.get("/events/", { params: { mes_brouillons: "true" } });
  return data.results || data;
}

/**
 * Crée un brouillon d'événement (champs optionnels sauf titre)
 */
export async function createBrouillon(brouillonData) {
  if (USE_MOCK) return { id: Date.now(), ...brouillonData };
  const payload = { ...brouillonData, statut: "brouillon", is_draft: true };
  const { data } = await api.post("/events/", payload);
  return data;
}

/**
 * Met à jour un brouillon
 */
export async function updateBrouillon(id, brouillonData) {
  if (USE_MOCK) return { id, ...brouillonData };
  const { data } = await api.patch(`/events/${id}/`, brouillonData);
  return data;
}