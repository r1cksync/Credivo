"""
Generate TTS audio using Microsoft Edge TTS (edge-tts).
Voice: en-US-AndrewMultilingualNeural
Outputs: demo/audio_segments/<n>.mp3  +  demo/narration_full.mp3
         demo/segment_durations.json  (actual durations for video sync)
"""
import asyncio, os, sys, json, subprocess
sys.path.insert(0, os.path.dirname(__file__))
from narration import SEGMENTS
import edge_tts

VOICE   = "en-US-AndrewMultilingualNeural"
DEMO    = os.path.dirname(__file__)
OUT_DIR = os.path.join(DEMO, "audio_segments")

def ffprobe_duration(path):
    r = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", path],
        capture_output=True, text=True)
    return round(float(r.stdout.strip()), 3)

async def gen_segment(i, key, text, path):
    com = edge_tts.Communicate(text, VOICE, rate="+5%", pitch="-2Hz")
    await com.save(path)

async def generate_all():
    os.makedirs(OUT_DIR, exist_ok=True)
    tasks = []
    paths = []
    for i, (key, text) in enumerate(SEGMENTS):
        p = os.path.join(OUT_DIR, f"{i:02d}.mp3")
        paths.append(p)
        tasks.append(gen_segment(i, key, text, p))
    print(f"Generating {len(SEGMENTS)} segments with {VOICE}...")
    await asyncio.gather(*tasks)

    # Measure each segment duration
    durations = {}
    total = 0.0
    print("\nSegment durations:")
    for i, (key, _) in enumerate(SEGMENTS):
        p = paths[i]
        d = ffprobe_duration(p)
        durations[key] = d
        total += d
        print(f"  [{i:02d}] {key:20s}: {d:.2f}s")
    print(f"\n  TOTAL AUDIO: {total:.2f}s")

    # Save durations JSON for video script
    dur_path = os.path.join(DEMO, "segment_durations.json")
    with open(dur_path, "w") as f:
        json.dump({"segments": durations, "total": round(total, 3)}, f, indent=2)
    print(f"  Saved: {dur_path}")

    # Full concatenated narration
    full_text = " ".join(t for _, t in SEGMENTS)
    full_path = os.path.join(DEMO, "narration_full.mp3")
    com = edge_tts.Communicate(full_text, VOICE, rate="+5%", pitch="-2Hz")
    await com.save(full_path)
    print(f"  Saved: {full_path}")
    return durations, total

if __name__ == "__main__":
    asyncio.run(generate_all())
