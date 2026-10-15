/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** `simulated` (labelled bundled source) or `backend` (real ProofOps API). */
  readonly VITE_DATA_SOURCE?: string;
  /** Base URL of the real ProofOps API, used only in `backend` mode. */
  readonly VITE_API_BASE_URL?: string;
  /** Display label for the simulated authoritative source. */
  readonly VITE_AUTHORITATIVE_SOURCE_LABEL?: string;
  /** Environment name shown in the interface. */
  readonly VITE_APP_ENV?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
