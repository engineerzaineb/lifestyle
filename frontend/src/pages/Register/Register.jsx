import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  User, Mail, Phone, MapPin, Lock, Eye, EyeOff,
  ArrowRight, Check, AlertCircle,
} from "lucide-react";
import { useAuth } from "../../context/useAuth";
import { register as registerApi } from "../../services/authService";
import { VILLES_TUNISIE } from "../../utils/constants";
import LocationPermissionModal from "../../components/LocationPermissionModal/LocationPermissionModal";
import styles from "./Register.module.css";

export default function Register() {
  const [step, setStep] = useState(1);
  const navigate = useNavigate();
  const { login } = useAuth();

  // États du formulaire
  const [formData, setFormData] = useState({
    prenom: "",
    nom: "",
    email: "",
    telephone: "",
    ville: "",
    password: "",
    passwordConfirm: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [cguAccepted, setCguAccepted] = useState(false);
  const [errors, setErrors] = useState({});
  const [globalError, setGlobalError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Modal de géolocalisation
  const [showLocationModal, setShowLocationModal] = useState(false);

  const handleFieldChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: undefined });
    }
  };

  // Force du mot de passe
  const getPasswordStrength = (password) => {
    if (!password) return 0;
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) strength++;
    if (/\d/.test(password) || /[!@#$%^&*]/.test(password)) strength++;
    return strength;
  };

  const passwordStrength = getPasswordStrength(formData.password);
  const strengthLabel = ["", "Faible", "Moyen", "Fort"][passwordStrength];

  // Validation
  const validateForm = () => {
    const newErrors = {};

    if (!formData.prenom.trim()) newErrors.prenom = "Prénom requis";
    if (!formData.nom.trim()) newErrors.nom = "Nom requis";

    if (!formData.email.trim()) {
      newErrors.email = "Email requis";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Email invalide";
    }

    if (!formData.password) {
      newErrors.password = "Mot de passe requis";
    } else if (formData.password.length < 8) {
      newErrors.password = "Minimum 8 caractères";
    }

    if (formData.password !== formData.passwordConfirm) {
      newErrors.passwordConfirm = "Les mots de passe ne correspondent pas";
    }

    if (!cguAccepted) {
      newErrors.cgu = "Vous devez accepter les CGU";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Soumission du formulaire
  const handleSubmit = (e) => {
    e.preventDefault();
    setGlobalError("");
    if (!validateForm()) return;

    // On ouvre le modal de géoloc avant d'envoyer au backend
    setShowLocationModal(true);
  };

  const handleLocationAllowed = async (position) => {
    setShowLocationModal(false);
    await submitRegistration(position);
  };

  const handleLocationDenied = async () => {
    setShowLocationModal(false);
    await submitRegistration(null);
  };

  // Inscription au backend
  const submitRegistration = async (position) => {
    setIsLoading(true);

    try {
      // Tous les nouveaux comptes sont créés comme "utilisateur"
      const payload = {
        email: formData.email.trim().toLowerCase(),
        nom: formData.nom.trim(),
        prenom: formData.prenom.trim(),
        telephone: formData.telephone.trim(),
        ville: formData.ville,
        role: "utilisateur",
        password: formData.password,
      };

      if (position) {
        payload.latitude = position.latitude;
        payload.longitude = position.longitude;
      }

      const response = await registerApi(payload);
      const { access, refresh, user } = response;

      // Auto-connexion (skip location update car déjà envoyée)
      login(user, access, refresh, true);

      // Étape de succès
      setStep(2);

      // Tous les nouveaux comptes vont à l'onboarding des intérêts
      setTimeout(() => {
        navigate("/onboarding/interests");
      }, 2000);
    } catch (err) {
      console.error("Erreur d'inscription :", err);

      const data = err.response?.data;
      if (data) {
        const fieldErrors = {};
        if (data.email) fieldErrors.email = Array.isArray(data.email) ? data.email[0] : data.email;
        if (data.password) fieldErrors.password = Array.isArray(data.password) ? data.password[0] : data.password;
        if (data.nom) fieldErrors.nom = Array.isArray(data.nom) ? data.nom[0] : data.nom;
        if (data.prenom) fieldErrors.prenom = Array.isArray(data.prenom) ? data.prenom[0] : data.prenom;

        if (Object.keys(fieldErrors).length > 0) {
          setErrors(fieldErrors);
        } else {
          setGlobalError(data.detail || "Erreur lors de l'inscription. Réessayez.");
        }
      } else if (err.message === "Network Error") {
        setGlobalError("Impossible de joindre le serveur. Vérifiez votre connexion.");
      } else {
        setGlobalError("Une erreur est survenue. Réessayez.");
      }

      setIsLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <Steps currentStep={step} />

        {step === 1 && (
          <Step1Form
            formData={formData}
            errors={errors}
            globalError={globalError}
            isLoading={isLoading}
            showPassword={showPassword}
            showPasswordConfirm={showPasswordConfirm}
            cguAccepted={cguAccepted}
            passwordStrength={passwordStrength}
            strengthLabel={strengthLabel}
            onFieldChange={handleFieldChange}
            onTogglePassword={() => setShowPassword(!showPassword)}
            onTogglePasswordConfirm={() => setShowPasswordConfirm(!showPasswordConfirm)}
            onCguToggle={() => setCguAccepted(!cguAccepted)}
            onSubmit={handleSubmit}
          />
        )}

        {step === 2 && <Step2Success />}
      </div>

      {showLocationModal && (
        <LocationPermissionModal
          onAllow={handleLocationAllowed}
          onDeny={handleLocationDenied}
        />
      )}
    </div>
  );
}

// Indicateur d'étapes (2 étapes maintenant)
function Steps({ currentStep }) {
  return (
    <div className={styles.steps}>
      <StepDot number={1} currentStep={currentStep} />
      <div className={`${styles.stepLine} ${currentStep > 1 ? styles.completed : ""}`} />
      <StepDot number={2} currentStep={currentStep} />
    </div>
  );
}

function StepDot({ number, currentStep }) {
  const isActive = number === currentStep;
  const isCompleted = number < currentStep;
  const className = `${styles.stepDot} ${isActive ? styles.active : ""} ${isCompleted ? styles.completed : ""}`;

  return (
    <div className={className}>
      {isCompleted ? <Check size={14} strokeWidth={3} /> : number}
    </div>
  );
}

// Étape 1 : formulaire d'inscription
function Step1Form({
  formData, errors, globalError, isLoading,
  showPassword, showPasswordConfirm,
  cguAccepted, passwordStrength, strengthLabel,
  onFieldChange, onTogglePassword, onTogglePasswordConfirm,
  onCguToggle, onSubmit,
}) {
  return (
    <>
      <h1 className={styles.title}>
        Rejoindre <span className={styles.titleEm}>Eventu</span>
      </h1>
      <p className={styles.subtitle}>
        Créez votre compte en quelques secondes
      </p>

      {globalError && (
        <div style={{
          padding: "10px 14px",
          background: "var(--color-danger-light)",
          color: "var(--color-danger-text)",
          borderRadius: "var(--radius-md)",
          fontSize: 13,
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}>
          <AlertCircle size={14} />
          {globalError}
        </div>
      )}

      <form onSubmit={onSubmit} className={styles.form}>
        {/* Prénom + Nom */}
        <div className={styles.formRow}>
          <Field
            label="Prénom"
            required
            icon={User}
            value={formData.prenom}
            onChange={(v) => onFieldChange("prenom", v)}
            placeholder="Yasmine"
            error={errors.prenom}
            autoFocus
          />
          <Field
            label="Nom"
            required
            icon={User}
            value={formData.nom}
            onChange={(v) => onFieldChange("nom", v)}
            placeholder="Ben Ali"
            error={errors.nom}
          />
        </div>

        {/* Email */}
        <Field
          label="Email"
          required
          type="email"
          icon={Mail}
          value={formData.email}
          onChange={(v) => onFieldChange("email", v)}
          placeholder="yasmine@exemple.tn"
          error={errors.email}
        />

        {/* Téléphone */}
        <Field
          label="Téléphone"
          optional
          type="tel"
          icon={Phone}
          value={formData.telephone}
          onChange={(v) => onFieldChange("telephone", v)}
          placeholder="+216 99 999 999"
          error={errors.telephone}
        />

        {/* Ville */}
        <div className={styles.field}>
          <label className={styles.label}>
            Ville
            <span className={styles.optional}>(optionnel)</span>
          </label>
          <div className={styles.inputWrapper}>
            <span className={styles.inputIcon}>
              <MapPin size={15} />
            </span>
            <select
              value={formData.ville}
              onChange={(e) => onFieldChange("ville", e.target.value)}
              className={styles.input}
              style={{ cursor: "pointer" }}
            >
              <option value="">Sélectionner...</option>
              {VILLES_TUNISIE.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Mot de passe */}
        <div className={styles.field}>
          <label className={styles.label}>
            Mot de passe
            <span className={styles.required}>*</span>
          </label>
          <div className={`${styles.inputWrapper} ${errors.password ? styles.error : ""}`}>
            <span className={styles.inputIcon}>
              <Lock size={15} />
            </span>
            <input
              type={showPassword ? "text" : "password"}
              value={formData.password}
              onChange={(e) => onFieldChange("password", e.target.value)}
              placeholder="Minimum 8 caractères"
              className={styles.input}
            />
            <button
              type="button"
              onClick={onTogglePassword}
              className={styles.inputBtn}
              aria-label={showPassword ? "Masquer" : "Afficher"}
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          {errors.password && <p className={styles.errorMsg}>{errors.password}</p>}

          {formData.password && (
            <>
              <div className={styles.passwordStrength}>
                <div className={`${styles.strengthBar} ${passwordStrength >= 1 ? styles[`active${passwordStrength}`] : ""}`} />
                <div className={`${styles.strengthBar} ${passwordStrength >= 2 ? styles[`active${passwordStrength}`] : ""}`} />
                <div className={`${styles.strengthBar} ${passwordStrength >= 3 ? styles[`active${passwordStrength}`] : ""}`} />
              </div>
              {strengthLabel && (
                <p className={styles.strengthLabel}>
                  Force du mot de passe : <strong>{strengthLabel}</strong>
                </p>
              )}
            </>
          )}
        </div>

        {/* Confirmation mot de passe */}
        <div className={styles.field}>
          <label className={styles.label}>
            Confirmer le mot de passe
            <span className={styles.required}>*</span>
          </label>
          <div className={`${styles.inputWrapper} ${errors.passwordConfirm ? styles.error : ""}`}>
            <span className={styles.inputIcon}>
              <Lock size={15} />
            </span>
            <input
              type={showPasswordConfirm ? "text" : "password"}
              value={formData.passwordConfirm}
              onChange={(e) => onFieldChange("passwordConfirm", e.target.value)}
              placeholder="Retapez votre mot de passe"
              className={styles.input}
            />
            <button
              type="button"
              onClick={onTogglePasswordConfirm}
              className={styles.inputBtn}
              aria-label={showPasswordConfirm ? "Masquer" : "Afficher"}
            >
              {showPasswordConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          {errors.passwordConfirm && <p className={styles.errorMsg}>{errors.passwordConfirm}</p>}
        </div>

        {/* CGU */}
        <label className={styles.cguWrapper}>
          <button
            type="button"
            onClick={onCguToggle}
            className={`${styles.checkbox} ${cguAccepted ? styles.checked : ""}`}
            aria-label="Accepter les CGU"
          >
            {cguAccepted && <Check size={12} strokeWidth={3} />}
          </button>
          <span className={styles.cguText}>
            J'accepte les{" "}
            <Link to="/legal/cgu" className={styles.cguLink}>conditions d'utilisation</Link>
            {" "}et la{" "}
            <Link to="/legal/privacy" className={styles.cguLink}>politique de confidentialité</Link>
            {" "}d'Eventu.
          </span>
        </label>
        {errors.cgu && <p className={styles.errorMsg}>{errors.cgu}</p>}

        {/* Note : devenir organisateur plus tard */}
        <div className={styles.infoBox}>
          <p style={{ fontSize: 12, color: "var(--color-text-muted)", margin: 0 }}>
            💡 Vous voulez organiser des événements ? Après inscription, vous pourrez en faire la demande depuis votre profil.
          </p>
        </div>

        {/* Bouton submit */}
        <div className={styles.actions}>
          <button
            type="submit"
            disabled={isLoading}
            className={`${styles.btnContinue} ${styles.btnGradient}`}
            style={{ width: "100%" }}
          >
            {isLoading ? "Création..." : "Créer mon compte"}
            {!isLoading && <ArrowRight size={14} />}
          </button>
        </div>
      </form>

      <p className={styles.loginLink}>
        Vous avez déjà un compte ?{" "}
        <Link to="/login">Se connecter</Link>
      </p>
    </>
  );
}

// Field réutilisable
function Field({
  label, required, optional, type = "text", icon: Icon,
  value, onChange, placeholder, error, autoFocus,
}) {
  return (
    <div className={styles.field}>
      <label className={styles.label}>
        {label}
        {required && <span className={styles.required}>*</span>}
        {optional && <span className={styles.optional}>(optionnel)</span>}
      </label>
      <div className={`${styles.inputWrapper} ${error ? styles.error : ""}`}>
        {Icon && (
          <span className={styles.inputIcon}>
            <Icon size={15} />
          </span>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={styles.input}
          autoFocus={autoFocus}
        />
      </div>
      {error && <p className={styles.errorMsg}>{error}</p>}
    </div>
  );
}

// Étape 2 : succès
function Step2Success() {
  return (
    <div className={styles.success}>
      <div className={styles.successIcon}>
        <Check size={36} strokeWidth={2.5} />
      </div>
      <h2 className={styles.successTitle}>
        Bienvenue sur <span className={styles.titleEm}>Eventu</span> !
      </h2>
      <p className={styles.successDesc}>
        Votre compte a été créé avec succès.<br />
        Personnalisons votre expérience...
      </p>
    </div>
  );
}