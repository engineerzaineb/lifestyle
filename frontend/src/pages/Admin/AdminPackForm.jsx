import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, AlertTriangle, Eye } from "lucide-react";
import {
  fetchAdminPack, createPack, updatePack,
} from "../../services/packService";
import { useToastContext } from "../../components/iu/Toast/ToastProvider";
import PackCard from "../../components/PackCard/PackCard";
import { PACK_OPTIONS, PACK_COULEURS, PACK_DUREES } from "../../utils/packs";
import styles from "./AdminPackForm.module.css";

const EMPTY_FORM = {
  nom: "",
  description: "",
  prix: "0",
  prix_barre: "",
  duree: "mensuel",
  essai_jours: "0",
  illimite: false,
  limite_evenements: "3",
  max_billets_par_event: "",
  max_types_billets: "",
  mises_en_avant_mois: "0",
  commission_pct: "10",
  mise_en_avant: false,
  stats_avancees: false,
  support_prioritaire: false,
  badge_verifie: false,
  avantages: "",
  couleur: PACK_COULEURS[1],
  etiquette: "",
  ordre: "0",
};

// Champ texte -> nombre, ou null si vide (= illimité / non utilisé)
const nombreOuNull = (v) => (v === "" || v === null ? null : Number(v));
const texteOuVide = (v) => (v === null || v === undefined ? "" : String(v));

// Pack (API) -> valeurs du formulaire
function packVersForm(pack) {
  return {
    nom: pack.nom,
    description: pack.description || "",
    prix: String(pack.prix),
    prix_barre: texteOuVide(pack.prix_barre),
    duree: pack.duree,
    essai_jours: String(pack.essai_jours ?? 0),
    illimite: pack.limite_evenements === null,
    limite_evenements: texteOuVide(pack.limite_evenements),
    max_billets_par_event: texteOuVide(pack.max_billets_par_event),
    max_types_billets: texteOuVide(pack.max_types_billets),
    mises_en_avant_mois: String(pack.mises_en_avant_mois ?? 0),
    commission_pct: String(pack.commission_pct),
    mise_en_avant: !!pack.mise_en_avant,
    stats_avancees: !!pack.stats_avancees,
    support_prioritaire: !!pack.support_prioritaire,
    badge_verifie: !!pack.badge_verifie,
    avantages: pack.avantages || "",
    couleur: pack.couleur || PACK_COULEURS[1],
    etiquette: pack.etiquette || "",
    ordre: String(pack.ordre),
  };
}

// Valeurs du formulaire -> payload API
function formVersPayload(form) {
  return {
    nom: form.nom.trim(),
    description: form.description.trim(),
    prix: form.prix || "0",
    prix_barre: form.prix_barre === "" ? null : form.prix_barre,
    duree: form.duree,
    essai_jours: Number(form.essai_jours) || 0,
    limite_evenements: form.illimite ? null : Number(form.limite_evenements),
    max_billets_par_event: nombreOuNull(form.max_billets_par_event),
    max_types_billets: nombreOuNull(form.max_types_billets),
    mises_en_avant_mois: form.mise_en_avant ? Number(form.mises_en_avant_mois) || 0 : 0,
    commission_pct: form.commission_pct || "0",
    mise_en_avant: form.mise_en_avant,
    stats_avancees: form.stats_avancees,
    support_prioritaire: form.support_prioritaire,
    badge_verifie: form.badge_verifie,
    avantages: form.avantages.trim(),
    couleur: form.couleur,
    etiquette: form.etiquette.trim(),
    ordre: Number(form.ordre) || 0,
  };
}

