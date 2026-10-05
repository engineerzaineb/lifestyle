import api from "./api";

//crée une sélection vide pour un événement
export function createEmptySelection(tickets) {
  if (!tickets) return {};
  const sel = {};
  tickets.forEach((t) => {
    sel[t.id || t.nom] = 0;
  });
  return sel;
}

//met à jour la quantité d'un billet dans la sélection
export function updateQuantity(selection, ticketKey, delta, maxPerTicket = 10) {
  const current = selection[ticketKey] || 0;
  const newValue = Math.max(0, Math.min(maxPerTicket, current + delta));
  return { ...selection, [ticketKey]: newValue };
}

//compte le nombre total de billets sélectionnés
export function getTotalQuantity(selection) {
  if (!selection) return 0;
  return Object.values(selection).reduce((sum, q) => sum + (q || 0), 0);
}

//calcule le prix total de la sélection
export function calculateTotal(selection, tickets) {
  if (!tickets || !selection) return 0;

  return tickets.reduce((total, ticket) => {
    const key = ticket.id || ticket.nom;
    const qty = selection[key] || 0;
    const prix = parseFloat(ticket.prix) || 0;
    return total + qty * prix;
  }, 0);
}

//calcule l'économie réalisée (si bons plans)
export function calculateSavings(selection, tickets) {
  if (!tickets || !selection) return 0;

  return tickets.reduce((total, ticket) => {
    if (!ticket.is_bon_plan || !ticket.prix_original) return total;
    const key = ticket.id || ticket.nom;
    const qty = selection[key] || 0;
    const original = parseFloat(ticket.prix_original) || 0;
    const current = parseFloat(ticket.prix) || 0;
    return total + qty * (original - current);
  }, 0);
}

//vérifie si la sélection est valide pour réserver
export function isSelectionValid(selection) {
  return getTotalQuantity(selection) > 0;
}

//format de la sélection pour l'API
export function formatSelectionForAPI(selection, tickets) {
  if (!tickets || !selection) return [];
  return tickets
    .map((ticket) => {
      const key = ticket.id || ticket.nom;
      const qty = selection[key] || 0;
      if (qty === 0) return null;
      // Format attendu par le backend : { type_billet, quantite }
      return {
        type_billet: ticket.id,
        quantite: qty,
      };
    })
    .filter(Boolean);
}

//crée une réservation via l'API
export async function createReservation(eventId, selection, tickets) {
  const payload = {
    event_id: eventId,
    items: formatSelectionForAPI(selection, tickets),
  };
  // Note : on n'envoie plus `total`, le backend le recalcule côté serveur
  // pour éviter la fraude (client qui envoie un total = 0).
  const { data } = await api.post("/reservations/", payload);
  return data;
}