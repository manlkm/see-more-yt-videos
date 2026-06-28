#!/usr/bin/env python3
"""
package.py — Package the extension into a zip file for Chrome Web Store publishing.
Usage: python package.py
Output: see-more-yt-videos-{version}.zip in the project root.
"""

import json
import os
import zipfile
from pathlib import Path

# Change to the script's directory
script_dir = Path(__file__).resolve().parent
os.chdir(script_dir)

# Read version from manifest.json
with open(script_dir / "manifest.json", "r", encoding="utf-8") as f:
    manifest = json.load(f)
version = manifest["version"]

output_name = f"see-more-yt-videos-{version}.zip"
output = script_dir / output_name

# Files and directories to include in the zip
include_files = [
    "manifest.json",
    "popup.html",
    "popup.css",
    "popup.js",
    "content.js",
    "icons/icon16.png",
    "icons/icon48.png",
    "icons/icon128.png",
]

# Collect all locale files under _locales/
locale_files = sorted(
    str(p.relative_to(script_dir))
    for p in script_dir.glob("_locales/**/*")
    if p.is_file()
)

all_files = include_files + locale_files

print("Packaging extension...")

# Remove all old zips matching see-more-yt-videos-*.zip
for old_zip in script_dir.glob("see-more-yt-videos-*.zip"):
    old_zip.unlink()
    print(f"  removed old: {old_zip.name}")

# Create the zip
with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as zf:
    for path in all_files:
        full_path = script_dir / path
        if full_path.exists():
            zf.write(full_path, path)
            print(f"  added: {path}")
        else:
            print(f"  skipped (not found): {path}")

# Report
size_bytes = output.stat().st_size
if size_bytes < 1024:
    size_str = f"{size_bytes} B"
elif size_bytes < 1024 * 1024:
    size_str = f"{size_bytes / 1024:.1f} KB"
else:
    size_str = f"{size_bytes / (1024 * 1024):.1f} MB"

print()
print(f"Done: {output}")
print(f"Size: {size_str}")
print()
print("This zip can be uploaded to the Chrome Web Store Developer Dashboard.")