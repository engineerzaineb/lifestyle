import { useState, useEffect, useCallback, useRef } from "react";
import {
  Package, Plus, Pencil, Trash2, Archive, ArchiveRestore, X,
  CheckCircle, AlertTriangle, Users, Calendar, Percent,
} from "lucide-react";
import {
  fetchAdminPacks, createPack, updatePack, deletePack,
} from "../../services/packService";
import { useToastContext } from "../../components/iu/Toast/ToastProvider";
import styles from "./AdminPacks.module.css";

const TABS = [
  { value: "true", label: "Actifs", icon: CheckCircle },
  { value: "false", label: "Archivés", icon: Archive },
];

const DUREES = [
  { value: "mensuel", label: "Mensuel" },
  { value: "annuel", label: "Annuel" },
];

const EMPTY_FORM = {
  nom: "",
  description: "",
  prix: "0",
  duree: "mensuel",
  illimite: false,
  limite_evenements: "3",
  commission_pct: "10",
  avantages: "",
  ordre: "0",
};

// Les avantages peuvent arriver sous forme de liste ou de texte (un par ligne)
const listeAvantages = (avantages) =>
  Array.isArray(avantages)
    ? avantages.filter(Boolean)
    : (avantages || "").split("\n").map((a) => a.trim()).filter(Boolean);

// Nombre d'abonnés si le serializer le fournit, sinon null
const nbAbonnes = (pack) =>
  pack.nb_abonnes ?? pack.nb_abonnements ?? null;

