import Link from "next/link";
import { Reveal } from "@/components/Reveal";

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

const FAQS = [
  {
    q: "Is it really free?",
    a: "Yes. Claritas runs entirely on free services and there is nothing to pay, no trial, and no card required.",
  },
  {
    q: "What happens to my personal information?",
    a: "Names, addresses, and ID numbers are stripped out automatically before your bill is analyzed. Uploaded files are processed in memory and never stored.",
  },
  {
    q: "Will it tell me what a charge should cost?",
    a: "No — and that is deliberate. Claritas reads only your own bill. If you want a price reference, it links you to the government's public fee-schedule lookup tool so you can check a code yourself.",
  },
  {
    q: "Does a flagged charge mean it's definitely wrong?",
    a: "No. A flag means something is worth asking about — a total that doesn't add up, a possible duplicate, an unusual quantity. Claritas gives you the question to ask, not a verdict.",
  },
];

export default function Home() {
  return (
    <div>
      {/* Hero */}
      <section className="py-8 sm:py-12">
        <div className="animate-gradient relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 via-cyan-600 to-emerald-500 px-6 py-14 sm:px-12 sm:py-20">
          {/* soft decorative glows blend blue into green */}
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-emerald-300/25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-blue-400/25 blur-3xl" />
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white ring-1 ring-inset ring-white/25">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
              Free · Private · No account needed
            </span>
            <h1 className="mt-5 max-w-3xl text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl">
              Your medical bill is probably wrong. Find out where.
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-blue-50">
              Medical bills are notoriously error-prone, yet almost no one ever
              checks theirs line by line. Claritas reads your bill, explains
              every charge in plain English, and shows you exactly what to
              question.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/analyze"
                className="inline-flex items-center rounded-lg bg-white px-6 py-3 text-base font-semibold text-accent shadow-lg shadow-blue-900/20 transition hover:bg-blue-50 active:scale-[0.98]"
              >
                Check My Bill
              </Link>
              <span className="text-sm text-white/80">Takes about a minute.</span>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="grid gap-6 py-8 sm:grid-cols-3">
        {BENEFITS.map((b, i) => (
          <Reveal key={b.title} delay={i * 100}>
            <div className="group h-full rounded-2xl border border-slate-200 bg-white p-6 transition hover:-translate-y-1 hover:border-accent/40 hover:shadow-xl hover:shadow-blue-900/5">
              <div className="mb-4 h-1.5 w-12 rounded-full bg-gradient-to-r from-accent to-emerald-500 transition-all duration-300 group-hover:w-20" />
              <h2 className="text-lg font-semibold text-ink">{b.title}</h2>
              <p className="mt-2 text-sm text-slate-600">{b.body}</p>
            </div>
          </Reveal>
        ))}
      </section>

      {/* How it works */}
      <Reveal>
        <section className="border-t border-slate-200 py-12">
          <h2 className="text-xl font-semibold tracking-tight text-ink">
            How it works
          </h2>
          <ol className="mt-6 space-y-4">
            {STEPS.map((step, i) => (
              <li key={i} className="flex items-start gap-4">
                <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-gradient-to-br from-accent to-emerald-500 text-sm font-semibold text-white shadow-sm">
                  {i + 1}
                </span>
                <p className="pt-1 text-slate-600">{step}</p>
              </li>
            ))}
          </ol>
        </section>
      </Reveal>

      {/* Privacy + price stance */}
      <Reveal>
        <section className="grid gap-6 border-t border-slate-200 py-12 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-blue-50 to-white p-6">
            <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-accent-soft text-accent">
              <ShieldIcon />
            </div>
            <h3 className="text-base font-semibold text-ink">
              Your privacy comes first
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Personal details — names, addresses, ID numbers — are stripped out
              automatically before your bill is analyzed. Uploaded files are
              processed in memory and never stored.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-emerald-50 to-white p-6">
            <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
              <TagIcon />
            </div>
            <h3 className="text-base font-semibold text-ink">No made-up prices</h3>
            <p className="mt-2 text-sm text-slate-600">
              Claritas never guesses what a service &ldquo;should&rdquo; cost. It
              reads only your own bill and points you to the government&rsquo;s
              public price-lookup tool if you want to check a code yourself.
            </p>
          </div>
        </section>
      </Reveal>

      {/* FAQ */}
      <Reveal>
        <section className="border-t border-slate-200 py-12">
          <h2 className="text-xl font-semibold tracking-tight text-ink">
            Common questions
          </h2>
          <div className="mt-6 space-y-3">
            {FAQS.map((f) => (
              <details
                key={f.q}
                className="group rounded-xl border border-slate-200 bg-white p-5 transition hover:border-accent/40"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-ink">
                  {f.q}
                  <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-accent-soft text-accent transition-transform duration-300 group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm text-slate-600">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </Reveal>

      {/* Closing CTA */}
      <section className="border-t border-slate-200 py-12">
        <div className="animate-gradient relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-cyan-600 to-emerald-500 px-6 py-12 text-center">
          <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
          <div className="relative">
            <h2 className="text-2xl font-bold tracking-tight text-white">
              Ready to check your bill?
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-blue-50">
              It takes a minute, and you might find a charge worth questioning.
            </p>
            <Link
              href="/analyze"
              className="mt-6 inline-flex items-center rounded-lg bg-white px-6 py-3 text-base font-semibold text-accent shadow-lg shadow-blue-900/20 transition hover:bg-blue-50 active:scale-[0.98]"
            >
              Check My Bill
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" aria-hidden="true">
      <path
        d="M10 2l6 2.5v4c0 3.5-2.4 6.6-6 7.5-3.6-.9-6-4-6-7.5v-4L10 2z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M7.5 10l1.8 1.8L13 8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TagIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" aria-hidden="true">
      <path
        d="M3 3h6l8 8-6 6-8-8V3z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="6.5" cy="6.5" r="1.2" fill="currentColor" />
    </svg>
  );
}
