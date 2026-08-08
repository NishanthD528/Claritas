import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

// Minimal history page. The full listing UI is built in a later step; for now
// it proves the server-side auth session works end to end.
export default async function BillsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div>
        <h1 className="text-2xl font-semibold">My bills</h1>
        <p className="mt-2 text-slate-600">
          You are not signed in.{" "}
          <Link href="/auth" className="text-accent hover:underline">
            Sign in
          </Link>{" "}
          to save and revisit your bills.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">My bills</h1>
      <p className="mt-2 text-slate-600">
        Signed in as {user.email}. Your saved bills will appear here once the
        analysis pipeline is built.
      </p>
    </div>
  );
}
