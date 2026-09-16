import { useState, useRef, useEffect } from "react";
import { Share2, Link as LinkIcon, Check, MessageCircle, Send } from "lucide-react";
import styles from "./ShareMenu.module.css";

/* Construit les URLs de partage pour chaque réseau */
function buildShareLinks(url, text) {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(text);
  return [
    { name: "Facebook", icon: FacebookIcon, href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
    { name: "WhatsApp", icon: MessageCircle, href: `https://wa.me/?text=${t}%20${u}` },
    { name: "X (Twitter)", icon: Share2, href: `https://twitter.com/intent/tweet?text=${t}&url=${u}` },
    { name: "Telegram", icon: Send, href: `https://t.me/share/url?url=${u}&text=${t}` },
  ];
}
/* Icône Facebook (SVG inline, car retirée de lucide-react) */
function FacebookIcon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

export default function ShareMenu({ url, text, trigger }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef(null);

  // Ferme le menu si on clique ailleurs
  useEffect(() => {
    function onClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const links = buildShareLinks(url, text);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard indisponible */ }
  };

  // Ouvre la popup de partage du réseau (petite fenêtre centrée)
  const openPopup = (href) => {
    window.open(href, "_blank", "width=600,height=500,noopener,noreferrer");
    setOpen(false);
  };

  return (
    <div className={styles.wrapper} ref={menuRef}>
      {/* Le déclencheur : soit fourni par le parent, soit un bouton par défaut */}
      <span onClick={() => setOpen((o) => !o)}>
        {trigger || (
          <button className={styles.defaultTrigger} type="button">
            <Share2 size={16} />
            Partager
          </button>
        )}
      </span>

      {open && (
        <div className={styles.menu}>
          {links.map((l) => {
            const Icon = l.icon;
            return (
              <button
                key={l.name}
                type="button"
                className={styles.item}
                onClick={() => openPopup(l.href)}
              >
                <Icon size={15} />
                {l.name}
              </button>
            );
          })}
          <div className={styles.divider} />
          <button type="button" className={styles.item} onClick={handleCopy}>
            {copied ? <Check size={15} className={styles.copiedIcon} /> : <LinkIcon size={15} />}
            {copied ? "Lien copié !" : "Copier le lien"}
          </button>
        </div>
      )}
    </div>
  );
}