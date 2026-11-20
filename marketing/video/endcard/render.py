"""Render the Kero Lock end card (brand sting + App Store CTA) as 1080x1920 30 fps MP4s.

Usage:  python3 render.py            -> out/endcard-en.mp4, out/endcard-zh.mp4
Needs:  Python Playwright (Chromium), ffmpeg.
"""
import pathlib
import shutil
import subprocess
import tempfile

from playwright.sync_api import sync_playwright

HERE = pathlib.Path(__file__).resolve().parent
OUT = HERE / "out"
FPS = 30
DURATION = 3.5   # seconds
SNAP = 0.75      # must match SNAP in endcard.html


def click_audio(path: pathlib.Path) -> None:
    """A short 'thunk' at the moment the shackle closes, then silence."""
    expr = "0.9*sin(2*PI*85*t)*exp(-t*38)+0.35*(random(0)*2-1)*exp(-t*140)"
    subprocess.run([
        "ffmpeg", "-y", "-loglevel", "error",
        "-f", "lavfi", "-i", f"aevalsrc={expr}:s=48000:d=0.3",
        "-af", f"lowpass=f=2400,adelay={int(SNAP * 1000)}:all=1,apad,atrim=0:{DURATION},volume=0.9",
        "-ac", "2", "-c:a", "pcm_s16le", str(path),
    ], check=True)


def render(lang: str, page, audio: pathlib.Path) -> pathlib.Path:
    frames = pathlib.Path(tempfile.mkdtemp(prefix=f"endcard-{lang}-"))
    page.goto((HERE / "endcard.html").as_uri() + f"?lang={lang}")
    page.evaluate("document.fonts.ready")
    for i in range(int(DURATION * FPS)):
        page.evaluate(f"render({i / FPS})")
        page.screenshot(path=str(frames / f"{i:04d}.png"))
    out = OUT / f"endcard-{lang}.mp4"
    subprocess.run([
        "ffmpeg", "-y", "-loglevel", "error",
        "-framerate", str(FPS), "-i", str(frames / "%04d.png"), "-i", str(audio),
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-shortest", "-movflags", "+faststart",
        str(out),
    ], check=True)
    shutil.rmtree(frames)
    return out


def main() -> None:
    OUT.mkdir(exist_ok=True)
    audio = OUT / "click.wav"
    click_audio(audio)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1080, "height": 1920})
        for lang in ("en", "zh"):
            print(render(lang, page, audio))
        browser.close()
    audio.unlink()


if __name__ == "__main__":
    main()
