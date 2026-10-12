import type { Metadata, Viewport } from 'next';
import '../globals.css';

const title = 'Lock — Snap it. Log it. Lock in.';
const description =
  "AI calorie and macro tracker for iPhone. Snap a photo and Lock's AI breaks your meal into calories, protein, carbs and fat. Hit your goal and it locks.";

export const metadata: Metadata = {
  metadataBase: new URL('https://lock.jkeroro.com'),
  title,
  description,
  openGraph: {
    title,
    description,
    url: 'https://lock.jkeroro.com',
    siteName: 'Lock',
    type: 'website',
    images: [{ url: '/icons/open-lock-512.png', width: 512, height: 512, alt: 'Lock app icon' }],
  },
  twitter: { card: 'summary', title, description, images: ['/icons/open-lock-512.png'] },
  other: { 'apple-itunes-app': 'app-id=6762630080' },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F2F1EC' },
    { media: '(prefers-color-scheme: dark)', color: '#0A0A0A' },
  ],
};

/* Runs before paint: stored choice wins, otherwise follow the system. */
const themeInit = `(function(){document.documentElement.classList.add('js');try{var s=localStorage.getItem('lock-theme');var d=s?s==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preload" href="/fonts/BricolageGrotesque-ExtraBold.woff" as="font" type="font/woff" crossOrigin="anonymous" />
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
