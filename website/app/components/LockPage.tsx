'use client';
import { createElement, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { APPSTORE_URL, COPY, type Lang, type T } from './copy';

/* ── hooks ─────────────────────────────── */
function useInView<E extends Element>(threshold = 0.2) {
  const ref = useRef<E>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setSeen(true); obs.disconnect(); }
    }, { threshold, rootMargin: '0px 0px -40px 0px' });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, seen] as const;
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduced;
}

function Reveal({ children, delay = 0, className = '', as: Tag = 'div', onLoad = false }: {
  children: ReactNode; delay?: number; className?: string; as?: 'div' | 'section' | 'li' | 'h2' | 'p'; onLoad?: boolean;
}) {
  const [ref, seen] = useInView<HTMLElement>(0.05);
  /* onLoad: plain CSS entrance (hero), so above-the-fold copy never waits on JS */
  if (onLoad) return createElement(Tag, { className: `rv-load ${className}`, style: { animationDelay: `${delay * 70}ms` } }, children);
  return createElement(Tag, { ref, className: `rv ${seen ? 'in' : ''} ${className}`, style: { transitionDelay: `${delay * 60}ms` } }, children);
}

/* ── icons (stroke, currentColor) ─────── */
const I = {
  apple: (s = 18) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" /></svg>
  ),
  arrow: (s = 18) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
  ),
  check: (s = 16) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
  ),
  plus: (s = 16) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
  ),
  sun: (s = 16) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.5" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
  ),
  moon: (s = 16) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1111.2 3 7 7 0 0021 12.8z" /></svg>
  ),
  cam: (s = 20) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 8.5A2.5 2.5 0 015.5 6h2L9 4h6l1.5 2h2A2.5 2.5 0 0121 8.5v9a2.5 2.5 0 01-2.5 2.5h-13A2.5 2.5 0 013 17.5z" /><circle cx="12" cy="13" r="3.5" /></svg>
  ),
  drop: (s = 18) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true"><path d="M12 3s6 6.5 6 11a6 6 0 01-12 0c0-4.5 6-11 6-11z" /></svg>
  ),
  steps: (s = 18) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 4c1.7 0 2.5 1.8 2.5 4S9.5 12 8 12 5.5 10 5.5 8 6.3 4 8 4zM6 15h4l-.4 2.2a2 2 0 01-3.2 0zM16 8c1.7 0 2.5 1.8 2.5 4s-1 4-2.5 4-2.5-2-2.5-4 .8-4 2.5-4zM14 19h4l-.4 2a2 2 0 01-3.2 0z" /></svg>
  ),
  flame: (s = 16) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true"><path d="M12 2.5s-1 3.8-3.8 6.6C5.6 11.7 5 14 5 15.5a7 7 0 0014 0c0-2.8-1.8-4.8-2.8-6.6C14.8 6.2 12 2.5 12 2.5z" /></svg>
  ),
  chev: (s = 18) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
  ),
  play: (s = 14) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15a1 1 0 001.5.86l12-7.5a1 1 0 000-1.72l-12-7.5A1 1 0 007 4.5z" /></svg>
  ),
  timer: (s = 14) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="13.5" r="7.5" /><path d="M12 9.5v4l2.5 2M9.5 2.5h5" /></svg>
  ),
  arrowUp: (s = 14) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 19V5M6 11l6-6 6 6" /></svg>
  ),
  spark: (s = 14) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l2.2 6.8L21 11l-6.8 2.2L12 20l-2.2-6.8L3 11l6.8-2.2z" /></svg>
  ),
};

