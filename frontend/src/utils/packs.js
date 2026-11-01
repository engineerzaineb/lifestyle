// Constantes et helpers partagés par les pages de gestion des packs.

// Options incluses dans un pack (cases à cocher)
export const PACK_OPTIONS = [
  { key: "mise_en_avant", label: "Mise en avant des événements" },
  { key: "stats_avancees", label: "Statistiques avancées" },
  { key: "support_prioritaire", label: "Support prioritaire" },
  { key: "badge_verifie", label: "Badge « Organisateur vérifié »" },
];

// Palette proposée pour la couleur d'un pack
export const PACK_COULEURS = [
  "#6B7280", "#4F46E5", "#EC4899", "#F59E0B",
  "#10B981", "#3B82F6", "#8B5CF6", "#EF4444",
];

export const PACK_DUREES = [
  { value: "mensuel", label: "Mensuel" },
  { value: "annuel", label: "Annuel" },
];

// "Gratuit" ou "49 DT / mois"
export function formatPrixPack(pack) {
  return Number(pack.prix) === 0
    ? "Gratuit"
    : `${Number(pack.prix)} DT / ${pack.duree === "annuel" ? "an" : "mois"}`;
}
