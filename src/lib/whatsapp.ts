/**
 * Format an Egyptian phone number for use with the WhatsApp click-to-chat API.
 * Returns a digit-only string prefixed with the Egyptian country code "20",
 * e.g. "01270777232" -> "201270777232".
 * Returns an empty string when no digits are present.
 */
export function formatEgyptWhatsApp(raw: string | null | undefined): string {
  if (!raw) return "";
  let d = String(raw).replace(/\D/g, "");
  if (!d) return "";
  // Strip an existing country code if present
  if (d.startsWith("0020")) d = d.slice(4);
  else if (d.startsWith("20") && d.length > 10) d = d.slice(2);
  // Strip leading zero of local prefix (01x...)
  if (d.startsWith("0")) d = d.replace(/^0+/, "");
  return "20" + d;
}

/** Build a https://wa.me link with a URL-encoded message. */
export function buildWhatsAppLink(rawPhone: string | null | undefined, message: string): string {
  const phone = formatEgyptWhatsApp(rawPhone);
  if (!phone) return "";
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
