#!/usr/bin/env python3
"""
Post-process a GIF produced by agg (asciinema-to-gif).

Uses Pillow to:
  1. Add a title/banner overlay to each frame
  2. Resize all frames to a target width
  3. Optimize by dropping near-duplicate frames

Usage:
  python generate-gif.py --input demo-raw.gif --output demo.gif
  python generate-gif.py --input demo-raw.gif --output demo.gif --title "readme-ai" --width 800
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageChops


# ---------------------------------------------------------------------------
# Frame extraction
# ---------------------------------------------------------------------------

def extract_frames(img: Image.Image) -> list[tuple[Image.Image, int]]:
    """Return a list of (frame, duration_ms) from an animated GIF."""
    frames: list[tuple[Image.Image, int]] = []
    try:
        while True:
            duration = img.info.get("duration", 100)
            frames.append((img.copy().convert("RGBA"), duration))
            img.seek(img.tell() + 1)
    except EOFError:
        pass
    return frames


# ---------------------------------------------------------------------------
# Resize
# ---------------------------------------------------------------------------

def resize_frames(
    frames: list[tuple[Image.Image, int]],
    target_width: int,
) -> list[tuple[Image.Image, int]]:
    """Scale every frame proportionally to *target_width*."""
    if not frames:
        return frames
    orig_w, orig_h = frames[0][0].size
    if orig_w <= target_width:
        return frames
    ratio = target_width / orig_w
    target_height = int(orig_h * ratio)
    return [
        (f.resize((target_width, target_height), Image.LANCZOS), d)
        for f, d in frames
    ]


# ---------------------------------------------------------------------------
# Text overlay
# ---------------------------------------------------------------------------

def add_text_overlay(
    frames: list[tuple[Image.Image, int]],
    text: str,
    font_size: int = 24,
    banner_height: int = 48,
    bg_color: str = "#1e1e2e",
    fg_color: str = "#cdd6f4",
) -> list[tuple[Image.Image, int]]:
    """Draw a banner with *text* at the top of every frame."""
    if not frames or not text:
        return frames

    try:
        font = ImageFont.truetype("arial.ttf", font_size)
    except OSError:
        font = ImageFont.load_default()

    result: list[tuple[Image.Image, int]] = []
    for frame, duration in frames:
        w, h = frame.size
        new_img = Image.new("RGBA", (w, h + banner_height), bg_color)

        # Draw banner text
        draw = ImageDraw.Draw(new_img)
        bbox = draw.textbbox((0, 0), text, font=font)
        text_w = bbox[2] - bbox[0]
        text_x = (w - text_w) // 2
        text_y = (banner_height - font_size) // 2
        draw.text((text_x, text_y), text, fill=fg_color, font=font)

        # Paste original frame below banner
        new_img.paste(frame, (0, banner_height))
        result.append((new_img, duration))

    return result


# ---------------------------------------------------------------------------
# Optimization — drop near-duplicate frames
# ---------------------------------------------------------------------------

def _frame_diff(a: Image.Image, b: Image.Image) -> float:
    """Return the mean pixel difference between two same-sized RGBA images."""
    diff = ImageChops.difference(a, b)
    stat = diff.convert("L")  # grayscale
    pixels = list(stat.getdata())
    return sum(pixels) / len(pixels) if pixels else 0.0


def optimize_gif(
    frames: list[tuple[Image.Image, int]],
    threshold: float = 1.5,
) -> list[tuple[Image.Image, int]]:
    """Drop frames that are nearly identical to their predecessor."""
    if len(frames) <= 2:
        return frames
    optimized: list[tuple[Image.Image, int]] = [frames[0]]
    for i in range(1, len(frames)):
        diff = _frame_diff(frames[i - 1][0], frames[i][0])
        if diff > threshold:
            optimized.append(frames[i])
        else:
            # Accumulate duration into the previous frame
            prev_frame, prev_dur = optimized[-1]
            optimized[-1] = (prev_frame, prev_dur + frames[i][1])
    return optimized


# ---------------------------------------------------------------------------
# Save
# ---------------------------------------------------------------------------

def save_gif(
    frames: list[tuple[Image.Image, int]],
    output_path: str,
) -> None:
    """Write frames back to an animated GIF."""
    if not frames:
        print("No frames to save.", file=sys.stderr)
        sys.exit(1)

    imgs = [f.convert("RGBA") for f, _ in frames]
    durations = [d for _, d in frames]

    # Convert to P mode for GIF compatibility
    palette_imgs = [im.convert("RGB").quantize(colors=256) for im in imgs]

    palette_imgs[0].save(
        output_path,
        save_all=True,
        append_images=palette_imgs[1:],
        duration=durations,
        loop=0,
        optimize=True,
    )

    size_kb = Path(output_path).stat().st_size / 1024
    print(f"Saved {output_path} ({len(frames)} frames, {size_kb:.0f} KB)")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Post-process a GIF with Pillow (resize, overlay, optimize)."
    )
    parser.add_argument("--input", required=True, help="Path to the input GIF")
    parser.add_argument("--output", required=True, help="Path for the output GIF")
    parser.add_argument("--title", default="", help="Banner text to overlay")
    parser.add_argument("--width", type=int, default=800, help="Target width in px")
    parser.add_argument(
        "--threshold",
        type=float,
        default=1.5,
        help="Duplicate-frame threshold (lower = more aggressive)",
    )
    args = parser.parse_args()

    img = Image.open(args.input)
    frames = extract_frames(img)
    print(f"Loaded {len(frames)} frames from {args.input}")

    frames = resize_frames(frames, args.width)
    frames = add_text_overlay(frames, args.title)
    frames = optimize_gif(frames, args.threshold)
    print(f"Optimized to {len(frames)} frames")

    save_gif(frames, args.output)


if __name__ == "__main__":
    main()
