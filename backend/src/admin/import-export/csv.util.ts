// Lightweight RFC 4180-compatible parser for the flat product CSV used by admin import/export.
// It supports quoted commas, escaped quotes, CRLF, and quoted newlines without adding a dependency.
export function toCsv(rows: Record<string, string | number>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (value: string | number) => {
    const str = String(value);
    return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };
  const lines = [headers.join(","), ...rows.map((row) => headers.map((h) => escape(row[h] ?? "")).join(","))];
  return lines.join("\n");
}

export function fromCsv(csv: string): Record<string, string>[] {
  const normalized = csv.replace(/^\\uFEFF/, "").trim();
  if (!normalized) return [];

  const records: string[][] = [];
  let record: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < normalized.length; i += 1) {
    const char = normalized[i];
    const next = normalized[i + 1];

    if (quoted) {
      if (char === '"' && next === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      record.push(field.trim());
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && next === "\n") i += 1;
      record.push(field.trim());
      field = "";
      if (record.some((value) => value !== "")) records.push(record);
      record = [];
    } else {
      field += char;
    }
  }

  if (quoted) throw new Error("Invalid CSV: an opening quote is not closed.");
  record.push(field.trim());
  if (record.some((value) => value !== "")) records.push(record);
  if (records.length < 2) return [];

  const headers = records[0].map((header) => header.trim());
  if (headers.some((header) => !header)) throw new Error("Invalid CSV: headers cannot be empty.");
  if (new Set(headers).size !== headers.length) throw new Error("Invalid CSV: duplicate headers are not allowed.");

  return records.slice(1).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
}
