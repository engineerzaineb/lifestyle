import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "./useAuth";
import { SyncContext } from "./SyncContextValue";
import {
  fetchNotifications, marquerVues, marquerLue, toutMarquerLu,
} from "../services/notificationService";
import { fetchAdminStats } from "../services/adminService";
import { getCurrentUser } from "../services/authService";

/**
 * SyncProvider — source UNIQUE de vérité pour tout ce qui change « tout seul »
 * pendant que l'utilisateur navigue : notifications, compteurs de l'admin,
 * rôle de l'utilisateur (demande acceptée, statut retiré…).
 *
 * Tous les composants (cloche, page Notifications, menu admin, vue d'ensemble,
 * listes) lisent les MÊMES valeurs ici : ils ne peuvent donc pas se contredire.
 *
 * Rafraîchissement : toutes les 10 s (onglet visible), à chaque changement de
 * page, au retour sur l'onglet, après chaque action, et entre onglets ouverts.
 */
const INTERVALLE_MS = 10000;
const CANAL = "lifestyle-sync";

export function SyncProvider({ children }) {
  const { user } = useAuth();
  // La clé remet tout à zéro quand on change de compte (connexion, déconnexion)
  return <SyncInner key={user?.id ?? "anonyme"}>{children}</SyncInner>;
}

