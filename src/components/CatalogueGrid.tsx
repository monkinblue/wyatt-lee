import React, { useMemo, useState } from 'react';
import type { Artwork, CurrencyCode, FramingMode } from '../types/gallery';
import { formatValuation } from '../utils/currency';
import { ArtworkStage } from './ArtworkStage';

interface CatalogueGridProps {
  artworks: Artwork[];
  currency: CurrencyCode;
  folioIds: Set<string>;
  transitioningSlug: string | null;
  onInspectWork: (work: Artwork, initialMode: FramingMode) => void;
  onAddToFolio: (work: Artwork, mode: FramingMode) => void;
}

type FilterKey = 'all' | 'monumental' | 'gilt' | 'somatic' | 'pleinair';

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: 'all', label: 'Complete Corpus (13)' },
  { key: 'monumental', label: 'Monumental Scale' },
  { key: 'gilt', label: 'Gilt & Metallic Leaf' },
  { key: 'somatic', label: 'Somatic & Action Index' },
  { key: 'pleinair', label: 'Plein-Air & Peninsula' },
];

export const CatalogueGrid: React.FC<CatalogueGridProps> = ({
  artworks,
  currency,
  folioIds,
  transitioningSlug,
  onInspectWork,
  onAddToFolio,
}) => {
  const [filter, setFilter] = useState<FilterKey>('all');
  const [gridFraming, setGridFraming] = useState<FramingMode>('raw');
  const [perCardOverrides, setPerCardOverrides] = useState<Record<string, FramingMode>>({});

  const filteredWorks = useMemo(() => {
    return artworks.filter((w) => {
      if (filter === 'all') return true;
      if (filter === 'monumental') return w.scaleCategory === 'monumental';
      if (filter === 'gilt') {
        return /gilt|gold|foil|silver|copper|champagne/i.test(w.medium);
      }
      if (filter === 'somatic') {
        return /somatic|palm|filament|drip|bristle/i.test(w.medium + ' ' + w.series);
      }
      if (filter === 'pleinair') {
        return /plein|peninsula|courtyard|lawn/i.test(w.provenance.join(' '));
      }
      return true;
    });
  }, [artworks, filter]);

  const getMode = (id: string): FramingMode => perCardOverrides[id] ?? gridFraming;

  const setCardMode = (id: string, mode: FramingMode) => {
    setPerCardOverrides((prev) => ({ ...prev, [id]: mode }));
  };

  const applyGlobalMode = (mode: FramingMode) => {
    setGridFraming(mode);
    setPerCardOverrides({});
  };

  return (
    <section
      id="catalogue-raisonne"
      className="wl-catalogue-section"
      aria-labelledby="catalogue-heading"
    >
      <div className="wl-section-header">
        <div>
          <p className="wl-eyebrow">CATALOGUE RAISONNÉ · LOTS 01–13</p>
          <h2 id="catalogue-heading" className="wl-section-title">
            Primary Market &amp; Evening Sale Offerings
          </h2>
        </div>
        <p className="wl-section-lead">
          Every work is a singular studio original (Edition 1 of 1), perspective-archived directly
          from the Artist&rsquo;s 2024–2025 corpus and accompanied by full Atelier conservation
          documentation.
        </p>
      </div>

      {/* Filter & Global Framing Control Toolbar */}
      <div className="wl-catalogue-controls">
        <div className="wl-filter-pills" role="group" aria-label="Filter works by curatorial grouping">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              className={`wl-filter-pill ${filter === f.key ? 'is-active' : ''}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="wl-global-framing-bar" role="group" aria-label="Global gallery framing state">
          <span className="wl-framing-bar-label">GALLERY PRESENTATION:</span>
          <button
            type="button"
            className={`wl-mode-chip ${gridFraming === 'raw' && Object.keys(perCardOverrides).length === 0 ? 'is-active' : ''}`}
            onClick={() => applyGlobalMode('raw')}
          >
            Raw Studio
          </button>
          <button
            type="button"
            className={`wl-mode-chip ${gridFraming === 'float' && Object.keys(perCardOverrides).length === 0 ? 'is-active' : ''}`}
            onClick={() => applyGlobalMode('float')}
          >
            Museum Float Frame
          </button>
          <button
            type="button"
            className={`wl-mode-chip ${gridFraming === 'insitu' && Object.keys(perCardOverrides).length === 0 ? 'is-active' : ''}`}
            onClick={() => applyGlobalMode('insitu')}
          >
            In Situ Space
          </button>
        </div>
      </div>

      {/* CSS Subgrid + Container Query Catalogue Raisonné Grid */}
      <div className="wl-lot-grid">
        {filteredWorks.map((work, idx) => {
          const mode = getMode(work.id);
          const inFolio = folioIds.has(work.id);

          return (
            <article key={work.id} className="wl-lot-card wl-scroll-reveal">
              {/* Row 1: Artwork Stage + Individual Framing Switcher */}
              <div className="wl-lot-card-stage">
                <ArtworkStage
                  artwork={work}
                  framingMode={mode}
                  inSituRoom={idx % 3 === 0 ? 'zurich' : idx % 3 === 1 ? 'tribeca' : 'geneva'}
                  priority="lazy"
                  cursorHint={`INSPECT ${work.lotNumber}`}
                  transitionName={
                    transitioningSlug === work.id ? `lot-art-${work.id}` : undefined
                  }
                  onClick={() => onInspectWork(work, mode)}
                />

                <div
                  className="wl-card-mode-toggles"
                  role="group"
                  aria-label={`Presentation mode for ${work.shortTitle}`}
                >
                  <button
                    type="button"
                    className={`wl-mini-mode-btn ${mode === 'raw' ? 'is-active' : ''}`}
                    onClick={() => setCardMode(work.id, 'raw')}
                  >
                    Raw
                  </button>
                  <button
                    type="button"
                    className={`wl-mini-mode-btn ${mode === 'float' ? 'is-active' : ''}`}
                    onClick={() => setCardMode(work.id, 'float')}
                  >
                    Float
                  </button>
                  <button
                    type="button"
                    className={`wl-mini-mode-btn ${mode === 'insitu' ? 'is-active' : ''}`}
                    onClick={() => setCardMode(work.id, 'insitu')}
                  >
                    In Situ
                  </button>
                </div>
              </div>

              {/* Row 2: Lot Datum & Title */}
              <div className="wl-lot-card-header">
                <div className="wl-lot-datum-row">
                  <span className="wl-lot-num">{work.lotNumber}</span>
                  <span className="wl-cat-num">{work.catalogueNo}</span>
                  <span className="wl-palette-dots" aria-hidden="true">
                    {work.palette.slice(0, 3).map((hex) => (
                      <i key={hex} style={{ backgroundColor: hex }} />
                    ))}
                  </span>
                </div>
                <h3 className="wl-lot-card-title">
                  <button
                    type="button"
                    className="wl-title-link-btn"
                    onClick={() => onInspectWork(work, mode)}
                  >
                    <cite>{work.title}</cite>
                  </button>
                </h3>
                <p className="wl-lot-year-dims">
                  {work.year} · {work.dimensionsCm} ({work.dimensionsIn})
                </p>
              </div>

              {/* Row 3: Medium & Provenance Note */}
              <div className="wl-lot-card-notes">
                <p className="wl-lot-medium">{work.medium}</p>
                <p className="wl-lot-prov">
                  <span>PROVENANCE:</span> {work.provenance[0]}
                </p>
              </div>

              {/* Row 4: Valuation & Actions */}
              <div className="wl-lot-card-footer">
                <div className="wl-lot-valuation-block">
                  <span className="wl-val-label">
                    {work.inquiryOnly ? 'PRIVATE CLIENT DESK' : 'GALLERY VALUATION'}
                  </span>
                  <span className="wl-val-price">
                    {work.inquiryOnly
                      ? 'Price Upon Private Inquiry'
                      : formatValuation(work.priceUsd, currency)}
                  </span>
                </div>

                <div className="wl-lot-card-actions">
                  <button
                    type="button"
                    className="wl-card-btn-secondary"
                    onClick={() => onInspectWork(work, mode)}
                  >
                    Monograph
                  </button>
                  <button
                    type="button"
                    className={`wl-card-btn-primary ${inFolio ? 'is-added' : ''}`}
                    onClick={() => onAddToFolio(work, mode)}
                  >
                    {inFolio
                      ? 'In Folio ✓'
                      : work.inquiryOnly
                        ? 'Allocate'
                        : 'Acquire'}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};
