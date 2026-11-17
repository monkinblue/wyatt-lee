import React from 'react';
import { AtelierWordmark, EmbossedStudioSeal } from './BrandMarks';

interface FooterProps {
  onNavigateSalon: (sectionId?: string) => void;
  onOpenFolio: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigateSalon, onOpenFolio }) => (
  <footer className="wl-footer">
    <div className="wl-footer-inner">
      <div className="wl-footer-brand-col">
        <AtelierWordmark />
        <p className="wl-footer-statement">
          Exclusive worldwide representation, archival conservation, and primary-market custodial
          placement for the works of <strong>W.L. (b. 2022)</strong>.
        </p>
        <p className="wl-footer-hours">
          STUDIO HOURS: 08:30–11:45 EST · CLOSED DAILY 12:30–15:00 FOR MANDATORY AFTERNOON REST
        </p>
      </div>

      <div className="wl-footer-salons">
        <div>
          <h2>NEW YORK VIEWING ROOM</h2>
          <p>Upper East Side Private Salon</p>
          <p>By Registrar Appointment Only</p>
        </div>
        <div>
          <h2>ZURICH CUSTODIAL VAULT</h2>
          <p>Kunsthalle Freeport Sector IV</p>
          <p>52% RH Archival Viewing Suite</p>
        </div>
        <div>
          <h2>PRIMARY RESIDENCY</h2>
          <p>Granite Peninsula &amp; Trestle Annex</p>
          <p>Northern Virginia</p>
        </div>
      </div>

      <div className="wl-footer-nav-col">
        <EmbossedStudioSeal size={84} />
        <div className="wl-footer-links">
          <button type="button" onClick={() => onNavigateSalon('catalogue-raisonne')}>
            Catalogue Raisonné
          </button>
          <button type="button" onClick={() => onNavigateSalon('in-situ-salon')}>
            In Situ Simulator
          </button>
          <button type="button" onClick={() => onNavigateSalon('monograph-essay')}>
            Monograph Essay
          </button>
          <button type="button" onClick={onOpenFolio}>
            Acquisition Folio
          </button>
        </div>
      </div>
    </div>

    <div className="wl-footer-colophon">
      <span>© MMXXVI ATELIER W.L. CUSTODIAL TRUST · ALL WORKS EDITION 1 OF 1</span>
      <span>EXIF-SCRUBBED ARCHIVAL PLATES · ZERO PERSONAL DATA COLLECTED</span>
    </div>
  </footer>
);
