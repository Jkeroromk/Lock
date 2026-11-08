'use client';

import { useEffect, useState } from 'react';
import { APPS, APP_NAMES, CHECKED, PICK_OTHER, ROWS, SOURCES, type AppId, type Lang } from './data';

/** Campaign link (ct=compare): installs from this page show up separately in App Analytics. */
const APPSTORE_URL = 'https://apps.apple.com/app/apple-store/id6762630080?pt=128801549&ct=compare&mt=8';

const UI = {
  en: {
    toggle: '中文',
    lead: 'What you get for free, what you pay, and where each app is the better pick. Prices are US App Store or official-site prices, linked below.',
    feature: 'Feature',
    whyTitle: 'Why people pick Kero Lock',
    why: [
      ['A free plan that still works', 'After the free Pro week you keep 3 AI photo scans a day, plus unlimited barcode and manual logging. No card to start.'],
      ['Training in the same app', 'A weekly plan or one built by AI, sets and weights on Apple Watch, and your protein goal moves with training days.'],
      ['Friends who keep you going', 'Friends, a shared couple space and a buddy that grows when you log and train.'],
      ['Numbers you can check', 'Calorie, protein, water and step targets come from published guidelines, all listed on our sources page.'],
    ],
    otherTitle: 'When another app is the better pick',
    otherIf: 'Pick {app} if…',
    sourcesTitle: 'Sources',
    note: 'Checked {date}. Prices change and differ by country; tap a source to see today’s price. Cal AI, MyFitnessPal, Lose It! and MacroFactor are trademarks of their owners. Kero Lock is not affiliated with them. Spot something out of date? Email support@jkeroro.com.',
    cta: 'Get Kero Lock on the App Store',
    scroll: 'Scroll the table sideways →',
  },
  zh: {
    toggle: 'EN',
    lead: '免费能用什么、要付多少钱、什么情况下别的 App 更适合你。价格来自美区 App Store 或官网，来源都在下面。',
    feature: '功能',
    whyTitle: '为什么选 Kero Lock',
    why: [
      ['免费版真的能用', '免费 Pro 周结束后，每天仍有 3 次 AI 拍照识别，扫条码和手动记录不限次数。开始不用绑卡。'],
      ['训练也在同一个 App', '每周训练计划或 AI 帮你排，Apple Watch 上记组数和重量，训练日的蛋白质目标会自动调高。'],
      ['有朋友一起坚持', '好友、情侣空间，还有一只你记录和训练就会长大的小伙伴。'],
      ['数字有出处', '热量、蛋白质、饮水和步数目标都来自已发表的指南，全部列在资料来源页。'],
    ],
    otherTitle: '这些情况，别的 App 可能更适合你',
    otherIf: '选 {app}，如果……',
    sourcesTitle: '来源',
    note: '核对日期：{date}。价格会变，各国也不同，点来源可以看当天价格。Cal AI、MyFitnessPal、Lose It! 和 MacroFactor 是各自所有者的商标，Kero Lock 与它们没有关联。发现过时的信息？请发邮件到 support@jkeroro.com。',
    cta: '在 App Store 下载 Kero Lock',
    scroll: '表格可以左右滑动 →',
  },
} as const;

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
  const footnote = (id: string) => SOURCES.findIndex((s) => s.id === id) + 1;
  const linkStyle = { color: 'var(--fg)', textDecorationColor: 'var(--accent)' } as const;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 32 }}>
        <p className="lead" style={{ margin: 0 }}>{u.lead}</p>
        <button className="chip-btn mono" onClick={toggle} aria-label="Switch language" style={{ flexShrink: 0 }}>{u.toggle}</button>
      </div>

      <p className="mono small" style={{ color: 'var(--fg-2)', marginBottom: 8 }}>{u.scroll}</p>
      <div style={{ overflowX: 'auto', border: '2px solid var(--line)', borderRadius: 18, marginBottom: 12 }}>
        <table style={{ borderCollapse: 'collapse', minWidth: 760, width: '100%', fontSize: 14, lineHeight: 1.45 }}>
          <thead>
            <tr>
              <th scope="col" style={th}>{u.feature}</th>
              {APPS.map((a) => (
                <th key={a} scope="col" style={{ ...th, ...(a === 'kero' ? keroCol : null) }}>{APP_NAMES[a]}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.label.en}>
                <th scope="row" style={{ ...td, fontWeight: 800, textAlign: 'left' }}>{r.label[lang]}</th>
                {APPS.map((a: AppId) => {
                  const cell = r.cells[a];
                  return (
                    <td key={a} style={{ ...td, ...(a === 'kero' ? keroCol : null), fontWeight: cell.good ? 700 : 400 }}>
                      {cell.v[lang]}
                      {cell.src?.map((id) => (
                        <sup key={id}>
                          <a href={`#src-${id}`} style={{ ...linkStyle, marginLeft: 2 }}>[{footnote(id)}]</a>
                        </sup>
                      ))}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="text-[24px] font-extrabold tracking-[-0.02em] mt-14 mb-5">{u.whyTitle}</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
        {u.why.map(([title, body]) => (
          <div key={title} className="card" style={{ padding: 20 }}>
            <h3 className="text-[17px] font-bold">{title}</h3>
            <p className="text-[15px] leading-relaxed mt-2" style={{ color: 'var(--fg-2)' }}>{body}</p>
          </div>
        ))}
      </div>

      <h2 className="text-[24px] font-extrabold tracking-[-0.02em] mt-14 mb-5">{u.otherTitle}</h2>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, borderTop: '2px solid var(--line)' }}>
        {(Object.keys(PICK_OTHER) as (keyof typeof PICK_OTHER)[]).map((a) => (
          <li key={a} className="py-4" style={{ borderBottom: '2px solid var(--line)' }}>
            <p className="text-[16px] font-bold">{u.otherIf.replace('{app}', APP_NAMES[a])}</p>
            <p className="text-[15px] leading-relaxed mt-1" style={{ color: 'var(--fg-2)' }}>{PICK_OTHER[a][lang]}</p>
          </li>
        ))}
      </ul>

      <div style={{ textAlign: 'center', margin: '56px 0' }}>
        <a href={APPSTORE_URL} className="btn btn-accent btn-lg">{u.cta}</a>
      </div>

      <h2 className="text-[20px] font-extrabold tracking-[-0.02em] mb-4">{u.sourcesTitle}</h2>
      <ol style={{ paddingLeft: 22, margin: 0 }}>
        {SOURCES.map((s) => (
          <li key={s.id} id={`src-${s.id}`} className="text-[14px] leading-relaxed mb-2">
            <a href={s.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 decoration-2" style={linkStyle}>{s.label}</a>
          </li>
        ))}
      </ol>
      <p className="text-[13px] leading-relaxed mt-6" style={{ color: 'var(--fg-2)' }}>{u.note.replace('{date}', CHECKED[lang])}</p>
    </div>
  );
}

const th = { padding: '14px 14px', textAlign: 'left', borderBottom: '2px solid var(--line)', fontSize: 15, fontWeight: 800, verticalAlign: 'bottom' } as const;
const td = { padding: '14px 14px', textAlign: 'left', borderBottom: '1.5px solid var(--line)', verticalAlign: 'top' } as const;
const keroCol = { background: 'color-mix(in srgb, var(--accent) 22%, transparent)' } as const;
