import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type SupabaseOAuth = {
  getAuthorizationDetails: (id: string) => Promise<{
    data: { client?: { name?: string }; redirect_url?: string; redirect_to?: string } | null;
    error: { message: string } | null;
  }>;
  approveAuthorization: (id: string) => Promise<{
    data: { redirect_url?: string; redirect_to?: string } | null;
    error: { message: string } | null;
  }>;
  denyAuthorization: (id: string) => Promise<{
    data: { redirect_url?: string; redirect_to?: string } | null;
    error: { message: string } | null;
  }>;
};

function oauthClient(): SupabaseOAuth {
  return (supabase.auth as unknown as { oauth: SupabaseOAuth }).oauth;
}

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      const next = location.pathname + location.searchStr;
      throw redirect({ to: "/login", search: { next } as never });
    }
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauthClient().getAuthorizationDetails(authorizationId);
    if (error) throw new Error(error.message);
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate } as never);
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="p-6 text-center">
      تعذّر تحميل طلب التفويض: {String((error as Error)?.message ?? error)}
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(approve: boolean) {
    setBusy(true);
    const { data, error } = approve
      ? await oauthClient().approveAuthorization(authorization_id)
      : await oauthClient().denyAuthorization(authorization_id);
    if (error) { setBusy(false); setError(error.message); return; }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) { setBusy(false); setError("لم يُرجع خادم التفويض عنوان تحويل."); return; }
    window.location.href = target;
  }

  const clientName = details?.client?.name ?? "تطبيق خارجي";

  return (
    <main dir="rtl" className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-xl space-y-4">
        <h1 className="text-2xl font-bold">ربط {clientName} بحسابك</h1>
        <p className="text-sm text-muted-foreground">
          سيتمكن {clientName} من استخدام أدوات هذا التطبيق نيابةً عنك.
        </p>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-2">
          <button
            disabled={busy}
            onClick={() => decide(false)}
            className="flex-1 rounded-lg bg-secondary py-2.5 text-sm font-medium disabled:opacity-50"
          >
            رفض
          </button>
          <button
            disabled={busy}
            onClick={() => decide(true)}
            className="flex-1 rounded-lg bg-primary py-2.5 text-primary-foreground text-sm font-medium disabled:opacity-50"
          >
            موافقة
          </button>
        </div>
      </div>
    </main>
  );
}
