import { useState, useEffect, useMemo, useRef } from "react";
import {
  Search, Users, ShieldCheck, Star, Ban, CheckCircle,
  Mail, MapPin, Calendar, Ticket, X, UserCog, Filter,
} from "lucide-react";
import {
  fetchUsers, toggleUserActive, toggleUserOrganisateur,
} from "../../services/adminService";
import { useToastContext } from "../../components/iu/Toast/ToastProvider";
import { useAuth } from "../../context/useAuth";
import { useDebounce } from "../../hooks/useDebounce";
import styles from "./AdminUsers.module.css";

const FILTRES = [
  { key: "all", label: "Tous", params: {} },
  { key: "organisateurs", label: "Organisateurs", params: { is_organisateur: "true" } },
  { key: "admins", label: "Admins", params: { role: "admin" } },
  { key: "inactifs", label: "Désactivés", params: { is_active: "false" } },
];

export default function AdminUsers() {
  const toast = useToastContext();
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [processing, setProcessing] = useState(false);

  const debouncedQuery = useDebounce(query, 300);

  // Ref sur toast : évite que sa nouvelle identité à chaque rendu
  // ne relance le chargement en boucle.
  const toastRef = useRef(toast);
  useEffect(() => { toastRef.current = toast; }, [toast]);
useEffect(() => {
    let cancelled = false;
    const filtre = FILTRES.find((f) => f.key === activeFilter) || FILTRES[0];

    fetchUsers({ q: debouncedQuery, ...filtre.params })
      .then((data) => { if (!cancelled) setUsers(data); })
      .catch((err) => {
        if (cancelled) return;
        console.error("Erreur chargement utilisateurs:", err);
        toastRef.current.error("Impossible de charger les utilisateurs");
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [debouncedQuery, activeFilter]);

  // Remplace un utilisateur dans la liste après une action
  const replaceUser = (updated) => {
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    setSelected((prev) => (prev && prev.id === updated.id ? updated : prev));
  };

  const handleToggleActive = async (u) => {
    const action = u.is_active ? "désactiver" : "réactiver";
    if (!window.confirm(`Voulez-vous ${action} le compte de ${u.nom_complet} ?`)) return;

    setProcessing(true);
    try {
      const updated = await toggleUserActive(u.id);
      replaceUser(updated);
      toast.success(
        updated.is_active ? "Compte réactivé" : "Compte désactivé"
      );
    } catch (err) {
      console.error("Erreur toggle active:", err);
      toast.error(err.response?.data?.detail || "Action impossible");
    } finally {
      setProcessing(false);
    }
  };

  const handleToggleOrganisateur = async (u) => {
    const action = u.is_organisateur
      ? "retirer le statut d'organisateur à"
      : "promouvoir organisateur";
    if (!window.confirm(`Voulez-vous ${action} ${u.nom_complet} ?`)) return;

    setProcessing(true);
    try {
      const updated = await toggleUserOrganisateur(u.id);
      replaceUser(updated);
      toast.success(
        updated.is_organisateur
          ? "Utilisateur promu organisateur"
          : "Statut d'organisateur retiré"
      );
    } catch (err) {
      console.error("Erreur toggle organisateur:", err);
      toast.error(err.response?.data?.detail || "Action impossible");
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (d) =>
    d
      ? new Date(d).toLocaleDateString("fr-FR", {
          day: "numeric", month: "short", year: "numeric",
        })
      : "—";

  const getInitials = (u) =>
    `${(u.prenom || "")[0] || ""}${(u.nom || "")[0] || ""}`.toUpperCase() ||
    (u.email || "?")[0].toUpperCase();

  const counts = useMemo(() => ({
    total: users.length,
    organisateurs: users.filter((u) => u.is_organisateur).length,
    inactifs: users.filter((u) => !u.is_active).length,
  }), [users]);

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>Gestion des utilisateurs</h1>
        <p className={styles.subtitle}>
          Consultez, filtrez et gérez les comptes de la plateforme
        </p>
      </div>

      {/* Barre de recherche + filtres */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher par nom, email ou ville..."
            className={styles.searchInput}
          />
          {query && (
            <button onClick={() => setQuery("")} className={styles.searchClear}>
              <X size={14} />
            </button>
          )}
        </div>

        <div className={styles.filters}>
          <Filter size={14} className={styles.filterIcon} />
          {FILTRES.map((f) => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className={`${styles.filterBtn} ${
                activeFilter === f.key ? styles.filterBtnActive : ""
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Compteurs */}
      {!loading && (
        <div className={styles.countRow}>
          <span className={styles.countMain}>
            {counts.total} utilisateur{counts.total > 1 ? "s" : ""}
          </span>
          {counts.organisateurs > 0 && (
            <span className={styles.countChip}>
              <Star size={11} /> {counts.organisateurs} organisateur
              {counts.organisateurs > 1 ? "s" : ""}
            </span>
          )}
          {counts.inactifs > 0 && (
            <span className={`${styles.countChip} ${styles.countChipDanger}`}>
              <Ban size={11} /> {counts.inactifs} désactivé
              {counts.inactifs > 1 ? "s" : ""}
            </span>
          )}
        </div>
      )}

      {/* Liste */}
      {loading ? (
        <div className={styles.loading}>Chargement...</div>
      ) : users.length === 0 ? (
        <div className={styles.empty}>
          <Users size={38} />
          <p>Aucun utilisateur trouvé</p>
        </div>
      ) : (
        <div className={styles.list}>
          {users.map((u) => (
            <div
              key={u.id}
              className={`${styles.card} ${!u.is_active ? styles.cardInactive : ""}`}
            >
              <div className={styles.avatar}>{getInitials(u)}</div>

              <div className={styles.cardInfo}>
                <div className={styles.cardTop}>
                  <span className={styles.cardName}>{u.nom_complet}</span>
                  {u.role === "admin" && (
                    <span className={`${styles.badge} ${styles.badgeAdmin}`}>
                      <ShieldCheck size={10} /> Admin
                    </span>
                  )}
                  {u.is_organisateur && u.role !== "admin" && (
                    <span className={`${styles.badge} ${styles.badgeOrga}`}>
                      <Star size={10} /> Organisateur
                    </span>
                  )}
                  {!u.is_active && (
                    <span className={`${styles.badge} ${styles.badgeInactive}`}>
                      <Ban size={10} /> Désactivé
                    </span>
                  )}
                  {u.demande_statut === "en_attente" && (
                    <span className={`${styles.badge} ${styles.badgePending}`}>
                      Demande en attente
                    </span>
                  )}
                </div>
                <div className={styles.cardMeta}>
                  <span><Mail size={12} /> {u.email}</span>
                  {u.ville && <span><MapPin size={12} /> {u.ville}</span>}
                  <span><Calendar size={12} /> Inscrit le {formatDate(u.created_at)}</span>
                </div>
              </div>

              <div className={styles.cardStats}>
                <div className={styles.stat}>
                  <span className={styles.statValue}>{u.nb_events}</span>
                  <span className={styles.statLabel}>events</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statValue}>{u.nb_reservations}</span>
                  <span className={styles.statLabel}>résa</span>
                </div>
              </div>

              <button
                onClick={() => setSelected(u)}
                className={styles.btnDetail}
              >
                <UserCog size={14} />
                Gérer
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal de gestion */}
      {selected && (
        <div className={styles.modalOverlay} onClick={() => setSelected(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Gérer l'utilisateur</h2>
              <button
                onClick={() => setSelected(null)}
                className={styles.modalClose}
              >
                <X size={18} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.detailTop}>
                <div className={styles.detailAvatar}>{getInitials(selected)}</div>
                <div>
                  <p className={styles.detailName}>{selected.nom_complet}</p>
                  <p className={styles.detailEmail}>{selected.email}</p>
                </div>
              </div>

              <div className={styles.detailGrid}>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Rôle</span>
                  <span className={styles.detailValue}>
                    {selected.role === "admin" ? "Administrateur" : "Utilisateur"}
                  </span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Organisateur</span>
                  <span className={styles.detailValue}>
                    {selected.is_organisateur ? "Oui" : "Non"}
                  </span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Compte</span>
                  <span className={styles.detailValue}>
                    {selected.is_active ? "Actif" : "Désactivé"}
                  </span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Téléphone</span>
                  <span className={styles.detailValue}>
                    {selected.telephone || "—"}
                  </span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Ville</span>
                  <span className={styles.detailValue}>{selected.ville || "—"}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Réservations</span>
                  <span className={styles.detailValue}>
                    <Ticket size={12} /> {selected.nb_reservations}
                  </span>
                </div>
              </div>

              {selected.role === "admin" ? (
                <p className={styles.warnBox}>
                  Les comptes administrateurs ne peuvent pas être modifiés depuis
                  cette interface. Utilisez le panneau Django si nécessaire.
                </p>
              ) : selected.id === currentUser?.id ? (
                <p className={styles.warnBox}>
                  Vous ne pouvez pas modifier votre propre compte.
                </p>
              ) : (
                <div className={styles.actions}>
                  <button
                    onClick={() => handleToggleOrganisateur(selected)}
                    disabled={processing}
                    className={styles.btnOrga}
                  >
                    <Star size={15} />
                    {selected.is_organisateur
                      ? "Retirer le statut d'organisateur"
                      : "Promouvoir organisateur"}
                  </button>

                  <button
                    onClick={() => handleToggleActive(selected)}
                    disabled={processing}
                    className={
                      selected.is_active ? styles.btnDanger : styles.btnSuccess
                    }
                  >
                    {selected.is_active ? (
                      <><Ban size={15} /> Désactiver le compte</>
                    ) : (
                      <><CheckCircle size={15} /> Réactiver le compte</>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
