'use client';

import { useEffect, useState } from 'react';
import {
  APPS, APP_NAMES, CHECKED, FREE_BOARD, FREE_COLUMNS, PICK_OTHER, PRICES, SOURCES,
  type AppId, type Lang, type Level,
} from './data';

/** Campaign link (ct=compare): installs from this page show up separately in App Analytics. */
const APPSTORE_URL = 'https://apps.apple.com/app/apple-store/id6762630080?pt=128801549&ct=compare&mt=8';

const UI = {
  en: {
    toggle: '中文',
    toggleLabel: 'Switch to Chinese',
    title: 'What you get before you pay',
    lead: 'Kero Lock next to Cal AI, MyFitnessPal, Lose It! and MacroFactor. US prices, checked {date}. Every number links to where it came from.',
    app: 'App',
    legend: { free: 'Free', limited: 'Some of it free', paid: 'Paid only', none: 'Not offered' },
    costTitle: 'What they cost',
    price: 'Price',
    trial: 'Trying it',
    otherTitle: 'When another app fits better',
    ctaTitle: 'Start with a free week of Pro',
    cta: [
      'Every AI feature, unlimited, for 7 days. No card.',
      'Then 3 AI photo scans a day, free, for good.',
      'Training with Apple Watch, friends and a buddy that grows, all free.',
    ],
    ctaBtn: 'Get Kero Lock on the App Store',
    sources: 'Sources',
    note: 'Prices change and differ by country; open a source to see today’s. Cal AI, MyFitnessPal, Lose It! and MacroFactor are trademarks of their owners, and Kero Lock is not affiliated with them. Spot something out of date? Email support@jkeroro.com.',
  },
  zh: {
    toggle: 'EN',
    toggleLabel: 'Switch to English',
    title: '付钱之前，能用到什么',
    lead: 'Kero Lock 和 Cal AI、MyFitnessPal、Lose It!、MacroFactor 放在一起比。美区价格，{date}核对，每个数字都标了出处。',
    app: 'App',
    legend: { free: '免费', limited: '部分免费', paid: '仅付费', none: '没有' },
    costTitle: '要花多少钱',
    price: '价格',
    trial: '怎么试用',
    otherTitle: '这些情况，别的 App 更适合你',
    ctaTitle: '先免费用一周 Pro',
    cta: [
      '7 天内所有 AI 功能不限次，不用绑卡。',
      '之后每天 3 次 AI 拍照识别，一直免费。',
      'Apple Watch 训练、好友、会长大的小伙伴，全部免费。',
    ],
    ctaBtn: '在 App Store 下载 Kero Lock',
    sources: '来源',
    note: '价格会变，各国也不同，点开来源可看当天价格。Cal AI、MyFitnessPal、Lose It! 和 MacroFactor 是各自所有者的商标，Kero Lock 与它们没有关联。发现过时的信息？请发邮件到 support@jkeroro.com。',
  },
} as const;

const footnote = (id: string) => SOURCES.findIndex((s) => s.id === id) + 1;

function Refs({ ids }: { ids?: string[] }) {
  if (!ids?.length) return null;
  return (
    <sup className="cmp-ref">
      {ids.map((id) => (
        <a key={id} href={`#src-${id}`} aria-label={`Source ${footnote(id)}`}>{footnote(id)}</a>
      ))}
    </sup>
  );
}

function Glyph({ level }: { level: Level }) {
  if (level === 'free') {
    return <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  }
  if (level === 'limited') {
    return <svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M8 2.5a5.5 5.5 0 0 1 0 11z" fill="currentColor" /></svg>;
  }
  if (level === 'paid') {
    return <svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3.5" y="7" width="9" height="6.5" rx="1.5" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M5.5 7V5.5a2.5 2.5 0 0 1 5 0V7" fill="none" stroke="currentColor" strokeWidth="2" /></svg>;
  }
  return <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 8h8" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></svg>;
}

