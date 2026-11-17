import React, { useCallback, useEffect, useMemo, useState } from 'react';
import artworksData from './data/artworks.generated.json';
import type {
  Artwork,
  CompletedAcquisition,
  CurrencyCode,
  FolioItem,
  FrameMaterial,
  FramingMode,
  SalonTheme,
} from './types/gallery';
import { generateAccessionNumber } from './utils/currency';
import { runGalleryViewTransition } from './utils/webPlatform';
import {
  AIR_CRATE_FEE_USD,
  AcquisitionFolioDrawer,
  COURIER_ESCORT_FEE_USD,
  JUICE_BOX_SURCHARGE_USD,
  UV_GLAZING_FEE_USD,
} from './components/AcquisitionFolioDrawer';
import { GalleryLoupeCursor } from './components/BrandMarks';
import { CatalogueGrid } from './components/CatalogueGrid';
import { CertificateModal } from './components/CertificateModal';
import { Footer } from './components/Footer';
import { GooglePayVaultModal } from './components/GooglePayVaultModal';
import { Header } from './components/Header';
import { HeroSalon } from './components/HeroSalon';
import { InSituSalonSection } from './components/InSituSalonSection';
import { LotMonographView } from './components/LotMonographView';
import { MonographEssaySection } from './components/MonographEssaySection';

const ARTWORKS = artworksData as Artwork[];

