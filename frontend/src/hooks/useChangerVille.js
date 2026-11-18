import { useState, useCallback } from "react";
import { useAuth } from "../context/useAuth";
import { useToastContext } from "../components/iu/Toast/ToastProvider";
import { updateProfile, updateLocation } from "../services/authService";

/**
 * useChangerVille — enregistre la ville de l'utilisateur connecté.
 * Utilisé par l'accueil et par le profil : le comportement est identique partout.
 *
 * const { changerVille, enregistrement } = useChangerVille();
 * const profilMisAJour = await changerVille("Sousse");               // choix dans la liste
 * const profilMisAJour = await changerVille(ville, resultatPosition); // « Utiliser ma position »
 */
export function useChangerVille() {
  const { user, updateUser } = useAuth();
  const toast = useToastContext();
  const [enregistrement, setEnregistrement] = useState(false);

  const changerVille = useCallback(async (ville, position = null) => {
    if (!ville) return null;
    if (ville === user?.ville) {
      if (position) toast.info(`Vous êtes déjà à ${ville} (à ${position.distance} km du centre).`);
      return null;
    }
    setEnregistrement(true);
    try {
      // La position n'est conservée que si l'utilisateur a lui-même cliqué sur le bouton
      if (position) {
        await updateLocation({
          latitude: position.latitude, longitude: position.longitude, source: "manual",
        }).catch(() => { /* la ville reste prioritaire */ });
      }
      const profil = await updateProfile({ ville });
      updateUser(profil);
      toast.success(position
        ? `Ville la plus proche de vous : ${ville} (${position.distance} km)`
        : `Ville enregistrée : ${ville}`);
      return profil;
    } catch (err) {
      console.error("Erreur changement de ville :", err);
      toast.error("Impossible d'enregistrer la ville");
      return null;
    } finally {
      setEnregistrement(false);
    }
  }, [user?.ville, updateUser, toast]);

  return { changerVille, enregistrement };
}
