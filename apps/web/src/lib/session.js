const SESSION_KEY = 'homestay.session';

/** Session persistence in browser storage (survives reloads, cleared on logout/expiry). */
export function loadSession() {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (!session?.token || !session?.user || !session?.expiresAt || new Date(session.expiresAt) <= new Date()) {
      window.localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function saveSession(session) {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  window.localStorage.removeItem(SESSION_KEY);
}

export function getToken() {
  return loadSession()?.token ?? null;
}
