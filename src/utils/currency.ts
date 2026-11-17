import type { CompletedAcquisition, CurrencyCode } from '../types/gallery';

const RATES: Record<CurrencyCode, { rate: number; symbol: string; locale: string }> = {
  USD: { rate: 1, symbol: '$', locale: 'en-US' },
  EUR: { rate: 0.92, symbol: '€', locale: 'de-DE' },
  CHF: { rate: 0.88, symbol: 'CHF ', locale: 'de-CH' },
  GBP: { rate: 0.79, symbol: '£', locale: 'en-GB' },
};

export function formatValuation(amountUsd: number, currency: CurrencyCode): string {
  const { rate } = RATES[currency];
  const converted = Math.round((amountUsd * rate) / 100) * 100;
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(converted);
  return currency === 'CHF' ? formatted : `${formatted} ${currency}`;
}

export function formatExactAmount(amountUsd: number, currency: CurrencyCode): string {
  const { rate } = RATES[currency];
  const converted = amountUsd * rate;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(converted);
}

export function generateAccessionNumber(lotCatalogueNo: string): string {
  const now = new Date();
  const yr = now.getUTCFullYear();
  const stamp = String((now.getTime() % 8999) + 1000);
  const cleanCat = lotCatalogueNo.replace(/[^A-Z0-9]/gi, '').slice(0, 8).toUpperCase();
  return `AWL-${yr}-${cleanCat}-${stamp}`;
}

/**
 * Generates and downloads an archival 1600x1120 PNG Official Certificate of Acquisition & Provenance
 * rendered cleanly on an HTML5 <canvas> (100% client-side, zero EXIF metadata).
 */
