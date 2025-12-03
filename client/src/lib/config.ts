// API configuration
// In development: relative paths work because the dev server proxies to /api
// In production (APK/web): use absolute URL to the API server

const API_BASE_URL = import.meta.env.VITE_API_URL || 
  (typeof window !== 'undefined' && window.location.origin !== 'file://' 
    ? '' // Use relative URLs when served from same origin
    : 'https://zendala-production.onrender.com'); // Use absolute URL for APK/file:// protocol

export function getApiUrl(path: string): string {
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

export { API_BASE_URL };
