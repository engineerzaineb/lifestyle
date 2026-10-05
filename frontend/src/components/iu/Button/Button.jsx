import { Link } from "react-router-dom";
import styles from "./Button.module.css";


export default function Button({
  variant = "primary",
  size = "md",
  leftIcon,
  rightIcon,
  fullWidth = false,
  shine = false,
  loading = false,
  disabled = false,
  to,
  href,
  type = "button",
  onClick,
  children,
  className = "",
  ...rest
}) {
  // Construction des classes CSS
  const classes = [
    styles.button,
    styles[variant],
    styles[size],
    fullWidth && styles.fullWidth,
    shine && styles.shine,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  // Contenu interne 
  const content = (
    <>
      {loading ? (
        <span className={styles.spinner} />
      ) : (
        <>
          {leftIcon}
          {children}
          {rightIcon && <span className="arrow-slide">{rightIcon}</span>}
        </>
      )}
    </>
  );

  // Si "to", on rend un <Link> de react-router
  if (to && !disabled) {
    return (
      <Link to={to} className={classes} {...rest}>
        {content}
      </Link>
    );
  }

  // Si "href", on rend un <a> classique
  if (href && !disabled) {
    return (
      <a href={href} className={classes} {...rest}>
        {content}
      </a>
    );
  }

  // Sinon, un vrai bouton
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={classes}
      {...rest}
    >
      {content}
    </button>
  );
}