#!/usr/bin/env python3
"""
Generates `public/og-card.jpg` (1200x630, EXIF-free high-chroma JPEG) for universal
Open Graph / Twitter / iMessage / Slack / WhatsApp / Discord link previews.
"""

from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
ART_PATH = ROOT / "public" / "artworks" / "wl-lot-01-full.webp"
OUT_PATH = ROOT / "public" / "og-card.jpg"


def load_font(candidates: list[Path], size: int) -> ImageFont.FreeTypeFont:
    for p in candidates:
        if p.exists():
            try:
                return ImageFont.truetype(str(p), size=size)
            except OSError:
                continue
    return ImageFont.load_default()


def draw_tracked_text(
    draw: ImageDraw.ImageDraw,
    xy: tuple[float, float],
    text: str,
    font: ImageFont.FreeTypeFont,
    fill: tuple[int, int, int],
    tracking: float = 0.0,
) -> float:
    x, y = xy
    for ch in text:
        draw.text((x, y), ch, font=font, fill=fill)
        bbox = draw.textbbox((0, 0), ch, font=font)
        adv = font.getlength(ch) if hasattr(font, "getlength") else (bbox[2] - bbox[0])
        x += adv + tracking
    return x


def generate_og_card() -> None:
    # Render at 2x supersampling (2400x1260) then downsample cleanly via Lanczos to 1200x630
    W, H = 2400, 1260
    canvas = Image.new("RGB", (W, H), (245, 242, 236))  # #F5F2EC Alabaster Plaster

    # Subtle museum plinth background on right side (x: 1120..2400)
    split_x = 1130
    right_w = W - split_x
    plinth = np.zeros((H, right_w, 3), dtype=np.float32)
    yy, xx = np.mgrid[0:H, 0:right_w].astype(np.float32)
    dist = np.hypot((xx - right_w * 0.5) / (right_w * 0.7), (yy - H * 0.38) / (H * 0.7))
    dist = np.clip(dist, 0.0, 1.2)
    top_col = np.array([242.0, 238.0, 229.0])
    edge_col = np.array([218.0, 212.0, 200.0])
    for c in range(3):
        plinth[:, :, c] = top_col[c] * (1.0 - 0.55 * dist) + edge_col[c] * (0.55 * dist)
    plinth_img = Image.fromarray(np.clip(plinth, 0, 255).astype(np.uint8))
    canvas.paste(plinth_img, (split_x, 0))

    # Load Lot 01 painting and extract a dramatic high-impact editorial crop
    with Image.open(ART_PATH) as art_im:
        art = art_im.convert("RGB")
        aw, ah = art.size
        # Crop rich upper-to-lower impasto + gold leaf + yellow confluence (aspect ~ 0.96)
        crop_w = aw
        crop_h = int(round(aw * 1.02))
        y0 = int(round((ah - crop_h) * 0.28))
        crop = art.crop((0, max(0, y0), crop_w, min(ah, y0 + crop_h)))

    # Museum Ebonized Ash Float Frame on right plinth
    art_target_w = 880
    art_target_h = 900
    crop_resized = crop.resize((art_target_w, art_target_h), Image.Resampling.LANCZOS)

    rabbet = 20
    moulding = 26
    frame_w = art_target_w + 2 * (rabbet + moulding)
    frame_h = art_target_h + 2 * (rabbet + moulding)
    fx = split_x + (right_w - frame_w) // 2
    fy = (H - frame_h) // 2

    # Soft gallery spotlight drop shadow behind float frame
    shadow_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    sdraw = ImageDraw.Draw(shadow_layer)
    sdraw.rectangle(
        [fx + 16, fy + 28, fx + frame_w + 16, fy + frame_h + 28],
        fill=(14, 13, 12, 96),
    )
    shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(radius=34))
    canvas = Image.alpha_composite(canvas.convert("RGBA"), shadow_layer).convert("RGB")

    draw = ImageDraw.Draw(canvas)

    # Outer ebonized ash moulding + deep #0B0B0A shadowbox rabbet
    draw.rectangle([fx, fy, fx + frame_w, fy + frame_h], fill=(26, 25, 24), outline=(54, 51, 47), width=2)
    draw.rectangle(
        [fx + moulding, fy + moulding, fx + frame_w - moulding, fy + frame_h - moulding],
        fill=(10, 10, 9),
    )
    canvas.paste(crop_resized, (fx + moulding + rabbet, fy + moulding + rabbet))

    # Hairline vertical architectural divider & outer gallery margin frame
    ink = (17, 17, 16)
    muted = (105, 101, 94)
    gilt = (154, 118, 50)
    hairline = (212, 207, 198)

    draw.line([(split_x, 0), (split_x, H)], fill=hairline, width=2)
    draw.rectangle([48, 48, W - 48, H - 48], outline=(196, 190, 180), width=2)

    # Load museum typography (prefer bundled @fontsource WOFF, fallback to Garamond/Consolas)
    font_dir = ROOT / "node_modules" / "@fontsource"
    win_fonts = Path(r"C:\Windows\Fonts")

    f_display = load_font(
        [
            font_dir / "instrument-serif" / "files" / "instrument-serif-latin-400-normal.woff",
            win_fonts / "GARA.TTF",
            win_fonts / "georgia.ttf",
        ],
        size=148,
    )
    f_editorial_italic = load_font(
        [
            font_dir / "cormorant-garamond" / "files" / "cormorant-garamond-latin-400-italic.woff",
            win_fonts / "GARAIT.TTF",
            win_fonts / "georgiai.ttf",
        ],
        size=44,
    )
    f_mono = load_font(
        [
            font_dir / "ibm-plex-mono" / "files" / "ibm-plex-mono-latin-500-normal.woff",
            win_fonts / "consola.ttf",
            win_fonts / "cour.ttf",
        ],
        size=28,
    )
    f_mono_small = load_font(
        [
            font_dir / "ibm-plex-mono" / "files" / "ibm-plex-mono-latin-500-normal.woff",
            win_fonts / "consola.ttf",
        ],
        size=22,
    )

    left_x = 128

    # 1. Bespoke Geometric WL Chop Monogram at top-left
    mono_y = 132
    mono_sz = 84
    draw.rectangle(
        [left_x, mono_y, left_x + mono_sz, mono_y + mono_sz],
        outline=ink,
        width=3,
    )
    # Vector W
    w_pts = [
        (left_x + 15, mono_y + 25),
        (left_x + 24, mono_y + 59),
        (left_x + 34, mono_y + 31),
        (left_x + 44, mono_y + 59),
        (left_x + 53, mono_y + 25),
    ]
    draw.line(w_pts, fill=ink, width=4, joint="curve")
    # Gilt dot
    draw.ellipse([left_x + 55, mono_y + 55, left_x + 61, mono_y + 61], fill=gilt)
    # Vector L
    draw.line(
        [(left_x + 65, mono_y + 25), (left_x + 65, mono_y + 59), (left_x + 76, mono_y + 59)],
        fill=ink,
        width=4,
    )

    draw_tracked_text(
        draw,
        (left_x + mono_sz + 28, mono_y + 18),
        "ATELIER W.L.  ·  EST. MMXXII",
        f_mono_small,
        muted,
        tracking=4.0,
    )
    draw_tracked_text(
        draw,
        (left_x + mono_sz + 28, mono_y + 48),
        "CATALOGUE RAISONNÉ & MONOGRAPH",
        f_mono_small,
        gilt,
        tracking=3.5,
    )

    # 2. Centerpiece Headline: WL STUDIO + PRIVATE CLIENT ACQUISITIONS
    title_y = 430
    draw_tracked_text(draw, (left_x, title_y), "WL STUDIO", f_display, ink, tracking=14.0)

    rule_y = title_y + 194
    draw.line([(left_x, rule_y), (left_x + 140, rule_y)], fill=gilt, width=4)
    draw.line([(left_x + 156, rule_y), (split_x - 110, rule_y)], fill=hairline, width=2)

    sub_y = rule_y + 42
    draw_tracked_text(
        draw,
        (left_x, sub_y),
        "PRIVATE CLIENT ACQUISITIONS",
        f_mono,
        ink,
        tracking=7.5,
    )

    draw.text(
        (left_x, sub_y + 68),
        "Selected Contemporary Works, Viewing Rooms",
        font=f_editorial_italic,
        fill=(61, 59, 55),
    )
    draw.text(
        (left_x, sub_y + 120),
        "& Custodial Provenance Archive",
        font=f_editorial_italic,
        fill=(61, 59, 55),
    )

    # 3. Bottom Registrar Stamp & International Cities
    bot_y = H - 178
    draw.ellipse([left_x + 22, bot_y + 21, left_x + 34, bot_y + 33], fill=gilt)
    stamp_end_x = draw_tracked_text(
        draw,
        (left_x + 50, bot_y + 14),
        "EDITION 1 OF 1  ·  UNIQUE",
        f_mono_small,
        gilt,
        tracking=3.2,
    )
    draw.rectangle(
        [left_x, bot_y, int(round(stamp_end_x)) + 26, bot_y + 54],
        outline=gilt,
        width=2,
    )

    draw_tracked_text(
        draw,
        (left_x, bot_y + 78),
        "NEW YORK   ·   ZURICH   ·   GENEVA",
        f_mono_small,
        muted,
        tracking=3.8,
    )

    # Downsample 2400x1260 -> exact 1200x630 and save clean EXIF-free JPEG
    final_card = canvas.resize((1200, 630), Image.Resampling.LANCZOS)
    clean = Image.new("RGB", (1200, 630))
    clean.frombytes(final_card.tobytes())
    clean.save(OUT_PATH, format="JPEG", quality=93, subsampling=0, optimize=True)

    with Image.open(OUT_PATH) as check:
        assert check.size == (1200, 630), f"Unexpected OG card dimensions: {check.size}"
        assert len(check.getexif()) == 0, "EXIF metadata leaked onto og-card.jpg"

    print(f"[OK] Generated {OUT_PATH} ({OUT_PATH.stat().st_size / 1024:.1f} KB, 1200x630, EXIF=0)")


if __name__ == "__main__":
    generate_og_card()
