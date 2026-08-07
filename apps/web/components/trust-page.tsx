import Link from "next/link";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";

export type TrustSection = { title: string; body: React.ReactNode };

export function TrustPage({ title, intro, sections }: { title: string; intro: string; sections: TrustSection[] }) {
  return (
    <main className="relative isolate min-h-dvh overflow-hidden">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 bg-anime opacity-30 dark:opacity-20" />
      <Header />
      <article className="mx-auto w-full max-w-3xl px-4 py-16">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">AI.JOBS trust center</p>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-gradient sm:text-5xl">{title}</h1>
        <p className="mt-5 text-base leading-7 text-muted-foreground">{intro}</p>
        <div className="mt-10 space-y-8">
          {sections.map((section) => (
            <section key={section.title} className="glass rounded-2xl p-6">
              <h2 className="text-xl font-semibold">{section.title}</h2>
              <div className="mt-3 space-y-3 text-sm leading-6 text-muted-foreground">{section.body}</div>
            </section>
          ))}
        </div>
        <p className="mt-8 text-sm text-muted-foreground">Questions? <Link className="text-primary hover:underline" href="/support">Contact support</Link>.</p>
      </article>
      <Footer />
    </main>
  );
}
