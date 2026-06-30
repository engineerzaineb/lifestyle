// URL de base du backend 
export const API_BASE_URL = "http://localhost:8000/api";

// Rôles utilisateurs 
export const ROLES = {
  UTILISATEUR: "utilisateur",
  CLIENT: "client",       // = Organisateur
  ADMIN: "admin",
};

export const ROLE_LABELS = {
  utilisateur: "Utilisateur",
  client: "Organisateur",
  admin: "Administrateur",
};

// Statuts des événements
export const EVENT_STATUTS = {
  BROUILLON: "brouillon",
  EN_ATTENTE: "en_attente",
  PUBLIE: "publie",
  REFUSE: "refuse",
  ANNULE: "annule",
  TERMINE: "termine",
};

export const EVENT_STATUT_LABELS = {
  brouillon: "Brouillon",
  en_attente: "En attente",
  publie: "Publié",
  refuse: "Refusé",
  annule: "Annulé",
  termine: "Terminé",
};

// Villes de Tunisie 
export const VILLES_TUNISIE = [
  "Tunis", "La Marsa", "Sidi Bou Saïd", "Carthage", "Hammamet",
  "Sousse", "Monastir", "Djerba", "Bizerte", "Nabeul", "Sfax", "Gabès", 
  "Kairouan", "Kasserine", "Gafsa", "Tozeur", "Zarzis", "Mahdia", "Kebili",
   "Medenine", "Jendouba", "Beja", "Siliana", "Kef", "Sidi Bouzid", "Tataouine"

];

// Catégories par défaut 
export const CATEGORIES = {
  musique: { nom: "Musique", color: "#EC4899", emoji: "🎷" },
  food: { nom: "Food", color: "#F97316", emoji: "🍽️" },
  spectacle: { nom: "Spectacle", color: "#A855F7", emoji: "🎭" },
  sport: { nom: "Sport", color: "#06B6D4", emoji: "🏃" },
  culture: { nom: "Culture", color: "#4F46E5", emoji: "📚" },
  art: { nom: "Art", color: "#84CC16", emoji: "🎨" },
  "bien-etre": { nom: "Bien-être", color: "#16A34A", emoji: "✨" },
  tech: { nom: "Tech", color: "#0891B2", emoji: "💻" },
};

// Clés localStorage
export const STORAGE_KEYS = {
  USER: "lifestyle_user",
  TOKEN: "lifestyle_token",
  REFRESH_TOKEN: "lifestyle_refresh_token",
};

// Modes de paiement
export const PAYMENT_METHODS = [
  { id: "card", label: "Carte bancaire" },
  { id: "d17", label: "D17" },
  { id: "edinar", label: "e-DINAR" },
];
// Coordonnées GPS par défaut (Tunis) si user refuse la géolocalisation
export const DEFAULT_LATITUDE = 36.806495;
export const DEFAULT_LONGITUDE = 10.181530;