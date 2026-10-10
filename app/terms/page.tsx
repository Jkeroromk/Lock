import type { Metadata } from 'next';
import { LegalPage, B, Mail, List, type LegalSection } from '../components/LegalPage';

export const metadata: Metadata = {
  title: 'Terms of Service — Lock',
  description: 'The terms that apply when you use Lock.',
};

const sections: LegalSection[] = [
  {
    title: 'Service Description',
    content: (
      <>
        <p>Lock provides AI food recognition and calorie tracking, health data monitoring (steps, active energy), social features (friends, leaderboards, Moments, challenges) and personalised diet analysis.</p>
        <p>Content provided by Lock is for informational purposes only and does not constitute medical advice.</p>
      </>
    ),
  },
  {
    title: 'Account Registration',
    content: (
      <List items={[
        'You must be at least 13 years old',
        'You are responsible for keeping your credentials secure',
        'Do not share your account with others',
        'Report unauthorised access to us immediately',
      ]} />
    ),
  },
  {
    title: 'Subscriptions & Payments',
    content: (
      <>
        <p><B>Free:</B> 3 AI scans per day and up to 5 friends.</p>
        <p><B>Pro:</B> unlimited AI scans, AI diet analysis, unlimited friends, creating challenges, data export and weight charts.</p>
        <p><B>Max:</B> everything in Pro, plus a weekly automatic AI report, an AI custom nutrition plan and priority support.</p>
        <List items={[
          'Payment is charged to your Apple ID account at confirmation of purchase',
          'Subscriptions renew automatically unless cancelled at least 24 hours before the end of the current period; your account is charged for renewal within 24 hours before the period ends',
          'You can manage or cancel your subscription in your App Store account settings',
          'No refunds are provided for the unused portion of a paid period, except where required by law or by Apple',
        ]} />
      </>
    ),
  },
  {
    title: 'User Content & Zero Tolerance',
    content: (
      <>
        <p>You are responsible for the Moments, comments, challenges and profile information you post. Lock has <B>zero tolerance for objectionable content and abusive users</B>. You agree not to post or send:</p>
        <List items={[
          'Sexual, nude or sexually suggestive content',
          'Harassment, bullying, threats or hate speech',
          'Violence, self-harm, or content promoting disordered eating',
          'Spam, scams or misleading information',
          "Content that violates others' privacy or intellectual property",
          'Anything illegal',
        ]} />
        <p>You can report content from the &ldquo;···&rdquo; menu on any Moment, and block users from Moments, comments, the leaderboard and friend requests. We review reports within 24 hours, remove violating content, and warn, restrict or permanently ban users who break these rules.</p>
      </>
    ),
  },
  {
    title: 'Acceptable Use',
    content: (
      <List items={[
        'Do not attempt to access the service or other accounts without authorisation',
        'Do not use bots, scrapers or other automated tools to access the service',
        'Do not interfere with or disrupt the service',
        'Do not violate any applicable laws',
      ]} />
    ),
  },
  {
    title: 'Health Disclaimer',
    content: (
      <>
        <p>Calorie estimates and diet suggestions from Lock are for reference only and are not professional medical advice.</p>
        <List items={[
          'AI-recognised food data may contain errors',
          'Consult a doctor before starting a new diet or exercise plan',
          'We are not liable for health issues arising from reliance on app data',
        ]} />
      </>
    ),
  },
  {
    title: 'Intellectual Property',
    content: <p>The Lock app, brand and content (excluding content posted by users) belong to the Lock team and are protected by intellectual property laws. You keep ownership of the content you post and grant us a licence to store and display it to the people you share it with, in order to operate the service.</p>,
  },
  {
    title: 'Termination',
    content: <p>You may stop using Lock and delete your account at any time. We may suspend or terminate accounts that violate these Terms.</p>,
  },
  {
    title: 'Limitation of Liability',
    content: (
      <>
        <p>To the maximum extent permitted by law, Lock is not liable for losses arising from use of or inability to use the service, data loss or corruption, or damage caused by third parties.</p>
        <p>Our maximum liability shall not exceed the subscription fees you paid in the past 12 months.</p>
      </>
    ),
  },
  {
    title: 'Apple App Store',
    content: <p>These Terms are between you and Lock, not Apple. Apple is not responsible for the app or its content. Your use of the app is also subject to Apple&apos;s Licensed Application End User License Agreement.</p>,
  },
  {
    title: 'Contact',
    content: <p>Questions about these Terms? Email <Mail />.</p>,
  },
];

export default function TermsOfService() {
  return (
    <LegalPage
      title="Terms of Service"
      lastUpdated="October 10, 2026"
      intro={<p>By downloading, installing or using Lock, you agree to be bound by these Terms of Service. If you do not agree, do not use the app.</p>}
      sections={sections}
    />
  );
}
