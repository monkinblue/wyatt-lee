import React, { useId, useState } from 'react';
import type {
  Artwork,
  CurrencyCode,
  FrameMaterial,
  FramingMode,
  InSituRoom,
} from '../types/gallery';
import { formatValuation } from '../utils/currency';
import { ArtworkStage } from './ArtworkStage';
import { EmbossedStudioSeal, GooglePayMark, RegistrarStamp } from './BrandMarks';

interface LotMonographViewProps {
  artwork: Artwork;
  allArtworks: Artwork[];
  initialFramingMode: FramingMode;
  currency: CurrencyCode;
  inFolio: boolean;
  transitioningSlug: string | null;
  onBackToSalon: () => void;
  onSelectWork: (work: Artwork, mode: FramingMode) => void;
  onAddToFolio: (work: Artwork, mode: FramingMode, material: FrameMaterial) => void;
  onExpressGooglePay: (work: Artwork, mode: FramingMode, material: FrameMaterial) => void;
}

export const LotMonographView: React.FC<LotMonographViewProps> = ({
  artwork,
  allArtworks,
  initialFramingMode,
  currency,
  inFolio,
  transitioningSlug,
  onBackToSalon,
  onSelectWork,
  onAddToFolio,
  onExpressGooglePay,
}) => {
  const [framingMode, setFramingMode] = useState<FramingMode>(initialFramingMode);
  const [frameMaterial, setFrameMaterial] = useState<FrameMaterial>(artwork.frameTone);
  const [inSituRoom, setInSituRoom] = useState<InSituRoom>('zurich');
  const [loupeActive, setLoupeActive] = useState<boolean>(true);
  const [copiedHex, setCopiedHex] = useState<string | null>(null);

  const rawId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const conservationPopoverId = `wl-conservation-note-${rawId}`;

  const currentIndex = allArtworks.findIndex((w) => w.id === artwork.id);
  const prevWork = allArtworks[(currentIndex - 1 + allArtworks.length) % allArtworks.length];
  const nextWork = allArtworks[(currentIndex + 1) % allArtworks.length];

  const copySwatch = (hex: string) => {
    void navigator.clipboard?.writeText(hex);
    setCopiedHex(hex);
    setTimeout(() => setCopiedHex(null), 1600);
  };

  return (
    <article className="wl-lot-monograph-view" aria-labelledby="lot-detail-heading">
      {/* Top Breadcrumb & Sequential Lot Bar */}
      <div className="wl-lot-topbar">
        <button type="button" className="wl-back-link" onClick={onBackToSalon}>
          ← Return to Exhibition Catalogue
        </button>

        <div className="wl-lot-seq-controls">
          <button
            type="button"
            className="wl-seq-btn"
            onClick={() => onSelectWork(prevWork, framingMode)}
          >
            ← {prevWork.lotNumber}
          </button>
          <span className="wl-seq-indicator">
            {artwork.lotNumber} OF {allArtworks.length} · {artwork.catalogueNo}
          </span>
          <button
            type="button"
            className="wl-seq-btn"
            onClick={() => onSelectWork(nextWork, framingMode)}
          >
            {nextWork.lotNumber} →
          </button>
        </div>
      </div>

      <div className="wl-lot-monograph-grid">
        {/* Left Column: Interactive Stage + Macro Conservation Plate */}
        <div className="wl-lot-stage-column">
          <div className="wl-lot-primary-stage">
            <ArtworkStage
              artwork={artwork}
              framingMode={framingMode}
              frameMaterial={frameMaterial}
              inSituRoom={inSituRoom}
              priority="high"
              useFullRes
              enableLoupe={loupeActive && framingMode !== 'insitu'}
              transitionName={
                transitioningSlug === null || transitioningSlug === artwork.id
                  ? `lot-art-${artwork.id}`
                  : undefined
              }
            />

            {/* Interactive Presentation Mode & Frame / Room Toolbar */}
            <div className="wl-lot-stage-toolbar">
              <div className="wl-stage-mode-bar" role="group" aria-label="Framing and scale mode">
                <button
                  type="button"
                  className={`wl-mode-chip ${framingMode === 'raw' ? 'is-active' : ''}`}
                  onClick={() => setFramingMode('raw')}
                >
                  Raw Studio State
                </button>
                <button
                  type="button"
                  className={`wl-mode-chip ${framingMode === 'float' ? 'is-active' : ''}`}
                  onClick={() => setFramingMode('float')}
                >
                  Museum Float Frame
                </button>
                <button
                  type="button"
                  className={`wl-mode-chip ${framingMode === 'insitu' ? 'is-active' : ''}`}
                  onClick={() => setFramingMode('insitu')}
                >
                  In Situ Collector&rsquo;s Space
                </button>
              </div>

              {framingMode === 'float' && (
                <div className="wl-sub-toolbar" role="group" aria-label="Shadowbox finish">
                  <span className="wl-sub-label">MOULDING:</span>
                  {(['obsidian', 'walnut', 'aluminum'] as FrameMaterial[]).map((mat) => (
                    <button
                      key={mat}
                      type="button"
                      className={`wl-mini-mode-btn ${frameMaterial === mat ? 'is-active' : ''}`}
                      onClick={() => setFrameMaterial(mat)}
                    >
                      {mat === 'obsidian'
                        ? 'Ebonized Ash'
                        : mat === 'walnut'
                          ? 'Black Walnut'
                          : 'Anodized Aluminum'}
                    </button>
                  ))}
                </div>
              )}

              {framingMode === 'insitu' && (
                <div className="wl-sub-toolbar" role="group" aria-label="Collector space environment">
                  <span className="wl-sub-label">ENVIRONMENT:</span>
                  {(['zurich', 'tribeca', 'geneva'] as InSituRoom[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      className={`wl-mini-mode-btn ${inSituRoom === r ? 'is-active' : ''}`}
                      onClick={() => setInSituRoom(r)}
                    >
                      {r === 'zurich'
                        ? 'Concrete Kunsthalle'
                        : r === 'tribeca'
                          ? 'Tribeca Penthouse'
                          : 'Geneva Basalt Vault'}
                    </button>
                  ))}
                </div>
              )}

              {framingMode !== 'insitu' && (
                <button
                  type="button"
                  className={`wl-loupe-toggle ${loupeActive ? 'is-active' : ''}`}
                  onClick={() => setLoupeActive((v) => !v)}
                >
                  {loupeActive ? '● 2.6× Raking Loupe Active' : '○ Enable 2.6× Raking Loupe'}
                </button>
              )}
            </div>
          </div>

          {/* 1:1 Macro Raking-Light Detail Plate */}
          <figure className="wl-lot-macro-panel">
            <img
              src={artwork.images.macro}
              alt={`1:1 raking-light macro surface detail of ${artwork.shortTitle}`}
              width={1000}
              height={1000}
              loading="lazy"
            />
            <figcaption>
              <span className="wl-eyebrow">CONSERVATION MICROSCOPY · PLATE DETAIL (1:1)</span>
              <p>{artwork.macroCaption}</p>
            </figcaption>
          </figure>
        </div>

        {/* Right Column: Sotheby's Evening Sale & Curatorial Monograph Dossier */}
        <div className="wl-lot-dossier-column">
          <div className="wl-lot-dossier-header">
            <div className="wl-lot-badges">
              <span className="wl-lot-num-large">{artwork.lotNumber}</span>
              <RegistrarStamp />
            </div>

            <p className="wl-artist-attribution">
              <strong>{artwork.artist}</strong> (b. 2022) · {artwork.series}
            </p>

            <h1 id="lot-detail-heading" tabIndex={-1} className="wl-lot-monograph-title">
              <cite>{artwork.title}</cite>
            </h1>

            <p className="wl-lot-date-scale">
              Executed {artwork.year} · {artwork.dimensionsCm} ({artwork.dimensionsIn}) · Unique
              Work (Edition 1 of 1)
            </p>
          </div>

          {/* Valuation & Acquisition Box */}
          <div className="wl-acquisition-card">
            <div className="wl-acq-price-row">
              <div>
                <span className="wl-val-label">
                  {artwork.inquiryOnly
                    ? 'PRIVATE RESERVE ALLOCATION'
                    : 'CONTEMPORARY EVENING VALUATION'}
                </span>
                <div className="wl-acq-primary-price">
                  {artwork.inquiryOnly
                    ? 'Price Upon Private Inquiry'
                    : formatValuation(artwork.priceUsd, currency)}
                </div>
                <span className="wl-acq-estimate">
                  {artwork.inquiryOnly
                    ? `Institutional Insurance Benchmark: ${formatValuation(artwork.priceUsd, currency)}`
                    : `Auction Estimate Reference: ${artwork.estimateRange}`}
                </span>
              </div>
              <EmbossedStudioSeal size={68} />
            </div>

            <div className="wl-acq-cta-stack">
              <button
                type="button"
                className="wl-gpay-pill-btn"
                onClick={() => onExpressGooglePay(artwork, framingMode, frameMaterial)}
                aria-label={`Express Acquire ${artwork.shortTitle} with Google Pay`}
              >
                <span className="wl-gpay-prefix">Acquire with</span>
                <GooglePayMark lightText />
              </button>

              <button
                type="button"
                className="wl-btn-primary wl-full-width"
                onClick={() => onAddToFolio(artwork, framingMode, frameMaterial)}
              >
                {inFolio
                  ? 'In Collector’s Acquisition Folio — View Folio'
                  : artwork.inquiryOnly
                    ? 'Acquire via Private Client Desk'
                    : 'Add to Collector’s Acquisition Folio'}
              </button>
            </div>

            <p className="wl-acq-footnote">
              Includes Certificate of Provenance (Edition 1 of 1), nitrogen-buffered fine-art air
              crate specification, and Atelier W.L. Patronage Grant eligibility.
            </p>
          </div>

          {/* Technical Catalogue Metadata */}
          <dl className="wl-dossier-specs">
            <div>
              <dt>CATALOGUE RAISONNÉ</dt>
              <dd className="wl-mono">{artwork.catalogueNo}</dd>
            </div>
            <div>
              <dt>MEDIUM &amp; SUPPORT</dt>
              <dd>{artwork.medium}</dd>
            </div>
            <div>
              <dt className="wl-dt-with-popover">
                <span>CONDITION REPORT</span>
                <button
                  type="button"
                  className="wl-info-toggletip-btn wl-conservation-trigger"
                  aria-label="Registrar conservation grading standard"
                  {...({
                    commandfor: conservationPopoverId,
                    command: 'toggle-popover',
                  } as React.ButtonHTMLAttributes<HTMLButtonElement>)}
                >
                  ?
                </button>
                <div
                  id={conservationPopoverId}
                  className="wl-toggletip-popover wl-conservation-popover"
                  {...({ popover: 'auto' } as React.HTMLAttributes<HTMLDivElement>)}
                >
                  <strong>Atelier Conservation Standard A1</strong>
                  <p>
                    Inspected under 365 nm UV and 45° raking halogen illumination. All washable
                    tempera, foil inclusions, and domestic trace media are archivally consolidated.
                  </p>
                </div>
              </dt>
              <dd>{artwork.condition}</dd>
            </div>
            <div>
              <dt>PROVENANCE</dt>
              <dd>
                <ul className="wl-dossier-list">
                  {artwork.provenance.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </dd>
            </div>
            <div>
              <dt>EXHIBITED &amp; LITERATURE</dt>
              <dd>
                <ul className="wl-dossier-list">
                  {artwork.exhibited.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </dd>
            </div>
            <div>
              <dt>CHROMATIC SPECTROMETRY</dt>
              <dd>
                <div className="wl-swatch-row">
                  {artwork.palette.map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      className="wl-swatch-chip"
                      onClick={() => copySwatch(hex)}
                      aria-label={`Copy pigment hex ${hex}`}
                    >
                      <span className="wl-swatch-box" style={{ backgroundColor: hex }} />
                      <span className="wl-mono">{copiedHex === hex ? 'COPIED' : hex}</span>
                    </button>
                  ))}
                </div>
              </dd>
            </div>
          </dl>

          {/* Curatorial Monograph Essay for This Lot */}
          <div className="wl-lot-curatorial-note">
            <h2 className="wl-eyebrow">CURATORIAL LOT NOTE</h2>
            <p>{artwork.essay}</p>
          </div>
        </div>
      </div>
    </article>
  );
};
