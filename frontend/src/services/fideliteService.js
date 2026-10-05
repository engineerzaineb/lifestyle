import api from "./api";

// Récupère le palier de fidélité du user connecté 
export async function fetchMonPalier() {
  const { data } = await api.get("/fidelite/me/");
  return data;
}