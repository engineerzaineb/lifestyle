import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Inbox, Calendar, Users, Tag, Package, History, Bell, ArrowLeft, Shield, LogOut,
} from "lucide-react";
import { useAuth } from "../../context/useAuth";
import { useSync } from "../../context/useSync";
import styles from "./AdminLayout.module.css";

// `compteur` : clé du badge affiché à droite de l'entrée (voir `compteurs` plus bas)
const MENU_ITEMS = [
  { to: "/admin", label: "Vue d'ensemble", icon: LayoutDashboard, end: true },
  { to: "/admin/demandes", label: "Demandes", icon: Inbox, compteur: "demandes" },
  { to: "/admin/events", label: "Événements", icon: Calendar, compteur: "events" },
  { to: "/admin/users", label: "Utilisateurs", icon: Users },
  { to: "/admin/categories", label: "Catégories", icon: Tag, compteur: "categories" },
  { to: "/admin/packs", label: "Packs", icon: Package },
  { to: "/admin/journal", label: "Journal d'activité", icon: History },
  { to: "/admin/notifications", label: "Notifications", icon: Bell, compteur: "notifications" },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const { user } = useAuth();
  // Mêmes chiffres que la vue d'ensemble et la cloche : une seule source
  const { adminStats, nonVues } = useSync();
  const compteurs = {
    demandes: adminStats?.demandes?.en_attente || 0,
    events: adminStats?.events?.en_attente || 0,
    categories: adminStats?.categories?.en_attente || 0,
    notifications: nonVues,
  };

  // Initiales pour l'avatar (repli sur la 1re lettre de l'email)
  const initials =
    `${(user?.prenom || "")[0] || ""}${(user?.nom || "")[0] || ""}`.toUpperCase()
    || (user?.email || "A")[0].toUpperCase();

  return (
    <div className={styles.layout}>
      {/* Menu latéral */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <div className={styles.logo}>
            <Shield size={20} />
          </div>
          <div>
            <p className={styles.logoTitle}>Eventu</p>
            <p className={styles.logoSubtitle}>Administration</p>
          </div>
        </div>

        <nav className={styles.nav}>
          {MENU_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `${styles.navItem} ${isActive ? styles.navItemActive : ""}`
                }
              >
                <Icon size={18} />
                <span className={styles.navLabel}>{item.label}</span>
                {item.compteur && compteurs[item.compteur] > 0 && (
                  <span
                    className={styles.navBadge}
                    aria-label={`${compteurs[item.compteur]} en attente`}
                  >
                    {compteurs[item.compteur] > 99 ? "99+" : compteurs[item.compteur]}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Pied de sidebar : identité + sorties */}
        <div className={styles.sidebarFooter}>
          <div className={styles.userBox}>
            <div className={styles.userAvatar}>{initials}</div>
            <div className={styles.userInfo}>
              <p className={styles.userName}>
                {user?.prenom} {user?.nom}
              </p>
              <p className={styles.userRole}>Administrateur</p>
            </div>
          </div>

          <button onClick={() => navigate("/home")} className={styles.backBtn}>
            <ArrowLeft size={16} />
            Retour à l'application
          </button>

          <button
            onClick={() => navigate("/logout")}
            className={styles.logoutBtn}
          >
            <LogOut size={16} />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Zone de contenu */}
      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  );
}