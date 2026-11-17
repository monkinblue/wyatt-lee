import React, { useState } from 'react';
import type { Artwork, FramingMode } from '../types/gallery';
import { ArtworkStage } from './ArtworkStage';
import { EmbossedStudioSeal, RegistrarStamp } from './BrandMarks';

interface HeroSalonProps {
  flagshipWork: Artwork;
  transitioningSlug: string | null;
  onInspectWork: (work: Artwork) => void;
  onAcquireWork: (work: Artwork, mode: FramingMode) => void;
  onExploreCatalogue: () => void;
}

export const HeroSalon: React.FC<HeroSalonProps> = ({
  flagshipWork,
  transitioningSlug,
  onInspectWork,
  onAcquireWork,
  onExploreCatalogue,
}) => {
  const [heroFraming, setHeroFraming] = useState<FramingMode>('float');

  return (
    <section className="wl-hero" aria-labelledby="salon-main-heading">
      <div className="wl-hero-meta-strip">
        <span>EXHIBITION MONOGRAPH NO. IV · AUTUMN / WINTER</span>
        <span>NEW YORK · ZURICH · GENEVA · NORTHERN VIRGINIA</span>
        <span>REPRESENTED EXCLUSIVELY BY ATELIER W.L.</span>
      </div>

      <div className="wl-hero-grid">
        <div className="wl-hero-editorial">
          <div className="wl-hero-kicker-row">
            <span className="wl-eyebrow">ATELIER W.L. (B. 2022) · SOLO SURVEY</span>
            <RegistrarStamp label="PRIVATE EVENING ALLOCATION" />
          </div>

          <h1 id="salon-main-heading" tabIndex={-1} className="wl-hero-title">
            Before the Dimming of the Hallway Light
          </h1>

          <p className="wl-hero-subtitle">
            Thirteen primary works executed between 2024 and 2025—charting W.L.&rsquo;s radical
            synthesis of unpremeditated hydrodynamic pour, bimanual somatic index, and domestic
            architectural materiality.
          </p>

          <dl className="wl-hero-lot-callout">
            <div>
              <dt>COVER PLATE</dt>
              <dd>
                {flagshipWork.lotNumber} · {flagshipWork.catalogueNo}
              </dd>
            </div>
            <div>
              <dt>TITLE</dt>
              <dd>
                <cite>{flagshipWork.shortTitle}</cite>, {flagshipWork.year}
              </dd>
            </div>
            <div>
              <dt>ALLOCATION</dt>
              <dd className="wl-gilt-text">{flagshipWork.estimateRange}</dd>
            </div>
          </dl>

          <div className="wl-hero-actions">
            <button
              type="button"
              className="wl-btn-primary"
              onClick={() => onInspectWork(flagshipWork)}
            >
              Inspect Cover Lot Monograph
            </button>
            <button
              type="button"
              className="wl-btn-secondary"
              onClick={() => onAcquireWork(flagshipWork, heroFraming)}
            >
              Request Private Reserve Allocation
            </button>
            <button
              type="button"
              className="wl-btn-ghost"
              onClick={onExploreCatalogue}
            >
              View All 13 Catalogue Lots ↓
            </button>
          </div>

          <div className="wl-hero-seal-row">
            <EmbossedStudioSeal size={98} />
            <p className="wl-hero-curatorial-note">
              &ldquo;Operating entirely outside post-critical irony, W.L. restores to contemporary
              abstraction the terrifying, non-negotiable immediacy of pre-nap temporal
              compression.&rdquo;
              <span className="wl-quote-citation">
                — Curatorial Foreword, <cite>Cahiers d&rsquo;Atelier W.L.</cite>, 2026
              </span>
            </p>
          </div>
        </div>

        <div className="wl-hero-stage-col">
          <figure className="wl-hero-figure">
            <ArtworkStage
              artwork={flagshipWork}
              framingMode={heroFraming}
              frameMaterial="obsidian"
              inSituRoom="zurich"
              priority="high"
              useFullRes
              cursorHint="INSPECT LOT 01"
              transitionName={
                transitioningSlug === flagshipWork.id ? `lot-art-${flagshipWork.id}` : undefined
              }
              onClick={() => onInspectWork(flagshipWork)}
            />

            <figcaption className="wl-hero-figcaption">
              <div className="wl-stage-mode-bar" role="group" aria-label="Cover plate presentation">
                <button
                  type="button"
                  className={`wl-mode-chip ${heroFraming === 'raw' ? 'is-active' : ''}`}
                  onClick={() => setHeroFraming('raw')}
                >
                  Raw Studio State
                </button>
                <button
                  type="button"
                  className={`wl-mode-chip ${heroFraming === 'float' ? 'is-active' : ''}`}
                  onClick={() => setHeroFraming('float')}
                >
                  Museum Float Frame
                </button>
                <button
                  type="button"
                  className={`wl-mode-chip ${heroFraming === 'insitu' ? 'is-active' : ''}`}
                  onClick={() => setHeroFraming('insitu')}
                >
                  In Situ Space
                </button>
              </div>
              <span className="wl-plate-caption">
                Plate I · {flagshipWork.dimensionsCm} ({flagshipWork.dimensionsIn})
              </span>
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
};
