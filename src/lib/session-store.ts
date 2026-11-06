/**
 * Browser-side storage for the signed-in session token.
 *
 * The token is issued by the server (see session.server.ts) after the
 * credentials have been verified there. It is what lets the protected
 * write functions (news, group info, profile-edit requests) know who is
 * asking. It is never used to decide *what* the caller may do — the server
 * re-checks the user's role on every call.
 */

const TOKEN_KEY = "sms_session_token";

export function getSessionToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setSessionToken(token: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* storage unavailable — writes will require sign-in */
  }
}

export function clearSessionToken(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}
