import type { ReactNode } from 'react';
import { ThemeToggle } from './ThemeToggle';

/** Header + footer shared by /privacy, /terms and /support, in the B×C style. */
/** `title` can be left out when the page draws its own heading; `wide` gives it the full site width. */
export function SubpageShell({ eyebrow, title, sub, wide, children }: { eyebrow?: string; title?: string; sub?: ReactNode; wide?: boolean; children: ReactNode }) {
  return (
    <div className="site min-h-screen">
      <header className="nav scrolled">
        <div className="nav-in wrap">
          <a href="/" className="brand" aria-label="Lock home">
            <img src="/icons/open-lock.png" alt="" width={34} height={34} />
            <span>Lock</span>
          </a>
          <div className="nav-act">
            <ThemeToggle />
            <a href="/" className="btn btn-ghost btn-sm" aria-label="Home">←<span> Home</span></a>
          </div>
        </div>
      </header>

      <main className="wrap" style={{ maxWidth: wide ? 1120 : 760, paddingTop: wide ? 56 : 72, paddingBottom: 96 }}>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        {title && <h1 className="h2" style={{ marginBottom: 14, maxWidth: 'none' }}>{title}</h1>}
        {sub && <div className="lead" style={{ marginBottom: 48 }}>{sub}</div>}
        {children}
      </main>

      <footer className="foot">
        <div className="wrap foot-base mono" style={{ borderTop: 0, paddingTop: 28 }}>
          <span>© 2026 Lock</span>
          <span style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            <a href="/support">Support</a>
            <a href="/sources">Sources</a>
            <a href="/compare">Compare</a>
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
            <a href="https://jkeroro.com">jkeroro.com</a>
          </span>
        </div>
      </footer>
    </div>
  );
}
