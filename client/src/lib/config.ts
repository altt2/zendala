// API configuration
// In development: relative paths work because the dev server proxies to /api
// In production (APK/web): use absolute URL to the API server

const VITE_API_URL = import.meta.env.VITE_API_URL;

// Detect when the app is running inside a local WebView (Capacitor / localhost / file)
const isLocalWebview = typeof window !== 'undefined' && (
  window.location.protocol === 'file:' ||
  window.location.hostname === 'localhost' ||
  window.location.protocol === 'capacitor:' ||
  (window.location.origin && window.location.origin.startsWith('http://localhost')) ||
  (window.location.origin && window.location.origin.startsWith('https://localhost'))
);

// Use explicit absolute API URL when running inside the local WebView (mobile APK)
const API_BASE_URL = VITE_API_URL || (isLocalWebview ? 'https://zendala.onrender.com' : '');

export function getApiUrl(path: string): string {
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

// Token management
const TOKEN_KEY = 'auth_token';

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    // localStorage might not be available in some contexts
    return null;
  }
}

export function setAuthToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    console.warn('Could not save auth token');
  }
}

export function clearAuthToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    console.warn('Could not clear auth token');
  }
}

export { API_BASE_URL };
