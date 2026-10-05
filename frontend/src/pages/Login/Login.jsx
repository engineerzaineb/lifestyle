import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Mail, Lock, Eye, EyeOff, ArrowRight, Check, AlertCircle
} from "lucide-react";
import { useAuth } from "../../context/useAuth";
import { login as loginApi } from "../../services/authService";
import styles from "./Login.module.css";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState({});
  const [globalError, setGlobalError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Page de destination après login
  const redirectTo = location.state?.from || null;

  // Validation du formulaire
  const validate = () => {
    const newErrors = {};
    if (!email.trim()) newErrors.email = "Email requis";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = "Email invalide";
    if (!password) newErrors.password = "Mot de passe requis";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Soumission : appelle le vrai backend Django
  const handleSubmit = async (e) => {
    e.preventDefault();
    setGlobalError("");
    if (!validate()) return;

    setIsLoading(true);

    try {
      // Appel API vers POST /api/auth/login/
      const response = await loginApi({
        email: email.trim().toLowerCase(),
        password,
      });

      // Le backend renvoie { access, refresh, user }
      const { access, refresh, user } = response;

      // Stocke tout dans le AuthContext (qui sauvegarde aussi dans localStorage)
      login(user, access, refresh);

      // Redirection selon le rôle de l'utilisateur
      // Redirection selon le rôle de l'utilisateur
        if (redirectTo) {
          navigate(redirectTo);
        } else if (user.role === "admin") {
          navigate("/admin");
        } else if (user.is_organisateur) {
          navigate("/dashboard");
        } else {
          navigate("/home");
        }
    } catch (err) {
      // Gestion des erreurs du backend
      if (err.response?.status === 401) {
        setGlobalError("Email ou mot de passe incorrect.");
      } else if (err.response?.data?.detail) {
        setGlobalError(err.response.data.detail);
      } else if (err.response?.data?.email) {
        setErrors({ email: err.response.data.email[0] });
      } else if (err.response?.data?.password) {
        setErrors({ password: err.response.data.password[0] });
      } else if (err.message === "Network Error") {
        setGlobalError("Impossible de joindre le serveur. Vérifiez votre connexion.");
      } else {
        setGlobalError("Une erreur est survenue. Réessayez.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Logo */}
        <div className={styles.logoWrapper}>
          <div className={styles.logoIcon}>E</div>
        </div>

        <h1 className={styles.title}>
          Bon retour sur <span className={styles.titleEm}>Eventu</span>
        </h1>
        <p className={styles.subtitle}>
          Connectez-vous pour accéder à votre espace
        </p>

        {globalError && (
          <div className={styles.globalError}>
            <AlertCircle size={14} style={{ display: "inline", marginRight: 6, verticalAlign: "middle" }} />
            {globalError}
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Email */}
          <div className={styles.field}>
            <label className={styles.label}>Email</label>
            <div className={`${styles.inputWrapper} ${errors.email ? styles.error : ""}`}>
              <span className={styles.inputIcon}><Mail size={15} /></span>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErrors({ ...errors, email: undefined }); }}
                placeholder="vous@exemple.tn"
                className={styles.input}
                autoFocus
                autoComplete="email"
              />
            </div>
            {errors.email && <p className={styles.errorMsg}>{errors.email}</p>}
          </div>

          {/* Mot de passe */}
          <div className={styles.field}>
            <div className={styles.fieldHeader}>
              <label className={styles.label}>Mot de passe</label>
              <Link to="/forgot-password" className={styles.forgotLink}>
                Oublié ?
              </Link>
            </div>
            <div className={`${styles.inputWrapper} ${errors.password ? styles.error : ""}`}>
              <span className={styles.inputIcon}><Lock size={15} /></span>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setErrors({ ...errors, password: undefined }); }}
                placeholder="Votre mot de passe"
                className={styles.input}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={styles.inputBtn}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {errors.password && <p className={styles.errorMsg}>{errors.password}</p>}
          </div>

          {/* Se souvenir de moi */}
          <label className={styles.remember}>
            <button
              type="button"
              onClick={() => setRemember(!remember)}
              className={`${styles.checkbox} ${remember ? styles.checked : ""}`}
            >
              {remember && <Check size={11} strokeWidth={3} />}
            </button>
            Se souvenir de moi
          </label>

          {/* Bouton de connexion */}
          <button
            type="submit"
            disabled={isLoading}
            className={styles.btnSubmit}
          >
            {isLoading ? (
              <>
                <span className={styles.spinner} />
                Connexion...
              </>
            ) : (
              <>
                Se connecter
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </form>

        {/* Séparateur */}
        <div className={styles.divider}>OU CONTINUER AVEC</div>

        {/* OAuth */}
        <div className={styles.oauthGrid}>
          <button
            type="button"
            className={styles.oauthBtn}
            disabled
            title="Disponible bientôt"
          >
            <GoogleIcon /> Google
          </button>
          <button
            type="button"
            className={styles.oauthBtn}
            disabled
            title="Disponible bientôt"
          >
            <FacebookIcon /> Facebook
          </button>
        </div>

        <p className={styles.registerLink}>
          Pas encore de compte ?{" "}
          <Link to="/register">Créer un compte</Link>
        </p>
      </div>
    </div>
  );
}

// Icônes SVG inline pour Google et Facebook
function GoogleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="#1877F2">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}