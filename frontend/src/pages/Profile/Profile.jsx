import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Mail, Phone, MapPin, Heart, Edit3, Plus,
  ShieldCheck, Sparkles, Ticket, CheckCircle, AlertCircle,
  Briefcase, Clock, XCircle, ArrowRight, Store,
} from "lucide-react";
import { useAuth } from "../../context/useAuth";
import { getCurrentUser, getMyDemandeOrganisateur } from "../../services/authService";
import EditInterestsModal from "../../components/EditInterestsModal/EditInterestsModal";
import styles from "./Profile.module.css";

export default function Profile() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [showEditModal, setShowEditModal] = useState(false);
  const [profileData, setProfileData] = useState(user);
  const [demande, setDemande] = useState(null);
  const [loadingDemande, setLoadingDemande] = useState(true);

  // Recharge les infos fraîches du backend au montage
  useEffect(() => {
    getCurrentUser()
      .then((data) => {
        setProfileData(data);
        updateUser(data);
      })
      .catch((err) => console.error("Erreur chargement profil :", err));

    // Charge ma demande d'organisateur
    getMyDemandeOrganisateur()
      .then((data) => setDemande(data))
      .catch((err) => console.error("Erreur chargement demande :", err))
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

  // Si organisateur, on adapte le badge
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

  // Format de date FR
  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
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
          </div>

          <div className={styles.infoRow}>
            <Mail size={16} className={styles.infoIcon} />
            <span className={styles.infoLabel}>Email</span>
            <span className={styles.infoValue}>{profileData.email}</span>
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
            <MapPin size={16} className={styles.infoIcon} />
            <span className={styles.infoLabel}>Localisation</span>
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

      {/* Modal d'édition */}
      {showEditModal && (
        <EditInterestsModal
          currentInterets={interets}
          onClose={() => setShowEditModal(false)}
          onSaved={handleInteretsSaved}
        />
      )}
    </div>
  );
}

// Section organisateur avec ses 4 cas
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