import { useContext } from "react";
import { SyncContext } from "./SyncContextValue";

/**
 * useSync — accès à la source unique des notifications et des compteurs.
 *
 * const { nonVues, nonLues, notifs, adminStats, version,
 *         voirTout, marquerUneLue, toutLire, estLue, signalerChangement } = useSync();
 *
 * `version` augmente à chaque nouveauté (notification reçue, compteur admin modifié,
 * action effectuée) : une page l'ajoute à ses dépendances pour se recharger.
 */
export function useSync() {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error("useSync doit être utilisé dans un SyncProvider");
  }
  return context;
}
