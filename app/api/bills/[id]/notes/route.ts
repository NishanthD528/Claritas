// app/api/bills/[id]/notes/route.ts
//
// Add a dispute note to a bill. RLS (owns_bill) ensures only the owner can
// write notes tied to their bill.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const body = await request.json().catch(() => null);
  const note = typeof body?.note === "string" ? body.note.trim() : "";
  if (!note) {
    return NextResponse.json({ error: "Note is empty." }, { status: 400 });
  }
  if (note.length > 5000) {
    return NextResponse.json({ error: "Note is too long." }, { status: 400 });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("dispute_notes")
    .insert({ bill_id: params.id, note })
    .select("id, note, created_at")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Could not save note." }, { status: 400 });
  }

  return NextResponse.json({ note: data });
}
