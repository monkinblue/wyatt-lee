#!/usr/bin/env python3
"""
Automated Security, Privacy, EXIF, Asset Size, and Anti-Phishing Verification Suite.
"""

import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
# Derive forbidden token dynamically from parent folder prefix without hardcoding it
FORBIDDEN_FIRST_NAME = ROOT.name.split("-")[0].lower()

TEXT_DIRS = [ROOT / "src", ROOT / "public", ROOT / "scripts", ROOT / ".github"]
SINGLE_FILES = [
    ROOT / "index.html",
    ROOT / "package.json",
    ROOT / "package-lock.json",
    ROOT / "vite.config.ts",
]

MAX_PUBLIC_FILE_BYTES = 50 * 1024 * 1024  # 50 MB


def main() -> None:
    assert len(FORBIDDEN_FIRST_NAME) >= 3, "Unexpected workspace folder name"

    # 1. Verify package.json name == "wl-studio"
    pkg = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))
    assert pkg.get("name") == "wl-studio", f"Expected package name 'wl-studio', got {pkg.get('name')}"

    # 2. Check .gitignore excludes node_modules/, dist/, Paintings/
    gitignore_text = (ROOT / ".gitignore").read_text(encoding="utf-8")
    for required_ignore in ("node_modules/", "dist/", "Paintings/"):
        assert required_ignore in gitignore_text, f"{required_ignore} missing from .gitignore"

    # 3. Check CNAME, robots.txt, and noindex meta
    cname_text = (ROOT / "public" / "CNAME").read_text(encoding="utf-8").strip()
    assert cname_text.endswith(".com") and "\n" not in cname_text, "Invalid public/CNAME"

    robots_text = (ROOT / "public" / "robots.txt").read_text(encoding="utf-8").strip()
    assert robots_text == "User-agent: *\nAllow: /", f"Unexpected public/robots.txt: {robots_text!r}"

    index_html = (ROOT / "index.html").read_text(encoding="utf-8")
    assert '<meta name="robots" content="noindex, nofollow" />' in index_html, "Missing noindex meta in index.html"
    assert '<meta property="og:url" content="https://wyattlee.com/" />' in index_html, "Invalid og:url in index.html"

    # 4. Scan all source, JSON, HTML, CSS, SVG, workflow, and script files for zero first-name leakage
    # (excluding the literal domain string in CNAME / Open Graph URLs)
    domain_token = FORBIDDEN_FIRST_NAME + "lee.com"
    checked_files = 0
    for f in SINGLE_FILES:
        if f.exists():
            raw_lower = f.read_text(encoding="utf-8", errors="ignore").lower()
            sanitized = raw_lower.replace(domain_token, "")
            assert FORBIDDEN_FIRST_NAME not in sanitized, f"Forbidden name leak in {f.name}"
            if f.suffix.lower() == ".html":
                assert "<input" not in raw_lower, f"Anti-phishing check failed: <input> found in {f.name}"
            checked_files += 1

    for d in TEXT_DIRS:
        if not d.exists():
            continue
        for p in d.rglob("*"):
            if p.is_dir():
                continue
            if p.resolve() == (ROOT / "public" / "CNAME").resolve():
                checked_files += 1
                continue

            assert FORBIDDEN_FIRST_NAME not in p.name.lower(), f"Forbidden name in filename {p.name}"
            if p.suffix.lower() in {".ts", ".tsx", ".js", ".json", ".css", ".html", ".svg", ".py", ".md", ".yml", ".yaml", ".txt"}:
                text = p.read_text(encoding="utf-8", errors="ignore")
                sanitized = text.lower().replace(domain_token, "")
                assert FORBIDDEN_FIRST_NAME not in sanitized, f"Forbidden name leak in {p}"
                if p.suffix.lower() in {".tsx", ".html"}:
                    assert "<input" not in text.lower(), f"Anti-phishing check failed: <input> found in {p}"
                checked_files += 1

    # 5. Verify 100% EXIF / GPS / XMP scrub AND < 50MB size across all files in public/
    public_files = [p for p in (ROOT / "public").rglob("*") if p.is_file()]
    webp_files = [p for p in public_files if p.suffix.lower() == ".webp"]
    og_card = ROOT / "public" / "og-card.jpg"
    assert og_card.exists(), "Missing public/og-card.jpg"
    with Image.open(og_card) as og_im:
        assert og_im.format == "JPEG", f"Expected JPEG for og-card.jpg, got {og_im.format}"
        assert og_im.size == (1200, 630), f"Expected 1200x630 for og-card.jpg, got {og_im.size}"
        assert len(og_im.getexif()) == 0, "EXIF tags found in og-card.jpg"
        assert "exif" not in og_im.info and "xmp" not in og_im.info, "Metadata info found in og-card.jpg"
    assert len(webp_files) == 39, f"Expected 39 WebP plates, got {len(webp_files)}"

    max_bytes = 0
    total_bytes = 0
    for pf in public_files:
        sz = pf.stat().st_size
        max_bytes = max(max_bytes, sz)
        total_bytes += sz
        assert sz < MAX_PUBLIC_FILE_BYTES, f"File exceeds 50MB: {pf.name} ({sz} bytes)"

    for wp in webp_files:
        with Image.open(wp) as im:
            assert len(im.getexif()) == 0, f"EXIF tags found in {wp.name}"
            assert "exif" not in im.info and "xmp" not in im.info and "icc_profile" not in im.info, (
                f"Metadata info found in {wp.name}: {list(im.info.keys())}"
            )

    print(f"[PASS] package.json name='wl-studio', CNAME, robots.txt, and noindex verified.")
    print(f"[PASS] 0 first-name leaks and 0 <input> elements across {checked_files} files.")
    print(f"[PASS] {len(webp_files)} WebP files verified with 0 EXIF/GPS/XMP/ICC metadata.")
    print(f"[PASS] public/ size check: {len(public_files)} files, max={max_bytes / (1024*1024):.2f} MB, total={total_bytes / (1024*1024):.2f} MB (< 50 MB limit).")


if __name__ == "__main__":
    main()
