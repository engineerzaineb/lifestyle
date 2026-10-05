import api from "./api";

// Récupère les notifications + le nombre de non-lues 
export async function fetchNotifications() {
  const { data } = await api.get("/notifications/");
  return data; // { results: [...], non_lues: N }
}

// Marque une notification comme lue 
export async function marquerLue(id) {
  const { data } = await api.post(`/notifications/${id}/lue/`);
  return data;
}

// Marque toutes les notifications comme lues 
export async function toutMarquerLu() {
  const { data } = await api.post("/notifications/tout-lu/");
  return data;
}