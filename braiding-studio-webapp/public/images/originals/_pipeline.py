"""
Background replacement for braiding-studio hairstyle photos.

Pipeline:
  1. GrabCut with central-rect initialization to get a rough subject mask.
  2. Refine mask: morphological close, smooth edges, feather alpha.
  3. Composite onto a procedural warm-neutral salon backdrop
     (radial gradient, cream -> taupe, soft vignette).
  4. Save as JPG with original filename and dimensions.

Run:
  python3 _pipeline.py <input.jpg> <output.jpg>
"""
import sys
from pathlib import Path
import numpy as np
import cv2


# ---------- backdrop ----------
def make_backdrop(w: int, h: int) -> np.ndarray:
    """Soft warm-neutral studio backdrop. Cream center -> taupe edges + vignette."""
    # BGR
    center_color = np.array([214, 220, 228], dtype=np.float32)   # warm cream
    edge_color   = np.array([168, 174, 188], dtype=np.float32)   # muted taupe

    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    cx, cy = w / 2.0, h * 0.45  # center slightly above middle (subject usually upper-center)
    # normalized radial distance, 0 at center, 1 at far corner
    max_r = np.sqrt(cx * cx + max(cy, h - cy) ** 2)
    r = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2) / max_r
    r = np.clip(r, 0.0, 1.0)
    # smooth ease-in-out
    t = r * r * (3 - 2 * r)
    bg = center_color * (1 - t[..., None]) + edge_color * t[..., None]

    # subtle vertical falloff so top is slightly lighter (like soft overhead light)
    vfall = np.linspace(1.04, 0.96, h, dtype=np.float32)[:, None, None]
    bg = bg * vfall
    bg = np.clip(bg, 0, 255).astype(np.uint8)

    # tiny grain so it doesn't look CGI-flat
    rng = np.random.default_rng(42)
    grain = rng.normal(0, 1.4, size=bg.shape).astype(np.float32)
    bg = np.clip(bg.astype(np.float32) + grain, 0, 255).astype(np.uint8)
    return bg


# ---------- segmentation ----------
def subject_mask(img_bgr: np.ndarray) -> np.ndarray:
    """Return float32 alpha mask (0..1) of the subject."""
    h, w = img_bgr.shape[:2]

    # GrabCut init: assume subject occupies central 80% horizontally, full height-ish
    # Tighten margins; portrait photos have person roughly centered.
    margin_x = int(w * 0.06)
    margin_y_top = int(h * 0.02)
    margin_y_bot = int(h * 0.02)
    rect = (margin_x, margin_y_top, w - 2 * margin_x, h - margin_y_top - margin_y_bot)

    mask = np.zeros((h, w), dtype=np.uint8)
    bgd_model = np.zeros((1, 65), dtype=np.float64)
    fgd_model = np.zeros((1, 65), dtype=np.float64)

    # downscale for speed if huge
    scale = 1.0
    max_dim = 900
    if max(h, w) > max_dim:
        scale = max_dim / max(h, w)
        small = cv2.resize(img_bgr, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
        sh, sw = small.shape[:2]
        smask = np.zeros((sh, sw), dtype=np.uint8)
        srect = (int(rect[0] * scale), int(rect[1] * scale),
                 int(rect[2] * scale), int(rect[3] * scale))
        cv2.grabCut(small, smask, srect, bgd_model, fgd_model, 5, cv2.GC_INIT_WITH_RECT)
        # convert gc labels to {0,1}
        bin_small = np.where((smask == 1) | (smask == 3), 1, 0).astype(np.uint8)
        bin_full = cv2.resize(bin_small, (w, h), interpolation=cv2.INTER_NEAREST)
    else:
        cv2.grabCut(img_bgr, mask, rect, bgd_model, fgd_model, 5, cv2.GC_INIT_WITH_RECT)
        bin_full = np.where((mask == 1) | (mask == 3), 1, 0).astype(np.uint8)

    # keep only the largest connected component (drops random background blobs)
    nlbl, lbl, stats, _ = cv2.connectedComponentsWithStats(bin_full, connectivity=8)
    if nlbl > 1:
        # ignore label 0 (bg)
        biggest = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
        bin_full = (lbl == biggest).astype(np.uint8)

    # close small holes inside the subject
    k = max(3, int(min(h, w) * 0.005))
    if k % 2 == 0:
        k += 1
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k))
    bin_full = cv2.morphologyEx(bin_full, cv2.MORPH_CLOSE, kernel, iterations=1)

    # feather edges: distance-based soft alpha so hair flyaways aren't hard-cut
    alpha = bin_full.astype(np.float32)
    # Gaussian feather radius scales with image size
    fr = max(2, int(min(h, w) * 0.004))
    if fr % 2 == 0:
        fr += 1
    alpha = cv2.GaussianBlur(alpha, (fr * 2 + 1, fr * 2 + 1), 0)

    # Detect a "phantom horizontal cut" — common when the original photo
    # cropped the body, OR when the body's lower clothing blends into the
    # background and GrabCut amputates it. Find the bottommost row of the
    # subject mask; if many columns terminate there, it's a flat cut, not
    # a natural shoulder/curve. Feather above it so it dissolves into the
    # new backdrop instead of looking guillotined.
    ys_any = np.where(alpha.max(axis=1) > 0.5)[0]
    if len(ys_any) > 0:
        subj_bottom = int(ys_any[-1])
        # how many columns end within 15px of subj_bottom (i.e. share a flat edge)
        last_row_per_col = np.full(w, -1, dtype=np.int32)
        col_has = alpha.max(axis=0) > 0.5
        for x in np.where(col_has)[0]:
            last_row_per_col[x] = int(np.where(alpha[:, x] > 0.5)[0][-1])
        flat_edge_cols = (last_row_per_col >= subj_bottom - 15) & col_has
        flat_frac = flat_edge_cols.sum() / max(1, col_has.sum())

        # If many columns share the bottommost row, OR subject reaches near
        # image bottom, apply a fade.
        if flat_frac > 0.20 or subj_bottom > h * 0.85:
            fade_h = int(h * 0.16)
            start = max(0, subj_bottom - fade_h)
            end = min(h, subj_bottom + 8)
            actual_h = end - start
            ramp = np.linspace(1.0, 0.0, actual_h, dtype=np.float32) ** 1.5
            alpha[start:end, :] *= ramp[:, None]

    return np.clip(alpha, 0.0, 1.0)


# ---------- composite ----------
def composite(img_bgr: np.ndarray, alpha: np.ndarray) -> np.ndarray:
    h, w = img_bgr.shape[:2]
    bg = make_backdrop(w, h).astype(np.float32)
    fg = img_bgr.astype(np.float32)
    a = alpha[..., None]
    out = fg * a + bg * (1 - a)
    return np.clip(out, 0, 255).astype(np.uint8)


# ---------- main ----------
def process(in_path: str, out_path: str) -> None:
    img = cv2.imread(in_path, cv2.IMREAD_COLOR)
    if img is None:
        raise SystemExit(f"could not read {in_path}")
    alpha = subject_mask(img)
    out = composite(img, alpha)
    # save with high jpeg quality to preserve detail (these are portfolio shots)
    cv2.imwrite(out_path, out, [cv2.IMWRITE_JPEG_QUALITY, 92])
    print(f"OK  {Path(in_path).name} -> {Path(out_path).name}  ({img.shape[1]}x{img.shape[0]})")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("usage: _pipeline.py <input> <output>")
    process(sys.argv[1], sys.argv[2])
