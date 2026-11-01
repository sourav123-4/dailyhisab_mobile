"""Renders the bundled exercise demos (assets/demos). Build: clang -O3 -ffast-math render.c -o render -lm; run: python3 make.py [ids]."""
import math
import os
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor

import numpy as np

from exercises import EXERCISES
from rig import nrm

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out")
FPS = 30
W, H = 540, 540


def ease(x):
    return 0.5 - 0.5 * math.cos(math.pi * min(max(x, 0.0), 1.0))


def phase_at(t, timing):
    """timing = (hold_start, up, hold_top, down). Returns 0..1 effort phase."""
    h0, up, h1, dn = timing
    if t < h0:
        return 0.0
    t -= h0
    if t < up:
        return ease(t / up)
    t -= up
    if t < h1:
        return 1.0
    t -= h1
    if t < dn:
        return 1.0 - ease(t / dn)
    return 0.0


def camera(ex):
    cam = ex["cam"]
    tgt = np.asarray(cam["target"], float)
    yaw, pitch, dist = cam["yaw"] * math.pi / 180, cam.get("pitch", 8) * math.pi / 180, cam["dist"]
    pos = tgt + dist * np.array([math.sin(yaw) * math.cos(pitch), math.sin(pitch), math.cos(yaw) * math.cos(pitch)])
    # key light from the camera's upper left, slightly in front of the figure
    ly = yaw - 0.75
    light = np.array([math.sin(ly) * 0.62, 0.8, math.cos(ly) * 0.62])
    n = np.array([math.sin(yaw), 0, math.cos(yaw)])
    wall_d = float(np.dot(n, tgt - n * cam.get("wall", 2.4)))
    return pos, tgt, cam.get("fov", 34), light, n, wall_d


def scene_text(ex, phases, ss):
    pos, tgt, fov, light, n, wall_d = camera(ex)
    head = [f"RES {W} {H} {ss}", f"CAM {pos[0]:.4f} {pos[1]:.4f} {pos[2]:.4f} {tgt[0]:.4f} {tgt[1]:.4f} {tgt[2]:.4f} {fov}",
            f"LIGHT {light[0]:.4f} {light[1]:.4f} {light[2]:.4f}", f"WALL {n[0]:.4f} 0 {n[2]:.4f} {wall_d:.4f}",
            f"FRAMES {len(phases)}"]
    body = [ex["fn"](ph).serialize() for ph in phases]
    return "\n".join(head + body) + "\n"


def render(ex_id, preview=False):
    ex = EXERCISES[ex_id]
    os.makedirs(OUT, exist_ok=True)
    timing = ex.get("timing", (0.35, 1.1, 0.35, 1.35))
    if preview:
        phases = [0.0, 0.33, 0.66, 1.0]
        ss = 1
    else:
        total = sum(timing)
        n = int(round(total * FPS))
        phases = [phase_at(i / FPS, timing) for i in range(n)]
        ss = 2
    scene = os.path.join(OUT, f"{ex_id}{'_p' if preview else ''}.scene")
    with open(scene, "w") as f:
        f.write(scene_text(ex, phases, ss))
    rend = subprocess.Popen([os.path.join(HERE, "render"), scene], stdout=subprocess.PIPE)
    if preview:
        out = os.path.join(OUT, f"{ex_id}_preview.png")
        cmd = ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-i", "-",
               "-vf", "scale=400:-1,tile=4x1", "-frames:v", "1", out]
    else:
        out = os.path.join(OUT, f"{ex_id}.mp4")
        cmd = ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS),
               "-i", "-", "-c:v", "libx264", "-profile:v", "main", "-pix_fmt", "yuv420p", "-crf", "23", "-preset", "slow",
               "-movflags", "+faststart", out]
    enc = subprocess.Popen(cmd, stdin=rend.stdout)
    rend.stdout.close()
    enc.wait()
    rc = rend.wait()
    return ex_id, rc, out


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    preview = "--preview" in sys.argv
    ids = args or list(EXERCISES)
    with ThreadPoolExecutor(max_workers=int(os.environ.get("JOBS", "9"))) as pool:
        for ex_id, rc, out in pool.map(lambda i: render(i, preview), ids):
            print(ex_id, "ok" if rc == 0 else f"render failed {rc}", out, flush=True)
