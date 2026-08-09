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
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3.5">
            <Link
              href="/"
              className="flex items-center gap-2 text-lg font-bold tracking-tight text-ink"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-sm font-bold text-white">
                C
              </span>
              Claritas
            </Link>
            <nav className="flex items-center gap-2 text-sm sm:gap-4">
              <Link
                href="/bills"
                className="hidden px-2 py-1.5 text-slate-600 transition hover:text-accent sm:inline"
              >
                My bills
              </Link>
              <Link
                href="/auth"
                className="px-2 py-1.5 text-slate-600 transition hover:text-accent"
              >
                Sign in
              </Link>
              <Link
                href="/analyze"
                className="inline-flex items-center rounded-lg bg-accent px-4 py-2 font-medium text-white transition hover:bg-accent-hover"
              >
                Check a bill
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
