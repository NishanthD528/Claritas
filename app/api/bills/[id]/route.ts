// app/api/bills/[id]/route.ts
//
// Delete a bill. RLS scopes the delete to the owner; the schema's ON DELETE
// CASCADE removes the bill's charges, flags, rights, and dispute notes.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { error } = await supabase.from("bills").delete().eq("id", params.id);
  if (error) {
    return NextResponse.json({ error: "Could not delete bill." }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
