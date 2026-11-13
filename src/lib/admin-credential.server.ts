/** Constant-work comparison without returning credential details to callers. */
export async function matchesAdminCredential(candidate: string, configured: string | undefined): Promise<boolean> {
  if (!configured || configured.length < 12) return false;
  const encode = new TextEncoder();
  const [a, b] = await Promise.all([candidate, configured].map(value => crypto.subtle.digest("SHA-256", encode.encode(value))));
  const left = new Uint8Array(a);
  const right = new Uint8Array(b);
  let difference = 0;
  for (let i = 0; i < left.length; i++) difference |= left[i] ^ right[i];
  return difference === 0;
}