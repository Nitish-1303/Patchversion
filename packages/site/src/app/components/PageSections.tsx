'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ParallaxCard, Reveal } from './Experience';
import {
  ScanRadarIcon,
  TopologyIcon,
  FileDiffIcon,
  ShieldCheckIcon,
  AlertTriangleIcon,
  PulseDotIcon,
  LockIcon,
} from './UiIcons';

export type FeatureCard = { eyebrow?: string; title: string; body: string };

export function PageHeading({
  eyebrow,
  title,
  description,
  align = 'center',
  eyebrowStyle = 'label',
}: {
  eyebrow: string;
  title: string;
  description: string;
  align?: 'center' | 'left';
  eyebrowStyle?: 'chip' | 'label';
}) {
  return (
    <header className={`page-heading${align === 'left' ? ' align-left' : ''}`}>
      <Reveal>
        {eyebrowStyle === 'chip' ? (
          <span className="eyebrow-chip">{eyebrow}</span>
        ) : (
          <span className="small-label section-eyebrow-text">{eyebrow}</span>
        )}
      </Reveal>
      <Reveal delay={80}><h1>{title}</h1></Reveal>
      <Reveal delay={160}><p>{description}</p></Reveal>
    </header>
  );
}

const GRID_ICONS = [ScanRadarIcon, TopologyIcon, FileDiffIcon, ShieldCheckIcon];

