import type { ReactNode } from 'react';
import { SubpageShell } from './SubpageShell';

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
    <SubpageShell eyebrow="Legal" title={title} sub={<span className="mono small">Last updated: {lastUpdated}</span>}>
      <div className="text-[16px] leading-[1.75] mb-12" style={{ color: 'var(--fg-2)' }}>{intro}</div>

      {sections.map((s) => (
        <section key={s.title} className="py-9" style={{ borderTop: '2px solid var(--line)' }}>
          <h2 className="text-[20px] font-extrabold tracking-[-0.02em] mb-4" style={{ color: 'var(--fg)' }}>{s.title}</h2>
          <div className="text-[16px] leading-[1.75] space-y-3" style={{ color: 'var(--fg-2)' }}>{s.content}</div>
        </section>
      ))}
    </SubpageShell>
  );
}

export const B = ({ children }: { children: ReactNode }) => (
  <strong className="font-bold" style={{ color: 'var(--fg)' }}>{children}</strong>
);

export const Mail = () => (
  <a href="mailto:support@jkeroro.com" className="font-bold underline underline-offset-4 decoration-2" style={{ color: 'var(--fg)', textDecorationColor: 'var(--accent)' }}>
    support@jkeroro.com
  </a>
);

export const List = ({ items }: { items: ReactNode[] }) => (
  <ul className="list-disc pl-5 space-y-1.5">
    {items.map((item, i) => <li key={i}>{item}</li>)}
  </ul>
);
