export interface DebugEntry {
  timestamp: string;
  event: string;
  details: string;
}

const DEBUG_KEY = "cl:debugLog";
const MAX_ENTRIES = 400;

let memoryEntries: DebugEntry[] = [];
let hydrated = false;
let storageUnavailable = false;

const sanitizeEntries = (input: unknown): DebugEntry[] => {
  if (!Array.isArray(input)) {
    return [];
  }

  return input.filter(
    (entry): entry is DebugEntry =>
      typeof entry?.timestamp === "string" &&
      typeof entry?.event === "string" &&
      typeof entry?.details === "string"
  );
};

const trimEntries = (entries: DebugEntry[]): DebugEntry[] => entries.slice(-MAX_ENTRIES);

const hydrateFromStorage = (): void => {
  if (hydrated || typeof window === "undefined") {
    return;
  }

  hydrated = true;

  try {
    const raw = localStorage.getItem(DEBUG_KEY);
    if (!raw) {
      memoryEntries = [];
      return;
    }

    const parsed = JSON.parse(raw);
    memoryEntries = trimEntries(sanitizeEntries(parsed));
  } catch {
    storageUnavailable = true;
    memoryEntries = [];
  }
};

const persistToStorage = (): void => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(DEBUG_KEY, JSON.stringify(trimEntries(memoryEntries)));
  } catch {
    storageUnavailable = true;
  }
};

const toDetails = (value: unknown): string => {
  if (value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const pushEntry = (entry: DebugEntry): void => {
  hydrateFromStorage();
  memoryEntries.push(entry);
  memoryEntries = trimEntries(memoryEntries);
  persistToStorage();
};

export const logDebug = (event: string, details?: unknown): void => {
  if (typeof window === "undefined") {
    return;
  }

  const entry: DebugEntry = {
    timestamp: new Date().toISOString(),
    event,
    details: toDetails(details)
  };

  pushEntry(entry);

  if (entry.details) {
    console.info(`[CL DEBUG] ${entry.event}`, entry.details);
  } else {
    console.info(`[CL DEBUG] ${entry.event}`);
  }
};

export const clearDebugLog = (): void => {
  if (typeof window === "undefined") {
    return;
  }

  hydrated = true;
  memoryEntries = [];

  try {
    localStorage.removeItem(DEBUG_KEY);
  } catch {
    storageUnavailable = true;
  }
};

export const getDebugEntries = (): DebugEntry[] => {
  if (typeof window === "undefined") {
    return [];
  }

  hydrateFromStorage();
  return [...memoryEntries];
};

export const getDebugText = (): string => {
  const entries = getDebugEntries();
  if (!entries.length) {
    return storageUnavailable
      ? "No debug logs yet. Storage unavailable; logs only exist during active session. Reproduce issue and tap Refresh again."
      : "No debug logs yet.";
  }

  return entries
    .map((entry) => {
      const suffix = entry.details ? ` ${entry.details}` : "";
      return `${entry.timestamp} ${entry.event}${suffix}`;
    })
    .join("\n");
};

const toReason = (value: unknown): string => {
  if (value instanceof Error) {
    return `${value.name}: ${value.message}${value.stack ? `\n${value.stack}` : ""}`;
  }
  return toDetails(value);
};

export const installDebugHooks = (): void => {
  if (typeof window === "undefined") {
    return;
  }

  if (window.__clDebugInstalled) {
    return;
  }

  hydrateFromStorage();
  window.__clDebugInstalled = true;

  window.__clDebug = {
    getText: getDebugText,
    getEntries: getDebugEntries,
    clear: clearDebugLog
  };

  logDebug("app_boot", {
    url: window.location.href,
    userAgent: navigator.userAgent,
    storageUnavailable
  });

  window.addEventListener("error", (event) => {
    logDebug("window_error", {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error instanceof Error ? event.error.stack : undefined
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    logDebug("unhandled_rejection", {
      reason: toReason(event.reason)
    });
  });
};
