import api from "./api";

// Mode mock désactivé maintenant qu'on a le vrai backend
const USE_MOCK = false;

/**
 * Connexion utilisateur
 * @param {object} credentials - { email, password }
 * @returns {object} { access, refresh, user }
 */
export async function login(credentials) {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 800));
    let role = "utilisateur";
    if (credentials.email.includes("admin")) role = "admin";
    else if (credentials.email.includes("organizer") || credentials.email.includes("client")) role = "client";
    return {
      user: { id: 1, email: credentials.email, nom: "Démo", prenom: credentials.email.split("@")[0], role, ville: "Tunis" },
      access: "mock-jwt-access-token",
      refresh: "mock-jwt-refresh-token",
    };
  }

  const { data } = await api.post("/auth/login/", credentials);
  return data;
}

/**
 * Inscription utilisateur
 * @param {object} userData - { email, nom, prenom, password, role, latitude?, longitude? }
 * @returns {object} { access, refresh, user }
 */
export async function register(userData) {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 1000));
    return {
      user: { id: Date.now(), ...userData },
      access: "mock-jwt-access-token",
      refresh: "mock-jwt-refresh-token",
    };
  }

  const { data } = await api.post("/auth/register/", userData);
  return data;
}

// Déconnexion utilisateur (blacklist le refresh token côté backend)
export async function logout() {
  if (USE_MOCK) {
    return { success: true };
  }

  // Récupère le refresh token pour l'envoyer au backend
  const refresh = localStorage.getItem("lifestyle_refresh_token");

  if (!refresh) {
    return { success: true };
  }

  try {
    const { data } = await api.post("/auth/logout/", { refresh });
    return data;
  } catch (err) {
    // Même si l'API logout échoue, on déconnecte côté client
    console.warn("Logout API failed, but proceeding with local logout");
    return { success: true };
  }
}

// Récupère l'utilisateur actuellement connecté
export async function getCurrentUser() {
  if (USE_MOCK) {
    return null;
  }

  const { data } = await api.get("/auth/me/");
  return data;
}

/**
 * Met à jour la position géographique de l'utilisateur
 * Appelée automatiquement à chaque login
 * @param {object} location - { latitude, longitude, source? }
 */
export async function updateLocation(location) {
  if (USE_MOCK) {
    return { success: true };
  }

  const { data } = await api.patch("/auth/me/location/", {
    latitude: location.latitude,
    longitude: location.longitude,
    source: location.source || "login",
  });
  return data;
}

/**
 * Récupère l'historique des positions du user
 * Utilisé plus tard pour les recommandations intelligentes
 */
export async function getMyLocations() {
  if (USE_MOCK) {
    return [];
  }

  const { data } = await api.get("/auth/me/locations/");
  return data.results || data;
}
/**
 * Récupère ma demande d'organisateur (statut, infos)
 * @returns {object|null} la demande ou null si aucune
 */
export async function getMyDemandeOrganisateur() {
  if (USE_MOCK) {
    return null;
  }

  try {
    const { data } = await api.get("/auth/demande-organisateur/");
    return data;
  } catch (err) {
    // 404 = pas de demande, c'est normal
    if (err.response?.status === 404) {
      return null;
    }
    throw err;
  }
}

/**
 * Crée une demande pour devenir organisateur
 * @param {FormData|object} demandeData - les champs du formulaire
 */
export async function createDemandeOrganisateur(demandeData) {
  if (USE_MOCK) {
    return { id: Date.now(), statut: "en_attente" };
  }

  // Si c'est un FormData (avec logo), on change le content-type
  const isFormData = demandeData instanceof FormData;
  const config = isFormData
    ? { headers: { "Content-Type": "multipart/form-data" } }
    : {};

  const { data } = await api.post("/auth/demande-organisateur/", demandeData, config);
  return data;
}

// Annule ma demande d'organisateur (seulement si en_attente)
export async function cancelMyDemandeOrganisateur() {
  if (USE_MOCK) {
    return { detail: "Demande annulée" };
  }

  const { data } = await api.delete("/auth/demande-organisateur/");
  return data;
}
// Demande de réinitialisation du mot de passe 
 
export async function requestPasswordReset(email) {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 500));
    return { detail: "Email envoyé" };
  }

  const { data } = await api.post("/auth/password-reset/", { email });
  return data;
}
/**
 * Met à jour le profil de l'utilisateur connecté
 * @param {object} payload - { nom, prenom, telephone, ville }
 * @returns le profil complet mis à jour
 */
export async function updateProfile(payload) {
  const { data } = await api.patch("/auth/me/", payload);
  return data;
}

/**
 * Change le mot de passe de l'utilisateur connecté
 * @param {string} oldPassword - mot de passe actuel
 * @param {string} newPassword - nouveau mot de passe
 */
export async function changePassword(oldPassword, newPassword) {
  const { data } = await api.post("/auth/me/password/", {
    old_password: oldPassword,
    new_password: newPassword,
  });
  return data;
}


// Applique le nouveau mot de passe à partir du lien reçu par email 
export async function confirmPasswordReset(uid, token, newPassword) {
  const { data } = await api.post("/auth/password-reset/confirm/", {
    uid,
    token,
    new_password: newPassword,
  });
  return data;
}