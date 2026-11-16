import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, Check } from "lucide-react";
import { useSync } from "../../context/useSync";
import styles from "./NotifBell.module.css";

export default function NotifBell() {
  const navigate = useNavigate();
  // Tout vient de la source commune : la cloche, la page Notifications et le
  // menu admin affichent toujours les mêmes chiffres.
  const { notifs, nonVues, nonLues, estLue, voirTout, marquerUneLue, toutLire } = useSync();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Ferme le menu si on clique ailleurs
  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  // Clic sur une notification : marque lue (partout) + navigue vers le lien
  const handleClick = (notif) => {
    marquerUneLue(notif);
    setOpen(false);
    if (notif.lien) navigate(notif.lien);
  };

  const handleToutLu = () => toutLire(notifs[0]?.id);

  // Ouvre/ferme le menu. À l'ouverture, les notifications sont « vues » :
  // le badge rouge disparaît, mais chacune reste en surbrillance (non lue)
  // tant que l'utilisateur ne l'a pas ouverte — comme sur Facebook.
  const toggleMenu = () => {
    const willOpen = !open;
    setOpen(willOpen);
    if (willOpen && nonVues > 0) voirTout();
  };

  const formatDate = (str) => new Date(str).toLocaleDateString("fr-FR", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });

  return (
    <div className={styles.wrapper} ref={ref}>
      <button className={styles.bellBtn} onClick={toggleMenu} aria-label="Notifications">
        <Bell size={15} />
        {nonVues > 0 && <span className={styles.badge}>{nonVues > 99 ? "99+" : nonVues}</span>}
      </button>

      {open && (
        <div className={styles.menu}>
          <div className={styles.header}>
            <span>Notifications</span>
            {nonLues > 0 && (
              <button className={styles.toutLu} onClick={handleToutLu}>
                <Check size={13} /> Tout marquer comme lu
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
                  className={`${styles.item} ${estLue(n) ? "" : styles.itemNonLue}`}
                  onClick={() => handleClick(n)}
                >
                  {!estLue(n) && <span className={styles.dot} />}
                  <div className={styles.itemContent}>
                    <p className={styles.itemTitre}>{n.titre}</p>
                    <p className={styles.itemDate}>{formatDate(n.created_at)}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          <Link to="/notifications" className={styles.voirTout} onClick={() => setOpen(false)}>
            Voir toutes les notifications
          </Link>
        </div>
      )}
    </div>
  );
}