import api from "./api";

/* Ajoute un événement aux favoris */
export async function addFavori(eventId) {
  const { data } = await api.post("/favoris/", { event_id: eventId });
  return data;
}

/* Retire un événement des favoris */
export async function removeFavori(eventId) {
  const { data } = await api.delete(`/favoris/${eventId}/`);
  return data;
}

/* Bascule : ajoute si absent, retire si présent */
export async function toggleFavori(eventId, isCurrentlyFavori) {
  return isCurrentlyFavori ? removeFavori(eventId) : addFavori(eventId);
}

/* Récupère tous les événements favoris de l'utilisateur */
export async function fetchFavoris() {
  const { data } = await api.get("/favoris/");
  return data.results || data;
}