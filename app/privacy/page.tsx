import type { Metadata } from 'next';
import { LegalPage, B, Mail, List, type LegalSection } from '../components/LegalPage';

export const metadata: Metadata = {
  title: 'Privacy Policy — Lock',
  description: 'How Lock collects, uses and protects your information.',
};

const sections: LegalSection[] = [
  {
    title: 'Information We Collect',
    content: (
      <>
        <p><B>Account information:</B> your email address, name, username, bio and profile picture, and the body details you enter during setup (height, weight, age, gender, goal, exercise frequency).</p>
        <p><B>Meal data:</B> the meals you log — food names, calories and macros. Photos you take for calorie analysis are sent to our AI provider to be analysed and are <B>not stored</B> by Lock.</p>
        <p><B>Content you post:</B> Moments (text and photos), comments, likes and challenges. These are stored until you delete them or your account.</p>
        <p><B>Health data:</B> with your permission, step count and active energy from Apple Health (see &ldquo;Apple Health&rdquo; below).</p>
        <p><B>Weight records</B> you choose to log, and a <B>push notification token</B> if you enable reminders.</p>
        <p><B>Purchases:</B> your subscription status (Free, Pro or Max). Payments are processed by Apple; we never see your payment details.</p>
      </>
    ),
  },
  {
    title: 'How We Use Your Information',
    content: (
      <List items={[
        "Provide Lock's core features: AI food recognition, calorie and macro tracking, and diet analysis",
        'Calculate your daily calorie goals and show your progress',
        'Run social features — friends, leaderboards, Moments and challenges',
        'Send meal reminders and friend notifications you opt in to',
        'Verify and manage your subscription',
        'Keep the service secure and enforce our Terms of Service',
      ]} />
    ),
  },
  {
    title: 'Apple Health',
    content: (
      <>
        <p>Lock reads your step count and active energy from Apple HealthKit, only after you grant permission, to display your daily activity in the app.</p>
        <List items={[
          'HealthKit data is used only for health and fitness features inside Lock',
          'It is never used for advertising or marketing',
          'It is never sold, and never shared with advertising platforms or data brokers',
          'You can revoke access at any time in iPhone Settings → Privacy & Security → Health → Lock',
        ]} />
      </>
    ),
  },
  {
    title: 'Service Providers',
    content: (
      <>
        <p>We do not sell your personal data. We share data only with providers that operate the service on our behalf:</p>
        <List items={[
          <><B>Clerk</B> — sign-in and account security (including Sign in with Apple / Google)</>,
          <><B>Fireworks AI</B> — analysing meal photos and nutrition labels, and generating diet analysis</>,
          <><B>Supabase</B> — database hosting</>,
          <><B>Vercel</B> — server hosting</>,
          <><B>RevenueCat</B> — subscription management</>,
          <><B>Expo</B> — delivering push notifications</>,
          <><B>USDA FoodData Central</B> — food search (only the search text is sent, never your personal data)</>,
        ]} />
      </>
    ),
  },
  {
    title: 'What Your Friends Can See',
    content: (
      <p>Social features are friends-only. Your friends can see your display name, username, avatar, today&apos;s calorie total, streak, and the Moments, comments and challenges you post. People who are not your friends cannot see your Moments. You can remove friends, and block users — blocked users can no longer see you, find you in search or send you friend requests.</p>
    ),
  },
  {
    title: 'Data Retention & Deletion',
    content: (
      <p>Your data is kept while your account is active. You can delete your account at any time in <span className="text-foreground">Settings → Account Security → Delete Account</span>, which permanently deletes your account and all associated data (meals, posts, comments, friends, weight and health records) within 30 days. Pro and Max members can also export their meal history from Settings. You can request deletion at any time by emailing <Mail />.</p>
    ),
  },
  {
    title: 'Your Rights',
    content: (
      <p>You can access, correct, export or delete your personal data, and withdraw permissions such as Apple Health or notifications at any time. Contact <Mail /> for any request.</p>
    ),
  },
  {
    title: 'Security',
    content: <p>Data is encrypted in transit and stored with industry-standard providers. Passwords are handled by Clerk — Lock never has access to your password.</p>,
  },
  {
    title: "Children's Privacy",
    content: <p>Lock is not directed at children under 13, and we do not knowingly collect personal information from them. If you believe a child has provided us data, contact us and we will delete it.</p>,
  },
  {
    title: 'Changes to This Policy',
    content: <p>We will notify you of significant changes in the app or by email. Continued use of Lock after changes means you accept the updated policy.</p>,
  },
  {
    title: 'Contact',
    content: <p>Questions? Email <Mail />.</p>,
  },
];

export default function PrivacyPolicy() {
  return (
    <LegalPage
      title="Privacy Policy"
      lastUpdated="October 10, 2026"
      intro={<p>Lock (&ldquo;we&rdquo;, &ldquo;our&rdquo;, &ldquo;us&rdquo;) values your privacy. This policy explains what we collect, how we use it, and the choices you have when you use the Lock mobile app.</p>}
      sections={sections}
    />
  );
}
