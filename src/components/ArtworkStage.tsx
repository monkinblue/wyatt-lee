import React, { useMemo, useState } from 'react';
import type { Artwork, FrameMaterial, FramingMode, InSituRoom } from '../types/gallery';

interface ArtworkStageProps {
  artwork: Artwork;
  framingMode: FramingMode;
  frameMaterial?: FrameMaterial;
  inSituRoom?: InSituRoom;
  priority?: 'high' | 'normal' | 'lazy';
  enableLoupe?: boolean;
  transitionName?: string;
  useFullRes?: boolean;
  cursorHint?: string;
  onClick?: () => void;
}

function parseDimensionsCm(dimensionsCm: string): { heightCm: number; widthCm: number } {
  const nums = dimensionsCm.match(/[\d.]+/g)?.map(Number) ?? [140, 120];
  return {
    heightCm: nums[0] || 140,
    widthCm: nums[1] || 120,
  };
}

const ROOM_META: Record<InSituRoom, { label: string; ceiling: string; lux: string }> = {
  zurich: {
    label: 'Kunsthalle Wing IV · Cast Concrete',
    ceiling: '4.2m Clear Height',
    lux: '180 lx / 4800K Museum Track',
  },
  tribeca: {
    label: 'Collector Residence · Troweled Limewash',
    ceiling: '3.8m Clerestory Loft',
    lux: '240 lx / North Daylight',
  },
  geneva: {
    label: 'Custodial Viewing Vault · Basalt Acoustic',
    ceiling: '3.6m Private Salon',
    lux: '140 lx / Framing Projector',
  },
};

export const ArtworkStage: React.FC<ArtworkStageProps> = ({
  artwork,
  framingMode,
  frameMaterial,
  inSituRoom = 'zurich',
  priority = 'lazy',
  enableLoupe = false,
  transitionName,
  useFullRes = false,
  cursorHint,
  onClick,
}) => {
  const effectiveFrameMaterial = frameMaterial ?? artwork.frameTone;
  const [spot, setSpot] = useState<{ x: number; y: number; active: boolean }>({
    x: 50,
    y: 32,
    active: false,
  });

  const physicalScale = useMemo(() => {
    const { heightCm, widthCm } = parseDimensionsCm(artwork.dimensionsCm);
    // Calibrate against a 340 cm architectural wall height so 213cm monoliths tower
    // and 76cm intimate works hang with authentic chamber proportions.
    const heightPct = Math.min(62, Math.max(25, (heightCm / 340) * 100));
    const widthPct = Math.min(72, Math.max(22, (widthCm / 420) * 100));
    return { heightCm, widthCm, heightPct, widthPct };
  }, [artwork.dimensionsCm]);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    setSpot({ x, y, active: true });
  };

  const handlePointerLeave = () => {
    setSpot((prev) => ({ ...prev, active: false }));
  };

  const imgSrc = useFullRes ? artwork.images.full : artwork.images.card;
  const imgSrcSet = `${artwork.images.card} ${artwork.images.cardWidth}w, ${artwork.images.full} ${artwork.images.width}w`;
  const altText = `${artwork.title} (${artwork.year}), ${artwork.medium}, by ${artwork.artist}`;

  const loadingAttr = priority === 'lazy' ? 'lazy' : undefined;
  const fetchPriorityAttr = priority === 'high' ? 'high' : undefined;

  const paintingElement = (
    <div
      className={`wl-canvas-wrap mode-${framingMode} material-${effectiveFrameMaterial} ${
        artwork.isDiptych ? 'is-diptych' : ''
      }`}
      style={
        {
          '--spot-x': `${spot.x}%`,
          '--spot-y': `${spot.y}%`,
          viewTransitionName: transitionName || undefined,
        } as React.CSSProperties
      }
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <div className="wl-canvas-rabbet">
        <img
          src={imgSrc}
          srcSet={imgSrcSet}
          sizes={
            useFullRes
              ? '(max-width: 900px) 92vw, 56vw'
              : '(max-width: 640px) 92vw, (max-width: 1100px) 46vw, 31vw'
          }
          alt={altText}
          width={artwork.images.width}
          height={artwork.images.height}
          loading={loadingAttr}
          {...(fetchPriorityAttr ? { fetchPriority: fetchPriorityAttr } : {})}
          className="wl-artwork-img"
          decoding="async"
        />
        <div className="wl-raking-sheen" aria-hidden="true" />
        {framingMode === 'float' && <div className="wl-museum-glazing" aria-hidden="true" />}

        {enableLoupe && spot.active && (
          <div
            className="wl-loupe-lens"
            style={{
              left: `${spot.x}%`,
              top: `${spot.y}%`,
              backgroundImage: `url(${artwork.images.full})`,
              backgroundPosition: `${spot.x}% ${spot.y}%`,
            }}
            aria-hidden="true"
          >
            <span className="wl-loupe-tag">2.6× RAKING LOUPE</span>
          </div>
        )}
      </div>
    </div>
  );

  if (framingMode === 'insitu') {
    const roomInfo = ROOM_META[inSituRoom];
    return (
      <div
        className={`wl-insitu-room room-${inSituRoom} ${onClick ? 'is-clickable' : ''}`}
        data-cursor={cursorHint}
        onClick={onClick}
      >
        {/* Architectural Track Spotlight Cone */}
        <div className="wl-insitu-spotlight" aria-hidden="true" />
        {/* Clerestory Raking Window Shadow for Penthouse */}
        <div className="wl-insitu-window-cast" aria-hidden="true" />

        {/* Subtle 175cm Human Eye-Level Datum Tick */}
        <div className="wl-insitu-scale-ruler" aria-hidden="true">
          <span>3.6m</span>
          <span>1.75m</span>
          <span>0.0m</span>
        </div>

        {/* Hung Artwork Scaled Proportionally to Real Centimeter Dimensions */}
        <div
          className="wl-insitu-hang-zone"
          style={
            {
              '--hang-max-h': `${physicalScale.heightPct}%`,
              '--hang-max-w': `${physicalScale.widthPct}%`,
            } as React.CSSProperties
          }
        >
          <div className="wl-insitu-framed-piece">{paintingElement}</div>
        </div>

        {/* Architectural Floor & Travertine Museum Plinth / Bench */}
        <div className="wl-insitu-floor" aria-hidden="true">
          <div className="wl-insitu-bench">
            <div className="wl-insitu-bench-top" />
            <div className="wl-insitu-bench-legs">
              <span />
              <span />
            </div>
          </div>
        </div>

        <div className="wl-insitu-caption-bar" aria-hidden="true">
          <span>{roomInfo.label}</span>
          <span>
            {artwork.dimensionsCm} · {roomInfo.lux}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`wl-studio-plinth mode-${framingMode} ${onClick ? 'is-clickable' : ''}`}
      data-cursor={cursorHint}
      onClick={onClick}
    >
      <div className="wl-gallery-track-glow" aria-hidden="true" />
      {paintingElement}
    </div>
  );
};
