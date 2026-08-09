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
      <section className="py-10 sm:py-16">
        <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          Your medical bill is probably wrong. Find out where.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-slate-600">
          Medical bills are notoriously error-prone, yet almost no one ever
          checks theirs line by line. Claritas reads your bill, explains every
          charge in plain English, and shows you exactly what to question — for
          free.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Link
            href="/analyze"
            className="inline-flex items-center rounded-lg bg-accent px-6 py-3 text-base font-medium text-white transition hover:bg-accent-hover"
          >
            Check My Bill
          </Link>
          <span className="text-sm text-slate-500">
            No account needed. Nothing to pay.
          </span>
        </div>
      </section>

      {/* Benefits */}
      <section className="grid gap-6 border-t border-slate-200 py-12 sm:grid-cols-3">
        {BENEFITS.map((b) => (
          <div
            key={b.title}
            className="rounded-lg border border-slate-200 bg-white p-6"
          >
            <div className="mb-3 h-1 w-10 rounded-full bg-accent" />
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
        <div className="rounded-xl bg-ink px-6 py-10 text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-white">
            Ready to check your bill?
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-slate-300">
            It takes a minute, and you might find a charge worth questioning.
          </p>
          <Link
            href="/analyze"
            className="mt-6 inline-flex items-center rounded-lg bg-white px-6 py-3 text-base font-medium text-ink transition hover:bg-slate-100"
          >
            Check My Bill
          </Link>
        </div>
      </section>
    </div>
  );
}
