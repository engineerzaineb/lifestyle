import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import styles from "./Input.module.css";

export default function Input({
  label,
  type = "text",
  icon: Icon,
  value,
  onChange,
  placeholder,
  required = false,
  optional = false,
  disabled = false,
  error,
  hint,
  autoFocus = false,
  autoComplete,
  ...rest
}) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword && showPassword ? "text" : type;

  const handleChange = (e) => {
    if (onChange) onChange(e.target.value);
  };

  return (
    <div className={styles.field}>
      {label && (
        <label className={styles.label}>
          {label}
          {required && <span className={styles.required}>*</span>}
          {optional && <span className={styles.optional}>(optionnel)</span>}
        </label>
      )}

      <div
        className={`${styles.wrapper} ${error ? styles.error : ""} ${disabled ? styles.disabled : ""}`}
      >
        {Icon && (
          <span className={styles.icon}>
            <Icon size={15} />
          </span>
        )}
        <input
          type={inputType}
          value={value || ""}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          autoComplete={autoComplete}
          className={styles.input}
          {...rest}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className={styles.actionBtn}
            aria-label={showPassword ? "Masquer" : "Afficher"}
          >
            {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        )}
      </div>

      {error && <p className={styles.errorMsg}>{error}</p>}
      {!error && hint && <p className={styles.hint}>{hint}</p>}
    </div>
  );
}