export default function AdminPacks() {
  const toast = useToastContext();

  const [activeTab, setActiveTab] = useState("true");
  const [packs, setPacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // null = fermé, { mode: "create" } ou { mode: "edit", id }
  const [formModal, setFormModal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");

  // Ref sur toast : évite que sa nouvelle identité à chaque rendu
  // ne relance le chargement en boucle.
  const toastRef = useRef(toast);
  useEffect(() => { toastRef.current = toast; }, [toast]);

  const loadPacks = useCallback(() => {
    // Le backend renvoie tous les packs : on filtre actifs / archivés ici
    fetchAdminPacks()
      .then((data) =>
        setPacks(data.filter((p) => String(p.is_actif) === activeTab))
      )
      .catch((err) => {
        console.error("Erreur chargement packs:", err);
        toastRef.current.error("Impossible de charger les packs");
      })
      .finally(() => setLoading(false));
  }, [activeTab]);

  useEffect(() => {
    loadPacks();
  }, [loadPacks]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setFormError("");
    setFormModal({ mode: "create" });
  };

  const openEdit = (pack) => {
    setForm({
      nom: pack.nom,
      description: pack.description || "",
      prix: String(pack.prix),
      duree: pack.duree,
      illimite: pack.limite_evenements === null,
      limite_evenements:
        pack.limite_evenements === null ? "" : String(pack.limite_evenements),
      commission_pct: String(pack.commission_pct),
      avantages: listeAvantages(pack.avantages).join("\n"),
      ordre: String(pack.ordre),
    });
    setFormError("");
    setFormModal({ mode: "edit", id: pack.id });
  };

  const handleSubmit = async () => {
    const nom = form.nom.trim();
    if (nom.length < 2) {
      setFormError("Le nom doit contenir au moins 2 caractères.");
      return;
    }
    if (!form.illimite && !(Number(form.limite_evenements) >= 1)) {
      setFormError("Indiquez une limite d'au moins 1 événement, ou cochez « Illimité ».");
      return;
    }

    const payload = {
      nom,
      description: form.description.trim(),
      prix: form.prix || "0",
      duree: form.duree,
      limite_evenements: form.illimite ? null : Number(form.limite_evenements),
      commission_pct: form.commission_pct || "0",
      // Même format que celui renvoyé par le backend (liste ou texte)
      avantages: packs.some((p) => Array.isArray(p.avantages))
        ? form.avantages.split("\n").map((a) => a.trim()).filter(Boolean)
        : form.avantages.trim(),
      ordre: Number(form.ordre) || 0,
    };

    setProcessing(true);
    try {
      if (formModal.mode === "create") {
        await createPack(payload);
        toast.success("Pack créé");
      } else {
        await updatePack(formModal.id, payload);
        toast.success("Pack modifié");
      }
      setFormModal(null);
      loadPacks();
    } catch (err) {
      console.error("Erreur enregistrement pack:", err);
      const data = err.response?.data;
      const firstError = data && typeof data === "object"
        ? Object.values(data).flat()[0]
        : null;
      setFormError(firstError || "Erreur lors de l'enregistrement");
    } finally {
      setProcessing(false);
    }
  };

  const handleToggleArchive = async (pack) => {
    const action = pack.is_actif ? "Archiver" : "Réactiver";
    if (!window.confirm(`${action} le pack "${pack.nom}" ?`)) return;

    setProcessing(true);
    try {
      await updatePack(pack.id, { is_actif: !pack.is_actif });
      toast.success(pack.is_actif ? "Pack archivé" : "Pack réactivé");
      loadPacks();
    } catch (err) {
      console.error("Erreur archivage:", err);
      toast.error(err.response?.data?.detail || "Action impossible");
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async (pack) => {
    if (nbAbonnes(pack) > 0) {
      toast.warning(
        `Impossible : ${nbAbonnes(pack)} organisateur(s) ont ce pack. Archivez-le plutôt.`
      );
      return;
    }
    if (!window.confirm(`Supprimer définitivement le pack "${pack.nom}" ?`)) return;

    setProcessing(true);
    try {
      await deletePack(pack.id);
      toast.success("Pack supprimé");
      loadPacks();
    } catch (err) {
      console.error("Erreur suppression:", err);
      toast.error(err.response?.data?.detail || "Suppression impossible");
    } finally {
      setProcessing(false);
    }
  };

  const formatPrix = (pack) =>
    Number(pack.prix) === 0
      ? "Gratuit"
      : `${Number(pack.prix)} DT / ${pack.duree === "annuel" ? "an" : "mois"}`;

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Packs organisateurs</h1>
          <p className={styles.subtitle}>
            Définissez les offres d'abonnement et leurs limites
          </p>
        </div>
        <button onClick={openCreate} className={styles.btnCreate}>
          <Plus size={16} />
          Nouveau pack
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
      ) : packs.length === 0 ? (
        <div className={styles.empty}>
          <Package size={38} />
          <p>
            {activeTab === "false" ? "Aucun pack archivé" : "Aucun pack actif"}
          </p>
        </div>
      ) : (
        <div className={styles.grid}>
          {packs.map((pack) => (
            <div key={pack.id} className={styles.card}>
              <div className={styles.cardTop}>
                <div>
                  <p className={styles.cardName}>{pack.nom}</p>
                  <p className={styles.cardPrice}>{formatPrix(pack)}</p>
                </div>
                <div className={styles.cardActions}>
                  <button
                    onClick={() => openEdit(pack)}
                    className={styles.btnIcon}
                    title="Modifier"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => handleToggleArchive(pack)}
                    disabled={processing}
                    className={styles.btnIcon}
                    title={pack.is_actif ? "Archiver" : "Réactiver"}
                  >
                    {pack.is_actif ? <Archive size={15} /> : <ArchiveRestore size={15} />}
                  </button>
                  <button
                    onClick={() => handleDelete(pack)}
                    disabled={processing || nbAbonnes(pack) > 0}
                    className={styles.btnIconDanger}
                    title={
                      nbAbonnes(pack) > 0
                        ? "Des organisateurs ont ce pack"
                        : "Supprimer"
                    }
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {pack.description && (
                <p className={styles.cardDesc}>{pack.description}</p>
              )}

              <div className={styles.cardStats}>
                <span>
                  <Calendar size={12} />
                  {pack.limite_evenements === null
                    ? "Événements illimités"
                    : `${pack.limite_evenements} événement${pack.limite_evenements > 1 ? "s" : ""} actif${pack.limite_evenements > 1 ? "s" : ""}`}
                </span>
                <span>
                  <Percent size={12} /> Commission {Number(pack.commission_pct)} %
                </span>
                {nbAbonnes(pack) !== null && (
                  <span className={styles.cardCount}>
                    <Users size={12} /> {nbAbonnes(pack)} abonné{nbAbonnes(pack) > 1 ? "s" : ""}
                  </span>
                )}
              </div>

              {listeAvantages(pack.avantages).length > 0 && (
                <ul className={styles.avantages}>
                  {listeAvantages(pack.avantages).map((a, i) => (
                    <li key={i}>
                      <CheckCircle size={12} /> {a}
                    </li>
                  ))}
                </ul>
              )}
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
                {formModal.mode === "create" ? "Nouveau pack" : "Modifier le pack"}
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
                  placeholder="Gratuit, Pro, Premium..."
                  className={styles.input}
                  maxLength={100}
                  autoFocus
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Description</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Pour les organisateurs réguliers"
                  className={styles.input}
                />
              </div>

              <div className={styles.row}>
                <div className={styles.field}>
                  <label className={styles.label}>Prix (DT)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.prix}
                    onChange={(e) => setForm({ ...form, prix: e.target.value })}
                    className={styles.input}
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Durée</label>
                  <select
                    value={form.duree}
                    onChange={(e) => setForm({ ...form, duree: e.target.value })}
                    className={styles.input}
                  >
                    {DUREES.map((d) => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.row}>
                <div className={styles.field}>
                  <label className={styles.label}>Limite d'événements actifs</label>
                  <input
                    type="number"
                    min="1"
                    value={form.illimite ? "" : form.limite_evenements}
                    onChange={(e) =>
                      setForm({ ...form, limite_evenements: e.target.value })
                    }
                    disabled={form.illimite}
                    placeholder={form.illimite ? "Illimité" : ""}
                    className={styles.input}
                  />
                  <label className={styles.checkbox}>
                    <input
                      type="checkbox"
                      checked={form.illimite}
                      onChange={(e) => setForm({ ...form, illimite: e.target.checked })}
                    />
                    Illimité
                  </label>
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Commission (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={form.commission_pct}
                    onChange={(e) =>
                      setForm({ ...form, commission_pct: e.target.value })
                    }
                    className={styles.input}
                  />
                </div>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Avantages</label>
                <textarea
                  value={form.avantages}
                  onChange={(e) => setForm({ ...form, avantages: e.target.value })}
                  placeholder={"Un avantage par ligne\nStatistiques détaillées\nSupport prioritaire"}
                  className={styles.textarea}
                  rows={4}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Ordre d'affichage</label>
                <input
                  type="number"
                  min="0"
                  value={form.ordre}
                  onChange={(e) => setForm({ ...form, ordre: e.target.value })}
                  className={styles.input}
                />
                <p className={styles.hint}>
                  Les packs sont triés du plus petit au plus grand (Gratuit → Premium).
                  Un organisateur sans abonnement reçoit le premier pack gratuit actif.
                </p>
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
