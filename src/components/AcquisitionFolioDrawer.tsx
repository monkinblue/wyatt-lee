import React, { useEffect, useRef } from 'react';
import type { CurrencyCode, FolioItem, FramingMode } from '../types/gallery';
import { formatExactAmount, formatValuation } from '../utils/currency';
import { closeDialogAnimated, handleDialogBackdropClick } from '../utils/webPlatform';
import { GooglePayMark } from './BrandMarks';

interface AcquisitionFolioDrawerProps {
  isOpen: boolean;
  items: FolioItem[];
  currency: CurrencyCode;
  includeCourierEscort: boolean;
  onToggleCourierEscort: () => void;
  onUpdateItemFraming: (id: string, mode: FramingMode) => void;
  onRemoveItem: (id: string) => void;
  onClose: () => void;
  onProceedToVault: (source: 'gpay' | 'desk') => void;
  onBrowseCatalogue: () => void;
}

export const AIR_CRATE_FEE_USD = 6400;
export const UV_GLAZING_FEE_USD = 1850;
export const JUICE_BOX_SURCHARGE_USD = 0;
export const COURIER_ESCORT_FEE_USD = 4200;

export const AcquisitionFolioDrawer: React.FC<AcquisitionFolioDrawerProps> = ({
  isOpen,
  items,
  currency,
  includeCourierEscort,
  onToggleCourierEscort,
  onUpdateItemFraming,
  onRemoveItem,
  onClose,
  onProceedToVault,
  onBrowseCatalogue,
}) => {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      void closeDialogAnimated(dialog);
    }
  }, [isOpen]);

  const requestClose = () => {
    onClose();
  };

  const subtotalUsd = items.reduce((acc, item) => acc + item.artwork.priceUsd, 0);
  const logisticsUsd =
    items.length > 0
      ? AIR_CRATE_FEE_USD +
        UV_GLAZING_FEE_USD +
        JUICE_BOX_SURCHARGE_USD +
        (includeCourierEscort ? COURIER_ESCORT_FEE_USD : 0)
      : 0;
  const grandTotalUsd = subtotalUsd + logisticsUsd;

  return (
    <dialog
      ref={dialogRef}
      className="wl-folio-dialog"
      aria-labelledby="folio-drawer-title"
      {...({ closedby: 'any' } as React.DialogHTMLAttributes<HTMLDialogElement>)}
      onCancel={(e) => {
        if (e.cancelable) {
          e.preventDefault();
          requestClose();
        }
      }}
      onClose={() => {
        if (dialogRef.current) {
          dialogRef.current.returnValue = '';
        }
        if (isOpen) onClose();
      }}
      onClick={(e) => handleDialogBackdropClick(e, dialogRef.current, requestClose, sheetRef.current)}
    >
      <div ref={sheetRef} className="wl-folio-sheet">
        <div className="wl-folio-header">
          <div>
            <p className="wl-eyebrow">PRIVATE CLIENT REGISTRAR</p>
            <h2 id="folio-drawer-title" className="wl-folio-title">
              Collector&rsquo;s Acquisition Folio
            </h2>
          </div>
          <button
            type="button"
            className="wl-dialog-close-btn"
            onClick={requestClose}
            aria-label="Close Acquisition Folio"
            autoFocus
          >
            ✕
          </button>
        </div>

        {items.length === 0 ? (
          <div className="wl-folio-empty">
            <p className="wl-folio-empty-title">Your Acquisition Folio is Currently Unassigned.</p>
            <p className="wl-folio-empty-copy">
              Select any unique work (Edition 1 of 1) from the Catalogue Raisonné to prepare
              crating specifications and Private Vault provenance documentation.
            </p>
            <button
              type="button"
              className="wl-btn-primary"
              onClick={() => {
                requestClose();
                onBrowseCatalogue();
              }}
            >
              Explore All 13 Catalogue Lots
            </button>
          </div>
        ) : (
          <>
            <div className="wl-folio-items-scroll">
              <ul className="wl-folio-item-list">
                {items.map(({ artwork, framingMode }) => (
                  <li key={artwork.id} className="wl-folio-item">
                    <img
                      src={artwork.images.card}
                      alt={artwork.shortTitle}
                      width={artwork.images.cardWidth}
                      height={artwork.images.cardHeight}
                      className="wl-folio-thumb"
                    />
                    <div className="wl-folio-item-body">
                      <div className="wl-folio-item-top">
                        <span className="wl-lot-num">
                          {artwork.lotNumber} · {artwork.catalogueNo}
                        </span>
                        <button
                          type="button"
                          className="wl-folio-remove-btn"
                          onClick={() => onRemoveItem(artwork.id)}
                          aria-label={`Remove ${artwork.shortTitle} from Acquisition Folio`}
                        >
                          Remove
                        </button>
                      </div>
                      <h3 className="wl-folio-item-title">
                        <cite>{artwork.shortTitle}</cite>, {artwork.year}
                      </h3>
                      <p className="wl-folio-item-dims">{artwork.dimensionsCm} · Edition 1 of 1</p>

                      <div className="wl-folio-item-bottom">
                        <div
                          className="wl-folio-frame-switch"
                          role="group"
                          aria-label={`Framing specification for ${artwork.shortTitle}`}
                        >
                          <button
                            type="button"
                            className={`wl-mini-mode-btn ${framingMode === 'raw' ? 'is-active' : ''}`}
                            onClick={() => onUpdateItemFraming(artwork.id, 'raw')}
                          >
                            Raw Studio
                          </button>
                          <button
                            type="button"
                            className={`wl-mini-mode-btn ${framingMode !== 'raw' ? 'is-active' : ''}`}
                            onClick={() => onUpdateItemFraming(artwork.id, 'float')}
                          >
                            Float Frame
                          </button>
                        </div>

                        <span className="wl-folio-item-price">
                          {formatValuation(artwork.priceUsd, currency)}
                          {artwork.inquiryOnly && (
                            <small className="wl-private-alloc-tag">Private Allocation</small>
                          )}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              {/* Mandatory Conservation & Fine-Art Logistics Ledger */}
              <div className="wl-folio-addons">
                <p className="wl-eyebrow">MANDATORY CONSERVATION &amp; TRANSIT SPECIFICATIONS</p>

                <dl className="wl-folio-ledger">
                  <div>
                    <dt>Works Subtotal ({items.length} Unique Lot{items.length > 1 ? 's' : ''})</dt>
                    <dd>{formatExactAmount(subtotalUsd, currency)}</dd>
                  </div>
                  <div>
                    <dt>
                      Climate-Controlled Fine Art Air Crate
                      <small>52% RH Nitrogen-Buffered Museum Transit</small>
                    </dt>
                    <dd>{formatExactAmount(AIR_CRATE_FEE_USD, currency)}</dd>
                  </div>
                  <div>
                    <dt>
                      Archival UV Museum Glazing
                      <small>Tru Vue Optium 99% Anti-Reflective Acrylic</small>
                    </dt>
                    <dd>{formatExactAmount(UV_GLAZING_FEE_USD, currency)}</dd>
                  </div>
                  <div>
                    <dt>
                      Juice-Box Handling Surcharge
                      <small>Fugitive Citrus &amp; Tempera Registrar Bond</small>
                    </dt>
                    <dd className="wl-zero-fee">{formatExactAmount(0, currency)}</dd>
                  </div>
                </dl>

                {/* Optional Zero-Input Button Switch for Dedicated Registrar Courier */}
                <button
                  type="button"
                  className={`wl-courier-toggle-btn ${includeCourierEscort ? 'is-selected' : ''}`}
                  aria-pressed={includeCourierEscort}
                  onClick={onToggleCourierEscort}
                >
                  <div>
                    <strong>Accompanied Registrar Air-Courier Escort</strong>
                    <span>Dedicated white-glove tarmac supervision (+{formatValuation(COURIER_ESCORT_FEE_USD, currency)})</span>
                  </div>
                  <span className="wl-switch-pill" aria-hidden="true">
                    {includeCourierEscort ? 'INCLUDED' : 'OPTIONAL'}
                  </span>
                </button>
              </div>
            </div>

            <div className="wl-folio-footer">
              <div className="wl-folio-total-row">
                <div>
                  <span className="wl-val-label">ESTIMATED SETTLEMENT TOTAL</span>
                  <small className="wl-patronage-hint">
                    Eligible for WL Studio Patronage Grant Waiver
                  </small>
                </div>
                <strong className="wl-folio-grand-total">
                  {formatExactAmount(grandTotalUsd, currency)}
                </strong>
              </div>

              <div className="wl-folio-cta-group">
                <button
                  type="button"
                  className="wl-gpay-pill-btn"
                  onClick={() => onProceedToVault('gpay')}
                >
                  <span className="wl-gpay-prefix">Acquire with</span>
                  <GooglePayMark lightText />
                </button>

                <button
                  type="button"
                  className="wl-btn-primary wl-full-width"
                  onClick={() => onProceedToVault('desk')}
                >
                  Acquire via Private Client Desk
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </dialog>
  );
};
