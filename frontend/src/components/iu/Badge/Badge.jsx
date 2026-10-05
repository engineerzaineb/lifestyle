import styles from "./Badge.module.css";


export default function Badge({
  variant = "primary",
  size = "md",
  solid = false,
  icon: Icon,
  pulse = false,
  children,
}) {
  const classes = [
    styles.badge,
    styles[variant],
    styles[size],
    solid && styles.solid,
    pulse && styles.pulse,
  ].filter(Boolean).join(" ");

  return (
    <span className={classes}>
      {Icon && <Icon size={size === "sm" ? 10 : size === "lg" ? 13 : 11} />}
      {children}
    </span>
  );
}