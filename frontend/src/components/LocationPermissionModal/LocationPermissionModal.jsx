import { useState } from "react";
import { MapPin, Check, AlertCircle, X } from "lucide-react";
import styles from "./LocationPermissionModal.module.css";

/**
 * LocationPermissionModal - Popup custom pour demander la permission de localisation
 *
 * Props :
 * - onAllow : (position) => void - appelée si l'utilisateur accepte ET la géoloc fonctionne
 * - onDeny : () => void - appelée si l'utilisateur refuse
 */
export default function LocationPermissionModal({ onAllow, onDeny }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Quand l'utilisateur clique "Autoriser"
  const handleAllow = () => {
    setError(null);
    setIsLoading(true);

    if (!navigator.geolocation) {
      setError("Votre navigateur ne supporte pas la géolocalisation");
      setIsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      // Succès : on récupère la position
      (pos) => {
        setIsLoading(false);
                onAllow({
          latitude: Number(pos.coords.latitude.toFixed(6)),
          longitude: Number(pos.coords.longitude.toFixed(6)),
        });
      },
      // Erreur : refus ou problème technique
      (err) => {
        setIsLoading(false);

        if (err.code === err.PERMISSION_DENIED) {
          setError("Votre navigateur a bloqué la localisation. Vérifiez vos paramètres.");
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setError("Impossible de détecter votre position. Réessayez.");
        } else if (err.code === err.TIMEOUT) {
          setError("La détection prend trop de temps. Réessayez.");
        } else {
          setError("Une erreur est survenue. Réessayez.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // Quand l'utilisateur clique "Non merci"
  const handleDeny = () => {
    onDeny();
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        {/* Icône avec animation pulse */}
        <div className={styles.icon}>
          <MapPin size={32} strokeWidth={2.5} />
          <div className={styles.iconPulse} />
        </div>

        {/* Titre */}
        <h2 className={styles.title}>
          Activer la <em className={styles.titleEm}>géolocalisation</em>
        </h2>

        {/* Description */}
        <p className={styles.description}>
          Pour vous offrir la meilleure expérience, Eventu aimerait
          connaître votre position.
        </p>

        {/* Bénéfices */}
        <div className={styles.benefits}>
          <div className={styles.benefitItem}>
            <Check size={14} className={styles.benefitIcon} strokeWidth={3} />
            <span>Événements près de chez vous</span>
          </div>
          <div className={styles.benefitItem}>
            <Check size={14} className={styles.benefitIcon} strokeWidth={3} />
            <span>Bons plans dans votre quartier</span>
          </div>
          <div className={styles.benefitItem}>
            <Check size={14} className={styles.benefitIcon} strokeWidth={3} />
            <span>Recommandations personnalisées</span>
          </div>
        </div>

        {/* Erreur */}
        {error && (
          <div className={styles.errorMsg}>
            <AlertCircle size={13} />
            {error}
          </div>
        )}

        {/* Boutons */}
        <div className={styles.actions}>
          <button
            type="button"
            onClick={handleDeny}
            disabled={isLoading}
            className={styles.btnDeny}
          >
            <X size={13} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />
            Non merci
          </button>
          <button
            type="button"
            onClick={handleAllow}
            disabled={isLoading}
            className={styles.btnAllow}
          >
            {isLoading ? (
              <>
                <span className={styles.spinner} />
                Détection...
              </>
            ) : (
              <>
                <MapPin size={13} />
                Autoriser
              </>
            )}
          </button>
        </div>

        {/* Note privacy */}
        <p className={styles.privacyNote}>
          🔒 Vos données restent privées et ne sont jamais partagées.
        </p>
      </div>
    </div>
  );
}