#!/usr/bin/env bash
# Resize a folder of photos to the size the deck actually displays them at.
# macOS only — uses sips, which reads HEIC and WebP without extra tooling.
#
#   ./prep-images.sh <source-dir> <out-dir> [max-px] [quality]
#
# Defaults: 1400px, quality 48. Names are lowercased and stripped of their
# extension, so photo "Tunel.HEIC" becomes web/tunel.jpg and is reachable from
# the template as __IMG_TUNEL__.
#
# Size to the RENDERED box, not the original. A photo shown in a 600px frame
# does not need 1600px, and the difference is megabytes. Run this again after
# any layout change that shrinks a photo's box.
#
# Rough guide at a 1440x810 stage:
#   full-height bleed photo   1400-1600
#   half-slide inset frame     900-1100
#   small framed thumbnail     600-800

set -euo pipefail

SRC=${1:?usage: prep-images.sh <source-dir> <out-dir> [max-px] [quality]}
OUT=${2:?usage: prep-images.sh <source-dir> <out-dir> [max-px] [quality]}
MAX=${3:-1400}
Q=${4:-48}

mkdir -p "$OUT"

shopt -s nullglob nocaseglob
count=0
failed=()

for f in "$SRC"/*.{jpg,jpeg,png,heic,webp,tif,tiff}; do
  base=$(basename "$f")
  stem="${base%.*}"
  # lowercase, and swap anything awkward for an underscore
  name=$(echo "$stem" | tr '[:upper:]' '[:lower:]' | tr -c 'a-z0-9_\n' '_')
  dest="$OUT/$name.jpg"

  if sips -s format jpeg -s formatOptions "$Q" -Z "$MAX" "$f" --out "$dest" >/dev/null 2>&1 \
     && [ -s "$dest" ]; then
    count=$((count + 1))
  else
    # sips exits 0 and writes nothing when it cannot read the file
    failed+=("$base")
  fi
done

echo "prep: $count image(s) → $OUT/ (max ${MAX}px, q${Q})"
[ ${#failed[@]} -gt 0 ] && printf 'prep: FAILED: %s\n' "${failed[*]}" >&2

# Always print what landed, so a silent failure cannot pass as success.
ls -la "$OUT" | awk 'NR>3 {s+=$5; printf "  %8d  %s\n", $5, $9} END {printf "  total: %d KB\n", s/1024}'
[ ${#failed[@]} -gt 0 ] && exit 1 || exit 0
