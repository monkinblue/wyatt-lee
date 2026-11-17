export type FramingMode = 'raw' | 'float' | 'insitu';

export type FrameMaterial = 'walnut' | 'aluminum' | 'obsidian';

export type InSituRoom = 'zurich' | 'tribeca' | 'geneva';

export type CurrencyCode = 'USD' | 'EUR' | 'CHF' | 'GBP';

export type SalonTheme = 'daylight' | 'evening';

export interface ArtworkImages {
  full: string;
  card: string;
  macro: string;
  width: number;
  height: number;
  cardWidth: number;
  cardHeight: number;
  aspectRatio: number;
}

export interface Artwork {
  id: string;
  index: number;
  lotNumber: string;
  catalogueNo: string;
  title: string;
  shortTitle: string;
  artist: string;
  atelier: string;
  year: string;
  series: string;
  dimensionsCm: string;
  dimensionsIn: string;
  scaleCategory: 'monumental' | 'large' | 'medium' | 'intimate';
  frameTone: FrameMaterial;
  isDiptych: boolean;
  inquiryOnly: boolean;
  priceUsd: number;
  estimateRange: string;
  medium: string;
  condition: string;
  provenance: string[];
  exhibited: string[];
  essay: string;
  macroCaption: string;
  images: ArtworkImages;
  palette: string[];
}

export interface FolioItem {
  artwork: Artwork;
  framingMode: FramingMode;
  frameMaterial: FrameMaterial;
}

export interface CompletedAcquisition {
  accessionId: string;
  issuedAtIso: string;
  issuedDateFormatted: string;
  items: FolioItem[];
  artworkSubtotalUsd: number;
  airCrateUsd: number;
  uvGlazingUsd: number;
  juiceHandlingUsd: number;
  courierEscortUsd: number;
  totalWaivedUsd: number;
  currency: CurrencyCode;
  paymentInstrument: string;
  destinationCollection: string;
}
