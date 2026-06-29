/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FACILITY_DATA_PROVIDER?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
