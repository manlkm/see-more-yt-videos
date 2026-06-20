#!/usr/bin/env bash
#
# package.sh — Package the extension into a zip file for Chrome Web Store publishing.
# Usage: ./package.sh
# Output: see-more-yt-videos.zip in the project root.
#

set -euo pipefail

cd "$(dirname "$0")"

EXTENSION_DIR="$(pwd)"
OUTPUT="$EXTENSION_DIR/see-more-yt-videos.zip"

# Files and directories to include in the zip
INCLUDE=(
  manifest.json
  popup.html
  popup.css
  popup.js
  content.js
  icons/icon16.png
  icons/icon48.png
  icons/icon128.png
)

echo "Packaging extension..."

# Remove old zip if it exists
rm -f "$OUTPUT"

# Create the zip (macOS compatible)
cd "$EXTENSION_DIR"
zip -r "$OUTPUT" "${INCLUDE[@]}"

echo ""
echo "Done: $OUTPUT"
echo "Size: $(du -h "$OUTPUT" | cut -f1)"
echo ""
echo "This zip can be uploaded to the Chrome Web Store Developer Dashboard."
