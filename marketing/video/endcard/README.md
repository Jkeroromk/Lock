# Kero Lock end card

Brand sting (the Open Lock shackle snaps shut, "Lock in.") followed by the App Store CTA, 3.5 s, 1080×1920, 30 fps, with a click on the snap. English and 简体中文.

```bash
python3 render.py                                   # -> out/endcard-en.mp4, out/endcard-zh.mp4
./replace-endcard.sh old.mp4 new.mp4 2.5 zh         # drop the last 2.5 s of old.mp4, append the zh card
```

- Copy lives in `COPY` in `endcard.html`; animation timing in `render(t)` (every frame is a pure function of `t`).
- `SNAP` in `endcard.html` and `render.py` must match (it lines the click up with the shackle).
- For the older Lock·In videos, scrub to where the old sting starts and use `total length − that time` as the cut.
- Needs Python Playwright (Chromium) and ffmpeg. Fonts come from `assets/fonts`; Chinese falls back to Noto Sans CJK SC.
