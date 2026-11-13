<p align="center">
  <img src="website/public/icons/open-lock-512.png" width="112" alt="Lock icon" />
</p>

<h1 align="center">Kero Lock</h1>

<p align="center">
  <b>Snap meals. Train. Lock in.</b><br />
  An AI calorie and workout log for iPhone.
</p>

<p align="center">
  <a href="https://apps.apple.com/app/id6762630080">App Store</a> ·
  <a href="https://lock.jkeroro.com">Website</a> ·
  <a href="#中文介绍">中文介绍</a>
</p>

---

## What it is

Lock helps you lock in on logging what you eat and how you train. Take a photo of your meal and the AI breaks it down into calories, protein, carbs and fat in seconds. Every meal fills the ring; hit your goal and it locks.

### Features

- **AI photo scan** – point the camera at your plate, get calories and macros, edit anything.
- **Barcode and nutrition-label scan** for packaged food, plus food search and manual entry.
- **Your day on one dial** – calories left, macros, water and steps on one screen, with Apple Health sync.
- **Smart goals** – recommended calories with a weekly pace, a protein bonus on training days and an adaptive step goal.
- **Train** – plan your week or let the AI build a plan from your goal, schedule and equipment, then follow it set by set with a rest timer. Lock keeps your records and raises the weight when you've earned it.
- **Lock Screen, Dynamic Island and Apple Watch** – log sets without opening your phone.
- **Buddy** – a companion that grows as you log meals, train and walk.
- **Friends and couple space** – add friends by Friend ID, climb the leaderboard, and share a space with your partner.
- **Five languages** – English, 简体中文, 繁體中文, 日本語, 한국어.

Free to start: every new account gets its first week of Pro. After that the free plan keeps daily AI scans, unlimited barcode and manual logging, workouts, the weight chart, data export and unlimited friends. **Lock Pro** unlocks unlimited AI scans, AI diet × training reviews and AI workout plans on demand.

## Tech stack

| Part | Stack |
| --- | --- |
| App (`/`) | Expo, React Native, Expo Router, TypeScript, NativeWind, Reanimated, React Three Fiber |
| Native targets (`targets/`, `modules/`) | Swift – Apple Watch app, Live Activity, workout module |
| Backend (`backend/`) | Next.js API routes on Vercel, Prisma, Supabase Postgres |
| Website (`website/`) | Next.js, Tailwind CSS – [lock.jkeroro.com](https://lock.jkeroro.com) |
| Services | Clerk (auth), RevenueCat (subscriptions), Fireworks AI (vision and text models), USDA FoodData Central, Apple HealthKit |
| Delivery | EAS Build, TestFlight, EAS Update (OTA), GitHub Actions |

## Repository layout

```
app/            Expo Router screens (tabs, camera, workout, couple, pet, legal…)
components/     UI components grouped by feature
constants/      Theme tokens, exercises, portions, pets
hooks/ lib/ services/ store/   App logic, API client, state
i18n/           Locales for the five supported languages
assets/         Fonts, icons, buddy and couple-space art, 3D models
targets/        Apple Watch app and Live Activity (Swift)
modules/        Local Expo native modules
backend/        Next.js API, Prisma schema and migrations
website/        Marketing site
scripts/        Build helpers and automated App Store screenshots
.github/        CI: type check, iOS builds, TestFlight, OTA updates, screenshots
```

## License

Copyright © 2026 Jkeroro. **All rights reserved.**

This code is public for reference only. It is not open source: you may not copy, modify, redistribute or publish it, or any app derived from it. See [LICENSE](LICENSE).

---

## 中文介绍

**Kero Lock** 是一款 AI 拍照记卡路里 + 训练记录的 iPhone app。拍一张饭的照片，AI 几秒钟就把它拆成卡路里、蛋白质、碳水和脂肪；每一餐都在填满那个圆环，达标的那一刻，锁上。

**主要功能**

- **AI 拍照识别**：对准餐盘，得到热量和宏量，哪里不对改哪里
- **条码 / 营养成分表扫描**，以及食物搜索和手动录入
- **一天一个表盘**：剩余热量、宏量、饮水、步数一屏看完，支持同步 Apple 健康
- **智能目标**：推荐热量 + 每周速度，训练日蛋白质加量，步数目标自动调整
- **训练**：自己排一周计划，或让 AI 按目标、训练日和器械生成，一组一组跟练，带组间计时，练到了自动加重
- **锁屏、灵动岛和 Apple Watch**：不用打开手机就能记组
- **伙伴**：记餐、训练、走路都会让它长大
- **好友和情侣空间**：用 Friend ID 加好友、上排行榜，和另一半共享一个空间
- **五种语言**：English、简体中文、繁體中文、日本語、한국어

新用户第一周免费享受 Pro；之后免费版保留每日 AI 识别、无限条码和手动记录、训练、体重曲线、数据导出和无限好友。**Lock Pro** 解锁无限 AI 识别、「饮食 × 训练」AI 分析和随时生成 AI 训练计划。

**下载**：[App Store](https://apps.apple.com/app/id6762630080) · **官网**：[lock.jkeroro.com](https://lock.jkeroro.com)

**版权**：© 2026 Jkeroro，保留所有权利。代码公开仅供参考，不是开源项目，未经书面许可不得复制、修改、分发或发布本代码及其衍生的任何 app。详见 [LICENSE](LICENSE)。
