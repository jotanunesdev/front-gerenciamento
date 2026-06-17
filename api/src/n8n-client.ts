import { env } from "./config.js";

export interface N8nConfig {
  baseUrl: string;
  apiKey: string;
}

export class N8nError extends Error {}

export const n8nFetch = async <T>(
  config: N8nConfig,
  path: string,
  init?: RequestInit,
): Promise<T> => {
  const base = config.baseUrl.replace(/\/+$/, "");
  const res = await fetch(`${base}/api/v1${path}`, {
    ...init,
    headers: {
      "X-N8N-API-KEY": config.apiKey,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    signal: AbortSignal.timeout(env.N8N_DEFAULT_TIMEOUT_MS),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new N8nError(`Erro do n8n (${res.status})${detail ? `: ${detail}` : ""}`);
  }

  return (await res.json()) as T;
};
