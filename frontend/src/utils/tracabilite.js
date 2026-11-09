// Dates du cycle de vie d'un événement (soumission, acceptation, refus...).

export const formatDateHeure = (d) =>
  d
    ? new Date(d).toLocaleString("fr-FR", {
        day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
      })
    : "";

// Étapes datées, de la plus ancienne à la plus récente
export function etapesEvent(event) {
  const etapes = [
    { cle: "creation", label: "Créé", date: event.created_at },
    { cle: "soumission", label: "Soumis à validation", date: event.date_soumission },
    { cle: "validation", label: "Accepté", date: event.date_validation, par: event.valide_par_nom },
    { cle: "publication", label: "Publié", date: event.date_publication },
    { cle: "refus", label: "Refusé", date: event.date_refus, par: event.refuse_par_nom, motif: event.motif_refus },
    { cle: "annulation", label: "Annulé", date: event.date_annulation, motif: event.motif_annulation },
  ];
  return etapes
    .filter((e) => e.date)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

// Résumé d'une ligne selon le statut actuel (ex. « Publié le 12 nov. 2026 »)
export function resumeStatut(event) {
  const fmt = (d) => formatDateHeure(d);
  switch (event.statut) {
    case "publie":
      return event.date_publication ? `Publié le ${fmt(event.date_publication)}` : "Publié";
    case "en_attente":
      return event.date_soumission ? `Soumis le ${fmt(event.date_soumission)}` : "En attente de validation";
    case "refuse":
      return event.date_refus ? `Refusé le ${fmt(event.date_refus)}` : "Refusé";
    case "annule":
      return event.date_annulation ? `Annulé le ${fmt(event.date_annulation)}` : "Annulé";
    case "brouillon":
      return event.created_at ? `Brouillon créé le ${fmt(event.created_at)}` : "Brouillon";
    default:
      return "";
  }
}
