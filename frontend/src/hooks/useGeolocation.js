import { useState, useCallback } from "react";

/**
 * Hook pour récupérer la géolocalisation de l'utilisateur via le navigateur
 *
 * Utilisation :
 *   const { position, loading, error, denied, requestPosition } = useGeolocation();
 *   <button onClick={requestPosition}>Activer la géolocalisation</button>
 */
export function useGeolocation() {
  const [position, setPosition] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [denied, setDenied] = useState(false);

  // Demande la position au navigateur (déclenche le popup natif)
  const requestPosition = useCallback(() => {
    return new Promise((resolve, reject) => {
      // Vérifie que l'API est dispo
      if (!navigator.geolocation) {
        const err = "Géolocalisation non supportée par votre navigateur";
        setError(err);
        reject(new Error(err));
        return;
      }

      setLoading(true);
      setError(null);
      setDenied(false);

      navigator.geolocation.getCurrentPosition(
        // Succès : on reçoit la position
        (pos) => {
          const coords = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          };
          setPosition(coords);
          setLoading(false);
          resolve(coords);
        },
        // Échec : refus ou erreur
        (err) => {
          setLoading(false);

          if (err.code === err.PERMISSION_DENIED) {
            setDenied(true);
            setError("Vous avez refusé la géolocalisation");
          } else if (err.code === err.POSITION_UNAVAILABLE) {
            setError("Position indisponible");
          } else if (err.code === err.TIMEOUT) {
            setError("La détection a pris trop de temps");
          } else {
            setError(err.message || "Erreur de géolocalisation");
          }

          reject(err);
        },
        // Options
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        }
      );
    });
  }, []);

  return {
    position,
    loading,
    error,
    denied,
    requestPosition,
  };
}