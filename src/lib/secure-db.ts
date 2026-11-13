/**
 * Tiny query builder for the protected tables. It mirrors the subset of the
 * database client API the screens use (select/insert/upsert/update/delete,
 * eq, order, range, limit, maybeSingle/single) but sends each request to the
 * server gateway, which checks the signed session and permissions.
 */
import { cloudQuery } from "@/lib/cloud.functions";
import { getSessionToken } from "@/lib/session-store";
import type { SecureTable } from "@/lib/secure-tables";

type Result = { data: any; error: { message: string } | null };
type Action = "select" | "insert" | "upsert" | "update" | "delete";

class SecureQuery implements PromiseLike<Result> {
  private action: Action = "select";
  private columns = "*";
  private filters: { col: string; value: any }[] = [];
  private orderBy?: { col: string; ascending: boolean };
  private rangeVal?: [number, number];
  private limitVal?: number;
  private values?: any;
  private onConflict?: string;
  private returning = false;
  private singleMode: "" | "maybe" | "one" = "";

  constructor(private table: SecureTable) {}

  select(columns = "*") {
    if (this.action === "select") this.columns = columns;
    else this.returning = true;
    return this;
  }
  insert(values: any) { this.action = "insert"; this.values = values; return this; }
  upsert(values: any, opts?: { onConflict?: string }) {
    this.action = "upsert"; this.values = values; this.onConflict = opts?.onConflict; return this;
  }
  update(values: any) { this.action = "update"; this.values = values; return this; }
  delete() { this.action = "delete"; return this; }
  eq(col: string, value: any) { this.filters.push({ col, value }); return this; }
  order(col: string, opts?: { ascending?: boolean }) { this.orderBy = { col, ascending: opts?.ascending ?? true }; return this; }
  range(from: number, to: number) { this.rangeVal = [from, to]; return this; }
  limit(n: number) { this.limitVal = n; return this; }
  maybeSingle() { this.singleMode = "maybe"; if (this.action !== "select") this.returning = true; return this; }
  then<A = Result, B = never>(ok?: ((v: Result) => A | PromiseLike<A>) | null, fail?: ((e: any) => B | PromiseLike<B>) | null) {
    return this.run().then(ok, fail);
  }

  private async run(): Promise<Result> {
    try {
      const res = await cloudQuery({
        data: {
          token: getSessionToken() || undefined,
          table: this.table,
          action: this.action,
          columns: this.columns,
          filters: this.filters,
          order: this.orderBy,
          range: this.rangeVal,
          limit: this.limitVal,
          values: this.values,
          onConflict: this.onConflict,
          returning: this.returning,
        },
      });
      if (res.error) return { data: null, error: { message: res.error } };
      let data: any = res.data;
      if (this.singleMode && Array.isArray(data)) {
        if (this.singleMode === "one" && data.length !== 1) return { data: null, error: { message: "لم يتم العثور على السجل" } };
        data = data[0] ?? null;
      }
      return { data, error: null };
    } catch {
      return { data: null, error: { message: "تعذر الاتصال بالخادم" } };
    }
  }

  /** Exactly one row expected. */
  single() { this.singleMode = "one"; if (this.action !== "select") this.returning = true; return this; }
}

export const sdb = {
  from: (table: SecureTable) => new SecureQuery(table),
};
