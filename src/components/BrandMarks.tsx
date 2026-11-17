import React, { useEffect, useRef, useState } from 'react';

export const AtelierWordmark: React.FC<{ compact?: boolean }> = ({ compact = false }) => (
  <span className="wl-wordmark" aria-label="Atelier W.L.">
    <svg
      className="wl-wordmark-monogram"
      viewBox="0 0 40 40"
      width={compact ? 26 : 32}
      height={compact ? 26 : 32}
      aria-hidden="true"
    >
      <rect
        x="1.5"
        y="1.5"
        width="37"
        height="37"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <path
        d="M7.5 12.5 L11.2 27.5 L15.2 15 L19.2 27.5 L22.9 12.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
      <circle cx="25.2" cy="26.8" r="1.15" fill="var(--accent-gilt)" />
      <path
        d="M28.2 12.5 L28.2 27.5 L34.2 27.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
    </svg>
    <span className="wl-wordmark-text">
      <span className="wl-wordmark-primary">ATELIER W.L.</span>
      {!compact && <span className="wl-wordmark-sub">MONOGRAPH &amp; PRIVATE SALON · B. 2022</span>}
    </span>
  </span>
);

export const EmbossedStudioSeal: React.FC<{ size?: number; className?: string }> = ({
  size = 116,
  className = '',
}) => (
  <svg
    className={`wl-studio-seal ${className}`}
    viewBox="0 0 140 140"
    width={size}
    height={size}
    aria-hidden="true"
  >
    <defs>
      <path
        id="wl-seal-ring-path"
        d="M 70, 70 m -52, 0 a 52,52 0 1,1 104,0 a 52,52 0 1,1 -104,0"
      />
    </defs>
    <circle
      cx="70"
      cy="70"
      r="66"
      fill="none"
      stroke="currentColor"
      strokeWidth="0.75"
      strokeDasharray="2 3"
      opacity="0.55"
    />
    <circle cx="70" cy="70" r="61" fill="none" stroke="currentColor" strokeWidth="1" />
    <g className="wl-seal-orbit">
      <text
        fill="currentColor"
        fontSize="7.4"
        fontFamily="var(--font-mono)"
        letterSpacing="2.55"
      >
        <textPath href="#wl-seal-ring-path" startOffset="0%">
          ATELIER W.L. · EDITION UNIQUE · CUSTODIAL ARCHIVE · MMXXII ·
        </textPath>
      </text>
    </g>
    <rect
      x="46"
      y="46"
      width="48"
      height="48"
      fill="none"
      stroke="var(--accent-gilt)"
      strokeWidth="1.2"
    />
    <rect
      x="50"
      y="50"
      width="40"
      height="40"
      fill="none"
      stroke="currentColor"
      strokeWidth="0.6"
      opacity="0.5"
    />
    <path
      d="M54 62 L58 78 L62.5 65 L67 78 L71 62"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    />
    <circle cx="73.8" cy="77.2" r="1.2" fill="var(--accent-gilt)" />
    <path
      d="M77.5 62 L77.5 78 L85.5 78"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    />
  </svg>
);

export const RegistrarStamp: React.FC<{ label?: string }> = ({
  label = 'AUTHENTICATED · EDITION 1 OF 1',
}) => (
  <div className="wl-registrar-stamp" aria-hidden="true">
    <span className="wl-registrar-stamp-dot" />
    <span>{label}</span>
    <span className="wl-registrar-stamp-code">REG. W.L.-ARCHIVE</span>
  </div>
);

export const AutographicStudioMark: React.FC = () => (
  <svg
    className="wl-autographic-mark"
    viewBox="0 0 220 68"
    width="184"
    height="56"
    role="img"
    aria-label="Autographic studio mark of W.L."
  >
    <path
      d="M14 48 C 26 11, 44 60, 59 22 C 71 -2, 86 58, 104 28 C 118 8, 125 49, 146 39 C 168 29, 182 14, 206 34"
      fill="none"
      stroke="#1A3A5C"
      strokeWidth="2.6"
      strokeLinecap="round"
    />
    <circle cx="152" cy="46" r="2.2" fill="#A88442" />
    <path
      d="M168 18 L166 49 L196 47"
      fill="none"
      stroke="#1A3A5C"
      strokeWidth="2.1"
      strokeLinecap="round"
    />
  </svg>
);

export const GooglePayMark: React.FC<{ lightText?: boolean }> = ({ lightText = true }) => (
  <span className="wl-gpay-mark" aria-hidden="true">
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v2.98h3.86c2.26-2.09 3.56-5.17 3.56-8.8z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-2.98c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.31c-.24-.72-.38-1.49-.38-2.31s.14-1.59.38-2.31V6.6H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.4l3.98-3.09z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.6l3.98 3.09c.95-2.85 3.6-4.94 6.73-4.94z"
      />
    </svg>
    <span
      className="wl-gpay-word"
      style={{ color: lightText ? '#FFFFFF' : '#1F1F1F' }}
    >
      Pay
    </span>
  </span>
);

/**
 * Custom architectural reticle cursor active strictly on fine pointers (desktop)
 * and disabled under prefers-reduced-motion.
 */
export const GalleryLoupeCursor: React.FC = () => {
  const cursorRef = useRef<HTMLDivElement | null>(null);
  const [label, setLabel] = useState<string>('');
  const [enabled, setEnabled] = useState<boolean>(false);
  const [visible, setVisible] = useState<boolean>(false);

  useEffect(() => {
    const finePointer = window.matchMedia('(pointer: fine)');
    const noMotionPref = window.matchMedia('(prefers-reduced-motion: no-preference)');

    const syncCapability = () => {
      const ok = finePointer.matches && noMotionPref.matches;
      setEnabled(ok);
      if (!ok) setVisible(false);
    };
    syncCapability();

    finePointer.addEventListener('change', syncCapability);
    noMotionPref.addEventListener('change', syncCapability);

    return () => {
      finePointer.removeEventListener('change', syncCapability);
      noMotionPref.removeEventListener('change', syncCapability);
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const onMove = (e: PointerEvent) => {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      const node = cursorRef.current;
      if (!node) return;
      node.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
      setVisible(true);

      const target = e.target as HTMLElement | null;
      const tagged = target?.closest<HTMLElement>('[data-cursor]');
      const nextLabel = tagged?.dataset.cursor ?? '';
      setLabel((prev) => (prev === nextLabel ? prev : nextLabel));
    };

    const onLeave = () => setVisible(false);

    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('mouseleave', onLeave);
    return () => {
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('mouseleave', onLeave);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div
      ref={cursorRef}
      className={`wl-custom-cursor ${visible ? 'is-visible' : ''} ${label ? 'is-expanded' : ''}`}
      aria-hidden="true"
    >
      <span className="wl-custom-cursor-ring" />
      {label && <span className="wl-custom-cursor-label">{label}</span>}
    </div>
  );
};
