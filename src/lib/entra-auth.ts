import { sessionApi } from "@/lib/api";

const AUTH_STATE_KEY = "flowcontrol_entra_state";
const AUTH_VERIFIER_KEY = "flowcontrol_entra_code_verifier";
const AUTH_REDIRECT_KEY = "flowcontrol_entra_redirect_uri";

const readSessionStorage = (key: string) => {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeSessionStorage = (key: string, value: string) => {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(key, value);
};

const removeSessionStorage = (...keys: string[]) => {
  if (typeof window === "undefined") return;
  for (const key of keys) {
    window.sessionStorage.removeItem(key);
  }
};

const base64UrlEncode = (bytes: Uint8Array) => {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const randomBytes = (length: number) => {
  const bytes = new Uint8Array(length);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
    return bytes;
  }

  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Math.floor(Math.random() * 256);
  }

  return bytes;
};

const createCodeVerifier = () => base64UrlEncode(randomBytes(32));
const createState = () => base64UrlEncode(randomBytes(24));

const createCodeChallenge = async (codeVerifier: string) => {
  if (!globalThis.crypto?.subtle) {
    throw new Error("Navegador sem suporte a PKCE para autenticacao Microsoft.");
  }

  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(codeVerifier),
  );
  return base64UrlEncode(new Uint8Array(digest));
};

export const getMicrosoftRedirectUri = () => {
  const configured = String(import.meta.env.VITE_ENTRA_REDIRECT_URI ?? "").trim();
  if (configured) {
    const normalized = configured.replace(/\/$/, "");
    if (typeof window === "undefined") return normalized;

    try {
      const configuredUrl = new URL(normalized);
      const currentUrl = new URL(window.location.origin);
      const localhostHosts = new Set(["localhost", "127.0.0.1"]);
      const isConfiguredLocal = localhostHosts.has(configuredUrl.hostname);
      const isCurrentLocal = localhostHosts.has(currentUrl.hostname);

      if (isConfiguredLocal && isCurrentLocal && configuredUrl.origin !== currentUrl.origin) {
        const pathName = configuredUrl.pathname.replace(/\/$/, "");
        return `${window.location.origin}${pathName}`;
      }
    } catch {
      return normalized;
    }

    return normalized;
  }

  if (typeof window === "undefined") return "";
  return window.location.origin;
};

const cleanupMicrosoftCallbackUrl = () => {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.delete("code");
  url.searchParams.delete("state");
  url.searchParams.delete("session_state");
  url.searchParams.delete("error");
  url.searchParams.delete("error_description");
  window.history.replaceState(window.history.state, document.title, url.toString());
};

export const hasMicrosoftCallbackParams = () => {
  if (typeof window === "undefined") return false;
  const url = new URL(window.location.href);
  return url.searchParams.has("code") || url.searchParams.has("error");
};

export const beginMicrosoftAuthentication = async () => {
  const redirectUri = getMicrosoftRedirectUri();
  const state = createState();
  const codeVerifier = createCodeVerifier();
  const codeChallenge = await createCodeChallenge(codeVerifier);

  writeSessionStorage(AUTH_STATE_KEY, state);
  writeSessionStorage(AUTH_VERIFIER_KEY, codeVerifier);
  writeSessionStorage(AUTH_REDIRECT_KEY, redirectUri);

  const response = await sessionApi.getAuthorizeUrl({
    redirectUri,
    state,
    codeChallenge,
    codeChallengeMethod: "S256",
    prompt: "select_account",
  });

  if (!response.authorizationUrl) {
    throw new Error("API nao retornou URL de autenticacao Microsoft.");
  }

  window.location.assign(response.authorizationUrl);
};

export const completeMicrosoftAuthenticationFromRedirect = async () => {
  if (typeof window === "undefined") return false;

  const url = new URL(window.location.href);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (!code && !error) return false;

  try {
    if (error) {
      throw new Error(
        url.searchParams.get("error_description") ?? "Autenticacao Microsoft cancelada.",
      );
    }

    const expectedState = readSessionStorage(AUTH_STATE_KEY);
    const state = url.searchParams.get("state");
    const codeVerifier = readSessionStorage(AUTH_VERIFIER_KEY);
    const redirectUri = readSessionStorage(AUTH_REDIRECT_KEY) ?? getMicrosoftRedirectUri();

    if (!expectedState || state !== expectedState) {
      throw new Error("Estado da autenticacao Microsoft expirou. Inicie novamente.");
    }

    if (!codeVerifier) {
      throw new Error("Sessao PKCE da autenticacao Microsoft expirou. Inicie novamente.");
    }

    await sessionApi.exchangeAuthorizationCode({
      code: code ?? "",
      redirectUri,
      codeVerifier,
    });

    return true;
  } finally {
    cleanupMicrosoftCallbackUrl();
    removeSessionStorage(AUTH_STATE_KEY, AUTH_VERIFIER_KEY, AUTH_REDIRECT_KEY);
  }
};
