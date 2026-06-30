import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Inbox, Calendar, Users, Tag, ArrowLeft, Shield,
} from "lucide-react";
import styles from "./AdminLayout.module.css";

const MENU_ITEMS = [
  { to: "/admin", label: "Vue d'ensemble", icon: LayoutDashboard, end: true },
  { to: "/admin/demandes", label: "Demandes", icon: Inbox },
  { to: "/admin/events", label: "Événements", icon: Calendar },
  { to: "/admin/users", label: "Utilisateurs", icon: Users },
  { to: "/admin/categories", label: "Catégories", icon: Tag },
];

export default function AdminLayout() {
  const navigate = useNavigate();

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
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <button onClick={() => navigate("/home")} className={styles.backBtn}>
          <ArrowLeft size={16} />
          Retour à l'application
        </button>
      </aside>

      {/* Zone de contenu */}
      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  );
}