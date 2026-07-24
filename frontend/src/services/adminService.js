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
// ===================== UTILISATEURS =====================

/**
 * Liste les utilisateurs avec filtres optionnels
 * @param {object} filters - { q, role, is_organisateur, is_active }
 */
export async function fetchUsers(filters = {}) {
  const params = {};
  if (filters.q && filters.q.trim().length >= 2) params.q = filters.q.trim();
  if (filters.role) params.role = filters.role;
  if (filters.is_organisateur) params.is_organisateur = filters.is_organisateur;
  if (filters.is_active) params.is_active = filters.is_active;

  const { data } = await api.get("/auth/admin/users/", { params });
  return data.results || data;
}

/** Active ou désactive un compte utilisateur */
export async function toggleUserActive(id) {
  const { data } = await api.post(`/auth/admin/users/${id}/toggle-active/`);
  return data;
}

/** Promeut ou rétrograde un organisateur */
export async function toggleUserOrganisateur(id) {
  const { data } = await api.post(`/auth/admin/users/${id}/toggle-organisateur/`);
  return data;
}

// ===================== CATÉGORIES =====================

/**
 * Liste les catégories
 * @param {string} statut - "validee" | "en_attente" | null (toutes)
 */
export async function fetchCategories(statut = null) {
  const params = statut ? { statut } : {};
  const { data } = await api.get("/categories/", { params });
  return data.results || data;
}

/** Crée une catégorie (validée d'office car créée par un admin) */
export async function createCategorie(payload) {
  const { data } = await api.post("/categories/", payload);
  return data;
}

/** Modifie une catégorie */
export async function updateCategorie(id, payload) {
  const { data } = await api.patch(`/categories/${id}/`, payload);
  return data;
}

/** Supprime une catégorie (refusé par le backend si des events l'utilisent) */
export async function deleteCategorie(id) {
  await api.delete(`/categories/${id}/`);
}

/** Valide une catégorie proposée par un organisateur */
export async function validerCategorie(id) {
  const { data } = await api.post(`/categories/${id}/valider/`);
  return data;
}

/** Refuse une proposition de catégorie */
export async function refuserCategorie(id) {
  const { data } = await api.post(`/categories/${id}/refuser/`);
  return data;
}

// ===================== STATS =====================

/** Compteurs agrégés pour la vue d'ensemble admin */
export async function fetchAdminStats() {
  const { data } = await api.get("/auth/admin/stats/");
  return data;
}