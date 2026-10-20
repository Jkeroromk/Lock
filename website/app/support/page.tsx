import { SubpageShell } from '../components/SubpageShell';

const faqs = [
  { q: 'How does the AI food recognition work?', a: "Take a photo of your meal and Lock's AI analyses the image to estimate calories and macros. The more centred and well-lit the photo, the more accurate the result. You can edit any entry, and for packaged food the barcode or nutrition label gives exact numbers." },
  { q: 'Why did I run out of AI scans today?', a: 'Your first week is Pro with unlimited scans; after that the free plan includes 3 photo or nutrition-label scans a day. The count resets at local midnight. Barcode and manual logging are never limited, and when a friend joins with your invite code you both get 5 bonus scans. Lock Pro removes the limit.' },
  { q: 'How much is Lock Pro?', a: '$39.99 a year or $7.99 a month (US prices; the App Store shows the price in your currency). Every new account gets Pro free for its first week, with no card needed. Cancel anytime in your Apple ID settings.' },
  { q: 'How do I set up a training plan?', a: 'Open the Train tab and tap Weekly plan. Name each day, add exercises from the library, and set sets, reps and weight. Turn on auto increase to add weight after each completed workout. Days without exercises are rest days.' },
  { q: 'How do I switch between kg and lb?', a: 'Go to Settings → Preferences and change the weight unit. Your past workouts and weigh-ins are converted for display; nothing is lost.' },
  { q: 'How do I add friends?', a: 'Go to the Social tab and tap "Add Friend". You can search by username or share your invite code from your Profile card in Settings → Contacts.' },
  { q: 'How do I change the app icon?', a: 'Go to Settings → App Icon and pick Open Lock, Ring, Sticker or Keyhole. iOS shows a short confirmation after you switch.' },
  { q: 'How do I cancel my subscription?', a: 'Subscriptions are managed by Apple. Go to Settings app → Apple ID → Subscriptions → Lock, and tap Cancel Subscription.' },
  { q: 'How do I delete my account?', a: 'Go to Settings → Account & Security → scroll to Danger Zone → Delete Account. This permanently deletes your account, meals, photos, workouts and weigh-ins. Deleting your account does not cancel an App Store subscription, so cancel that first in your Apple ID settings.' },
  { q: "Why isn't Apple Health syncing?", a: 'Go to Settings → Health Connections and make sure the toggle is enabled. iOS manages Health access in the Health app: tap your profile → Apps → Lock, then turn on Steps and Active Energy.' },
  { q: 'I lost my progress after reinstalling. Can I recover it?', a: 'Your data is tied to your account, not your device. Sign back in with the same account (Apple, Google, or email) and your history will be restored automatically.' },
];

export default function Support() {
  return (
    <SubpageShell eyebrow="Help" title="Support" sub="We're here to help. Reach out any time.">
      <div className="card" style={{ padding: 28, marginBottom: 72 }}>
        <span className="sticker" style={{ transform: 'rotate(-3deg)' }}>Email</span>
        <h2 className="text-[22px] font-extrabold tracking-[-0.02em] mt-4 mb-2">Email support</h2>
        <p className="text-[16px] leading-relaxed" style={{ color: 'var(--fg-2)' }}>
          Send us an email at{' '}
          <a href="mailto:support@jkeroro.com" className="font-bold underline underline-offset-4 decoration-2" style={{ color: 'var(--fg)', textDecorationColor: 'var(--accent)' }}>
            support@jkeroro.com
          </a>{' '}
          and we&apos;ll get back to you within 24 hours.
        </p>
      </div>

      <p className="eyebrow">FAQ</p>
      <h2 className="text-[clamp(26px,3.4vw,36px)] font-extrabold tracking-[-0.03em] mb-8">Frequently asked questions</h2>

      <div style={{ borderTop: '2px solid var(--line)' }}>
        {faqs.map((faq) => (
          <div key={faq.q} className="py-6" style={{ borderBottom: '2px solid var(--line)' }}>
            <h3 className="text-[18px] font-bold tracking-[-0.01em] mb-2">{faq.q}</h3>
            <p className="text-[16px] leading-relaxed" style={{ color: 'var(--fg-2)' }}>{faq.a}</p>
          </div>
        ))}
      </div>
    </SubpageShell>
  );
}
