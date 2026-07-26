import { useState, useEffect } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import {
  Home, Compass, Search, Mail, LogIn, UserPlus, Menu, X,
  Bell, Plus, Calendar, FileText, User, LogOut, Settings,
  ShieldCheck, Sparkles,Heart
} from "lucide-react";
import styles from "./Navbar.module.css";


export default function Navbar({ user = null, onLogout }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handle = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", handle);
    return () => window.removeEventListener("scroll", handle);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
    setUserMenuOpen(false);
  }, [location]);

  return (
    <>
      <header className={`${styles.header} ${scrolled ? styles.scrolled : ""}`}>
        <div className={styles.inner}>
          {/* Logo */}
          <Link to="/" className={styles.logo}>
            <div className={styles.logoIcon}>E</div>
            <span className={styles.logoText}>Eventu</span>
          </Link>

          {/* Navigation desktop */}
          <nav className={styles.nav}>
            <NavbarLink to="/" icon={Home} label="Home" />
            <NavbarLink to="/discover" icon={Compass} label="Découvrir" />
            <NavbarLink to="/search" icon={Search} label="Chercher" />
            <NavbarLink to="/contact" icon={Mail} label="Contact" />
          </nav>

          {/* Zone droite */}
          <div className={styles.rightZone}>
            {user ? (
              <ConnectedActions
                user={user}
                userMenuOpen={userMenuOpen}
                setUserMenuOpen={setUserMenuOpen}
                onLogout={onLogout}
              />
            ) : (
              <GuestActions />
            )}

            <button
              onClick={() => setMobileMenuOpen(true)}
              className={styles.mobileTrigger}
              aria-label="Ouvrir le menu"
            >
              <Menu size={16} />
            </button>
          </div>
        </div>
      </header>
    </>
  );
}


function NavbarLink({ to, icon: Icon, label }) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      className={({ isActive }) =>
        `${styles.navLink} ${isActive ? styles.navLinkActive : ""}`
      }
    >
      <Icon size={14} />
      {label}
    </NavLink>
  );
}

function GuestActions() {
  return (
    <div className={styles.guestActions}>
      <Link to="/login" className={styles.loginBtn}>
        <LogIn size={13} />
        Connexion
      </Link>
      <Link to="/register" className={styles.signupBtn}>
        <UserPlus size={13} />
        S'inscrire
      </Link>
    </div>
  );
}


function ConnectedActions({ user, userMenuOpen, setUserMenuOpen, onLogout }) {
  const isOrganizer = user.is_organisateur;
  const isAdmin = user.role === "admin";

  return (
    <>
      {/* Bouton "Créer" pour les organisateurs */}
      {isOrganizer && (
        <Link to="/organizer/create" className={styles.createBtn}>
          <Plus size={13} />
          Créer
        </Link>
      )}

      {/* Badge Admin */}
      {isAdmin && (
        <Link to="/admin" className={styles.adminBadge}>
          <ShieldCheck size={12} />
          Admin
        </Link>
      )}

      {/* Notifications */}
      <button className={styles.notifBtn} aria-label="Notifications">
        <Bell size={15} />
        <span className={styles.notifDot} />
      </button>

      {/* Avatar + dropdown */}
      <UserMenu
        user={user}
        isOpen={userMenuOpen}
        setIsOpen={setUserMenuOpen}
        onLogout={onLogout}
      />
    </>
  );
}


function UserMenu({ user, isOpen, setIsOpen, onLogout }) {
  const initials = `${user.prenom?.[0] || ""}${user.nom?.[0] || ""}`.toUpperCase();
  const fullName = `${user.prenom} ${user.nom}`;
  const isOrganizer = user.is_organisateur;
  const isAdmin = user.role === "admin";

  // Avatar et badge selon le statut
  let avatarClass = styles.avatarUser;
  let roleClass = styles.roleUser;
  let roleLabel = "Utilisateur";

  if (isAdmin) {
    avatarClass = styles.avatarAdmin;
    roleClass = styles.roleAdmin;
    roleLabel = "Administrateur";
  } else if (isOrganizer) {
    avatarClass = styles.avatarOrganizer;
    roleClass = styles.roleOrganizer;
    roleLabel = "Organisateur";
  }

  return (
    <div className={styles.userMenuWrapper}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={styles.userBtn}
      >
        <div className={`${styles.avatar} ${avatarClass}`}>{initials}</div>
        <span className={styles.userName}>{user.prenom}</span>
      </button>

      {isOpen && (
        <>
          <div
            onClick={() => setIsOpen(false)}
            className={styles.dropdownOverlay}
          />
          <div className={styles.dropdown}>
            {/* Carte utilisateur */}
            <div className={styles.userCard}>
              <p className={styles.userCardName}>{fullName}</p>
              <p className={styles.userCardEmail}>{user.email}</p>
              <span className={`${styles.userCardRole} ${roleClass}`}>
                {roleLabel}
              </span>
            </div>

            {/* Liens communs à tous les utilisateurs connectés */}
            <Link to="/my-reservations" className={styles.dropdownLink}>
              <Calendar size={14} />
              Mes réservations
            </Link>

            <Link to="/favoris" className={styles.dropdownLink}>
              <Heart size={14} />
              Mes favoris
            </Link>

            {/* Liens organisateur (si is_organisateur) */}
            {isOrganizer && (
              <>
                <Link to="/dashboard" className={styles.dropdownLink}>
                  <Sparkles size={14} />
                  Mon tableau de bord
                </Link>
                <Link to="/organizer" className={styles.dropdownLink}>
                  <Calendar size={14} />
                  Mes événements
                </Link>
                <Link to="/organizer/drafts" className={styles.dropdownLink}>
                  <FileText size={14} />
                  Brouillons
                </Link>
              </>
            )}

            {/* Liens admin */}
            {isAdmin && (
              <>
                <Link to="/admin" className={styles.dropdownLink}>
                  <ShieldCheck size={14} />
                  Panneau admin
                </Link>
                <Link to="/admin/demandes" className={styles.dropdownLink}>
                  <FileText size={14} />
                  Demandes
                </Link>
              </>
            )}

            {/* Profil (commun à tous) */}
            <Link to="/profile" className={styles.dropdownLink}>
              <User size={14} />
              Mon profil
            </Link>

            {/* Paramètres (commun à tous) */}
            <Link to="/settings" className={styles.dropdownLink}>
              <Settings size={14} />
              Paramètres
            </Link>

            {/* Logout */}
            <div className={styles.dropdownDivider}>
              <button
                onClick={() => {
                  setIsOpen(false);
                  if (onLogout) onLogout();
                }}
                className={styles.logoutBtn}
              >
                <LogOut size={14} />
                Déconnexion
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}