export default function AdminPackForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const toast = useToastContext();

  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [nomOriginal, setNomOriginal] = useState("");

  // Mode modification : charge le pack
  useEffect(() => {
    if (!isEdit) return;
    let cancelled = false;
    fetchAdminPack(id)
      .then((pack) => {
        if (cancelled) return;
        setForm(packVersForm(pack));
        setNomOriginal(pack.nom);
      })
      .catch((err) => {
        console.error("Erreur chargement pack:", err);
        if (!cancelled) setFormError("Pack introuvable.");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id, isEdit]);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (form.nom.trim().length < 2) {
      setFormError("Le nom doit contenir au moins 2 caractères.");
      return;
    }
    if (!form.illimite && !(Number(form.limite_evenements) >= 1)) {
      setFormError("Indiquez une limite d'au moins 1 événement, ou cochez « Illimité ».");
      return;
    }
    if (form.prix_barre !== "" && Number(form.prix_barre) <= Number(form.prix)) {
      setFormError("Le prix barré doit être supérieur au prix du pack.");
      return;
    }

    setSaving(true);
    try {
      const payload = formVersPayload(form);
      if (isEdit) {
        await updatePack(id, payload);
        toast.success("Pack modifié");
      } else {
        await createPack(payload);
        toast.success("Pack créé");
      }
      navigate("/admin/packs");
    } catch (err) {
      console.error("Erreur enregistrement pack:", err);
      const data = err.response?.data;
      const firstError = data && typeof data === "object"
        ? Object.values(data).flat()[0]
        : null;
      setFormError(firstError || "Erreur lors de l'enregistrement");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSaving(false);
    }
  };

  // Aperçu : même rendu que la carte de la liste
  const apercu = {
    ...formVersPayload(form),
    nom: form.nom.trim() || "Nom du pack",
    avantages_liste: form.avantages.split("\n").map((a) => a.trim()).filter(Boolean),
  };

  if (loading) {
    return <div className={styles.loading}>Chargement du pack...</div>;
  }

  return (
    <div>
      <Link to="/admin/packs" className={styles.backLink}>
        <ArrowLeft size={14} />
        Retour aux packs
      </Link>

      <div className={styles.header}>
        <h1 className={styles.title}>
          {isEdit ? `Modifier « ${nomOriginal} »` : "Nouveau pack"}
        </h1>
        <p className={styles.subtitle}>
          {isEdit
            ? "Les changements s'appliquent aux organisateurs qui ont déjà ce pack."
            : "Définissez le tarif, les limites et les avantages de l'offre."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className={styles.layout}>
        <div className={styles.formCol}>
          {formError && (
            <div className={styles.formError}>
              <AlertTriangle size={14} />
              {formError}
            </div>
          )}

          {/* ===== INFORMATIONS ===== */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Informations</h2>

            <div className={styles.field}>
              <label className={styles.label}>Nom du pack *</label>
              <input
                type="text"
                value={form.nom}
                onChange={(e) => set("nom", e.target.value)}
                placeholder="Gratuit, Pro, Premium..."
                className={styles.input}
                maxLength={100}
                autoFocus
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Description</label>
              <textarea
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Idéal pour les organisateurs réguliers"
                className={styles.textarea}
                rows={2}
              />
            </div>
          </section>

          {/* ===== TARIF ===== */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Tarif</h2>

            <div className={styles.row}>
              <div className={styles.field}>
                <label className={styles.label}>Prix (DT)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.prix}
                  onChange={(e) => set("prix", e.target.value)}
                  className={styles.input}
                />
                <p className={styles.hint}>0 = pack gratuit, sans date d'expiration.</p>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Durée</label>
                <select
                  value={form.duree}
                  onChange={(e) => set("duree", e.target.value)}
                  className={styles.input}
                >
                  {PACK_DUREES.map((d) => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.row}>
              <div className={styles.field}>
                <label className={styles.label}>Prix barré (DT)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.prix_barre}
                  onChange={(e) => set("prix_barre", e.target.value)}
                  placeholder="Aucune réduction"
                  className={styles.input}
                />
                <p className={styles.hint}>Ancien prix affiché barré, pour montrer une réduction.</p>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Période d'essai (jours)</label>
                <input
                  type="number"
                  min="0"
                  value={form.essai_jours}
                  onChange={(e) => set("essai_jours", e.target.value)}
                  className={styles.input}
                />
                <p className={styles.hint}>0 = pas d'essai gratuit.</p>
              </div>
            </div>

            <div className={styles.row}>
              <div className={styles.field}>
                <label className={styles.label}>Commission sur les ventes (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={form.commission_pct}
                  onChange={(e) => set("commission_pct", e.target.value)}
                  className={styles.input}
                />
              </div>
            </div>
          </section>

          {/* ===== LIMITES ===== */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Limites</h2>
            <p className={styles.sectionHint}>
              Laissez un champ vide pour « illimité ». Les limites sont vérifiées
              quand l'organisateur soumet un événement.
            </p>

            <div className={styles.row}>
              <div className={styles.field}>
                <label className={styles.label}>Événements actifs</label>
                <input
                  type="number"
                  min="1"
                  value={form.illimite ? "" : form.limite_evenements}
                  onChange={(e) => set("limite_evenements", e.target.value)}
                  disabled={form.illimite}
                  placeholder={form.illimite ? "Illimité" : ""}
                  className={styles.input}
                />
                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={form.illimite}
                    onChange={(e) => set("illimite", e.target.checked)}
                  />
                  Illimité
                </label>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Billets max par événement</label>
                <input
                  type="number"
                  min="1"
                  value={form.max_billets_par_event}
                  onChange={(e) => set("max_billets_par_event", e.target.value)}
                  placeholder="Illimité"
                  className={styles.input}
                />
                <p className={styles.hint}>Capacité totale, tous types de billets.</p>
              </div>
            </div>

            <div className={styles.row}>
              <div className={styles.field}>
                <label className={styles.label}>Types de billets max</label>
                <input
                  type="number"
                  min="1"
                  value={form.max_types_billets}
                  onChange={(e) => set("max_types_billets", e.target.value)}
                  placeholder="Illimité"
                  className={styles.input}
                />
                <p className={styles.hint}>Ex. Standard, VIP, Étudiant…</p>
              </div>
            </div>
          </section>

          {/* ===== OPTIONS ===== */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Options incluses</h2>

            <div className={styles.optionsGrid}>
              {PACK_OPTIONS.map((o) => (
                <label key={o.key} className={styles.optionItem}>
                  <input
                    type="checkbox"
                    checked={form[o.key]}
                    onChange={(e) => set(o.key, e.target.checked)}
                  />
                  {o.label}
                </label>
              ))}
            </div>

            {form.mise_en_avant && (
              <div className={styles.row}>
                <div className={styles.field}>
                  <label className={styles.label}>Mises en avant par mois</label>
                  <input
                    type="number"
                    min="0"
                    value={form.mises_en_avant_mois}
                    onChange={(e) => set("mises_en_avant_mois", e.target.value)}
                    className={styles.input}
                  />
                  <p className={styles.hint}>Nombre d'événements pouvant être mis en avant chaque mois.</p>
                </div>
              </div>
            )}

            <div className={styles.field}>
              <label className={styles.label}>Autres avantages</label>
              <textarea
                value={form.avantages}
                onChange={(e) => set("avantages", e.target.value)}
                placeholder={"Un avantage par ligne\nBilletterie en ligne\nQR code à l'entrée"}
                className={styles.textarea}
                rows={4}
              />
            </div>
          </section>

          {/* ===== PRÉSENTATION ===== */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Présentation</h2>

            <div className={styles.field}>
              <label className={styles.label}>Couleur</label>
              <div className={styles.colorRow}>
                {PACK_COULEURS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => set("couleur", c)}
                    className={`${styles.colorDot} ${
                      form.couleur === c ? styles.colorDotActive : ""
                    }`}
                    style={{ background: c }}
                    aria-label={`Couleur ${c}`}
                  />
                ))}
              </div>
            </div>

            <div className={styles.row}>
              <div className={styles.field}>
                <label className={styles.label}>Étiquette</label>
                <input
                  type="text"
                  value={form.etiquette}
                  onChange={(e) => set("etiquette", e.target.value)}
                  placeholder="Populaire, Meilleure offre…"
                  className={styles.input}
                  maxLength={30}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Ordre d'affichage</label>
                <input
                  type="number"
                  min="0"
                  value={form.ordre}
                  onChange={(e) => set("ordre", e.target.value)}
                  className={styles.input}
                />
                <p className={styles.hint}>Du plus petit au plus grand (Gratuit → Premium).</p>
              </div>
            </div>
          </section>

          <div className={styles.actions}>
            <Link to="/admin/packs" className={styles.btnCancel}>
              Annuler
            </Link>
            <button type="submit" className={styles.btnSubmit} disabled={saving}>
              {saving
                ? "Enregistrement..."
                : isEdit ? "Enregistrer les modifications" : "Créer le pack"}
            </button>
          </div>
        </div>

        {/* Aperçu en direct */}
        <aside className={styles.previewCol}>
          <div className={styles.previewSticky}>
            <p className={styles.previewLabel}>
              <Eye size={13} /> Aperçu
            </p>
            <PackCard pack={apercu} />
            <p className={styles.previewHint}>
              Un organisateur sans abonnement reçoit automatiquement le premier
              pack gratuit actif.
            </p>
          </div>
        </aside>
      </form>
    </div>
  );
}
