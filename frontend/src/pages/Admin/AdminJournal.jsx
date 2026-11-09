import { useState, useEffect, useRef } from "react";
import {
  History, Search, X, Calendar, Tag, Package, CreditCard, Star, User, ChevronDown,
} from "lucide-react";
import { fetchJournal } from "../../services/adminService";
import { useToastContext } from "../../components/iu/Toast/ToastProvider";
import { useDebounce } from "../../hooks/useDebounce";
import styles from "./AdminJournal.module.css";

const TYPES = [
  { value: "", label: "Tout" },
  { value: "evenement", label: "Événements", icon: Calendar },
  { value: "categorie", label: "Catégories", icon: Tag },
  { value: "pack", label: "Packs", icon: Package },
  { value: "abonnement", label: "Abonnements", icon: CreditCard },
  { value: "organisateur", label: "Organisateurs", icon: Star },
  { value: "utilisateur", label: "Comptes", icon: User },
];

const ICONES = Object.fromEntries(TYPES.filter((t) => t.icon).map((t) => [t.value, t.icon]));

// Couleur du badge selon l'action
const TON = {
  valide: "succes", publie: "succes", active: "succes", promu: "succes", reactive: "succes", attribue: "succes",
  refuse: "danger", supprime: "danger", annule: "danger", desactive: "danger", retire: "danger", retrograde: "danger",
  archive: "neutre",
};

// Libellés lisibles pour les clés de « details »
const LIBELLES = {
  pack: "Pack", ancien_pack: "Ancien pack", prix: "Prix (DT)", duree: "Durée",
  date_debut: "Début", date_fin: "Fin", statut: "Statut", publie_le: "Publié le",
  limite_evenements: "Limite d'événements", type_organisation: "Type d'organisation",
  supprimee: "Supprimée", depuis: "Depuis", via: "Via", champs_importants: "Champs modifiés",
  nom: "Nom", is_actif: "Actif", commission_pct: "Commission (%)",
  max_billets_par_event: "Billets max par événement", max_types_billets: "Types de billets max",
  icone: "Icône", couleur: "Couleur",
};

const formatDateHeure = (d) =>
  new Date(d).toLocaleString("fr-FR", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

// Affiche une valeur de détail (date ISO, booléen, liste...)
function valeur(v) {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean" || v === "True" || v === "False") return v === true || v === "True" ? "Oui" : "Non";
  if (v === "None") return "—";
  if (Array.isArray(v)) return v.join(", ");
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v)) return formatDateHeure(v);
  return String(v);
}

