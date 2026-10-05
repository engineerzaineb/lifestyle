// crée un nouveau billet vide avec les valeurs par défaut
export function createEmptyTicket(defaults = {}) {
  return {
    nom: "",
    prix: "",
    capacite: "",
    is_bon_plan: false,
    prix_original: "",
    pourcentage_reduction: 0,
    ...defaults,
  };
}

/*
 * calcule le pourcentage de réduction entre prix original et prix actuel
 * @param {number|string} prixOriginal
 * @param {number|string} prixActuel
 * @returns {number} pourcentage arrondi (0-100)
 */
export function calculateReduction(prixOriginal, prixActuel) {
  const original = parseFloat(prixOriginal);
  const current = parseFloat(prixActuel);

  if (!original || isNaN(original) || original <= 0) return 0;
  if (isNaN(current) || current < 0) return 0;
  if (current >= original) return 0;

  return Math.round(((original - current) / original) * 100);
}

/*
 * maj un billet avec une valeur, recalcule la réduction si nécessaire
 * @param {object} ticket - le billet à modifier
 * @param {string} field - le champ à modifier
 * @param {any} value - la nouvelle valeur
 * @returns {object} le billet mis à jour
 */
export function updateTicketField(ticket, field, value) {
  const updated = { ...ticket, [field]: value };

  // recalcul automatique du % si prix change
  if (field === "prix_original" || field === "prix") {
    updated.pourcentage_reduction = calculateReduction(
      updated.prix_original,
      updated.prix
    );
  }

  // si on désactive le bon plan, on remet à zéro le prix original
  if (field === "is_bon_plan" && value === false) {
    updated.prix_original = "";
    updated.pourcentage_reduction = 0;
  }

  return updated;
}

/*
 * valider un billet
 * @returns {object} { isValid, errors: { [field]: message } }
 */
export function validateTicket(ticket, index = 0) {
  const errors = {};
  const prefix = `billet_${index}`;

  // Nom obligatoire
  if (!ticket.nom || !ticket.nom.trim()) {
    errors[`${prefix}_nom`] = "Nom requis";
  }

  // Prix obligatoire (peut être 0 = gratuit)
  if (ticket.prix === "" || ticket.prix === null || ticket.prix === undefined) {
    errors[`${prefix}_prix`] = "Prix requis (0 si gratuit)";
  } else if (parseFloat(ticket.prix) < 0) {
    errors[`${prefix}_prix`] = "Le prix ne peut pas être négatif";
  }

  // capacité obligatoire et > 0
  if (!ticket.capacite || parseInt(ticket.capacite) < 1) {
    errors[`${prefix}_capacite`] = "Capacité requise (minimum 1)";
  }

  // Si bon plan : prix_original doit etre > prix
  if (ticket.is_bon_plan) {
    const original = parseFloat(ticket.prix_original);
    const current = parseFloat(ticket.prix);

    if (!ticket.prix_original || isNaN(original)) {
      errors[`${prefix}_prix_original`] = "Prix d'origine requis pour un bon plan";
    } else if (original <= current) {
      errors[`${prefix}_prix_original`] = "Doit être supérieur au prix actuel";
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/*
 * Valider une liste de billets
 * @returns {object} { isValid, errors }
 */
export function validateTickets(tickets) {
  if (!tickets || tickets.length === 0) {
    return {
      isValid: false,
      errors: { _global: "Au moins un type de billet est requis" },
    };
  }

  let allErrors = {};

  tickets.forEach((ticket, i) => {
    const { errors } = validateTicket(ticket, i);
    allErrors = { ...allErrors, ...errors };
  });

  return {
    isValid: Object.keys(allErrors).length === 0,
    errors: allErrors,
  };
}

// calculer la capacité totale d'un événement à partir de ses billets
export function getTotalCapacity(tickets) {
  if (!tickets || tickets.length === 0) return 0;
  return tickets.reduce((total, t) => total + (parseInt(t.capacite) || 0), 0);
}

/*
 * calcule le prix minimum parmi tous les billets
 * utile pour afficher "À partir de X DT" sur les cards
 */
export function getMinPrice(tickets) {
  if (!tickets || tickets.length === 0) return 0;
  const prices = tickets
    .map((t) => parseFloat(t.prix))
    .filter((p) => !isNaN(p) && p >= 0);
  return prices.length > 0 ? Math.min(...prices) : 0;
}

//Verifier si l'événement a au moins un bon plan
export function hasBonPlan(tickets) {
  if (!tickets || tickets.length === 0) return false;
  return tickets.some((t) => t.is_bon_plan && t.pourcentage_reduction > 0);
}

//retourne le pourcentage maximum de réduction parmi tous les billets
export function getMaxReduction(tickets) {
  if (!tickets || tickets.length === 0) return 0;
  const reductions = tickets
    .filter((t) => t.is_bon_plan)
    .map((t) => t.pourcentage_reduction || 0);
  return reductions.length > 0 ? Math.max(...reductions) : 0;
}

//filtrer uniquement les billets en bon plan
export function getDeals(tickets) {
  if (!tickets || tickets.length === 0) return [];
  return tickets.filter((t) => t.is_bon_plan && t.pourcentage_reduction > 0);
}

/*
 * format les billets pour les envoyer à l'API Django
 * convertir les strings en nombres, nettoie les champs inutiles
 */
export function formatTicketsForAPI(tickets) {
  return tickets.map((t) => {
    const formatted = {
      nom: t.nom.trim(),
      prix: parseFloat(t.prix) || 0,
      capacite: parseInt(t.capacite) || 0,
      is_bon_plan: !!t.is_bon_plan,
    };

    if (t.is_bon_plan && t.prix_original) {
      formatted.prix_original = parseFloat(t.prix_original);
    }

    return formatted;
  });
}

/*
 * parse les billets reçus de l'API vers le format du formulaire
 * convertir les nombres en strings pour les inputs
 */
export function parseTicketsFromAPI(apiTickets) {
  if (!apiTickets || !Array.isArray(apiTickets)) {
    return [createEmptyTicket({ nom: "Standard" })];
  }

  return apiTickets.map((t) => ({
    nom: t.nom || "",
    prix: t.prix?.toString() || "",
    capacite: t.capacite?.toString() || "",
    is_bon_plan: !!t.is_bon_plan,
    prix_original: t.prix_original?.toString() || "",
    pourcentage_reduction: t.prix_original
      ? calculateReduction(t.prix_original, t.prix)
      : 0,
  }));
}

//calculer le prix total pour une réservation
export function calculateBookingTotal(selections, tickets) {
  if (!selections || !tickets) return 0;

  return selections.reduce((total, sel) => {
    const ticket = tickets.find((t) => t.id === sel.ticketId || t.nom === sel.nom);
    if (!ticket) return total;
    const prix = parseFloat(ticket.prix) || 0;
    return total + prix * sel.quantity;
  }, 0);
}