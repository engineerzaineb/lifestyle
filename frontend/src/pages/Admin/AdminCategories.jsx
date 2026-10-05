import { useState, useEffect, useCallback } from "react";
import {
  Tag, Plus, Pencil, Trash2, Check, X, Clock,
  CheckCircle, AlertTriangle, Calendar,
} from "lucide-react";
import {
  fetchCategories, createCategorie, updateCategorie,
  deleteCategorie, validerCategorie, refuserCategorie,
} from "../../services/adminService";
import { useToastContext } from "../../components/iu/Toast/ToastProvider";
import styles from "./AdminCategories.module.css";

const TABS = [
  { value: "validee", label: "Validées", icon: CheckCircle },
  { value: "en_attente", label: "Propositions", icon: Clock },
];

// Palette proposée pour les nouvelles catégories
const COULEURS = [
  "#4F46E5", "#EC4899", "#F59E0B", "#10B981",
  "#3B82F6", "#8B5CF6", "#EF4444", "#14B8A6",
];

const EMPTY_FORM = { nom: "", icone: "", couleur: COULEURS[0] };

export default function AdminCategories() {
  const toast = useToastContext();

  const [activeTab, setActiveTab] = useState("validee");
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // null = fermé, {} = création, {id...} = édition
  const [formModal, setFormModal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");

 const loadCategories = useCallback(() => {
    fetchCategories(activeTab)
      .then(setCategories)
      .catch((err) => {
        console.error("Erreur chargement catégories:", err);
        console.warn("Impossible de charger les catégories");
      })
      .finally(() => setLoading(false));
  }, [activeTab]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setFormError("");
    setFormModal({ mode: "create" });
  };

  const openEdit = (cat) => {
    setForm({
      nom: cat.nom,
      icone: cat.icone || "",
      couleur: cat.couleur || COULEURS[0],
    });
    setFormError("");
    setFormModal({ mode: "edit", id: cat.id });
  };

  const handleSubmit = async () => {
    const nom = form.nom.trim();
    if (nom.length < 2) {
      setFormError("Le nom doit contenir au moins 2 caractères.");
      return;
    }

    setProcessing(true);
    try {
      if (formModal.mode === "create") {
        await createCategorie({ ...form, nom });
        toast.success("Catégorie créée");
      } else {
        await updateCategorie(formModal.id, { ...form, nom });
        toast.success("Catégorie modifiée");
      }
      setFormModal(null);
      loadCategories();
    } catch (err) {
      console.error("Erreur enregistrement catégorie:", err);
      const data = err.response?.data;
      setFormError(
        data?.nom?.[0] || data?.detail || "Erreur lors de l'enregistrement"
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async (cat) => {
    if (cat.nb_events > 0) {
      toast.warning(
        `Impossible : ${cat.nb_events} événement(s) utilisent cette catégorie.`
      );
      return;
    }
    if (!window.confirm(`Supprimer définitivement la catégorie "${cat.nom}" ?`))
      return;

    setProcessing(true);
    try {
      await deleteCategorie(cat.id);
      toast.success("Catégorie supprimée");
      loadCategories();
    } catch (err) {
      console.error("Erreur suppression:", err);
      toast.error(err.response?.data?.detail || "Suppression impossible");
    } finally {
      setProcessing(false);
    }
  };

  const handleValider = async (cat) => {
    setProcessing(true);
    try {
      await validerCategorie(cat.id);
      toast.success(`"${cat.nom}" validée`);
      loadCategories();
    } catch (err) {
      console.error("Erreur validation:", err);
      toast.error("Erreur lors de la validation");
    } finally {
      setProcessing(false);
    }
  };

  const handleRefuser = async (cat) => {
    if (!window.confirm(`Refuser la proposition "${cat.nom}" ?`)) return;

    setProcessing(true);
    try {
      const res = await refuserCategorie(cat.id);
      toast.success(res.detail || "Proposition refusée");
      loadCategories();
    } catch (err) {
      console.error("Erreur refus:", err);
      toast.error("Erreur lors du refus");
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (d) =>
    d
      ? new Date(d).toLocaleDateString("fr-FR", {
          day: "numeric", month: "short", year: "numeric",
        })
      : "—";

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Gestion des catégories</h1>
          <p className={styles.subtitle}>
            Créez, modifiez et modérez les catégories d'événements
          </p>
        </div>
        <button onClick={openCreate} className={styles.btnCreate}>
          <Plus size={16} />
          Nouvelle catégorie
        </button>
      </div>

      {/* Onglets */}
      <div className={styles.tabs}>
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`${styles.tab} ${
                activeTab === tab.value ? styles.tabActive : ""
              }`}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Liste */}
      {loading ? (
        <div className={styles.loading}>Chargement...</div>
      ) : categories.length === 0 ? (
        <div className={styles.empty}>
          <Tag size={38} />
          <p>
            {activeTab === "en_attente"
              ? "Aucune proposition en attente"
              : "Aucune catégorie validée"}
          </p>
        </div>
      ) : (
        <div className={styles.grid}>
          {categories.map((cat) => (
            <div key={cat.id} className={styles.card}>
              <div
                className={styles.cardIcon}
                style={{ background: cat.couleur || "#4F46E5" }}
              >
                {cat.icone ? (
                  <span className={styles.cardEmoji}>{cat.icone}</span>
                ) : (
                  <Tag size={18} />
                )}
              </div>

              <div className={styles.cardInfo}>
                <p className={styles.cardName}>{cat.nom}</p>
                <p className={styles.cardSlug}>/{cat.slug}</p>
                <div className={styles.cardMeta}>
                  <span className={styles.cardCount}>
                    {cat.nb_events} événement{cat.nb_events > 1 ? "s" : ""}
                  </span>
                  {cat.proposee_par_email && (
                    <span className={styles.cardAuthor}>
                      proposée par {cat.proposee_par_email}
                    </span>
                  )}
                  {activeTab === "en_attente" && cat.created_at && (
                    <span className={styles.cardDate}>
                      <Calendar size={11} /> {formatDate(cat.created_at)}
                    </span>
                  )}
                </div>
              </div>

              <div className={styles.cardActions}>
                {activeTab === "en_attente" ? (
                  <>
                    <button
                      onClick={() => handleValider(cat)}
                      disabled={processing}
                      className={styles.btnValider}
                      title="Valider"
                    >
                      <Check size={15} />
                      Valider
                    </button>
                    <button
                      onClick={() => handleRefuser(cat)}
                      disabled={processing}
                      className={styles.btnRefuser}
                      title="Refuser"
                    >
                      <X size={15} />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => openEdit(cat)}
                      className={styles.btnIcon}
                      title="Modifier"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => handleDelete(cat)}
                      disabled={processing || cat.nb_events > 0}
                      className={styles.btnIconDanger}
                      title={
                        cat.nb_events > 0
                          ? "Des événements utilisent cette catégorie"
                          : "Supprimer"
                      }
                    >
                      <Trash2 size={15} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modale création / édition */}
      {formModal && (
        <div className={styles.modalOverlay} onClick={() => setFormModal(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>
                {formModal.mode === "create"
                  ? "Nouvelle catégorie"
                  : "Modifier la catégorie"}
              </h2>
              <button
                onClick={() => setFormModal(null)}
                className={styles.modalClose}
              >
                <X size={18} />
              </button>
            </div>

            <div className={styles.modalBody}>
              {formError && (
                <div className={styles.formError}>
                  <AlertTriangle size={14} />
                  {formError}
                </div>
              )}

              <div className={styles.field}>
                <label className={styles.label}>Nom *</label>
                <input
                  type="text"
                  value={form.nom}
                  onChange={(e) => setForm({ ...form, nom: e.target.value })}
                  placeholder="Musique, Sport, Gastronomie..."
                  className={styles.input}
                  maxLength={50}
                  autoFocus
                />
                <p className={styles.hint}>
                  Le slug est généré automatiquement à partir du nom.
                </p>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Icône (emoji)</label>
                <input
                  type="text"
                  value={form.icone}
                  onChange={(e) => setForm({ ...form, icone: e.target.value })}
                  placeholder="🎵"
                  className={styles.input}
                  maxLength={10}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Couleur</label>
                <div className={styles.colorRow}>
                  {COULEURS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm({ ...form, couleur: c })}
                      className={`${styles.colorDot} ${
                        form.couleur === c ? styles.colorDotActive : ""
                      }`}
                      style={{ background: c }}
                      aria-label={`Couleur ${c}`}
                    />
                  ))}
                </div>
              </div>

              {/* Aperçu */}
              <div className={styles.preview}>
                <span className={styles.previewLabel}>Aperçu</span>
                <div className={styles.previewCard}>
                  <div
                    className={styles.previewIcon}
                    style={{ background: form.couleur }}
                  >
                    {form.icone || <Tag size={16} />}
                  </div>
                  <span className={styles.previewName}>
                    {form.nom || "Nom de la catégorie"}
                  </span>
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                onClick={() => setFormModal(null)}
                className={styles.btnCancel}
                disabled={processing}
              >
                Annuler
              </button>
              <button
                onClick={handleSubmit}
                className={styles.btnSubmit}
                disabled={processing}
              >
                {processing
                  ? "Enregistrement..."
                  : formModal.mode === "create"
                  ? "Créer"
                  : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
