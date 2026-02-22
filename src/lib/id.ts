let fallbackCounter = 0;

const hex = (value: number): string => value.toString(16).padStart(2, "0");

const createUuidFromCrypto = (): string | null => {
  if (typeof globalThis === "undefined" || !globalThis.crypto) {
    return null;
  }

  if (typeof globalThis.crypto.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  if (typeof globalThis.crypto.getRandomValues !== "function") {
    return null;
  }

  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);

  // RFC 4122 version 4 bits.
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const parts = [
    Array.from(bytes.slice(0, 4)).map(hex).join(""),
    Array.from(bytes.slice(4, 6)).map(hex).join(""),
    Array.from(bytes.slice(6, 8)).map(hex).join(""),
    Array.from(bytes.slice(8, 10)).map(hex).join(""),
    Array.from(bytes.slice(10, 16)).map(hex).join("")
  ];

  return parts.join("-");
};

export const createId = (): string => {
  const cryptoUuid = createUuidFromCrypto();
  if (cryptoUuid) {
    return cryptoUuid;
  }

  fallbackCounter += 1;
  const now = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 12);
  return `cl-${now}-${rand}-${fallbackCounter.toString(36)}`;
};
