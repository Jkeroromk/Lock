# Lock website

Marketing site for Lock, deployed to https://lock.jkeroro.com by the Vercel project `lock-website` (Root Directory: `website`).

```bash
cd website
npm install
npm run dev   # http://localhost:3001
```

- Copy (EN / 中文) lives in `app/components/copy.ts`. The Free / Pro lists mirror the app's pricing strings and `backend/lib/plans.ts`, so update them together when limits change.
- Brand tokens follow `constants/themes.ts` in the app: ink `#0A0A0A`, paper `#F2F1EC`, accent `#FFD43B`.
- Fonts in `public/fonts` are Bricolage Grotesque and Geist Mono (OFL), converted from `assets/fonts`.
- App icons in `public/icons` come from `assets/icons`.
- Vercel skips this project when a commit doesn't touch `website/`.
