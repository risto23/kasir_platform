const TOKEN_KEY = 'pos_access_token';

export function setAccessToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getAccessToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function removeAccessToken() {
  localStorage.removeItem(TOKEN_KEY);
}