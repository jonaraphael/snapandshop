const NUMERIC_TOKEN_PATTERN = /\d+\s+\d+\/\d+|\d+\/\d+|\d*\.?\d+/g;

const parseFraction = (value: string): number | null => {
  const [leftRaw, rightRaw] = value.split("/");
  const left = Number(leftRaw);
  const right = Number(rightRaw);
  if (!Number.isFinite(left) || !Number.isFinite(right) || right === 0) {
    return null;
  }
  return left / right;
};

const parseNumericToken = (token: string): number | null => {
  if (token.includes(" ") && token.includes("/")) {
    const [wholeRaw, fractionRaw] = token.trim().split(/\s+/, 2);
    const whole = Number(wholeRaw);
    const fraction = parseFraction(fractionRaw ?? "");
    if (!Number.isFinite(whole) || fraction === null) {
      return null;
    }
    return whole + fraction;
  }

  if (token.includes("/")) {
    return parseFraction(token);
  }

  const number = Number(token);
  return Number.isFinite(number) ? number : null;
};

const formatScaledNumber = (value: number): string => {
  if (!Number.isFinite(value)) {
    return "0";
  }

  const rounded = Math.round(value * 100) / 100;
  const nearestInteger = Math.round(rounded);
  if (Math.abs(rounded - nearestInteger) < 0.000001) {
    return String(nearestInteger);
  }
  return rounded.toFixed(2).replace(/\.?0+$/g, "");
};

export const scaleQuantityString = (quantity: string | null, multiplier: number): string | null => {
  if (typeof quantity !== "string") {
    return quantity;
  }
  const trimmed = quantity.trim();
  if (!trimmed) {
    return quantity;
  }
  if (!Number.isFinite(multiplier) || multiplier <= 0) {
    return quantity;
  }

  let replaced = false;
  const scaled = trimmed.replace(NUMERIC_TOKEN_PATTERN, (token) => {
    const numeric = parseNumericToken(token);
    if (numeric === null) {
      return token;
    }
    replaced = true;
    return formatScaledNumber(numeric * multiplier);
  });

  return replaced ? scaled : quantity;
};
