import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Check } from "lucide-react";
import { fetchNotifications, marquerLue, toutMarquerLu } from "../../services/notificationService";
import styles from "./NotifBell.module.css";

export default function NotifBell() {
  const navigate = useNavigate();
  const [notifs, setNotifs] = useState([]);
  const [nonLues, setNonLues] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Charge les notifications au montage
  const charger = () => {
    fetchNotifications()
      .then((data) => {
        setNotifs(data.results || []);
        setNonLues(data.non_lues || 0);
      })
      .catch(() => { /* silencieux */ });
  };

  useEffect(() => { charger(); }, []);

  // Ferme le menu si on clique ailleurs
  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  // Clic sur une notification : marque lue + navigue vers le lien
  const handleClick = async (notif) => {
    if (!notif.lue) {
      try {
        await marquerLue(notif.id);
        setNonLues((n) => Math.max(0, n - 1));
        setNotifs((prev) => prev.map((x) => (x.id === notif.id ? { ...x, lue: true } : x)));
      } catch { /* ignore */ }
    }
    setOpen(false);
    if (notif.lien) navigate(notif.lien);
  };

  const handleToutLu = async () => {
    try {
      await toutMarquerLu();
      setNonLues(0);
      setNotifs((prev) => prev.map((x) => ({ ...x, lue: true })));
    } catch { /* ignore */ }
  };

  const formatDate = (str) => new Date(str).toLocaleDateString("fr-FR", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });

  return (
    <div className={styles.wrapper} ref={ref}>
      <button className={styles.bellBtn} onClick={() => setOpen((o) => !o)} aria-label="Notifications">
        <Bell size={15} />
        {nonLues > 0 && <span className={styles.badge}>{nonLues}</span>}
      </button>

      {open && (
        <div className={styles.menu}>
          <div className={styles.header}>
            <span>Notifications</span>
            {nonLues > 0 && (
              <button className={styles.toutLu} onClick={handleToutLu}>
                <Check size={13} /> Tout lire
              </button>
            )}
          </div>

          {notifs.length === 0 ? (
            <p className={styles.empty}>Aucune notification</p>
          ) : (
            <div className={styles.list}>
              {notifs.map((n) => (
                <button
                  key={n.id}
                  className={`${styles.item} ${n.lue ? "" : styles.itemNonLue}`}
                  onClick={() => handleClick(n)}
                >
                  {!n.lue && <span className={styles.dot} />}
                  <div className={styles.itemContent}>
                    <p className={styles.itemTitre}>{n.titre}</p>
                    <p className={styles.itemDate}>{formatDate(n.created_at)}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}