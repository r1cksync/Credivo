"""
Master runner: generates TTS audio, architecture diagram, records browser video,
then combines everything into final_demo.mp4.

Run: e:/Credivo/.venv/Scripts/python.exe demo/run_all.py
"""
import asyncio
import subprocess
import sys
import os
from pathlib import Path

PYTHON = sys.executable
DEMO   = Path(__file__).parent


def run(script_name: str, *args):
    path = DEMO / script_name
    cmd  = [PYTHON, str(path)] + list(args)
    print(f"\n{'='*60}\n  Running: {script_name}\n{'='*60}")
    result = subprocess.run(cmd, cwd=str(DEMO))
    if result.returncode != 0:
        print(f"⚠ {script_name} exited with code {result.returncode}")
    return result.returncode == 0


def find_latest_video() -> str | None:
    videos = list((DEMO / "recording").glob("*.webm"))
    if not videos:
        return None
    return str(max(videos, key=lambda f: f.stat().st_mtime))


if __name__ == "__main__":
    steps_ok = True

    # 1. Architecture diagram (fast, no network needed)
    steps_ok &= run("gen_architecture.py")

    # 2. TTS audio generation
    steps_ok &= run("generate_tts.py")

    # 3. Browser recording (headful, ~3-4 min)
    steps_ok &= run("record_video.py")

    # 4. Combine
    video = find_latest_video()
    if video:
        steps_ok &= run("combine.py", video)
    else:
        print("⚠ No video found, skipping combine step")
        steps_ok = False

    if steps_ok:
        print(f"\n✅  Demo production complete.")
        print(f"   Architecture: {DEMO / 'architecture.png'}")
        print(f"   Final video:  {DEMO / 'final_demo.mp4'}")
    else:
        print("\n⚠  Some steps failed — check output above.")
