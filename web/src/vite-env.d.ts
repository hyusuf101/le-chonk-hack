/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Full WebSocket URL of the backend, e.g. wss://vybe-server.up.railway.app/ws. Unset = same origin /ws. */
  readonly VITE_WS_URL?: string;
  /** "1" forces the in-browser mock server. */
  readonly VITE_MOCK?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
