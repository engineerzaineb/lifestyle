import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { fetchSuggestions } from "../../services/eventService";
import styles from "./NavSearch.module.css";

// Barre de recherche de la navbar.
// - affiche des suggestions en direct pendant la frappe (débounce 250 ms)
// - Entrée ou clic sur la loupe -> va sur /discover?q=... (page Découvrir = résultats)
// - clic sur une suggestion event -> va direct sur la fiche de l'événement
// - clic sur une suggestion catégorie -> filtre Découvrir sur cette catégorie
export default function NavSearch() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [sugg, setSugg] = useState({ events: [], categories: [] });
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Suggestions en direct (débounce pour ne pas spammer l'API)
  useEffect(() => {
    if (q.trim().length < 2) {
      setSugg({ events: [], categories: [] });
      return;
    }
    const t = setTimeout(() => {
      fetchSuggestions(q)
        .then((data) => {
          setSugg(data);
          setOpen(true);
        })
        .catch(() => { /* silencieux */ });
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  // Ferme le panneau si on clique ailleurs
  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  // Lance la recherche -> page Découvrir avec le terme
  const lancerRecherche = () => {
    const terme = q.trim();
    if (!terme) return;
    setOpen(false);
    navigate(`/discover?q=${encodeURIComponent(terme)}`);
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter") lancerRecherche();
    if (e.key === "Escape") setOpen(false);
  };

  const allerEvent = (id) => {
    setOpen(false);
    setQ("");
    navigate(`/event/${id}`);
  };

  const allerCategorie = (slug) => {
    setOpen(false);
    setQ("");
    navigate(`/discover?categorie=${encodeURIComponent(slug)}`);
  };

  const aDesSuggestions = sugg.events.length > 0 || sugg.categories.length > 0;

  return (
    <div className={styles.wrapper} ref={ref}>
      <div className={styles.inputWrap}>
        <input
          type="text"
          className={styles.input}
          placeholder="Rechercher un événement…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => { if (aDesSuggestions) setOpen(true); }}
          aria-label="Rechercher"
        />
        <button
          className={styles.searchBtn}
          onClick={lancerRecherche}
          aria-label="Lancer la recherche"
        >
          <Search size={16} />
        </button>
      </div>

      {open && aDesSuggestions && (
        <div className={styles.panel}>
          {sugg.categories.length > 0 && (
            <div className={styles.group}>
              <p className={styles.groupTitle}>Catégories</p>
              {sugg.categories.map((c) => (
                <button key={`c-${c.id}`} className={styles.item} onClick={() => allerCategorie(c.slug)}>
                  {c.nom}
                </button>
              ))}
            </div>
          )}
          {sugg.events.length > 0 && (
            <div className={styles.group}>
              <p className={styles.groupTitle}>Événements</p>
              {sugg.events.map((ev) => (
                <button key={`e-${ev.id}`} className={styles.item} onClick={() => allerEvent(ev.id)}>
                  {ev.titre}
                </button>
              ))}
            </div>
          )}
          <button className={styles.seeAll} onClick={lancerRecherche}>
            Voir tous les résultats pour « {q.trim()} »
          </button>
        </div>
      )}
    </div>
  );
}