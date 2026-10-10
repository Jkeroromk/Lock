import type { ReactNode } from 'react';
import { ThemeToggle } from './ThemeToggle';

export interface LegalSection {
  title: string;
  content: ReactNode;
}

/** Shared layout for /privacy and /terms. */
export function LegalPage({
  title,
  lastUpdated,
  intro,
  sections,
}: {
  title: string;
  lastUpdated: string;
  intro: ReactNode;
  sections: LegalSection[];
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-10 h-[60px] flex items-center justify-between">
        <a href="/" className="text-[18px] font-black tracking-[-0.04em] text-foreground">Lock</a>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <a href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">← Back</a>
        </div>
      </header>

      <main className="max-w-[720px] mx-auto px-8 py-[72px] pb-24">
        <p className="text-[11px] font-bold text-muted-foreground tracking-[0.12em] uppercase mb-4">Legal</p>
        <h1 className="text-[clamp(32px,5vw,48px)] font-black tracking-[-0.03em] text-foreground mb-3">
          {title}
        </h1>
        <p className="text-sm text-muted-foreground/60 mb-16">Last updated: {lastUpdated}</p>

        <div className="text-[15px] text-muted-foreground leading-[1.8] mb-12">{intro}</div>

        {sections.map((s) => (
          <div key={s.title} className="border-t border-border py-9">
            <h2 className="text-[15px] font-extrabold tracking-[-0.01em] text-foreground mb-4">{s.title}</h2>
            <div className="text-[15px] text-muted-foreground leading-[1.8] space-y-3">{s.content}</div>
          </div>
        ))}
      </main>

      <footer className="border-t border-border px-10 py-6">
        <div className="flex justify-between items-center max-w-[720px] mx-auto flex-wrap gap-3">
          <a href="/" className="text-sm text-muted-foreground/60 hover:text-muted-foreground transition-colors">← Lock</a>
          <div className="flex gap-6">
            <a href="/privacy" className="text-sm text-muted-foreground/60 hover:text-muted-foreground transition-colors">Privacy</a>
            <a href="/terms" className="text-sm text-muted-foreground/60 hover:text-muted-foreground transition-colors">Terms</a>
            <a href="/support" className="text-sm text-muted-foreground/60 hover:text-muted-foreground transition-colors">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export const B = ({ children }: { children: ReactNode }) => (
  <strong className="text-foreground font-bold">{children}</strong>
);

export const Mail = () => (
  <a href="mailto:support@jkeroro.com" className="text-foreground underline underline-offset-4 hover:opacity-70 transition-opacity">
    support@jkeroro.com
  </a>
);

export const List = ({ items }: { items: ReactNode[] }) => (
  <ul className="list-disc pl-5 space-y-1.5">
    {items.map((item, i) => <li key={i}>{item}</li>)}
  </ul>
);
