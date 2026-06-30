import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, Save, Check, Calendar, MapPin,
  Type, FileText, Users, X, Trash2
} from "lucide-react";
import { fetchEvent, updateEvent } from "../../services/eventService";
import { deleteMyEvent, getStatusDisplay } from "../../services/organizerService";
import { CATEGORIES, VILLES_TUNISIE } from "../../utils/constants";
import { useToastContext } from "../../components/iu/Toast/ToastProvider";

// Composants UI
import Input from "../../components/iu/Input/Input";
import Textarea from "../../components/iu/Textarea/Textarea";
import TicketsManager from "../../components/TicketsManager/TicketsManager";

import styles from "./EditEvent.module.css";


export default function EditEvent() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToastContext();

  // États principaux
  const [step, setStep] = useState(1);
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  // Données du formulaire
  const [formData, setFormData] = useState({
    titre: "",
    description: "",
    categorie_slug: "",
    tags: [],
    date_evenement: "",
    date_fin: "",
    lieu: "",
    adresse: "",
    ville: "",
    capacite_totale: "",
    types_billets: [],
    cover: "",
  });

  const [tagInput, setTagInput] = useState("");

  // CHARGEMENT
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await fetchEvent(id);
        if (cancelled) return;
        if (!data) {
          toast.error("Événement introuvable");
          navigate("/organizer");
          return;
        }

        setEvent(data);
        setFormData({
          titre: data.titre || "",
          description: data.description || "",
          categorie_slug: data.categorie?.slug || "",
          tags: data.tags || [],
          date_evenement: data.date_evenement ? data.date_evenement.slice(0, 16) : "",
          date_fin: data.date_fin ? data.date_fin.slice(0, 16) : "",
          lieu: data.lieu || "",
          adresse: data.adresse || "",
          ville: data.ville || "",
          capacite_totale: data.capacite_totale || "",
          types_billets: data.types_billets || [],
          cover: data.cover || "",
        });
      } catch (err) {
        toast.error("Erreur de chargement");
        navigate("/organizer");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [id, navigate, toast]);

  // HANDLERS
  const update = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors({ ...errors, [field]: undefined });
  };

  // Tags
  const handleTagKeyDown = (e) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim().toLowerCase();
      if (!formData.tags.includes(newTag)) {
        update("tags", [...formData.tags, newTag]);
      }
      setTagInput("");
    }
  };

  const removeTag = (tag) => {
    update("tags", formData.tags.filter((t) => t !== tag));
  };

  // Validations par étape
  const validateStep1 = () => {
    const errs = {};
    if (!formData.titre.trim()) errs.titre = "Titre requis";
    if (formData.titre.trim().length < 5) errs.titre = "Au moins 5 caractères";
    if (!formData.description.trim()) errs.description = "Description requise";
    if (formData.description.trim().length < 20) errs.description = "Au moins 20 caractères";
    if (!formData.categorie_slug) errs.categorie_slug = "Choisissez une catégorie";
    if (!formData.date_evenement) errs.date_evenement = "Date requise";
    if (!formData.lieu.trim()) errs.lieu = "Lieu requis";
    if (!formData.ville) errs.ville = "Ville requise";

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep2 = () => {
    const errs = {};
    if (!formData.types_billets || formData.types_billets.length === 0) {
      errs.tickets = "Ajoutez au moins un type de billet";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Navigation
  const handleNext = () => {
    if (step === 1 && !validateStep1()) {
      toast.error("Vérifiez les informations");
      return;
    }
    if (step === 2 && !validateStep2()) {
      toast.error("Vérifiez la billetterie");
      return;
    }
    setStep(step + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Sauvegarde
  const handleSave = async () => {
    if (!validateStep1() || !validateStep2()) {
      toast.error("Vérifiez tous les champs");
      return;
    }

    setSaving(true);
    try {
      await updateEvent(id, formData);
      toast.success("Événement mis à jour !");
      navigate("/organizer");
    } catch (err) {
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  // Suppression
  const handleDelete = async () => {
    if (!confirm(`Supprimer définitivement "${event.titre}" ?\n\nCette action est irréversible.`)) return;

    try {
      await deleteMyEvent(id);
      toast.success("Événement supprimé");
      navigate("/organizer");
    } catch (err) {
      toast.error("Erreur lors de la suppression");
    }
  };

  // LOADING STATE
  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingPage}>
          <div className={styles.loadingContent}>
            <div className={styles.loadingSpinner} />
            <p className={styles.loadingText}>Chargement de l'événement...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!event) return null;

  const status = getStatusDisplay(event.statut);

  // RENDER
  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.blob} />

        <div className={styles.headerInner}>
          <Link to="/organizer" className={styles.backLink}>
            <ArrowLeft size={14} />
            Retour à mes événements
          </Link>

          <div className={styles.titleRow}>
            <div className={styles.titleBlock}>
              <h1 className={styles.title}>
                Modifier <em className={styles.titleEm}>l'événement</em>
              </h1>
              <p className={styles.subtitle}>{event.titre}</p>
            </div>

            <span className={`${styles.statusBadge} ${styles[`status${capitalize(status.color)}`]}`}>
              <span className={styles.statusDot} />
              {status.label}
            </span>
          </div>

          {/* Stepper */}
          <Stepper currentStep={step} />
        </div>
      </div>

      {/* Form content */}
      <div className={styles.main}>
        {step === 1 && (
          <StepInfos
            formData={formData}
            errors={errors}
            update={update}
            tagInput={tagInput}
            setTagInput={setTagInput}
            handleTagKeyDown={handleTagKeyDown}
            removeTag={removeTag}
          />
        )}

        {step === 2 && (
          <StepTickets
            tickets={formData.types_billets}
            onTicketsChange={(t) => update("types_billets", t)}
            error={errors.tickets}
          />
        )}

        {step === 3 && (
          <StepReview formData={formData} />
        )}

        {/* Navigation */}
        <div className={styles.footer}>
          {step > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              disabled={saving}
              className={styles.btnBack}
            >
              <ArrowLeft size={14} />
              Précédent
            </button>
          ) : (
            <div />
          )}

          <div className={styles.btnsRight}>
            {/* Bouton "Enregistrer" disponible à toutes les étapes */}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className={styles.btnSecondary}
            >
              {saving ? <span className={styles.spinner} /> : <Save size={14} />}
              {saving ? "Sauvegarde..." : "Enregistrer"}
            </button>

            {step < 3 ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={saving}
                className={styles.btnNext}
              >
                Suivant
                <ArrowRight size={14} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className={styles.btnSave}
              >
                {saving ? <span className={styles.spinner} /> : <Check size={14} />}
                Sauvegarder les modifications
              </button>
            )}
          </div>
        </div>

        {/* Zone danger : suppression */}
        <div className={styles.dangerZone}>
          <p className={styles.dangerTitle}>⚠️ Zone dangereuse</p>
          <p className={styles.dangerDesc}>
            Supprimer cet événement est irréversible. Tous les billets et données associés seront perdus.
          </p>
          <button
            type="button"
            onClick={handleDelete}
            className={styles.btnDanger}
          >
            <Trash2 size={13} />
            Supprimer définitivement
          </button>
        </div>
      </div>
    </div>
  );
}

function Stepper({ currentStep }) {
  const steps = [
    { num: 1, label: "Infos" },
    { num: 2, label: "Billetterie" },
    { num: 3, label: "Vérification" },
  ];

  return (
    <div className={styles.steps}>
      {steps.map((s, i) => {
        const isActive = s.num === currentStep;
        const isCompleted = s.num < currentStep;

        return (
          <div key={s.num} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div className={`${styles.step} ${isActive ? styles.active : ""} ${isCompleted ? styles.completed : ""}`}>
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


function StepInfos({ formData, errors, update, tagInput, setTagInput, handleTagKeyDown, removeTag }) {
  return (
    <div className={styles.formCard}>
      <h2 className={styles.formTitle}>
        Informations <em className={styles.formTitleEm}>générales</em>
      </h2>
      <p className={styles.formSubtitle}>
        Modifiez les informations principales de votre événement
      </p>

      <div className={styles.fields}>
        <Input
          label="Titre de l'événement"
          required
          icon={Type}
          value={formData.titre}
          onChange={(v) => update("titre", v)}
          placeholder="Ex: Soirée Jazz au Carthage"
          error={errors.titre}
          maxLength={100}
        />

        <Textarea
          label="Description"
          required
          value={formData.description}
          onChange={(v) => update("description", v)}
          placeholder="Décrivez votre événement, le programme, les artistes..."
          error={errors.description}
          maxLength={1000}
          rows={5}
        />

        {/* Catégorie + Capacité */}
        <div className={styles.row}>
          <div className={styles.selectWrapper}>
            <label className={styles.selectLabel}>
              Catégorie <span className={styles.required}>*</span>
            </label>
            <select
              value={formData.categorie_slug}
              onChange={(e) => update("categorie_slug", e.target.value)}
              className={styles.select}
            >
              <option value="">Choisir une catégorie...</option>
              {Object.entries(CATEGORIES).map(([slug, cat]) => (
                <option key={slug} value={slug}>
                  {cat.emoji} {cat.nom}
                </option>
              ))}
            </select>
            {errors.categorie_slug && (
              <p style={{ fontSize: 11, color: "var(--color-danger)", margin: "2px 0 0" }}>
                {errors.categorie_slug}
              </p>
            )}
          </div>

          <Input
            label="Capacité totale"
            type="number"
            icon={Users}
            value={formData.capacite_totale}
            onChange={(v) => update("capacite_totale", v)}
            placeholder="Ex: 200"
            min={1}
            hint="Nombre de places maximum"
          />
        </div>

        {/* Dates */}
        <div className={styles.row}>
          <Input
            label="Date et heure"
            required
            type="datetime-local"
            icon={Calendar}
            value={formData.date_evenement}
            onChange={(v) => update("date_evenement", v)}
            error={errors.date_evenement}
          />

          <Input
            label="Date de fin"
            optional
            type="datetime-local"
            icon={Calendar}
            value={formData.date_fin}
            onChange={(v) => update("date_fin", v)}
            hint="Optionnel"
          />
        </div>

        {/* Lieu + Ville */}
        <div className={styles.row}>
          <Input
            label="Nom du lieu"
            required
            icon={MapPin}
            value={formData.lieu}
            onChange={(v) => update("lieu", v)}
            placeholder="Ex: La Villa Carthage"
            error={errors.lieu}
          />

          <div className={styles.selectWrapper}>
            <label className={styles.selectLabel}>
              Ville <span className={styles.required}>*</span>
            </label>
            <select
              value={formData.ville}
              onChange={(e) => update("ville", e.target.value)}
              className={styles.select}
            >
              <option value="">Choisir...</option>
              {VILLES_TUNISIE.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
            {errors.ville && (
              <p style={{ fontSize: 11, color: "var(--color-danger)", margin: "2px 0 0" }}>
                {errors.ville}
              </p>
            )}
          </div>
        </div>

        <Input
          label="Adresse complète"
          optional
          icon={MapPin}
          value={formData.adresse}
          onChange={(v) => update("adresse", v)}
          placeholder="Ex: Rue Hannibal, La Marsa"
          hint="Adresse précise pour faciliter l'accès"
        />

        {/* Tags */}
        <Input
          label="Tags"
          icon={FileText}
          value={tagInput}
          onChange={setTagInput}
          onKeyDown={handleTagKeyDown}
          placeholder="Tapez un tag puis Entrée (ex: jazz, live, gratuit)"
          hint="Aide les utilisateurs à trouver votre événement"
        />

        {formData.tags.length > 0 && (
          <div className={styles.tagsRow}>
            {formData.tags.map((tag) => (
              <span key={tag} className={styles.tag}>
                #{tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className={styles.tagRemove}
                  aria-label={`Retirer ${tag}`}
                >
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


function StepTickets({ tickets, onTicketsChange, error }) {
  return (
    <div className={styles.formCard}>
      <h2 className={styles.formTitle}>
        Gestion de la <em className={styles.formTitleEm}>billetterie</em>
      </h2>
      <p className={styles.formSubtitle}>
        Créez et modifiez les types de billets disponibles
      </p>

      <TicketsManager tickets={tickets} onChange={onTicketsChange} />

      {error && (
        <p style={{ fontSize: 12, color: "var(--color-danger)", margin: "12px 0 0", fontWeight: 500 }}>
          {error}
        </p>
      )}
    </div>
  );
}


function StepReview({ formData }) {
  const categorie = CATEGORIES[formData.categorie_slug];

  return (
    <div className={styles.formCard}>
      <h2 className={styles.formTitle}>
        <em className={styles.formTitleEm}>Vérification</em> finale
      </h2>
      <p className={styles.formSubtitle}>
        Relisez les informations avant de sauvegarder
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <ReviewSection title="Titre">
          <p style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
            {formData.titre || "—"}
          </p>
        </ReviewSection>

        <ReviewSection title="Description">
          <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-muted)", whiteSpace: "pre-wrap" }}>
            {formData.description || "—"}
          </p>
        </ReviewSection>

        <ReviewSection title="Catégorie">
          <p style={{ margin: 0, fontSize: 14 }}>
            {categorie ? `${categorie.emoji} ${categorie.nom}` : "—"}
          </p>
        </ReviewSection>

        <ReviewSection title="Date">
          <p style={{ margin: 0, fontSize: 14 }}>
            {formData.date_evenement
              ? new Date(formData.date_evenement).toLocaleString("fr-FR")
              : "—"}
          </p>
        </ReviewSection>

        <ReviewSection title="Lieu">
          <p style={{ margin: 0, fontSize: 14 }}>
            {formData.lieu && formData.ville
              ? `${formData.lieu}, ${formData.ville}`
              : "—"}
          </p>
          {formData.adresse && (
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--color-text-muted)" }}>
              {formData.adresse}
            </p>
          )}
        </ReviewSection>

        <ReviewSection title="Capacité">
          <p style={{ margin: 0, fontSize: 14 }}>
            {formData.capacite_totale ? `${formData.capacite_totale} places` : "—"}
          </p>
        </ReviewSection>

        <ReviewSection title="Tags">
          {formData.tags.length > 0 ? (
            <div className={styles.tagsRow}>
              {formData.tags.map((tag) => (
                <span key={tag} className={styles.tag}>#{tag}</span>
              ))}
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-muted)" }}>Aucun tag</p>
          )}
        </ReviewSection>

        <ReviewSection title={`Billets (${formData.types_billets.length})`}>
          {formData.types_billets.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {formData.types_billets.map((t, i) => (
                <div key={i} style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "8px 12px",
                  background: "var(--color-surface-alt)",
                  borderRadius: "var(--radius-md)",
                  fontSize: 13,
                }}>
                  <span style={{ fontWeight: 600 }}>{t.nom}</span>
                  <span>
                    {t.prix === 0 ? "Gratuit" : `${t.prix} DT`} · {t.capacite} places
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-muted)" }}>Aucun billet</p>
          )}
        </ReviewSection>
      </div>
    </div>
  );
}

function ReviewSection({ title, children }) {
  return (
    <div>
      <p style={{
        fontSize: 11,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: 0.5,
        color: "var(--color-text-muted)",
        margin: "0 0 6px",
      }}>
        {title}
      </p>
      {children}
    </div>
  );
}

function capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : "";
}