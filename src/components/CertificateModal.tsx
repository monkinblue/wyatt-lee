import React, { useEffect, useRef } from 'react';
import type { CompletedAcquisition } from '../types/gallery';
import { downloadCertificatePng, formatExactAmount } from '../utils/currency';
import { closeDialogAnimated, handleDialogBackdropClick } from '../utils/webPlatform';
import {
  AutographicStudioMark,
  EmbossedStudioSeal,
  RegistrarStamp,
} from './BrandMarks';

interface CertificateModalProps {
  acquisition: CompletedAcquisition | null;
  onClose: () => void;
}

export const CertificateModal: React.FC<CertificateModalProps> = ({
  acquisition,
  onClose,
}) => {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const paperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (acquisition && !dialog.open) {
      dialog.showModal();
    } else if (!acquisition && dialog.open) {
      void closeDialogAnimated(dialog);
    }
  }, [acquisition]);

  const requestClose = () => {
    onClose();
  };

  if (!acquisition) return null;

  return (
    <dialog
      ref={dialogRef}
      className="wl-cert-dialog"
      aria-labelledby="certificate-main-title"
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
        onClose();
      }}
      onClick={(e) => handleDialogBackdropClick(e, dialogRef.current, requestClose, paperRef.current)}
    >
      <div ref={paperRef} className="wl-certificate-sheet">
        <div className="wl-cert-toolbar no-print">
          <span className="wl-mono">
            REGISTRAR ACCESSION · {acquisition.accessionId}
          </span>
          <div className="wl-cert-toolbar-actions">
            <button
              type="button"
              className="wl-btn-secondary"
              onClick={() => downloadCertificatePng(acquisition)}
            >
              Download Archival PNG
            </button>
            <button
              type="button"
              className="wl-btn-primary"
              onClick={() => window.print()}
            >
              Print / Save PDF Certificate
            </button>
            <button
              type="button"
              className="wl-dialog-close-btn"
              onClick={requestClose}
              aria-label="Close Certificate of Acquisition"
              autoFocus
            >
              ✕
            </button>
          </div>
        </div>

        {/* Printable Archival Cotton Certificate Document */}
        <div className="wl-certificate-document">
          <div className="wl-cert-inner-frame">
            <div className="wl-cert-header">
              <p className="wl-cert-kicker">
                ATELIER W.L. · OFFICE OF THE CHIEF REGISTRAR · GENEVA / NEW YORK / NORTHERN VIRGINIA
              </p>
              <h1 id="certificate-main-title" className="wl-cert-title">
                Official Certificate of Acquisition &amp; Provenance
              </h1>
              <div className="wl-cert-edition-bar">
                <RegistrarStamp label="EDITION 1 OF 1 · UNIQUE STUDIO ORIGINAL" />
                <span className="wl-mono">ACCESSION NO. {acquisition.accessionId}</span>
              </div>
            </div>

            {/* Acquired Works Plate Strip */}
            <div className="wl-cert-works-grid">
              {acquisition.items.map(({ artwork, framingMode }) => (
                <div key={artwork.id} className="wl-cert-work-row">
                  <img
                    src={artwork.images.card}
                    alt={artwork.shortTitle}
                    width={artwork.images.cardWidth}
                    height={artwork.images.cardHeight}
                    className="wl-cert-plate-img"
                  />
                  <div className="wl-cert-work-meta">
                    <span className="wl-lot-num">
                      {artwork.lotNumber} · {artwork.catalogueNo}
                    </span>
                    <h2>
                      <cite>{artwork.title}</cite> ({artwork.year})
                    </h2>
                    <p>{artwork.medium}</p>
                    <p className="wl-mono">
                      {artwork.dimensionsCm} ({artwork.dimensionsIn}) · Presentation:{' '}
                      {framingMode === 'raw' ? 'Raw Studio State' : 'Museum Shadowbox Float Frame'}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Deadpan Six/Seven-Figure Patronage Grant Waiver Notice */}
            <div className="wl-cert-waiver-decree">
              <div className="wl-waiver-decree-header">
                <span className="wl-eyebrow">
                  TREASURY &amp; ESCROW RESOLUTION · WIRE WAIVER DECREE
                </span>
                <span className="wl-waiver-badge">
                  NET WIRE DUE: {formatExactAmount(0, acquisition.currency)}
                </span>
              </div>
              <p>
                Be it hereby recorded in the permanent Catalogue Raisonné of{' '}
                <strong>W.L. (b. 2022)</strong> that the scheduled institutional wire settlement of{' '}
                <strong>
                  {formatExactAmount(acquisition.totalWaivedUsd, acquisition.currency)}
                </strong>{' '}
                (inclusive of nitrogen-buffered fine-art air crating, archival UV glazing, and{' '}
                {formatExactAmount(0, acquisition.currency)} juice-box handling surcharge) has been{' '}
                <em>
                  graciously waived in full under a WL Studio Patronage Grant, as the Artist is
                  currently unavailable to countersign escrow release instruments during scheduled
                  afternoon rest.
                </em>
              </p>
            </div>

            {/* Custodial & Signatures Footer */}
            <dl className="wl-cert-ledger-summary">
              <div>
                <dt>DESIGNATED CUSTODIAN</dt>
                <dd>{acquisition.destinationCollection}</dd>
              </div>
              <div>
                <dt>PATRONAGE FACILITY</dt>
                <dd>{acquisition.paymentInstrument}</dd>
              </div>
              <div>
                <dt>DATE OF INSCRIPTION</dt>
                <dd>{acquisition.issuedDateFormatted}</dd>
              </div>
            </dl>

            <div className="wl-cert-signatures">
              <div className="wl-cert-sig-col">
                <AutographicStudioMark />
                <span className="wl-sig-caption">
                  W.L. (b. 2022) · Autographic Studio Mark in Facsimile
                </span>
              </div>

              <div className="wl-cert-seal-center">
                <EmbossedStudioSeal size={96} />
              </div>

              <div className="wl-cert-sig-col is-right">
                <p className="wl-registrar-script">M. V. Lindqvist</p>
                <span className="wl-sig-caption">
                  Chief Registrar &amp; Keeper of Afternoon Quiet, Atelier W.L.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </dialog>
  );
};
