import React, { useEffect, useId, useRef } from 'react';
import type { CurrencyCode, SalonTheme } from '../types/gallery';
import { AtelierWordmark } from './BrandMarks';

interface HeaderProps {
  activeView: 'salon' | 'lot';
  currency: CurrencyCode;
  onCurrencyChange: (c: CurrencyCode) => void;
  theme: SalonTheme;
  onThemeToggle: () => void;
  folioCount: number;
  onOpenFolio: () => void;
  onNavigateSalon: (sectionId?: string) => void;
}

const CURRENCIES: Array<{ code: CurrencyCode; label: string }> = [
  { code: 'USD', label: 'USD ($) · New York Evening Sale' },
  { code: 'CHF', label: 'CHF (Fr.) · Zurich / Basel Vault' },
  { code: 'EUR', label: 'EUR (€) · Paris / Milan Salon' },
  { code: 'GBP', label: 'GBP (£) · Mayfair Private Desk' },
];

export const Header: React.FC<HeaderProps> = ({
  activeView,
  currency,
  onCurrencyChange,
  theme,
  onThemeToggle,
  folioCount,
  onOpenFolio,
  onNavigateSalon,
}) => {
  const headerRef = useRef<HTMLElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const rawId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const currencyPopoverId = `wl-currency-popover-${rawId}`;

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      window.CSS?.supports?.('(animation-timeline: scroll()) and (animation-range: 0% 100%)')
    ) {
      return;
    }

    const onScroll = () => {
      const el = headerRef.current;
      if (!el) return;
      el.classList.toggle('is-scrolled-fallback', window.scrollY > 48);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const pop = popoverRef.current;
    const btn = triggerRef.current;
    if (!pop || !btn) return;

    const onToggle = (e: Event) => {
      const te = e as ToggleEvent;
      btn.setAttribute('aria-expanded', te.newState === 'open' ? 'true' : 'false');
    };
    pop.addEventListener('toggle', onToggle);
    return () => pop.removeEventListener('toggle', onToggle);
  }, []);

  const selectCurrency = (code: CurrencyCode) => {
    onCurrencyChange(code);
    const pop = popoverRef.current as (HTMLDivElement & { hidePopover?: () => void }) | null;
    pop?.hidePopover?.();
    triggerRef.current?.focus();
  };

  return (
    <>
      <header ref={headerRef} className="wl-header">
        <div className="wl-scroll-progress" aria-hidden="true" />

        <div className="wl-header-inner">
          <button
            type="button"
            className="wl-brand-btn"
            onClick={() => onNavigateSalon()}
            aria-label="Return to Atelier W.L. Exhibition Salon"
          >
            <AtelierWordmark />
          </button>

          <nav className="wl-primary-nav wl-desktop-only-nav" aria-label="Gallery sections">
            <button
              type="button"
              className={`wl-nav-link ${activeView === 'salon' ? 'is-current' : ''}`}
              onClick={() => onNavigateSalon('catalogue-raisonne')}
            >
              Catalogue Raisonné <span className="wl-nav-index">13</span>
            </button>
            <button
              type="button"
              className="wl-nav-link"
              onClick={() => onNavigateSalon('in-situ-salon')}
            >
              In Situ Salon
            </button>
            <button
              type="button"
              className="wl-nav-link"
              onClick={() => onNavigateSalon('monograph-essay')}
            >
              Monograph
            </button>
          </nav>

          <div className="wl-header-utilities">
            <div className="wl-currency-anchor-wrap">
              <button
                ref={triggerRef}
                type="button"
                className="wl-util-btn wl-currency-trigger"
                aria-expanded="false"
                aria-label={`Valuation currency: ${currency}. Activate to switch currency.`}
                {...({
                  commandfor: currencyPopoverId,
                  command: 'toggle-popover',
                } as React.ButtonHTMLAttributes<HTMLButtonElement>)}
              >
                <span className="wl-util-kicker wl-hide-xs">VALUATION</span>
                <span className="wl-util-val">{currency} ▾</span>
              </button>

              <div
                ref={popoverRef}
                id={currencyPopoverId}
                className="wl-currency-popover"
                role="group"
                aria-label="Select catalogue valuation currency"
                {...({ popover: 'auto' } as React.HTMLAttributes<HTMLDivElement>)}
              >
                <p className="wl-popover-heading">PRIVATE DESK CURRENCY</p>
                <ul className="wl-currency-list">
                  {CURRENCIES.map((item) => (
                    <li key={item.code}>
                      <button
                        type="button"
                        className={`wl-currency-option ${currency === item.code ? 'is-active' : ''}`}
                        onClick={() => selectCurrency(item.code)}
                      >
                        <span>{item.label}</span>
                        {currency === item.code && <span aria-hidden="true">●</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <button
              type="button"
              className="wl-util-btn"
              onClick={onThemeToggle}
              aria-label={
                theme === 'daylight'
                  ? 'Switch gallery lighting to 3200K Evening Vault'
                  : 'Switch gallery lighting to 5600K Museum Daylight'
              }
            >
              <span className="wl-util-kicker wl-hide-xs">LUX</span>
              <span className="wl-util-val">
                {theme === 'daylight' ? '5600K' : '3200K'}
              </span>
            </button>

            <button
              type="button"
              className={`wl-folio-trigger ${folioCount > 0 ? 'has-items' : ''}`}
              onClick={onOpenFolio}
              aria-label={`Open Collector's Acquisition Folio (${folioCount} works selected)`}
            >
              <span className="wl-folio-label-full">ACQUISITION FOLIO</span>
              <span className="wl-folio-label-compact">FOLIO</span>
              <span className="wl-folio-badge">{folioCount}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Non-sticky compact section navigation bar on tablet/mobile so sticky header stays <= 58px */}
      <nav className="wl-mobile-subnav" aria-label="Mobile gallery sections">
        <button
          type="button"
          className="wl-mobile-subnav-link"
          onClick={() => onNavigateSalon('catalogue-raisonne')}
        >
          Catalogue (13)
        </button>
        <button
          type="button"
          className="wl-mobile-subnav-link"
          onClick={() => onNavigateSalon('in-situ-salon')}
        >
          In Situ Salon
        </button>
        <button
          type="button"
          className="wl-mobile-subnav-link"
          onClick={() => onNavigateSalon('monograph-essay')}
        >
          Monograph &amp; CV
        </button>
      </nav>
    </>
  );
};
