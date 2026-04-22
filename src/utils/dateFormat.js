export function formatDateBR(value) {
  if (!value) return "";
  const datePart = String(value).split("T")[0];
  const parts = datePart.split("-");
  if (parts.length !== 3) return "";
  const [y, m, d] = parts;
  if (!y || !m || !d) return "";
  return `${d}/${m}/${y}`;
}

export function toDateInputValue(value) {
  if (!value) return "";
  return String(value).split("T")[0];
}
