import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Mail, Phone, MapPin, Heart, Edit3, Plus,
  ShieldCheck, Sparkles, Ticket, CheckCircle, AlertCircle,
  Briefcase, Clock, XCircle, ArrowRight, Store,
  Lock, Save, X, Eye, EyeOff, Navigation, Loader2,
} from "lucide-react";
import { useAuth } from "../../context/useAuth";
import {
  getCurrentUser, getMyDemandeOrganisateur,
  updateProfile, changePassword, updateLocation,
} from "../../services/authService";
import { useToastContext } from "../../components/iu/Toast/ToastProvider";
import { VILLES_TUNISIE } from "../../utils/constants";
import EditInterestsModal from "../../components/EditInterestsModal/EditInterestsModal";
import styles from "./Profile.module.css";

export default function Profile() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const toast = useToastContext();

  const [showEditModal, setShowEditModal] = useState(false);
  const [profileData, setProfileData] = useState(user);
  const [demande, setDemande] = useState(null);
  const [loadingDemande, setLoadingDemande] = useState(true);

  // Édition des informations personnelles
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ nom: "", prenom: "", telephone: "", ville: "" });
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Changement de mot de passe
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // Localisation
  const [locating, setLocating] = useState(false);

  // Ref sur toast : évite de relancer les effets à chaque notification
  const toastRef = useRef(toast);
  useEffect(() => { toastRef.current = toast; }, [toast]);

  // Recharge les infos fraîches du backend au montage
  useEffect(() => {
    getCurrentUser()
      .then((data) => {
        setProfileData(data);
        updateUser(data);
      })
      .catch((err) => console.error("Erreur chargement profil :", err));

    getMyDemandeOrganisateur()
      .then((data) => setDemande(data))
      .catch((err) => {
        // 404 = pas de demande, c'est un cas normal et non une erreur
        if (err.response?.status !== 404) {
          console.error("Erreur chargement demande :", err);
        }
      })
      .finally(() => setLoadingDemande(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!profileData) return null;

  const initials = `${profileData.prenom?.[0] || ""}${profileData.nom?.[0] || ""}`.toUpperCase();
  const fullName = `${profileData.prenom} ${profileData.nom}`;
  const interets = profileData.interets || [];
  const isOrganisateur = profileData.is_organisateur;

  // Classes selon le rôle
  const avatarClass = {
    utilisateur: styles.avatarUser,
    admin: styles.avatarAdmin,
  }[profileData.role] || styles.avatarUser;

  const roleClass = {
    utilisateur: styles.roleUser,
    admin: styles.roleAdmin,
  }[profileData.role] || styles.roleUser;

  let roleLabel = {
    utilisateur: "Utilisateur",
    admin: "Administrateur",
  }[profileData.role] || "Utilisateur";

  let RoleIcon = {
    utilisateur: Ticket,
    admin: ShieldCheck,
  }[profileData.role] || Ticket;

  if (isOrganisateur && profileData.role !== "admin") {
    roleLabel = "Organisateur";
    RoleIcon = Sparkles;
  }

  const handleInteretsSaved = (updatedUser) => {
    setProfileData(updatedUser);
    updateUser(updatedUser);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "numeric", month: "long", year: "numeric",
    });
  };

  // === ÉDITION DU PROFIL ===

  const startEditing = () => {
    setForm({
      nom: profileData.nom || "",
      prenom: profileData.prenom || "",
      telephone: profileData.telephone || "",
      ville: profileData.ville || "",
    });
    setFormErrors({});
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setFormErrors({});
  };

  const validateForm = () => {
    const errors = {};
    if (form.prenom.trim().length < 2) errors.prenom = "Au moins 2 caractères";
    if (form.nom.trim().length < 2) errors.nom = "Au moins 2 caractères";
    if (form.telephone) {
      const cleaned = form.telephone.replace(/[\s-]/g, "");
      if (!/^\+?\d+$/.test(cleaned)) errors.telephone = "Numéro invalide";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      const updated = await updateProfile({
        nom: form.nom.trim(),
        prenom: form.prenom.trim(),
        telephone: form.telephone.trim(),
        ville: form.ville,
      });
      setProfileData(updated);
      updateUser(updated);
      setEditing(false);
      toast.success("Profil mis à jour");
    } catch (err) {
      console.error("Erreur mise à jour profil :", err);
      const data = err.response?.data;
      if (data && typeof data === "object") {
        const fieldErrors = {};
        Object.entries(data).forEach(([key, val]) => {
          fieldErrors[key] = Array.isArray(val) ? val[0] : String(val);
        });
        setFormErrors(fieldErrors);
      }
      toast.error("Impossible d'enregistrer les modifications");
    } finally {
      setSaving(false);
    }
  };

  // === LOCALISATION ===

  const handleActivateLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Votre navigateur ne gère pas la géolocalisation");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await updateLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            source: "manual",
          });
          const fresh = await getCurrentUser();
          setProfileData(fresh);
          updateUser(fresh);
          toast.success("Position enregistrée");
        } catch (err) {
          console.error("Erreur mise à jour position :", err);
          toast.error("Impossible d'enregistrer la position");
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        console.warn("Géolocalisation refusée :", err.message);
        toast.warning("Vous avez refusé l'accès à votre position");
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <div className={`${styles.avatar} ${avatarClass}`}>{initials}</div>
          <div className={styles.headerInfo}>
            <h1 className={styles.name}>{fullName}</h1>
            <span className={`${styles.roleBadge} ${roleClass}`}>
              <RoleIcon size={12} />
              {roleLabel}
            </span>
          </div>
        </div>

        {/* Informations personnelles */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Informations personnelles</h2>
            {!editing && (
              <button
                type="button"
                onClick={startEditing}
                className={styles.editBtn}
              >
                <Edit3 size={13} />
                Modifier
              </button>
            )}
          </div>

          {editing ? (
            /* --- MODE ÉDITION --- */
            <div className={styles.form}>
              <div className={styles.formRow}>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Prénom</label>
                  <input
                    type="text"
                    value={form.prenom}
                    onChange={(e) => setForm({ ...form, prenom: e.target.value })}
                    className={`${styles.formInput} ${formErrors.prenom ? styles.formInputError : ""}`}
                    maxLength={50}
                  />
                  {formErrors.prenom && (
                    <span className={styles.formErrorText}>{formErrors.prenom}</span>
                  )}
                </div>

                <div className={styles.formField}>
                  <label className={styles.formLabel}>Nom</label>
                  <input
                    type="text"
                    value={form.nom}
                    onChange={(e) => setForm({ ...form, nom: e.target.value })}
                    className={`${styles.formInput} ${formErrors.nom ? styles.formInputError : ""}`}
                    maxLength={50}
                  />
                  {formErrors.nom && (
                    <span className={styles.formErrorText}>{formErrors.nom}</span>
                  )}
                </div>
              </div>

              <div className={styles.formField}>
                <label className={styles.formLabel}>Téléphone</label>
                <input
                  type="tel"
                  value={form.telephone}
                  onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                  placeholder="20 123 456"
                  className={`${styles.formInput} ${formErrors.telephone ? styles.formInputError : ""}`}
                  maxLength={20}
                />
                {formErrors.telephone && (
                  <span className={styles.formErrorText}>{formErrors.telephone}</span>
                )}
              </div>

              <div className={styles.formField}>
                <label className={styles.formLabel}>Ville</label>
                <select
                  value={form.ville}
                  onChange={(e) => setForm({ ...form, ville: e.target.value })}
                  className={styles.formInput}
                >
                  <option value="">Non renseignée</option>
                  {VILLES_TUNISIE.map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>

              <div className={styles.formActions}>
                <button
                  type="button"
                  onClick={cancelEditing}
                  disabled={saving}
                  className={styles.btnCancel}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className={styles.btnSave}
                >
                  <Save size={14} />
                  {saving ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>
            </div>
          ) : (
            /* --- MODE LECTURE --- */
            <>
              <div className={styles.infoRow}>
                <Mail size={16} className={styles.infoIcon} />
                <span className={styles.infoLabel}>Email</span>
                <span className={styles.infoValue}>
                  {profileData.email}
                  <span className={styles.infoNote}>non modifiable</span>
                </span>
              </div>

              <div className={styles.infoRow}>
                <Phone size={16} className={styles.infoIcon} />
                <span className={styles.infoLabel}>Téléphone</span>
                <span className={styles.infoValue}>
                  {profileData.telephone || "Non renseigné"}
                </span>
              </div>

              <div className={styles.infoRow}>
                <MapPin size={16} className={styles.infoIcon} />
                <span className={styles.infoLabel}>Ville</span>
                <span className={styles.infoValue}>
                  {profileData.ville || "Non renseignée"}
                </span>
              </div>

              <div className={styles.infoRow}>
                <Navigation size={16} className={styles.infoIcon} />
                <span className={styles.infoLabel}>Localisation</span>
                <span className={styles.infoValue}>
                  {profileData.has_location ? (
                    <span className={`${styles.locationStatus} ${styles.locationOn}`}>
                      <CheckCircle size={12} />
                      Activée
                    </span>
                  ) : (
                    <span className={`${styles.locationStatus} ${styles.locationOff}`}>
                      <AlertCircle size={12} />
                      Non activée
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleActivateLocation}
                    disabled={locating}
                    className={styles.locationBtn}
                  >
                    {locating ? (
                      <><Loader2 size={12} className={styles.spin} /> Localisation...</>
                    ) : profileData.has_location ? (
                      "Mettre à jour"
                    ) : (
                      "Activer"
                    )}
                  </button>
                </span>
              </div>

              <p className={styles.locationHint}>
                Votre position sert uniquement à vous proposer les événements
                proches de chez vous.
              </p>
            </>
          )}
        </div>

        {/* Sécurité */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>
              <Lock size={16} className={styles.cardTitleIcon} />
              Sécurité
            </h2>
          </div>
          <div className={styles.securityRow}>
            <div>
              <p className={styles.securityLabel}>Mot de passe</p>
              <p className={styles.securityHint}>
                Choisissez un mot de passe long et unique.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowPasswordModal(true)}
              className={styles.editBtn}
            >
              <Edit3 size={13} />
              Modifier
            </button>
          </div>
        </div>

        {/* Centres d'intérêt */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>
              <Heart size={16} className={styles.cardTitleIcon} />
              Mes centres d'intérêt
            </h2>
            {interets.length > 0 && (
              <button
                type="button"
                onClick={() => setShowEditModal(true)}
                className={styles.editBtn}
              >
                <Edit3 size={13} />
                Modifier
              </button>
            )}
          </div>

          {interets.length > 0 ? (
            <div className={styles.interetsGrid}>
              {interets.map((interet) => (
                <span key={interet.id} className={styles.interetChip}>
                  {interet.icone && (
                    <span className={styles.interetIcon}>{interet.icone}</span>
                  )}
                  {interet.nom}
                </span>
              ))}
            </div>
          ) : (
            <div className={styles.empty}>
              <p>Vous n'avez pas encore de centres d'intérêt.</p>
              <button
                type="button"
                onClick={() => setShowEditModal(true)}
                className={styles.emptyBtn}
              >
                <Plus size={14} />
                Ajouter mes centres d'intérêt
              </button>
            </div>
          )}
        </div>

        {/* === ESPACE ORGANISATEUR === */}
        {!loadingDemande && (
          <OrganisateurSection
            isOrganisateur={isOrganisateur}
            demande={demande}
            formatDate={formatDate}
            navigate={navigate}
          />
        )}
      </div>

      {/* Modal d'édition des intérêts */}
      {showEditModal && (
        <EditInterestsModal
          currentInterets={interets}
          onClose={() => setShowEditModal(false)}
          onSaved={handleInteretsSaved}
        />
      )}

      {/* Modal de changement de mot de passe */}
      {showPasswordModal && (
        <PasswordModal
          onClose={() => setShowPasswordModal(false)}
          toast={toast}
        />
      )}
    </div>
  );
}


// ============================================================
// Modale de changement de mot de passe
// ============================================================
function PasswordModal({ onClose, toast }) {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [errors, setErrors] = useState({});
  const [globalError, setGlobalError] = useState("");
  const [saving, setSaving] = useState(false);

  const validate = () => {
    const e = {};
    if (!oldPassword) e.old_password = "Champ obligatoire";
    if (newPassword.length < 8) e.new_password = "Au moins 8 caractères";
    if (newPassword !== confirmPassword) e.confirm = "Les mots de passe ne correspondent pas";
    if (oldPassword && newPassword && oldPassword === newPassword) {
      e.new_password = "Doit être différent de l'actuel";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    setGlobalError("");
    if (!validate()) return;

    setSaving(true);
    try {
      await changePassword(oldPassword, newPassword);
      toast.success("Mot de passe modifié");
      onClose();
    } catch (err) {
      console.error("Erreur changement mot de passe :", err);
      const data = err.response?.data;
      if (data && typeof data === "object") {
        const fieldErrors = {};
        Object.entries(data).forEach(([key, val]) => {
          fieldErrors[key] = Array.isArray(val) ? val[0] : String(val);
        });
        setErrors(fieldErrors);
        if (data.detail) setGlobalError(data.detail);
      } else {
        setGlobalError("Impossible de modifier le mot de passe");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Changer mon mot de passe</h2>
          <button onClick={onClose} className={styles.modalClose}>
            <X size={18} />
          </button>
        </div>

        <div className={styles.modalBody}>
          {globalError && (
            <div className={styles.globalError}>
              <AlertCircle size={14} />
              {globalError}
            </div>
          )}

          <div className={styles.formField}>
            <label className={styles.formLabel}>Mot de passe actuel</label>
            <div className={styles.passwordWrap}>
              <input
                type={showOld ? "text" : "password"}
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className={`${styles.formInput} ${errors.old_password ? styles.formInputError : ""}`}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowOld(!showOld)}
                className={styles.passwordToggle}
              >
                {showOld ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {errors.old_password && (
              <span className={styles.formErrorText}>{errors.old_password}</span>
            )}
          </div>

          <div className={styles.formField}>
            <label className={styles.formLabel}>Nouveau mot de passe</label>
            <div className={styles.passwordWrap}>
              <input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={`${styles.formInput} ${errors.new_password ? styles.formInputError : ""}`}
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className={styles.passwordToggle}
              >
                {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {errors.new_password && (
              <span className={styles.formErrorText}>{errors.new_password}</span>
            )}
          </div>

          <div className={styles.formField}>
            <label className={styles.formLabel}>Confirmer le nouveau mot de passe</label>
            <input
              type={showNew ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`${styles.formInput} ${errors.confirm ? styles.formInputError : ""}`}
            />
            {errors.confirm && (
              <span className={styles.formErrorText}>{errors.confirm}</span>
            )}
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button onClick={onClose} disabled={saving} className={styles.btnCancel}>
            Annuler
          </button>
          <button onClick={handleSubmit} disabled={saving} className={styles.btnSave}>
            {saving ? "Enregistrement..." : "Modifier"}
          </button>
        </div>
      </div>
    </div>
  );
}


// ============================================================
// Section organisateur avec ses 4 cas
// ============================================================
function OrganisateurSection({ isOrganisateur, demande, formatDate, navigate }) {
  // CAS 4 : Déjà organisateur validé
  if (isOrganisateur) {
    return (
      <div className={`${styles.card} ${styles.organizerCard} ${styles.organizerValidated}`}>
        <div className={styles.organizerIconWrap}>
          <Store size={22} />
        </div>
        <div className={styles.organizerContent}>
          <h3 className={styles.organizerTitle}>
            <CheckCircle size={16} className={styles.organizerCheckIcon} />
            Vous êtes organisateur
          </h3>
          {demande?.nom_organisation && (
            <p className={styles.organizerSubtitle}>
              {demande.nom_organisation}
              {demande.date_traitement && ` · depuis le ${formatDate(demande.date_traitement)}`}
            </p>
          )}
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className={styles.organizerBtnPrimary}
          >
            Accéder au tableau de bord
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    );
  }

  // CAS 2 : Demande en attente
  if (demande && demande.statut === "en_attente") {
    return (
      <div className={`${styles.card} ${styles.organizerCard} ${styles.organizerPending}`}>
        <div className={styles.organizerIconWrap}>
          <Clock size={22} />
        </div>
        <div className={styles.organizerContent}>
          <h3 className={styles.organizerTitle}>Demande en cours d'examen</h3>
          <p className={styles.organizerSubtitle}>
            Soumise le {formatDate(demande.date_demande)}. Notre équipe examine votre demande.
          </p>
          <button
            type="button"
            onClick={() => navigate("/devenir-organisateur")}
            className={styles.organizerBtnSecondary}
          >
            Voir ma demande
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    );
  }

  // CAS 3 : Demande refusée
  if (demande && demande.statut === "refuse") {
    return (
      <div className={`${styles.card} ${styles.organizerCard} ${styles.organizerRefused}`}>
        <div className={styles.organizerIconWrap}>
          <XCircle size={22} />
        </div>
        <div className={styles.organizerContent}>
          <h3 className={styles.organizerTitle}>Demande refusée</h3>
          {demande.motif_refus && (
            <p className={styles.organizerSubtitle}>
              <strong>Motif :</strong> {demande.motif_refus}
            </p>
          )}
          <button
            type="button"
            onClick={() => navigate("/devenir-organisateur")}
            className={styles.organizerBtnPrimary}
          >
            Refaire une demande
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    );
  }

  // CAS 1 : Pas encore de demande
  return (
    <div className={`${styles.card} ${styles.organizerCard} ${styles.organizerDefault}`}>
      <div className={styles.organizerIconWrap}>
        <Briefcase size={22} />
      </div>
      <div className={styles.organizerContent}>
        <h3 className={styles.organizerTitle}>Devenir organisateur</h3>
        <p className={styles.organizerSubtitle}>
          Créez et publiez vos propres événements sur Eventu.
        </p>
        <button
          type="button"
          onClick={() => navigate("/devenir-organisateur")}
          className={styles.organizerBtnPrimary}
        >
          Faire une demande
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}