function Details({ entree }) {
  const { changements, ...autres } = entree.details || {};
  const lignes = Object.entries(autres);
  if (!entree.motif && !lignes.length && !changements) return null;
  return (
    <div className={styles.details}>
      {entree.motif && (
        <p className={styles.motif}><strong>Motif :</strong> {entree.motif}</p>
      )}
      {lignes.length > 0 && (
        <dl className={styles.dl}>
          {lignes.map(([k, v]) => (
            <div key={k} className={styles.dlRow}>
              <dt>{LIBELLES[k] || k}</dt>
              <dd>{valeur(v)}</dd>
            </div>
          ))}
        </dl>
      )}
      {changements && Object.keys(changements).length > 0 && (
        <dl className={styles.dl}>
          {Object.entries(changements).map(([champ, [avant, apres]]) => (
            <div key={champ} className={styles.dlRow}>
              <dt>{LIBELLES[champ] || champ}</dt>
              <dd><span className={styles.avant}>{valeur(avant)}</span> → {valeur(apres)}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

export default function AdminJournal() {
  const toast = useToastContext();
  const toastRef = useRef(toast);
  useEffect(() => { toastRef.current = toast; }, [toast]);

  const [type, setType] = useState("");
  const [query, setQuery] = useState("");
  const [depuis, setDepuis] = useState("");
  const [jusqua, setJusqua] = useState("");
  const [entrees, setEntrees] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [ouvert, setOuvert] = useState(null);

  const debouncedQuery = useDebounce(query, 300);

  // Recharge la 1re page à chaque changement de filtre ; « Voir plus » ajoute la suivante
  useEffect(() => {
    let cancelled = false;
    fetchJournal({ page, type, q: debouncedQuery.trim().length >= 2 ? debouncedQuery.trim() : "", depuis, jusqua })
      .then((data) => {
        if (cancelled) return;
        setEntrees((prev) => (page === 1 ? data.results : [...prev, ...data.results]));
        setCount(data.count);
        setHasNext(Boolean(data.next));
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Erreur chargement journal:", err);
        toastRef.current.error("Impossible de charger le journal");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [page, type, debouncedQuery, depuis, jusqua]);

  // Un changement de filtre repart de la première page
  const changerFiltre = (setter) => (v) => { setter(v); setPage(1); setLoading(true); };

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>Journal d'activité</h1>
        <p className={styles.subtitle}>
          Toutes les actions sont enregistrées : qui, quoi, quand et pourquoi.
          Les entrées ne peuvent être ni modifiées ni supprimées.
        </p>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            value={query}
            onChange={(e) => changerFiltre(setQuery)(e.target.value)}
            placeholder="Rechercher un événement, un pack, une personne, un motif..."
            className={styles.searchInput}
          />
          {query && (
            <button onClick={() => changerFiltre(setQuery)("")} className={styles.searchClear}>
              <X size={14} />
            </button>
          )}
        </div>
        <label className={styles.dateFilter}>
          Du
          <input type="date" value={depuis} onChange={(e) => changerFiltre(setDepuis)(e.target.value)} />
        </label>
        <label className={styles.dateFilter}>
          au
          <input type="date" value={jusqua} onChange={(e) => changerFiltre(setJusqua)(e.target.value)} />
        </label>
      </div>

      <div className={styles.filters}>
        {TYPES.map((t) => (
          <button
            key={t.value}
            onClick={() => changerFiltre(setType)(t.value)}
            className={`${styles.filterBtn} ${type === t.value ? styles.filterBtnActive : ""}`}
          >
            {t.label}
          </button>
        ))}
        {!loading && <span className={styles.count}>{count} action{count > 1 ? "s" : ""}</span>}
      </div>

      {!loading && entrees.length === 0 ? (
        <div className={styles.empty}>
          <History size={38} />
          <p>Aucune action pour ces filtres</p>
        </div>
      ) : (
        <div className={styles.list}>
          {entrees.map((e) => {
            const Icon = ICONES[e.type_cible] || History;
            const aDetails = e.motif || Object.keys(e.details || {}).length > 0;
            return (
              <div key={e.id} className={styles.row}>
                <div className={styles.icon}><Icon size={16} /></div>
                <div className={styles.main}>
                  <p className={styles.line}>
                    <span className={`${styles.badge} ${styles[`badge_${TON[e.action] || "info"}`]}`}>
                      {e.action_label}
                    </span>
                    <span className={styles.typeLabel}>{e.type_label}</span>
                    <strong className={styles.cible}>{e.cible_nom || "—"}</strong>
                  </p>
                  <p className={styles.meta}>
                    {formatDateHeure(e.created_at)}
                    {" · par "}{e.acteur_nom || "système"}
                    {e.concerne_nom && e.concerne_nom !== e.acteur_nom && <> · concerne {e.concerne_nom}</>}
                  </p>
                  {ouvert === e.id && <Details entree={e} />}
                </div>
                {aDetails && (
                  <button
                    className={styles.btnDetails}
                    onClick={() => setOuvert(ouvert === e.id ? null : e.id)}
                    title="Voir le détail"
                  >
                    <ChevronDown size={16} className={ouvert === e.id ? styles.rot : ""} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {loading && <div className={styles.loading}>Chargement...</div>}
      {!loading && hasNext && (
        <button className={styles.btnPlus} onClick={() => { setLoading(true); setPage((p) => p + 1); }}>
          Voir plus
        </button>
      )}
    </div>
  );
}
