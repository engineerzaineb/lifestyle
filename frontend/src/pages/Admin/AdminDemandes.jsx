import { useState, useEffect } from "react";
import {
  Clock, CheckCircle, XCircle, Building2, Phone, MapPin,
  Globe, FileText, Calendar, X, Check,
} from "lucide-react";
import {
  fetchDemandes, fetchDemandeDetail, validerDemande, refuserDemande,
} from "../../services/adminService";
import { useToastContext } from "../../components/iu/Toast/ToastProvider";
import styles from "./AdminDemandes.module.css";

const TABS = [
  { value: "en_attente", label: "En attente", icon: Clock },
  { value: "valide", label: "Validées", icon: CheckCircle },
  { value: "refuse", label: "Refusées", icon: XCircle },
];

const TYPE_LABELS = {
  entreprise: "Entreprise",
  association: "Association",
  independant: "Indépendant",
};

export default function AdminDemandes() {
  const toast = useToastContext();
  const [activeTab, setActiveTab] = useState("en_attente");
  const [demandes, setDemandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDemande, setSelectedDemande] = useState(null);
  const [refusModal, setRefusModal] = useState(null);
  const [motifRefus, setMotifRefus] = useState("");
  const [processing, setProcessing] = useState(false);

  // Charge les demandes selon l'onglet actif
  const loadDemandes = () => {
    setLoading(true);
    fetchDemandes(activeTab)
      .then((data) => setDemandes(data))
      .catch((err) => {
        console.error("Erreur chargement demandes:", err);
        toast.error("Impossible de charger les demandes");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadDemandes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Ouvre le détail d'une demande
  const openDetail = async (id) => {
    try {
      const detail = await fetchDemandeDetail(id);
      setSelectedDemande(detail);
    } catch (err) {
      console.error("Erreur détail:", err);
      toast.error("Impossible de charger le détail");
    }
  };

  // Valide une demande
  const handleValider = async (id) => {
    setProcessing(true);
    try {
      await validerDemande(id);
      toast.success("Demande validée. L'utilisateur est maintenant organisateur.");
      setSelectedDemande(null);
      loadDemandes();
    } catch (err) {
      console.error("Erreur validation:", err);
      toast.error("Erreur lors de la validation");
    } finally {
      setProcessing(false);
    }
  };

  // Refuse une demande
  const handleRefuser = async () => {
    if (!motifRefus.trim()) {
      toast.warning("Le motif est obligatoire");
      return;
    }
    setProcessing(true);
    try {
      await refuserDemande(refusModal.id, motifRefus);
      toast.success("Demande refusée");
      setRefusModal(null);
      setMotifRefus("");
      setSelectedDemande(null);
      loadDemandes();
    } catch (err) {
      console.error("Erreur refus:", err);
      toast.error("Erreur lors du refus");
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "numeric", month: "long", year: "numeric",
    });
  };

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>Demandes d'organisateurs</h1>
        <p className={styles.subtitle}>Gérez les demandes pour devenir organisateur</p>
      </div>

      {/* Onglets */}
      <div className={styles.tabs}>
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`${styles.tab} ${activeTab === tab.value ? styles.tabActive : ""}`}
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
      ) : demandes.length === 0 ? (
        <div className={styles.empty}>
          <Building2 size={40} />
          <p>Aucune demande {activeTab === "en_attente" ? "en attente" : activeTab === "valide" ? "validée" : "refusée"}</p>
        </div>
      ) : (
        <div className={styles.list}>
          {demandes.map((demande) => (
            <div key={demande.id} className={styles.card}>
              <div className={styles.cardAvatar}>
                {demande.user_prenom?.[0]}{demande.user_nom?.[0]}
              </div>
              <div className={styles.cardInfo}>
                <p className={styles.cardName}>
                  {demande.user_prenom} {demande.user_nom}
                </p>
                <p className={styles.cardOrg}>
                  {demande.nom_organisation} · {TYPE_LABELS[demande.type_organisation]}
                </p>
                <p className={styles.cardDate}>
                  <Calendar size={12} />
                  Demande du {formatDate(demande.date_demande)}
                </p>
              </div>
              <div className={styles.cardActions}>
                <button
                  onClick={() => openDetail(demande.id)}
                  className={styles.btnDetail}
                >
                  Voir détails
                </button>
                {activeTab === "en_attente" && (
                  <>
                    <button
                      onClick={() => handleValider(demande.id)}
                      className={styles.btnValider}
                      disabled={processing}
                    >
                      <Check size={14} />
                      Valider
                    </button>
                    <button
                      onClick={() => setRefusModal(demande)}
                      className={styles.btnRefuser}
                      disabled={processing}
                    >
                      <X size={14} />
                      Refuser
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de détail */}
      {selectedDemande && (
        <DetailModal
          demande={selectedDemande}
          onClose={() => setSelectedDemande(null)}
          onValider={handleValider}
          onRefuser={(d) => { setSelectedDemande(null); setRefusModal(d); }}
          processing={processing}
          formatDate={formatDate}
        />
      )}

      {/* Modal de refus */}
      {refusModal && (
        <RefusModal
          demande={refusModal}
          motif={motifRefus}
          onMotifChange={setMotifRefus}
          onConfirm={handleRefuser}
          onClose={() => { setRefusModal(null); setMotifRefus(""); }}
          processing={processing}
        />
      )}
    </div>
  );
}

// Modal de détail complet
function DetailModal({ demande, onClose, onValider, onRefuser, processing, formatDate }) {
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Détail de la demande</h2>
          <button onClick={onClose} className={styles.modalClose}>
            <X size={18} />
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.detailUser}>
            <div className={styles.detailAvatar}>
              {demande.user_prenom?.[0]}{demande.user_nom?.[0]}
            </div>
            <div>
              <p className={styles.detailName}>{demande.user_prenom} {demande.user_nom}</p>
              <p className={styles.detailEmail}>{demande.user_email}</p>
            </div>
          </div>

          <div className={styles.detailGrid}>
            <DetailRow icon={Building2} label="Organisation" value={demande.nom_organisation} />
            <DetailRow icon={FileText} label="Type" value={TYPE_LABELS[demande.type_organisation]} />
            <DetailRow icon={FileText} label="Matricule fiscal" value={demande.matricule_fiscal || "Non renseigné"} />
            <DetailRow icon={MapPin} label="Adresse" value={demande.adresse} />
            <DetailRow icon={Phone} label="Téléphone" value={demande.telephone_pro} />
            {demande.site_web && <DetailRow icon={Globe} label="Site web" value={demande.site_web} />}
          </div>

          <div className={styles.detailDescription}>
            <p className={styles.detailLabel}>Description / Motivations</p>
            <p className={styles.detailText}>{demande.description}</p>
          </div>

          {demande.categories_prevues_noms?.length > 0 && (
            <div className={styles.detailCategories}>
              <p className={styles.detailLabel}>Catégories prévues</p>
              <div className={styles.catTags}>
                {demande.categories_prevues_noms.map((cat, i) => (
                  <span key={i} className={styles.catTag}>{cat}</span>
                ))}
              </div>
            </div>
          )}

          {/* Brouillons du user */}
          {demande.brouillons?.length > 0 && (
            <div className={styles.detailBrouillons}>
              <p className={styles.detailLabel}>Brouillons d'événements ({demande.brouillons.length})</p>
              {demande.brouillons.map((b) => (
                <div key={b.id} className={styles.brouillonItem}>
                  <strong>{b.titre}</strong>
                  <span>{b.categorie__nom} · {b.ville}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions si en attente */}
        {demande.statut === "en_attente" && (
          <div className={styles.modalFooter}>
            <button
              onClick={() => onRefuser(demande)}
              className={styles.btnRefuser}
              disabled={processing}
            >
              <X size={14} />
              Refuser
            </button>
            <button
              onClick={() => onValider(demande.id)}
              className={styles.btnValider}
              disabled={processing}
            >
              <Check size={14} />
              Valider la demande
            </button>
          </div>
        )}

        {/* Si refusée, afficher le motif */}
        {demande.statut === "refuse" && demande.motif_refus && (
          <div className={styles.modalFooter}>
            <div className={styles.refusInfo}>
              <strong>Motif du refus :</strong> {demande.motif_refus}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailRow({ icon: Icon, label, value }) {
  return (
    <div className={styles.detailRow}>
      <Icon size={15} className={styles.detailRowIcon} />
      <span className={styles.detailRowLabel}>{label}</span>
      <span className={styles.detailRowValue}>{value}</span>
    </div>
  );
}

// Modal de refus avec motif
function RefusModal({ demande, motif, onMotifChange, onConfirm, onClose, processing }) {
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalSmall} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Refuser la demande</h2>
          <button onClick={onClose} className={styles.modalClose}>
            <X size={18} />
          </button>
        </div>

        <div className={styles.modalBody}>
          <p className={styles.refusText}>
            Vous êtes sur le point de refuser la demande de{" "}
            <strong>{demande.user_prenom} {demande.user_nom}</strong>.
          </p>
          <label className={styles.refusLabel}>
            Motif du refus <span className={styles.req}>*</span>
          </label>
          <textarea
            value={motif}
            onChange={(e) => onMotifChange(e.target.value)}
            placeholder="Expliquez la raison du refus..."
            rows={4}
            className={styles.refusTextarea}
            autoFocus
          />
        </div>

        <div className={styles.modalFooter}>
          <button onClick={onClose} className={styles.btnCancel} disabled={processing}>
            Annuler
          </button>
          <button onClick={onConfirm} className={styles.btnRefuser} disabled={processing}>
            Confirmer le refus
          </button>
        </div>
      </div>
    </div>
  );
}