export function FeatureGrid({ eyebrow, title, description, cards }: {
  eyebrow: string;
  title: string;
  description: string;
  cards: FeatureCard[];
}) {
  return (
    <section className="section-block content-width">
      <PageHeading eyebrow={eyebrow} title={title} description={description} eyebrowStyle="label" />
      <div className="feature-grid">
        {cards.map((card, index) => {
          const Icon = GRID_ICONS[index % GRID_ICONS.length];
          return (
            <Reveal key={card.title} delay={index * 80}>
              <article className="feature-card" style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="small-label">{card.eyebrow || `POINT 0${index + 1}`}</span>
                  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: 10, background: 'var(--paper)', border: '1px solid var(--lavender-mid)' }}>
                    <Icon size={18} color="var(--navy-deep)" />
                  </div>
                </div>
                <h3>{card.title}</h3>
                <p style={{ marginTop: 'auto' }}>{card.body}</p>
              </article>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

export function BentoSection({
  eyebrow,
  title,
  description,
  cards,
}: {
  eyebrow: string;
  title: string;
  description: string;
  cards: FeatureCard[];
}) {
  const [featured, ...rest] = cards;
  return (
    <section className="section-block content-width">
      <PageHeading eyebrow={eyebrow} title={title} description={description} eyebrowStyle="label" />
      <div className="bento-layout">
        {featured && (
          <Reveal delay={0}>
            <article className="bento-featured-card">
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="small-label">{featured.eyebrow || 'CORE CAPABILITY'}</span>
                  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 38, height: 38, borderRadius: 12, background: 'var(--lavender)', border: '1px solid var(--lavender-mid)' }}>
                    <ShieldCheckIcon size={20} color="var(--navy-deep)" />
                  </div>
                </div>
                <h3>{featured.title}</h3>
                <p>{featured.body}</p>
              </div>
              <div className="bento-highlight-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <PulseDotIcon color="#10b981" size={7} />
                AST Verification Engine
              </div>
            </article>
          </Reveal>
        )}
        <div className="bento-stacked-col">
          {rest.map((card, idx) => {
            const Icon = idx === 0 ? TopologyIcon : FileDiffIcon;
            return (
              <Reveal key={card.title} delay={(idx + 1) * 80}>
                <article className="bento-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="small-label">{card.eyebrow || `POINT 0${idx + 2}`}</span>
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, background: 'var(--paper)', border: '1px solid var(--rule)' }}>
                      <Icon size={16} color="var(--navy-deep)" />
                    </div>
                  </div>
                  <h3>{card.title}</h3>
                  <p>{card.body}</p>
                </article>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function SplitSection({
  eyebrow,
  title,
  body,
  caption,
  reverse = false,
  lines = ['Change context visible', 'Proposed diff inspectable', 'Human review remains required'],
}: {
  eyebrow: string;
  title: string;
  body: string;
  caption: string;
  reverse?: boolean;
  lines?: string[];
}) {
  const [inspectorTab, setInspectorTab] = useState<'diff' | 'ast' | 'proof'>('diff');
  const line0 = lines[0] || 'Change context visible';
  const line1 = lines[1] || 'Proposed diff inspectable';
  const line2 = lines[2] || 'Human review remains required';

  return (
    <section className={`split-section content-width${reverse ? ' reverse' : ''}`}>
      <Reveal className="split-copy">
        <span className="eyebrow-chip">{eyebrow}</span>
        <h2>{title}</h2>
        <p>{body}</p>
      </Reveal>
      <ParallaxCard className="split-art-wrap">
        <div className="split-art-card">
          <span className="cad-corner cad-corner-tl" aria-hidden="true">+</span>
          <span className="cad-corner cad-corner-tr" aria-hidden="true">+</span>
          <span className="cad-corner cad-corner-bl" aria-hidden="true">+</span>
          <span className="cad-corner cad-corner-br" aria-hidden="true">+</span>

          <div className="split-cockpit-header">
            <div className="split-window-controls" aria-hidden="true">
              <span className="split-dot dot-red" />
              <span className="split-dot dot-yellow" />
              <span className="split-dot dot-green" />
            </div>
            <div className="split-header-title">
              <span className="split-mono-repo">trypatchbay / review-cockpit</span>
              <span className="split-header-sep">/</span>
              <span className="split-mono-branch">mockpay · v1.0 → v2.0</span>
            </div>
            <div className="split-header-badge">
              <span className="split-gate-pill">
                <PulseDotIcon color="#f59e0b" size={6} />
                Human Gate Required
              </span>
            </div>
          </div>

          <div className="split-cad-subhead">
            <span className="cad-spec-label">CAD-SPEC: REV 3.0b // LENGTH: 1045.2m</span>
            <span className="cad-spec-status">URBAN GRID JUNCTION | STATUS: OPTIMIZED</span>
          </div>

          <div className="split-cockpit-list">
            {/* Checkpoint 01 */}
            <div className="split-checkpoint-row">
              <div className="checkpoint-header">
                <div className="checkpoint-title-wrap">
                  <span className="checkpoint-num">01</span>
                  <span className="checkpoint-icon-box amber">
                    <AlertTriangleIcon size={13} color="#d97706" />
                  </span>
                  <span className="checkpoint-title">{line0}</span>
                </div>
                <span className="checkpoint-pill amber">Advisory #ADV-2024-812</span>
              </div>
              <div className="checkpoint-sub">
                <span className="checkpoint-tag">mockpay 1.0 → 2.0</span>
                <span className="checkpoint-desc">
                  Parameter <code>source</code> renamed to <code>payment_method</code>
                </span>
              </div>
            </div>

            {/* Checkpoint 02 */}
            <div className="split-checkpoint-row">
              <div className="checkpoint-header">
                <div className="checkpoint-title-wrap">
                  <span className="checkpoint-num">02</span>
                  <span className="checkpoint-icon-box blue">
                    <FileDiffIcon size={13} color="#2b59ff" />
                  </span>
                  <span className="checkpoint-title">{line1}</span>
                </div>
                <div className="checkpoint-tab-group">
                  <button
                    type="button"
                    className={`checkpoint-tab-btn${inspectorTab === 'diff' ? ' active' : ''}`}
                    onClick={() => setInspectorTab('diff')}
                  >
                    Diff Snippet
                  </button>
                  <button
                    type="button"
                    className={`checkpoint-tab-btn${inspectorTab === 'ast' ? ' active' : ''}`}
                    onClick={() => setInspectorTab('ast')}
                  >
                    AST Topology
                  </button>
                  <button
                    type="button"
                    className={`checkpoint-tab-btn${inspectorTab === 'proof' ? ' active' : ''}`}
                    onClick={() => setInspectorTab('proof')}
                  >
                    Proof Telemetry
                  </button>
                </div>
              </div>

              {inspectorTab === 'diff' && (
                <div className="checkpoint-sub diff-snippet">
                  <div className="mini-diff-line del">
                    <span className="diff-sign">−</span>
                    <code>source: source,</code>
                  </div>
                  <div className="mini-diff-line add">
                    <span className="diff-sign">+</span>
                    <code>payment_method: source,</code>
                  </div>
                </div>
              )}

              {inspectorTab === 'ast' && (
                <div className="checkpoint-sub ast-snippet">
                  <div className="ast-row">
                    <span className="ast-type">CallExpr</span>
                    <code>mockpay.createCharge(&#123; ... &#125;)</code>
                    <span className="ast-loc">src/createCharge.js:42</span>
                  </div>
                  <div className="ast-row child">
                    <span className="ast-type arrow">↳ Ident</span>
                    <code>source ➔ payment_method</code>
                    <span className="ast-badge">Single Target AST Rename</span>
                  </div>
                </div>
              )}

              {inspectorTab === 'proof' && (
                <div className="checkpoint-sub proof-snippet">
                  <div className="proof-row">
                    <span className="proof-tag pass">PASS</span>
                    <span className="proof-name">Baseline v1.0.4 tests</span>
                    <span className="proof-time">124ms</span>
                  </div>
                  <div className="proof-row">
                    <span className="proof-tag fail">FAIL</span>
                    <span className="proof-name">Upstream bump to v2.0.0</span>
                    <span className="proof-time">18ms</span>
                  </div>
                  <div className="proof-row">
                    <span className="proof-tag pass">PASS</span>
                    <span className="proof-name">Patched with deterministic AST fix</span>
                    <span className="proof-time">131ms</span>
                  </div>
                </div>
              )}
            </div>

            {/* Checkpoint 03 */}
            <div className="split-checkpoint-row">
              <div className="checkpoint-header">
                <div className="checkpoint-title-wrap">
                  <span className="checkpoint-num">03</span>
                  <span className="checkpoint-icon-box emerald">
                    <ShieldCheckIcon size={13} color="#10b981" />
                  </span>
                  <span className="checkpoint-title">{line2}</span>
                </div>
                <span className="checkpoint-pill emerald">Delivery Mutex Locked</span>
              </div>
              <div className="checkpoint-sub review-action-row">
                <div className="review-policy-note">
                  <LockIcon size={12} color="#64748b" />
                  <span>Fail-closed: Operator sign-off required prior to PR delivery</span>
                </div>
                <div className="review-action-tag">
                  <span>Sign-off Required</span>
                  <kbd>⌘⏎</kbd>
                </div>
              </div>
            </div>
          </div>

          <div className="split-cockpit-footer">
            <div className="cockpit-footer-meta">
              <span className="cockpit-hash">sha256:7f160e</span>
              <span className="cockpit-dot-sep">·</span>
              <span>Tamper-evident digest</span>
              <span className="cockpit-dot-sep">·</span>
              <span>Isolated runner</span>
            </div>
            <p className="art-caption">{caption}</p>
          </div>
        </div>
      </ParallaxCard>
    </section>
  );
}

export function NavyBand({
  eyebrow = 'IN DEVELOPMENT',
  title,
  body,
  cta = 'Explore the prototype',
  href = '/product',
}: {
  eyebrow?: string;
  title: string;
  body: string;
  cta?: string;
  href?: string;
}) {
  return (
    <section className="navy-band">
      <div className="content-width navy-band-inner">
        <Reveal className="navy-band-copy"><span className="eyebrow-chip eyebrow-chip-light">{eyebrow}</span><h2>{title}</h2><p>{body}</p><Link className="pill-button pill-button-light" href={href}>{cta}</Link></Reveal>
        <Reveal className="band-device" delay={100}><div className="band-device-top"><span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#60a5fa' }} />trypatchbay / local preview</span><span>Illustrative</span></div><div className="band-device-body"><div className="band-device-title">A change, made reviewable.</div><div className="band-lines"><i /><i /><i /><i /></div><div className="band-device-foot">Live repository connections are in development.</div></div></Reveal>
      </div>
    </section>
  );
}

export function DuskCtaBand({
  title = 'Plan less. Ship more.',
  subtitle = 'Requests, breaking changes, and deterministic patches in one calm workspace. Free for teams up to 10.',
  cta = 'Start for free',
  href = '/signup',
}: {
  title?: string;
  subtitle?: string;
  cta?: string;
  href?: string;
}) {
  return (
    <section className="content-width">
      <Reveal>
        <div className="dusk-cta-section">
          <div className="dusk-cta-card">
            <h2>{title}</h2>
            <p>{subtitle}</p>
            <Link href={href} className="pill-button pill-button-dark" style={{ minHeight: '48px', padding: '0 28px', fontSize: '15px' }}>
              {cta}
            </Link>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

export function PricingMatrix() {
  const tiers = [
    {
      name: 'Developer',
      price: '$0',
      period: 'local preview',
      desc: 'For individual developers testing deterministic AST migrations on local fixtures.',
      cta: 'Start local scan',
      href: '/dashboard',
      featured: false,
      features: [
        'Unlimited local AST scans',
        'AST call-site mapping engine',
        'Deterministic patch generator',
        'Tamper-evident proof bundles',
        'Community Discord & docs',
      ],
    },
    {
      name: 'Repository',
      price: '$49',
      period: 'per repo / month',
      desc: 'Automated package watching, call-site mapping, and verified migration proof runs.',
      cta: 'Preview repo tier',
      href: '/signup',
      featured: true,
      features: [
        '1 connected repository',
        'Continuous upstream package watching',
        'Up to 50 verified migration runs / mo',
        'GitHub App single-use human approvals',
        'Fail-closed PR delivery mutex',
      ],
    },
    {
      name: 'Organization',
      price: '$299',
      period: 'per org / month',
      desc: 'Unlimited repositories with team governance, RBAC, and custom migration rules.',
      cta: 'Request org preview',
      href: '/signup',
      featured: false,
      features: [
        'Unlimited connected repositories',
        'Custom internal API migration rules',
        'Multi-member team RBAC controls',
        'Priority isolated runner queues',
        'Tamper-evident proof audit trails',
      ],
    },
    {
      name: 'Enterprise',
      price: '$15k+',
      period: 'annual contract',
      desc: 'Dedicated microVM sandboxing runners, private npm registries, and custom SLAs.',
      cta: 'Talk to founders',
      href: '/contact',
      featured: false,
      features: [
        'Dedicated microVM sandboxing runners',
        'Private npm & internal registry support',
        'Custom SSO / SAML & tenant data isolation',
        'SOC 2 compliance readiness & dedicated SLA',
        'Direct founder & engineering Slack channel',
      ],
    },
  ];

  return (
    <section className="section-block content-width" id="pricing-matrix">
      <PageHeading
        eyebrow="PLANNED COMMERCIAL MODEL"
        title="Predictable, repository-based pricing."
        description="Initial pricing hypotheses from our YC W27 application. Early developer access is free; paid tiers will activate as hosted microVM sandboxes come online."
      />
      <div className="pricing-grid-4">
        {tiers.map((t, idx) => (
          <Reveal key={t.name} delay={idx * 60}>
            <div className={`pricing-card-ondrel${t.featured ? ' featured' : ''}`}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4>{t.name}</h4>
                  {t.featured && (
                    <span style={{ fontSize: '10px', fontWeight: 650, background: '#2b59ff', color: '#fff', padding: '2px 8px', borderRadius: '999px' }}>
                      POPULAR
                    </span>
                  )}
                </div>
                <div className="pricing-price">
                  {t.price} <span>{t.period}</span>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--body)', margin: '8px 0 16px' }}>{t.desc}</p>
                <ul>
                  {t.features.map(f => (
                    <li key={f}>
                      <span style={{ color: '#2b59ff', fontWeight: 700 }}>✓</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <Link
                href={t.href}
                className={`pill-button ${t.featured ? 'pill-button-dark' : 'pill-button-light'}`}
                style={{ width: '100%', marginTop: '16px' }}
              >
                {t.cta}
              </Link>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export function SimpleCallout({ title, body, href = '/contact', label = 'Get in touch' }: {
  title: string;
  body: string;
  href?: string;
  label?: string;
}) {
  return <section className="simple-callout content-width"><Reveal><div><span className="small-label">A NOTE ON AVAILABILITY</span><h2>{title}</h2><p>{body}</p></div><Link href={href} className="pill-button pill-button-dark">{label}</Link></Reveal></section>;
}

export function MarketingPage({
  eyebrow,
  title,
  description,
  cards,
  splits,
  bandTitle,
  bandBody,
  bandHref,
  callout,
}: {
  eyebrow: string;
  title: string;
  description: string;
  cards: FeatureCard[];
  splits?: { eyebrow: string; title: string; body: string; caption: string; lines?: string[] }[];
  bandTitle?: string;
  bandBody?: string;
  bandHref?: string;
  callout?: { title: string; body: string };
}) {
  return (
    <>
      <section className="subpage-hero">
        <div className="content-width"><PageHeading eyebrow={eyebrow} title={title} description={description} /></div>
      </section>
      <FeatureGrid eyebrow="WHAT IT DOES" title="A careful loop, built around evidence." description="The current product is a local prototype. Each card describes the intended shape of the workflow, with availability called out plainly." cards={cards} />
      {splits?.map((split, index) => <SplitSection key={split.title} {...split} reverse={index % 2 === 1} />)}
      {bandTitle && bandBody && <NavyBand title={bandTitle} body={bandBody} href={bandHref} />}
      {callout && <SimpleCallout {...callout} />}
      <DuskCtaBand />
    </>
  );
}
