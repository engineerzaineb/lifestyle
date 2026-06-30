import api from "./api";

/**
 * Récupère la liste de tous les intérêts officiels disponibles
 * Endpoint public, pas besoin d'auth
 */
export async function fetchInterets() {
  const { data } = await api.get("/auth/interets/");
  return data;
}

/**
 * Met à jour les intérêts du user connecté
 * @param {object} payload - { interet_ids: [1,2,3], custom_interets: ["Surf"] }
 * @returns user complet avec ses nouveaux intérêts
 */
export async function updateMyInterets(payload) {
  const { data } = await api.patch("/auth/me/interets/", payload);
  return data;
}