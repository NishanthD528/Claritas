import Link from "next/link";

// Placeholder landing. The full landing page is built in a later step.
export default function Home() {
  return (
    <div className="py-12">
      <h1 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
        Your medical bill is probably wrong. Find out where.
      </h1>
      <p className="mt-6 max-w-xl text-lg text-slate-600">
        Upload a bill and Claritas explains every charge in plain English, flags
        internal errors, and tells you what you can dispute.
      </p>
      <div className="mt-8">
        <Link
          href="/analyze"
          className="inline-block rounded-md bg-accent px-6 py-3 text-white transition-colors hover:bg-accent-hover"
        >
          Check My Bill
        </Link>
      </div>
    </div>
  );
}
