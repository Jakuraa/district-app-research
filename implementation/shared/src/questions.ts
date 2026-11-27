import type { BookingQuestion } from "./types.ts";

export type AttendeeAnswersMap = Record<string, string | number | boolean | string[]>;

export function validateAttendeeQuestionAnswers(
  questions: readonly BookingQuestion[],
  rawAnswers: AttendeeAnswersMap | undefined | null,
  attendeeLabel: string = "Attendee"
): { valid: boolean; sanitized: AttendeeAnswersMap; errors: string[] } {
  const answers = rawAnswers ?? {};
  const sanitized: AttendeeAnswersMap = {};
  const errors: string[] = [];

  for (const q of questions) {
    const val = answers[q.id];
    const isEmpty =
      val === undefined ||
      val === null ||
      (typeof val === "string" && val.trim().length === 0) ||
      (Array.isArray(val) && val.length === 0);

    if (q.required) {
      if (q.fieldType === "CHECKBOX" && val !== true) {
        errors.push(`${attendeeLabel}: "${q.label}" must be checked.`);
        continue;
      }
      if (isEmpty) {
        errors.push(`${attendeeLabel}: "${q.label}" is required.`);
        continue;
      }
    }

    if (isEmpty) continue;

    switch (q.fieldType) {
      case "SHORT_TEXT": {
        const s = String(val).trim();
        if (s.length > 200) {
          errors.push(`${attendeeLabel}: "${q.label}" exceeds 200 characters.`);
        } else {
          sanitized[q.id] = s;
        }
        break;
      }
      case "LONG_TEXT": {
        const s = String(val).trim();
        if (s.length > 1000) {
          errors.push(`${attendeeLabel}: "${q.label}" exceeds 1000 characters.`);
        } else {
          sanitized[q.id] = s;
        }
        break;
      }
      case "NUMBER": {
        const num = typeof val === "number" ? val : Number(String(val).trim());
        if (!Number.isFinite(num)) {
          errors.push(`${attendeeLabel}: "${q.label}" must be a valid number.`);
        } else {
          sanitized[q.id] = num;
        }
        break;
      }
      case "DROPDOWN": {
        const s = String(val).trim();
        if (q.options.length > 0 && !q.options.includes(s)) {
          errors.push(`${attendeeLabel}: "${q.label}" has an invalid selection.`);
        } else {
          sanitized[q.id] = s;
        }
        break;
      }
      case "MULTI_CHOICE": {
        const arr = Array.isArray(val) ? val.map((x) => String(x).trim()).filter(Boolean) : [String(val).trim()];
        const invalid = q.options.length > 0 ? arr.filter((item) => !q.options.includes(item)) : [];
        if (invalid.length > 0) {
          errors.push(`${attendeeLabel}: "${q.label}" contains invalid option(s).`);
        } else {
          sanitized[q.id] = arr;
        }
        break;
      }
      case "CHECKBOX": {
        if (typeof val !== "boolean") {
          errors.push(`${attendeeLabel}: "${q.label}" must be true or false.`);
        } else {
          sanitized[q.id] = val;
        }
        break;
      }
    }
  }

  return { valid: errors.length === 0, sanitized, errors };
}

export interface ParsedCsvGuestRow {
  lineNumber: number;
  fullName: string;
  email: string;
  phone: string | null;
  tierHint: string | null;
  guestTypeHint: "WALK_IN_CASH" | "VIP" | "COMPLIMENTARY" | null;
}

export function parseCsvGuestRows(csvText: string): {
  rows: ParsedCsvGuestRow[];
  errors: { lineNumber: number; message: string }[];
} {
  const lines = csvText
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return { rows: [], errors: [{ lineNumber: 1, message: "CSV input is empty." }] };
  }

  const splitLine = (line: string): string[] => {
    const out: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === "," && !inQuotes) {
        out.push(cur.trim());
        cur = "";
      } else {
        cur += ch;
      }
    }
    out.push(cur.trim());
    return out;
  };

  const firstCols = splitLine(lines[0]).map((c) => c.toLowerCase());
  const hasHeader =
    firstCols.some((c) => c.includes("name") || c.includes("email")) &&
    !firstCols.some((c) => c.includes("@"));

  let nameIdx = 0;
  let emailIdx = 1;
  let phoneIdx = 2;
  let tierIdx = 3;
  let typeIdx = 4;

  if (hasHeader) {
    nameIdx = firstCols.findIndex((c) => c.includes("name"));
    emailIdx = firstCols.findIndex((c) => c.includes("email"));
    phoneIdx = firstCols.findIndex((c) => c.includes("phone") || c.includes("mobile"));
    tierIdx = firstCols.findIndex((c) => c.includes("tier") || c.includes("pass"));
    typeIdx = firstCols.findIndex((c) => c.includes("type") || c.includes("source"));
    if (nameIdx === -1 || emailIdx === -1) {
      return {
        rows: [],
        errors: [{ lineNumber: 1, message: "CSV header must include name and email columns." }]
      };
    }
  }

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const rows: ParsedCsvGuestRow[] = [];
  const errors: { lineNumber: number; message: string }[] = [];

  for (let i = hasHeader ? 1 : 0; i < lines.length; i++) {
    const lineNumber = i + 1;
    const cols = splitLine(lines[i]);
    const fullName = (cols[nameIdx] ?? "").trim();
    const email = (cols[emailIdx] ?? "").trim().toLowerCase();
    const phone = phoneIdx >= 0 ? (cols[phoneIdx] ?? "").trim() || null : null;
    const tierHint = tierIdx >= 0 ? (cols[tierIdx] ?? "").trim() || null : null;
    const rawType = typeIdx >= 0 ? (cols[typeIdx] ?? "").trim().toUpperCase() : "";

    if (fullName.length < 2) {
      errors.push({ lineNumber, message: `Invalid or missing name on line ${lineNumber}.` });
      continue;
    }
    if (!emailRe.test(email)) {
      errors.push({ lineNumber, message: `Invalid email "${email || "(empty)"}" on line ${lineNumber}.` });
      continue;
    }

    let guestTypeHint: ParsedCsvGuestRow["guestTypeHint"] = null;
    if (rawType === "VIP") guestTypeHint = "VIP";
    else if (rawType === "CASH" || rawType === "WALK_IN_CASH" || rawType === "WALKIN") guestTypeHint = "WALK_IN_CASH";
    else if (rawType === "COMP" || rawType === "COMPLIMENTARY") guestTypeHint = "COMPLIMENTARY";

    rows.push({ lineNumber, fullName, email, phone, tierHint, guestTypeHint });
  }

  return { rows, errors };
}
