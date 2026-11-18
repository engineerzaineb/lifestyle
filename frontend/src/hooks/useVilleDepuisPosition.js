import { useState, useCallback } from "react";
import { villeLaPlusProche } from "../utils/villes "

/**
 * useVilleDepuisPosition — demande la position SEULEMENT quand l'utilisateur
 * clique sur « Utiliser ma position », puis renvoie la ville la plus proche.
 * Le calcul se fait dans le navigateur, sans service externe.
 *
 * const { localiser, enCours } = useVilleDepuisPosition();
 * const { ville, distance, latitude, longitude } = await localiser();
 * (en cas d'échec, la promesse est rejetée avec un message prêt à afficher)
 */
export function useVilleDepuisPosition() {
  const [enCours, setEnCours] = useState(false);

  const localiser = useCallback(() => new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Votre navigateur ne permet pas la géolocalisation. Choisissez votre ville dans la liste."));
      return;
    }
    setEnCours(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setEnCours(false);
        const { latitude, longitude } = pos.coords;
        const proche = villeLaPlusProche(latitude, longitude);
        if (!proche) {
          reject(new Error("Votre position semble hors de Tunisie. Choisissez votre ville dans la liste."));
          return;
        }
        resolve({ ...proche, latitude, longitude });
      },
      (err) => {
        setEnCours(false);
        reject(new Error(err.code === 1
          ? "Position non partagée. Choisissez votre ville dans la liste."
          : "Position introuvable pour le moment. Choisissez votre ville dans la liste."));
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  }), []);

  return { localiser, enCours };
}
