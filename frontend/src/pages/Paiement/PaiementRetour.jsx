import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, XCircle, Loader2, Download, Ticket, Package } from "lucide-react";
import { verifierPaiement, annulerPaiement } from "../../services/paiementService";
import { downloadTickets } from "../../services/reservationService";
import { useSync } from "../../context/useSync";
import { useToastContext } from "../../components/iu/Toast/ToastProvider";
import styles from "./PaiementRetour.module.css";

const ATTENTE_MAX_MS = 20000; // le webhook arrive en général en quelques secondes

/**
 * Page de retour après Stripe.
 * mode="succes" : vérifie le paiement auprès du serveur (jamais sur la seule foi de l'adresse).
 * mode="annule" : l'utilisateur a quitté la page de paiement ; les places sont libérées.
 */
export default function PaiementRetour({ mode }) {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const { signalerChangement } = useSync();
  const toast = useToastContext();
  const [paiement, setPaiement] = useState(null);
  const [erreur, setErreur] = useState(sessionId ? "" : "Lien de retour incomplet.");
  const [delaiDepasse, setDelaiDepasse] = useState(false);

  useEffect(() => {
    if (!sessionId) return undefined;
    let fini = false;
    let minuteur = null;
    const debut = Date.now();

    const verifier = async () => {
      try {
        const p = mode === "annule" ? await annulerPaiement(sessionId) : await verifierPaiement(sessionId);
        if (fini) return;
        setPaiement(p);
        if (p.statut === "en_attente" && mode === "succes") {
          if (Date.now() - debut < ATTENTE_MAX_MS) minuteur = setTimeout(verifier, 2000);
          else setDelaiDepasse(true);
        } else {
          signalerChangement(); // cloche, réservations et compteurs à jour
        }
      } catch (err) {
        if (!fini) setErreur(err.response?.data?.detail || "Impossible de vérifier le paiement.");
      }
    };
    verifier();
    return () => { fini = true; clearTimeout(minuteur); };
  }, [sessionId, mode, signalerChangement]);

  const telecharger = async () => {
    try {
      await downloadTickets(paiement.reservation.id, paiement.reservation.code_reference);
    } catch {
      toast.error("Impossible de télécharger les billets");
    }
  };

  let contenu;
  if (erreur) {
    contenu = <Etat icone={XCircle} ton="danger" titre="Vérification impossible" texte={erreur} />;
  } else if (!paiement || (paiement.statut === "en_attente" && !delaiDepasse)) {
    contenu = (
      <Etat icone={Loader2} ton="info" tourne titre="Vérification du paiement…"
        texte="Nous attendons la confirmation de Stripe. Cela prend quelques secondes." />
    );
  } else if (paiement.statut === "en_attente") {
    contenu = (
      <Etat icone={Loader2} ton="info" titre="Paiement en cours de confirmation"
        texte="Stripe n'a pas encore confirmé le paiement. Vous recevrez une notification dès qu'il sera confirmé.">
        <Link to="/my-reservations" className={styles.btnSecondaire}>Mes réservations</Link>
      </Etat>
    );
  } else if (paiement.statut === "reussi" && paiement.type === "reservation") {
    const r = paiement.reservation;
    contenu = (
      <Etat icone={CheckCircle2} ton="succes" titre="Paiement confirmé"
        texte={`Votre réservation ${r.code_reference} pour « ${r.event.titre} » est confirmée : ${r.nb_billets} billet(s) émis.`}>
        <button type="button" onClick={telecharger} className={styles.btnPrincipal}>
          <Download size={15} /> Télécharger mes billets
        </button>
        <Link to="/my-reservations" className={styles.btnSecondaire}><Ticket size={15} /> Mes réservations</Link>
      </Etat>
    );
  } else if (paiement.statut === "reussi" && paiement.type === "pack") {
    contenu = (
      <Etat icone={CheckCircle2} ton="succes" titre={`Pack « ${paiement.pack.nom} » activé`}
        texte="Votre paiement est confirmé. Les nouvelles limites s'appliquent dès maintenant.">
        <Link to="/organizer/abonnement" className={styles.btnPrincipal}><Package size={15} /> Mon abonnement</Link>
      </Etat>
    );
  } else if (paiement.statut === "rembourse") {
    contenu = (
      <Etat icone={CheckCircle2} ton="info" titre="Paiement remboursé"
        texte="La réservation avait été annulée avant la fin du paiement : le montant vous a été remboursé.">
        <Link to="/my-reservations" className={styles.btnSecondaire}>Mes réservations</Link>
      </Etat>
    );
  } else {
    const pourPack = paiement.type === "pack";
    contenu = (
      <Etat icone={XCircle} ton="danger" titre="Paiement non effectué"
        texte={pourPack
          ? "Aucun montant n'a été prélevé. Votre pack actuel reste inchangé."
          : "Aucun montant n'a été prélevé et les places ont été libérées."}>
        <Link to={pourPack ? "/organizer/abonnement" : `/event/${paiement.reservation?.event.id}`}
          className={styles.btnSecondaire}>
          {pourPack ? "Retour aux packs" : "Retour à l'événement"}
        </Link>
      </Etat>
    );
  }

  return <div className={styles.page}>{contenu}</div>;
}

function Etat({ icone: Icone, ton, titre, texte, tourne = false, children }) {
  return (
    <div className={styles.carte}>
      <div className={`${styles.icone} ${styles[ton]}`}>
        <Icone size={34} className={tourne ? styles.tourne : ""} />
      </div>
      <h1 className={styles.titre}>{titre}</h1>
      <p className={styles.texte}>{texte}</p>
      {children && <div className={styles.actions}>{children}</div>}
    </div>
  );
}
