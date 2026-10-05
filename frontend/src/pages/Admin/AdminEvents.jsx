import { useState, useEffect } from "react";
import {
  Clock, CheckCircle, XCircle, Calendar, MapPin, Tag,
  Users, Banknote, FileText, X, Check, User,
} from "lucide-react";
import {
  fetchEventsAModerer, validerEvent, refuserEvent,
} from "../../services/adminService";
import { useToastContext } from "../../components/iu/Toast/ToastProvider";
import styles from "./AdminEvents.module.css";

const TABS = [
  { value: "en_attente", label: "En attente", icon: Clock },
  { value: "publie", label: "Publiés", icon: CheckCircle },
  { value: "refuse", label: "Refusés", icon: XCircle },
];

export default function AdminEvents() {
  const toast = useToastContext();
  const [activeTab, setActiveTab] = useState("en_attente");
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [refusModal, setRefusModal] = useState(null);
  const [motifRefus, setMotifRefus] = useState("");
  const [processing, setProcessing] = useState(false);

  // Charge les événements selon l'onglet actif
  const loadEvents = () => {
    setLoading(true);
    fetchEventsAModerer(activeTab)
      .then((data) => setEvents(data))
      .catch((err) => {
        console.error("Erreur chargement événements:", err);
        toast.error("Impossible de charger les événements");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Valide un événement
  const handleValider = async (id) => {
    setProcessing(true);
    try {
      await validerEvent(id);
      toast.success("Événement validé et publié.");
      setSelectedEvent(null);
      loadEvents();
    } catch (err) {
      console.error("Erreur validation:", err);
      toast.error("Erreur lors de la validation");
    } finally {
      setProcessing(false);
    }
  };

  // Refuse un événement
  const handleRefuser = async () => {
    if (!motifRefus.trim()) {
      toast.warning("Le motif est obligatoire");
      return;
    }
    setProcessing(true);
    try {
      await refuserEvent(refusModal.id, motifRefus);
      toast.success("Événement refusé");
      setRefusModal(null);
      setMotifRefus("");
      setSelectedEvent(null);
      loadEvents();
    } catch (err) {
      console.error("Erreur refus:", err);
      toast.error("Erreur lors du refus");
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "Non renseignée";
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "numeric", month: "long", year: "numeric",
    });
  };

  // Nom de l'organisateur (le serializer peut renvoyer plusieurs formats)
  const getOrganisateurNom = (ev) => {
    if (ev.organisateur_nom) return ev.organisateur_nom;
    if (ev.organisateur?.prenom || ev.organisateur?.nom)
      return `${ev.organisateur.prenom || ""} ${ev.organisateur.nom || ""}`.trim();
    return ev.organisateur_email || "Organisateur";
  };

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>Gestion des événements</h1>
        <p className={styles.subtitle}>Validez ou refusez les événements soumis</p>
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
      ) : events.length === 0 ? (
        <div className={styles.empty}>
          <Calendar size={40} />
          <p>Aucun événement {activeTab === "en_attente" ? "en attente" : activeTab === "publie" ? "publié" : "refusé"}</p>
        </div>
      ) : (
        <div className={styles.list}>
          {events.map((event) => (
            <div key={event.id} className={styles.card}>
              <div className={styles.cardIcon}>
                <Calendar size={20} />
              </div>
              <div className={styles.cardInfo}>
                <p className={styles.cardName}>{event.titre}</p>
                <p className={styles.cardOrg}>
                  <User size={12} />
                  {getOrganisateurNom(event)}
                </p>
                <p className={styles.cardDate}>
                  <Calendar size={12} />
                  {formatDate(event.date_evenement)}
                  {event.ville && <> · <MapPin size={12} /> {event.ville}</>}
                </p>
              </div>
              <div className={styles.cardActions}>
                <button
                  onClick={() => setSelectedEvent(event)}
                  className={styles.btnDetail}
                >
                  Voir détails
                </button>
                {activeTab === "en_attente" && (
                  <>
                    <button
                      onClick={() => handleValider(event.id)}
                      className={styles.btnValider}
                      disabled={processing}
                    >
                      <Check size={14} />
                      Valider
                    </button>
                    <button
                      onClick={() => setRefusModal(event)}
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
      {selectedEvent && (
        <DetailModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onValider={handleValider}
          onRefuser={(e) => { setSelectedEvent(null); setRefusModal(e); }}
          processing={processing}
          formatDate={formatDate}
          getOrganisateurNom={getOrganisateurNom}
        />
      )}

      {/* Modal de refus */}
      {refusModal && (
        <RefusModal
          event={refusModal}
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
function DetailModal({ event, onClose, onValider, onRefuser, processing, formatDate, getOrganisateurNom }) {
  const formatPrix = (prix) => {
    if (prix === null || prix === undefined) return "Non renseigné";
    if (prix === 0) return "Gratuit";
    return `${prix} DT`;
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Détail de l'événement</h2>
          <button onClick={onClose} className={styles.modalClose}>
            <X size={18} />
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.detailTitle}>
            <div className={styles.detailIcon}>
              <Calendar size={22} />
            </div>
            <div>
              <p className={styles.detailName}>{event.titre}</p>
              <p className={styles.detailOrg}>{getOrganisateurNom(event)}</p>
            </div>
          </div>

          <div className={styles.detailGrid}>
            <DetailRow icon={Calendar} label="Date" value={formatDate(event.date_evenement)} />
            <DetailRow icon={MapPin} label="Lieu" value={event.lieu || "Non renseigné"} />
            <DetailRow icon={MapPin} label="Ville" value={event.ville || "Non renseignée"} />
            <DetailRow icon={Tag} label="Catégorie" value={event.categorie?.nom || event.categorie_nom || "Non renseignée"} />
            <DetailRow icon={Users} label="Capacité" value={event.capacite ? `${event.capacite} places` : "Non renseignée"} />
            <DetailRow icon={Banknote} label="Prix" value={formatPrix(event.prix)} />
          </div>

          {event.description && (
            <div className={styles.detailDescription}>
              <p className={styles.detailLabel}>Description</p>
              <p className={styles.detailText}>{event.description}</p>
            </div>
          )}
        </div>

        {/* Actions si en attente */}
        {event.statut === "en_attente" && (
          <div className={styles.modalFooter}>
            <button
              onClick={() => onRefuser(event)}
              className={styles.btnRefuser}
              disabled={processing}
            >
              <X size={14} />
              Refuser
            </button>
            <button
              onClick={() => onValider(event.id)}
              className={styles.btnValider}
              disabled={processing}
            >
              <Check size={14} />
              Valider l'événement
            </button>
          </div>
        )}

        {/* Si refusé, afficher le motif */}
        {event.statut === "refuse" && event.motif_refus && (
          <div className={styles.modalFooter}>
            <div className={styles.refusInfo}>
              <strong>Motif du refus :</strong> {event.motif_refus}
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
function RefusModal({ event, motif, onMotifChange, onConfirm, onClose, processing }) {
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalSmall} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Refuser l'événement</h2>
          <button onClick={onClose} className={styles.modalClose}>
            <X size={18} />
          </button>
        </div>

        <div className={styles.modalBody}>
          <p className={styles.refusText}>
            Vous êtes sur le point de refuser l'événement{" "}
            <strong>{event.titre}</strong>.
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