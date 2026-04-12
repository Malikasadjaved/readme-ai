#!/usr/bin/env bash
#
# Record the readme-ai demo GIF.
#
# Pipeline:  VHS (.tape) -> asciinema (.cast) -> agg (.gif) -> Pillow (.gif)
#
# Prerequisites:
#   - vhs   : https://github.com/charmbracelet/vhs
#   - agg   : https://github.com/asciinema/agg
#   - python3 + Pillow : pip install Pillow
#
# Usage:
#   bash demo/record.sh

set -euo pipefail
cd "$(dirname "$0")"

# ---------- Check prerequisites ----------

check_cmd() {
  if ! command -v "$1" &>/dev/null; then
    echo "ERROR: '$1' is not installed. $2"
    exit 1
  fi
}

check_cmd vhs   "Install: https://github.com/charmbracelet/vhs#installation"
check_cmd agg   "Install: https://github.com/asciinema/agg#installation"
check_cmd python3 "Install Python 3.8+"

python3 -c "import PIL" 2>/dev/null || {
  echo "ERROR: Pillow is not installed. Run: pip install Pillow"
  exit 1
}

# ---------- Step 1: Record with VHS ----------

echo "==> Step 1/3: Recording terminal with VHS..."
vhs demo.tape

if [ ! -f demo.cast ]; then
  echo "ERROR: VHS did not produce demo.cast"
  exit 1
fi
echo "    Recorded demo.cast"

# ---------- Step 2: Convert to GIF with agg ----------

echo "==> Step 2/3: Converting to GIF with agg..."
agg demo.cast demo-raw.gif \
  --font-size 16 \
  --cols 120 \
  --rows 35 \
  --theme monokai

echo "    Created demo-raw.gif"

# ---------- Step 3: Post-process with Pillow ----------

echo "==> Step 3/3: Post-processing with Pillow..."
python3 generate-gif.py \
  --input  demo-raw.gif \
  --output demo.gif \
  --title  "readme-ai  —  Generate READMEs from code" \
  --width  800

# ---------- Cleanup ----------

rm -f demo.cast demo-raw.gif demo-screenshot.png
echo ""
echo "Done! Output: demo/demo.gif"
ls -lh demo.gif 2>/dev/null || true
