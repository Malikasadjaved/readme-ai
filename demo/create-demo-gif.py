#!/usr/bin/env python3
"""
Generate a terminal-style demo GIF for readme-ai using Pillow.

No VHS or terminal recording needed — renders synthetic frames directly.

Usage:
    python demo/create-demo-gif.py
    python demo/create-demo-gif.py --output demo/demo.gif --width 900 --height 480
"""

from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

# ---------------------------------------------------------------------------
# Theme (Catppuccin Mocha)
# ---------------------------------------------------------------------------

BG = "#1e1e2e"
FG = "#cdd6f4"
GREEN = "#a6e3a1"
YELLOW = "#f9e2af"
BLUE = "#89b4fa"
MAUVE = "#cba6f7"
RED = "#f38ba8"
TEAL = "#94e2d5"
DIM = "#7f849c"
TITLE_BG = "#313244"
SURFACE0 = "#313244"
OVERLAY0 = "#6c7086"

# ---------------------------------------------------------------------------
# Font helper
# ---------------------------------------------------------------------------

def get_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for name in ("Consolas", "CascadiaCode", "Courier New", "DejaVuSansMono", "monospace"):
        try:
            return ImageFont.truetype(name + ".ttf", size)
        except OSError:
            try:
                return ImageFont.truetype(name, size)
            except OSError:
                continue
    return ImageFont.load_default()


# ---------------------------------------------------------------------------
# Drawing helpers
# ---------------------------------------------------------------------------

LH = 28  # line height
PAD_X = 28  # left padding
TITLE_BAR_H = 40

def make_frame(width: int, height: int) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    img = Image.new("RGB", (width, height), BG)
    draw = ImageDraw.Draw(img)
    return img, draw


