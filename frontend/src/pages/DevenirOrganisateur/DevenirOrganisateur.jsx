import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Building2, Clock, XCircle, CheckCircle,
  AlertCircle, Trash2, Plus, FileText, Edit3, MapPin, Calendar,
} from "lucide-react";
import {
  getMyDemandeOrganisateur,
  createDemandeOrganisateur,
  cancelMyDemandeOrganisateur,
  getCurrentUser,
  fetchMonHistoriqueDemandes,
} from "../../services/authService";
import { fetchCategories, fetchMyBrouillons, deleteEvent } from "../../services/eventService";
import { useAuth } from "../../context/useAuth";
import { useToastContext } from "../../components/iu/Toast/ToastProvider";
import BrouillonModal from "../../components/BrouillonModal/BrouillonModal";
import styles from "./DevenirOrganisateur.module.css";

const TYPES = [
  { value: "entreprise", label: "Entreprise" },
  { value: "association", label: "Association" },
  { value: "independant", label: "Indépendant" },
];

export default function DevenirOrganisateur() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const toast = useToastContext();

  const [demande, setDemande] = useState(null);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [historique, setHistorique] = useState([]);
  const [showHistorique, setShowHistorique] = useState(false);

  // Brouillons
  const [brouillons, setBrouillons] = useState([]);
  const [showBrouillonModal, setShowBrouillonModal] = useState(false);
  const [editingBrouillon, setEditingBrouillon] = useState(null);

  const [form, setForm] = useState({
    nom_organisation: "",
    type_organisation: "independant",
    matricule_fiscal: "",
    adresse: "",
    telephone_pro: "",
    description: "",
    site_web: "",
    reseaux_sociaux: "",
    categories_prevues: [],
    nouvelles_categories: [],   // catégories proposées par l'orga (texte libre)
  });
  const [logo, setLogo] = useState(null);
  const [errors, setErrors] = useState({});

  // Charge la demande existante + les catégories
  useEffect(() => {
    Promise.all([
      getMyDemandeOrganisateur().catch(() => null),
      fetchCategories().catch(() => []),
      fetchMonHistoriqueDemandes().catch(() => []),
    ]).then(([demandeData, cats, histo]) => {
      setDemande(demandeData);
      setCategories(cats || []);
      setHistorique(histo || []);
      setLoading(false);
    });
  }, []);

  // Charge les brouillons quand la demande est en attente
  useEffect(() => {
    if (demande && demande.statut === "en_attente") {
      loadBrouillons();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demande]);

  const loadBrouillons = () => {
    fetchMyBrouillons()
      .then((data) => setBrouillons(data || []))
      .catch((err) => console.error("Erreur chargement brouillons :", err));
  };

  // Si déjà organisateur, rediriger
  useEffect(() => {
    if (user?.is_organisateur) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  // Si la demande vient d'être validée par l'admin mais que l'AuthContext
  // local est encore stale (is_organisateur=false), on rafraîchit depuis /me/
  // pour que la prochaine navigation reflète le nouveau statut.
  useEffect(() => {
    if (demande?.statut === "valide" && !user?.is_organisateur) {
      getCurrentUser()
        .then((fresh) => {
          if (fresh) updateUser(fresh);
        })
        .catch((err) => console.error("Erreur refresh user :", err));
    }
  }, [demande, user, updateUser]);

  const updateField = (field, value) => {
    setForm({ ...form, [field]: value });
    if (errors[field]) setErrors({ ...errors, [field]: undefined });
  };

  const toggleCategorie = (catId) => {
    const current = form.categories_prevues;
    const newList = current.includes(catId)
      ? current.filter((id) => id !== catId)
      : [...current, catId];
    updateField("categories_prevues", newList);
  };

  const validate = () => {
    const newErrors = {};
    if (!form.nom_organisation.trim()) newErrors.nom_organisation = "Nom requis";
    if (!form.matricule_fiscal.trim()) newErrors.matricule_fiscal = "Matricule requis";
    if (!form.adresse.trim()) newErrors.adresse = "Adresse requise";
    if (!form.telephone_pro.trim()) newErrors.telephone_pro = "Téléphone requis";
    if (!form.description.trim()) newErrors.description = "Description requise";
    if (form.categories_prevues.length === 0 && form.nouvelles_categories.length === 0) {
      newErrors.categories = "Choisissez ou proposez au moins une catégorie";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      toast.warning("Veuillez remplir tous les champs obligatoires");
      return;
    }

    setSubmitting(true);
    try {
      let payload;
      if (logo) {
        payload = new FormData();
        payload.append("nom_organisation", form.nom_organisation);
        payload.append("type_organisation", form.type_organisation);
        payload.append("matricule_fiscal", form.matricule_fiscal);
        payload.append("adresse", form.adresse);
        payload.append("telephone_pro", form.telephone_pro);
        payload.append("description", form.description);
        if (form.site_web) payload.append("site_web", form.site_web);
        if (form.reseaux_sociaux) payload.append("reseaux_sociaux", form.reseaux_sociaux);
        payload.append("logo", logo);
        form.categories_prevues.forEach((id) =>
          payload.append("categories_prevues", id)
        );
        form.nouvelles_categories.forEach((nom) =>
          payload.append("nouvelles_categories", nom)
        );
      } else {
        payload = { ...form };
      }

      const newDemande = await createDemandeOrganisateur(payload);
      setDemande(newDemande);
      toast.success("Votre demande a été soumise avec succès !");
    } catch (err) {
      console.error("Erreur soumission demande :", err);
      const detail = err.response?.data?.detail;
      toast.error(detail || "Erreur lors de la soumission");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm("Êtes-vous sûr de vouloir annuler votre demande ?")) return;

    try {
      await cancelMyDemandeOrganisateur();
      setDemande(null);
      toast.success("Demande annulée");
    } catch (err) {
      console.error("Erreur annulation :", err);
      toast.error("Impossible d'annuler la demande");
    }
  };

  // Brouillons
  const handleNewBrouillon = () => {
    setEditingBrouillon(null);
    setShowBrouillonModal(true);
  };

  const handleEditBrouillon = (brouillon) => {
    setEditingBrouillon(brouillon);
    setShowBrouillonModal(true);
  };

  const handleDeleteBrouillon = async (id) => {
    if (!window.confirm("Supprimer ce brouillon ?")) return;
    try {
      await deleteEvent(id);
      toast.success("Brouillon supprimé");
      loadBrouillons();
    } catch (err) {
      console.error("Erreur suppression brouillon :", err);
      toast.error("Impossible de supprimer le brouillon");
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div style={{ height: 300, background: "var(--color-surface-alt)", borderRadius: 16 }} />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <button onClick={() => navigate("/profile")} className={styles.backBtn}>
          <ArrowLeft size={16} />
          Retour au profil
        </button>

        {/* === HISTORIQUE DES DEMANDES (bouton + panneau repliable) === */}
        {historique.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <button
              type="button"
              onClick={() => setShowHistorique((v) => !v)}
              style={{
                display: "flex", alignItems: "center", gap: 8, width: "100%",
                justifyContent: "space-between", padding: "12px 16px",
                background: "var(--color-surface)", border: "1px solid var(--color-border)",
                borderRadius: 14, cursor: "pointer", fontSize: 14, fontWeight: 600,
                color: "var(--color-text)", fontFamily: "inherit",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Clock size={16} /> Historique de mes demandes ({historique.length})
              </span>
              <span style={{ color: "var(--color-text-muted)" }}>
                {showHistorique ? "▲" : "▼"}
              </span>
            </button>

            {showHistorique && (
            <ul style={{
              listStyle: "none", margin: "10px 0 0", padding: 18,
              background: "var(--color-surface)", border: "1px solid var(--color-border)",
              borderRadius: 14, display: "flex", flexDirection: "column", gap: 10,
            }}>
              {historique.map((h) => {
                const conf = {
                  soumise:  { icon: <FileText size={15} />,    color: "var(--color-text-muted)" },
                  acceptee: { icon: <CheckCircle size={15} />, color: "var(--color-success, #16a34a)" },
                  refusee:  { icon: <XCircle size={15} />,     color: "var(--color-danger, #dc2626)" },
                  retiree:  { icon: <AlertCircle size={15} />, color: "var(--color-warning, #f59e0b)" },
                  annulee:  { icon: <Trash2 size={15} />,      color: "var(--color-text-muted)" },
                }[h.evenement] || { icon: <FileText size={15} />, color: "var(--color-text-muted)" };
                return (
                  <li key={h.id} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <span style={{ color: conf.color, marginTop: 2 }}>{conf.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>
                        {h.evenement_label}
                        {h.nom_organisation ? ` — ${h.nom_organisation}` : ""}
                      </div>
                      {h.motif && (
                        <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>Motif : {h.motif}</div>
                      )}
                      <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                        {formatDate(h.created_at)}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            )}
          </div>
        )}

        {/* === DEMANDE EN ATTENTE === */}
        {demande && demande.statut === "en_attente" && (
          <>
            <div className={styles.statusCard}>
              <div className={`${styles.statusIcon} ${styles.statusPending}`}>
                <Clock size={26} />
              </div>
              <h1 className={styles.statusTitle}>Demande en cours d'examen</h1>
              <p className={styles.statusText}>
                Votre demande a été soumise le {formatDate(demande.date_demande)}.<br />
                Notre équipe l'examine et vous recevrez une réponse bientôt.
              </p>

              <div className={styles.demandeRecap}>
                <h3>Récapitulatif de votre demande</h3>
                <div className={styles.recapRow}>
                  <span>Organisation</span>
                  <strong>{demande.nom_organisation}</strong>
                </div>
                <div className={styles.recapRow}>
                  <span>Type</span>
                  <strong>{TYPES.find((t) => t.value === demande.type_organisation)?.label}</strong>
                </div>
                <div className={styles.recapRow}>
                  <span>Téléphone</span>
                  <strong>{demande.telephone_pro}</strong>
                </div>
              </div>

              <button onClick={handleCancel} className={styles.cancelBtn}>
                <Trash2 size={14} />
                Annuler ma demande
              </button>
            </div>

            {/* === SECTION BROUILLONS === */}
            <div className={styles.brouillonsCard}>
              <div className={styles.brouillonsHeader}>
                <div>
                  <h2 className={styles.brouillonsTitle}>
                    <FileText size={18} />
                    Mes brouillons d'événements
                  </h2>
                  <p className={styles.brouillonsSubtitle}>
                    Préparez vos premiers événements en attendant la validation. Ils aident notre équipe à évaluer votre demande.
                  </p>
                </div>
                <button onClick={handleNewBrouillon} className={styles.newBrouillonBtn}>
                  <Plus size={15} />
                  Nouveau
                </button>
              </div>

              {brouillons.length === 0 ? (
                <div className={styles.brouillonsEmpty}>
                  <FileText size={32} />
                  <p>Aucun brouillon pour l'instant.</p>
                  <button onClick={handleNewBrouillon} className={styles.emptyCreateBtn}>
                    <Plus size={14} />
                    Créer mon premier brouillon
                  </button>
                </div>
              ) : (
                <div className={styles.brouillonsList}>
                  {brouillons.map((b) => (
                    <div key={b.id} className={styles.brouillonItem}>
                      <div className={styles.brouillonInfo}>
                        <p className={styles.brouillonName}>{b.titre}</p>
                        <div className={styles.brouillonMeta}>
                          {b.categorie?.nom && (
                            <span>{b.categorie.nom}</span>
                          )}
                          {b.ville && (
                            <span className={styles.brouillonMetaItem}>
                              <MapPin size={11} />
                              {b.ville}
                            </span>
                          )}
                          {b.date_evenement && (
                            <span className={styles.brouillonMetaItem}>
                              <Calendar size={11} />
                              {formatDate(b.date_evenement)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className={styles.brouillonActions}>
                        <button
                          onClick={() => handleEditBrouillon(b)}
                          className={styles.brouillonEditBtn}
                          aria-label="Modifier"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteBrouillon(b.id)}
                          className={styles.brouillonDeleteBtn}
                          aria-label="Supprimer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* === DEMANDE VALIDÉE (seulement si l'utilisateur est VRAIMENT organisateur) ===
             Si l'admin a retiré le statut, on ne montre plus "Félicitations"
             même si une ancienne demande "valide" traîne encore. */}
        {demande && demande.statut === "valide" && user?.is_organisateur && (
          <div className={styles.statusCard}>
            <div
              className={styles.statusIcon}
              style={{ background: "linear-gradient(135deg, #10B981, #059669)" }}
            >
              <CheckCircle size={26} />
            </div>
            <h1 className={styles.statusTitle}>Félicitations, votre demande a été validée !</h1>
            <p className={styles.statusText}>
              Vous êtes désormais organisateur sur Eventu. Vous pouvez créer
              et publier vos événements dès maintenant.
            </p>

            <button
              onClick={() => navigate("/dashboard")}
              className={styles.submitBtn}
              style={{ marginTop: 8 }}
            >
              Accéder à mon tableau de bord
            </button>
          </div>
        )}

        {/* === DEMANDE REFUSÉE === */}
        {demande && demande.statut === "refuse" && (
          <div className={styles.statusCard}>
            <div className={`${styles.statusIcon} ${styles.statusRefused}`}>
              <XCircle size={26} />
            </div>
            <h1 className={styles.statusTitle}>Demande refusée</h1>
            {demande.motif_refus && (
              <div className={styles.refusBox}>
                <AlertCircle size={16} />
                <div>
                  <strong>Motif du refus :</strong>
                  <p>{demande.motif_refus}</p>
                </div>
              </div>
            )}
            <button
              onClick={async () => {
                try {
                  // On supprime la demande refusée en base pour permettre la re-soumission
                  await cancelMyDemandeOrganisateur();
                  setDemande(null);
                  toast.info("Vous pouvez remplir une nouvelle demande");
                } catch (err) {
                  console.error("Erreur suppression demande refusée :", err);
                  toast.error("Impossible de repartir sur une nouvelle demande");
                }
              }}
              className={styles.submitBtn}
              style={{ marginTop: 16 }}
            >
              Refaire une demande
            </button>
          </div>
        )}

        {/* === FORMULAIRE ===
             Affiché s'il n'y a pas de demande, OU si une demande "valide" existe
             mais que l'utilisateur n'est plus organisateur (statut retiré par l'admin). */}
        {(!demande || (demande.statut === "valide" && !user?.is_organisateur)) && (
          <FormulaireDemand
            form={form}
            errors={errors}
            categories={categories}
            logo={logo}
            submitting={submitting}
            updateField={updateField}
            toggleCategorie={toggleCategorie}
            setLogo={setLogo}
            onSubmit={handleSubmit}
          />
        )}
      </div>

      {/* Modal de brouillon */}
      {showBrouillonModal && (
        <BrouillonModal
          brouillon={editingBrouillon}
          onClose={() => setShowBrouillonModal(false)}
          onSaved={loadBrouillons}
        />
      )}
    </div>
  );
}

// Le formulaire séparé
function FormulaireDemand({
  form, errors, categories, logo, submitting,
  updateField, toggleCategorie, setLogo, onSubmit,
}) {
  const [catInput, setCatInput] = useState("");
  return (
    <>
      <div className={styles.header}>
        <div className={styles.headerIcon}>
          <Building2 size={24} />
        </div>
        <div>
          <h1 className={styles.title}>Devenir organisateur</h1>
          <p className={styles.subtitle}>
            Remplissez ce formulaire pour soumettre votre demande
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} className={styles.form}>
        {/* Nom organisation */}
        <div className={styles.field}>
          <label className={styles.label}>
            Nom de l'organisation <span className={styles.req}>*</span>
          </label>
          <input
            type="text"
            value={form.nom_organisation}
            onChange={(e) => updateField("nom_organisation", e.target.value)}
            placeholder="Ex: Yasmine Events"
            className={`${styles.input} ${errors.nom_organisation ? styles.inputError : ""}`}
          />
          {errors.nom_organisation && <p className={styles.errMsg}>{errors.nom_organisation}</p>}
        </div>

        {/* Type organisation */}
        <div className={styles.field}>
          <label className={styles.label}>
            Type d'organisation <span className={styles.req}>*</span>
          </label>
          <div className={styles.typeGrid}>
            {TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => updateField("type_organisation", t.value)}
                className={`${styles.typeBtn} ${form.type_organisation === t.value ? styles.typeBtnActive : ""}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Matricule fiscal */}
        <div className={styles.field}>
          <label className={styles.label}>
            Matricule fiscal <span className={styles.req}>*</span>
          </label>
          <input
            type="text"
            value={form.matricule_fiscal}
            onChange={(e) => updateField("matricule_fiscal", e.target.value)}
            placeholder="Ex: 1234567/A/M/000"
            className={`${styles.input} ${errors.matricule_fiscal ? styles.inputError : ""}`}
          />
          {errors.matricule_fiscal && <p className={styles.errMsg}>{errors.matricule_fiscal}</p>}
        </div>

        {/* Adresse */}
        <div className={styles.field}>
          <label className={styles.label}>
            Adresse professionnelle <span className={styles.req}>*</span>
          </label>
          <input
            type="text"
            value={form.adresse}
            onChange={(e) => updateField("adresse", e.target.value)}
            placeholder="Ex: Avenue Habib Bourguiba, Sousse"
            className={`${styles.input} ${errors.adresse ? styles.inputError : ""}`}
          />
          {errors.adresse && <p className={styles.errMsg}>{errors.adresse}</p>}
        </div>

        {/* Téléphone pro */}
        <div className={styles.field}>
          <label className={styles.label}>
            Téléphone professionnel <span className={styles.req}>*</span>
          </label>
          <input
            type="tel"
            value={form.telephone_pro}
            onChange={(e) => updateField("telephone_pro", e.target.value)}
            placeholder="+216 22 333 444"
            className={`${styles.input} ${errors.telephone_pro ? styles.inputError : ""}`}
          />
          {errors.telephone_pro && <p className={styles.errMsg}>{errors.telephone_pro}</p>}
        </div>

        {/* Description */}
        <div className={styles.field}>
          <label className={styles.label}>
            Description / Motivations <span className={styles.req}>*</span>
          </label>
          <textarea
            value={form.description}
            onChange={(e) => updateField("description", e.target.value)}
            placeholder="Décrivez votre activité et le type d'événements que vous souhaitez organiser..."
            rows={4}
            className={`${styles.textarea} ${errors.description ? styles.inputError : ""}`}
          />
          {errors.description && <p className={styles.errMsg}>{errors.description}</p>}
        </div>

        {/* Site web (optionnel) */}
        <div className={styles.field}>
          <label className={styles.label}>
            Site web <span className={styles.optional}>(optionnel)</span>
          </label>
          <input
            type="url"
            value={form.site_web}
            onChange={(e) => updateField("site_web", e.target.value)}
            placeholder="https://mon-site.tn"
            className={styles.input}
          />
        </div>

        {/* Réseaux sociaux (optionnel) */}
        <div className={styles.field}>
          <label className={styles.label}>
            Lien réseaux sociaux <span className={styles.optional}>(optionnel)</span>
          </label>
          <input
            type="url"
            value={form.reseaux_sociaux}
            onChange={(e) => updateField("reseaux_sociaux", e.target.value)}
            placeholder="https://instagram.com/mon-compte"
            className={styles.input}
          />
        </div>

        {/* QR code généré automatiquement à partir du lien principal.
            On privilégie le site web, sinon les réseaux sociaux. */}
        {(() => {
          const lien = (form.site_web || form.reseaux_sociaux || "").trim();
          if (!lien) return null;
          const qrUrl =
            "https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=" +
            encodeURIComponent(lien);
          return (
            <div className={styles.field}>
              <label className={styles.label}>QR code de votre lien</label>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <img
                  src={qrUrl}
                  alt="QR code du lien"
                  width={120}
                  height={120}
                  style={{ borderRadius: 8, border: "1px solid var(--color-border)" }}
                />
                <p style={{ fontSize: 12, color: "var(--color-text-muted)", margin: 0 }}>
                  Généré automatiquement. Il pointe vers :<br />
                  <span style={{ wordBreak: "break-all" }}>{lien}</span>
                </p>
              </div>
            </div>
          );
        })()}

        {/* Logo (optionnel) */}
        <div className={styles.field}>
          <label className={styles.label}>
            Logo <span className={styles.optional}>(optionnel)</span>
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setLogo(e.target.files[0])}
            className={styles.fileInput}
          />
          {logo && <p className={styles.fileName}>📎 {logo.name}</p>}
        </div>

        {/* Catégories prévues */}
        <div className={styles.field}>
          <label className={styles.label}>
            Catégories d'événements prévues <span className={styles.req}>*</span>
          </label>
          <div className={styles.catGrid}>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => toggleCategorie(cat.id)}
                className={`${styles.catBtn} ${form.categories_prevues.includes(cat.id) ? styles.catBtnActive : ""}`}
              >
                {cat.nom}
              </button>
            ))}
          </div>

          {/* Proposer une catégorie qui n'existe pas (validée par un admin) */}
          <div style={{ marginTop: 12 }}>
            <input
              type="text"
              value={catInput}
              onChange={(e) => setCatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const nom = catInput.trim();
                  if (nom && !form.nouvelles_categories.includes(nom)) {
                    updateField("nouvelles_categories", [...form.nouvelles_categories, nom]);
                  }
                  setCatInput("");
                }
              }}
              placeholder="Autre catégorie… (tapez puis Entrée)"
              className={styles.input}
            />
            {form.nouvelles_categories.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                {form.nouvelles_categories.map((nom) => (
                  <span
                    key={nom}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      padding: "4px 10px", borderRadius: 999, fontSize: 12,
                      background: "var(--color-primary-light)", color: "var(--color-primary)",
                    }}
                  >
                    {nom}
                    <button
                      type="button"
                      onClick={() => updateField(
                        "nouvelles_categories",
                        form.nouvelles_categories.filter((n) => n !== nom)
                      )}
                      style={{ border: "none", background: "transparent", cursor: "pointer", color: "inherit", fontSize: 14, lineHeight: 1 }}
                      aria-label={`Retirer ${nom}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            <p style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 4 }}>
              Les catégories proposées seront validées par un administrateur.
            </p>
          </div>

          {errors.categories && <p className={styles.errMsg}>{errors.categories}</p>}
        </div>

        {/* Submit */}
        <button type="submit" disabled={submitting} className={styles.submitBtn}>
          {submitting ? "Envoi en cours..." : "Soumettre ma demande"}
        </button>
      </form>
    </>
  );
}