import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, Check, Calendar, MapPin,
  Type, FileText, Users, Image as ImageIcon, X,
  Eye, Save
} from "lucide-react";
import Input from "../../components/iu/Input/Input";
import Textarea from "../../components/iu/Textarea/Textarea";
import TicketsManager from "../../components/TicketsManager/TicketsManager";
import { CATEGORIES, VILLES_TUNISIE } from "../../utils/constants";
import { createEvent } from "../../services/eventService";
import {
  createEmptyTicket,
  validateTickets,
  formatTicketsForAPI,
} from "../../services/ticketService";
import { useToastContext } from "../../components/iu/Toast/ToastProvider";
import styles from "./CreateEvent.module.css";


export default function CreateEvent() {
  const navigate = useNavigate();
  const toast = useToastContext();

  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // etat du formulaire
  const [form, setForm] = useState({
    titre: "",
    description: "",
    categorie_slug: "",
    tags: [],
    date_evenement: "",
    heure_evenement: "",
    lieu: "",
    ville: "Tunis",
    capacite_totale: "",
    types_billets: [createEmptyTicket({ nom: "Standard" })],
    cover: null,
    coverPreview: "",
    publishMode: "publish",
  });

  // helper pour mettre à jour un champ
  const updateField = (field, value) => {
    setForm({ ...form, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: undefined });
    }
  };

  // VALIDATION PAR ÉTAPE
  const validateStep1 = () => {
    const errs = {};
    if (!form.titre.trim()) errs.titre = "Titre requis";
    if (!form.description.trim()) errs.description = "Description requise";
    if (!form.categorie_slug) errs.categorie_slug = "Catégorie requise";
    if (!form.date_evenement) errs.date_evenement = "Date requise";
    if (!form.heure_evenement) errs.heure_evenement = "Heure requise";
    if (!form.lieu.trim()) errs.lieu = "Lieu requis";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep2 = () => {
    const errs = {};

    // Capacité totale
    if (!form.capacite_totale || parseInt(form.capacite_totale) < 1) {
      errs.capacite_totale = "Capacité requise (minimum 1)";
    }

    // Validation des billets via le service
    const ticketsValidation = validateTickets(form.types_billets);
    Object.assign(errs, ticketsValidation.errors);

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // NAVIGATION
  const handleNext = () => {
    if (step === 1 && !validateStep1()) {
      toast.error("Veuillez remplir tous les champs requis");
      return;
    }
    if (step === 2 && !validateStep2()) {
      toast.error("Veuillez vérifier les billets");
      return;
    }
    setStep(step + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBack = () => {
    setStep(step - 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // TAGS
  const [tagInput, setTagInput] = useState("");

  const handleTagKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const tag = tagInput.trim().toLowerCase();
      if (tag && !form.tags.includes(tag) && form.tags.length < 8) {
        updateField("tags", [...form.tags, tag]);
        setTagInput("");
      }
    } else if (e.key === "Backspace" && !tagInput && form.tags.length > 0) {
      updateField("tags", form.tags.slice(0, -1));
    }
  };

  const removeTag = (tag) => {
    updateField("tags", form.tags.filter((t) => t !== tag));
  };

  // IMAGE
  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image trop volumineuse (max 5 MB)");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      setForm({ ...form, cover: file, coverPreview: event.target.result });
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setForm({ ...form, cover: null, coverPreview: "" });
  };

  // SOUMISSION
  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      // Préparation du payload avec billets formatés 
      const payload = {
        ...form,
        types_billets_data: formatTicketsForAPI(form.types_billets),
        is_draft: form.publishMode === "draft",
      };

      // On enlève les champs UI inutiles pour l'API
      delete payload.types_billets;
      delete payload.coverPreview;
      delete payload.publishMode;

      await createEvent(payload);

      toast.success(
        form.publishMode === "draft"
          ? "Brouillon enregistré !"
          : "Événement publié ! En attente de validation."
      );

      setTimeout(() => navigate("/organizer"), 1000);
    } catch (err) {
      toast.error("Erreur lors de la création de l'événement");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // RENDER
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <Link to="/organizer" className={styles.backLink}>
            <ArrowLeft size={14} />
            Retour à mes événements
          </Link>
          <h1 className={styles.title}>
            Créer un <span className={styles.titleEm}>événement</span>
          </h1>
          <p className={styles.subtitle}>
            Partagez votre événement avec la communauté Eventu
          </p>
        </div>

        <StepsProgress currentStep={step} />

        <div className={styles.card}>
          {step === 1 && (
            <Step1Infos
              form={form}
              errors={errors}
              updateField={updateField}
              tagInput={tagInput}
              setTagInput={setTagInput}
              handleTagKeyDown={handleTagKeyDown}
              removeTag={removeTag}
            />
          )}

          {step === 2 && (
            <Step2Tickets
              form={form}
              errors={errors}
              updateField={updateField}
            />
          )}

          {step === 3 && (
            <Step3Publish
              form={form}
              updateField={updateField}
              handleImageChange={handleImageChange}
              removeImage={removeImage}
            />
          )}

          <div className={styles.actions}>
            <button
              type="button"
              onClick={handleBack}
              disabled={step === 1 || isLoading}
              className={styles.btnBack}
            >
              <ArrowLeft size={14} />
              Précédent
            </button>

            {step < 3 ? (
              <button
                type="button"
                onClick={handleNext}
                className={styles.btnContinue}
              >
                Suivant
                <ArrowRight size={14} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isLoading}
                className={styles.btnContinue}
              >
                {isLoading ? (
                  <>
                    <span className={styles.spinner} />
                    Création...
                  </>
                ) : (
                  <>
                    {form.publishMode === "draft" ? <Save size={14} /> : <Check size={14} />}
                    {form.publishMode === "draft" ? "Enregistrer brouillon" : "Publier"}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StepsProgress({ currentStep }) {
  const steps = [
    { num: 1, label: "Infos" },
    { num: 2, label: "Billets" },
    { num: 3, label: "Publication" },
  ];

  return (
    <div className={styles.steps}>
      {steps.map((s, i) => {
        const isActive = s.num === currentStep;
        const isCompleted = s.num < currentStep;
        const dotClass = `${styles.stepDot} ${isActive ? styles.active : ""} ${isCompleted ? styles.completed : ""}`;

        return (
          <div key={s.num} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div className={dotClass}>
              <div className={styles.stepNumber}>
                {isCompleted ? <Check size={14} strokeWidth={3} /> : s.num}
              </div>
              <span className={styles.stepLabel}>{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`${styles.stepLine} ${s.num < currentStep ? styles.completed : ""}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function Step1Infos({ form, errors, updateField, tagInput, setTagInput, handleTagKeyDown, removeTag }) {
  const categoryEntries = Object.entries(CATEGORIES);

  return (
    <>
      <h2 className={styles.stepTitle}>Infos de base</h2>
      <p className={styles.stepDesc}>Les informations essentielles de votre événement</p>

      <div className={styles.formGroup}>
        <Input
          label="Titre de l'événement"
          required
          icon={Type}
          value={form.titre}
          onChange={(v) => updateField("titre", v)}
          placeholder="Ex: Soirée Jazz au Carthage"
          error={errors.titre}
          maxLength={120}
          autoFocus
        />

        <Textarea
          label="Description"
          required
          value={form.description}
          onChange={(v) => updateField("description", v)}
          placeholder="Décrivez votre événement en détail..."
          error={errors.description}
          hint="Une bonne description augmente les inscriptions"
          maxLength={1000}
          rows={5}
        />

        {/* Catégorie */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, display: "block" }}>
            Catégorie <span style={{ color: "var(--color-danger)" }}>*</span>
          </label>
          <div className={styles.categoriesGrid}>
            {categoryEntries.map(([slug, cat]) => (
              <button
                key={slug}
                type="button"
                onClick={() => updateField("categorie_slug", slug)}
                className={`${styles.categoryBtn} ${form.categorie_slug === slug ? styles.selected : ""}`}
              >
                <span className={styles.categoryIcon}>{cat.emoji}</span>
                {cat.nom}
              </button>
            ))}
          </div>
          {errors.categorie_slug && (
            <p style={{ fontSize: 11, color: "var(--color-danger)", marginTop: 4 }}>{errors.categorie_slug}</p>
          )}
        </div>

        {/* Tags */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, display: "block" }}>
            Tags <span style={{ color: "var(--color-text-subtle)", fontSize: 11, fontWeight: 400 }}>(optionnel · max 8)</span>
          </label>
          <div className={styles.tagsWrapper}>
            {form.tags.map((tag) => (
              <span key={tag} className={styles.tag}>
                #{tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className={styles.tagRemove}
                  aria-label="Retirer"
                >
                  <X size={11} />
                </button>
              </span>
            ))}
            {form.tags.length < 8 && (
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder={form.tags.length === 0 ? "jazz, live, vintage..." : "+ Ajouter"}
                className={styles.tagInput}
              />
            )}
          </div>
        </div>

        {/* Date + Heure */}
        <div className={styles.formRow}>
          <Input
            label="Date"
            required
            type="date"
            icon={Calendar}
            value={form.date_evenement}
            onChange={(v) => updateField("date_evenement", v)}
            error={errors.date_evenement}
          />
          <Input
            label="Heure"
            required
            type="time"
            icon={Calendar}
            value={form.heure_evenement}
            onChange={(v) => updateField("heure_evenement", v)}
            error={errors.heure_evenement}
          />
        </div>

        {/* Lieu + Ville */}
        <div className={styles.formRow}>
          <Input
            label="Lieu"
            required
            icon={MapPin}
            value={form.lieu}
            onChange={(v) => updateField("lieu", v)}
            placeholder="Ex: La Villa Carthage"
            error={errors.lieu}
          />
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, display: "block" }}>
              Ville <span style={{ color: "var(--color-danger)" }}>*</span>
            </label>
            <div style={{
              display: "flex", alignItems: "center", gap: 8, padding: "0 12px",
              background: "var(--color-surface)", border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)", height: 44,
            }}>
              <MapPin size={15} color="var(--color-text-muted)" />
              <select
                value={form.ville}
                onChange={(e) => updateField("ville", e.target.value)}
                style={{
                  flex: 1, border: "none", outline: "none", background: "transparent",
                  fontSize: 14, fontFamily: "inherit", cursor: "pointer",
                }}
              >
                {VILLES_TUNISIE.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}


function Step2Tickets({ form, errors, updateField }) {
  return (
    <>
      <h2 className={styles.stepTitle}>Billetterie</h2>
      <p className={styles.stepDesc}>Définissez la capacité et les types de billets</p>

      <div className={styles.formGroup}>
        <Input
          label="Capacité totale de l'événement"
          required
          type="number"
          icon={Users}
          value={form.capacite_totale}
          onChange={(v) => updateField("capacite_totale", v)}
          placeholder="Ex: 200"
          error={errors.capacite_totale}
          hint="Nombre maximum de participants tous billets confondus"
          min={1}
        />

        {/* Gestion des billets via le composant TicketsManager */}
        <TicketsManager
          tickets={form.types_billets}
          onChange={(tickets) => updateField("types_billets", tickets)}
          errors={errors}
          maxTickets={5}
        />
      </div>
    </>
  );
}

function Step3Publish({ form, updateField, handleImageChange, removeImage }) {
  const categoryInfo = form.categorie_slug ? CATEGORIES[form.categorie_slug] : null;

  return (
    <>
      <h2 className={styles.stepTitle}>Visuels & Publication</h2>
      <p className={styles.stepDesc}>Ajoutez une image et publiez votre événement</p>

      <div className={styles.formGroup}>
        {/* Upload image */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, display: "block" }}>
            Image de couverture <span style={{ color: "var(--color-text-subtle)", fontSize: 11, fontWeight: 400 }}>(optionnel · max 5 MB)</span>
          </label>
          <label className={`${styles.imageUpload} ${form.coverPreview ? styles.hasImage : ""}`}>
            {form.coverPreview ? (
              <>
                <img src={form.coverPreview} alt="Aperçu" className={styles.imagePreview} />
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); removeImage(); }}
                  className={styles.imageRemove}
                  aria-label="Retirer"
                >
                  <X size={14} />
                </button>
              </>
            ) : (
              <>
                <ImageIcon size={32} className={styles.imageUploadIcon} />
                <p className={styles.imageUploadText}>Cliquez pour ajouter une image</p>
                <p className={styles.imageUploadHint}>JPG, PNG · format paysage recommandé (1200x630)</p>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              style={{ display: "none" }}
            />
          </label>
        </div>

        {/* Preview */}
        <div className={styles.previewCard}>
          <p className={styles.previewLabel}>
            <Eye size={11} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />
            Aperçu de votre événement
          </p>
          <div className={styles.previewItem}>
            <span className={styles.previewLabelKey}>Titre</span>
            <span className={styles.previewValue}>{form.titre || "—"}</span>
          </div>
          <div className={styles.previewItem}>
            <span className={styles.previewLabelKey}>Catégorie</span>
            <span className={styles.previewValue}>
              {categoryInfo ? `${categoryInfo.emoji} ${categoryInfo.nom}` : "—"}
            </span>
          </div>
          <div className={styles.previewItem}>
            <span className={styles.previewLabelKey}>Date & heure</span>
            <span className={styles.previewValue}>
              {form.date_evenement && form.heure_evenement
                ? `${new Date(form.date_evenement).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })} à ${form.heure_evenement}`
                : "—"}
            </span>
          </div>
          <div className={styles.previewItem}>
            <span className={styles.previewLabelKey}>Lieu</span>
            <span className={styles.previewValue}>
              {form.lieu ? `${form.lieu}, ${form.ville}` : "—"}
            </span>
          </div>
          <div className={styles.previewItem}>
            <span className={styles.previewLabelKey}>Capacité</span>
            <span className={styles.previewValue}>{form.capacite_totale || "—"} places</span>
          </div>
          <div className={styles.previewItem}>
            <span className={styles.previewLabelKey}>Billets</span>
            <span className={styles.previewValue}>
              {form.types_billets.length} type{form.types_billets.length > 1 ? "s" : ""}
            </span>
          </div>
          <div className={styles.previewItem}>
            <span className={styles.previewLabelKey}>Tags</span>
            <span className={styles.previewValue}>
              {form.tags.length > 0 ? form.tags.map((t) => `#${t}`).join(", ") : "—"}
            </span>
          </div>
        </div>

        {/* Choix publication */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 10, display: "block" }}>
            Que souhaitez-vous faire ? <span style={{ color: "var(--color-danger)" }}>*</span>
          </label>
          <div className={styles.publishChoices}>
            <button
              type="button"
              onClick={() => updateField("publishMode", "publish")}
              className={`${styles.publishCard} ${form.publishMode === "publish" ? styles.selected : ""}`}
            >
              <div className={`${styles.publishIcon} ${styles.publishIconNow}`}>
                <Check size={18} strokeWidth={3} />
              </div>
              <p className={styles.publishTitle}>Publier maintenant</p>
              <p className={styles.publishDesc}>
                L'événement sera soumis à l'équipe Eventu pour validation (sous 24h).
              </p>
            </button>
            <button
              type="button"
              onClick={() => updateField("publishMode", "draft")}
              className={`${styles.publishCard} ${form.publishMode === "draft" ? styles.selected : ""}`}
            >
              <div className={`${styles.publishIcon} ${styles.publishIconDraft}`}>
                <FileText size={18} />
              </div>
              <p className={styles.publishTitle}>Enregistrer en brouillon</p>
              <p className={styles.publishDesc}>
                Conservez votre événement et publiez-le plus tard.
              </p>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}