def draw_title_bar(draw: ImageDraw.ImageDraw, width: int, font: ImageFont.ImageFont) -> int:
    """Draw a macOS-style title bar. Returns y position for content."""
    draw.rectangle([0, 0, width, TITLE_BAR_H], fill=TITLE_BG)
    # Traffic lights
    for i, color in enumerate(["#ed6a5e", "#f5bf4f", "#61c554"]):
        cx = 22 + i * 24
        cy = TITLE_BAR_H // 2
        draw.ellipse([cx - 7, cy - 7, cx + 7, cy + 7], fill=color)
    # Title text
    title = "readme-ai"
    bbox = draw.textbbox((0, 0), title, font=font)
    tw = bbox[2] - bbox[0]
    draw.text(((width - tw) // 2, 10), title, fill=OVERLAY0, font=font)
    return TITLE_BAR_H + 14


def draw_line(draw, x, y, segments, font):
    """Draw a line with colored segments: [(text, color), ...]"""
    cx = x
    for text, color in segments:
        draw.text((cx, y), text, fill=color, font=font)
        bbox = draw.textbbox((0, 0), text, font=font)
        cx += bbox[2] - bbox[0]
    return y + LH


def draw_separator(draw, x, y, width, font):
    """Draw a subtle horizontal rule."""
    line = "─" * 46
    draw.text((x, y), line, fill=OVERLAY0, font=font)
    return y + LH


# ---------------------------------------------------------------------------
# Frame builders
# ---------------------------------------------------------------------------

def intro_frames(width, height, font, title_font, big_font) -> list[tuple[Image.Image, int]]:
    """Splash intro with project name."""
    frames = []
    for alpha_step in range(6):
        img, draw = make_frame(width, height)
        draw_title_bar(draw, width, title_font)

        # Center the project name
        name = "readme-ai"
        bbox = draw.textbbox((0, 0), name, font=big_font)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        nx = (width - tw) // 2
        ny = (height - th) // 2 - 30

        tagline = "Generate READMEs from code in seconds"
        tbbox = draw.textbbox((0, 0), tagline, font=font)
        ttw = tbbox[2] - tbbox[0]
        tx = (width - ttw) // 2

        # Fade in effect via brightness
        brightness = int(255 * (alpha_step / 5))
        name_color = f"#{brightness:02x}{brightness:02x}{max(brightness, 180):02x}"
        tag_color = f"#{min(brightness, 150):02x}{min(brightness, 160):02x}{min(brightness, 180):02x}"

        draw.text((nx, ny), name, fill=name_color, font=big_font)
        draw.text((tx, ny + th + 16), tagline, fill=tag_color, font=font)

        frames.append((img, 200 if alpha_step < 5 else 1200))
    return frames


def typing_frames(
    width, height, font, title_font, text: str, prefix: str = "$ ",
    base_lines: list[list[tuple[str, str]]] | None = None,
    char_delay: int = 55,
) -> list[tuple[Image.Image, int]]:
    """Simulate typing a command character by character."""
    frames = []
    base_lines = base_lines or []

    for i in range(len(text) + 1):
        img, draw = make_frame(width, height)
        y = draw_title_bar(draw, width, font)

        for segs in base_lines:
            y = draw_line(draw, PAD_X, y, segs, font)

        partial = text[:i]
        cursor = "_"
        y = draw_line(draw, PAD_X, y, [
            (prefix, GREEN),
            (partial, FG),
            (cursor, GREEN if i % 2 == 0 else BG),
        ], font)

        if i == 0:
            frames.append((img, 500))
        elif i == len(text):
            frames.append((img, 700))
        elif i % 2 == 0:
            frames.append((img, char_delay))
    return frames


def static_frame(
    width, height, font, title_font,
    lines: list[list[tuple[str, str]]],
    duration: int = 1000,
) -> list[tuple[Image.Image, int]]:
    """Single static frame with colored lines."""
    img, draw = make_frame(width, height)
    y = draw_title_bar(draw, width, title_font)
    for segs in lines:
        y = draw_line(draw, PAD_X, y, segs, font)
    return [(img, duration)]


def progress_frames(
    width, height, font, title_font,
    base_lines: list[list[tuple[str, str]]],
    steps: list[tuple[str, str]],
    bar_width: int = 25,
) -> list[tuple[Image.Image, int]]:
    """Animate a multi-step progress bar with step counters."""
    frames = []
    total_steps = len(steps)

    for step_idx, (label, _marker) in enumerate(steps):
        sub_steps = 5
        for sub in range(sub_steps + 1):
            img, draw = make_frame(width, height)
            y = draw_title_bar(draw, width, font)

            for segs in base_lines:
                y = draw_line(draw, PAD_X, y, segs, font)

            # Completed steps
            for prev_idx in range(step_idx):
                prev_label, _ = steps[prev_idx]
                step_num = f"[{prev_idx + 1}/{total_steps}]"
                y = draw_line(draw, PAD_X, y, [
                    (f"  {step_num} ", GREEN),
                    (prev_label, GREEN),
                    ("  ", FG),
                    ("done", GREEN),
                ], font)

            # Current step with animated bar
            pct = int((sub / sub_steps) * 100)
            filled = int((sub / sub_steps) * bar_width)
            bar = "=" * filled + (">" if filled < bar_width else "") + " " * max(0, bar_width - filled - 1)
            color = YELLOW if pct < 100 else GREEN
            status = "done" if pct == 100 else f"{pct}%"
            step_num = f"[{step_idx + 1}/{total_steps}]"

            y = draw_line(draw, PAD_X, y, [
                (f"  {step_num} ", color),
                (label, color),
            ], font)
            y = draw_line(draw, PAD_X, y, [
                ("         [", DIM),
                (bar, BLUE),
                ("] ", DIM),
                (status, color),
            ], font)

            # Remaining steps (dimmed)
            for future_idx in range(step_idx + 1, total_steps):
                fl, _ = steps[future_idx]
                fnum = f"[{future_idx + 1}/{total_steps}]"
                y = draw_line(draw, PAD_X, y, [
                    (f"  {fnum} ", DIM),
                    (fl, DIM),
                ], font)

            frames.append((img, 100 if sub < sub_steps else 250))

    return frames


def output_reveal_frames(
    width, height, font, title_font,
    base_lines: list[list[tuple[str, str]]],
    output_lines: list[list[tuple[str, str]]],
    line_delay: int = 120,
) -> list[tuple[Image.Image, int]]:
    """Reveal output lines one at a time."""
    frames = []

    for i in range(len(output_lines) + 1):
        img, draw = make_frame(width, height)
        y = draw_title_bar(draw, width, font)

        for segs in base_lines:
            y = draw_line(draw, PAD_X, y, segs, font)

        for segs in output_lines[:i]:
            y = draw_line(draw, PAD_X, y, segs, font)

        dur = line_delay if i < len(output_lines) else 2000
        frames.append((img, dur))

    return frames


def cursor_blink_frames(
    width, height, font, title_font,
    all_lines: list[list[tuple[str, str]]],
    blinks: int = 4,
) -> list[tuple[Image.Image, int]]:
    """Blinking cursor at the end to feel alive."""
    frames = []
    for b in range(blinks * 2):
        img, draw = make_frame(width, height)
        y = draw_title_bar(draw, width, font)
        for segs in all_lines:
            y = draw_line(draw, PAD_X, y, segs, font)
        # Cursor on/off
        cursor_char = "_" if b % 2 == 0 else " "
        draw_line(draw, PAD_X, y, [("$ ", GREEN), (cursor_char, GREEN)], font)
        frames.append((img, 500))
    return frames


# ---------------------------------------------------------------------------
# Main GIF assembly
# ---------------------------------------------------------------------------

def generate_demo(output: str, width: int = 900, height: int = 620):
    font = get_font(18)
    title_font = get_font(14)
    big_font = get_font(36)

    all_frames: list[tuple[Image.Image, int]] = []

    cmd = "npx @malikasadjaved/readme-ai"

    # Scene 0: Intro splash
    all_frames += intro_frames(width, height, font, title_font, big_font)

    # Scene 1: Type the command
    all_frames += typing_frames(width, height, font, title_font, cmd)

    # Scene 2: Pipeline running
    cmd_line = [("$ ", GREEN), (cmd, FG)]
    blank = [("", FG)]

    steps = [
        ("Scanning repository", ""),
        ("Analyzing source code", ""),
        ("Detecting frameworks & deps", ""),
        ("Generating with Claude AI", ""),
        ("Rendering theme", ""),
    ]

    header_lines = [
        cmd_line,
        blank,
        [("  readme-ai v1.0.1", MAUVE)],
    ]

    all_frames += static_frame(width, height, font, title_font, header_lines, 600)
    all_frames += progress_frames(width, height, font, title_font, header_lines, steps)

    # Scene 3: Output summary
    total = len(steps)
    done_lines = list(header_lines)
    for idx, (label, _) in enumerate(steps):
        done_lines.append([
            (f"  [{idx+1}/{total}] ", GREEN),
            (label, GREEN),
            ("  ", FG),
            ("done", GREEN),
        ])

    output_lines = [
        blank,
        [("  ", FG), ("README.md generated successfully!", GREEN)],
        blank,
        [("  Sections:", BLUE)],
        [("    Title, badges, description", FG)],
        [("    Architecture diagram (Mermaid)", FG)],
        [("    Installation & quick start", FG)],
        [("    API reference & CLI options", FG)],
        [("    Contributing guide & license", FG)],
        blank,
        [("  Theme:    ", DIM), ("default", MAUVE)],
        [("  Provider: ", DIM), ("claude (sonnet-4)", BLUE)],
        [("  Lines:    ", DIM), ("287", YELLOW)],
        [("  Time:     ", DIM), ("4.2s", GREEN)],
    ]

    all_frames += output_reveal_frames(
        width, height, font, title_font, done_lines, output_lines
    )

    # Scene 4: Blinking cursor at the end
    final_lines = done_lines + output_lines
    all_frames += cursor_blink_frames(width, height, font, title_font, final_lines)

    # Save
    save_gif(all_frames, output)


def save_gif(frames: list[tuple[Image.Image, int]], output_path: str):
    if not frames:
        print("No frames to save.", file=sys.stderr)
        sys.exit(1)

    imgs = [f.convert("RGB").quantize(colors=256, method=Image.Quantize.MEDIANCUT) for f, _ in frames]
    durations = [d for _, d in frames]

    imgs[0].save(
        output_path,
        save_all=True,
        append_images=imgs[1:],
        duration=durations,
        loop=0,
        optimize=True,
    )

    size_kb = Path(output_path).stat().st_size / 1024
    print(f"Saved {output_path} ({len(frames)} frames, {size_kb:.0f} KB)")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Generate readme-ai demo GIF with Pillow")
    parser.add_argument("--output", default="demo/demo.gif", help="Output GIF path")
    parser.add_argument("--width", type=int, default=900, help="Frame width")
    parser.add_argument("--height", type=int, default=620, help="Frame height")
    args = parser.parse_args()

    Path(args.output).parent.mkdir(parents=True, exist_ok=True)

    print("Generating demo GIF...")
    start = time.time()
    generate_demo(args.output, args.width, args.height)
    elapsed = time.time() - start
    print(f"Done in {elapsed:.1f}s")


if __name__ == "__main__":
    main()
