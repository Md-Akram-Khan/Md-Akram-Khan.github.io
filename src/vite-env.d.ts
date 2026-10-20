/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL of the AI chat Worker (see worker/README.md). Empty: built-in answers only. */
  readonly VITE_CHAT_ENDPOINT?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
