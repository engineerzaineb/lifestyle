import { VILLES_TUNISIE } from "./constants";

/**
 * Coordonnées (latitude, longitude) du centre de chaque ville proposée.
 * Elles servent UNIQUEMENT à trouver la ville la plus proche d'une position,
 * directement dans le navigateur : aucune donnée n'est envoyée à un service externe.
 */
export const COORDONNEES_VILLES = {
  "Tunis": [36.8065, 10.1815],
  "La Marsa": [36.8782, 10.3247],
  "Sidi Bou Saïd": [36.8687, 10.3416],
  "Carthage": [36.8528, 10.3233],
  "Hammamet": [36.4000, 10.6167],
  "Sousse": [35.8256, 10.6084],
  "Monastir": [35.7643, 10.8113],
  "Djerba": [33.8750, 10.8575],
  "Bizerte": [37.2744, 9.8739],
  "Nabeul": [36.4561, 10.7376],
  "Sfax": [34.7406, 10.7603],
  "Gabès": [33.8815, 10.0982],
  "Kairouan": [35.6781, 10.0963],
  "Kasserine": [35.1676, 8.8365],
  "Gafsa": [34.4250, 8.7842],
  "Tozeur": [33.9197, 8.1335],
  "Zarzis": [33.5040, 11.1122],
  "Mahdia": [35.5047, 11.0622],
  "Kebili": [33.7044, 8.9690],
  "Medenine": [33.3549, 10.5055],
  "Jendouba": [36.5011, 8.7802],
  "Beja": [36.7256, 9.1817],
  "Siliana": [36.0849, 9.3708],
  "Kef": [36.1822, 8.7147],
  "Sidi Bouzid": [35.0382, 9.4849],
  "Tataouine": [32.9297, 10.4518],
};

// Au-delà de cette distance de la ville la plus proche, on considère que
// l'utilisateur n'est pas en Tunisie : on le laisse choisir sa ville lui-même.
export const DISTANCE_MAX_KM = 200;

/** Distance à vol d'oiseau entre deux points (formule de haversine), en km. */
export function distanceKm(lat1, lon1, lat2, lon2) {
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Ville la plus proche d'une position, parmi les villes de la liste.
 * @returns {{ ville: string, distance: number } | null} null si la position
 *          est trop loin de toutes les villes (hors de Tunisie)
 */
export function villeLaPlusProche(latitude, longitude) {
  let meilleure = null;
  for (const ville of VILLES_TUNISIE) {
    const coord = COORDONNEES_VILLES[ville];
    if (!coord) continue;
    const d = distanceKm(latitude, longitude, coord[0], coord[1]);
    if (!meilleure || d < meilleure.distance) meilleure = { ville, distance: d };
  }
  if (!meilleure || meilleure.distance > DISTANCE_MAX_KM) return null;
  return { ville: meilleure.ville, distance: Math.round(meilleure.distance) };
}
