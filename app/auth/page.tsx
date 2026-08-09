import AuthForm from "./AuthForm";

// Rendered per-request, never prerendered at build time. The form creates a
// Supabase browser client, which requires the NEXT_PUBLIC_SUPABASE_* env vars;
// forcing dynamic rendering keeps a missing var from crashing the build.
export const dynamic = "force-dynamic";

export default function AuthPage() {
  return <AuthForm />;
}
