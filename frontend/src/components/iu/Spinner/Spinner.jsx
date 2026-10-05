import styles from "./Spinner.module.css";


export default function Spinner({ size = "md", color = "primary", center = false }) {
  const spinner = (
    <span className={`${styles.spinner} ${styles[size]} ${styles[color]}`} />
  );

  if (center) {
    return <div className={styles.center}>{spinner}</div>;
  }

  return spinner;
}