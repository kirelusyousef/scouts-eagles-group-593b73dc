/**
 * Server-only session helpers.
 *
 * The app signs people in against its own `Users` table, so a browser
 * "signed in" flag proves nothing on its own. These helpers mint an
 * HMAC-signed token on the server once the password has been checked
 * there, and verify it again on every protected write. The token is
 * useless without the secret, which never leaves the server.
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/** How long a signed-in session stays valid before a re-login is needed. */
const SESSION_DAYS = 14;

/** Mirrors the app's built-in master admin account (already in the client bundle). */
export const MASTER_EMAIL = "admin@admin.com";
export const MASTER_ID = "MASTER-ADMIN";
export const MASTER_PASSWORD = "admin123123";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function bytesToB64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64UrlToBytes(text: string): Uint8Array {
  const base64 = text.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

async function signingKey(): Promise<CryptoKey> {
  const secret = process.env["SESSION_SECRET"];
  if (!secret) throw new Error("SESSION_SECRET is not configured on the server");
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

/** Mint a signed session token for a verified user id. */
export async function issueSessionToken(userId: string): Promise<string> {
  const payload = { u: userId, e: Date.now() + SESSION_DAYS * 86_400_000 };
  const body = bytesToB64Url(encoder.encode(JSON.stringify(payload)));
  const sig = bytesToB64Url(
    new Uint8Array(await crypto.subtle.sign("HMAC", await signingKey(), encoder.encode(body))),
  );
  return `${body}.${sig}`;
}

/** Verify signature + expiry. Returns null for missing, forged or stale tokens. */
export async function verifySessionToken(token: unknown): Promise<{ userId: string } | null> {
  if (typeof token !== "string") return null;
  const dot = token.indexOf(".");
  if (dot < 1) return null;
  const body = token.slice(0, dot);
  const given = token.slice(dot + 1);

  const expected = bytesToB64Url(
    new Uint8Array(await crypto.subtle.sign("HMAC", await signingKey(), encoder.encode(body))),
  );
  if (expected.length !== given.length) return null;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ given.charCodeAt(i);
  if (diff !== 0) return null;

  try {
    const parsed = JSON.parse(decoder.decode(b64UrlToBytes(body)));
    if (typeof parsed?.u !== "string" || typeof parsed?.e !== "number") return null;
    if (Date.now() > parsed.e) return null;
    return { userId: parsed.u };
  } catch {
    return null;
  }
}

/**
 * Publishable-key client for server-side reads of rows that are already
 * publicly readable (the login lookup). Never used for writes.
 */
export function readClient() {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"] || process.env["SUPABASE_ANON_KEY"];
  if (!url || !key) throw new Error("Supabase server environment is not configured");
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input: RequestInfo | URL, init?: RequestInit) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

export type SessionUser = {
  ID: string;
  Email?: string | null;
  Password?: string | null;
  Role?: string | null;
  Rank?: string | null;
  Leader_Rank_ID?: string | null;
  Status?: string | null;
  [key: string]: unknown;
};

/** Load the user row a token belongs to (master admin has no required row). */
export async function loadUser(userId: string): Promise<SessionUser | null> {
  if (userId === MASTER_ID) {
    return { ID: MASTER_ID, Email: MASTER_EMAIL, Role: "Leader", Rank: "قائد عام" };
  }
  const { data } = await readClient().from("Users").select("*").eq("ID", userId).maybeSingle();
  return (data as SessionUser) ?? null;
}

/** Same rules the app already uses in db.ts, re-checked on the server. */
export const isLeaderRow = (u: SessionUser | null): boolean =>
  !!u && (u.Role === "Leader" || (u.Email || "").toLowerCase() === MASTER_EMAIL);

export const isGeneralLeaderRow = (u: SessionUser | null): boolean =>
  !!u &&
  ((u.Email || "").toLowerCase() === MASTER_EMAIL ||
    /قائد\s*عام/.test(String(u.Rank || "")) ||
    /قائد\s*عام/.test(String(u.Leader_Rank_ID || "")));