function SyncInner({ children }) {
  const { user, isAuthenticated, updateUser } = useAuth();
  const location = useLocation();

  const [notifs, setNotifs] = useState([]);          // 10 dernières (menu de la cloche)
  const [nonVues, setNonVues] = useState(0);         // badge rouge
  const [nonLues, setNonLues] = useState(0);         // surbrillance / « Tout marquer comme lu »
  const [adminStats, setAdminStats] = useState(null); // mêmes chiffres partout dans l'espace admin
  const [version, setVersion] = useState(0);         // augmente à chaque nouveauté
  const [idsLus, setIdsLus] = useState(() => new Set());
  const [toutLuJusqua, setToutLuJusqua] = useState(null); // id max au moment de « tout lu »

  // Références pour les callbacks (évite de recréer les intervalles)
  const userRef = useRef(user);
  const updateUserRef = useRef(updateUser);
  useEffect(() => { userRef.current = user; updateUserRef.current = updateUser; });

  const signatureRef = useRef(null);  // résumé de l'état serveur au dernier passage
  const enCoursRef = useRef(false);
  const relancerRef = useRef(false);
  const actionSeqRef = useRef(0);     // ignore une réponse partie AVANT une action
  const canalRef = useRef(null);
  const rafraichirRef = useRef(null);

  // Le compte a pu changer côté serveur (demande acceptée, statut retiré, pack…)
  const synchroniserCompte = useCallback(async () => {
    try {
      const frais = await getCurrentUser();
      const actuel = userRef.current;
      if (!frais || !actuel) return;
      const change = Object.keys(frais).some(
        (k) => JSON.stringify(frais[k]) !== JSON.stringify(actuel[k])
      );
      if (change) updateUserRef.current(frais);
    } catch { /* silencieux */ }
  }, []);

  const rafraichir = useCallback(async () => {
    if (!userRef.current) return;
    if (enCoursRef.current) { relancerRef.current = true; return; }
    enCoursRef.current = true;
    const seq = actionSeqRef.current;
    try {
      const data = await fetchNotifications();
      const stats = userRef.current?.role === "admin" ? await fetchAdminStats() : null;
      // Une action a eu lieu pendant la requête : ces chiffres sont déjà périmés
      if (seq !== actionSeqRef.current) { relancerRef.current = true; return; }

      const liste = (data.results || []).slice(0, 10);
      setNotifs((prev) => (JSON.stringify(prev) === JSON.stringify(liste) ? prev : liste));
      setNonVues(data.non_vues || 0);
      setNonLues(data.non_lues || 0);
      if (stats) setAdminStats((prev) => (JSON.stringify(prev) === JSON.stringify(stats) ? prev : stats));

      const signature = [
        liste[0]?.id ?? 0, data.count,
        stats?.demandes?.en_attente, stats?.events?.en_attente,
        stats?.categories?.en_attente, stats?.users?.inactifs,
      ].join("|");
      const premiere = signatureRef.current === null;
      if (!premiere && signature !== signatureRef.current) {
        setVersion((v) => v + 1);   // les pages abonnées se rechargent
      }
      if (premiere || signature !== signatureRef.current) synchroniserCompte();
      signatureRef.current = signature;
    } catch { /* hors ligne ou jeton expiré : on réessaiera */ }
    finally {
      enCoursRef.current = false;
      if (relancerRef.current) { relancerRef.current = false; rafraichirRef.current?.(); }
    }
  }, [synchroniserCompte]);
  useEffect(() => { rafraichirRef.current = rafraichir; }, [rafraichir]);

  // Prévient les autres onglets ouverts sur le même compte
  const diffuser = useCallback((message) => {
    try { canalRef.current?.postMessage(message); } catch { /* navigateur ancien */ }
  }, []);

  // Rafraîchissement régulier, au retour sur l'onglet et entre onglets
  useEffect(() => {
    if (!isAuthenticated) return undefined;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") rafraichir();
    }, INTERVALLE_MS);
    const surRetour = () => { if (document.visibilityState === "visible") rafraichir(); };
    window.addEventListener("focus", surRetour);
    document.addEventListener("visibilitychange", surRetour);

    let canal = null;
    if (typeof BroadcastChannel !== "undefined") {
      canal = new BroadcastChannel(CANAL);
      canal.onmessage = ({ data: m }) => {
        actionSeqRef.current += 1;
        if (m?.type === "vues") setNonVues(0);
        if (m?.type === "lue") setIdsLus((s) => new Set(s).add(m.id));
        if (m?.type === "tout-lu") setToutLuJusqua((j) => Math.max(j ?? 0, m.jusqua ?? 0));
        rafraichir();
      };
      canalRef.current = canal;
    }
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", surRetour);
      document.removeEventListener("visibilitychange", surRetour);
      if (canal) canal.close();
      canalRef.current = null;
    };
  }, [isAuthenticated, rafraichir]);

  // Chaque changement de page relit l'état : en arrivant sur une page, tout est à jour
  // (appel via la référence : la mise à jour d'état a lieu après la réponse réseau)
  useEffect(() => {
    if (isAuthenticated) rafraichirRef.current?.();
  }, [location.pathname, isAuthenticated]);

  // ----- Actions (mêmes effets quel que soit l'endroit où on les déclenche) -----

  const estLue = useCallback(
    (n) => !!n && (n.lue || idsLus.has(n.id) || (toutLuJusqua !== null && n.id <= toutLuJusqua)),
    [idsLus, toutLuJusqua]
  );

  // Ouvrir la cloche ou la page Notifications = avoir « vu » : le badge disparaît
  const voirTout = useCallback(async () => {
    actionSeqRef.current += 1;
    setNonVues(0);
    try { await marquerVues(); } catch { /* ignore */ }
    diffuser({ type: "vues" });
    rafraichir();
  }, [diffuser, rafraichir]);

  // Clic sur une notification : elle devient lue partout (cloche, page, autres onglets)
  const marquerUneLue = useCallback(async (n) => {
    if (!n || estLue(n)) return;
    actionSeqRef.current += 1;
    setIdsLus((s) => new Set(s).add(n.id));
    setNonLues((v) => Math.max(0, v - 1));
    try { await marquerLue(n.id); } catch { /* ignore */ }
    diffuser({ type: "lue", id: n.id });
    rafraichir();
  }, [estLue, diffuser, rafraichir]);

  // « Tout marquer comme lu » : idPlusRecent = la plus récente affichée par l'appelant
  const toutLire = useCallback(async (idPlusRecent = 0) => {
    actionSeqRef.current += 1;
    const jusqua = Math.max(idPlusRecent || 0, notifs[0]?.id ?? 0);
    setToutLuJusqua((j) => Math.max(j ?? 0, jusqua));
    setNonLues(0);
    try { await toutMarquerLu(); } catch { /* ignore */ }
    diffuser({ type: "tout-lu", jusqua });
    rafraichir();
  }, [notifs, diffuser, rafraichir]);

  // À appeler après une action qui change l'état (valider une demande, refuser un
  // événement…) : compteurs, badges et listes se mettent à jour immédiatement.
  const signalerChangement = useCallback(() => {
    diffuser({ type: "changement" });
    rafraichir();
  }, [diffuser, rafraichir]);

  const value = useMemo(() => ({
    notifs, nonVues, nonLues, adminStats, version,
    estLue, voirTout, marquerUneLue, toutLire, signalerChangement,
  }), [notifs, nonVues, nonLues, adminStats, version,
    estLue, voirTout, marquerUneLue, toutLire, signalerChangement]);

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}