export function downloadCertificatePng(acquisition: CompletedAcquisition): void {
  const canvas = document.createElement('canvas');
  canvas.width = 1600;
  canvas.height = 1140;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Archival cotton rag ground
  ctx.fillStyle = '#F7F4EC';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Double architectural border
  ctx.strokeStyle = '#181715';
  ctx.lineWidth = 2;
  ctx.strokeRect(44, 44, canvas.width - 88, canvas.height - 88);

  ctx.strokeStyle = '#B49150';
  ctx.lineWidth = 1;
  ctx.strokeRect(56, 56, canvas.width - 112, canvas.height - 112);

  // Corner registration ticks
  const corners = [
    [56, 56],
    [canvas.width - 56, 56],
    [56, canvas.height - 56],
    [canvas.width - 56, canvas.height - 56],
  ];
  ctx.fillStyle = '#181715';
  for (const [cx, cy] of corners) {
    ctx.fillRect(cx - 5, cy - 5, 10, 10);
  }

  // Header lockup
  ctx.fillStyle = '#6E6A63';
  ctx.font = '500 16px "IBM Plex Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(
    'ATELIER W.L.  ·  OFFICE OF THE CHIEF REGISTRAR  ·  CUSTODIAL VAULT',
    canvas.width / 2,
    120
  );

  ctx.fillStyle = '#111110';
  ctx.font = '400 54px "Instrument Serif", Georgia, serif';
  ctx.fillText(
    'OFFICIAL CERTIFICATE OF ACQUISITION & PROVENANCE',
    canvas.width / 2,
    188
  );

  ctx.fillStyle = '#A88442';
  ctx.font = '600 17px "IBM Plex Mono", monospace';
  ctx.fillText(
    `EDITION 1 OF 1 (UNIQUE WORK)   ·   ACCESSION NO. ${acquisition.accessionId}`,
    canvas.width / 2,
    228
  );

  // Divider rule
  ctx.strokeStyle = 'rgba(17, 17, 16, 0.18)';
  ctx.beginPath();
  ctx.moveTo(120, 260);
  ctx.lineTo(canvas.width - 120, 260);
  ctx.stroke();

  // Left & Right metadata columns
  ctx.textAlign = 'left';
  const primary = acquisition.items[0]?.artwork;
  const extraCount = acquisition.items.length - 1;

  const rows: Array<[string, string]> = [
    ['ARTIST', 'W.L. (b. 2022), Represented Worldwide by Atelier W.L.'],
    [
      'ACQUIRED WORK(S)',
      primary
        ? `${primary.lotNumber} — ${primary.title}${extraCount > 0 ? ` (+${extraCount} additional lot${extraCount > 1 ? 's' : ''})` : ''}`
        : 'Permanent Collection Allocation',
    ],
    [
      'CATALOGUE RAISONNÉ',
      acquisition.items.map((i) => i.artwork.catalogueNo).join(' · '),
    ],
    [
      'DIMENSIONS & MEDIUM',
      primary ? `${primary.dimensionsCm} (${primary.dimensionsIn}) — ${primary.medium.slice(0, 72)}…` : '',
    ],
    ['CUSTODIAL DESTINATION', acquisition.destinationCollection],
    ['SETTLEMENT INSTRUMENT', acquisition.paymentInstrument],
    [
      'DECLARED VALUATION',
      `${formatExactAmount(acquisition.totalWaivedUsd, acquisition.currency)} (WAIVED — $0.00 NET SETTLED)`,
    ],
  ];

  let y = 315;
  for (const [label, value] of rows) {
    ctx.fillStyle = '#6E6A63';
    ctx.font = '500 14px "IBM Plex Mono", monospace';
    ctx.fillText(label, 120, y);

    ctx.fillStyle = '#111110';
    ctx.font = '400 22px Georgia, serif';
    ctx.fillText(value, 430, y);

    ctx.strokeStyle = 'rgba(17, 17, 16, 0.08)';
    ctx.beginPath();
    ctx.moveTo(120, y + 18);
    ctx.lineTo(canvas.width - 120, y + 18);
    ctx.stroke();
    y += 58;
  }

  // Patronage Waiver Box
  ctx.fillStyle = '#EFECE3';
  ctx.fillRect(120, 742, canvas.width - 240, 148);
  ctx.strokeStyle = '#B49150';
  ctx.strokeRect(120, 742, canvas.width - 240, 148);

  ctx.fillStyle = '#111110';
  ctx.font = '600 15px "IBM Plex Mono", monospace';
  ctx.fillText('INSTITUTIONAL PATRONAGE GRANT & WIRE WAIVER NOTICE', 152, 778);

  ctx.fillStyle = '#3D3B37';
  ctx.font = 'italic 21px Georgia, serif';
  ctx.fillText(
    `The scheduled wire settlement of ${formatExactAmount(acquisition.totalWaivedUsd, acquisition.currency)} (inclusive of nitrogen-buffered air crating`,
    152,
    814
  );
  ctx.fillText(
    'and archival UV glazing) has been graciously waived in full under a WL Studio Patronage Grant,',
    152,
    842
  );
  ctx.fillText(
    'as the Artist is currently unavailable to countersign escrow release forms during afternoon rest.',
    152,
    870
  );

  // Autographic signature loop & Seal
  ctx.strokeStyle = '#1A3A5C';
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.moveTo(160, 1005);
  ctx.bezierCurveTo(195, 935, 255, 1030, 290, 960);
  ctx.bezierCurveTo(320, 910, 355, 1025, 405, 975);
  ctx.stroke();

  ctx.fillStyle = '#6E6A63';
  ctx.font = '500 13px "IBM Plex Mono", monospace';
  ctx.fillText('W.L. — AUTOGRAPHIC STUDIO MARK (IN FACSIMILE)', 150, 1044);

  ctx.textAlign = 'right';
  ctx.fillText(`ISSUED: ${acquisition.issuedDateFormatted.toUpperCase()}`, canvas.width - 120, 1015);
  ctx.fillText('ATELIER W.L. REGISTRAR SEAL · VERIFIED AUTHENTIC', canvas.width - 120, 1044);

  // Embossed Chop Circle
  ctx.save();
  ctx.translate(canvas.width / 2, 995);
  ctx.strokeStyle = '#A88442';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 46, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeRect(-26, -26, 52, 52);
  ctx.fillStyle = '#A88442';
  ctx.textAlign = 'center';
  ctx.font = '600 18px "IBM Plex Mono", monospace';
  ctx.fillText('W.L.', 0, 6);
  ctx.restore();

  const dataUrl = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = `${acquisition.accessionId}-certificate.png`;
  document.body.appendChild(link);
  link.click();
  link.remove();
}
