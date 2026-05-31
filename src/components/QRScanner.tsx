import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { db } from "@/lib/db";
import { toast } from "sonner";

export function QRScanner({ adminName }: { adminName: string }) {
  const [scanning, setScanning] = useState(false);
  const [activity, setActivity] = useState("اجتماع أسبوعي");
  const [recent, setRecent] = useState<{ name: string; time: string }[]>([]);
  const ref = useRef<Html5Qrcode | null>(null);
  const lastScan = useRef<{ id: string; t: number }>({ id: "", t: 0 });

  const beep = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value = 880; g.gain.value = 0.2;
      o.start(); o.stop(ctx.currentTime + 0.15);
    } catch {}
  };

  const onScan = (text: string) => {
    const now = Date.now();
    if (lastScan.current.id === text && now - lastScan.current.t < 3000) return;
    lastScan.current = { id: text, t: now };
    const u = db.users.get(text);
    if (!u) { toast.error("رمز غير معروف"); return; }
    const today = new Date().toISOString().slice(0, 10);
    db.attendance.mark(u.id, today, "present", activity);
    beep();
    const name = `${u.firstName} ${u.lastName}`;
    toast.success(`${name} — حاضر`);
    setRecent((r) => [{ name, time: new Date().toLocaleTimeString("ar-EG") }, ...r].slice(0, 8));
  };

  const start = async () => {
    setScanning(true);
    try {
      const el = "qr-reader";
      ref.current = new Html5Qrcode(el);
      await ref.current.start({ facingMode: "environment" },
        { fps: 10, qrbox: 250 }, onScan, () => {});
    } catch (e: any) { toast.error("فشل تشغيل الكاميرا: " + e.message); setScanning(false); }
  };
  const stop = async () => {
    try { await ref.current?.stop(); await ref.current?.clear(); } catch {}
    ref.current = null; setScanning(false);
  };
  useEffect(() => () => { stop(); }, []);

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="rounded-xl border bg-card p-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <input value={activity} onChange={(e) => setActivity(e.target.value)} placeholder="النشاط"
            className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm" />
          {!scanning ? (
            <button onClick={start} className="rounded-lg bg-primary px-4 py-2 text-primary-foreground text-sm font-medium">
              تشغيل الكاميرا
            </button>
          ) : (
            <button onClick={stop} className="rounded-lg bg-destructive px-4 py-2 text-destructive-foreground text-sm font-medium">
              إيقاف
            </button>
          )}
        </div>
        <div id="qr-reader" className="rounded-lg overflow-hidden bg-black aspect-square" />
        {!scanning && <div className="mt-3 text-xs text-muted-foreground text-center">اضغط تشغيل الكاميرا ووجهها لرمز العضو</div>}
      </div>
      <div className="rounded-xl border bg-card p-4">
        <div className="text-sm font-medium mb-3">آخر العمليات</div>
        <div className="space-y-2">
          {recent.length === 0 && <div className="text-sm text-muted-foreground">لم يتم مسح أي رمز بعد</div>}
          {recent.map((r, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg bg-success/10 p-2 text-sm">
              <span className="font-medium">✓ {r.name}</span>
              <span className="text-xs text-muted-foreground">{r.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
