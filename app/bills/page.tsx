import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { fmtMoney, fmtDate } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

interface BillRow {
  id: string;
  provider_name: string | null;
  facility_type: string | null;
  service_date_start: string | null;
  stated_total: number | null;
  computed_total: number | null;
  flag_count: number | null;
  status: string | null;
  created_at: string;
}

// History: the signed-in user's past bills. RLS scopes the query to their own
// rows, so no explicit user_id filter is required.
export default async function BillsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="max-w-md">
        <h1 className="text-2xl font-semibold tracking-tight">My bills</h1>
        <p className="mt-2 text-slate-600">
          <Link href="/auth" className="text-accent hover:underline">
            Sign in
          </Link>{" "}
          to save and revisit your bills, or{" "}
          <Link href="/analyze" className="text-accent hover:underline">
            check a bill
          </Link>{" "}
          without an account.
        </p>
      </div>
    );
  }

  const { data: bills } = await supabase
    .from("bills")
    .select(
      "id, provider_name, facility_type, service_date_start, stated_total, computed_total, flag_count, status, created_at"
    )
    .order("created_at", { ascending: false });

  const rows = (bills ?? []) as BillRow[];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">My bills</h1>
        <Link
          href="/analyze"
          className="inline-flex items-center rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-hover"
        >
          Check a bill
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="mt-8 rounded-lg border border-slate-200 bg-slate-50 p-8 text-center">
          <p className="text-sm text-slate-600">
            You haven&rsquo;t saved any bills yet.
          </p>
          <Link
            href="/analyze"
            className="mt-4 inline-flex items-center rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-hover"
          >
            Check your first bill
          </Link>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Provider</th>
                <th className="px-4 py-3 font-medium">Service date</th>
                <th className="px-4 py-3 text-right font-medium">Total</th>
                <th className="px-4 py-3 text-center font-medium">Questions</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((b) => {
                const total = b.stated_total ?? b.computed_total ?? 0;
                return (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/bills/${b.id}`}
                        className="font-medium text-accent hover:underline"
                      >
                        {b.provider_name || "Untitled bill"}
                      </Link>
                      <div className="text-xs text-slate-400">
                        Analyzed {fmtDate(b.created_at)}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                      {fmtDate(b.service_date_start)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums font-medium text-ink">
                      {fmtMoney(total)}
                    </td>
                    <td className="px-4 py-3 text-center tabular-nums">
                      {b.flag_count && b.flag_count > 0 ? (
                        <span className="inline-block rounded-full bg-danger-soft px-2 py-0.5 text-xs font-medium text-danger">
                          {b.flag_count}
                        </span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={b.status ?? "analyzed"} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
