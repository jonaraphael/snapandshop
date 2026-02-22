/// <reference types="vite/client" />

declare module "virtual:pwa-register" {
  export function registerSW(options?: { immediate?: boolean }): () => void;
}

interface ImportMetaEnv {
  readonly VITE_OPENAI_MODEL?: string;
  readonly VITE_OPENAI_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  __clDebugInstalled?: boolean;
  __clDebug?: {
    getText: () => string;
    getEntries: () => Array<{ timestamp: string; event: string; details: string }>;
    clear: () => void;
  };
}
