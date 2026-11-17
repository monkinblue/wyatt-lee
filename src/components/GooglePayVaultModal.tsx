import React, { useEffect, useRef, useState } from 'react';
import type { CurrencyCode, FolioItem } from '../types/gallery';
import { formatExactAmount } from '../utils/currency';
import { closeDialogAnimated, handleDialogBackdropClick } from '../utils/webPlatform';
import { GooglePayMark } from './BrandMarks';

interface GooglePayVaultModalProps {
  isOpen: boolean;
  items: FolioItem[];
  totalUsd: number;
  currency: CurrencyCode;
  entrySource: 'gpay' | 'desk';
  onClose: () => void;
  onConfirmComplete: (details: {
    paymentInstrument: string;
    destinationCollection: string;
  }) => void;
}

const INSTRUMENTS = [
  {
    id: 'black-reserve',
    name: 'Black Patronage Reserve •••• 0004',
    sub: 'Unlimited Institutional Facility · Pre-Authorized',
  },
  {
    id: 'kunsthalle-endowment',
    name: 'Kunsthalle Acquisition Endowment •••• 2022',
    sub: 'Tax-Exempt Museum Trust · Fiduciary Clearance',
  },
];

const DESTINATIONS = [
  {
    id: 'perm-collection',
    name: 'Permanent Collection — Climate-Controlled Vault',
    sub: 'White-Glove Fine Art Air Freight · Priority Release',
  },
  {
    id: 'freeport-zurich',
    name: 'Zurich Zollfreilager (Bonded Art Freeport)',
    sub: 'Sector IV Museum Custodial Storage · 52% RH',
  },
];

