# Kero Lock promo videos

Automatic 1080×1920 videos of the real app (demo account), no phone needed.

1. **Spec** (`specs/<week>.json`): videos → scenes. A scene is an app screen held for `ms`
   milliseconds with a caption per language (`*word*` = yellow highlight).
   Scenes: `today`, `photo` (sushi photo → AI result card), `save` (taps Save → Today, ring fills),
   `log`, `train` (live session + rest timer), `buddy` (3D coach), `friends`, `couple` (3D room), `calendar`.
2. **Record** (`scripts/videos/record.sh`): screenshot-mode build on an iPhone 17 Pro Max simulator,
   launched with `-kclip "today:2200,photo:3200,…"`; the app plays the scenes (`screenshot/index.tsx`, `runClip`)
   while `simctl io recordVideo` runs.
3. **Compose** (`scripts/videos/compose.mjs`): caption on top, the screen in a cream frame with a yellow hard
   shadow, then the end card (`endcard/endcard.html`).
4. **Run**: Actions → "Promo videos" (pick the spec), or push to a `videos/**` branch.
   Output: the `videos-output` branch, `videos/<spec>/<id>-<lang>.mp4` + one still per scene.

Rules (see the project's short-video playbook): only shipped features, no weight-loss promises,
and **the photo result must be a real analysis** — `visionResult` in `screenshot/fixtures.ts` has to be
the app's actual output for `screenshot/assets/sushi.jpg` (or whatever photo is used) before a video with
the `photo` scene is posted.
