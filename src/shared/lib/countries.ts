export function countryFlag(code: string) {
  const normalized = code.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalized)) return "";
  return Array.from(normalized)
    .map((letter) => String.fromCodePoint(127397 + letter.charCodeAt(0)))
    .join("");
}
