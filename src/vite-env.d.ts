/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />

interface ImportMetaEnv {
  /** Override the iTunes API origin — only needed if Apple drops its CORS header. */
  readonly VITE_ITUNES_BASE?: string
  /** Spotify app Client ID. Public by design (PKCE flow ships it to the browser). */
  readonly VITE_SPOTIFY_CLIENT_ID?: string
  /** Apple MusicKit developer token. Also public — it is served to every visitor. */
  readonly VITE_APPLE_DEV_TOKEN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