function readLotFromHash(): string | null {
  if (typeof window === 'undefined') return null;
  const match = window.location.hash.match(/^#\/lot\/([a-z0-9-]+)$/i);
  return match ? match[1] : null;
}

export const App: React.FC = () => {
  const [activeLotSlug, setActiveLotSlug] = useState<string | null>(() => readLotFromHash());
  const [lotInitialMode, setLotInitialMode] = useState<FramingMode>('float');
  const [transitionInfo, setTransitionInfo] = useState<{
    slug: string;
    origin: 'hero' | 'grid';
  } | null>(null);

  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const [theme, setTheme] = useState<SalonTheme>('daylight');

  const [folioItems, setFolioItems] = useState<FolioItem[]>([]);
  const [includeCourierEscort, setIncludeCourierEscort] = useState<boolean>(false);
  const [folioOpen, setFolioOpen] = useState<boolean>(false);

  // Express single-lot or full-folio checkout items for Google Pay Vault sheet
  const [vaultState, setVaultState] = useState<{
    open: boolean;
    source: 'gpay' | 'desk';
    overrideItems: FolioItem[] | null;
  }>({
    open: false,
    source: 'gpay',
    overrideItems: null,
  });

  const [certificate, setCertificate] = useState<CompletedAcquisition | null>(null);

  // Sync theme attribute on <html>
  useEffect(() => {
    document.documentElement.setAttribute('data-salon-theme', theme);
  }, [theme]);

  // Sync browser back/forward navigation with View Transitions
  useEffect(() => {
    const onPopState = () => {
      const nextSlug = readLotFromHash();
      runGalleryViewTransition(
        () => {
          setActiveLotSlug(nextSlug);
        },
        {
          focusSelector: nextSlug ? '#lot-detail-heading' : '#salon-main-heading',
          scrollToTop: Boolean(nextSlug),
        }
      );
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const activeWork = useMemo(
    () => (activeLotSlug ? ARTWORKS.find((a) => a.id === activeLotSlug) ?? null : null),
    [activeLotSlug]
  );

  // Update document title dynamically with zero first-name leakage
  useEffect(() => {
    if (activeWork) {
      document.title = `${activeWork.lotNumber}: ${activeWork.shortTitle} (${activeWork.year}) — ATELIER W.L.`;
    } else {
      document.title = 'ATELIER W.L. — Monograph, Viewing Salon & Private Client Acquisitions';
    }
  }, [activeWork]);

  const openLotMonograph = useCallback(
    (work: Artwork, mode: FramingMode = 'float', origin: 'hero' | 'grid' = 'grid') => {
      setTransitionInfo({ slug: work.id, origin });
      window.history.pushState(null, '', `#/lot/${work.id}`);

      runGalleryViewTransition(
        () => {
          setLotInitialMode(mode);
          setActiveLotSlug(work.id);
        },
        {
          focusSelector: '#lot-detail-heading',
          scrollToTop: true,
          onFinished: () => setTransitionInfo(null),
        }
      );
    },
    []
  );

  const navigateToSalon = useCallback(
    (sectionId?: string) => {
      const currentSlug = activeLotSlug;
      if (currentSlug) {
        setTransitionInfo({ slug: currentSlug, origin: 'grid' });
        window.history.pushState(null, '', window.location.pathname);

        runGalleryViewTransition(
          () => {
            setActiveLotSlug(null);
          },
          {
            focusSelector: sectionId ? undefined : '#salon-main-heading',
            scrollToTop: !sectionId,
            onFinished: () => {
              setTransitionInfo(null);
              if (sectionId) {
                document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
              }
            },
          }
        );
      } else if (sectionId) {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
    [activeLotSlug]
  );

  const folioIds = useMemo(() => new Set(folioItems.map((i) => i.artwork.id)), [folioItems]);

  const addOrOpenFolio = useCallback(
    (work: Artwork, framingMode: FramingMode = 'float', material?: FrameMaterial) => {
      setFolioItems((prev) => {
        if (prev.some((i) => i.artwork.id === work.id)) {
          return prev;
        }
        return [
          ...prev,
          {
            artwork: work,
            framingMode: framingMode === 'insitu' ? 'float' : framingMode,
            frameMaterial: material ?? work.frameTone,
          },
        ];
      });
      setFolioOpen(true);
    },
    []
  );

  const updateFolioFraming = useCallback((id: string, mode: FramingMode) => {
    setFolioItems((prev) =>
      prev.map((item) => (item.artwork.id === id ? { ...item, framingMode: mode } : item))
    );
  }, []);

  const removeFromFolio = useCallback((id: string) => {
    setFolioItems((prev) => prev.filter((item) => item.artwork.id !== id));
  }, []);

  const openExpressGooglePay = useCallback(
    (work: Artwork, mode: FramingMode, material: FrameMaterial) => {
      const singleItem: FolioItem = {
        artwork: work,
        framingMode: mode === 'insitu' ? 'float' : mode,
        frameMaterial: material,
      };
      // Ensure it is also added to Folio for seamless record-keeping
      setFolioItems((prev) =>
        prev.some((i) => i.artwork.id === work.id) ? prev : [...prev, singleItem]
      );
      setVaultState({
        open: true,
        source: 'gpay',
        overrideItems: [singleItem],
      });
    },
    []
  );

  const proceedFromFolioToVault = useCallback((source: 'gpay' | 'desk') => {
    setFolioOpen(false);
    setTimeout(() => {
      setVaultState({
        open: true,
        source,
        overrideItems: null,
      });
    }, 120);
  }, []);

  const checkoutItems = vaultState.overrideItems ?? folioItems;
  const checkoutSubtotalUsd = checkoutItems.reduce((sum, i) => sum + i.artwork.priceUsd, 0);
  const checkoutCourierUsd = includeCourierEscort ? COURIER_ESCORT_FEE_USD : 0;
  const checkoutTotalUsd =
    checkoutItems.length > 0
      ? checkoutSubtotalUsd +
        AIR_CRATE_FEE_USD +
        UV_GLAZING_FEE_USD +
        JUICE_BOX_SURCHARGE_USD +
        checkoutCourierUsd
      : 0;

  const handleVaultConfirmed = useCallback(
    (details: { paymentInstrument: string; destinationCollection: string }) => {
      const acquiredItems = vaultState.overrideItems ?? folioItems;
      if (acquiredItems.length === 0) return;

      const sub = acquiredItems.reduce((s, i) => s + i.artwork.priceUsd, 0);
      const courier = includeCourierEscort ? COURIER_ESCORT_FEE_USD : 0;
      const total =
        sub + AIR_CRATE_FEE_USD + UV_GLAZING_FEE_USD + JUICE_BOX_SURCHARGE_USD + courier;

      const now = new Date();
      const formattedDate = new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(now);

      const newCert: CompletedAcquisition = {
        accessionId: generateAccessionNumber(acquiredItems[0].artwork.catalogueNo),
        issuedAtIso: now.toISOString(),
        issuedDateFormatted: formattedDate,
        items: acquiredItems,
        artworkSubtotalUsd: sub,
        airCrateUsd: AIR_CRATE_FEE_USD,
        uvGlazingUsd: UV_GLAZING_FEE_USD,
        juiceHandlingUsd: JUICE_BOX_SURCHARGE_USD,
        courierEscortUsd: courier,
        totalWaivedUsd: total,
        currency,
        paymentInstrument: details.paymentInstrument,
        destinationCollection: details.destinationCollection,
      };

      // Clear acquired items from active folio
      const acquiredSet = new Set(acquiredItems.map((i) => i.artwork.id));
      setFolioItems((prev) => prev.filter((i) => !acquiredSet.has(i.artwork.id)));
      setVaultState({ open: false, source: 'gpay', overrideItems: null });
      setCertificate(newCert);
    },
    [vaultState.overrideItems, folioItems, includeCourierEscort, currency]
  );

  return (
    <div className="wl-app-shell">
      <a href="#main-salon-content" className="wl-skip-link">
        Skip to Gallery Exhibition
      </a>

      <GalleryLoupeCursor />

      <Header
        activeView={activeWork ? 'lot' : 'salon'}
        currency={currency}
        onCurrencyChange={setCurrency}
        theme={theme}
        onThemeToggle={() => setTheme((t) => (t === 'daylight' ? 'evening' : 'daylight'))}
        folioCount={folioItems.length}
        onOpenFolio={() => setFolioOpen(true)}
        onNavigateSalon={navigateToSalon}
      />

      <main id="main-salon-content" className="wl-main">
        {activeWork ? (
          <LotMonographView
            key={activeWork.id}
            artwork={activeWork}
            allArtworks={ARTWORKS}
            initialFramingMode={lotInitialMode}
            currency={currency}
            inFolio={folioIds.has(activeWork.id)}
            transitioningSlug={transitionInfo?.slug ?? null}
            onBackToSalon={() => navigateToSalon('catalogue-raisonne')}
            onSelectWork={(w, mode) => openLotMonograph(w, mode, 'grid')}
            onAddToFolio={(w, mode, mat) => addOrOpenFolio(w, mode, mat)}
            onExpressGooglePay={openExpressGooglePay}
          />
        ) : (
          <>
            <HeroSalon
              flagshipWork={ARTWORKS[0]}
              transitioningSlug={
                transitionInfo?.origin === 'hero' ? transitionInfo.slug : null
              }
              onInspectWork={(w) => openLotMonograph(w, 'float', 'hero')}
              onAcquireWork={(w, mode) => addOrOpenFolio(w, mode)}
              onExploreCatalogue={() => navigateToSalon('catalogue-raisonne')}
            />

            <CatalogueGrid
              artworks={ARTWORKS}
              currency={currency}
              folioIds={folioIds}
              transitioningSlug={
                transitionInfo?.origin === 'grid' ? transitionInfo.slug : null
              }
              onInspectWork={(w, mode) => openLotMonograph(w, mode, 'grid')}
              onAddToFolio={(w, mode) => addOrOpenFolio(w, mode)}
            />

            <InSituSalonSection
              artworks={ARTWORKS}
              currency={currency}
              onInspectWork={(w, mode) => openLotMonograph(w, mode, 'grid')}
              onAddToFolio={(w, mode, mat) => addOrOpenFolio(w, mode, mat)}
            />

            <MonographEssaySection
              artworks={ARTWORKS}
              onInspectWork={(w, mode = 'raw') => openLotMonograph(w, mode, 'grid')}
            />
          </>
        )}
      </main>

      <Footer
        onNavigateSalon={navigateToSalon}
        onOpenFolio={() => setFolioOpen(true)}
      />

      {/* Native <dialog> Overlays: Slide-Over Folio, Simulated Google Pay Vault, Certificate */}
      <AcquisitionFolioDrawer
        isOpen={folioOpen}
        items={folioItems}
        currency={currency}
        includeCourierEscort={includeCourierEscort}
        onToggleCourierEscort={() => setIncludeCourierEscort((v) => !v)}
        onUpdateItemFraming={updateFolioFraming}
        onRemoveItem={removeFromFolio}
        onClose={() => setFolioOpen(false)}
        onProceedToVault={proceedFromFolioToVault}
        onBrowseCatalogue={() => navigateToSalon('catalogue-raisonne')}
      />

      <GooglePayVaultModal
        isOpen={vaultState.open}
        items={checkoutItems}
        totalUsd={checkoutTotalUsd}
        currency={currency}
        entrySource={vaultState.source}
        onClose={() => setVaultState((prev) => ({ ...prev, open: false }))}
        onConfirmComplete={handleVaultConfirmed}
      />

      <CertificateModal
        acquisition={certificate}
        onClose={() => setCertificate(null)}
      />
    </div>
  );
};

export default App;
