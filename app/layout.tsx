import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Claritas — Understand your medical bill",
  description:
    "Upload a medical bill and see every charge explained in plain English, with internal errors flagged and your rights spelled out.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans text-ink bg-white antialiased">
        <header className="border-b border-slate-200">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
            <Link href="/" className="text-lg font-semibold tracking-tight">
              Claritas
            </Link>
            <nav className="flex items-center gap-6 text-sm">
              <Link href="/analyze" className="hover:text-accent">
                Check a bill
              </Link>
              <Link href="/bills" className="hover:text-accent">
                My bills
              </Link>
              <Link href="/auth" className="hover:text-accent">
                Sign in
              </Link>
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-4 py-10">{children}</main>

        <footer className="mt-16 border-t border-slate-200">
          <div className="mx-auto max-w-5xl px-4 py-6 text-xs text-slate-500">
            Claritas is not legal, medical, or insurance advice. It helps you
            read your own bill and points you to public resources. Always verify
            your situation with your provider or a state consumer agency.
          </div>
        </footer>
      </body>
    </html>
  );
}
