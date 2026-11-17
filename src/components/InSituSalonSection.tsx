import React, { useState } from 'react';
import type {
  Artwork,
  CurrencyCode,
  FrameMaterial,
  FramingMode,
  InSituRoom,
} from '../types/gallery';
import { formatValuation } from '../utils/currency';
import { ArtworkStage } from './ArtworkStage';

interface InSituSalonSectionProps {
  artworks: Artwork[];
  currency: CurrencyCode;
  onInspectWork: (work: Artwork, initialMode: FramingMode) => void;
  onAddToFolio: (work: Artwork, mode: FramingMode, material: FrameMaterial) => void;
}

const ROOMS: Array<{ id: InSituRoom; title: string; subtitle: string }> = [
  {
    id: 'zurich',
    title: 'Zurich Concrete Kunsthalle',
    subtitle: 'Board-formed architectural concrete · 4.2m ceiling · Travertine viewing bench',
  },
  {
    id: 'tribeca',
    title: 'Tribeca Collector’s Penthouse',
    subtitle: 'Hand-troweled limewash plaster · Raking clerestory daylight · 3.8m loft',
  },
  {
    id: 'geneva',
    title: 'Geneva Custodial Vault',
    subtitle: 'Honed basalt acoustic panelling · Precision framing projector · 140 lux',
  },
];

const MATERIALS: Array<{ id: FrameMaterial; label: string }> = [
  { id: 'obsidian', label: 'Ebonized Ash' },
  { id: 'walnut', label: 'American Black Walnut' },
  { id: 'aluminum', label: 'Anodized Brushed Aluminum' },
];

export const InSituSalonSection: React.FC<InSituSalonSectionProps> = ({
  artworks,
  currency,
  onInspectWork,
  onAddToFolio,
}) => {
  const [selectedIdx, setSelectedIdx] = useState<number>(1); // Default to Lot 02 (60x60in square)
  const [room, setRoom] = useState<InSituRoom>('zurich');
  const [material, setMaterial] = useState<FrameMaterial>('obsidian');

  const activeWork = artworks[selectedIdx] ?? artworks[0];

  return (
    <section
      id="in-situ-salon"
      className="wl-insitu-section"
      aria-labelledby="insitu-salon-heading"
    >
      <div className="wl-section-header">
        <div>
          <p className="wl-eyebrow">ARCHITECTURAL SCALE &amp; COLLECTOR PLACEMENT</p>
          <h2 id="insitu-salon-heading" className="wl-section-title">
            Private Viewing Room &amp; In Situ Simulator
          </h2>
        </div>
        <p className="wl-section-lead">
          Evaluate physical monumentality against calibrated architectural sightlines (152 cm
          museum center-hang above a 195 cm travertine bench).
        </p>
      </div>

      <div className="wl-insitu-showcase-grid">
        <div className="wl-insitu-stage-large">
          <ArtworkStage
            artwork={activeWork}
            framingMode="insitu"
            frameMaterial={material}
            inSituRoom={room}
            useFullRes
            priority="lazy"
            cursorHint="OPEN MONOGRAPH"
            onClick={() => onInspectWork(activeWork, 'insitu')}
          />
        </div>

        <aside className="wl-insitu-controls-panel" aria-label="Viewing room controls">
          <div className="wl-control-block">
            <p className="wl-control-label">01 · SELECT ARCHITECTURAL SPACE</p>
            <div className="wl-room-selector">
              {ROOMS.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className={`wl-room-card-btn ${room === r.id ? 'is-active' : ''}`}
                  onClick={() => setRoom(r.id)}
                >
                  <strong>{r.title}</strong>
                  <span>{r.subtitle}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="wl-control-block">
            <p className="wl-control-label">02 · SHADOWBOX MOULDING SPECIFICATION</p>
            <div className="wl-material-pills">
              {MATERIALS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={`wl-mode-chip ${material === m.id ? 'is-active' : ''}`}
                  onClick={() => setMaterial(m.id)}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="wl-control-block">
            <p className="wl-control-label">
              03 · HANG WORK ON WALL ({activeWork.lotNumber} OF 13)
            </p>
            <div className="wl-insitu-thumb-strip" role="list">
              {artworks.map((w, idx) => (
                <button
                  key={w.id}
                  type="button"
                  role="listitem"
                  className={`wl-insitu-thumb-btn ${idx === selectedIdx ? 'is-selected' : ''}`}
                  onClick={() => setSelectedIdx(idx)}
                  aria-label={`Hang ${w.lotNumber}: ${w.shortTitle}`}
                >
                  <img
                    src={w.images.card}
                    alt=""
                    width={w.images.cardWidth}
                    height={w.images.cardHeight}
                    loading="lazy"
                    className={w.isDiptych ? 'is-diptych-thumb' : ''}
                  />
                  <span>{w.lotNumber.replace('LOT ', '')}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="wl-insitu-active-summary">
            <div>
              <p className="wl-lot-num">
                {activeWork.lotNumber} · {activeWork.dimensionsCm}
              </p>
              <h3 className="wl-insitu-work-title">
                <cite>{activeWork.shortTitle}</cite>, {activeWork.year}
              </h3>
              <p className="wl-insitu-work-price">
                {activeWork.inquiryOnly
                  ? 'Price Upon Private Inquiry'
                  : formatValuation(activeWork.priceUsd, currency)}
              </p>
            </div>
            <div className="wl-insitu-summary-btns">
              <button
                type="button"
                className="wl-btn-secondary"
                onClick={() => onInspectWork(activeWork, 'insitu')}
              >
                Lot Dossier
              </button>
              <button
                type="button"
                className="wl-btn-primary"
                onClick={() => onAddToFolio(activeWork, 'float', material)}
              >
                Acquire Framed
              </button>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
};
