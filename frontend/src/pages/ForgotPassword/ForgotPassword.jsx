import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { requestPasswordReset } from "../../services/authService";
import styles from "./ForgotPassword.module.css";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const value = email.trim();
    if (!value) {
      setError("Veuillez saisir votre adresse email.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setError("Adresse email invalide.");
      return;
    }

    setLoading(true);
    try {
      await requestPasswordReset(value);
      setSent(true);
    } catch (err) {
      console.error("Erreur demande réinitialisation :", err);
      setError("Une erreur est survenue. Réessayez dans un instant.");
    } finally {
      setLoading(false);
    }
  };

  // === Écran de confirmation ===
  if (sent) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.successIcon}>
            <CheckCircle size={34} />
          </div>

          <h1 className={styles.title}>Vérifiez votre <span className={styles.titleEm}>boîte mail</span></h1>

          <p className={styles.subtitle}>
            Si un compte est associé à <strong>{email.trim()}</strong>, vous
            recevrez un lien de réinitialisation dans quelques instants.
          </p>

          <div className={styles.infoBox}>
            <p className={styles.infoText}>
              Le lien est valable 24&nbsp;heures. Pensez à consulter votre
              dossier de courriers indésirables si vous ne le voyez pas.
            </p>
          </div>

          <button
            type="button"
            onClick={() => { setSent(false); setEmail(""); }}
            className={styles.linkBtn}
          >
            Essayer avec une autre adresse
          </button>

          <Link to="/login" className={styles.backLink}>
            <ArrowLeft size={14} />
            Retour à la connexion
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
          Mot de passe <span className={styles.titleEm}>oublié</span>
        </h1>
        <p className={styles.subtitle}>
          Saisissez votre adresse email, nous vous enverrons un lien pour
          choisir un nouveau mot de passe.
        </p>

        {error && (
          <div className={styles.globalError}>
            <AlertCircle size={14} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>Adresse email</label>
            <div className={`${styles.inputWrapper} ${error ? styles.inputError : ""}`}>
              <Mail size={16} className={styles.inputIcon} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@exemple.com"
                className={styles.input}
                autoFocus
                autoComplete="email"
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className={styles.btnSubmit}>
            {loading ? (
              <><Loader2 size={16} className={styles.spinner} /> Envoi en cours...</>
            ) : (
              "Envoyer le lien"
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
