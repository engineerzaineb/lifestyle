import api from "./api";

/**
 * Récupère une page de l'historique des notifications.
 * @param {object} options - { page = 1, filtre = "toutes" | "non_lues" }
 * @returns { results, count, page, has_next, non_lues, non_vues }
 */
export async function fetchNotifications({ page = 1, filtre = "toutes" } = {}) {
  const params = { page };
  if (filtre === "non_lues") params.filtre = "non_lues";
  const { data } = await api.get("/notifications/", { params });
  return data;
}

// La cloche a été ouverte : le badge repasse à zéro (les notifs restent non lues)
export async function marquerVues() {
  const { data } = await api.post("/notifications/vues/");
  return data;
}

// Marque une notification comme lue (au clic)
export async function marquerLue(id) {
  const { data } = await api.post(`/notifications/${id}/lue/`);
  return data;
}

// Marque toutes les notifications comme lues
export async function toutMarquerLu() {
  const { data } = await api.post("/notifications/tout-lu/");
  return data;
}
