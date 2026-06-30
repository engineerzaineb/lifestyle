/*
 * Formate une date en français
 * @param {string|Date} date
 * @param {object} options - { withTime: bool, short: bool }
 */
export function formatDate(date, options = {}) {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d)) return "";

  const { withTime = false, short = false } = options;

  if (short) {
    return d.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
    });
  }

  const formatOptions = {
    weekday: "short",
    day: "numeric",
    month: "short",
  };

  if (withTime) {
    formatOptions.hour = "2-digit";
    formatOptions.minute = "2-digit";
  }

  return d.toLocaleDateString("fr-FR", formatOptions);
}

/*format un prix en DT*/
export function formatPrice(price) {
  if (price === 0 || price === "0") return "Gratuit";
  if (!price) return "—";
  return `${price} DT`;
}

/*première lettre en majuscule*/
export function capitalize(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/*
 * Génère les initiales depuis un nom complet
 * @example getInitials("Yasmine Ben Ali") → "YB"
 */
export function getInitials(prenom = "", nom = "") {
  return `${prenom?.[0] || ""}${nom?.[0] || ""}`.toUpperCase() || "?";
}

/*Tronque un texte avec ellipsis */
export function truncate(text, maxLength = 100) {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + "…";
}

/* Formate un nombre avec K, M (12000 → "12K")*/
export function formatCompactNumber(num) {
  if (!num && num !== 0) return "";
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${Math.floor(num / 1000)}K`;
  return num.toString();
}

/*
 * Construit une URL avec query params
 * @example buildUrl("/search", { q: "jazz", ville: "Tunis" }) → "/search?q=jazz&ville=Tunis"
 */
export function buildUrl(path, params = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.append(key, value);
    }
  });
  const query = searchParams.toString();
  return query ? `${path}?${query}` : path;
}

/*Calcule le temps relatif */
export function timeAgo(date) {
  if (!date) return "";
  const d = new Date(date);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);

  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  if (diff < 604800) return `il y a ${Math.floor(diff / 86400)} j`;
  return formatDate(date, { short: true });
}