import { Card, CardContent } from '@/components/ui/card';
import { ThemeToggle } from '../components/ThemeToggle';

const faqs = [
  { q: 'How does the AI food recognition work?', a: "Take a photo of your meal and Lock's AI analyses the image to estimate calories and macros. The more centred and well-lit the photo, the more accurate the result." },
  { q: 'How do I add friends?', a: 'Go to the Social tab and tap "Add Friend". You can search by username or share your invite code from your Profile card in Settings → Contacts.' },
  { q: 'How do I cancel my subscription?', a: 'Subscriptions are managed by Apple. Go to Settings app → Apple ID → Subscriptions → Lock, and tap Cancel Subscription.' },
  { q: 'How do I delete my account?', a: 'Go to Settings → Account Security → scroll to Danger Zone → Delete Account. This permanently deletes all your data.' },
  { q: "Why isn't Apple Health syncing?", a: 'Go to Settings → Health Connections and make sure the toggle is enabled. Also check iPhone Settings → Health → Data Access & Devices → Lock and grant the required permissions.' },
  { q: 'I lost my progress after reinstalling. Can I recover it?', a: 'Your data is tied to your account, not your device. Sign back in with the same account (Apple, Google, or email) and your history will be restored automatically.' },
];

export default function Support() {
  return (
    <div className="min-h-screen bg-background">

      <header className="border-b border-border px-10 h-[60px] flex items-center justify-between">
        <a href="/" className="text-[18px] font-black tracking-[-0.04em] text-foreground">Lock</a>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <a href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">← Back</a>
        </div>
      </header>

      <main className="max-w-[680px] mx-auto px-8 py-[72px] pb-24">
        <p className="text-[11px] font-bold text-muted-foreground tracking-[0.12em] uppercase mb-4">Help</p>
        <h1 className="text-[clamp(32px,5vw,48px)] font-black tracking-[-0.03em] text-foreground mb-3">
          Support
        </h1>
        <p className="text-base text-muted-foreground mb-14 leading-relaxed">
          We&apos;re here to help. Reach out any time.
        </p>

        {/* Contact card */}
        <Card className="mb-16">
          <CardContent className="p-8">
            <div className="text-[26px] mb-4">✉️</div>
            <h2 className="text-base font-extrabold tracking-[-0.02em] text-foreground mb-2.5">Email Support</h2>
            <p className="text-[15px] text-muted-foreground leading-relaxed">
              Send us an email at{' '}
              <a href="mailto:support@jkeroro.com" className="text-foreground font-bold underline underline-offset-4 hover:opacity-70 transition-opacity">
                support@jkeroro.com
              </a>
              {' '}and we&apos;ll get back to you within 24 hours.
            </p>
          </CardContent>
        </Card>

        {/* FAQ */}
        <p className="text-[11px] font-bold text-muted-foreground tracking-[0.12em] uppercase mb-6">FAQ</p>
        <h2 className="text-[clamp(20px,3vw,28px)] font-black tracking-[-0.03em] text-foreground mb-8">
          Frequently asked questions
        </h2>

        <div className="flex flex-col gap-2.5">
          {faqs.map((faq) => (
            <Card key={faq.q} className="hover:bg-accent hover:border-border/80 transition-all">
              <CardContent className="p-7">
                <h3 className="text-sm font-extrabold tracking-[-0.01em] text-foreground mb-2">{faq.q}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>

      <footer className="border-t border-border px-10 py-6">
        <div className="flex justify-between items-center max-w-[680px] mx-auto flex-wrap gap-3">
          <a href="/" className="text-sm text-muted-foreground/60 hover:text-muted-foreground transition-colors">← Lock</a>
          <div className="flex gap-6">
            <a href="/privacy" className="text-sm text-muted-foreground/60 hover:text-muted-foreground transition-colors">Privacy Policy</a>
            <a href="/terms" className="text-sm text-muted-foreground/60 hover:text-muted-foreground transition-colors">Terms of Service</a>
            <a href="https://jkeroro.com" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground/60 hover:text-muted-foreground transition-colors">Jkeroro.com</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
