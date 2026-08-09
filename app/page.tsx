import Link from "next/link";
import { Reveal } from "@/components/Reveal";
import RotatingText from "@/components/RotatingText";

const BENEFITS = [
  {
    title: "Every charge, explained",
    body: "Each line item translated into plain English — what the service was, with no jargon.",
  },
  {
    title: "Errors found automatically",
    body: "Checks the bill's math and looks for duplicates, odd quantities, and vague charges.",
  },
  {
    title: "Know what you can dispute",
    body: "The rights that may apply to your bill, plus a ready-to-send letter for the billing office.",
  },
];

const STEPS = [
  "Upload a PDF or photo of your bill, or paste the text.",
  "Personal details are removed automatically before anything is analyzed.",
  "Get every charge explained, the math checked, and a letter you can send.",
];

export default function Home() {
  return (
    <div>
      {/* Hero */}
      <section className="py-8 sm:py-12">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 via-cyan-600 to-emerald-500 px-6 py-14 sm:px-12 sm:py-20">
          <div className="relative">
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl">
              <span className="block">Your medical bill is probably</span>
              <RotatingText
                texts={[
                  "wrong.",
                  "overcharged.",
                  "double-billed.",
                  "confusing.",
                  "padded.",
                ]}
                mainClassName="mt-2 w-fit overflow-hidden rounded-xl bg-emerald-300 px-3 py-1 text-emerald-950"
                splitLevelClassName="overflow-hidden pb-1"
                splitBy="words"
                staggerDuration={0}
                animatePresenceMode="popLayout"
                initial={{ y: "110%", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "-110%", opacity: 0 }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                rotationInterval={2600}
              />
              <span className="mt-2 block">Find out where.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-blue-50">
              Claritas reads your bill, explains every charge, and shows you
              exactly what to question — free.
            </p>
            <div className="mt-8">
              <Link
                href="/analyze"
                className="inline-flex items-center rounded-lg bg-white px-6 py-3 text-base font-semibold text-accent shadow-lg shadow-blue-900/20 transition hover:bg-blue-50 active:scale-[0.98]"
              >
                Check My Bill
              </Link>
            </div>
          </div>
        </div>
        <p className="mt-4 text-center text-sm text-slate-500">
          Free · Private · Personal details removed automatically · No made-up
          prices
        </p>
      </section>

      {/* Benefits */}
      <section className="grid gap-6 py-8 sm:grid-cols-3">
        {BENEFITS.map((b, i) => (
          <Reveal key={b.title} delay={i * 100}>
            <div className="h-full rounded-2xl border border-slate-200 bg-white p-6">
              <div className="mb-4 h-1.5 w-12 rounded-full bg-gradient-to-r from-accent to-emerald-500" />
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
                <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-gradient-to-br from-accent to-emerald-500 text-sm font-semibold text-white">
                  {i + 1}
                </span>
                <p className="pt-1 text-slate-600">{step}</p>
              </li>
            ))}
          </ol>
        </section>
      </Reveal>

      {/* Closing CTA */}
      <section className="border-t border-slate-200 py-12">
        <div className="rounded-2xl bg-gradient-to-r from-blue-600 via-cyan-600 to-emerald-500 px-6 py-12 text-center">
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
      </section>
    </div>
  );
}
