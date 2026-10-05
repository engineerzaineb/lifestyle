// Filtres par défaut
export function getDefaultFilters() {
  return {
    q: "",
    categorie_slugs: [],
    villes: [],
    bon_plan: false,
    prix_min: 0,
    prix_max: 500,
    date: "",
    date_exacte: "",
    tag: "",
  };
}

// Bornes du slider de prix
export const PRIX_MIN_DEFAULT = 0;
export const PRIX_MAX_DEFAULT = 500;

// Options de tri
export const SORT_OPTIONS = [
  { value: "relevance", label: "Pertinence" },
  { value: "date_asc", label: "Date (plus proche)" },
  { value: "date_desc", label: "Date (plus tardive)" },
  { value: "price_asc", label: "Prix croissant" },
  { value: "price_desc", label: "Prix décroissant" },
  { value: "popular", label: "Plus populaire" },
];

// Lit les filtres depuis l'URL 
export function parseFiltersFromUrl(searchParams) {
  const filters = getDefaultFilters();

  if (searchParams.get("q")) filters.q = searchParams.get("q");

  const catParam = searchParams.get("categorie");
  if (catParam) {
    filters.categorie_slugs = catParam.split(",").filter(Boolean);
  }

  const villeParam = searchParams.get("ville");
  if (villeParam) {
    filters.villes = villeParam.split(",").filter(Boolean);
  }

  if (searchParams.get("bon_plan") === "true" || searchParams.get("has_bon_plan") === "true") {
    filters.bon_plan = true;
  }

  if (searchParams.get("prix_min")) {
    const v = parseInt(searchParams.get("prix_min"), 10);
    if (!isNaN(v)) filters.prix_min = v;
  }
  if (searchParams.get("prix_max")) {
    const v = parseInt(searchParams.get("prix_max"), 10);
    if (!isNaN(v)) filters.prix_max = v;
  }

  if (searchParams.get("date")) filters.date = searchParams.get("date");
  if (searchParams.get("date_exacte")) filters.date_exacte = searchParams.get("date_exacte");
  if (searchParams.get("tag")) filters.tag = searchParams.get("tag");

  return filters;
}

// Construit l'URL pour le navigateur (historique partageable)
export function buildUrlFromFilters(filters, sort) {
  const params = new URLSearchParams();

  if (filters.q) params.set("q", filters.q);
  if (filters.categorie_slugs?.length) {
    params.set("categorie", filters.categorie_slugs.join(","));
  }
  if (filters.villes?.length) {
    params.set("ville", filters.villes.join(","));
  }
  if (filters.bon_plan) params.set("bon_plan", "true");
  if (filters.prix_min && filters.prix_min !== PRIX_MIN_DEFAULT) {
    params.set("prix_min", filters.prix_min);
  }
  if (filters.prix_max && filters.prix_max !== PRIX_MAX_DEFAULT) {
    params.set("prix_max", filters.prix_max);
  }
  if (filters.date) params.set("date", filters.date);
  if (filters.date_exacte) params.set("date_exacte", filters.date_exacte);
  if (filters.tag) params.set("tag", filters.tag);
  if (sort && sort !== "relevance") params.set("sort", sort);

  return params;
}

// Transforme les filtres en query params à envoyer au backend
export function buildApiParamsFromFilters(filters, sort) {
  const params = {};

  if (filters.q) params.q = filters.q;
  if (filters.categorie_slugs?.length) {
    params.categorie = filters.categorie_slugs.join(",");
  }
  if (filters.villes?.length) {
    params.ville = filters.villes.join(",");
  }
  if (filters.bon_plan) params.has_bon_plan = "true";
  if (filters.prix_min && filters.prix_min !== PRIX_MIN_DEFAULT) {
    params.prix_min = filters.prix_min;
  }
  if (filters.prix_max && filters.prix_max !== PRIX_MAX_DEFAULT) {
    params.prix_max = filters.prix_max;
  }
  if (filters.date) params.date = filters.date;
  if (filters.date_exacte) params.date_exacte = filters.date_exacte;
  if (filters.tag) params.tag = filters.tag;
  if (sort && sort !== "relevance") params.sort = sort;

  return params;
}

// Vérifie s'il y a des filtres actifs
export function hasActiveFilters(filters) {
  return (
    !!filters.q ||
    (filters.categorie_slugs?.length > 0) ||
    (filters.villes?.length > 0) ||
    !!filters.bon_plan ||
    (filters.prix_min !== PRIX_MIN_DEFAULT) ||
    (filters.prix_max !== PRIX_MAX_DEFAULT) ||
    !!filters.date ||
    !!filters.date_exacte ||
    !!filters.tag
  );
}

// Compte les filtres actifs (pour le badge)
export function countActiveFilters(filters) {
  let count = 0;
  if (filters.categorie_slugs?.length) count += filters.categorie_slugs.length;
  if (filters.villes?.length) count += filters.villes.length;
  if (filters.bon_plan) count++;
  if (filters.prix_min !== PRIX_MIN_DEFAULT || filters.prix_max !== PRIX_MAX_DEFAULT) count++;
  if (filters.date) count++;
  if (filters.date_exacte) count++;
  if (filters.tag) count++;
  return count;
}