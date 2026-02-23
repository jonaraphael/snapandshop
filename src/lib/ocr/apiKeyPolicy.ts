const SHARED_KEY_USAGE_STORAGE_KEY = "cl:sharedKeyUsage";
const SHARED_KEY_DAILY_LIMIT = 5;

interface SharedKeyUsage {
  date: string;
  count: number;
}

const toLocalDateStamp = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const normalizeKey = (value: string | null | undefined): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed || null;
};

export const isLikelyOpenAiApiKey = (value: string | null | undefined): boolean => {
  const normalized = normalizeKey(value);
  if (!normalized) {
    return false;
  }

  // Current OpenAI key families all begin with sk-.
  if (!normalized.startsWith("sk-")) {
    return false;
  }

  // Guard against obvious placeholders such as "-" or "sk-".
  if (normalized.length < 20) {
    return false;
  }

  return /^[A-Za-z0-9_-]+$/.test(normalized);
};

const serviceKey = (): string | null => {
  const value = normalizeKey(import.meta.env.VITE_OPENAI_API_KEY);
  return isLikelyOpenAiApiKey(value) ? value : null;
};

const readSharedUsage = (): SharedKeyUsage => {
  const today = toLocalDateStamp(new Date());
  if (typeof window === "undefined") {
    return { date: today, count: 0 };
  }

  try {
    const raw = localStorage.getItem(SHARED_KEY_USAGE_STORAGE_KEY);
    if (!raw) {
      return { date: today, count: 0 };
    }
    const parsed = JSON.parse(raw) as Partial<SharedKeyUsage>;
    if (typeof parsed.date !== "string" || typeof parsed.count !== "number") {
      return { date: today, count: 0 };
    }
    if (parsed.date !== today) {
      return { date: today, count: 0 };
    }
    return { date: parsed.date, count: Math.max(0, Math.floor(parsed.count)) };
  } catch {
    return { date: today, count: 0 };
  }
};

const writeSharedUsage = (usage: SharedKeyUsage): void => {
  if (typeof window === "undefined") {
    return;
  }
  try {
    localStorage.setItem(SHARED_KEY_USAGE_STORAGE_KEY, JSON.stringify(usage));
  } catch {
    // ignore storage failures
  }
};

export const resolveApiKeyForMagicCall = (input: {
  currentKey: string | null;
  onPersistUserKey?: (key: string) => void;
}): string => {
  const shared = serviceKey();
  const existingKey = normalizeKey(input.currentKey);
  const hasValidExistingKey = isLikelyOpenAiApiKey(existingKey);
  let activeKey = hasValidExistingKey ? existingKey : shared;

  if (!hasValidExistingKey && existingKey && shared) {
    // Repair stale invalid local keys by restoring the configured shared key.
    input.onPersistUserKey?.(shared);
  }

  if (!activeKey) {
    const promptPrefix =
      existingKey && !isLikelyOpenAiApiKey(existingKey)
        ? "The saved API key looks invalid. "
        : "";
    const pasted = window.prompt(
      `${promptPrefix}Paste your OpenAI API key (sk-...). It is saved only in this browser, never uploaded by us, and only used to read your list image.`
    );
    const trimmed = normalizeKey(pasted);
    if (!trimmed) {
      throw new Error("OpenAI API key is required to process photos.");
    }
    if (!isLikelyOpenAiApiKey(trimmed)) {
      throw new Error("That API key looks invalid. Please paste a real OpenAI key that starts with sk-.");
    }
    input.onPersistUserKey?.(trimmed);
    activeKey = trimmed;
  }

  if (!shared || activeKey !== shared) {
    return activeKey;
  }

  const usage = readSharedUsage();
  if (usage.count < SHARED_KEY_DAILY_LIMIT) {
    return activeKey;
  }

  const pasted = window.prompt(
    "You've used 5 AI photo reads today on the shared key. Paste your own OpenAI API key to continue."
  );
  const trimmed = normalizeKey(pasted);
  if (!trimmed || trimmed === shared) {
    throw new Error("Daily shared AI limit reached. Add your own OpenAI API key to continue.");
  }
  if (!isLikelyOpenAiApiKey(trimmed)) {
    throw new Error("That API key looks invalid. Please paste a real OpenAI key that starts with sk-.");
  }

  input.onPersistUserKey?.(trimmed);
  return trimmed;
};

export const recordMagicCallUsage = (apiKey: string): void => {
  const shared = serviceKey();
  if (!shared || apiKey.trim() !== shared) {
    return;
  }

  const usage = readSharedUsage();
  writeSharedUsage({
    date: usage.date,
    count: usage.count + 1
  });
};
