"""
Replace backgrounds on braiding-studio hairstyle photos with a
neutral professional salon backdrop.

This uses rembg's u2net_human_seg model — purpose-built for portraits
with hair — plus alpha matting to preserve braid wisps and curly
extensions cleanly.

USAGE (run on Ben's Mac, NOT in the Cowork sandbox):

  cd ~/Documents/braiding-studio/public/images
  python3 -m venv .venv && source .venv/bin/activate
  pip install --upgrade pip
  pip install "rembg[cpu]" pillow numpy onnxruntime
  python3 originals/replace_backgrounds.py

The script:
  - Reads every .jpg in originals/ (skipping deb-*.jpg unless --include-deb)
  - Writes the new version to ../images/<same filename>.jpg
  - Keeps a copy of any prior output in originals/_pre_rembg_<filename>
    (only on first run) so nothing is overwritten silently.

Tweak BACKDROP_STYLE below to switch backdrop palette without code edits.
"""

from __future__ import annotations
import argparse
import sys
from pathlib import Path

import numpy as np
from PIL import Image

try:
    from rembg import new_session, remove
except ImportError as e:
    sys.stderr.write(
        "rembg is not installed. From this folder run:\n"
        "  python3 -m venv .venv && source .venv/bin/activate\n"
        '  pip install "rembg[cpu]" pillow numpy onnxruntime\n'
    )
    raise SystemExit(1) from e


# ----------------------------- backdrop --------------------------------
# Pick one. All three look "professional salon" but read differently
# on Instagram grids. Cream is the most universally flattering for
# both light and dark clothing; charcoal is more editorial.
BACKDROP_STYLE = "cream"   # "cream" | "warm_taupe" | "charcoal"

PALETTES = {
    # (center_BGR, edge_BGR) — soft warm cream center, taupe edges
    "cream":      ((232, 226, 218), (190, 180, 168)),
    "warm_taupe": ((205, 192, 178), (155, 142, 128)),
    "charcoal":   ((78, 76, 74),    (38, 36, 34)),
}


def make_backdrop(w: int, h: int, style: str = BACKDROP_STYLE) -> np.ndarray:
    """Soft radial-gradient studio backdrop. Returns RGB uint8 (h, w, 3)."""
    center_bgr, edge_bgr = PALETTES[style]
    # convert BGR->RGB
    center = np.array(center_bgr[::-1], dtype=np.float32)
    edge   = np.array(edge_bgr[::-1],   dtype=np.float32)

    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    cx, cy = w / 2.0, h * 0.42
    max_r = np.sqrt(cx * cx + max(cy, h - cy) ** 2)
    r = np.clip(np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2) / max_r, 0.0, 1.0)
    t = r * r * (3 - 2 * r)
    bg = center * (1 - t[..., None]) + edge * t[..., None]

    # subtle vertical falloff (soft overhead studio light)
    vfall = np.linspace(1.04, 0.95, h, dtype=np.float32)[:, None, None]
    bg = bg * vfall

    # very faint film grain so it doesn't read as flat CGI
    rng = np.random.default_rng(42)
    grain = rng.normal(0, 1.5, size=bg.shape).astype(np.float32)
    bg = np.clip(bg + grain, 0, 255).astype(np.uint8)
    return bg


# ----------------------------- compositing -----------------------------

def composite(rgba_subject: Image.Image, style: str) -> Image.Image:
    """Take an RGBA subject (alpha = mask from rembg) and composite onto the backdrop."""
    w, h = rgba_subject.size
    backdrop = Image.fromarray(make_backdrop(w, h, style), mode="RGB")
    # Pillow alpha_composite needs RGBA backdrop
    backdrop_rgba = backdrop.convert("RGBA")
    out = Image.alpha_composite(backdrop_rgba, rgba_subject)
    return out.convert("RGB")


# ----------------------------- main pipeline ---------------------------

def process_one(in_path: Path, out_path: Path, session) -> None:
    src = Image.open(in_path).convert("RGB")
    # rembg does the segmentation; alpha matting cleans hair edges
    rgba = remove(
        src,
        session=session,
        alpha_matting=True,
        alpha_matting_foreground_threshold=240,
        alpha_matting_background_threshold=15,
        alpha_matting_erode_size=4,
    )
    out = composite(rgba, BACKDROP_STYLE)
    # high-quality JPEG to preserve braid detail
    out.save(out_path, "JPEG", quality=92, optimize=True, progressive=True)
    print(f"OK  {in_path.name} -> {out_path.name}  ({src.size[0]}x{src.size[1]})")


def main() -> None:
    ap = argparse.ArgumentParser(description="Replace backgrounds with a neutral salon backdrop.")
    ap.add_argument(
        "--source",
        default=str(Path(__file__).parent),
        help="Folder containing the originals (default: this script's folder).",
    )
    ap.add_argument(
        "--dest",
        default=str(Path(__file__).parent.parent),
        help="Folder to write the new versions (default: parent of source).",
    )
    ap.add_argument(
        "--include-deb",
        action="store_true",
        help="Also process deb-*.jpg files (skipped by default).",
    )
    ap.add_argument(
        "--style",
        choices=list(PALETTES.keys()),
        default=BACKDROP_STYLE,
        help="Backdrop palette.",
    )
    args = ap.parse_args()

    src_dir = Path(args.source).resolve()
    dst_dir = Path(args.dest).resolve()
    dst_dir.mkdir(parents=True, exist_ok=True)

    global BACKDROP_STYLE
    BACKDROP_STYLE = args.style

    # u2net_human_seg is the right model for portraits with hair.
    # First run will download the ~170MB model into ~/.u2net/.
    session = new_session("u2net_human_seg")

    files = sorted(p for p in src_dir.glob("*.jpg") if p.is_file())
    if not args.include_deb:
        files = [p for p in files if not p.name.startswith("deb-")]
    # Skip our own helper files
    files = [p for p in files if not p.name.startswith("_")]

    if not files:
        sys.stderr.write(f"No .jpg files found in {src_dir}\n")
        raise SystemExit(2)

    print(f"Processing {len(files)} files")
    print(f"  source: {src_dir}")
    print(f"  dest:   {dst_dir}")
    print(f"  style:  {BACKDROP_STYLE}\n")

    for p in files:
        out = dst_dir / p.name
        # Don't blindly overwrite the live image — keep a one-time backup
        if out.exists():
            backup = src_dir / f"_pre_rembg_{p.name}"
            if not backup.exists():
                backup.write_bytes(out.read_bytes())
        process_one(p, out, session)

    print("\nDone. Review the files in:", dst_dir)


if __name__ == "__main__":
    main()