export function CompareBody() {
  const [lang, setLang] = useState<Lang>('en');

  // Same language memory as the home page.
  useEffect(() => {
    try {
      const l = localStorage.getItem('lock-lang');
      if (l === 'en' || l === 'zh') setLang(l);
      else if (navigator.language?.toLowerCase().startsWith('zh')) setLang('zh');
    } catch { /* ignore */ }
  }, []);
  useEffect(() => { document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en'; }, [lang]);

  const toggle = () => {
    const next: Lang = lang === 'en' ? 'zh' : 'en';
    setLang(next);
    try { localStorage.setItem('lock-lang', next); } catch { /* ignore */ }
  };

  const u = UI[lang];

  return (
    <div className={`cmp lang-${lang}`}>
      <header className="cmp-head">
        <div>
          <h1 className="cmp-title">{u.title}</h1>
          <p className="cmp-lead">{u.lead.replace('{date}', CHECKED[lang])}</p>
        </div>
        <button className="chip-btn" onClick={toggle} aria-label={u.toggleLabel}>{u.toggle}</button>
      </header>

      {/* The board: what each app gives you at $0. */}
      <section aria-label={u.title}>
        <div className="cmp-board" role="table">
          <div className="cmp-row cmp-row-head" role="row">
            <span role="columnheader" className="cmp-name"><span className="sr">{u.app}</span></span>
            {FREE_COLUMNS.map((c) => <span key={c.id} role="columnheader" className="cmp-col">{c.label[lang]}</span>)}
          </div>
          {APPS.map((a: AppId, i) => (
            <div key={a} role="row" className={`cmp-row${a === 'kero' ? ' is-kero' : ''}`} style={{ '--i': i } as import('react').CSSProperties}>
              <span role="rowheader" className="cmp-name">{APP_NAMES[a]}<span className="cmp-ref-row"><Refs ids={Array.from(new Set(FREE_COLUMNS.flatMap((c) => FREE_BOARD[a][c.id].src ?? [])))} /></span></span>
              {FREE_COLUMNS.map((c) => {
                const m = FREE_BOARD[a][c.id];
                return (
                  <span key={c.id} role="cell" className="cmp-cell">
                    <span className={`cmp-mark is-${m.level}`}>
                      <Glyph level={m.level} />
                      <span>{m.v[lang]}</span>
                      <span className="sr">({u.legend[m.level]})</span>
                    </span>
                    <span className="cmp-ref-cell"><Refs ids={m.src} /></span>
                  </span>
                );
              })}
            </div>
          ))}
        </div>
        <ul className="cmp-legend" aria-hidden="true">
          {(['free', 'limited', 'paid', 'none'] as Level[]).map((l) => (
            <li key={l}><span className={`cmp-mark is-${l} is-dot`}><Glyph level={l} /></span>{u.legend[l]}</li>
          ))}
        </ul>
      </section>

      <section className="cmp-sec">
        <h2 className="cmp-h2">{u.costTitle}</h2>
        <dl className="cmp-prices">
          {APPS.map((a) => (
            <div key={a} className={`cmp-price${a === 'kero' ? ' is-kero' : ''}`}>
              <dt>{APP_NAMES[a]}</dt>
              <dd>
                <span className="cmp-price-v">{PRICES[a].price[lang]}<Refs ids={PRICES[a].src} /></span>
                <span className="cmp-price-t">{PRICES[a].trial[lang]}</span>
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="cmp-sec">
        <h2 className="cmp-h2">{u.otherTitle}</h2>
        <dl className="cmp-other">
          {(Object.keys(PICK_OTHER) as (keyof typeof PICK_OTHER)[]).map((a) => (
            <div key={a}>
              <dt>{APP_NAMES[a]}</dt>
              <dd>{PICK_OTHER[a][lang]}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="cmp-cta">
        <h2>{u.ctaTitle}</h2>
        <ul>
          {u.cta.map((x) => <li key={x}><span className="cmp-mark is-free is-dot"><Glyph level="free" /></span>{x}</li>)}
        </ul>
        <a href={APPSTORE_URL} className="btn btn-accent btn-lg">{u.ctaBtn}</a>
      </section>

      <section className="cmp-sources">
        <h2>{u.sources}</h2>
        <ol>
          {SOURCES.map((s) => (
            <li key={s.id} id={`src-${s.id}`}>
              <a href={s.url} target="_blank" rel="noopener noreferrer">{s.label}</a>
            </li>
          ))}
        </ol>
        <p>{u.note}</p>
      </section>
    </div>
  );
}
