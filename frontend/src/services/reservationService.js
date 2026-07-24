import api from "./api";

const USE_MOCK = false;
/**
 * Normalise une réservation du backend vers la forme attendue par les composants.
 * Backend : code_reference / total_prix / items[].quantite / "annulee" / date_annulation
 * Front   : code / total / items[].quantity / "annule" / cancelled_at
 */
function normalizeReservation(r) {
  if (!r) return r;
  return {
    ...r,
    code: r.code_reference,
    total: parseFloat(r.total_prix) || 0,
    statut: r.statut === "annulee" ? "annule" : r.statut,
    cancelled_at: r.date_annulation,
    items: (r.items || []).map((it) => ({
      ...it,
      quantity: it.quantite,
    })),
    event: r.event ? { ...r.event, cover: r.event.image_url } : r.event,
  };
}
/*récupere toutes les réservations de l'utilisateur connecté*/
export async function fetchMyReservations() {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 400));
    return getMockReservations();
  }

  const { data } = await api.get("/reservations/mes-reservations/");
  // Le backend renvoie soit un tableau direct (action mes-reservations),
  // soit un objet paginé { results: [...] }. On gère les deux.
  const list = Array.isArray(data) ? data : (data.results || []);
  return list.map(normalizeReservation);
}

/*récupere une réservation par ID*/
export async function fetchReservation(id) {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 300));
    const all = getMockReservations();
    return all.find((r) => r.id === parseInt(id));
  }

  const { data } = await api.get(`/reservations/${id}/`);
  return normalizeReservation(data);
}



/*onglets de filtrage par période/statut*/
export const RESERVATION_TABS = [
  { id: "all", label: "Toutes", filter: null },
  { id: "upcoming", label: "À venir", filter: "upcoming", color: "success" },
  { id: "past", label: "Passées", filter: "past", color: "neutral" },
  { id: "cancelled", label: "Annulées", filter: "cancelled", color: "danger" },
];

/*filtrer les réservations selon l'onglet*/
export function filterByReservationTab(reservations, tabId) {
  if (!reservations) return [];

  const now = new Date();

  if (tabId === "all") return reservations;

  if (tabId === "upcoming") {
    return reservations.filter((r) => {
      if (r.statut === "annule") return false;
      return new Date(r.event.date_evenement) > now;
    });
  }

  if (tabId === "past") {
    return reservations.filter((r) => {
      if (r.statut === "annule") return false;
      return new Date(r.event.date_evenement) <= now;
    });
  }

  if (tabId === "cancelled") {
    return reservations.filter((r) => r.statut === "annule");
  }

  return reservations;
}

/*compter les réservations par onglet*/
export function countByReservationTab(reservations) {
  if (!reservations) return {};

  return {
    all: reservations.length,
    upcoming: filterByReservationTab(reservations, "upcoming").length,
    past: filterByReservationTab(reservations, "past").length,
    cancelled: filterByReservationTab(reservations, "cancelled").length,
  };
}

/*
 *statistiques globales
*/

/*calculer les stats globales de l'utilisateur*/
export function calculateUserStats(reservations) {
  if (!reservations || reservations.length === 0) {
    return {
      totalReservations: 0,
      upcomingCount: 0,
      totalSpent: 0,
      ticketsCount: 0,
    };
  }

  const active = reservations.filter((r) => r.statut !== "annule");
  const upcoming = filterByReservationTab(reservations, "upcoming");

  const totalSpent = active.reduce((sum, r) => sum + (r.total || 0), 0);
  const ticketsCount = active.reduce((sum, r) => {
    return sum + (r.items?.reduce((s, i) => s + (i.quantity || 0), 0) || 0);
  }, 0);

  return {
    totalReservations: active.length,
    upcomingCount: upcoming.length,
    totalSpent,
    ticketsCount,
  };
}


/*
 * Détermine le statut affichable d'une réservation
 * @returns "upcoming" | "today" | "past" | "cancelled"
 */
export function getReservationStatus(reservation) {
  if (reservation.statut === "annule") return "cancelled";

  const now = new Date();
  const eventDate = new Date(reservation.event.date_evenement);
  const eventEnd = reservation.event.date_fin
    ? new Date(reservation.event.date_fin)
    : new Date(eventDate.getTime() + 4 * 3600 * 1000);

  if (eventEnd < now) return "past";
  if (eventDate.toDateString() === now.toDateString()) return "today";
  return "upcoming";
}

