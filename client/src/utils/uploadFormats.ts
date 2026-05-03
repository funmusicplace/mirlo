/**
 * Turn an HTML `<input type="file" accept="…">` string into a short,
 * human-readable list of formats to surface as helper text on upload UIs.
 *
 *   audio/flac,audio/wav,audio/x-wav,audio/x-flac    → "FLAC, WAV"
 *   image/jpeg,image/png                             → "JPEG, PNG"
 *   image/*                                          → "Images"
 *   application/pdf,image/*                          → "PDF, Images"
 *   .csv,.xlsx,.xls                                  → "CSV, XLSX, XLS"
 *
 * Returns an empty string when `accept` is missing/empty so callers can
 * conditionally render.
 */
export const formatAcceptList = (accept?: string): string => {
  if (!accept) return "";

  const seen = new Set<string>();
  const out: string[] = [];

  const push = (label: string) => {
    if (!label) return;
    const key = label.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(label);
  };

  for (const raw of accept.split(",")) {
    const token = raw.trim().toLowerCase();
    if (!token) continue;

    // Bare extension: ".csv" → "CSV"
    if (token.startsWith(".")) {
      push(token.slice(1).toUpperCase());
      continue;
    }

    // Wildcard groups: "image/*" → "Images" / "audio/*" → "Audio".
    if (token.endsWith("/*")) {
      const group = token.slice(0, -2);
      if (group === "image") push("Images");
      else if (group === "audio") push("Audio");
      else if (group === "video") push("Video");
      else push(group.charAt(0).toUpperCase() + group.slice(1));
      continue;
    }

    // Specific MIME: "image/jpeg" → "JPEG", "audio/x-m4a" → "M4A",
    // "application/pdf" → "PDF". Strip any "x-" prefix vendor noise.
    const slash = token.indexOf("/");
    if (slash === -1) {
      push(token.toUpperCase());
      continue;
    }
    let subtype = token.slice(slash + 1);
    if (subtype.startsWith("x-")) subtype = subtype.slice(2);
    if (subtype === "mpeg") subtype = "mp3";
    push(subtype.toUpperCase());
  }

  return out.join(", ");
};
