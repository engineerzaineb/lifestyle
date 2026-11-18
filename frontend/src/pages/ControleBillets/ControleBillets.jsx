import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ScanLine, CheckCircle2, XCircle, AlertTriangle, Search } from "lucide-react";
import { consulterBillet, validerBillet } from "../../services/paiementService";
import { formatDateHeure } from "../../utils/tracabilite";
import styles from "./ControleBillets.module.css";

/**
 * Contrôle des billets à l'entrée (organisateur de l'événement).
 * Le QR code d'un billet ouvre directement /controle/<code> sur le téléphone de
 * l'organisateur ; on peut aussi taper le code imprimé sous le QR code.
 */
export default function ControleBillets() {
  const { code: codeUrl } = useParams();
  const navigate = useNavigate();
  const [saisie, setSaisie] = useState(codeUrl || "");
  const [billet, setBillet] = useState(null);
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(false);
  const [message, setMessage] = useState("");

  // Code présent dans l'adresse (QR code scanné) : on l'affiche tout de suite
  useEffect(() => {
    if (!codeUrl) return;
    let annule = false;
    consulterBillet(codeUrl)
      .then((b) => { if (!annule) { setBillet(b); setErreur(""); } })
      .catch((err) => { if (!annule) setErreur(messageErreur(err)); });
    return () => { annule = true; };
  }, [codeUrl]);

  const rechercher = (e) => {
    e.preventDefault();
    const code = saisie.trim().toUpperCase();
    if (!code) return;
    setMessage("");
    setBillet(null);
    setErreur("");
    if (code === codeUrl) {
      setChargement(true);
      consulterBillet(code)
        .then(setBillet)
        .catch((err) => setErreur(messageErreur(err)))
        .finally(() => setChargement(false));
    } else {
      navigate(`/controle/${code}`);
    }
  };

  const valider = async () => {
    setChargement(true);
    try {
      const b = await validerBillet(billet.code);
      setBillet(b);
      setMessage(b.message);
    } catch (err) {
      if (err.response?.status === 409) setBillet(err.response.data); // déjà utilisé, annulé…
      else setErreur(messageErreur(err));
    } finally {
      setChargement(false);
    }
  };

  // `message` n'est rempli qu'après une validation réussie : l'entrée vient d'être accordée
  const ton = !billet ? null : (message || billet.verdict === "valide") ? "valide"
    : billet.verdict === "deja_utilise" ? "attention" : "refus";
  const Icone = ton === "valide" ? CheckCircle2 : ton === "attention" ? AlertTriangle : XCircle;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.titre}><ScanLine size={24} /> Contrôle des <em>billets</em></h1>
        <p className={styles.aide}>
          Scannez le QR code du billet avec l'appareil photo du téléphone, ou tapez le code imprimé dessous.
        </p>

        <form onSubmit={rechercher} className={styles.recherche}>
          <input
            value={saisie}
            onChange={(e) => setSaisie(e.target.value)}
            placeholder="BLT-XXXXXXXXXX"
            className={styles.champ}
            autoCapitalize="characters"
            aria-label="Code du billet"
          />
          <button type="submit" className={styles.btnChercher} disabled={chargement}>
            <Search size={15} /> Vérifier
          </button>
        </form>

        {erreur && <p className={styles.erreur}>{erreur}</p>}

        {billet && (
          <div className={`${styles.carte} ${styles[ton]}`}>
            <div className={styles.verdict}>
              <Icone size={28} />
              <span>{message || billet.message}</span>
            </div>
            <dl className={styles.details}>
              <dt>Événement</dt><dd>{billet.event.titre}</dd>
              <dt>Date</dt><dd>{formatDateHeure(billet.event.date_evenement)}</dd>
              <dt>Billet</dt><dd>{billet.type_billet} · {Number(billet.prix)} DT</dd>
              <dt>Titulaire</dt><dd>{billet.titulaire}</dd>
              <dt>Réservation</dt><dd>{billet.reservation}</dd>
              <dt>Code</dt><dd className={styles.code}>{billet.code}</dd>
              {billet.utilise_le && (
                <>
                  <dt>Utilisé le</dt>
                  <dd>{formatDateHeure(billet.utilise_le)}{billet.controle_par && ` par ${billet.controle_par}`}</dd>
                </>
              )}
            </dl>
            {billet.verdict === "valide" && (
              <button type="button" className={styles.btnValider} onClick={valider} disabled={chargement}>
                <CheckCircle2 size={18} /> Valider l'entrée
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function messageErreur(err) {
  if (err.response?.status === 404) return "Aucun billet ne correspond à ce code.";
  return err.response?.data?.detail || "Vérification impossible pour le moment.";
}
