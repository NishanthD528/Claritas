import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { billViewFromRows } from "@/lib/view";
import { ResultsView } from "@/components/results/ResultsView";

export const dynamic = "force-dynamic";

// Results page for a saved bill. RLS ensures a signed-in user can only read
// their own bill; anyone else (or a bad id) gets a not-found.
export default async function BillResultsPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="max-w-md">
        <h1 className="text-2xl font-semibold">Sign in to view this bill</h1>
        <p className="mt-2 text-slate-600">
          Saved bills are private to your account.{" "}
          <Link href="/auth" className="text-accent hover:underline">
            Sign in
          </Link>{" "}
          to view it, or{" "}
          <Link href="/analyze" className="text-accent hover:underline">
            check a new bill
          </Link>
          .
        </p>
      </div>
    );
  }

  const { data: bill } = await supabase
    .from("bills")
    .select(
      "id, provider_name, facility_type, service_date_start, service_date_end, stated_total, computed_total, flag_count, status"
    )
    .eq("id", params.id)
    .single();

  if (!bill) notFound();

  const [{ data: charges }, { data: flags }, { data: rights }] =
    await Promise.all([
      supabase
        .from("charges")
        .select(
          "id, line_number, code, code_type, description_raw, description_plain, service_date, units, unit_price, amount_charged"
        )
        .eq("bill_id", bill.id),
      supabase
        .from("flags")
        .select("charge_id, flag_type, severity, explanation, suggested_question")
        .eq("bill_id", bill.id),
      supabase.from("rights").select("right_key, relevance").eq("bill_id", bill.id),
    ]);

  const view = billViewFromRows(
    bill,
    charges ?? [],
    flags ?? [],
    rights ?? []
  );

  return (
    <div>
      <ResultsView bill={view} />
      <div className="mt-10 border-t border-slate-200 pt-6 text-sm">
        <Link href="/bills" className="text-accent hover:underline">
          ← All my bills
        </Link>
      </div>
    </div>
  );
}
