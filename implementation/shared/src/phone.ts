export interface CountryDialCode {
  code: string;
  country: string;
  label: string;
  flag: string;
  minDigits: number;
  maxDigits: number;
}

export const COUNTRY_DIAL_CODES: readonly CountryDialCode[] = [
  { code: "+91", country: "IN", label: "India (+91)", flag: "IN", minDigits: 10, maxDigits: 10 },
  { code: "+1", country: "US", label: "United States (+1)", flag: "US", minDigits: 10, maxDigits: 10 },
  { code: "+44", country: "GB", label: "United Kingdom (+44)", flag: "GB", minDigits: 10, maxDigits: 10 },
  { code: "+971", country: "AE", label: "UAE (+971)", flag: "AE", minDigits: 9, maxDigits: 9 },
  { code: "+65", country: "SG", label: "Singapore (+65)", flag: "SG", minDigits: 8, maxDigits: 8 },
  { code: "+61", country: "AU", label: "Australia (+61)", flag: "AU", minDigits: 9, maxDigits: 9 }
] as const;

export const DEFAULT_COUNTRY_CODE = "+91";

/**
 * Normalizes a user-entered phone number into strict E.164 format (e.g. +919876500001).
 * Rejects malformed, short, or non-numeric inputs.
 */
export function normalizePhoneNumber(
  rawPhone: string,
  defaultCountryCode: string = DEFAULT_COUNTRY_CODE
): string {
  const trimmed = rawPhone.trim();
  if (!trimmed) {
    throw new Error("Phone number is required.");
  }

  let cleaned = trimmed.replace(/[\s().-]+/g, "");
  if (cleaned.startsWith("00")) {
    cleaned = `+${cleaned.slice(2)}`;
  }

  if (cleaned.startsWith("+")) {
    if (!/^\+[1-9]\d{7,14}$/.test(cleaned)) {
      throw new Error("Enter a valid international phone number.");
    }
    if (cleaned.startsWith("+91") && !/^\+91[1-9]\d{9}$/.test(cleaned)) {
      throw new Error("Enter a valid 10-digit Indian mobile number.");
    }
    return cleaned;
  }

  if (!/^\d+$/.test(cleaned)) {
    throw new Error("Phone number must contain only digits.");
  }

  const dial = defaultCountryCode.startsWith("+") ? defaultCountryCode : `+${defaultCountryCode}`;
  const dialDigits = dial.slice(1);

  if (dial === "+91") {
    if (cleaned.length === 11 && cleaned.startsWith("0")) {
      cleaned = cleaned.slice(1);
    } else if (cleaned.length === 12 && cleaned.startsWith("91")) {
      cleaned = cleaned.slice(2);
    }
    if (!/^[1-9]\d{9}$/.test(cleaned)) {
      throw new Error("Enter a valid 10-digit Indian mobile number.");
    }
    return `+91${cleaned}`;
  }

  if (cleaned.startsWith("0")) {
    cleaned = cleaned.slice(1);
  }
  if (cleaned.startsWith(dialDigits) && cleaned.length >= dialDigits.length + 7) {
    const e164 = `+${cleaned}`;
    if (!/^\+[1-9]\d{7,14}$/.test(e164)) {
      throw new Error("Enter a valid phone number.");
    }
    return e164;
  }

  const e164 = `${dial}${cleaned}`;
  if (!/^\+[1-9]\d{7,14}$/.test(e164)) {
    throw new Error("Enter a valid phone number.");
  }
  return e164;
}

export function maskPhoneNumber(e164Phone: string): string {
  const clean = e164Phone.trim();
  if (clean.length <= 6) return clean;
  const prefix = clean.slice(0, 3);
  const suffix = clean.slice(-4);
  return `${prefix} ••••• ${suffix}`;
}
