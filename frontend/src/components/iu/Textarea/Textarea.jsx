import styles from "./Textarea.module.css";


export default function Textarea({
  label,
  value,
  onChange,
  placeholder,
  required = false,
  optional = false,
  disabled = false,
  error,
  hint,
  maxLength,
  rows = 4,
  ...rest
}) {
  const length = (value || "").length;
  const isAtMax = maxLength && length >= maxLength;

  const handleChange = (e) => {
    if (onChange) onChange(e.target.value);
  };

  return (
    <div className={styles.field}>
      {label && (
        <div className={styles.labelRow}>
          <label className={styles.label}>
            {label}
            {required && <span className={styles.required}>*</span>}
            {optional && <span className={styles.optional}>(optionnel)</span>}
          </label>
          {maxLength && (
            <span className={`${styles.counter} ${isAtMax ? styles.counterMax : ""}`}>
              {length} / {maxLength}
            </span>
          )}
        </div>
      )}

      <div className={`${styles.wrapper} ${error ? styles.error : ""}`}>
        <textarea
          value={value || ""}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={maxLength}
          rows={rows}
          className={styles.textarea}
          {...rest}
        />
      </div>

      {error && <p className={styles.errorMsg}>{error}</p>}
      {!error && hint && <p className={styles.hint}>{hint}</p>}
    </div>
  );
}