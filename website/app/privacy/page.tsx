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
        <p><B>Meal data:</B> the meals you log — food names, calories and macros. Photos you take for calorie analysis are sent to our AI provider to be analysed. When you save a meal, a small thumbnail of its photo is kept in private storage so it can show in your log. Only you can see it. Deleting the meal deletes its thumbnail.</p>
        <p><B>Buddy and social data:</B> the names you give your coach and buddy, its growth (from workouts, steps and logged meals), the pats you and your friends send, your friends list and the challenges you create or join.</p>
        <p><B>Health data:</B> with your permission, step count and active energy from Apple Health, and, if you use the Apple Watch app, heart rate during a workout (see &ldquo;Apple Health&rdquo; below).</p>
        <p><B>Training data:</B> your weekly workout plan and the workouts you log — exercises, sets, reps, weights and duration.</p>
        <p><B>Weight records</B> you choose to log, your unit preference (kg or lb), and a <B>push notification token</B> if you enable reminders.</p>
        <p><B>Purchases:</B> your subscription status (Free or Pro). Payments are processed by Apple; we never see your payment details.</p>
      </>
    ),
  },
  {
    title: 'How We Use Your Information',
    content: (
      <List items={[
        "Provide Lock's core features: AI food recognition, calorie and macro tracking, workout planning and logging, and diet and training analysis",
        'Calculate your daily calorie goals and show your progress',
        'Run social features — friends, leaderboards, challenges and buddies, including notifying a friend when you pat their buddy',
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
        <p>Lock reads your step count and active energy from Apple HealthKit, only after you grant permission, to display your daily activity in the app and to grow your buddy.</p>
        <p>If you use Lock on Apple Watch (Lock 1.1 and later), the watch app reads your heart rate and active energy during a workout to show them on the watch, and saves the finished strength workout to Apple Health. Heart rate stays on your devices; it is not sent to Lock&apos;s servers.</p>
        <List items={[
          'HealthKit data is used only for health and fitness features inside Lock',
          'It is never used for advertising or marketing',
          'It is never sold, and never shared with advertising platforms or data brokers',
          'You can revoke access at any time in the Health app: tap your profile → Apps → Lock',
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
          <><B>Fireworks AI</B> — analysing meal photos and nutrition labels, and generating the AI review from your recent meals, workouts and goals</>,
          <><B>Supabase</B> — database and private photo storage</>,
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
      <p>Social features are friends-only. Your friends can see your display name, username, avatar, status, today&apos;s calorie total, streak, your buddy (its name, kind and stage) and the challenges you create or join. Your meals, meal photos, workouts and weight are not shared with friends. You can remove friends and block users; blocked users can no longer see you, find you in search or send you friend requests.</p>
    ),
  },
  {
    title: 'Data Retention & Deletion',
    content: (
      <p>Your data is kept while your account is active. You can delete your account at any time in <span className="text-foreground">Settings → Account &amp; Security → Delete Account</span>. This immediately and permanently deletes your account and all associated data (meals, meal photos, workouts, weight and health records, your buddy, friends and challenges), and, if you signed in with Apple, revokes Lock&apos;s Sign in with Apple access. Deleting your account does not cancel an App Store subscription; cancel it in your Apple ID settings. Pro members can also export their meal history from Settings. You can request deletion at any time by emailing <Mail />.</p>
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
      lastUpdated="October 25, 2026"
      intro={<p>Lock (&ldquo;we&rdquo;, &ldquo;our&rdquo;, &ldquo;us&rdquo;) values your privacy. This policy explains what we collect, how we use it, and the choices you have when you use the Lock mobile app.</p>}
      sections={sections}
    />
  );
}
