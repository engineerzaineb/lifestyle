import { useState, useRef, useEffect } from "react";
import { Share2, Link as LinkIcon, Check, MessageCircle, Send, Smartphone } from "lucide-react";
import { lienPartageEvent, textePartageEvent } from "../../utils/partage";
import styles from "./ShareMenu.module.css";

/* Construit les URLs de partage pour chaque réseau */
function buildShareLinks(url, text) {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(text);
  return [
    // Facebook n'accepte que l'URL : l'aperçu vient des balises Open Graph du lien
    { name: "Facebook", icon: FacebookIcon, href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
    { name: "WhatsApp", icon: MessageCircle, href: `https://wa.me/?text=${t}%0A${u}` },
    { name: "X (Twitter)", icon: Share2, href: `https://twitter.com/intent/tweet?text=${t}&url=${u}` },
    { name: "Telegram", icon: Send, href: `https://t.me/share/url?url=${u}&text=${t}` },
    { name: "LinkedIn", icon: LinkedInIcon, href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}` },
  ];
}

/* Icônes de marques (SVG inline, retirées de lucide-react) */
function FacebookIcon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function InstagramIcon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function LinkedInIcon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
    </svg>
  );
}

/**
 * Menu de partage d'un événement.
 * @param {object} event - l'événement (recommandé : lien et texte détaillé construits ici)
 * @param {string} url / text - alternative si on ne passe pas d'événement
 */
export default function ShareMenu({ event, url, text, trigger }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [noteInstagram, setNoteInstagram] = useState(false);
  const menuRef = useRef(null);

  const shareUrl = event ? lienPartageEvent(event.id) : url;
  const shareText = event ? textePartageEvent(event) : text;
  const partageNatif = typeof navigator !== "undefined" && typeof navigator.share === "function";

  // Ferme le menu si on clique ailleurs
  useEffect(() => {
    function onClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
        setNoteInstagram(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const links = buildShareLinks(shareUrl, shareText);

  const copier = async (contenu) => {
    try {
      await navigator.clipboard.writeText(contenu);
      return true;
    } catch {
      return false;
    }
  };

  const handleCopy = async () => {
    if (await copier(shareUrl)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Feuille de partage du téléphone (Instagram, Messenger, SMS...)
  const handleNatif = async () => {
    try {
      await navigator.share({ title: event?.titre || shareText, text: shareText, url: shareUrl });
      setOpen(false);
    } catch { /* partage annulé */ }
  };

  // Instagram ne propose pas de lien de partage web : sur téléphone on passe
  // par la feuille de partage ; sur ordinateur on copie texte + lien.
  const handleInstagram = async () => {
    if (partageNatif) {
      handleNatif();
      return;
    }
    await copier(`${shareText}\n${shareUrl}`);
    setNoteInstagram(true);
  };

  // Ouvre la popup de partage du réseau (petite fenêtre centrée)
  const openPopup = (href) => {
    window.open(href, "_blank", "width=600,height=500,noopener,noreferrer");
    setOpen(false);
  };

  return (
    <div className={styles.wrapper} ref={menuRef}>
      {/* Le déclencheur : soit fourni par le parent, soit un bouton par défaut */}
      <span onClick={() => { setOpen((o) => !o); setNoteInstagram(false); }}>
        {trigger || (
          <button className={styles.defaultTrigger} type="button">
            <Share2 size={16} />
            Partager
          </button>
        )}
      </span>

      {open && (
        <div className={styles.menu}>
          {partageNatif && (
            <>
              <button type="button" className={styles.item} onClick={handleNatif}>
                <Smartphone size={15} />
                Partager via…
              </button>
              <div className={styles.divider} />
            </>
          )}
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
          <button type="button" className={styles.item} onClick={handleInstagram}>
            <InstagramIcon size={15} />
            Instagram
          </button>
          {noteInstagram && (
            <p className={styles.note}>
              Texte et lien copiés. Instagram ne permet pas de partager un lien depuis
              un ordinateur : collez-les dans un message ou une story.
            </p>
          )}
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
