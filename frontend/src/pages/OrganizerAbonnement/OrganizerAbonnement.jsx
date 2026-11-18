import { useEffect, useState } from "react";
import { Package, CreditCard, Loader2, CalendarClock } from "lucide-react";
import PackCard from "../../components/PackCard/PackCard";
import { fetchPacks, fetchMonAbonnement } from "../../services/packService";
import { payerPack, fetchMesPaiements } from "../../services/paiementService";
import { formatDateHeure } from "../../utils/tracabilite";
import { useSync } from "../../context/useSync";
import { useToastContext } from "../../components/iu/Toast/ToastProvider";
import styles from "./OrganizerAbonnement.module.css";

/**
 * Mon abonnement (organisateur) : pack actuel, catalogue des packs et paiement
 * en ligne par Stripe. Le pack est activé dès que Stripe confirme le paiement.
 */
export default function OrganizerAbonnement() {
  const toast = useToastContext();
  const { version } = useSync();
  const [packs, setPacks] = useState([]);
  const [abonnement, setAbonnement] = useState(null);
  const [paiements, setPaiements] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [enCours, setEnCours] = useState(null); // id du pack en cours de paiement

  useEffect(() => {
    let annule = false;
    Promise.all([
      fetchPacks().catch(() => []),
      fetchMonAbonnement().catch(() => null),
      fetchMesPaiements("pack").catch(() => []),
    ]).then(([listePacks, abo, histo]) => {
      if (annule) return;
      setPacks(listePacks || []);
      setAbonnement(abo);
      setPaiements(histo || []);
      setChargement(false);
    });
    return () => { annule = true; };
  }, [version]);

  const souscrire = async (pack) => {
    setEnCours(pack.id);
    try {
      const p = await payerPack(pack.id);
      window.location.assign(p.checkout_url); // page de paiement Stripe
    } catch (err) {
      toast.error(err.response?.data?.detail || "Impossible de démarrer le paiement");
      setEnCours(null);
    }
  };

  const packActuelId = abonnement?.est_actif ? abonnement.pack?.id : null;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.titre}>
          <Package size={24} /> Mon <em>abonnement</em>
        </h1>

        <div className={styles.actuel}>
          {chargement ? (
            <p>Chargement…</p>
          ) : abonnement?.est_actif ? (
            <>
              <p className={styles.actuelNom}>Pack actuel : <strong>{abonnement.pack?.nom}</strong></p>
              <p className={styles.actuelDetail}>
                <CalendarClock size={14} />
                {abonnement.date_fin
                  ? `Actif jusqu'au ${formatDateHeure(abonnement.date_fin)}`
                  : "Sans date d'expiration"}
                {abonnement.events_restants != null && ` · ${abonnement.events_restants} événement(s) actif(s) encore possible(s)`}
              </p>
            </>
          ) : (
            <p className={styles.actuelNom}>Vous utilisez le <strong>pack gratuit</strong>.</p>
          )}
        </div>

        <p className={styles.explication}>
          Le paiement se fait par carte sur la page sécurisée de Stripe. Le pack est activé dès que
          le paiement est confirmé. Souscrire à nouveau au même pack prolonge sa durée.
        </p>

        <div className={styles.grille}>
          {packs.map((pack) => {
            const gratuit = Number(pack.prix) === 0;
            const actuel = pack.id === packActuelId;
            return (
              <PackCard
                key={pack.id}
                pack={pack}
                catalogue
                actions={gratuit ? (
                  <span className={styles.badge}>Par défaut</span>
                ) : (
                  <button
                    type="button"
                    className={styles.btnPayer}
                    onClick={() => souscrire(pack)}
                    disabled={enCours !== null}
                  >
                    {enCours === pack.id
                      ? <><Loader2 size={14} className={styles.tourne} /> Redirection…</>
                      : <><CreditCard size={14} /> {actuel ? "Prolonger" : "Souscrire"}</>}
                  </button>
                )}
              />
            );
          })}
        </div>

        {paiements.length > 0 && (
          <>
            <h2 className={styles.sousTitre}>Historique des paiements</h2>
            <table className={styles.table}>
              <thead>
                <tr><th>Date</th><th>Pack</th><th>Montant</th><th>Statut</th></tr>
              </thead>
              <tbody>
                {paiements.map((p) => (
                  <tr key={p.id}>
                    <td>{formatDateHeure(p.paye_le || p.created_at)}</td>
                    <td>{p.pack?.nom}</td>
                    <td>{Number(p.montant)} DT</td>
                    <td><span className={`${styles.statut} ${styles[p.statut]}`}>{p.statut_label}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}
