import { SubpageShell } from '../components/SubpageShell';

const faqs = [
  { q: 'How does the AI food recognition work?', a: "Take a photo of your meal and Lock's AI analyses the image to estimate calories and macros. The more centred and well-lit the photo, the more accurate the result. You can edit any entry, and for packaged food the barcode or nutrition label gives exact numbers." },
  { q: 'Why did I run out of AI scans today?', a: 'Your first week is Pro with unlimited scans; after that the free plan includes 3 photo or nutrition-label scans a day. The count resets at local midnight. Barcode and manual logging are never limited, and when a friend joins with your invite code you both get 5 bonus scans. Lock Pro removes the limit.' },
  { q: 'How much is Lock Pro?', a: '$39.99 a year or $9.99 a month (US prices; the App Store shows the price in your currency). Every new account gets Pro free for its first week, with no card needed. Cancel anytime in your Apple ID settings.' },
  { q: 'Can I log a meal without a photo?', a: 'Yes. Tap the camera button, then Search: your recent meals from the last 90 days come up first, food search finds anything in the database, and you can describe a meal in words (for example "an apple and two slices of toast") and AI estimates it. Describing a meal uses one AI scan. To log a meal you forgot, open that day in the calendar and tap Add a meal to this day (up to 30 days back); a photo you pick from your album is logged at the time it was taken.' },
  { q: 'How does water tracking work?', a: 'Tap a drink on the water card. Water and sparkling water count in full; tea, coffee, milk and juice count a little less, and drinks with calories (lattes, milk, juice, sports drinks and soda) also add to your calorie total. Your water log is saved to your account, so it shows up on every device and in your couple space.' },
  { q: 'How do I get an AI workout plan?', a: 'Open the Train tab and tap the AI plan card. Pick your training days, where you train (gym, home dumbbells or no equipment) and your experience, and AI lays out the week. You can edit any day afterwards. Pro can make a new AI plan anytime.' },
  { q: 'How does the buddy grow?', a: 'Open Social → Buddy and adopt one. Each day it grows from a workout (+30), steps (+10 at 8,000, +15 at 10,000), logging three meals (+10) and hitting your protein goal (+10), up to 65 a day. Each friend can pat it once a day for +2. Rest days never cost progress. When it is an adult it can graduate to your collection.' },
  { q: 'What is the couple space?', a: 'A shared space for you and one friend. Open Social, tap the couple card and invite a friend; it starts once they accept. You both see each other\'s day (calories, protein, water, steps and whether you trained), can send a nudge to drink water, eat, train or just say hi, keep your anniversaries, and spend your shared growth points on furniture for the home where Coach Doudou lives. Meals, photos and weight are never shared. Either of you can unlink at any time.' },
  { q: 'How do I use Lock on Apple Watch?', a: 'Start a workout on your iPhone and Lock opens on your watch. Turn the Digital Crown to change weight or reps, tap to complete a set, and the watch taps your wrist when rest is over. The finished workout is saved to Apple Health. If the watch app does not open, make sure Lock is installed on the watch (Watch app on iPhone → Available Apps). Needs watchOS 10 or later.' },
  { q: 'Does Lock work on iPhone Duo?', a: 'Yes. On the outer display the tabs move to a rail on the side. Open it and Today, Train, Buddy and the camera spread across both halves; stand it up halfway and the workout fills the top with big controls below.' },
  { q: 'Where do the calorie and protein targets come from?', a: 'From published guidelines: the Mifflin–St Jeor equation for energy needs, the Dietary Reference Intakes, ISSN guidance for protein and more. The full list is on our Sources & methods page (lock.jkeroro.com/sources) and in the app under Settings → Goals.' },
  { q: 'How do I set up a training plan?', a: 'Open the Train tab and tap Weekly plan. Name each day, add exercises from the library, and set sets, reps and weight. Turn on auto increase to add weight after each completed workout. Days without exercises are rest days.' },
  { q: 'How do I switch between kg and lb?', a: 'Use the kg / lb switch on the Train tab (it is also inside a workout). Your past workouts and weigh-ins are converted for display; nothing is lost.' },
  { q: 'How do I add friends?', a: 'Go to the Social tab and tap "Add Friend". Search for them by username or their 8-digit Friend ID; they're added once they accept. Your own Friend ID is on your profile card at the top of Settings. Your invite code is different: it's for people who haven't signed up yet, and gives you both 5 extra AI scans.' },
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
