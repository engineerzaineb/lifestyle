import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Lock, Eye, EyeOff, AlertCircle, CheckCircle, Loader2, ArrowLeft,
} from "lucide-react";
import { confirmPasswordReset } from "../../services/authService";
import styles from "./ForgotPassword.module.css";

export default function ResetPassword() {
  const { uid, token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [globalError, setGlobalError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const validate = () => {
    const e = {};
    if (password.length < 8) e.password = "Au moins 8 caractères";
    if (password !== confirm) e.confirm = "Les mots de passe ne correspondent pas";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGlobalError("");
    if (!validate()) return;

    setLoading(true);
    try {
      await confirmPasswordReset(uid, token, password);
      setDone(true);
      // Redirection après un court délai pour laisser lire le message
      setTimeout(() => navigate("/login"), 2500);
    } catch (err) {
      console.error("Erreur réinitialisation :", err);
      const data = err.response?.data;
      if (data?.token || data?.uid) {
        setGlobalError(
          "Ce lien n'est plus valide. Il a peut-être expiré ou déjà été utilisé."
        );
      } else if (data?.new_password) {
        setErrors({
          password: Array.isArray(data.new_password)
            ? data.new_password[0]
            : String(data.new_password),
        });
      } else {
        setGlobalError("Une erreur est survenue. Réessayez.");
      }
    } finally {
      setLoading(false);
    }
  };

  // === Succès ===
  if (done) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.successIcon}>
            <CheckCircle size={34} />
          </div>
          <h1 className={styles.title}>
            Mot de passe <span className={styles.titleEm}>modifié</span>
          </h1>
          <p className={styles.subtitle}>
            Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.
          </p>
          <Link to="/login" className={styles.btnSubmitLink}>
            Aller à la connexion
          </Link>
        </div>
      </div>
    );
  }

  // === Formulaire ===
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.logoWrapper}>
          <div className={styles.logoIcon}>E</div>
        </div>

        <h1 className={styles.title}>
          Nouveau <span className={styles.titleEm}>mot de passe</span>
        </h1>
        <p className={styles.subtitle}>
          Choisissez un mot de passe long et unique, différent de ceux que vous
          utilisez ailleurs.
        </p>

        {globalError && (
          <div className={styles.globalError}>
            <AlertCircle size={14} />
            {globalError}
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>Nouveau mot de passe</label>
            <div className={`${styles.inputWrapper} ${errors.password ? styles.inputError : ""}`}>
              <Lock size={16} className={styles.inputIcon} />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={styles.input}
                autoFocus
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={styles.inputBtn}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && (
              <span className={styles.errorMsg}>{errors.password}</span>
            )}
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Confirmer le mot de passe</label>
            <div className={`${styles.inputWrapper} ${errors.confirm ? styles.inputError : ""}`}>
              <Lock size={16} className={styles.inputIcon} />
              <input
                type={showPassword ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                className={styles.input}
                autoComplete="new-password"
              />
            </div>
            {errors.confirm && (
              <span className={styles.errorMsg}>{errors.confirm}</span>
            )}
          </div>

          <button type="submit" disabled={loading} className={styles.btnSubmit}>
            {loading ? (
              <><Loader2 size={16} className={styles.spinner} /> Enregistrement...</>
            ) : (
              "Définir le mot de passe"
            )}
          </button>
        </form>

        <Link to="/login" className={styles.backLink}>
          <ArrowLeft size={14} />
          Retour à la connexion
        </Link>
      </div>
    </div>
  );
}
