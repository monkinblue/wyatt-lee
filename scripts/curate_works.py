#!/usr/bin/env python3
"""
ATELIER W.L. — Deterministic Computer Vision Conservation & Curatorial Pipeline
Processes raw studio photographs from `Paintings/` into perspective-rectified,
illumination-balanced, EXIF-scrubbed archival WebP plates + macro detail crops
and generates the structured Catalogue Raisonné manifest (`src/data/artworks.generated.json`).

Hard Privacy & Integrity Guarantees:
1. 100% deterministic OpenCV + Pillow + NumPy pipeline (zero generative redrawing).
2. Strips 100% of EXIF, GPS, XMP, IPTC, and camera metadata on every output asset.
3. Zero first-name or source-filename leakage in output filenames or JSON metadata.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import cv2
import numpy as np
from PIL import Image, ImageEnhance, ImageFilter, ImageOps

WORKSPACE_ROOT = Path(__file__).resolve().parent.parent
RAW_DIR = WORKSPACE_ROOT / "Paintings"
OUT_ART_DIR = WORKSPACE_ROOT / "public" / "artworks"
OUT_JSON_PATH = WORKSPACE_ROOT / "src" / "data" / "artworks.generated.json"


def load_transposed_rgb(path: Path) -> np.ndarray:
    """Load raw photograph, apply EXIF orientation transpose, and discard metadata."""
    with Image.open(path) as im:
        transposed = ImageOps.exif_transpose(im).convert("RGB")
        return np.array(transposed, dtype=np.uint8)


def refine_quad_edges(rgb: np.ndarray, quad_pct: list[tuple[float, float]]) -> np.ndarray:
    """
    Convert percentage corner anchors [(x%, y%), ...] in [TL, TR, BR, BL] order
    to sub-pixel float32 image coordinates and gently refine against local gradient
    structure while guaranteeing inward conservation margin (zero background bleed).
    """
    h, w = rgb.shape[:2]
    pts = np.array([[x * w / 100.0, y * h / 100.0] for x, y in quad_pct], dtype=np.float32)

    # Compute subtle inward safety inset (0.25% toward centroid) after local edge check
    # so sub-pixel interpolation never samples background pixels outside the canvas edge.
    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
    gray_blur = cv2.GaussianBlur(gray, (5, 5), 0)
    gx = cv2.Sobel(gray_blur, cv2.CV_32F, 1, 0, ksize=3)
    gy = cv2.Sobel(gray_blur, cv2.CV_32F, 0, 1, ksize=3)
    mag = cv2.magnitude(gx, gy)

    centroid = np.mean(pts, axis=0)
    refined = pts.copy()
    search_r = max(2, int(min(w, h) * 0.003))

    for i in range(4):
        cx, cy = int(round(pts[i, 0])), int(round(pts[i, 1]))
        x0, x1 = max(0, cx - search_r), min(w, cx + search_r + 1)
        y0, y1 = max(0, cy - search_r), min(h, cy + search_r + 1)
        patch = mag[y0:y1, x0:x1]
        if patch.size > 0 and float(patch.max()) > 35.0:
            py, px = np.unravel_index(int(np.argmax(patch)), patch.shape)
            candidate = np.array([x0 + px, y0 + py], dtype=np.float32)
            # Only accept candidate if it moves slightly inward or stays within 2px
            vec_to_center = centroid - pts[i]
            if np.dot(candidate - pts[i], vec_to_center) >= 0:
                refined[i] = 0.65 * pts[i] + 0.35 * candidate

    # Apply 0.2% inward conservation margin toward centroid
    refined = refined + 0.002 * (centroid - refined)
    refined[:, 0] = np.clip(refined[:, 0], 0, w - 1)
    refined[:, 1] = np.clip(refined[:, 1], 0, h - 1)
    return refined


def perspective_rectify(
    rgb: np.ndarray,
    quad_pct: list[tuple[float, float]],
    target_aspect: float,
    long_edge: int = 2200,
) -> np.ndarray:
    """
    Perspective-rectify a 4-corner canvas region [TL, TR, BR, BL] into an orthogonal
    museum plate preserving exact physical aspect ratio (`width / height`).
    """
    src_pts = refine_quad_edges(rgb, quad_pct)

    if target_aspect >= 1.0:
        out_w = long_edge
        out_h = int(round(long_edge / target_aspect))
    else:
        out_h = long_edge
        out_w = int(round(long_edge * target_aspect))

    dst_pts = np.array(
        [
            [0, 0],
            [out_w - 1, 0],
            [out_w - 1, out_h - 1],
            [0, out_h - 1],
        ],
        dtype=np.float32,
    )

    matrix = cv2.getPerspectiveTransform(src_pts, dst_pts)
    warped = cv2.warpPerspective(
        rgb,
        matrix,
        (out_w, out_h),
        flags=cv2.INTER_LANCZOS4,
        borderMode=cv2.BORDER_REPLICATE,
    )
    return warped


def balance_gallery_lighting(
    rgb: np.ndarray,
    mode: str = "standard",
    warmth_shift: float = 0.0,
    contrast_boost: float = 1.04,
) -> np.ndarray:
    """
    Conservative museum-conservation lighting & white-gesso illumination balance.
    Evens out oblique indoor/outdoor lighting falloff while preserving 100% of
    impasto relief, metallic foil speculars, canvas weave, and authentic pigment saturation.
    """
    lab = cv2.cvtColor(rgb, cv2.COLOR_RGB2LAB).astype(np.float32)
    l_chan, a_chan, b_chan = cv2.split(lab)

    h, w = l_chan.shape

    if mode in ("gesso_normalize", "shadow_corner_lift"):
        # Estimate smooth low-frequency ambient illumination envelope
        sigma = max(h, w) * 0.22
        ksize = int(sigma * 3) | 1
        illum = cv2.GaussianBlur(l_chan, (ksize, ksize), sigma)
        target_level = float(np.percentile(illum, 82))
        # Gentle multiplicative normalization capped strictly within [0.92, 1.14]
        gain = np.clip(target_level / np.maximum(illum, 60.0), 0.93, 1.13)
        # Apply stronger correction on bright/neutral gesso and very gentle touch on dark pigments
        light_weight = np.clip((l_chan - 75.0) / 140.0, 0.25, 1.0)
        effective_gain = 1.0 + (gain - 1.0) * light_weight
        l_chan = np.clip(l_chan * effective_gain, 0, 255)

    if mode == "shadow_corner_lift":
        # Additional soft compensation for cast shadow on right/lower-right periphery
        yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
        xn, yn = xx / w, yy / h
        # Detect neutral-hued mid-grey cast shadow pixels that belong to white gesso
        chroma = np.hypot(a_chan - 128.0, b_chan - 128.0)
        is_neutral_shadow = (chroma < 12.0) & (l_chan > 115.0) & (l_chan < 208.0) & (xn > 0.62)
        mask_f = cv2.GaussianBlur(is_neutral_shadow.astype(np.float32), (61, 61), 20)
        l_chan = np.clip(l_chan + mask_f * 18.0, 0, 255)

    if mode == "gesso_flatfield":
        # Smooth illumination equalization specifically on low-chroma bare white gesso
        chroma = np.hypot(a_chan - 128.0, b_chan - 128.0)
        gesso_mask = ((chroma < 10.5) & (l_chan > 130.0)).astype(np.float32)
        gesso_weight = cv2.GaussianBlur(gesso_mask, (41, 41), 12.0)
        sigma = max(h, w) * 0.08
        ksize = int(sigma * 3) | 1
        local_l = cv2.GaussianBlur(l_chan, (ksize, ksize), sigma)
        target_gesso_l = float(np.percentile(l_chan[chroma < 10.5], 88)) if np.any(chroma < 10.5) else 228.0
        lift = np.clip(target_gesso_l - local_l, -10.0, 42.0)
        l_chan = np.clip(l_chan + lift * gesso_weight * 0.82, 0, 255)
        # Also neutralize cool blue-grey cast in shadowed gesso
        b_chan = np.clip(b_chan + gesso_weight * 2.5, 0, 255)

    if warmth_shift != 0.0:
        # Neutralize indoor tungsten yellow cast on neutral gesso
        b_chan = np.clip(b_chan + warmth_shift, 0, 255)

    # Subtle museum daylight curve (preserves highlights and deep blacks)
    l_norm = l_chan / 255.0
    l_chan = np.clip((l_norm ** 0.97) * 255.0, 0, 255)

    merged = cv2.merge([l_chan, a_chan, b_chan]).astype(np.uint8)
    balanced = cv2.cvtColor(merged, cv2.COLOR_LAB2RGB)

    # Gentle archival micro-contrast & crispness enhancement for upscaled plates
    pil_im = Image.fromarray(balanced)
    if contrast_boost != 1.0:
        pil_im = ImageEnhance.Contrast(pil_im).enhance(contrast_boost)
    pil_im = ImageEnhance.Color(pil_im).enhance(1.03)
    pil_im = pil_im.filter(ImageFilter.UnsharpMask(radius=1.05, percent=26, threshold=3))
    return np.array(pil_im, dtype=np.uint8)


def compose_diptych(panel_left: np.ndarray, panel_right: np.ndarray) -> np.ndarray:
    """
    Compose rectified left and right diptych canvases onto a neutral museum linen
    reveal ground with realistic architectural separation and subtle edge depth.
    """
    h = max(panel_left.shape[0], panel_right.shape[0])
    w1 = int(round(panel_left.shape[1] * (h / panel_left.shape[0])))
    w2 = int(round(panel_right.shape[1] * (h / panel_right.shape[0])))
    p1 = cv2.resize(panel_left, (w1, h), interpolation=cv2.INTER_LANCZOS4)
    p2 = cv2.resize(panel_right, (w2, h), interpolation=cv2.INTER_LANCZOS4)

    gap = int(round((w1 + w2) * 0.048))
    pad = int(round(h * 0.018))
    total_w = w1 + gap + w2 + pad * 2
    total_h = h + pad * 2

    # Warm museum gallery plaster ground (#F4F1EA)
    canvas = np.full((total_h, total_w, 3), (244, 241, 234), dtype=np.float32)

    # Subtle gallery cast shadow behind each stretched panel
    shadow_mask = np.zeros((total_h, total_w), dtype=np.float32)
    shadow_offset_y, shadow_offset_x = int(h * 0.008), int(h * 0.005)
    shadow_mask[
        pad + shadow_offset_y : pad + h + shadow_offset_y,
        pad + shadow_offset_x : pad + w1 + shadow_offset_x,
    ] = 0.16
    shadow_mask[
        pad + shadow_offset_y : pad + h + shadow_offset_y,
        pad + w1 + gap + shadow_offset_x : pad + w1 + gap + w2 + shadow_offset_x,
    ] = 0.16
    shadow_mask = cv2.GaussianBlur(shadow_mask, (31, 31), 9.0)
    canvas *= (1.0 - shadow_mask[:, :, None])

    out = np.clip(canvas, 0, 255).astype(np.uint8)
    out[pad : pad + h, pad : pad + w1] = p1
    out[pad : pad + h, pad + w1 + gap : pad + w1 + gap + w2] = p2
    return out


def extract_macro_crop(
    rgb: np.ndarray, center_pct: tuple[float, float], span_pct: float = 0.34, out_size: int = 1000
) -> np.ndarray:
    """Extract a 1:1 raking-light macro impasto detail plate from focal coordinates."""
    h, w = rgb.shape[:2]
    side = int(round(min(w, h) * span_pct))
    cx = int(round(center_pct[0] * w / 100.0))
    cy = int(round(center_pct[1] * h / 100.0))

    x0 = int(np.clip(cx - side // 2, 0, w - side))
    y0 = int(np.clip(cy - side // 2, 0, h - side))
    crop = rgb[y0 : y0 + side, x0 : x0 + side]

    macro = cv2.resize(crop, (out_size, out_size), interpolation=cv2.INTER_LANCZOS4)
    pil_macro = Image.fromarray(macro).filter(
        ImageFilter.UnsharpMask(radius=1.1, percent=30, threshold=2)
    )
    return np.array(pil_macro, dtype=np.uint8)


def extract_palette_hex(rgb: np.ndarray, k: int = 4) -> list[str]:
    """Deterministically extract dominant pigment swatches using OpenCV k-means."""
    small = cv2.resize(rgb, (120, 120), interpolation=cv2.INTER_AREA)
    pixels = small.reshape((-1, 3)).astype(np.float32)

    cv2.setRNGSeed(2022)
    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 40, 0.5)
    _, labels, centers = cv2.kmeans(pixels, k, None, criteria, 5, cv2.KMEANS_PP_CENTERS)

    counts = np.bincount(labels.flatten(), minlength=k)
    order = np.argsort(-counts)
    hex_colors: list[str] = []
    for idx in order:
        r, g, b = [int(np.clip(round(c), 0, 255)) for c in centers[idx]]
        hex_colors.append(f"#{r:02X}{g:02X}{b:02X}")
    return hex_colors


def save_scrubbed_webp(rgb: np.ndarray, out_path: Path, quality: int = 90) -> None:
    """
    Save RGB array as clean WebP with 100% metadata/EXIF/ICC/XMP stripped,
    then verify zero EXIF tags remain on disk.
    """
    out_path.parent.mkdir(parents=True, exist_ok=True)
    clean = Image.new("RGB", (rgb.shape[1], rgb.shape[0]))
    clean.frombytes(rgb.tobytes())
    clean.save(out_path, format="WEBP", quality=quality, method=6)

    # Hard verification guardrail: assert zero EXIF or GPS metadata survives
    with Image.open(out_path) as check:
        exif_data = check.getexif()
        if len(exif_data) > 0 or "exif" in check.info or "xmp" in check.info:
            raise RuntimeError(f"Privacy check failed: metadata remained on {out_path.name}")


WORKS_SPEC: list[dict[str, Any]] = [
    {
        "slug": "wl-lot-01",
        "lotNumber": "LOT 01",
        "catalogueNo": "WL.2025.10.I",
        "sourceFile": "PXL_20251019_170733444.jpg",
        "quad": [(9.6, 5.3), (91.9, 4.4), (97.9, 91.4), (6.7, 92.1)],
        "aspect": 0.80,
        "lightingMode": "standard",
        "warmthShift": 0.0,
        "macroCenter": (47.0, 22.0),
        "macroSpan": 0.34,
        "macroCaption": "Raking-light detail (upper register): hand-crushed imitation gilt leaf embedded wet-into-wet across cobalt and royal-violet impasto ridges.",
        "title": "Nachmittagsschlaf Nr. 9 (Apotheosis in Ultramarine, Viridian, and Fugitive Cadmium)",
        "shortTitle": "Nachmittagsschlaf Nr. 9",
        "year": "2025",
        "series": "Late Bedroom Annex Cycle",
        "dimensionsCm": "182.9 × 146.0 cm",
        "dimensionsIn": "72 × 57 ½ in.",
        "scaleCategory": "monumental",
        "frameTone": "obsidian",
        "inquiryOnly": True,
        "priceUsd": 2400000,
        "estimateRange": "Price Upon Private Inquiry",
        "medium": "Heavy-body washable polymer emulsion, high-viscosity cobalt and viridian pour, cadmium-yellow impasto, and hand-crushed imitation gilt leaf on stretched cotton duck",
        "condition": "Prime studio state. Pronounced sculptural impasto peaks up to 6 mm in lower-right yellow quadrant; scattered gilt-leaf inclusions embedded wet-into-wet at upper register; trace herringbone textile fiber confined strictly to verso tacking margin.",
        "provenance": [
            "Executed directly atop striped domestic ground-cloth, Primary Bedroom Annex, October 2025",
            "Retained in the Artist's Private Reserve prior to scheduled afternoon rest",
            "Atelier W.L. Permanent Custodial Vault"
        ],
        "exhibited": [
            "Atelier W.L., Before the Dimming of the Hallway Light: Late Works 2024–2025, Private Viewing Salon, 2026, pl. I (illustrated on monograph cover)"
        ],
        "essay": "Conceived during the decisive October 2025 sessions, Nachmittagsschlaf Nr. 9 stands as the summation of W.L.'s polychromatic maximalism. Across its commanding vertical field, a brooding upper stratum of dioxazine violet and heavy cobalt polymer collides against a torrential viridian channel descending the left flank, while an insurgent mass of unmixed cadmium yellow rises at lower right like an architectural refusal of twilight. Scattered constellations of crushed gilt leaf arrest the eye at the upper meridian, suspending the composition between baroque opulence and raw, pre-linguistic physical urgency."
    },
    {
        "slug": "wl-lot-02",
        "lotNumber": "LOT 02",
        "catalogueNo": "WL.2024.09.II",
        "sourceFile": "PXL_20240921_215120602.jpg",
        "quad": [(11.6, 19.2), (87.0, 19.2), (88.3, 76.1), (11.0, 76.4)],
        "aspect": 1.00,
        "lightingMode": "gesso_normalize",
        "warmthShift": 2.0,
        "macroCenter": (47.0, 44.0),
        "macroSpan": 0.36,
        "macroCaption": "Surface detail (central threshold): junction of mirror-gloss lampblack reservoir, dragged bronze-carbon paste, and spectral somatic impression in upper gesso.",
        "title": "Anthropométrie Silencieuse (Vestige After Bath Hour)",
        "shortTitle": "Anthropométrie Silencieuse",
        "year": "2024",
        "series": "Somatic Index Works",
        "dimensionsCm": "152.4 × 152.4 cm",
        "dimensionsIn": "60 × 60 in.",
        "scaleCategory": "large",
        "frameTone": "walnut",
        "inquiryOnly": False,
        "priceUsd": 1650000,
        "estimateRange": "$1,400,000 – $1,800,000",
        "medium": "High-gloss lampblack acrylic polymer, metallic bronze drag, diluted grey mist, and unmediated plantar somatic impression on primed square cotton",
        "condition": "Exceptional archival stability. High-gloss obsidian pool exhibits mirror-like specular tension with minor curing ridges at perimeter; spectral bare-heel impression at upper-center gesso verified authentic by Atelier registrars.",
        "provenance": [
            "Floor Studio (Porcelain Wood-Plank Sector), Residence Collection, September 2024",
            "Acquired directly from the Artist immediately prior to evening sock enforcement"
        ],
        "exhibited": [
            "Gagosian / Atelier W.L. Joint Curatorial Dossier, Radical Gesture & Somatic Weight, 2025, cat. no. 4"
        ],
        "essay": "At once a meditation on void and bodily weight, Anthropométrie Silencieuse recalls the monumental black forms of Robert Motherwell and the radical Gutai foot-paintings of Kazuo Shiraga. Anchored to the right of an austere square expanse of chalk-white gesso, a monolithic reservoir of mirror-gloss lampblack absorbs ambient gallery light, countered to its left by a single, ferocious lateral thrust of bronze-veined umber. Hovering just above this collision sits a ghostly, near-imperceptible bare-foot compression in raw pigment—an unrepeatable indexical trace of the Artist traversing the picture plane."
    },
    {
        "slug": "wl-lot-03",
        "lotNumber": "LOT 03",
        "catalogueNo": "WL.2024.07.III",
        "sourceFile": "PXL_20240727_165858881.jpg",
        "quad": [(15.2, 14.2), (90.4, 0.4), (89.9, 94.5), (17.9, 82.0)],
        "aspect": 0.80,
        "lightingMode": "gesso_normalize",
        "warmthShift": -3.0,
        "macroCenter": (46.0, 58.0),
        "macroSpan": 0.33,
        "macroCaption": "Conservation macro (lower-central nexus): densely accreted composite gold leaf encrusted over raw umber wash and marbled titanium white.",
        "title": "Rex Aurum (Solaris Above the Toggle Switch)",
        "shortTitle": "Rex Aurum",
        "year": "2024",
        "series": "Alchemical Corridor Studies",
        "dimensionsCm": "167.6 × 134.6 cm",
        "dimensionsIn": "66 × 53 in.",
        "scaleCategory": "monumental",
        "frameTone": "obsidian",
        "inquiryOnly": False,
        "priceUsd": 1280000,
        "estimateRange": "$1,100,000 – $1,500,000",
        "medium": "Metallic aureolin emulsion, raw umber under-wash, titanium marbling, and densely accreted composite gold leaf on stretched canvas",
        "condition": "Luminous surface integrity. Dense chryséléphantine leaf agglomeration across lower-central nexus remains firmly bound within polymer matrix; two micro-droplets of oat-milk medium stabilized under conservation varnish.",
        "provenance": [
            "Installed site-specifically 14 cm above corridor wall-switch, East Hallway Wing, July 2024",
            "Private Family Patronage Trust"
        ],
        "exhibited": [
            "Kunsthalle Private Viewing, Gold & Gravity: Post-Millennial Materiality, Zurich, 2025, p. 42"
        ],
        "essay": "Evoking both Byzantine reliquary surfaces and Anselm Kiefer's alchemical transmutations of base matter, Rex Aurum commands light with theatrical authority. W.L. lays down a skeletal architecture of raw sienna and umber brush sweeps before unleashing a diagonal torrent of liquid gold polymer across the upper right register. At the work's gravitational core, sheets of crumpled metallic leaf fracture gallery spotlights into hundreds of shifting micro-facets, transforming domestic corridor wall-space into a secular sanctuary."
    },
    {
        "slug": "wl-lot-04",
        "lotNumber": "LOT 04",
        "catalogueNo": "WL.2025.07.IV",
        "sourceFile": "PXL_20250727_142248313.jpg",
        "isDiptych": True,
        "quadLeft": [(14.3, 27.1), (44.0, 27.5), (44.1, 76.5), (14.7, 76.3)],
        "quadRight": [(54.1, 28.2), (83.6, 28.8), (82.9, 77.9), (53.6, 77.4)],
        "panelAspect": 0.78,
        "lightingMode": "gesso_normalize",
        "warmthShift": -2.0,
        "macroCenter": (28.0, 56.0),
        "macroSpan": 0.34,
        "macroCaption": "Panel I detail: tempestuous phthalo cerulean and Prussian blue polymer folding over exposed terracotta-blush ground.",
        "title": "Étude Maritime en Deux Mouvements (Dialogue Across Drywall)",
        "shortTitle": "Étude Maritime (Diptych)",
        "year": "2025",
        "series": "Bipartite Architectural Works",
        "dimensionsCm": "121.9 × 198.1 cm",
        "dimensionsIn": "48 × 78 in. (diptych)",
        "scaleCategory": "monumental",
        "frameTone": "walnut",
        "inquiryOnly": False,
        "priceUsd": 1150,  # placeholder overridden below!
        "estimateRange": "$950,000 – $1,350,000",
        "medium": "Phthalo cerulean, Prussian blue, and oxidised teal polymer over warm terracotta-blush ground across two conjoined canvases",
        "condition": "Complete in two parts as conceived. Left panel exhibits viscous wet-on-wet pooling along lower tacking edge; right panel retains deliberate passages of exposed blush underpainting and upper-right gesso reserve.",
        "provenance": [
            "Prepared en plein air (see preparatory ground study WL.2025.05.XIII), May–July 2025",
            "Salon Principal, Upper Stairwell Landing, Private Collection"
        ],
        "exhibited": [
            "Atelier W.L., Dualities and Interruptions, Autumn Monograph Presentation, 2025, pl. IV–V"
        ],
        "essay": "Rare among W.L.'s output for its sustained multi-month gestation, Étude Maritime en Deux Mouvements pairs two vertical canvases across a calibrated architectural interval. Over a warm, hand-brushed terracotta ground laid down earlier that spring, the Artist unleashes surging pelagic masses of Prussian blue and oxidized teal. Where the left panel consolidates into a dense, abyssal vortex, the right panel opens outward in broad, sweeping arcs that allow flashes of warm sienna earth and raw white gesso to breathe at the margins."
    },
    {
        "slug": "wl-lot-05",
        "lotNumber": "LOT 05",
        "catalogueNo": "WL.2024.09.V",
        "sourceFile": "PXL_20240908_163433185.jpg",
        "quad": [(15.3, 15.1), (89.0, 15.1), (91.1, 89.8), (9.1, 88.9)],
        "aspect": 0.80,
        "lightingMode": "shadow_corner_lift",
        "warmthShift": 0.0,
        "macroCenter": (24.0, 47.0),
        "macroSpan": 0.34,
        "macroCaption": "Raking-light detail (western reef): high-relief bimetallic foil leaf accretions resting atop Venetian rose-quartz and pearl marbling.",
        "title": "Chambre d'Ambre et d'Argent (After the Folding Table Sessions)",
        "shortTitle": "Chambre d'Ambre et d'Argent",
        "year": "2024",
        "series": "Plein-Air Trestle Works",
        "dimensionsCm": "152.4 × 121.9 cm",
        "dimensionsIn": "60 × 48 in.",
        "scaleCategory": "large",
        "frameTone": "aluminum",
        "inquiryOnly": False,
        "priceUsd": 890000,
        "estimateRange": "$800,000 – $1,100,000",
        "medium": "Nacreous pearl polymer, Venetian rose-earth fluid marbling, liquid pewter drips, and high-relief bimetallic foil leaf on stretched cotton",
        "condition": "Superb relief preservation. Left-flank foil reef projects 4.5 mm above the marbled lamina; gravitational pewter rivulets at lower right cured under direct late-summer solar exposure.",
        "provenance": [
            "Plein-Air Trestle Studio, Rear Courtyard, September 2024",
            "Private Collection, Mid-Atlantic Estates"
        ],
        "exhibited": [
            "Salon d'Automne Privé, Mineral Abstraction Now, Geneva, 2025, cat. no. 11"
        ],
        "essay": "Recalling Renaissance scagliola stonework and geological core samples, Chambre d'Ambre et d'Argent orchestrates a hypnotic fluid dialogue between rose-ochre, pearl white, and molten gold. Along the left margin, a jagged, high-relief reef of gold and darkened pewter leaf interrupts the laminar flow like an emerging landmass, while rapid silver-grey rivulets race off the lower-right corner in a masterclass of controlled hydrodynamic tension."
    },
    {
        "slug": "wl-lot-06",
        "lotNumber": "LOT 06",
        "catalogueNo": "WL.2024.08.VI",
        "sourceFile": "PXL_20240817_192914473.jpg",
        "quad": [(21.8, 4.1), (77.8, 4.3), (76.7, 89.2), (20.4, 88.6)],
        "aspect": 0.50,
        "lightingMode": "gesso_normalize",
        "warmthShift": 0.0,
        "macroCenter": (66.0, 34.0),
        "macroSpan": 0.44,
        "macroCaption": "Detail (upper-right slash): molten yellow-ochre metallic pour cutting vertically across deep Prussian blue brushwork.",
        "title": "Stèle Verticale No. 2 (Cataract with Ochre Interruption)",
        "shortTitle": "Stèle Verticale No. 2",
        "year": "2024",
        "series": "Vulcanized Mat Monoliths",
        "dimensionsCm": "213.4 × 106.7 cm",
        "dimensionsIn": "84 × 42 in.",
        "scaleCategory": "monumental",
        "frameTone": "aluminum",
        "inquiryOnly": False,
        "priceUsd": 740000,
        "estimateRange": "$650,000 – $850,000",
        "medium": "Prussian blue, glacial turquoise, and metallic yellow-ochre acrylic emulsion on elongated 2:1 vertical canvas",
        "condition": "Uncompromised tension. Executed horizontally atop interlocking vulcanized EVA gymnasium tiles prior to vertical orientation; yellow modeling-compound cylinder documented nearby left zero residue on recto.",
        "provenance": [
            "Vulcanized Rubber Mat Atelier, Lower Level, August 2024",
            "Private Collection, Washington Metropolitan Area"
        ],
        "exhibited": [
            "Atelier W.L., Verticality & Velocity, Winter Viewing Room, 2025, pl. VI"
        ],
        "essay": "Constructed on an austere 2:1 double-square vertical proportion, Stèle Verticale No. 2 channels the sublimity of Alpine meltwater and Barnett Newman's zip paintings. From an airy, asymmetrical crown of raw white gesso at upper left, swirling currents of Prussian blue and glacial cyan plunge toward the lower edge, dramatically pierced along the upper-right flank by a brazen vertical lance of luminous yellow ochre."
    },
    {
        "slug": "wl-lot-07",
        "lotNumber": "LOT 07",
        "catalogueNo": "WL.2024.06.VII",
        "sourceFile": "PXL_20240602_134156792.jpg",
        "quad": [(15.6, 11.2), (83.7, 12.2), (85.0, 89.2), (13.3, 89.2)],
        "aspect": 1.25,
        "lightingMode": "gesso_normalize",
        "warmthShift": 0.0,
        "macroCenter": (43.0, 58.0),
        "macroSpan": 0.32,
        "macroCaption": "Macro detail (central fault): silver foil fragments bridging cobalt-violet cellular marbling and the incised white diagonal channel.",
        "title": "Fissure Silencieuse (Rift in Dioxazine, Rose, and Argent)",
        "shortTitle": "Fissure Silencieuse",
        "year": "2024",
        "series": "Tectonic Rift Paintings",
        "dimensionsCm": "121.9 × 152.4 cm",
        "dimensionsIn": "48 × 60 in.",
        "scaleCategory": "large",
        "frameTone": "aluminum",
        "inquiryOnly": False,
        "priceUsd": 620000,
        "estimateRange": "$550,000 – $750,000",
        "medium": "Fluid cerulean, dioxazine violet, and quinacridone magenta acrylic with hand-scattered aluminum foil fragments and linear drag incisions on gessoed canvas",
        "condition": "Stable throughout. Deliberate tactile finger-furrow scoring across lower-right white rift; prominent three-dimensional crumpled aluminum inclusion at lower right securely adhered.",
        "provenance": [
            "Executed atop upholstered incline bench, Domestic Conditioning Room, June 2024",
            "Collection of the Patron"
        ],
        "exhibited": [
            "Fondation Privée, Negative Space in Contemporary Pour Painting, Paris, 2025, p. 19"
        ],
        "essay": "With an audacity reminiscent of Morris Louis's Unfurleds, W.L. cleaves the picture plane of Fissure Silencieuse along a razor-sharp diagonal canyon of bare gesso. Flanking this luminous void, two chromatic tectonic plates—saturated dioxazine violet to the northeast and cellular cerulean-magenta to the southwest—press inward without touching, linked only by a meteor shower of crumpled silver foil and three delicate tactile incisions dragged through wet medium at lower right."
    },
    {
        "slug": "wl-lot-08",
        "lotNumber": "LOT 08",
        "catalogueNo": "WL.2024.06.VIII",
        "sourceFile": "PXL_20240615_165523075.jpg",
        "quad": [(18.8, 35.5), (76.8, 36.6), (99.2, 75.4), (0.8, 75.8)],
        "aspect": 1.20,
        "lightingMode": "gesso_normalize",
        "warmthShift": 0.0,
        "macroCenter": (48.0, 52.0),
        "macroSpan": 0.34,
        "macroCaption": "Surface detail: obsidian pool enveloped by titanium white, carmine cellular lacework, and oxidized copper-phthalo folds.",
        "title": "Nigredo et Cuivre (Nocturne Under Garden Sun)",
        "shortTitle": "Nigredo et Cuivre",
        "year": "2024",
        "series": "Plein-Air Trestle Works",
        "dimensionsCm": "114.3 × 137.2 cm",
        "dimensionsIn": "45 × 54 in.",
        "scaleCategory": "medium",
        "frameTone": "obsidian",
        "inquiryOnly": False,
        "priceUsd": 540000,
        "estimateRange": "$480,000 – $650,000",
        "medium": "Carbon-black dry-brush, pearlescent carmine, oxidized copper-bronze, phthalo green, and dove-grey fluid acrylic on stretched cotton",
        "condition": "Excellent. Characteristic cellular cratering within carmine lower-left passage; singular satellite black tondo at upper-left retains full perimeter meniscus.",
        "provenance": [
            "Plein-Air Trestle Studio (Adjacent to Rosa Rugosa Hedge), June 2024",
            "Private Collection"
        ],
        "exhibited": [
            "Atelier W.L., Summer Solstice Works, Private Monograph, 2024, cat. no. 2"
        ],
        "essay": "Executed under fierce June sunlight, Nigredo et Cuivre stages an extraordinary collision of painting vocabularies within a single frame. On the left, a rasping horizontal beam of dry-brushed carbon black—beneath which a solitary obsidian disc floats like an eclipse—rams directly into a molten caldera of titanium white, metallic carmine, dove grey, and patinated bronze-teal. Few contemporary abstractions balance graphic brutality and liquid sensuality on such a knife-edge."
    },
    {
        "slug": "wl-lot-09",
        "lotNumber": "LOT 09",
        "catalogueNo": "WL.2024.07.IX",
        "sourceFile": "PXL_20240728_131212522.MP.jpg",
        "quad": [(48.5, 28.9), (98.4, 59.3), (49.3, 88.3), (2.2, 35.6)],
        "aspect": 1.25,
        "lightingMode": "gesso_normalize",
        "warmthShift": -2.0,
        "macroCenter": (45.0, 48.0),
        "macroSpan": 0.34,
        "macroCaption": "Detail (central current): turbulent turquoise and phthalo cyan ribbons transitioning from calligraphic whiplash loops into calm cerulean pooling.",
        "title": "Composition Après le Goûter (Study in Kinetic Viridian and Cyan)",
        "shortTitle": "Composition Après le Goûter",
        "year": "2024",
        "series": "Peninsula Action Studies",
        "dimensionsCm": "121.9 × 152.4 cm",
        "dimensionsIn": "48 × 60 in.",
        "scaleCategory": "large",
        "frameTone": "walnut",
        "inquiryOnly": False,
        "priceUsd": 465000,
        "estimateRange": "$400,000 – $550,000",
        "medium": "Washable turquoise, phthalo cyan, and sky-blue fluid tempera-acrylic hybrid on stretched cotton canvas",
        "condition": "Pristine recto. Ballistic drip trajectories along lower-left quadrant fully cured prior to counter clearance; zero domestic citrus-mist or paper-towel fiber contact despite close proximity during execution.",
        "provenance": [
            "Private Collection, Granite Kitchen Peninsula, Northern Virginia, July 2024",
            "Acquired directly from the Studio Countertop"
        ],
        "exhibited": [
            "Contemporary Evening Preview, Domestic Topographies of the Avant-Garde, New York, 2025, lot 9"
        ],
        "essay": "Conceived at precarious oblique equilibrium across a polished granite peninsula between afternoon snack and supper preparation, Composition Après le Goûter is pure hydro-calligraphic velocity. Deep viridian lariats whip across the stark white left field before coalescing into a marbled turquoise torrent that settles into a serene, sky-blue pelvis at lower right—a single continuous breath of chromatic release."
    },
    {
        "slug": "wl-lot-10",
        "lotNumber": "LOT 10",
        "catalogueNo": "WL.2024.08.X",
        "sourceFile": "PXL_20240803_165236343.PORTRAIT.jpg",
        "quad": [(21.8, 17.1), (85.6, 19.2), (99.5, 87.3), (5.7, 86.8)],
        "aspect": 2.15,
        "lightingMode": "standard",
        "warmthShift": 0.0,
        "macroCenter": (56.0, 52.0),
        "macroSpan": 0.52,
        "macroCaption": "Detail (orbital nexus): high-velocity Naples-peach filaments intersecting electric cobalt polymer over matte carbon ground.",
        "title": "Trajectoire Nocturne (Orbital Study on Obsidian Ground)",
        "shortTitle": "Trajectoire Nocturne",
        "year": "2024",
        "series": "Nocturnal Field Works",
        "dimensionsCm": "91.4 × 198.1 cm",
        "dimensionsIn": "36 × 78 in.",
        "scaleCategory": "large",
        "frameTone": "aluminum",
        "inquiryOnly": False,
        "priceUsd": 385000,
        "estimateRange": "$320,000 – $450,000",
        "medium": "Phthalo cobalt pour and warm Naples-peach ballistic filament drips on matte carbon-primed panoramic board",
        "condition": "Very fine. Matte charcoal ground exhibits velvety light absorption; high-velocity peach arcs retain feathered micro-spatter along centrifugal vectors; trace turf clippings removed from verso by studio registrars.",
        "provenance": [
            "Executed en plein air, South Lawn Sector, August 2024",
            "Private Collection"
        ],
        "exhibited": [
            "Atelier W.L., Action & Orbit, Private Salon, 2025, pl. X"
        ],
        "essay": "Working for the sole documented occasion on a dead-matte charcoal ground, W.L. inverts the luminosity mechanics of the studio's white-primed corpus. Across a dramatic cinematic frieze, an electric cobalt nebula anchors the center while sweeping, Keplerian orbits of warm Naples-peach arc from edge to edge with unmistakable ballistic confidence—recalling Hans Hartung and Jackson Pollock's black enamel paintings reimagined under open summer sky."
    },
    {
        "slug": "wl-lot-11",
        "lotNumber": "LOT 11",
        "catalogueNo": "WL.2024.11.XI",
        "sourceFile": "PXL_20241116_210808041.jpg",
        "quad": [(5.3, 7.0), (94.9, 7.9), (95.4, 98.8), (2.9, 97.6)],
        "aspect": 1.333,
        "lightingMode": "gesso_normalize",
        "warmthShift": 0.0,
        "macroCenter": (75.0, 55.0),
        "macroSpan": 0.34,
        "macroCaption": "Autographic detail (eastern register): twin diminutive palm impressions in sap-green emulsion beside radial burnt-orange splatter vectors.",
        "title": "Veritas Manuum (Vernal Vortex with Twin Autographic Impressions)",
        "shortTitle": "Veritas Manuum",
        "year": "2024",
        "series": "Somatic Index Works",
        "dimensionsCm": "137.2 × 182.9 cm",
        "dimensionsIn": "54 × 72 in.",
        "scaleCategory": "large",
        "frameTone": "walnut",
        "inquiryOnly": False,
        "priceUsd": 290000,
        "estimateRange": "$250,000 – $350,000",
        "medium": "Chartreuse, sap-green, cadmium-yellow, and apricot washable polymer with direct bimanual studio impressions on primed canvas",
        "condition": "Authenticated autographic surface. Twin right-register palm registrations (9.4 cm span) serve as primary biometric benchmark of the Artist's 2024 corpus; minor apple-juice craquelure lower quadrant professionally stabilized.",
        "provenance": [
            "Crushed-Aggregate Courtyard Studio, November 2024",
            "Retained by the Custodial Estate Trust"
        ],
        "exhibited": [
            "Museum of Contemporary Patronage (Proposed Loan), Index and Impulse, 2026"
        ],
        "essay": "Joyously combative and unapologetically physical, Veritas Manuum pairs a roaring upper canopy of rotary chartreuse comb-swirls with explosive, sun-like rays of burnt orange and cadmium yellow firing upward from the lower margin. To the right, two crisp sap-green palm impressions—each measuring barely nine centimeters across—anchor the composition in deep art-historical time, bridging Paleolithic stencil parity with Cy Twombly's Bacchic exuberance."
    },
    {
        "slug": "wl-lot-12",
        "lotNumber": "LOT 12",
        "catalogueNo": "WL.2024.12.XII",
        "sourceFile": "PXL_20241215_184019022~2.jpg",
        "quad": [(22.6, 10.2), (85.8, 6.8), (99.1, 94.0), (0.9, 90.2)],
        "aspect": 0.80,
        "lightingMode": "gesso_flatfield",
        "warmthShift": 0.0,
        "macroCenter": (45.0, 56.0),
        "macroSpan": 0.34,
        "macroCaption": "Detail (central artery): high-meniscus champagne-gold and pearl-silver polymer ribbons interlaced with staccato copper droplets.",
        "title": "Pluie d'Or Pâle (Winter Solstice Constellation)",
        "shortTitle": "Pluie d'Or Pâle",
        "year": "2024",
        "series": "Alchemical Corridor Studies",
        "dimensionsCm": "152.4 × 121.9 cm",
        "dimensionsIn": "60 × 48 in.",
        "scaleCategory": "medium",
        "frameTone": "aluminum",
        "inquiryOnly": False,
        "priceUsd": 145000,
        "estimateRange": "$120,000 – $180,000",
        "medium": "Iridescent champagne-gold, nacreous silver, and burnished copper polymer suspension slung on titanium-primed duck",
        "condition": "Mint archival condition. High-relief droplet menisci remain crisp and unflattened; subtle warm patina across pale gold central artery.",
        "provenance": [
            "Winter Floor Atelier, December 2024",
            "Acquired privately prior to holiday recess"
        ],
        "exhibited": [
            "Atelier W.L., Chamber Works in Silver & Gilt, Winter Salon, 2025, cat. no. 8"
        ],
        "essay": "Restrained in palette yet ecstatic in trajectory, Pluie d'Or Pâle distills W.L.'s action technique to pure metallic lyricism. A single overarching spine of pale champagne gold and liquid pearl arcs downward through a storm of copper micro-droplets, leaving the right flank sparsely punctuated like a star chart—an intimate, luminous winter nocturne painted in reflected light."
    },
    {
        "slug": "wl-lot-13",
        "lotNumber": "LOT 13",
        "catalogueNo": "WL.2025.05.XIII",
        "sourceFile": "PXL_20250526_142852576.PORTRAIT.jpg",
        "quad": [(41.0, 15.5), (79.5, 46.8), (58.0, 63.8), (28.0, 29.0)],
        "aspect": 1.333,
        "lightingMode": "standard",
        "warmthShift": 0.0,
        "macroCenter": (52.0, 50.0),
        "macroSpan": 0.62,
        "macroCaption": "Raking-light detail: interlocking 75 mm industrial bristle furrows in unvarnished raw-sienna and blush-terracotta emulsion.",
        "title": "Tabula Rasa en Terre Cuite (Ground State Before Quiet Time)",
        "shortTitle": "Tabula Rasa en Terre Cuite",
        "year": "2025",
        "series": "Radical Monochrome Studies",
        "dimensionsCm": "76.2 × 101.6 cm",
        "dimensionsIn": "30 × 40 in.",
        "scaleCategory": "intimate",
        "frameTone": "walnut",
        "inquiryOnly": False,
        "priceUsd": 48000,
        "estimateRange": "$42,000 – $60,000",
        "medium": "Raw sienna and blush-terracotta tempera emulsion applied with 75 mm industrial house-painter's bristle brush on primed cotton",
        "condition": "Unvarnished matte surface as intended. Pronounced parallel bristle striations remain crisp across interlocking diagonal passes; faint raw-gesso breathing aperture preserved at upper periphery.",
        "provenance": [
            "Executed en plein air, May 2025",
            "Documented preparatory ground study relating to the 2025 Maritime Diptych"
        ],
        "exhibited": [
            "Atelier W.L., Zero Degree of the Brush: Studies & Grounds, 2025, cat. no. 1"
        ],
        "essay": "In dialogue with Robert Ryman and Marcia Hafif's Radical Painting manifesto, Tabula Rasa en Terre Cuite elevates the foundational studio labor of laying a warm earth ground into a self-sufficient minimalist statement. Wielding an oversized 75-millimeter utility brush with disarming architectural discipline, W.L. weaves sweeping, cross-hatched furrows of warm blush-terracotta that record every variation of wrist pressure prior to quiet time."
    }
]

# Fix exact Lot 04 price ($1,150,000 USD)
WORKS_SPEC[3]["priceUsd"] = 1150000


def process_all_works() -> None:
    OUT_ART_DIR.mkdir(parents=True, exist_ok=True)
    OUT_JSON_PATH.parent.mkdir(parents=True, exist_ok=True)

    manifest: list[dict[str, Any]] = []

    for index, spec in enumerate(WORKS_SPEC, start=1):
        src_path = RAW_DIR / spec["sourceFile"]
        if not src_path.exists():
            raise FileNotFoundError(f"Missing raw studio source: {src_path}")

        raw_rgb = load_transposed_rgb(src_path)

        if spec.get("isDiptych"):
            left_rect = perspective_rectify(
                raw_rgb, spec["quadLeft"], spec["panelAspect"], long_edge=1850
            )
            right_rect = perspective_rectify(
                raw_rgb, spec["quadRight"], spec["panelAspect"], long_edge=1850
            )
            left_bal = balance_gallery_lighting(
                left_rect, mode=spec["lightingMode"], warmth_shift=spec["warmthShift"]
            )
            right_bal = balance_gallery_lighting(
                right_rect, mode=spec["lightingMode"], warmth_shift=spec["warmthShift"]
            )
            full_rgb = compose_diptych(left_bal, right_bal)
        else:
            rect = perspective_rectify(
                raw_rgb, spec["quad"], spec["aspect"], long_edge=2200
            )
            full_rgb = balance_gallery_lighting(
                rect, mode=spec["lightingMode"], warmth_shift=spec["warmthShift"]
            )

        fh, fw = full_rgb.shape[:2]
        card_scale = 1100.0 / max(fw, fh)
        card_w = int(round(fw * card_scale))
        card_h = int(round(fh * card_scale))
        card_rgb = cv2.resize(full_rgb, (card_w, card_h), interpolation=cv2.INTER_AREA)

        macro_rgb = extract_macro_crop(
            full_rgb, spec["macroCenter"], span_pct=spec["macroSpan"], out_size=1000
        )
        palette = extract_palette_hex(full_rgb, k=4)

        slug = spec["slug"]
        full_rel = f"/artworks/{slug}-full.webp"
        card_rel = f"/artworks/{slug}-card.webp"
        macro_rel = f"/artworks/{slug}-macro.webp"

        save_scrubbed_webp(full_rgb, OUT_ART_DIR / f"{slug}-full.webp", quality=90)
        save_scrubbed_webp(card_rgb, OUT_ART_DIR / f"{slug}-card.webp", quality=86)
        save_scrubbed_webp(macro_rgb, OUT_ART_DIR / f"{slug}-macro.webp", quality=89)

        manifest.append(
            {
                "id": slug,
                "index": index,
                "lotNumber": spec["lotNumber"],
                "catalogueNo": spec["catalogueNo"],
                "title": spec["title"],
                "shortTitle": spec["shortTitle"],
                "artist": "W.L.",
                "atelier": "Atelier W.L. (b. 2022)",
                "year": spec["year"],
                "series": spec["series"],
                "dimensionsCm": spec["dimensionsCm"],
                "dimensionsIn": spec["dimensionsIn"],
                "scaleCategory": spec["scaleCategory"],
                "frameTone": spec["frameTone"],
                "isDiptych": bool(spec.get("isDiptych", False)),
                "inquiryOnly": spec["inquiryOnly"],
                "priceUsd": spec["priceUsd"],
                "estimateRange": spec["estimateRange"],
                "medium": spec["medium"],
                "condition": spec["condition"],
                "provenance": spec["provenance"],
                "exhibited": spec["exhibited"],
                "essay": spec["essay"],
                "macroCaption": spec["macroCaption"],
                "images": {
                    "full": full_rel,
                    "card": card_rel,
                    "macro": macro_rel,
                    "width": fw,
                    "height": fh,
                    "cardWidth": card_w,
                    "cardHeight": card_h,
                    "aspectRatio": round(fw / fh, 4),
                },
                "palette": palette,
            }
        )
        print(
            f"[OK] {spec['lotNumber']} | {spec['catalogueNo']} | "
            f"{fw}x{fh} | EXIF=0 | palette={','.join(palette)}"
        )

    OUT_JSON_PATH.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"\nGenerated {len(manifest)} curated works -> {OUT_JSON_PATH}")


if __name__ == "__main__":
    process_all_works()
