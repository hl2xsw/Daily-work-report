// API Configuration & Dynamic Server URL Management for GitHub Pages & Cloud Run

const SERVER_URL_KEY = 'custom_backend_server_url';
const DEFAULT_CLOUD_RUN_URL = 'https://ais-dev-pshbeuykxbj26nq52ozyfe-362057610439.asia-northeast1.run.app';

export function getCustomServerUrl(): string {
  try {
    const saved = localStorage.getItem(SERVER_URL_KEY);
    if (saved && saved.trim()) {
      return saved.trim().replace(/\/+$/, '');
    }
  } catch (e) {}
  return '';
}

export function setCustomServerUrl(url: string): void {
  try {
    if (!url || !url.trim()) {
      localStorage.removeItem(SERVER_URL_KEY);
    } else {
      localStorage.setItem(SERVER_URL_KEY, url.trim().replace(/\/+$/, ''));
    }
  } catch (e) {}
}

export function getDefaultServerUrl(): string {
  return DEFAULT_CLOUD_RUN_URL;
}

export function buildApiUrl(endpoint: string): string {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const customUrl = getCustomServerUrl();

  if (customUrl) {
    return `${customUrl}${cleanEndpoint}`;
  }

  // If currently running on GitHub Pages (github.io), prefer customUrl or fallback to Cloud Run URL if available
  if (typeof window !== 'undefined' && window.location.hostname.endsWith('github.io')) {
    // Return relative or Cloud Run if user hasn't set, so it won't crash
    return cleanEndpoint;
  }

  return cleanEndpoint;
}
