import { getInitials } from "../../../utils/formatters";
import styles from "./Avatar.module.css";


export default function Avatar({
  prenom = "",
  nom = "",
  src,
  size = "md",
  variant = "primary",
  status,
  alt,
}) {
  const initials = getInitials(prenom, nom);

  const classes = [styles.avatar, styles[size], !src && styles[variant]]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes}>
      {src ? (
        <img
          src={src}
          alt={alt || `${prenom} ${nom}`}
          className={styles.img}
        />
      ) : (
        initials
      )}
      {status && (
        <span className={`${styles.statusDot} ${styles[`status${status.charAt(0).toUpperCase()}${status.slice(1)}`]}`} />
      )}
    </div>
  );
}