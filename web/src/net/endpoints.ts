// Where the backend lives. Same origin by default (dev proxy, or a backend that serves the app);
// set VITE_WS_URL when the frontend is hosted separately (e.g. Vercel + Railway).

export const isMock =
  new URLSearchParams(location.search).has('mock') || import.meta.env.VITE_MOCK === '1';

export const WS_URL = import.meta.env.VITE_WS_URL || `${location.origin.replace(/^http/, 'ws')}/ws`;

/** The backend's http(s) origin, for links it sends as relative paths (photos, audio). */
const SERVER_ORIGIN = new URL(WS_URL.replace(/^ws/, 'http')).origin;

/** "/img/x.webp" from the server → "https://backend…/img/x.webp". Absolute URLs pass through. */
export function serverUrl(url: string): string {
  if (!url) return url;
  try {
    return new URL(url, SERVER_ORIGIN).href;
  } catch {
    return url;
  }
}