/* ── Open Lock: shackle = progress arc; at the goal it snaps shut ── */
function OpenLock({ progress, locked, className = '' }: { progress: number; locked: boolean; className?: string }) {
  const p = Math.max(0, Math.min(1, progress));
  const d = 'M62 124 V80 A38 38 0 0 1 138 80 V124';
  return (
    <svg viewBox="0 0 200 236" className={`olock ${locked ? 'is-locked' : ''} ${className}`} aria-hidden="true">
      <g className="olock-shackle">
        <path d={d} fill="none" stroke="#262626" strokeWidth="18" strokeLinecap="round" />
        <path d={d} fill="none" stroke="#FFD43B" strokeWidth="18" strokeLinecap="round"
          pathLength={100} strokeDasharray="100" strokeDashoffset={100 - p * 100} className="olock-arc" />
      </g>
      <g className="olock-body">
        <rect x="42" y="124" width="140" height="102" rx="24" fill="#FFD43B" />
        <rect x="32" y="114" width="140" height="102" rx="24" fill="#F2F1EC" />
        <circle cx="102" cy="156" r="13" fill="#0A0A0A" />
        <path d="M95 162h14l4 30H91z" fill="#0A0A0A" />
      </g>
    </svg>
  );
}

/* ── Ring dial ─────────────────────────── */
function Dial({ pct, children, size = 220 }: { pct: number; children?: ReactNode; size?: number }) {
  const r = 84, c = 2 * Math.PI * r;
  return (
    <div className="dial" style={{ width: size, height: size }}>
      <svg viewBox="0 0 200 200" aria-hidden="true">
        <circle cx="100" cy="100" r={r} fill="none" stroke="var(--track)" strokeWidth="18" />
        <circle cx="100" cy="100" r={r} fill="none" stroke="var(--accent)" strokeWidth="18" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)} transform="rotate(-90 100 100)" className="dial-arc" />
      </svg>
      <div className="dial-center">{children}</div>
    </div>
  );
}

const fmt = (n: number) => n.toLocaleString('en-US');

/* ── Nav ──────────────────────────────── */
function Nav({ t, toggleLang, dark, toggleDark }: { t: T; toggleLang: () => void; dark: boolean; toggleDark: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  return (
    <header className={`nav ${scrolled ? 'scrolled' : ''}`}>
      <div className="nav-in wrap">
        <a href="#top" className="brand" aria-label="Lock home">
          <img src="/icons/open-lock.png" alt="" width={34} height={34} />
          <span>Lock</span>
        </a>
        <nav className="nav-links" aria-label="Sections">
          <a href="#how">{t.nav.how}</a>
          <a href="#features">{t.nav.features}</a>
          <a href="#train">{t.nav.train}</a>
          <a href="#social">{t.nav.social}</a>
          <a href="#pricing">{t.nav.pricing}</a>
          <a href="#faq">{t.nav.faq}</a>
        </nav>
        <div className="nav-act">
          <button className="chip-btn" onClick={toggleDark} aria-label={dark ? t.themeLight : t.themeDark}>
            {dark ? I.sun() : I.moon()}
          </button>
          <button className="chip-btn mono" onClick={toggleLang} aria-label="Switch language">{t.langLabel}</button>
          <a href={APPSTORE_URL} className="btn btn-accent btn-sm">{I.apple(15)}<span>{t.download}</span></a>
        </div>
      </div>
    </header>
  );
}

/* ── Hero ─────────────────────────────── */
function Hero({ t }: { t: T }) {
  const reduced = useReducedMotion();
  const meals = t.hero.meals;
  const goal = meals.reduce((s, m) => s + m.k, 0);
  const [count, setCount] = useState(0);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    if (reduced) { setCount(meals.length); setLocked(true); return; }
    let alive = true;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const run = () => {
      if (!alive) return;
      setLocked(false); setCount(0);
      meals.forEach((_, i) => timers.push(setTimeout(() => alive && setCount(i + 1), 900 + i * 1100)));
      const end = 900 + meals.length * 1100;
      timers.push(setTimeout(() => alive && setLocked(true), end));
      timers.push(setTimeout(run, end + 3400));
    };
    run();
    return () => { alive = false; timers.forEach(clearTimeout); };
  }, [reduced, meals]);

  const total = meals.slice(0, count).reduce((s, m) => s + m.k, 0);

  return (
    <section className="hero wrap" id="top">
      <div className="hero-copy">
        <Reveal onLoad><p className="eyebrow">{t.hero.eyebrow}</p></Reveal>
        <h1 className="hero-title">
          {t.hero.lines.map((l, i) => (
            <Reveal onLoad key={i} delay={i + 1} className={`hl ${i === 2 ? 'hl-mark' : ''}`}><span>{l}</span></Reveal>
          ))}
        </h1>
        <Reveal onLoad delay={4}><p className="lead">{t.hero.sub}</p></Reveal>
        <Reveal onLoad delay={5} className="hero-cta">
          <a href={APPSTORE_URL} className="btn btn-ink btn-lg">{I.apple(18)}<span>{t.hero.cta}</span></a>
          <a href="#how" className="btn btn-ghost btn-lg"><span>{t.hero.cta2}</span>{I.arrow(18)}</a>
        </Reveal>
        <Reveal onLoad delay={6}>
          <ul className="meta mono">{t.hero.meta.map((m) => <li key={m}>{m}</li>)}</ul>
        </Reveal>
      </div>

      <Reveal onLoad delay={2} className="stage-wrap">
        <div className="stage" role="img" aria-label={`${t.hero.today}: ${fmt(goal)} / ${fmt(goal)} ${t.hero.kcal}. ${t.hero.locked}.`}>
          <div className="stage-top mono">
            <span>{t.hero.today}</span>
            <span>{t.hero.goal} {fmt(goal)}</span>
          </div>
          <div className="stage-lock">
            <OpenLock progress={total / goal} locked={locked} />
            <span className={`sticker sticker-lock ${locked ? 'on' : ''}`}>{I.check(14)}{t.hero.locked}</span>
          </div>
          <div className="stage-count">
            <span className="big tnum">{fmt(total)}</span>
            <span className="mono small">/ {fmt(goal)} {t.hero.kcal}</span>
          </div>
          <ul className="tickets">
            {meals.map((m, i) => (
              <li key={m.n} className={`ticket ${i < count ? 'on' : ''}`} style={{ '--r': `${[-2, 1.5, -1, 2][i]}deg` } as CSSProperties}>
                <span>{m.n}</span>
                <span className="mono">+{m.k}</span>
              </li>
            ))}
          </ul>
        </div>
      </Reveal>
    </section>
  );
}

