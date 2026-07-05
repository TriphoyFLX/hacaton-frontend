const AUTH_STORAGE_KEY = 'auth-storage';
const TOKEN_KEY = 'token';
const USER_ID_KEY = 'userId';

function readTokenFromAuthStorage(): string | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { state?: { token?: string | null } };
    return parsed?.state?.token ?? null;
  } catch {
    return null;
  }
}

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1])) as { exp?: number };
    if (!payload.exp) return false;
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

export function getAuthToken(): string | null {
  const fromStore = readTokenFromAuthStorage();
  const fromLegacy = localStorage.getItem(TOKEN_KEY);

  const candidates = [fromStore, fromLegacy].filter((t): t is string => Boolean(t));

  for (const token of candidates) {
    if (!isTokenExpired(token)) {
      localStorage.setItem(TOKEN_KEY, token);
      return token;
    }
  }

  return null;
}

export function setAuthToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAuthToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function getAuthUserId(): string | null {
  const direct = localStorage.getItem(USER_ID_KEY);
  if (direct) return direct;

  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { state?: { user?: { id?: string } } };
    const userId = parsed?.state?.user?.id;
    if (userId) {
      localStorage.setItem(USER_ID_KEY, userId);
      return userId;
    }
  } catch {
    // ignore malformed storage
  }

  return null;
}

export function setAuthUserId(userId: string): void {
  localStorage.setItem(USER_ID_KEY, userId);
}

export function clearAuthUserId(): void {
  localStorage.removeItem(USER_ID_KEY);
}

export function clearAuthSession(): void {
  clearAuthToken();
  clearAuthUserId();
}
