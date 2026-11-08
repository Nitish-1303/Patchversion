'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ParallaxCard, Reveal } from './Experience';
import { PayPalUpgradeModal, type SupportedPlan } from '../dashboard/components/PayPalUpgradeModal';
import {
  ScanRadarIcon,
  TopologyIcon,
  FileDiffIcon,
  ShieldCheckIcon,
  AlertTriangleIcon,
  PulseDotIcon,
  LockIcon,
  CheckCircleIcon,
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
  const [checkoutPlan, setCheckoutPlan] = useState<SupportedPlan | null>(null);
  const [successPlan, setSuccessPlan] = useState<SupportedPlan | null>(null);

  const tiers = [
    {
      id: 'developer' as const,
      name: 'Developer',
      price: '$0',
      period: 'local preview',
      desc: 'For individual developers testing deterministic AST migrations on local fixtures.',
      cta: 'Start local scan (Free)',
      href: '/dashboard',
      featured: false,
      isPaypal: false,
      features: [
        'Unlimited local AST scans',
        'AST call-site mapping engine',
        'Deterministic patch generator',
        '1 free automated PR / month',
        'Tamper-evident proof bundles',
      ],
    },
    {
      id: 'repository' as const,
      name: 'Repository',
      price: '$49',
      period: 'per repo / month',
      desc: 'Automated package watching, call-site mapping, and verified migration proof runs.',
      cta: 'Pay with PayPal ($49/mo)',
      href: '#',
      featured: true,
      isPaypal: true,
      features: [
        '1 connected repository',
        'Continuous upstream package watching',
        'Unlimited verified migration PRs',
        'GitHub App single-use human approvals',
        'Fail-closed PR delivery mutex',
      ],
    },
    {
      id: 'organization' as const,
      name: 'Organization',
      price: '$299',
      period: 'per org / month',
      desc: 'Unlimited repositories with team governance, RBAC, and custom migration rules.',
      cta: 'Pay with PayPal ($299/mo)',
      href: '#',
      featured: false,
      isPaypal: true,
      features: [
        'Unlimited connected repositories',
        'Custom internal API migration rules',
        'Multi-member team RBAC controls',
        'Priority isolated runner queues',
        'Tamper-evident proof audit trails',
      ],
    },
    {
      id: 'enterprise' as const,
      name: 'Enterprise',
      price: '$15k+',
      period: 'annual contract',
      desc: 'Dedicated microVM sandboxing runners, private npm registries, and custom SLAs.',
      cta: 'Pay with PayPal ($15k/yr)',
      href: '#',
      featured: false,
      isPaypal: true,
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
        description="Select a plan below to checkout directly via PayPal. Payouts route straight to your account with instant activation."
      />

      {successPlan && (
        <div
          style={{
            padding: '14px 20px',
            marginBottom: '24px',
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            borderRadius: '10px',
            color: '#065f46',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CheckCircleIcon size={20} color="#059669" />
            <div>
              <strong>Subscription Activated via PayPal!</strong>
              <p style={{ margin: '2px 0 0', fontSize: '13px' }}>
                Your {successPlan} plan is now active. You have unlocked unlimited automated pull requests.
              </p>
            </div>
          </div>
          <Link target="_blank" rel="noopener noreferrer" href="/dashboard" className="pill-button pill-button-dark" style={{ fontSize: '13px', padding: '6px 14px' }}>
            Go to Dashboard &rarr;
          </Link>
        </div>
      )}

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

              {t.isPaypal ? (
                <button
                  type="button"
                  onClick={() => setCheckoutPlan(t.id)}
                  className={`pill-button ${t.featured ? 'pill-button-dark' : 'pill-button-light'}`}
                  style={{
                    width: '100%',
                    marginTop: '16px',
                    cursor: 'pointer',
                    background: t.featured ? '#ffc439' : '#ffffff',
                    color: t.featured ? '#003087' : '#0f172a',
                    border: t.featured ? '1px solid #e0aa28' : '1px solid #cbd5e1',
                    fontWeight: 700,
                  }}
                >
                  {t.cta}
                </button>
              ) : (
                <Link
                  href={t.href}
                  className="pill-button pill-button-light"
                  style={{ width: '100%', marginTop: '16px' }}
                  {...(t.href === '/dashboard' ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                >
                  {t.cta}
                </Link>
              )}
            </div>
          </Reveal>
        ))}
      </div>

      <div
        style={{
          marginTop: '28px',
          textAlign: 'center',
          fontSize: '12px',
          color: '#64748b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
        }}
      >
        <ShieldCheckIcon size={16} color="#059669" />
        <span>Official PayPal Checkout &middot; Instant activation &middot; Cancel anytime</span>
      </div>

      {/* Multi-plan PayPal Checkout Modal */}
      {checkoutPlan && (
        <PayPalUpgradeModal
          isOpen={Boolean(checkoutPlan)}
          initialPlan={checkoutPlan}
          onClose={() => setCheckoutPlan(null)}
          onUpgradeSuccess={(plan) => {
            setSuccessPlan(plan || checkoutPlan);
            setCheckoutPlan(null);
          }}
        />
      )}
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

const PIPELINE_FIXTURES = {
  mockpay: {
    advisoryId: 'ADV-2024-812',
    pkg: 'mockpay',
    fromVer: '1.2.4',
    toVer: '2.0.0',
    type: 'Parameter Rename',
    file: 'src/createCharge.js',
    line: 41,
    col: 5,
    oldToken: 'source',
    newToken: 'payment_method',
    caller: 'mockpay.charges.create',
    hash: 'sha256:7f160e',
    diffLines: [
      { num: 40, prefix: ' ', text: 'const options = {' },
      { num: 41, prefix: '−', text: '  source: source,', del: true },
      { num: 42, prefix: '+', text: '  payment_method: source,', add: true },
      { num: 43, prefix: ' ', text: "  description: 'Order payment'" },
      { num: 44, prefix: ' ', text: '};' },
    ],
    testError: 'Missing required parameter: payment_method',
    baselinePassing: 3,
    redFailed: 2,
    greenPassing: 3,
  },
  lodash: {
    advisoryId: 'ADV-LODASH-400',
    pkg: 'lodash',
    fromVer: '3.10.1',
    toVer: '4.17.21',
    type: 'Method Rename',
    file: 'src/membership.js',
    line: 6,
    col: 12,
    oldToken: '_.contains',
    newToken: '_.includes',
    caller: '_.contains(ids, id)',
    hash: 'sha256:5e7844',
    diffLines: [
      { num: 4, prefix: ' ', text: 'function isMember(ids, id) {' },
      { num: 5, prefix: '−', text: '  return _.contains(ids, id);', del: true },
      { num: 6, prefix: '+', text: '  return _.includes(ids, id);', add: true },
      { num: 7, prefix: ' ', text: '}' },
    ],
    testError: 'TypeError: _.contains is not a function',
    baselinePassing: 3,
    redFailed: 2,
    greenPassing: 3,
  },
};

export function WorkingProofPipeline() {
  const [activePoint, setActivePoint] = useState<1 | 2 | 3>(1);
  const [fixtureKey, setFixtureKey] = useState<'mockpay' | 'lodash'>('mockpay');
  const [isRunning, setIsRunning] = useState(false);
  const [humanApproved, setHumanApproved] = useState(false);

  const fixture = PIPELINE_FIXTURES[fixtureKey];

  const runProofLoop = () => {
    if (isRunning) return;
    setIsRunning(true);
    setHumanApproved(false);
    setActivePoint(1);
    setTimeout(() => {
      setActivePoint(2);
      setTimeout(() => {
        setActivePoint(3);
        setIsRunning(false);
      }, 900);
    }, 900);
  };

  return (
    <section className="section-block content-width pipeline-section">
      <PageHeading
        eyebrow="A SMALL, REVIEWABLE LOOP"
        title="From breaking change to verified pull request."
        description="Automated breaking change discovery, AST call-site mapping, deterministic patch synthesis, and human-gated GitHub delivery."
        eyebrowStyle="label"
      />

      {/* 3 Interactive Point Cards */}
      <div className="pipeline-cards-row">
        <article
          className={`pipeline-card${activePoint === 1 ? ' active' : ''}`}
          onClick={() => setActivePoint(1)}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="small-label">STEP 01</span>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: 10, background: activePoint === 1 ? '#dbeafe' : 'var(--paper)', border: '1px solid var(--lavender-mid)' }}>
              <ScanRadarIcon size={18} color={activePoint === 1 ? '#1d4ed8' : 'var(--navy-deep)'} />
            </div>
          </div>
          <h3 style={{ margin: '14px 0 8px', fontSize: '18px', fontWeight: 650 }}>Detect Contract Break</h3>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--body)', lineHeight: 1.6 }}>
            Detect breaking changes across upstream package versions and lockfile entries.
          </p>
          <div style={{ marginTop: 'auto', paddingTop: '16px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: activePoint === 1 ? '#2b59ff' : '#94a3b8', fontWeight: 600 }}>
            <PulseDotIcon color={activePoint === 1 ? '#2b59ff' : '#cbd5e1'} size={6} />
            {activePoint === 1 ? 'Active inspection step' : 'Click to inspect break'}
          </div>
        </article>

        <article
          className={`pipeline-card${activePoint === 2 ? ' active' : ''}`}
          onClick={() => setActivePoint(2)}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="small-label">STEP 02</span>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: 10, background: activePoint === 2 ? '#dbeafe' : 'var(--paper)', border: '1px solid var(--lavender-mid)' }}>
              <TopologyIcon size={18} color={activePoint === 2 ? '#1d4ed8' : 'var(--navy-deep)'} />
            </div>
          </div>
          <h3 style={{ margin: '14px 0 8px', fontSize: '18px', fontWeight: 650 }}>Map AST Call Sites</h3>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--body)', lineHeight: 1.6 }}>
            Map call sites with AST analysis to identify affected code paths.
          </p>
          <div style={{ marginTop: 'auto', paddingTop: '16px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: activePoint === 2 ? '#2b59ff' : '#94a3b8', fontWeight: 600 }}>
            <PulseDotIcon color={activePoint === 2 ? '#2b59ff' : '#cbd5e1'} size={6} />
            {activePoint === 2 ? 'Active inspection step' : 'Click to trace AST usage'}
          </div>
        </article>

        <article
          className={`pipeline-card${activePoint === 3 ? ' active' : ''}`}
          onClick={() => setActivePoint(3)}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="small-label">STEP 03</span>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: 10, background: activePoint === 3 ? '#dbeafe' : 'var(--paper)', border: '1px solid var(--lavender-mid)' }}>
              <FileDiffIcon size={18} color={activePoint === 3 ? '#1d4ed8' : 'var(--navy-deep)'} />
            </div>
          </div>
          <h3 style={{ margin: '14px 0 8px', fontSize: '18px', fontWeight: 650 }}>Verify & Deliver Patch</h3>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--body)', lineHeight: 1.6 }}>
            Review minimal deterministic diffs alongside verified test output.
          </p>
          <div style={{ marginTop: 'auto', paddingTop: '16px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: activePoint === 3 ? '#2b59ff' : '#94a3b8', fontWeight: 600 }}>
            <PulseDotIcon color={activePoint === 3 ? '#2b59ff' : '#cbd5e1'} size={6} />
            {activePoint === 3 ? 'Active inspection step' : 'Click to inspect proof'}
          </div>
        </article>
      </div>

      {/* Interactive Working Proof Drawer */}
      <div className="pipeline-drawer">
        <div className="pipeline-drawer-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="small-label" style={{ color: '#2b59ff', background: '#eff6ff', padding: '3px 8px', borderRadius: 4 }}>
              STAGE 0{activePoint} TRIAGE WORKBENCH
            </span>
            <strong style={{ fontSize: '13px', color: 'var(--navy-deep)' }}>
              {activePoint === 1 && `Advisory Discovery: ${fixture.pkg} ${fixture.fromVer} → ${fixture.toVer}`}
              {activePoint === 2 && `AST Call-Site Topology: ${fixture.file}:${fixture.line}`}
              {activePoint === 3 && `Synthesized AST Patch & Verified Test Output (${fixture.hash})`}
            </strong>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="fixture-pill-group">
              <button
                type="button"
                className={`fixture-pill-btn${fixtureKey === 'mockpay' ? ' active' : ''}`}
                onClick={() => { setFixtureKey('mockpay'); setHumanApproved(false); }}
              >
                mockpay
              </button>
              <button
                type="button"
                className={`fixture-pill-btn${fixtureKey === 'lodash' ? ' active' : ''}`}
                onClick={() => { setFixtureKey('lodash'); setHumanApproved(false); }}
              >
                lodash
              </button>
            </div>
            <button
              type="button"
              className="hero-run-btn"
              onClick={runProofLoop}
              disabled={isRunning}
            >
              <PulseDotIcon color={isRunning ? '#f59e0b' : '#10b981'} size={6} />
              {isRunning ? 'Running Pipeline...' : '▶ Run Pipeline'}
            </button>
          </div>
        </div>

        <div className="pipeline-drawer-body">
          {activePoint === 1 && (
            <div className="pipeline-drawer-grid">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <span className="pane-badge pane-badge-warn" style={{ alignSelf: 'flex-start' }}>
                  <AlertTriangleIcon size={12} color="#b45309" />
                  ADVISORY #{fixture.advisoryId} · BREAKING
                </span>
                <h4 style={{ margin: 0, fontSize: '16px', color: 'var(--navy-deep)' }}>
                  Upstream {fixture.type} in {fixture.pkg}
                </h4>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--body)', lineHeight: 1.6 }}>
                  Upstream release bump from version <code>{fixture.fromVer}</code> to <code>{fixture.toVer}</code> deprecates <code>{fixture.oldToken}</code>. Contract prober identified required replacement: <code>{fixture.newToken}</code>.
                </p>
                <div style={{ padding: '12px', background: 'var(--paper)', borderRadius: 8, border: '1px solid var(--rule)', fontSize: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ color: '#64748b' }}>Detection method:</span>
                    <strong>Package manifest & AST contract comparison</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Deterministic fix eligibility:</span>
                    <strong style={{ color: '#059669' }}>Eligible (Parameter rename)</strong>
                  </div>
                </div>
                <button
                  type="button"
                  className="pill-button pill-button-light"
                  style={{ alignSelf: 'flex-start', minHeight: 36, padding: '0 16px', fontSize: 12, marginTop: 4 }}
                  onClick={() => setActivePoint(2)}
                >
                  Next: Map AST Call Sites →
                </button>
              </div>

              <div style={{ background: '#0f172a', borderRadius: 10, padding: '14px', color: '#cbd5e1', fontFamily: 'monospace', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', borderBottom: '1px solid #1e293b', paddingBottom: 6 }}>
                  <span>change-record.json</span>
                  <span>verified-contract</span>
                </div>
                <pre style={{ margin: 0, lineHeight: 1.5, color: '#93c5fd' }}>
{`{
  "changeId": "${fixture.pkg}-${fixture.toVer}",
  "package": "${fixture.pkg}",
  "versionRange": "${fixture.fromVer} -> ${fixture.toVer}",
  "classification": "${fixture.type}",
  "deprecatedSymbol": "${fixture.oldToken}",
  "replacementSymbol": "${fixture.newToken}",
  "scope": "call_site_parameter"
}`}
                </pre>
              </div>
            </div>
          )}

          {activePoint === 2 && (
            <div className="pipeline-drawer-grid">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <span className="pane-badge pane-badge-success" style={{ alignSelf: 'flex-start' }}>
                  <TopologyIcon size={12} color="#047857" />
                  AST MAPPER · 1 MATCH FOUND
                </span>
                <h4 style={{ margin: 0, fontSize: '16px', color: 'var(--navy-deep)' }}>
                  Call-site located in {fixture.file}
                </h4>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--body)', lineHeight: 1.6 }}>
                  Static AST analysis mapped all references to <code>{fixture.caller}</code>. Matched identifier on line <code>{fixture.line}</code>, column <code>{fixture.col}</code> with 0 false positives.
                </p>
                <div className="ast-snippet">
                  <div className="ast-row">
                    <span className="ast-type">File:</span>
                    <code>{fixture.file}</code>
                    <span className="ast-loc">L{fixture.line}:C{fixture.col}</span>
                  </div>
                  <div className="ast-row">
                    <span className="ast-type">Expression:</span>
                    <code>{fixture.caller}</code>
                  </div>
                  <div className="ast-row child">
                    <span className="ast-type arrow">↳</span>
                    <span>Target AST Node: <code>PropertyAssignment</code></span>
                    <span className="ast-badge">Verified</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="pill-button pill-button-light"
                  style={{ alignSelf: 'flex-start', minHeight: 36, padding: '0 16px', fontSize: 12, marginTop: 4 }}
                  onClick={() => setActivePoint(3)}
                >
                  Next: Generate Patch & Proof →
                </button>
              </div>

              <div style={{ background: '#0f172a', borderRadius: 10, padding: '14px', color: '#cbd5e1', fontFamily: 'monospace', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', borderBottom: '1px solid #1e293b', paddingBottom: 6 }}>
                  <span>{fixture.file}</span>
                  <span>AST Location Map</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 4 }}>
                  <div style={{ color: '#64748b' }}>40 | const options = &#123;</div>
                  <div style={{ background: 'rgba(43, 89, 255, 0.2)', padding: '2px 6px', borderRadius: 4, color: '#93c5fd' }}>
                    41 |   {fixture.oldToken}: {fixture.oldToken}, &nbsp;← AST Identifier mapped
                  </div>
                  <div style={{ color: '#64748b' }}>42 |   description: &apos;Order payment&apos;</div>
                  <div style={{ color: '#64748b' }}>43 | &#125;;</div>
                </div>
              </div>
            </div>
          )}

          {activePoint === 3 && (
            <div className="pipeline-drawer-grid">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <span className="pane-badge pane-badge-success" style={{ alignSelf: 'flex-start' }}>
                  <ShieldCheckIcon size={12} color="#047857" />
                  DETERMINISTIC PATCH · {fixture.hash}
                </span>
                <h4 style={{ margin: 0, fontSize: '16px', color: 'var(--navy-deep)' }}>
                  Verified Red-to-Green Test Loop
                </h4>
                <div className="proof-metric-list">
                  <div className="proof-metric-item">
                    <div className="metric-left">
                      <span className="metric-dot green" />
                      <span>1. Baseline suite</span>
                    </div>
                    <strong className="metric-val green">{fixture.baselinePassing} / {fixture.baselinePassing} passing</strong>
                  </div>
                  <div className="proof-metric-item">
                    <div className="metric-left">
                      <span className="metric-dot red" />
                      <span>2. Upstream bump ({fixture.toVer})</span>
                    </div>
                    <strong className="metric-val red">{fixture.redFailed} failing (break verified)</strong>
                  </div>
                  <div className="proof-metric-item">
                    <div className="metric-left">
                      <span className="metric-dot green" />
                      <span>3. AST patch applied</span>
                    </div>
                    <strong className="metric-val green">
                      <CheckCircleIcon size={13} color="#059669" />
                      {fixture.greenPassing} / {fixture.greenPassing} passing
                    </strong>
                  </div>
                </div>

                <div style={{ marginTop: '8px' }}>
                  <button
                    type="button"
                    style={{
                      width: '100%',
                      padding: '8px 14px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: humanApproved ? '1px solid #10b981' : '1px solid #2b59ff',
                      background: humanApproved ? '#ecfdf5' : '#2b59ff',
                      color: humanApproved ? '#065f46' : '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                    }}
                    onClick={() => setHumanApproved(!humanApproved)}
                  >
                    <CheckCircleIcon size={13} color={humanApproved ? '#065f46' : '#ffffff'} />
                    {humanApproved ? '✓ Approved · Pull Request Ready' : 'Authorize Pull Request Delivery'}
                  </button>
                </div>
              </div>

              <div style={{ background: '#0f172a', borderRadius: 10, padding: '14px', color: '#cbd5e1', fontFamily: 'monospace', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', borderBottom: '1px solid #1e293b', paddingBottom: 6 }}>
                  <span>patch.diff</span>
                  <span>{fixture.hash}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 4 }}>
                  {fixture.diffLines.map((l) => (
                    <div
                      key={l.num}
                      style={{
                        display: 'flex',
                        background: l.del ? 'rgba(239, 68, 68, 0.18)' : l.add ? 'rgba(16, 185, 129, 0.18)' : 'transparent',
                        color: l.del ? '#fca5a5' : l.add ? '#86efac' : '#cbd5e1',
                        padding: '1px 6px',
                        borderRadius: 3,
                      }}
                    >
                      <span style={{ width: 28, color: '#64748b' }}>{l.num}</span>
                      <span style={{ width: 14 }}>{l.prefix}</span>
                      <span>{l.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
