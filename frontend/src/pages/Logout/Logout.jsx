import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Check, Home, LogIn, Heart } from "lucide-react";
import { useAuth } from "../../context/useAuth";
import styles from "./Logout.module.css";

export default function Logout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);

  // déconnexion automatique au chargement de la page
  useEffect(() => {
    logout();
  }, [logout]);

  // décompte de redirection automatique
  useEffect(() => {
    if (countdown <= 0) {
      navigate("/");
      return;
    }
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, navigate]);

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={`${styles.icon} ${styles.iconSuccess}`}>
          <Check size={36} strokeWidth={2.5} />
        </div>

        <h1 className={styles.title}>
          À bientôt sur <span className={styles.titleEm}>Eventu</span>
        </h1>
        <p className={styles.subtitle}>
          Vous avez été déconnecté avec succès.<br />
          Nous espérons vous revoir très vite ! <Heart size={14} fill="var(--color-pink)" color="var(--color-pink)" style={{ display: "inline", verticalAlign: "middle" }} />
        </p>

        <div className={styles.actions}>
          <Link to="/" className={styles.btnPrimary}>
            <Home size={14} />
            Retour à l'accueil
          </Link>
          <Link to="/login" className={styles.btnSecondary}>
            <LogIn size={14} />
            Se reconnecter
          </Link>
        </div>

        <p className={styles.countdown}>
          Redirection automatique dans {countdown}s...
        </p>
      </div>
    </div>
  );
}