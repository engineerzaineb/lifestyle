import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, AlertCircle, Sparkles } from "lucide-react";
import { useAuth } from "../../context/useAuth";
import { updateMyInterets } from "../../services/interetService";
import InterestsPicker from "../../components/InterestsPicker/InterestsPicker";
import styles from "./OnboardingInterests.module.css";

export default function OnboardingInterests() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();

  const [selectedIds, setSelectedIds] = useState([]);
  const [customInterets, setCustomInterets] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const totalSelected = selectedIds.length + customInterets.length;

  // Callback du composant InterestsPicker
  const handleInterestsChange = ({ selectedIds: ids, customInterets: customs }) => {
    setSelectedIds(ids);
    setCustomInterets(customs);
  };

  // Détermine la redirection finale selon le rôle
  // Détermine la redirection après l'onboarding des intérêts
// Tous ceux qui ont rempli leurs intérêts vont sur /home pour profiter des recommandations
const getRedirectPath = () => {
  if (user?.role === "admin") return "/admin";
  // Utilisateur et "les deux" (client) vont sur /home après avoir choisi leurs intérêts
  return "/home";
};

  // Valide et envoie les intérêts au backend
  const handleContinue = async () => {
    if (totalSelected < 3) {
      setError("Veuillez sélectionner au moins 3 centres d'intérêt pour de meilleures recommandations.");
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const updatedUser = await updateMyInterets({
        interet_ids: selectedIds,
        custom_interets: customInterets,
      });

      // Met à jour le user dans le context
      updateUser(updatedUser);

      // Redirige vers la home appropriée
      navigate(getRedirectPath());
    } catch (err) {
      console.error("Erreur sauvegarde intérêts :", err);
      setError("Une erreur est survenue. Réessayez.");
      setIsLoading(false);
    }
  };

  // Skip : passer cette étape (les intérêts pourront être ajoutés plus tard)
  const handleSkip = () => {
    navigate(getRedirectPath());
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <span className={styles.greeting}>
            <Sparkles size={12} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />
            Bienvenue {user?.prenom} !
          </span>
          <h1 className={styles.title}>
            Quels sont vos <span className={styles.titleEm}>centres d'intérêt</span> ?
          </h1>
          <p className={styles.subtitle}>
            Sélectionnez au moins 3 catégories pour qu'on puisse vous proposer des événements qui vous correspondent.
          </p>
        </div>

        {/* Erreur */}
        {error && (
          <div className={styles.errorMsg}>
            <AlertCircle size={14} />
            {error}
          </div>
        )}

        {/* Composant de sélection */}
        <div className={styles.content}>
          <InterestsPicker
            selectedIds={selectedIds}
            customInterets={customInterets}
            onChange={handleInterestsChange}
          />
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          <button
            type="button"
            onClick={handleSkip}
            disabled={isLoading}
            className={styles.btnSkip}
          >
            Plus tard
          </button>

          <button
            type="button"
            onClick={handleContinue}
            disabled={isLoading || totalSelected < 3}
            className={styles.btnContinue}
          >
            {isLoading ? (
              <>
                <span className={styles.spinner} />
                Sauvegarde...
              </>
            ) : (
              <>
                Continuer
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}