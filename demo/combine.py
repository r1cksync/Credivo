"""
Combine recorded browser video + TTS narration into final_demo.mp4.
Audio is the AUTHORITATIVE duration — video is extended with freeze-frame
if shorter, or trimmed if longer. This guarantees perfect A/V alignment.
"""
import subprocess, sys, os
from pathlib import Path

DEMO_DIR   = Path(__file__).parent
SEG_DIR    = DEMO_DIR / "audio_segments"
OUTPUT     = DEMO_DIR / "final_demo.mp4"


def ffprobe_dur(path):
    r = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", str(path)],
        capture_output=True, text=True, check=True)
    return float(r.stdout.strip())


def build_audio(segs):
    """Concat all segment mp3s into one audio track, return path."""
    concat_txt = SEG_DIR / "concat.txt"
    with open(concat_txt, "w") as f:
        for s in sorted(segs):
            f.write(f"file '{s.name}'\n")
    out = DEMO_DIR / "audio_combined.mp3"
    subprocess.run(
        ["ffmpeg", "-y", "-f", "concat", "-safe", "0",
         "-i", str(concat_txt), "-acodec", "copy", str(out)],
        check=True, capture_output=True)
    return out


def find_video():
    videos = sorted((DEMO_DIR / "recording").glob("*.webm"),
                    key=lambda f: f.stat().st_mtime)
    if not videos:
        raise FileNotFoundError("No .webm video found in demo/recording/")
    return videos[-1]


def combine(video_path, audio_path):
    vid_dur   = ffprobe_dur(video_path)
    aud_dur   = ffprobe_dur(audio_path)
    print(f"Video: {vid_dur:.2f}s   Audio: {aud_dur:.2f}s")

    target = aud_dur   # audio is master

    # Build video filter: scale/pad to 1280x720, then freeze-extend if needed
    if vid_dur < target:
        # tpad: pad video to target duration by repeating last frame
        extra = target - vid_dur
        vf = (
            f"scale=1280:720:force_original_aspect_ratio=decrease,"
            f"pad=1280:720:(ow-iw)/2:(oh-ih)/2,"
            f"fps=30,"
            f"tpad=stop_mode=clone:stop_duration={extra:.3f}"
        )
    else:
        vf = (
            "scale=1280:720:force_original_aspect_ratio=decrease,"
            "pad=1280:720:(ow-iw)/2:(oh-ih)/2,"
            "fps=30"
        )

    cmd = [
        "ffmpeg", "-y",
        "-i", str(video_path),
        "-i", str(audio_path),
        "-vf", vf,
        "-c:v", "libx264", "-preset", "fast", "-crf", "20", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "192k",
        "-t", f"{target:.3f}",
        "-map", "0:v:0",
        "-map", "1:a:0",
        str(OUTPUT),
    ]
    print("Running ffmpeg…")
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print("ffmpeg stderr:", result.stderr[-3000:])
        raise RuntimeError("ffmpeg failed")

    size_mb = OUTPUT.stat().st_size // (1024 * 1024)
    out_dur = ffprobe_dur(OUTPUT)
    print(f"\nFinal video:  {OUTPUT}")
    print(f"Duration:     {out_dur:.1f}s   Size: {size_mb} MB")


if __name__ == "__main__":
    segs = sorted(SEG_DIR.glob("[0-9]*.mp3"))
    if not segs:
        print("No audio segments found — run generate_tts.py first")
        sys.exit(1)

    audio = build_audio(segs)
    print(f"Audio: {audio}")

    video = find_video()
    print(f"Video: {video}")

    combine(video, audio)
