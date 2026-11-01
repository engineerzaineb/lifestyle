import api from "./api";

// =========================================================================
//  PACKS D'ABONNEMENT
// =========================================================================

// ---- Côté admin ----

// Liste tous les packs (actifs + archivés)
export async function fetchAdminPacks() {
  const { data } = await api.get("/auth/admin/packs/");
  return data.results || data;
}

// Détail d'un pack (page de modification)
export async function fetchAdminPack(id) {
  const { data } = await api.get(`/auth/admin/packs/${id}/`);
  return data;
}

// Crée un pack
export async function createPack(payload) {
  const { data } = await api.post("/auth/admin/packs/", payload);
  return data;
}

// Modifie un pack
export async function updatePack(id, payload) {
  const { data } = await api.patch(`/auth/admin/packs/${id}/`, payload);
  return data;
}

// Supprime un pack (refusé s'il est utilisé)
export async function deletePack(id) {
  const { data } = await api.delete(`/auth/admin/packs/${id}/`);
  return data;
}

// Liste tous les abonnements (admin)
export async function fetchAdminAbonnements() {
  const { data } = await api.get("/auth/admin/abonnements/");
  return data.results || data;
}

// Assigne un pack à un organisateur
export async function assignerPack(userId, packId) {
  const { data } = await api.post(`/auth/admin/users/${userId}/assigner-pack/`, {
    pack_id: packId,
  });
  return data;
}

// Retire l'abonnement d'un organisateur
export async function retirerPack(userId) {
  const { data } = await api.post(`/auth/admin/users/${userId}/retirer-pack/`);
  return data;
}

// ---- Côté organisateur ----

// Liste des packs actifs (catalogue public)
export async function fetchPacks() {
  const { data } = await api.get("/auth/packs/");
  return data.results || data;
}

// Mon abonnement actuel (ou null)
export async function fetchMonAbonnement() {
  const { data } = await api.get("/auth/mon-abonnement/");
  return data;
}