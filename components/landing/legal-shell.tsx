import { ArrowLeft, ArrowRight } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { LandingFooter } from "./landing-footer";
import { LandingHeader } from "./landing-header";
import { Reveal } from "./reveal";
import { TocNav } from "./toc-nav";

const DARK_BG: React.CSSProperties = {
  background: `
    radial-gradient(circle at top right, rgba(20,184,166,.18) 0%, transparent 55%),
    radial-gradient(circle at bottom left, rgba(13,148,136,.10) 0%, transparent 55%),
    linear-gradient(180deg, #081C1C 0%, #041010 100%)
  `,
};

export interface TocEntry {
  id: string;
  label: string;
}

interface LegalShellProps {
  children: React.ReactNode;
  description: string;
  eyebrow: string;
  lastUpdated: string;
  title: string;
  toc: TocEntry[];
}

export function LegalShell({
  eyebrow,
  title,
  description,
  lastUpdated,
  toc,
  children,
}: LegalShellProps) {
  return (
    <div className="min-h-screen overflow-x-clip bg-base-100 text-base-content antialiased">
      <LandingHeader />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden py-20 sm:py-28"
        style={DARK_BG}
      >
        {/* Glow orb */}
        <div
          className="pointer-events-none absolute right-0 top-0 h-[500px] w-[500px]"
          style={{
            background:
              "radial-gradient(circle at top right, rgba(20,184,166,.2) 0%, transparent 60%)",
            filter: "blur(40px)",
          }}
        />
        {/* Grid overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(20,184,166,1) 1px,transparent 1px),linear-gradient(90deg,rgba(20,184,166,1) 1px,transparent 1px)",
            backgroundSize: "52px 52px",
          }}
        />

        <Reveal>
          <div className="relative mx-auto max-w-4xl px-5 sm:px-8">
            <p className="mb-4 text-2xs font-black uppercase tracking-[0.22em] text-teal-400/60">
              {eyebrow}
            </p>
            <h1 className="font-black text-4xl leading-tight text-white sm:text-5xl lg:text-6xl">
              {title}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-white/50">
              {description}
            </p>
            <div className="mt-8 inline-flex items-center gap-2 border border-teal-700/35 bg-teal-950/60 px-4 py-2 text-xs text-teal-300/80">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-400/60" />
              Last updated: {lastUpdated}
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── Body: sidebar TOC + content ───────────────────────────────────── */}
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-20">
        <div className="lg:grid lg:grid-cols-[240px_1fr] lg:gap-16">
          {/* Sidebar TOC */}
          <aside className="mb-10 lg:mb-0">
            <div className="lg:sticky lg:top-24">
              <p className="mb-4 text-2xs font-black uppercase tracking-eyebrow text-muted-foreground/60">
                On this page
              </p>
              <TocNav toc={toc} />

              {/* Back to home */}
              <div className="mt-8 border-t border-base-300 pt-6">
                <Link
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary transition-opacity hover:opacity-75"
                  href="/"
                >
                  <ArrowLeft className="shrink-0" size={12} /> Back to Schduled
                </Link>
              </div>
            </div>
          </aside>

          {/* Content */}
          <Reveal>
            <article className="prose-legal">{children}</article>
          </Reveal>
        </div>
      </div>

      {/* ── CTA band ──────────────────────────────────────────────────────── */}
      <section className="border-t border-base-300 bg-base-200/20 py-16">
        <Reveal>
          <div className="mx-auto max-w-4xl px-5 text-center sm:px-8">
            <p className="mb-2 text-xs font-black uppercase tracking-eyebrow text-primary">
              Ready to start?
            </p>
            <h2 className="font-black text-2xl sm:text-3xl">
              Scheduling made simple. Free forever.
            </h2>
            <p className="mt-3 text-muted-foreground">
              No credit card, no paid plans. Your booking link is ready in 2
              minutes.
            </p>
            <Link
              className="mt-7 inline-flex items-center gap-2 bg-primary px-7 py-3 text-sm font-semibold text-primary-content transition-opacity hover:opacity-90"
              href="/login"
            >
              Get started free
              <ArrowRight size={14} weight="bold" />
            </Link>
          </div>
        </Reveal>
      </section>

      <LandingFooter />
    </div>
  );
}

// ── Shared prose components ─────────────────────────────────────────────────

export function LegalSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-12 scroll-mt-28" id={id}>
      <div className="mb-5 flex items-center gap-3">
        <div className="h-5 w-1 bg-primary" />
        <h2 className="font-black text-xl text-base-content">{title}</h2>
      </div>
      <div className="space-y-4 text-sm leading-relaxed text-muted-foreground pl-4">
        {children}
      </div>
    </section>
  );
}

export function LegalP({ children }: { children: React.ReactNode }) {
  return <p>{children}</p>;
}

export function LegalUl({ children }: { children: React.ReactNode }) {
  return <ul className="space-y-3">{children}</ul>;
}

export function LegalLi({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="mt-[0.38em] flex shrink-0 items-center gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-primary/70" />
        <span className="h-px w-3 bg-primary/35" />
      </span>
      <span>{children}</span>
    </li>
  );
}

export function LegalHighlight({ children }: { children: React.ReactNode }) {
  return (
    <div className="border border-primary/20 bg-primary/5 px-5 py-4 text-sm">
      <p className="font-medium text-base-content">{children}</p>
    </div>
  );
}

export function LegalTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: string[][];
}) {
  return (
    <div className="overflow-x-auto border border-base-300">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-base-200/50">
            {headers.map((h) => (
              <th
                className="px-4 py-2.5 text-left text-xs font-black uppercase tracking-ui text-muted-foreground"
                key={h}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr className="border-t border-base-300" key={i}>
              {row.map((cell, j) => (
                <td className="px-4 py-3 text-muted-foreground" key={j}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
