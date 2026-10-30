import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { db, fullName, hasScreen } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/study-events")({
  component: StudyEventsAdmin,
  head: () => ({
    meta: [
      { title: "فعاليات الدراسة | إدارة المجموعة" },
      { name: "description", content: "إضافة فعاليات الدراسة وتحديد المسموح لهم بالحضور." },
      { property: "og:title", content: "فعاليات الدراسة" },
      { property: "og:description", content: "إضافة فعاليات الدراسة وتحديد المسموح لهم بالحضور." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Ev = { id: string; title: string; event_type: string; event_date: string | null; location: string | null; notes: string | null };
type Att = { id: string; event_id: string; user_id: string };
const input = "rounded-lg border bg-background px-3 py-2 text-sm";
const sb = supabase as any;

function StudyEventsAdmin() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [events, setEvents] = useState<Ev[]>([]);
  const [atts, setAtts] = useState<Att[]>([]);
  const [sel, setSel] = useState<string>("");
  const [form, setForm] = useState({ title: "", event_type: "دراسة", event_date: "", location: "" });
  const [q, setQ] = useState("");
  const [team, setTeam] = useState("");

  const reload = useCallback(async () => {
    const [e, a] = await Promise.all([
      sb.from("Study_Events").select("*").order("created_at", { ascending: false }),
      sb.from("Study_Event_Attendees").select("*"),
    ]);
    setEvents(e.data || []);
    setAtts(a.data || []);
  }, []);
  useEffect(() => { reload(); }, [reload]);

  const users = db.users.all();
  const teams = db.teams.all();
  const allowed = useMemo(() => new Set(atts.filter((a) => a.event_id === sel).map((a) => a.user_id)), [atts, sel]);
  const results = q.trim() ? users.filter((u) => fullName(u).includes(q.trim())).slice(0, 15) : [];

  if (loading) return null;
  if (!user || !hasScreen(user, "events_admin")) return <div dir="rtl" className="p-8">غير مسموح</div>;

  const addEvent = async () => {
    if (!form.title.trim()) return toast.error("اكتب اسم الفعالية");
    const { error } = await sb.from("Study_Events").insert({ ...form, created_by: user.ID });
    if (error) return toast.error(error.message);
    setForm({ title: "", event_type: "دراسة", event_date: "", location: "" });
    toast.success("تمت الإضافة");
    reload();
  };
  const delEvent = async (id: string) => {
    if (!confirm("حذف الفعالية؟")) return;
    await sb.from("Study_Events").delete().eq("id", id);
    if (sel === id) setSel("");
    reload();
  };
  const addPeople = async (ids: string[]) => {
    const fresh = ids.filter((id) => !allowed.has(id));
    if (!fresh.length) return toast.info("كلهم مضافين بالفعل");
    const { error } = await sb.from("Study_Event_Attendees").insert(fresh.map((user_id) => ({ event_id: sel, user_id })));
    if (error) return toast.error(error.message);
    toast.success(`تمت إضافة ${fresh.length}`);
    reload();
  };
  const removePerson = async (uid: string) => {
    await sb.from("Study_Event_Attendees").delete().eq("event_id", sel).eq("user_id", uid);
    reload();
  };

  const leaders = users.filter((u) => u.Role === "Leader");
  const current = events.find((e) => e.id === sel);

  return (
    <div dir="rtl" className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">📘 فعاليات الدراسة</h1>
          <button onClick={() => nav({ to: "/admin" })} className="text-sm text-muted-foreground">← رجوع</button>
        </header>

        <div className="rounded-xl border bg-card p-4 grid gap-2 md:grid-cols-5">
          <input className={input + " md:col-span-2"} placeholder="اسم الفعالية" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <select className={input} value={form.event_type} onChange={(e) => setForm({ ...form, event_type: e.target.value })}>
            <option>دراسة</option><option>دراسات</option><option>دورة</option><option>أخرى</option>
          </select>
          <input className={input} type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} />
          <button onClick={addEvent} className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground">إضافة</button>
        </div>

        <div className="grid gap-2">
          {events.map((e) => (
            <div key={e.id} className={`rounded-xl border p-3 flex items-center justify-between ${sel === e.id ? "border-primary bg-primary/5" : "bg-card"}`}>
              <button className="text-right flex-1" onClick={() => setSel(e.id)}>
                <div className="font-medium">{e.title}</div>
                <div className="text-xs text-muted-foreground">{e.event_type} · {e.event_date || "—"} · {atts.filter((a) => a.event_id === e.id).length} مسموح</div>
              </button>
              <button onClick={() => delEvent(e.id)} className="text-xs text-destructive">حذف</button>
            </div>
          ))}
          {!events.length && <p className="text-sm text-muted-foreground">لا توجد فعاليات بعد.</p>}
        </div>

        {current && (
          <div className="rounded-xl border bg-card p-4 space-y-4">
            <h2 className="font-bold">المسموح لهم بحضور «{current.title}»</h2>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => addPeople(leaders.map((u) => u.ID))} className="rounded-lg border px-3 py-2 text-sm">إضافة كل القادة ({leaders.length})</button>
              <select className={input} value={team} onChange={(e) => setTeam(e.target.value)}>
                <option value="">اختر فريق…</option>
                {teams.map((t) => <option key={t.Team_ID} value={t.Team_ID}>{t.Team_Name}</option>)}
              </select>
              <button disabled={!team} onClick={() => addPeople(users.filter((u) => u.Team_ID === team).map((u) => u.ID))} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50">إضافة أعضاء الفريق</button>
              <button disabled={!team} onClick={() => addPeople(leaders.filter((u) => u.Team_ID === team).map((u) => u.ID))} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50">إضافة قادة الفريق</button>
            </div>
            <div>
              <input className={input + " w-full"} placeholder="ابحث بالاسم…" value={q} onChange={(e) => setQ(e.target.value)} />
              {results.map((u) => (
                <div key={u.ID} className="flex justify-between border-b py-1 text-sm">
                  <span>{fullName(u)}</span>
                  {allowed.has(u.ID) ? <span className="text-xs text-muted-foreground">مضاف</span>
                    : <button onClick={() => addPeople([u.ID])} className="text-xs text-primary">إضافة</button>}
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {[...allowed].map((id) => (
                <span key={id} className="rounded-full bg-muted px-3 py-1 text-xs flex gap-2 items-center">
                  {fullName(db.users.get(id) as any) || id}
                  <button onClick={() => removePerson(id)} className="text-destructive">✕</button>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
