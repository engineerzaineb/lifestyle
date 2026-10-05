import { useState, useEffect } from "react";
import { X, Save, Type, MapPin, Calendar, Users } from "lucide-react";
import { CATEGORIES, VILLES_TUNISIE } from "../../utils/constants";
import { createBrouillon, updateBrouillon } from "../../services/eventService";
import { useToastContext } from "../iu/Toast/ToastProvider";
import styles from "./BrouillonModal.module.css";

export default function BrouillonModal({ brouillon, onClose, onSaved }) {
  const toast = useToastContext();
  const isEdit = !!brouillon;

  const [form, setForm] = useState({
    titre: "",
    description: "",
    categorie_slug: "",
    date_evenement: "",
    heure_evenement: "",
    lieu: "",
    ville: "Tunis",
    capacite_totale: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Pré-remplir si on édite
  useEffect(() => {
    if (brouillon) {
      let date = "";
      let heure = "";
      if (brouillon.date_evenement) {
        const dt = new Date(brouillon.date_evenement);
        date = dt.toISOString().split("T")[0];
        heure = dt.toTimeString().slice(0, 5);
      }
      setForm({
        titre: brouillon.titre || "",
        description: brouillon.description || "",
        categorie_slug: brouillon.categorie?.slug || "",
        date_evenement: date,
        heure_evenement: heure,
        lieu: brouillon.lieu || "",
        ville: brouillon.ville || "Tunis",
        capacite_totale: brouillon.capacite?.toString() || "",
      });
    }
  }, [brouillon]);

  const updateField = (field, value) => {
    setForm({ ...form, [field]: value });
    if (error) setError("");
  };

  const handleSave = async () => {
    // Seul le titre est obligatoire
    if (!form.titre.trim()) {
      setError("Le titre est obligatoire pour identifier votre brouillon");
      return;
    }

    setSaving(true);
    try {
      // On envoie is_draft pour que le backend mette statut=brouillon
      const payload = { titre: form.titre.trim(), is_draft: true };
      if (form.description.trim()) payload.description = form.description.trim();
      if (form.categorie_slug) payload.categorie_slug = form.categorie_slug;
      if (form.lieu.trim()) payload.lieu = form.lieu.trim();
      if (form.ville) payload.ville = form.ville;

      // Combine date + heure si fournis
      if (form.date_evenement) {
        const heure = form.heure_evenement || "00:00";
        payload.date_evenement = `${form.date_evenement}T${heure}:00`;
      }

      if (isEdit) {
        await updateBrouillon(brouillon.id, payload);
        toast.success("Brouillon mis à jour");
      } else {
        await createBrouillon(payload);
        toast.success("Brouillon créé");
      }
      onSaved();
      onClose();
    } catch (err) {
      console.error("Erreur sauvegarde brouillon:", err);
      const detail = err.response?.data?.detail || err.response?.data?.titre;
      toast.error(detail || "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const categoryEntries = Object.entries(CATEGORIES);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>
            {isEdit ? "Modifier le brouillon" : "Nouveau brouillon"}
          </h2>
          <button onClick={onClose} className={styles.closeBtn}>
            <X size={18} />
          </button>
        </div>

        {/* Body scrollable */}
        <div className={styles.body}>
          <p className={styles.hint}>
            💡 Seul le titre est obligatoire. Remplissez le reste à votre rythme — vous pourrez compléter (billets, image) et publier après validation de votre demande.
          </p>

          {error && <div className={styles.errorBox}>{error}</div>}

          {/* Titre */}
          <div className={styles.field}>
            <label className={styles.label}>
              Titre <span className={styles.req}>*</span>
            </label>
            <div className={styles.inputWrap}>
              <Type size={15} className={styles.inputIcon} />
              <input
                type="text"
                value={form.titre}
                onChange={(e) => updateField("titre", e.target.value)}
                placeholder="Ex: Festival Jazz de Carthage"
                className={styles.input}
                autoFocus
                maxLength={120}
              />
            </div>
          </div>

          {/* Description */}
          <div className={styles.field}>
            <label className={styles.label}>Description</label>
            <textarea
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              placeholder="Décrivez votre événement..."
              className={styles.textarea}
              rows={3}
              maxLength={1000}
            />
          </div>

          {/* Catégorie */}
          <div className={styles.field}>
            <label className={styles.label}>Catégorie</label>
            <div className={styles.catGrid}>
              {categoryEntries.map(([slug, cat]) => (
                <button
                  key={slug}
                  type="button"
                  onClick={() => updateField("categorie_slug", slug)}
                  className={`${styles.catBtn} ${form.categorie_slug === slug ? styles.catBtnActive : ""}`}
                >
                  <span>{cat.emoji}</span>
                  {cat.nom}
                </button>
              ))}
            </div>
          </div>

          {/* Date + Heure */}
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>Date</label>
              <div className={styles.inputWrap}>
                <Calendar size={15} className={styles.inputIcon} />
                <input
                  type="date"
                  value={form.date_evenement}
                  onChange={(e) => updateField("date_evenement", e.target.value)}
                  className={styles.input}
                />
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Heure</label>
              <div className={styles.inputWrap}>
                <Calendar size={15} className={styles.inputIcon} />
                <input
                  type="time"
                  value={form.heure_evenement}
                  onChange={(e) => updateField("heure_evenement", e.target.value)}
                  className={styles.input}
                />
              </div>
            </div>
          </div>

          {/* Lieu + Ville */}
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>Lieu</label>
              <div className={styles.inputWrap}>
                <MapPin size={15} className={styles.inputIcon} />
                <input
                  type="text"
                  value={form.lieu}
                  onChange={(e) => updateField("lieu", e.target.value)}
                  placeholder="Ex: La Villa"
                  className={styles.input}
                />
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Ville</label>
              <div className={styles.inputWrap}>
                <MapPin size={15} className={styles.inputIcon} />
                <select
                  value={form.ville}
                  onChange={(e) => updateField("ville", e.target.value)}
                  className={styles.input}
                  style={{ cursor: "pointer" }}
                >
                  {VILLES_TUNISIE.map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button onClick={onClose} className={styles.cancelBtn} disabled={saving}>
            Annuler
          </button>
          <button onClick={handleSave} className={styles.saveBtn} disabled={saving}>
            <Save size={15} />
            {saving ? "Enregistrement..." : isEdit ? "Mettre à jour" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}