/* ── Ticker ───────────────────────────── */
function Ticker({ t }: { t: T }) {
  const items = [...t.ticker, ...t.ticker];
  return (
    <div className="ticker" aria-hidden="true">
      <div className="ticker-track mono">
        {items.map((s, i) => <span key={i}>{s}<i>✕</i></span>)}
      </div>
    </div>
  );
}

/* ── How it works ─────────────────────── */
function How({ t }: { t: T }) {
  const h = t.how;
  return (
    <section className="sec wrap" id="how">
      <Reveal><p className="eyebrow">{h.eyebrow}</p></Reveal>
      <Reveal delay={1} as="h2"><span className="h2">{h.title}</span></Reveal>
      <ol className="steps">
        <Reveal as="li" delay={1} className="step card">
          <div className="step-vis snap">
            <div className="frame"><span className="c tl" /><span className="c tr" /><span className="c bl" /><span className="c br" />
              <div className="plate" aria-hidden="true"><span className="rice" /><span className="chk" /><span className="grn" /></div>
              <span className="scanline" />
            </div>
            <span className="tag mono">{I.cam(14)} {h.scan}…</span>
          </div>
          <div className="step-txt"><span className="num mono">01</span><h3>{h.steps[0].k}</h3><p>{h.steps[0].d}</p></div>
        </Reveal>
        <Reveal as="li" delay={2} className="step card">
          <div className="step-vis read">
            <p className="food">{h.food}</p>
            <p className="kc tnum">650 <span className="mono">kcal</span></p>
            <div className="mac">
              {[[h.macros.p, '38g', 0.62], [h.macros.c, '82g', 0.84], [h.macros.f, '17g', 0.4]].map(([k, v, w]) => (
                <div key={k as string} className="mac-row">
                  <span className="mono">{k as string}</span>
                  <span className="bar"><i style={{ width: `${(w as number) * 100}%` }} /></span>
                  <span className="mono v">{v as string}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="step-txt"><span className="num mono">02</span><h3>{h.steps[1].k}</h3><p>{h.steps[1].d}</p></div>
        </Reveal>
        <Reveal as="li" delay={3} className="step card">
          <div className="step-vis done">
            <div className="row-log"><span>{h.food}</span><span className="mono">650</span></div>
            <span className="sticker sticker-tilt">{I.check(14)}{h.logged}</span>
          </div>
          <div className="step-txt"><span className="num mono">03</span><h3>{h.steps[2].k}</h3><p>{h.steps[2].d}</p></div>
        </Reveal>
      </ol>
    </section>
  );
}

/* ── Features bento ───────────────────── */
function Features({ t }: { t: T }) {
  const f = t.features;
  const [dialRef, dialIn] = useInView<HTMLDivElement>(0.3);
  const logged = [1, 2, 3, 4, 6, 7, 8, 9, 10, 11, 13, 14, 15, 16, 17, 18, 20, 21, 22, 23, 24, 25, 27, 28, 29, 30];
  const hit = [2, 3, 7, 9, 10, 14, 16, 17, 21, 22, 23, 24, 28, 29];
  const today = 30;
  return (
    <section className="sec wrap" id="features">
      <Reveal><p className="eyebrow">{f.eyebrow}</p></Reveal>
      <Reveal delay={1} as="h2"><span className="h2">{f.title}</span></Reveal>

      <div className="bento">
        {/* dial */}
        <Reveal className="cell c7 card hero-card">
          <div className="cell-txt"><h3>{f.dial.t}</h3><p>{f.dial.d}</p></div>
          <div className="dial-row" ref={dialRef}>
            <Dial pct={dialIn ? 0.36 : 0}>
              <span className="big tnum">1,240</span>
              <span className="mono small">{f.dial.left}</span>
            </Dial>
            <div className="dial-side">
              {([[92, 140], [160, 210], [41, 65]] as const).map(([v, g], i) => (
                <div className="mac-row" key={i}>
                  <span className="mono">{f.dial.macros[i]}</span>
                  <span className="bar"><i style={{ width: dialIn ? `${(v / g) * 100}%` : 0 }} /></span>
                  <span className="mono v">{v}/{g}g</span>
                </div>
              ))}
              <div className="mini-chips">
                <span className="mini">{I.drop(15)}<b className="tnum">1.6</b>/2.5 L</span>
                <span className="mini">{I.steps(15)}<b className="tnum">7,420</b></span>
              </div>
            </div>
          </div>
        </Reveal>

        {/* scan */}
        <Reveal delay={1} className="cell c5 card">
          <div className="cell-txt"><h3>{f.scan.t}</h3><p>{f.scan.d}</p></div>
          <div className="scan-vis">
            <div className="seg mono" role="presentation">
              {f.scan.modes.map((m, i) => <span key={m} className={i === 2 ? 'on' : ''}>{m}</span>)}
            </div>
            <div className="barcode" aria-hidden="true">
              {[3,1,2,1,3,2,1,1,2,3,1,2,1,1,3,1,2,2,1,3,1,1,2,1,3,2,1,2].map((w, i) => <i key={i} style={{ width: w * 3 }} />)}
              <span className="laser" />
            </div>
            <span className="sticker sticker-tilt2">{f.scan.unlimited}</span>
          </div>
        </Reveal>

        {/* calendar */}
        <Reveal className="cell c5 card">
          <div className="cell-txt"><h3>{f.cal.t}</h3><p>{f.cal.d}</p></div>
          <div className="cal">
            <div className="cal-head mono"><span>{f.cal.month}</span><span className="legend"><i className="lg l" />{f.cal.legend[0]}<i className="lg h" />{f.cal.legend[1]}</span></div>
            <div className="cal-grid" aria-hidden="true">
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                <span key={d} className={`${hit.includes(d) ? 'h' : logged.includes(d) ? 'l' : ''} ${d === today ? 'td' : ''}`} />
              ))}
            </div>
            <p className="cal-sum mono">
              <span><b className="tnum">{logged.length}</b> {f.cal.summary[0]}</span>
              <span><b className="tnum">{hit.length}</b> {f.cal.summary[1]}</span>
            </p>
          </div>
        </Reveal>

        {/* water */}
        <Reveal delay={1} className="cell c7 card inverse">
          <div className="cell-txt"><h3>{f.water.t}</h3><p>{f.water.d}</p></div>
          <div className="water">
            <div className="glasses" aria-hidden="true">
              {Array.from({ length: 8 }, (_, i) => <span key={i} className={i < 5 ? 'f' : ''}>{I.drop(20)}</span>)}
              <button className="add" tabIndex={-1} aria-hidden="true">{I.plus(16)}</button>
            </div>
            <div className="ask">
              <p>{f.water.ask}</p>
              <div className="ask-btns"><span className="b y">{f.water.yes}</span><span className="b">{f.water.no}</span></div>
            </div>
            <div className="health mono">
              <span>{I.steps(15)} {f.water.steps} <b className="tnum">7,420</b></span>
              <span>{I.flame(15)} {f.water.energy} <b className="tnum">486</b> kcal</span>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ── Train ────────────────────────────── */
function Train({ t }: { t: T }) {
  const tr = t.train;
  const todayIdx = 4; // Friday in a Mon-first week
  const wd = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const sets = [
    { last: '95 × 5', kg: '97.5', reps: '5', done: true },
    { last: '95 × 5', kg: '97.5', reps: '5', done: true },
    { last: '95 × 5', kg: '100', reps: '5', done: true, pr: true },
    { last: '95 × 4', kg: '100', reps: '4', done: false },
  ];
  /* 30 days of weigh-ins, gently down: a fixed path so the mock never jitters */
  const pts = [78.4, 78.6, 78.3, 78.1, 78.2, 77.9, 77.8, 77.9, 77.6, 77.5, 77.6, 77.3, 77.2, 77.3, 77.0, 76.9, 77.0, 76.8, 76.6, 76.6];
  const lo = 76.3, hi = 78.9;
  const path = pts.map((v, i) => `${i === 0 ? 'M' : 'L'}${(i / (pts.length - 1)) * 300},${((hi - v) / (hi - lo)) * 100}`).join(' ');
  const [ref, seen] = useInView<HTMLDivElement>(0.3);
  return (
    <section className="sec wrap" id="train">
      <Reveal><p className="eyebrow">{tr.eyebrow}</p></Reveal>
      <Reveal delay={1} as="h2"><span className="h2">{tr.title}</span></Reveal>
      <Reveal delay={2}><p className="lead train-lead">{tr.sub}</p></Reveal>

      <div className="bento">
        {/* weekly plan */}
        <Reveal className="cell c5 card">
          <div className="cell-txt"><h3>{tr.plan.t}</h3><p>{tr.plan.d}</p></div>
          <div className="week" aria-hidden="true">
            {tr.plan.days.map((d, i) => {
              const rest = d === tr.plan.days[2];
              return (
                <span key={i} className={`wk ${i === todayIdx ? 'on' : ''} ${rest ? 'rest' : ''}`}>
                  <i className="mono">{wd[i]}</i>
                  <b>{d}</b>
                </span>
              );
            })}
          </div>
          <div className="today-card">
            <span className="mono small">{tr.plan.today}</span>
            <p className="tc-title">{tr.plan.todayTitle}</p>
            <p className="mono small tc-meta">{tr.plan.todayMeta}</p>
            <span className="tc-btn">{I.play(13)} {tr.plan.start}</span>
          </div>
        </Reveal>

        {/* guided sets */}
        <Reveal delay={1} className="cell c7 card hero-card">
          <div className="cell-txt"><h3>{tr.guided.t}</h3><p>{tr.guided.d}</p></div>
          <div className="sets" ref={ref}>
            <div className="sets-head"><span className="ex">{tr.guided.exercise}</span><span className="rest-pill mono">{I.timer(13)} {tr.guided.rest} <b className="tnum">1:24</b></span></div>
            <div className="sets-row sets-cols mono" aria-hidden="true">{tr.guided.cols.map((c) => <span key={c}>{c}</span>)}<span /></div>
            {sets.map((r, i) => (
              <div key={i} className={`sets-row ${r.done && seen ? 'done' : ''}`} style={{ transitionDelay: `${i * 160}ms` }}>
                <span className="mono">{i + 1}</span>
                <span className="mono dim">{r.last}</span>
                <span className="tnum v">{r.kg}</span>
                <span className="tnum v">{r.reps}</span>
                <span className="ck">{I.check(14)}</span>
              </div>
            ))}
            <span className={`sticker sticker-pr ${seen ? 'on' : ''}`}>{I.spark(12)} {tr.guided.pr}</span>
          </div>
        </Reveal>

        {/* finish */}
        <Reveal className="cell c4 card">
          <div className="cell-txt"><h3>{tr.done.t}</h3><p>{tr.done.d}</p></div>
          <div className="done-grid">
            {tr.done.stats.map(([k, v]) => (
              <div key={k} className="dg"><span className="mono small">{k}</span><b className="tnum">{v}</b></div>
            ))}
          </div>
          <p className="bump mono">{I.arrowUp(14)} {tr.done.next}</p>
        </Reveal>

        {/* diet x training */}
        <Reveal delay={1} className="cell c4 card inverse">
          <div className="cell-txt"><h3>{tr.diet.t}</h3><p>{tr.diet.d}</p></div>
          <div className="dxt">
            <div className="dxt-row">
              <span className="mono">{tr.diet.protein}</span>
              <span className="dxt-badge mono">{tr.diet.badge}</span>
            </div>
            <span className="bar inv"><i style={{ width: seen ? '72%' : 0 }} /></span>
            <p className="mono small dxt-num"><b className="tnum">115</b> / 160 g</p>
            <div className="insight">
              <span className="mono ai">{I.spark(12)} {tr.diet.ai}</span>
              <p>{tr.diet.insight}</p>
            </div>
          </div>
        </Reveal>

        {/* weight curve */}
        <Reveal delay={2} className="cell c4 card">
          <div className="cell-txt"><h3>{tr.weight.t}</h3><p>{tr.weight.d}</p></div>
          <div className="wcurve">
            <div className="seg mono" role="presentation">{tr.weight.ranges.map((r, i) => <span key={r} className={i === 0 ? 'on' : ''}>{r}</span>)}</div>
            <svg viewBox="-6 -8 312 116" aria-hidden="true" preserveAspectRatio="none">
              <path d={path} fill="none" stroke="var(--fg)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
              <circle cx="300" cy={((hi - pts[pts.length - 1]) / (hi - lo)) * 100} r="6" fill="var(--accent)" stroke="var(--fg)" strokeWidth="2" />
            </svg>
            <p className="mono small wc-change"><b className="tnum">76.6</b> kg · {tr.weight.change}</p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ── Social ───────────────────────────── */
function Social({ t }: { t: T }) {
  const s = t.social;
  const rows = [
    { n: 'Mia', d: 46 },
    { n: s.you, d: 30, me: true },
    { n: 'Leo', d: 21 },
    { n: 'Sam', d: 12 },
    { n: 'Ava', d: 9 },
  ];
  const [ref, seen] = useInView<HTMLDivElement>(0.3);
  return (
    <section className="sec social-sec" id="social">
      <div className="wrap social-grid">
        <div>
          <Reveal><p className="eyebrow">{s.eyebrow}</p></Reveal>
          <Reveal delay={1} as="h2"><span className="h2">{s.title}</span></Reveal>
          <Reveal delay={2}><p className="lead">{s.sub}</p></Reveal>
          <Reveal delay={3}>
            <ul className="ticks">{s.bullets.map((b) => <li key={b}><span className="tick">{I.check(13)}</span>{b}</li>)}</ul>
          </Reveal>
          <Reveal delay={4}><p className="invite mono">{I.plus(14)} {s.invite}</p></Reveal>
        </div>
        <Reveal delay={2} className="board-wrap">
          <div className="card board" ref={ref}>
            <div className="board-head"><h3>{s.board}</h3><span className="mono small">{I.flame(14)}</span></div>
            <ol>
              {rows.map((r, i) => (
                <li key={r.n} className={r.me ? 'me' : ''}>
                  <span className="rk mono">{String(i + 1).padStart(2, '0')}</span>
                  <span className="av" aria-hidden="true">{r.n[0]}</span>
                  <span className="nm">{r.n}</span>
                  <span className="dy mono"><b className="tnum">{r.d}</b> {s.days}</span>
                </li>
              ))}
            </ol>
          </div>
          <div className="card streak-card">
            <span className="mono small">{s.streak}</span>
            <div className="chain" aria-hidden="true">
              {Array.from({ length: 30 }, (_, i) => <i key={i} className={seen ? 'on' : ''} style={{ transitionDelay: `${i * 30}ms` }} />)}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ── Icons ────────────────────────────── */
function Icons({ t }: { t: T }) {
  const files = ['open-lock', 'ring-l', 'sticker-l', 'keyhole-dial'];
  return (
    <section className="sec wrap icons-sec" id="icons">
      <div className="icons-head">
        <div>
          <Reveal><p className="eyebrow">{t.icons.eyebrow}</p></Reveal>
          <Reveal delay={1} as="h2"><span className="h2">{t.icons.title}</span></Reveal>
        </div>
        <Reveal delay={2}><p className="lead">{t.icons.sub}</p></Reveal>
      </div>
      <ul className="icon-row">
        {files.map((f, i) => (
          <Reveal as="li" key={f} delay={i} className="icon-item">
            <img src={`/icons/${f}.png`} alt={`${t.icons.names[i]} app icon`} width={180} height={180} loading="lazy" />
            <span className="mono">{t.icons.names[i]}{i === 0 && <em>{t.icons.def}</em>}</span>
          </Reveal>
        ))}
      </ul>
    </section>
  );
}

/* ── Pricing ──────────────────────────── */
function Pricing({ t }: { t: T }) {
  const p = t.pricing;
  const Plan = ({ plan, pro }: { plan: typeof p.free | typeof p.pro; pro?: boolean }) => (
    <div className={`card plan ${pro ? 'pro' : ''}`}>
      <div className="plan-top">
        <span className={`mono plan-name ${pro ? 'sticker' : ''}`}>{plan.name}</span>
        <p className="plan-price">{plan.price}</p>
        <p className="plan-note">{plan.note}</p>
      </div>
      <ul className="ticks">{plan.list.map((x) => <li key={x}><span className="tick">{I.check(13)}</span>{x}</li>)}</ul>
      <a href={APPSTORE_URL} className={`btn ${pro ? 'btn-accent' : 'btn-ink'} btn-md`}>{I.apple(15)}<span>{p.cta}</span></a>
    </div>
  );
  return (
    <section className="sec wrap" id="pricing">
      <Reveal><p className="eyebrow">{p.eyebrow}</p></Reveal>
      <Reveal delay={1} as="h2"><span className="h2">{p.title}</span></Reveal>
      <div className="plans">
        <Reveal delay={1}><Plan plan={p.free} /></Reveal>
        <Reveal delay={2}><Plan plan={p.pro} pro /></Reveal>
      </div>
    </section>
  );
}

/* ── FAQ ──────────────────────────────── */
function Faq({ t }: { t: T }) {
  const [open, setOpen] = useState(0);
  return (
    <section className="sec wrap faq-sec" id="faq">
      <div>
        <Reveal><p className="eyebrow">{t.faq.eyebrow}</p></Reveal>
        <Reveal delay={1} as="h2"><span className="h2">{t.faq.title}</span></Reveal>
      </div>
      <div className="faq">
        {t.faq.items.map((it, i) => (
          <div key={it.q} className={`qa ${open === i ? 'open' : ''}`}>
            <h3>
              <button aria-expanded={open === i} aria-controls={`qa-${i}`} id={`qq-${i}`} onClick={() => setOpen(open === i ? -1 : i)}>
                <span>{it.q}</span><span className="qi">{I.chev(18)}</span>
              </button>
            </h3>
            <div className="qa-a" id={`qa-${i}`} role="region" aria-labelledby={`qq-${i}`}>
              <div><p>{it.a}</p></div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── Final CTA ────────────────────────── */
function FinalCta({ t }: { t: T }) {
  const [ref, seen] = useInView<HTMLDivElement>(0.4);
  const [p, setP] = useState(0);
  const [locked, setLocked] = useState(false);
  useEffect(() => {
    if (!seen) return;
    const a = setTimeout(() => setP(1), 150);
    const b = setTimeout(() => setLocked(true), 1000);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, [seen]);
  return (
    <section className="final">
      <div className="wrap final-in" ref={ref}>
        <OpenLock progress={p} locked={locked} className="final-lock" />
        <div>
          <h2 className="final-title">{t.cta.title}</h2>
          <p className="lead">{t.cta.sub}</p>
          <a href={APPSTORE_URL} className="btn btn-accent btn-lg">{I.apple(18)}<span>{t.cta.btn}</span></a>
        </div>
      </div>
    </section>
  );
}

/* ── Footer ───────────────────────────── */
function Footer({ t }: { t: T }) {
  const f = t.footer;
  return (
    <footer className="foot">
      <div className="wrap foot-in">
        <div className="foot-brand">
          <a href="#top" className="brand"><img src="/icons/open-lock.png" alt="" width={34} height={34} /><span>Lock</span></a>
          <p>{f.tag}</p>
        </div>
        <nav className="foot-col" aria-label={f.product}>
          <span className="mono">{f.product}</span>
          <a href="#how">{t.nav.how}</a><a href="#features">{t.nav.features}</a><a href="#train">{t.nav.train}</a><a href="#pricing">{t.nav.pricing}</a><a href="#faq">{t.nav.faq}</a>
        </nav>
        <nav className="foot-col" aria-label={f.company}>
          <span className="mono">{f.company}</span>
          <a href="/support">{f.links.support}</a><a href="/privacy">{f.links.privacy}</a><a href="/terms">{f.links.terms}</a><a href={APPSTORE_URL}>App Store</a>
        </nav>
      </div>
      <div className="wrap foot-base mono">
        <span>{f.rights}</span>
        <span>{f.by} <a href="https://jkeroro.com">jkeroro.com</a></span>
      </div>
    </footer>
  );
}

/* ── Page ─────────────────────────────── */
export default function LockPage() {
  const [lang, setLang] = useState<Lang>('en');
  const [dark, setDark] = useState(false);

  useEffect(() => {
    try {
      const l = localStorage.getItem('lock-lang');
      if (l === 'en' || l === 'zh') setLang(l);
      else if (navigator.language?.toLowerCase().startsWith('zh')) setLang('zh');
    } catch { /* storage unavailable */ }
    setDark(document.documentElement.classList.contains('dark'));
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
  }, [lang]);

  const toggleLang = () => {
    const next: Lang = lang === 'en' ? 'zh' : 'en';
    setLang(next);
    try { localStorage.setItem('lock-lang', next); } catch { /* ignore */ }
  };
  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    try { localStorage.setItem('lock-theme', next ? 'dark' : 'light'); } catch { /* ignore */ }
  };

  const t = COPY[lang];
  return (
    <div className={`site lang-${lang}`}>
      <a href="#how" className="skip">Skip to content</a>
      <Nav t={t} toggleLang={toggleLang} dark={dark} toggleDark={toggleDark} />
      <main>
        <Hero t={t} />
        <Ticker t={t} />
        <How t={t} />
        <Features t={t} />
        <Train t={t} />
        <Social t={t} />
        <Icons t={t} />
        <Pricing t={t} />
        <Faq t={t} />
        <FinalCta t={t} />
      </main>
      <Footer t={t} />
    </div>
  );
}
