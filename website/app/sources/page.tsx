import type { Metadata } from 'next';
import { SubpageShell } from '../components/SubpageShell';
import { SOURCES } from './data';

export const metadata: Metadata = {
  title: 'Sources & methods — Lock',
  description: "Where Lock's calorie, protein, water, step and exercise numbers come from.",
};

export default function Sources() {
  return (
    <SubpageShell
      eyebrow="Health info"
      title="Sources & methods"
      sub="Where Lock's calorie, macro, water and step numbers come from. 参考来源：Lock 的热量、营养素、饮水和步数目标都出自这些资料。"
    >
      <div className="card" style={{ padding: 24, marginBottom: 48 }}>
        <span className="sticker" style={{ transform: 'rotate(-3deg)' }}>Not medical advice</span>
        <p className="text-[16px] leading-relaxed mt-4" style={{ color: 'var(--fg-2)' }}>
          Lock gives general nutrition and fitness information, including its AI suggestions. It is not medical advice and does
          not diagnose or treat any condition. Talk to a doctor or registered dietitian before changing your diet or training,
          especially if you are pregnant, have a medical condition, or have had an eating disorder.
        </p>
        <p className="text-[15px] leading-relaxed mt-2" style={{ color: 'var(--fg-2)' }}>
          Lock 提供的是一般性的营养和健身信息（包括 AI 建议），不是医疗建议。调整饮食或训练前，请先咨询医生或注册营养师。
        </p>
      </div>

      <ol style={{ borderTop: '2px solid var(--line)', listStyle: 'none', padding: 0, margin: 0 }}>
        {SOURCES.map((s, i) => (
          <li key={s.id} className="py-6" style={{ borderBottom: '2px solid var(--line)', display: 'grid', gridTemplateColumns: '44px 1fr', gap: 12 }}>
            <span className="mono small" style={{ color: 'var(--fg-2)', paddingTop: 3 }}>{String(i + 1).padStart(2, '0')}</span>
            <div>
              <h2 className="text-[18px] font-bold tracking-[-0.01em]">{s.use}</h2>
              <p className="text-[14px] mt-1" style={{ color: 'var(--fg-2)' }}>{s.useZh}</p>
              <p className="text-[15px] leading-relaxed mt-3">
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-4 decoration-2"
                  style={{ color: 'var(--fg)', textDecorationColor: 'var(--accent)' }}
                >
                  {s.citation}
                </a>
              </p>
            </div>
          </li>
        ))}
      </ol>

      <p className="text-[15px] leading-relaxed mt-10" style={{ color: 'var(--fg-2)' }}>
        In the app: Settings → Goals → Sources &amp; methods. Questions? Email{' '}
        <a href="mailto:support@jkeroro.com" className="font-bold underline underline-offset-4 decoration-2" style={{ color: 'var(--fg)', textDecorationColor: 'var(--accent)' }}>
          support@jkeroro.com
        </a>
        .
      </p>
    </SubpageShell>
  );
}
