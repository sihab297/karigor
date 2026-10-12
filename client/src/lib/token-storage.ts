const KEY = 'karigor.token';

// storage can be blocked (private mode, strict settings), so never let it crash the app
export function getToken(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function saveToken(token: string) {
  try {
    localStorage.setItem(KEY, token);
  } catch {
    // the user just stays logged in until the tab closes
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // nothing to clear
  }
}
