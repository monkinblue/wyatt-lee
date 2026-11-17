import React from 'react';
import type { Artwork, FramingMode } from '../types/gallery';
import { EmbossedStudioSeal } from './BrandMarks';

interface MonographEssaySectionProps {
  artworks: Artwork[];
  onInspectWork: (work: Artwork, mode?: FramingMode) => void;
}

export const MonographEssaySection: React.FC<MonographEssaySectionProps> = ({
  artworks,
  onInspectWork,
}) => {
  // Select 3 extraordinary macro plates: Lot 03 (Gold leaf crust), Lot 11 (Twin green palm prints), Lot 13 (Terracotta bristle furrows)
  const triptych = [artworks[2], artworks[10], artworks[12]].filter(Boolean);

  return (
    <section
      id="monograph-essay"
      className="wl-monograph-section"
      aria-labelledby="monograph-heading"
    >
      {/* Macro Materiality Triptych */}
      <div className="wl-macro-triptych-wrap">
        <div className="wl-section-header">
          <div>
            <p className="wl-eyebrow">CONSERVATION MICROSCOPY · RAKING LIGHT AT 45°</p>
            <h2 id="monograph-heading" className="wl-section-title">
              Surface Topology, Impasto &amp; Somatic Index
            </h2>
          </div>
          <p className="wl-section-lead">
            Photographed under oblique conservation illumination to document wet-into-wet foil
            inclusions, unmediated palm registrations, and raw utility-bristle striations.
          </p>
        </div>

        <div className="wl-macro-triptych">
          {triptych.map((work, i) => (
            <figure key={work.id} className="wl-macro-card wl-scroll-reveal">
              <button
                type="button"
                className="wl-macro-img-btn"
                data-cursor="OPEN LOT"
                onClick={() => onInspectWork(work, 'raw')}
                aria-label={`Inspect ${work.lotNumber}: ${work.shortTitle}`}
              >
                <img
                  src={work.images.macro}
                  alt={`Macro surface detail of ${work.shortTitle} (${work.year})`}
                  width={1000}
                  height={1000}
                  loading="lazy"
                />
                <span className="wl-macro-plate-tag">MACRO PLATE 0{i + 1} · 1:1 DETAIL</span>
              </button>
              <figcaption className="wl-macro-caption">
                <strong>
                  {work.lotNumber} · <cite>{work.shortTitle}</cite>
                </strong>
                <p>{work.macroCaption}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>

      {/* Critical Monograph Essay & Institutional Chronology */}
      <div className="wl-monograph-editorial-grid">
        <article className="wl-critical-essay">
          <p className="wl-eyebrow">MONOGRAPH ESSAY · DR. H. VANDERLINDEN, ZURICH</p>
          <h3 className="wl-essay-headline">
            The Urgency Before Quiet Time: W.L. and the Refusal of Post-Critical Distance
          </h3>

          <div className="wl-essay-columns">
            <p className="wl-dropcap">
              Few practices emerging after 2022 have dismantled the polite conventions of late
              process abstraction as decisively as that of W.L. Working across horizontal domestic
              thresholds—vulcanized gymnasium tiles, polished granite peninsulas, plein-air folding
              trestles—the Artist treats canvas not as a window for pictorial illusion, but as an
              arena of immediate hydrodynamic consequence.
            </p>
            <p>
              Where twentieth-century precedents from Jackson Pollock to Kazuo Shiraga framed bodily
              action as existential theatre, W.L. compresses execution into ruthless, twenty-minute
              studio windows bounded by non-negotiable afternoon rest schedules. There is zero
              revision, zero glazing over hesitation: when a torrent of phthalo cyan meets an
              archipelago of hand-crushed composite gilt leaf, the encounter is final.
            </p>
            <p>
              Even the studio&rsquo;s somatic registrations—the spectral bare-heel impression in{' '}
              <cite>Anthropométrie Silencieuse</cite> (2024) or the twin nine-centimeter sap-green
              palms anchored in <cite>Veritas Manuum</cite> (2024)—resist sentimentality. Catalogued
              by Atelier registrars alongside trace oat-milk binders and stabilized apple-juice
              craquelure, these marks assert an ontological sovereignty rare at any price point in
              today&rsquo;s contemporary evening sales.
            </p>
          </div>
        </article>

        <aside className="wl-chronology-panel" aria-label="Artist biography and registrar archive">
          <div className="wl-bio-card">
            <div className="wl-bio-seal-header">
              <div>
                <p className="wl-eyebrow">CURRICULUM VITAE</p>
                <h3 className="wl-bio-name">W.L. (b. 2022)</h3>
                <p className="wl-bio-origin">
                  Lives and works in Northern Virginia · Morning Studio Hours Only
                </p>
              </div>
              <EmbossedStudioSeal size={76} />
            </div>

            <dl className="wl-chronology-list">
              <div>
                <dt>2022</dt>
                <dd>Inaugural residency; foundational tactile investigations on vertical steel appliances.</dd>
              </div>
              <div>
                <dt>2024</dt>
                <dd>
                  Transition to stretched cotton duck, bimetallic foil leaf, and nocturnal carbon
                  grounds (<cite>Plein-Air Trestle</cite> &amp; <cite>Peninsula</cite> cycles).
                </dd>
              </div>
              <div>
                <dt>2025</dt>
                <dd>
                  Execution of bipartite <cite>Étude Maritime</cite> diptych and monumental heavy-impasto
                  synthesis <cite>Nachmittagsschlaf Nr. 9</cite>.
                </dd>
              </div>
              <div>
                <dt>2026</dt>
                <dd>
                  Publication of <cite>Catalogue Raisonné Vol. I</cite> and inauguration of the
                  Atelier W.L. Custodial Patronage Trust.
                </dd>
              </div>
            </dl>
          </div>

          {/* Native Exclusive Disclosure Accordion (<details name="...">) per modern-web-guidance */}
          <section
            className="wl-registrar-accordions"
            aria-label="Registrar and acquisition protocols"
          >
            <details name="registrar-dossier" open>
              <summary>Conservation &amp; Fugitive Medium Protocol</summary>
              <p>
                All washable polymer emulsions, tempera suspensions, and composite metallic leaf
                inclusions undergo non-yellowing UV barrier stabilization prior to release. Works
                ship exclusively in 52% RH nitrogen-buffered fine-art air crates.
              </p>
            </details>
            <details name="registrar-dossier">
              <summary>Studio Schedule &amp; Escrow Counter-Signature Policy</summary>
              <p>
                The Artist maintains strict studio hours between 08:30 and 11:45 EST. Acquisitions
                confirmed during afternoon rest are automatically processed under the WL Studio
                Patronage Grant without requiring live wire settlement.
              </p>
            </details>
            <details name="registrar-dossier">
              <summary>Institutional Loan &amp; Exhibition Inquiries</summary>
              <p>
                Accredited Kunsthallen and museum trustees may request raking-light condition
                dossiers and courier specifications directly through the Private Client Desk.
              </p>
            </details>
          </section>
        </aside>
      </div>
    </section>
  );
};
