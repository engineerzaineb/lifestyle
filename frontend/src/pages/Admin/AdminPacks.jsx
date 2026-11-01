import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Package, Plus, Pencil, Trash2, Archive, ArchiveRestore, CheckCircle,
} from "lucide-react";
import {
  fetchAdminPacks, updatePack, deletePack,
} from "../../services/packService";
import { useToastContext } from "../../components/iu/Toast/ToastProvider";
import PackCard from "../../components/PackCard/PackCard";
import styles from "./AdminPacks.module.css";

const TABS = [
  { value: "true", label: "Actifs", icon: CheckCircle },
  { value: "false", label: "Archivés", icon: Archive },
];

export default function AdminPacks() {
  const toast = useToastContext();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("true");
  const [packs, setPacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

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
    if (pack.nb_abonnes > 0) {
      toast.warning(
        `Impossible : ${pack.nb_abonnes} organisateur(s) ont ce pack. Archivez-le plutôt.`
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

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Packs organisateurs</h1>
          <p className={styles.subtitle}>
            Définissez les offres d'abonnement et leurs limites
          </p>
        </div>
        <Link to="/admin/packs/nouveau" className={styles.btnCreate}>
          <Plus size={16} />
          Nouveau pack
        </Link>
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
            <PackCard
              key={pack.id}
              pack={pack}
              actions={
                <>
                  <button
                    onClick={() => navigate(`/admin/packs/${pack.id}/modifier`)}
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
                    disabled={processing || pack.nb_abonnes > 0}
                    className={styles.btnIconDanger}
                    title={
                      pack.nb_abonnes > 0
                        ? "Des organisateurs ont ce pack"
                        : "Supprimer"
                    }
                  >
                    <Trash2 size={15} />
                  </button>
                </>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
