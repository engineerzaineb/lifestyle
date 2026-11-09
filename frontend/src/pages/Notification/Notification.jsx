import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Check, ChevronRight } from "lucide-react";
import {
  fetchNotifications, marquerVues, marquerLue, toutMarquerLu,
} from "../../services/notificationService";
import styles from "./Notifications.module.css";

const FILTRES = [
  { value: "toutes", label: "Toutes" },
  { value: "non_lues", label: "Non lues" },
];

// Regroupe les notifications par période (Aujourd'hui, Hier, ...)
function groupe(dateStr) {
  const d = new Date(dateStr);
  const debutJour = new Date();
  debutJour.setHours(0, 0, 0, 0);
  const jours = Math.floor((debutJour - d) / 86400000) + 1;
  if (d >= debutJour) return "Aujourd'hui";
  if (jours <= 1) return "Hier";
  if (jours <= 7) return "Cette semaine";
  if (jours <= 30) return "Ce mois-ci";
  return "Plus ancien";
}

const formatDate = (str) =>
  new Date(str).toLocaleString("fr-FR", {
    day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

export default function Notifications() {
  const navigate = useNavigate();
  const [filtre, setFiltre] = useState("toutes");
  const [notifs, setNotifs] = useState([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [total, setTotal] = useState(0);
  const [nonLues, setNonLues] = useState(0);
  const [loading, setLoading] = useState(true);

  // Charge une page ; la page 1 remplace la liste, les suivantes s'ajoutent
  useEffect(() => {
    let cancelled = false;
    fetchNotifications({ page, filtre })
      .then((data) => {
        if (cancelled) return;
        setNotifs((prev) => (page === 1 ? data.results : [...prev, ...data.results]));
        setHasNext(data.has_next);
        setTotal(data.count);
        setNonLues(data.non_lues);
      })
      .catch((err) => console.error("Erreur chargement notifications:", err))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [page, filtre]);

  // Ouvrir la page = avoir vu ses notifications (le badge de la cloche disparaît)
  useEffect(() => {
    marquerVues().catch(() => { /* ignore */ });
  }, []);

  const changerFiltre = (f) => {
    if (f === filtre) return;
    setLoading(true);
    setFiltre(f);
    setPage(1);
  };

  const voirPlus = () => {
    setLoading(true);
    setPage((p) => p + 1);
  };

  const handleClick = async (n) => {
    if (!n.lue) {
      try {
        const maj = await marquerLue(n.id);
        setNotifs((prev) => prev.map((x) => (x.id === n.id ? maj : x)));
        setNonLues((v) => Math.max(0, v - 1));
      } catch { /* ignore */ }
    }
    if (n.lien) navigate(n.lien);
  };

  const handleToutLu = async () => {
    try {
      await toutMarquerLu();
      setNonLues(0);
      if (filtre === "non_lues") {
        setNotifs([]);
        setTotal(0);
        setHasNext(false);
      } else {
        setNotifs((prev) => prev.map((x) => ({ ...x, lue: true, vue: true })));
      }
    } catch { /* ignore */ }
  };

  // Titre de groupe affiché au-dessus de la 1re notification de chaque période
  const titres = notifs.map((n, i) =>
    i === 0 || groupe(n.created_at) !== groupe(notifs[i - 1].created_at) ? groupe(n.created_at) : null
  );

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <div className={styles.titleRow}>
            <Bell size={24} />
            <h1 className={styles.title}>Notifications</h1>
          </div>
          <p className={styles.subtitle}>
            Tout votre historique est conservé, même après lecture.
            {nonLues > 0 && ` ${nonLues} non lue${nonLues > 1 ? "s" : ""}.`}
          </p>
        </div>
        {nonLues > 0 && (
          <button type="button" className={styles.btnToutLu} onClick={handleToutLu}>
            <Check size={15} />
            Tout marquer comme lu
          </button>
        )}
      </div>

      <div className={styles.tabs}>
        {FILTRES.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => changerFiltre(f.value)}
            className={`${styles.tab} ${filtre === f.value ? styles.tabActive : ""}`}
          >
            {f.label}
          </button>
        ))}
        {!loading && <span className={styles.count}>{total} notification{total > 1 ? "s" : ""}</span>}
      </div>

      {!loading && notifs.length === 0 ? (
        <div className={styles.empty}>
          <Bell size={36} />
          <p>{filtre === "non_lues" ? "Aucune notification non lue" : "Aucune notification pour l'instant"}</p>
        </div>
      ) : (
        <div className={styles.list}>
          {notifs.map((n, i) => {
            const titreGroupe = titres[i];
            return (
              <div key={n.id}>
                {titreGroupe && <p className={styles.groupTitle}>{titreGroupe}</p>}
                <button
                  type="button"
                  className={`${styles.item} ${n.lue ? "" : styles.itemNonLue}`}
                  onClick={() => handleClick(n)}
                >
                  <span className={n.lue ? styles.dotLue : styles.dot} />
                  <span className={styles.itemContent}>
                    <span className={styles.itemTitre}>{n.titre}</span>
                    <span className={styles.itemMeta}>
                      {formatDate(n.created_at)}
                      {n.lue && n.lue_at && ` · lue le ${formatDate(n.lue_at)}`}
                    </span>
                  </span>
                  {n.lien && <ChevronRight size={16} className={styles.chevron} />}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {loading && <p className={styles.loading}>Chargement...</p>}

      {!loading && hasNext && (
        <button type="button" className={styles.btnPlus} onClick={voirPlus}>
          Voir plus
        </button>
      )}
    </div>
  );
}