/*Label + couleur d'un statut*/
export function getReservationStatusDisplay(status) {
  const map = {
    upcoming: { label: "À venir", color: "success" },
    today: { label: "🔴 Aujourd'hui", color: "warning" },
    past: { label: "Passé", color: "neutral" },
    cancelled: { label: "Annulé", color: "danger" },
  };
  return map[status] || map.upcoming;
}

/*
 * Vérifie si une réservation peut être annulée
 * (uniquement si > 48h avant l'événement)
 */
export function canCancelReservation(reservation) {
  if (reservation.statut === "annule") return false;

  const now = new Date();
  const eventDate = new Date(reservation.event.date_evenement);
  const hoursUntil = (eventDate - now) / (1000 * 60 * 60);

  return hoursUntil > 48;
}



/*Annule une réservation*/
export async function cancelReservation(reservationId, reason = "") {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 500));
    return { success: true };
  }

  const { data } = await api.post(`/reservations/${reservationId}/cancel/`, { reason });
  return data;
}

/*Télécharge les billets (PDF) */
export async function downloadTickets(reservationId) {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 800));
    
    return { success: true, url: `mock-tickets-${reservationId}.pdf` };
  }

  const { data } = await api.get(`/reservations/${reservationId}/tickets-pdf/`);
  return data;
}



function getMockReservations() {
  const now = Date.now();

  return [
    {
      id: 1,
      code: "ABC-1234",
      statut: "confirme",
      total: 70,
      created_at: new Date(now - 2 * 86400000).toISOString(),
      items: [
        { type_billet_nom: "Standard", quantity: 2, prix_unitaire: 35 },
      ],
      event: {
        id: 1,
        titre: "Soirée Jazz au Carthage",
        cover: "https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=400&q=80",
        date_evenement: new Date(now + 7 * 86400000).toISOString(),
        date_fin: new Date(now + 7 * 86400000 + 4 * 3600000).toISOString(),
        lieu: "La Villa Carthage",
        ville: "La Marsa",
        categorie: { slug: "musique", nom: "Musique" },
      },
    },
    {
      id: 2,
      code: "DEF-5678",
      statut: "confirme",
      total: 60,
      created_at: new Date(now - 5 * 86400000).toISOString(),
      items: [
        { type_billet_nom: "Brunch adulte", quantity: 1, prix_unitaire: 60 },
      ],
      event: {
        id: 2,
        titre: "Brunch dominical à Sidi Bou Saïd",
        cover: "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=400&q=80",
        date_evenement: new Date(now + 2 * 86400000).toISOString(),
        lieu: "Restaurant Dar Zarrouk",
        ville: "Sidi Bou Saïd",
        categorie: { slug: "food", nom: "Food" },
      },
    },
    {
      id: 3,
      code: "GHI-9012",
      statut: "confirme",
      total: 25,
      created_at: new Date(now - 30 * 86400000).toISOString(),
      items: [
        { type_billet_nom: "Place standard", quantity: 1, prix_unitaire: 25 },
      ],
      event: {
        id: 5,
        titre: "Stand-up Show Théâtre Municipal",
        cover: "https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=400&q=80",
        date_evenement: new Date(now - 5 * 86400000).toISOString(),
        lieu: "Théâtre Municipal",
        ville: "Tunis",
        categorie: { slug: "spectacle", nom: "Spectacle" },
      },
    },
    {
      id: 4,
      code: "JKL-3456",
      statut: "confirme",
      total: 0,
      created_at: new Date(now - 10 * 86400000).toISOString(),
      items: [
        { type_billet_nom: "Entrée libre", quantity: 1, prix_unitaire: 0 },
      ],
      event: {
        id: 3,
        titre: "Vernissage Galerie Selma",
        cover: "https://images.unsplash.com/photo-1577720580479-7d839d829c73?w=400&q=80",
        date_evenement: new Date(now + 3 * 86400000).toISOString(),
        lieu: "Galerie Selma Feriani",
        ville: "Tunis",
        categorie: { slug: "art", nom: "Art" },
      },
    },
    {
      id: 5,
      code: "MNO-7890",
      statut: "annule",
      total: 35,
      created_at: new Date(now - 20 * 86400000).toISOString(),
      cancelled_at: new Date(now - 15 * 86400000).toISOString(),
      items: [
        { type_billet_nom: "Standard", quantity: 1, prix_unitaire: 35 },
      ],
      event: {
        id: 4,
        titre: "Marathon de la Médina",
        cover: "https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?w=400&q=80",
        date_evenement: new Date(now + 20 * 86400000).toISOString(),
        lieu: "Médina de Tunis",
        ville: "Tunis",
        categorie: { slug: "sport", nom: "Sport" },
      },
    },
  ];
}