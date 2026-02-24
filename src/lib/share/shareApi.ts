import type { Session } from "../../app/types";
import { SHARE_QUERY_PARAM, encodeSharedListState } from "./urlListState";

export const SHARE_ID_QUERY_PARAM = "s";

const DEFAULT_SHARE_PROXY_PATH = "/api/share";
const SHARE_ID_PATTERN = /^[A-Za-z0-9_-]{16,64}$/;

interface ShareCreateResponse {
  id?: unknown;
}

interface ShareFetchResponse {
  token?: unknown;
}

const trimTrailingSlashes = (value: string): string => value.replace(/\/+$/g, "");

const normalizeShareProxyUrl = (value: string): string => {
  const trimmed = trimTrailingSlashes(value.trim());
  if (!trimmed) {
    return "";
  }
  // Accept accidentally configured vision endpoints and coerce them to share endpoint.
  return trimmed.replace(/\/api\/vision-parse$/i, "/api/share");
};

const resolveShareProxyUrl = (): string => {
  const configured = normalizeShareProxyUrl(import.meta.env.VITE_SHARE_PROXY_URL ?? "");
  if (configured) {
    return configured;
  }

  const visionProxy = normalizeShareProxyUrl(import.meta.env.VITE_VISION_PROXY_URL ?? "");
  if (visionProxy) {
    return visionProxy;
  }

  return DEFAULT_SHARE_PROXY_PATH;
};

const normalizeShareId = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!SHARE_ID_PATTERN.test(trimmed)) {
    return null;
  }
  return trimmed;
};

const readTextBody = async (response: Response): Promise<string> => {
  try {
    return (await response.text()).trim();
  } catch {
    return "";
  }
};

const parseJsonBody = async <T>(response: Response): Promise<T | null> => {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
};

const toShareLookupUrl = (shareId: string): string => {
  return `${resolveShareProxyUrl()}/${encodeURIComponent(shareId)}`;
};

export const buildShareUrlForId = (shareId: string, currentHref: string): string => {
  const normalizedShareId = normalizeShareId(shareId);
  if (!normalizedShareId) {
    throw new Error("Invalid share ID.");
  }

  const url = new URL(currentHref);
  url.searchParams.set(SHARE_ID_QUERY_PARAM, normalizedShareId);
  url.searchParams.delete(SHARE_QUERY_PARAM);
  return url.toString();
};

export const buildLegacyShareUrl = (token: string, currentHref: string): string => {
  const cleanedToken = token.trim();
  if (!cleanedToken) {
    throw new Error("Invalid share token.");
  }

  const url = new URL(currentHref);
  url.searchParams.set(SHARE_QUERY_PARAM, cleanedToken);
  url.searchParams.delete(SHARE_ID_QUERY_PARAM);
  return url.toString();
};

export const createServerShareId = async (session: Session | null): Promise<string> => {
  const token = encodeSharedListState(session);
  if (!token) {
    throw new Error("No list to share yet.");
  }

  const response = await fetch(resolveShareProxyUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({ token })
  });

  if (!response.ok) {
    const body = await readTextBody(response);
    throw new Error(`Share request failed: ${response.status} ${body || response.statusText}`);
  }

  const payload = await parseJsonBody<ShareCreateResponse>(response);
  const id = normalizeShareId(payload?.id);
  if (!id) {
    throw new Error("Share service returned an invalid ID.");
  }
  return id;
};

export const createServerShareUrl = async (
  session: Session | null,
  currentHref: string
): Promise<string> => {
  const id = await createServerShareId(session);
  return buildShareUrlForId(id, currentHref);
};

export const fetchSharedTokenById = async (
  shareId: string,
  signal?: AbortSignal
): Promise<string> => {
  const normalizedShareId = normalizeShareId(shareId);
  if (!normalizedShareId) {
    throw new Error("Invalid share ID.");
  }

  const response = await fetch(toShareLookupUrl(normalizedShareId), {
    method: "GET",
    signal,
    headers: {
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    const body = await readTextBody(response);
    throw new Error(`Share lookup failed: ${response.status} ${body || response.statusText}`);
  }

  const payload = await parseJsonBody<ShareFetchResponse>(response);
  if (typeof payload?.token !== "string" || !payload.token.trim()) {
    throw new Error("Share service returned an invalid token.");
  }
  return payload.token.trim();
};
