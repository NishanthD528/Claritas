import Link from "next/link";

const BENEFITS = [
  {
    title: "Every charge, explained",
    body: "See each line item translated into plain English — what the service was, in language anyone can understand, with no jargon.",
  },
  {
    title: "Errors found automatically",
    body: "Claritas checks the bill's own math, looks for duplicate charges, odd quantities, and vague line items, and shows you exactly where to ask questions.",
  },
  {
    title: "Know what you can dispute",
    body: "Get a plain-language rundown of the rights and programs that may apply to your bill, plus a ready-to-send letter to the billing department.",
  },
];

const STEPS = [
  "Upload a PDF or photo of your itemized bill, or paste the text.",
  "Personal details are removed automatically before anything is analyzed.",
  "Get every charge explained, the math checked, and a letter you can send.",
];

export default function Home() {
  return (
    <div>
      {/* Hero */}
      <section className="py-8 sm:py-12">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 px-6 py-14 sm:px-12 sm:py-20">
          {/* soft decorative glow */}
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-blue-400/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-indigo-400/20 blur-3xl" />
          <div className="relative">
            <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-blue-50 ring-1 ring-inset ring-white/20">
              Free · Private · No account needed
            </span>
            <h1 className="mt-5 max-w-3xl text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl">
              Your medical bill is probably wrong. Find out where.
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-blue-100">
              Medical bills are notoriously error-prone, yet almost no one ever
              checks theirs line by line. Claritas reads your bill, explains
              every charge in plain English, and shows you exactly what to
              question.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/analyze"
                className="inline-flex items-center rounded-lg bg-white px-6 py-3 text-base font-semibold text-accent shadow-lg shadow-blue-900/20 transition hover:bg-blue-50"
              >
                Check My Bill
              </Link>
              <span className="text-sm text-blue-200">
                Takes about a minute.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="grid gap-6 py-8 sm:grid-cols-3">
        {BENEFITS.map((b) => (
          <div
            key={b.title}
            className="group rounded-2xl border border-slate-200 bg-white p-6 transition hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-lg hover:shadow-blue-900/5"
          >
            <div className="mb-4 h-1.5 w-12 rounded-full bg-accent transition-all group-hover:w-16" />
            <h2 className="text-lg font-semibold text-ink">{b.title}</h2>
            <p className="mt-2 text-sm text-slate-600">{b.body}</p>
          </div>
        ))}
      </section>

      {/* How it works */}
      <section className="border-t border-slate-200 py-12">
        <h2 className="text-xl font-semibold tracking-tight text-ink">
          How it works
        </h2>
        <ol className="mt-6 space-y-4">
          {STEPS.map((step, i) => (
            <li key={i} className="flex items-start gap-4">
              <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent">
                {i + 1}
              </span>
              <p className="pt-0.5 text-slate-600">{step}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Privacy + price stance */}
      <section className="grid gap-6 border-t border-slate-200 py-12 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-6">
          <h3 className="text-base font-semibold text-ink">
            Your privacy comes first
          </h3>
          <p className="mt-2 text-sm text-slate-600">
            Personal details — names, addresses, ID numbers — are stripped out
            automatically before your bill is analyzed. Uploaded files are
            processed in memory and never stored.
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-6">
          <h3 className="text-base font-semibold text-ink">No made-up prices</h3>
          <p className="mt-2 text-sm text-slate-600">
            Claritas never guesses what a service &ldquo;should&rdquo; cost. It
            reads only your own bill and points you to the government&rsquo;s
            public price-lookup tool if you want to check a code yourself.
          </p>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="border-t border-slate-200 py-12">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-12 text-center">
          <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
          <div className="relative">
            <h2 className="text-2xl font-bold tracking-tight text-white">
              Ready to check your bill?
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-blue-100">
              It takes a minute, and you might find a charge worth questioning.
            </p>
            <Link
              href="/analyze"
              className="mt-6 inline-flex items-center rounded-lg bg-white px-6 py-3 text-base font-semibold text-accent shadow-lg shadow-blue-900/20 transition hover:bg-blue-50"
            >
              Check My Bill
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