export const GooglePayVaultModal: React.FC<GooglePayVaultModalProps> = ({
  isOpen,
  items,
  totalUsd,
  currency,
  entrySource,
  onClose,
  onConfirmComplete,
}) => {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);

  const [instrumentIdx, setInstrumentIdx] = useState<number>(0);
  const [destinationIdx, setDestinationIdx] = useState<number>(0);
  const [phase, setPhase] = useState<'ready' | 'verifying' | 'approved'>('ready');

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      setPhase('ready');
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      void closeDialogAnimated(dialog);
    }
  }, [isOpen]);

  const handleConfirm = () => {
    if (phase !== 'ready') return;
    setPhase('verifying');

    setTimeout(() => {
      setPhase('approved');
    }, 680);

    setTimeout(() => {
      onConfirmComplete({
        paymentInstrument: INSTRUMENTS[instrumentIdx].name,
        destinationCollection: DESTINATIONS[destinationIdx].name,
      });
    }, 1450);
  };

  const requestClose = () => {
    if (phase !== 'ready') return;
    onClose();
  };

  const primaryWork = items[0]?.artwork;

  return (
    <dialog
      ref={dialogRef}
      className="wl-vault-dialog"
      aria-labelledby="vault-sheet-title"
      {...({ closedby: 'any' } as React.DialogHTMLAttributes<HTMLDialogElement>)}
      onCancel={(e) => {
        if (phase !== 'ready') {
          e.preventDefault();
          return;
        }
        if (e.cancelable) {
          e.preventDefault();
          requestClose();
        }
      }}
      onClose={() => {
        if (dialogRef.current) {
          dialogRef.current.returnValue = '';
        }
        if (isOpen && phase === 'ready') onClose();
      }}
      onClick={(e) => handleDialogBackdropClick(e, dialogRef.current, requestClose, cardRef.current)}
    >
      <div ref={cardRef} className="wl-vault-card">
        {/* Top Authentic G Pay / WL Studio Private Vault Bar */}
        <div className="wl-vault-topbar">
          <div className="wl-vault-brand-lock">
            <GooglePayMark lightText={false} />
            <span className="wl-vault-divider" aria-hidden="true" />
            <span className="wl-vault-tag">
              {entrySource === 'gpay' ? 'WL STUDIO PRIVATE VAULT' : 'PRIVATE CLIENT DESK'}
            </span>
          </div>

          <button
            type="button"
            className="wl-dialog-close-btn"
            onClick={requestClose}
            disabled={phase !== 'ready'}
            aria-label="Cancel acquisition sheet"
          >
            ✕
          </button>
        </div>

        <h2 id="vault-sheet-title" className="wl-sr-only">
          Confirm Private Collection Acquisition via WL Studio Vault
        </h2>

        {phase === 'ready' ? (
          <div className="wl-vault-body">
            {/* Merchant & Artwork Summary */}
            <div className="wl-vault-merchant-summary">
              {primaryWork && (
                <img
                  src={primaryWork.images.card}
                  alt=""
                  width={primaryWork.images.cardWidth}
                  height={primaryWork.images.cardHeight}
                  className="wl-vault-mini-art"
                />
              )}
              <div>
                <p className="wl-vault-merchant-name">ATELIER W.L. · CUSTODIAL TRUST</p>
                <p className="wl-vault-lot-desc">
                  {primaryWork ? (
                    <>
                      {primaryWork.lotNumber}: <cite>{primaryWork.shortTitle}</cite>
                      {items.length > 1 ? ` + ${items.length - 1} additional work(s)` : ''}
                    </>
                  ) : (
                    'Edition 1 of 1 Allocation'
                  )}
                </p>
              </div>
            </div>

            {/* Zero-Input Pre-Selected Parody Instrument Selector */}
            <div className="wl-vault-rows">
              <button
                type="button"
                className="wl-vault-selector-row"
                onClick={() => setInstrumentIdx((i) => (i + 1) % INSTRUMENTS.length)}
                aria-label="Switch pre-authorized patronage facility"
              >
                <span className="wl-vault-card-chip" aria-hidden="true">
                  WL
                </span>
                <div className="wl-vault-row-text">
                  <span className="wl-vault-row-kicker">PATRONAGE INSTRUMENT</span>
                  <strong>{INSTRUMENTS[instrumentIdx].name}</strong>
                  <small>{INSTRUMENTS[instrumentIdx].sub}</small>
                </div>
                <span className="wl-vault-cycle-arrow" aria-hidden="true">
                  ⇄
                </span>
              </button>

              <button
                type="button"
                className="wl-vault-selector-row"
                onClick={() => setDestinationIdx((i) => (i + 1) % DESTINATIONS.length)}
                aria-label="Switch permanent collection receiving destination"
              >
                <span className="wl-vault-icon-box" aria-hidden="true">
                  🏛
                </span>
                <div className="wl-vault-row-text">
                  <span className="wl-vault-row-kicker">DISPATCH &amp; CUSTODY</span>
                  <strong>{DESTINATIONS[destinationIdx].name}</strong>
                  <small>{DESTINATIONS[destinationIdx].sub}</small>
                </div>
                <span className="wl-vault-cycle-arrow" aria-hidden="true">
                  ⇄
                </span>
              </button>
            </div>

            {/* Settlement Total & Grant Notice */}
            <div className="wl-vault-total-box">
              <div className="wl-vault-total-line">
                <span>Authorized Allocation Value</span>
                <strong className="wl-mono">{formatExactAmount(totalUsd, currency)}</strong>
              </div>
              <p className="wl-vault-grant-note">
                Zero personal or card details required. Instant one-click institutional confirmation
                via Atelier W.L. Patronage Protocol.
              </p>
            </div>

            <button
              type="button"
              className="wl-vault-confirm-btn"
              onClick={handleConfirm}
              autoFocus
            >
              <span>Confirm Acquisition</span>
              <span className="wl-vault-confirm-sub">1-CLICK PASSKEY SEAL</span>
            </button>
          </div>
        ) : (
          <div className="wl-vault-biometric-stage" role="status" aria-live="polite">
            <div className={`wl-biometric-ring is-${phase}`}>
              <svg viewBox="0 0 88 88" width="88" height="88" aria-hidden="true">
                <circle
                  className="wl-bio-track"
                  cx="44"
                  cy="44"
                  r="38"
                  fill="none"
                  strokeWidth="2.5"
                />
                <circle
                  className="wl-bio-progress"
                  cx="44"
                  cy="44"
                  r="38"
                  fill="none"
                  strokeWidth="2.8"
                />
                {phase === 'approved' && (
                  <path
                    className="wl-bio-check"
                    d="M27 45.5 L39 57 L62 32"
                    fill="none"
                    strokeWidth="3.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
              </svg>
            </div>

            <p className="wl-bio-status-title">
              {phase === 'verifying'
                ? 'Authenticating Patronage Vault Seal…'
                : 'Acquisition Confirmed · Issuing Provenance Dossier'}
            </p>
            <p className="wl-bio-status-sub">
              {INSTRUMENTS[instrumentIdx].name} · {DESTINATIONS[destinationIdx].name}
            </p>
          </div>
        )}
      </div>
    </dialog>
  );
};
