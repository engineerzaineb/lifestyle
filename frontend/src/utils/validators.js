export function isEmail(email) {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isStrongPassword(password) {
  if (!password) return false;
  return password.length >= 8;
}


export function getPasswordStrength(password) {
  if (!password) return 0;
  let strength = 0;
  if (password.length >= 8) strength++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) strength++;
  if (/\d/.test(password) || /[!@#$%^&*]/.test(password)) strength++;
  return strength;
}

export function isPhoneTunisien(phone) {
  if (!phone) return false;
  const cleaned = phone.replace(/\s/g, "");
  return /^(\+216)?[2-9]\d{7}$/.test(cleaned);
}

export function isRequired(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  return true;
}