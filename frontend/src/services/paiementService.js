import api from "./api";

/*
 * Paiement en ligne (Stripe). Le navigateur ne voit jamais la carte bancaire :
 * l'utilisateur paie sur la page officielle de Stripe, puis revient sur
 * /paiement/succes ou /paiement/annule avec l'identifiant de la session.
 */

// État d'un paiement au retour de Stripe (le serveur relit Stripe si besoin)
export async function verifierPaiement(sessionId) {
  const { data } = await api.get(`/paiements/session/${encodeURIComponent(sessionId)}/`);
  return data;
}

// L'utilisateur a quitté la page de paiement : ferme la session et libère les places
export async function annulerPaiement(sessionId) {
  const { data } = await api.post(`/paiements/session/${encodeURIComponent(sessionId)}/annuler/`);
  return data;
}

// Un organisateur souscrit à un pack payant : renvoie le paiement avec `checkout_url`
export async function payerPack(packId) {
  const { data } = await api.post("/paiements/pack/", { pack_id: packId });
  return data;
}

// Historique des paiements de l'utilisateur connecté (type : "reservation" ou "pack")
export async function fetchMesPaiements(type = "") {
  const { data } = await api.get("/paiements/", { params: type ? { type } : {} });
  return data;
}

// Contrôle des billets à l'entrée (organisateur de l'événement)
export async function consulterBillet(code) {
  const { data } = await api.get(`/billets/${encodeURIComponent(code.trim())}/`);
  return data;
}

export async function validerBillet(code) {
  const { data } = await api.post(`/billets/${encodeURIComponent(code.trim())}/valider/`);
  return data;
}
