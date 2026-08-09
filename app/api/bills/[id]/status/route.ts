// app/api/bills/[id]/status/route.ts
//
// Update a bill's workflow status. When a bill becomes "disputing", the rights
// engine is re-run so the collections-pause right (which only applies once a
// dispute is open) is reflected. RLS scopes every query to the owner.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { matchRights } from "@/lib/rights";
import type { ChargeExtraction } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID = new Set(["analyzed", "disputing", "resolved"]);

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const body = await request.json().catch(() => null);
  const status = body?.status;
  if (typeof status !== "string" || !VALID.has(status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { data: bill, error } = await supabase
    .from("bills")
    .update({ status })
    .eq("id", params.id)
    .select("id, facility_type, stated_total, computed_total")
    .single();

  if (error || !bill) {
    return NextResponse.json({ error: "Bill not found." }, { status: 404 });
  }

  // Re-match rights so collections_pause tracks the new status.
  const { data: charges } = await supabase
    .from("charges")
    .select("code, code_type, description_raw, service_date, units, unit_price, amount_charged, line_number")
    .eq("bill_id", bill.id);

  const rights = matchRights({
    facility_type: bill.facility_type ?? "other",
    charges: (charges ?? []) as ChargeExtraction[],
    computed_total: bill.computed_total ?? 0,
    stated_total: bill.stated_total,
    status,
  });

  await supabase.from("rights").delete().eq("bill_id", bill.id);
  if (rights.length > 0) {
    await supabase.from("rights").insert(
      rights.map((r) => ({
        bill_id: bill.id,
        right_key: r.right_key,
        relevance: r.relevance,
      }))
    );
  }

  return NextResponse.json({ ok: true, status });
}
