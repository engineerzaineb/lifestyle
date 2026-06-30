import api from "./api";

/**
 * Récupère la liste des demandes d'organisateurs
 * @param {string} statut - filtre optionnel (en_attente, valide, refuse)
 */
export async function fetchDemandes(statut = null) {
  const params = statut ? { statut } : {};
  const { data } = await api.get("/auth/admin/demandes-organisateur/", { params });
  return data.results || data;
}

/**
 * Récupère le détail d'une demande (avec les brouillons du user)
 */
export async function fetchDemandeDetail(id) {
  const { data } = await api.get(`/auth/admin/demandes-organisateur/${id}/`);
  return data;
}

/**
 * Valide une demande (le user devient organisateur)
 */
export async function validerDemande(id) {
  const { data } = await api.post(`/auth/admin/demandes-organisateur/${id}/valider/`);
  return data;
}

/**
 * Refuse une demande (avec motif obligatoire)
 */
export async function refuserDemande(id, motif) {
  const { data } = await api.post(`/auth/admin/demandes-organisateur/${id}/refuser/`, { motif });
  return data;
}

/**
 * Récupère les événements à modérer selon leur statut
 * L'admin voit tout (le backend bypass le filtre de rôle pour les admins)
 * @param {string} statut - en_attente, publie, refuse
 */
export async function fetchEventsAModerer(statut = "en_attente") {
  const { data } = await api.get("/events/", { params: { statut } });
  return data.results || data;
}

/**
 * Valide un événement (passe en publié)
 */
export async function validerEvent(id) {
  const { data } = await api.post(`/events/${id}/valider/`);
  return data;
}

/**
 * Refuse un événement (avec motif obligatoire)
 */
export async function refuserEvent(id, motif) {
  const { data } = await api.post(`/events/${id}/refuser/`, { motif });
  return data;
}