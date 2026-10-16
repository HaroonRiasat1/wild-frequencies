/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional TURN relay for party mode on strict networks: comma-separated turn:/turns: URLs. */
  readonly VITE_TURN_URLS?: string;
  readonly VITE_TURN_USERNAME?: string;
  readonly VITE_TURN_CREDENTIAL?: string;
}
