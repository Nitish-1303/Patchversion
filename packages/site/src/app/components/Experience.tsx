'use client';

import {
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react';

import { BrandIcon } from './BrandIcons';
import {
  ScanRadarIcon,
  TopologyIcon,
  FileDiffIcon,
  ShieldCheckIcon,
  GitBranchIcon,
  PulseDotIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  LockIcon,
} from './UiIcons';

export function useReducedMotionPreference() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return reduced;
}

export function Reveal({
  children,
  className = '',
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const reduced = useReducedMotionPreference();

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (reduced || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    }, { threshold: 0.12, rootMargin: '0px 0px -36px 0px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, [reduced]);

  return (
    <div
      ref={ref}
      className={`reveal${visible || reduced ? ' is-visible' : ''} ${className}`}
      style={{ '--reveal-delay': `${delay}ms` } as CSSProperties}
    >
      {children}
    </div>
  );
}

export function CountUp({ value, suffix = '' }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(0);
  const reduced = useReducedMotionPreference();

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (reduced || !('IntersectionObserver' in window)) return;
    let frame = 0;
    let startTime = 0;
    let started = false;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || started) return;
      started = true;
      observer.disconnect();
      const tick = (time: number) => {
        if (!startTime) startTime = time;
        const progress = Math.min((time - startTime) / 700, 1);
        const eased = 1 - (1 - progress) ** 3;
        setShown(Math.round(value * eased));
        if (progress < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    }, { threshold: 0.5 });
    observer.observe(node);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [reduced, value]);

  return <span ref={ref}>{reduced ? value : shown}{suffix}</span>;
}

function useScrollTransform(ref: React.RefObject<HTMLElement>, kind: 'hero' | 'parallax') {
  const reduced = useReducedMotionPreference();
  useEffect(() => {
    const node = ref.current;
    if (!node || reduced) {
      if (node) node.style.transform = '';
      return;
    }
    let frame = 0;
    const initialScroll = window.scrollY;
    let heroStart = window.scrollY + node.getBoundingClientRect().top - window.innerHeight * 0.65;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (kind === 'parallax') {
          node.style.transform = `translate3d(0, ${(window.scrollY - initialScroll) * 0.1}px, 0)`;
          return;
        }
        const viewHeight = window.innerHeight || 1;
        const progress = clamp((window.scrollY - heroStart) / (node.offsetHeight * 0.8 + viewHeight * 0.1), 0, 1);
        const settle = clamp(progress / 0.62, 0, 1);
        const recede = clamp((progress - 0.62) / 0.38, 0, 1);
        const rotate = 18 * (1 - settle) - 4 * recede;
        const scale = 0.94 + 0.06 * settle - 0.06 * recede;
        const y = 28 * (1 - settle) - 28 * recede;
        node.style.transform = `translate3d(0, ${y}px, 0) rotateX(${rotate}deg) scale(${scale})`;
      });
    };
    const resize = () => {
      heroStart = window.scrollY + node.getBoundingClientRect().top - window.innerHeight * 0.65;
      update();
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', resize);
      node.style.transform = '';
    };
  }, [kind, reduced, ref]);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function ParallaxCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useScrollTransform(ref, 'parallax');
  return <div ref={ref} className={`parallax-card ${className}`}>{children}</div>;
}

const PROOF_FIXTURES = {
  mockpay: {
    id: 'mockpay',
    name: 'mockpay · 1.0 → 2.0',
    repo: 'acme/payments',
    branch: 'main · sha256:7f160e',
    badge: 'PARAM RENAMED',
    title: 'Parameter renamed',
    summary: 'The source parameter has been renamed to payment_method in mockpay v2.0.',
    fromToken: 'source',
    toToken: 'payment_method',
    callsite: 'src/createCharge.js:42:15 · Matched Call Site',
    filename: 'src/createCharge.js : 42',
    diffDigest: 'Deterministic AST diff · sha256:7f160e',
    diffLines: [
      { num: 40, prefix: ' ', text: 'const options = {', type: 'ctx' },
      { num: 41, prefix: '−', text: '  source: source,', type: 'del' },
      { num: 42, prefix: '+', text: '  payment_method: source,', type: 'add' },
      { num: 43, prefix: ' ', text: "  description: 'Order payment'", type: 'ctx' },
      { num: 44, prefix: ' ', text: '};', type: 'ctx' },
    ],
    brokenLines: [
      { num: 40, prefix: ' ', text: 'const options = {', type: 'ctx' },
      { num: 41, prefix: '!', text: '  source: source, // Missing required param in v2', type: 'del' },
      { num: 42, prefix: ' ', text: "  description: 'Order payment'", type: 'ctx' },
      { num: 43, prefix: ' ', text: '};', type: 'ctx' },
    ],
    ast: {
      targetNode: 'PropertyAssignment',
      caller: 'mockpay.charges.create({ ... })',
      location: 'src/createCharge.js:4:40',
      rule: 'Deterministic field rename',
      confidence: '100% AST-verified match',
    },
    testLogs: {
      baseline: `PASS src/createCharge.test.js\n  createCharge\n    √ creates a charge (5 ms)\n    √ passes the payment source through (1 ms)\n    √ creates a refund (1 ms)\n\nTest Suites: 1 passed, 1 total\nTests:       3 passed, 3 total`,
      bump: `FAIL src/createCharge.test.js\n  ● createCharge › creates a charge\n\n    Missing required parameter: payment_method\n\n    > 4 | const charge = await mockpay.charges.create({\n        |                                        ^\n      5 |   amount: amount,\n      6 |   currency: currency,\n      7 |   source: source,\n\nTest Suites: 1 failed, 1 total\nTests:       2 failed, 1 passed, 3 total`,
      verified: `PASS src/createCharge.test.js\n  createCharge\n    √ creates a charge (4 ms)\n    √ passes the payment source through (1 ms)\n    √ creates a refund (1 ms)\n\nTest Suites: 1 passed, 1 total\nTests:       3 passed, 3 total\nTime:        1.42s`,
    },
  },
  lodash: {
    id: 'lodash',
    name: 'lodash · 3.10 → 4.17',
    repo: 'acme/membership',
    branch: 'main · sha256:5e7844',
    badge: 'METHOD RENAMED',
    title: 'Function renamed',
    summary: '_.contains was removed in v4 and renamed to _.includes.',
    fromToken: '_.contains',
    toToken: '_.includes',
    callsite: 'src/membership.js:6:12 · Matched Call Site',
    filename: 'src/membership.js : 6',
    diffDigest: 'Deterministic AST diff · sha256:5e7844',
    diffLines: [
      { num: 4, prefix: ' ', text: 'function isMember(ids, id) {', type: 'ctx' },
      { num: 5, prefix: '−', text: '  return _.contains(ids, id);', type: 'del' },
      { num: 6, prefix: '+', text: '  return _.includes(ids, id);', type: 'add' },
      { num: 7, prefix: ' ', text: '}', type: 'ctx' },
    ],
    brokenLines: [
      { num: 4, prefix: ' ', text: 'function isMember(ids, id) {', type: 'ctx' },
      { num: 5, prefix: '!', text: '  return _.contains(ids, id); // TypeError in v4', type: 'del' },
      { num: 6, prefix: ' ', text: '}', type: 'ctx' },
    ],
    ast: {
      targetNode: 'CallExpression',
      caller: '_.contains(ids, id)',
      location: 'src/membership.js:6:12',
      rule: 'Deterministic method rename',
      confidence: '100% AST-verified match',
    },
    testLogs: {
      baseline: `PASS src/membership.test.js\n  isMember\n    √ finds a present member (3 ms)\n    √ rejects an absent member\n    √ dedupes (1 ms)\n\nTest Suites: 1 passed, 1 total\nTests:       3 passed, 3 total`,
      bump: `FAIL src/membership.test.js\n  ● isMember › finds a present member\n\n    TypeError: _.contains is not a function\n\n    > 6 |   return _.contains(ids, id);\n        |            ^\n\nTest Suites: 1 failed, 1 total\nTests:       2 failed, 1 passed, 3 total`,
      verified: `PASS src/membership.test.js\n  isMember\n    √ finds a present member (3 ms)\n    √ rejects an absent member (1 ms)\n    √ dedupes (1 ms)\n\nTest Suites: 1 passed, 1 total\nTests:       3 passed, 3 total\nTime:        1.28s`,
    },
  },
};

export function HeroDashboard() {
  const ref = useRef<HTMLDivElement>(null);
  useScrollTransform(ref, 'hero');

  const [fixtureKey, setFixtureKey] = useState<'mockpay' | 'lodash'>('mockpay');
  const [step, setStep] = useState<0 | 1 | 2 | 3>(3);
  const [viewTab, setViewTab] = useState<'diff' | 'ast' | 'testLog'>('diff');
  const [isRunning, setIsRunning] = useState(false);
  const [humanApproved, setHumanApproved] = useState(false);

  const fixture = PROOF_FIXTURES[fixtureKey];

  const runProofSimulation = () => {
    if (isRunning) return;
    setIsRunning(true);
    setHumanApproved(false);
    setStep(0);
    setTimeout(() => {
      setStep(1);
      setTimeout(() => {
        setStep(2);
        setTimeout(() => {
          setStep(3);
          setIsRunning(false);
        }, 700);
      }, 700);
    }, 700);
  };

  return (
    <div className="hero-showcase-frame">
      <div className="hero-perspective">
        <div ref={ref} className="dashboard-browser hero-dashboard">
          <div className="browser-bar">
            <div className="browser-dots" aria-hidden="true">
              <i style={{ background: '#ff5f56' }} />
              <i style={{ background: '#ffbd2e' }} />
              <i style={{ background: '#27c93f' }} />
            </div>
            <div className="browser-address-bar">
              <LockIcon size={11} color="#64748b" />
              <span className="address-host">app.trypatchbay.dev</span>
              <span className="address-sep">/</span>
              <span className="address-path">{fixture.repo} / triage</span>
              <span className="address-key">⌘K</span>
            </div>
            <div className="browser-status-group">
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
              <span className="branch-tag">
                <GitBranchIcon size={12} color="#64748b" />
                {fixture.branch}
              </span>
              <span className="demo-label" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <PulseDotIcon color="#10b981" size={7} />
                WORKSPACE ACTIVE
              </span>
            </div>
          </div>

          <div className="hero-stepper-bar">
            <div className="hero-stepper-stages">
              <button
                type="button"
                className={`hero-step-btn${step === 0 ? ' active' : ''}`}
                onClick={() => setStep(0)}
              >
                01 Baseline (Green)
              </button>
              <button
                type="button"
                className={`hero-step-btn${step === 1 ? ' active step-red' : ''}`}
                onClick={() => setStep(1)}
              >
                02 Dependency Bump (Red)
              </button>
              <button
                type="button"
                className={`hero-step-btn${step === 2 ? ' active' : ''}`}
                onClick={() => setStep(2)}
              >
                03 AST Patch
              </button>
              <button
                type="button"
                className={`hero-step-btn${step === 3 ? ' active' : ''}`}
                onClick={() => setStep(3)}
              >
                04 Verified (Green)
              </button>
            </div>
            <button
              type="button"
              className="hero-run-btn"
              onClick={runProofSimulation}
              disabled={isRunning}
            >
              <PulseDotIcon color={isRunning ? '#f59e0b' : '#10b981'} size={6} />
              {isRunning ? 'Running Suite...' : '▶ Run Verification'}
            </button>
          </div>

          <div className="demo-banner">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 600, color: 'var(--navy-deep)' }}>Repository: {fixture.repo}</span>
              <span style={{ color: '#cbd5e1' }}>|</span>
              <span>Default branch: main</span>
              <span style={{ color: '#cbd5e1' }}>|</span>
              <span>Automated AST Triage</span>
            </span>
            <span className="demo-banner-right" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <span>Deterministic AST Engine v3.4</span>
              <span style={{ color: '#cbd5e1' }}>|</span>
              <span style={{ color: '#059669', fontWeight: 600 }}>Review Gate Enforced</span>
            </span>
          </div>

          <div className="dashboard-topline">
            <div>
              <span className="small-label">MIGRATION TRIAGE</span>
              <h2>{fixture.name}</h2>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="status-pill status-pill-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <ScanRadarIcon size={12} color="#059669" />
                AST Match Confirmed
              </span>
              <span className="status-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <FileDiffIcon size={11} color="var(--navy)" />
                PR Ready
              </span>
            </div>
          </div>

          <div className="dashboard-preview-grid">
            {/* Card 1: Change Explanation */}
            <div className="preview-pane">
              <div>
                <div className="pane-header">
                  <span className="small-label">CONTRACT CHANGE</span>
                  <span className="pane-badge pane-badge-warn">
                    <AlertTriangleIcon size={12} color="#b45309" />
                    {fixture.badge}
                  </span>
                </div>
                <h3 style={{ margin: '8px 0 6px', fontSize: '16px', fontWeight: 650 }}>{fixture.title}</h3>
                <p style={{ margin: '0 0 10px', fontSize: '13px', color: 'var(--body)', lineHeight: 1.6 }}>
                  {fixture.summary}
                </p>
                <div className="token-transform">
                  <code>{fixture.fromToken}</code>
                  <span className="transform-arrow">→</span>
                  <code className="token-target">{fixture.toToken}</code>
                </div>
              </div>
              <div className="pane-target-foot">
                <FileDiffIcon size={12} color="#64748b" />
                <span>{fixture.callsite}</span>
              </div>
            </div>

            {/* Card 2: Interactive Code Diff / AST / Test Output Window */}
            <div className="preview-pane code-pane">
              <div>
                <div className="pane-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="code-tab-dot" />
                    <span className="code-filename">{fixture.filename}</span>
                  </div>
                  <div className="code-tab-group">
                    <button
                      type="button"
                      className={`code-view-tab${viewTab === 'diff' ? ' active' : ''}`}
                      onClick={() => setViewTab('diff')}
                    >
                      Diff
                    </button>
                    <button
                      type="button"
                      className={`code-view-tab${viewTab === 'ast' ? ' active' : ''}`}
                      onClick={() => setViewTab('ast')}
                    >
                      AST
                    </button>
                    <button
                      type="button"
                      className={`code-view-tab${viewTab === 'testLog' ? ' active' : ''}`}
                      onClick={() => setViewTab('testLog')}
                    >
                      Log
                    </button>
                  </div>
                </div>

                {viewTab === 'diff' && (
                  <div className="code-body-window">
                    {(step === 1 ? fixture.brokenLines : fixture.diffLines).map((line) => {
                      const isDel = line.type === 'del';
                      const isAdd = line.type === 'add';
                      return (
                        <div
                          key={line.num}
                          className={`code-row${isDel ? ' code-row-del' : ''}${isAdd ? ' code-row-add' : ''}`}
                        >
                          <span className="code-num">{line.num}</span>
                          <span className="code-gutter">{line.prefix}</span>
                          <span className="code-text">{line.text}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {viewTab === 'ast' && (
                  <div className="ast-snippet" style={{ margin: '10px 0' }}>
                    <div className="ast-row">
                      <span className="ast-type">Target Node:</span>
                      <code>{fixture.ast.targetNode}</code>
                    </div>
                    <div className="ast-row">
                      <span className="ast-type">Caller:</span>
                      <code>{fixture.ast.caller}</code>
                    </div>
                    <div className="ast-row">
                      <span className="ast-type">Location:</span>
                      <code>{fixture.ast.location}</code>
                    </div>
                    <div className="ast-row child">
                      <span className="ast-type arrow">↳</span>
                      <span>{fixture.ast.rule}</span>
                      <span className="ast-badge">Verified</span>
                    </div>
                  </div>
                )}

                {viewTab === 'testLog' && (
                  <div style={{ margin: '10px 0', background: '#090d14', borderRadius: 6, padding: '8px 10px', fontSize: '11px', fontFamily: 'monospace', color: '#94a3b8', maxHeight: 110, overflowY: 'auto' }}>
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.45 }}>
                      {step === 0 && fixture.testLogs.baseline}
                      {step === 1 && fixture.testLogs.bump}
                      {step >= 2 && fixture.testLogs.verified}
                    </pre>
                  </div>
                )}
              </div>
              <div className="code-pane-foot">
                <span>{fixture.diffDigest}</span>
              </div>
            </div>

            {/* Card 3: Pre-flight Verification & Review Gate */}
            <div className="preview-pane proof-pane">
              <div>
                <div className="pane-header">
                  <span className="small-label">PRE-FLIGHT VERIFICATION</span>
                  <span className={`pane-badge ${step === 1 ? 'pane-badge-warn' : 'pane-badge-success'}`}>
                    <ShieldCheckIcon size={12} color={step === 1 ? '#b45309' : '#047857'} />
                    {step === 1 ? 'TEST FAILING' : 'PASSED'}
                  </span>
                </div>
                <h3 style={{ margin: '8px 0 6px', fontSize: '16px', fontWeight: 650 }}>Pre-flight Test Suite</h3>
                <div className="proof-metric-list">
                  <div className="proof-metric-item">
                    <div className="metric-left">
                      <span className={`metric-dot ${step === 0 ? 'green' : 'red'}`} />
                      <span>{step === 0 ? 'Baseline suite' : 'Before patch'}</span>
                    </div>
                    <strong className={`metric-val ${step === 0 ? 'green' : 'red'}`}>
                      {step === 0 ? '3 / 3 passing' : '2 failing'}
                    </strong>
                  </div>
                  <div className="proof-metric-item">
                    <div className="metric-left">
                      <span className={`metric-dot ${step >= 2 ? 'green' : 'amber'}`} />
                      <span>After patch</span>
                    </div>
                    <strong className={`metric-val ${step >= 2 ? 'green' : 'amber'}`}>
                      {step >= 2 ? (
                        <>
                          <CheckCircleIcon size={13} color="#059669" />
                          3 / 3 passing
                        </>
                      ) : (
                        'Pending fix...'
                      )}
                    </strong>
                  </div>
                </div>

                <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid var(--rule)' }}>
                  <button
                    type="button"
                    style={{
                      width: '100%',
                      padding: '7px 12px',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: humanApproved ? '1px solid #10b981' : '1px solid #2b59ff',
                      background: humanApproved ? '#ecfdf5' : '#2b59ff',
                      color: humanApproved ? '#065f46' : '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      transition: 'all 0.2s ease',
                    }}
                    onClick={() => setHumanApproved(!humanApproved)}
                  >
                    <CheckCircleIcon size={12} color={humanApproved ? '#065f46' : '#ffffff'} />
                    {humanApproved ? '✓ Approved · Pull Request Ready' : 'Authorize Pull Request Delivery'}
                  </button>
                </div>
              </div>
              <div className="proof-foot-note">
                <span>Isolated Container Sandbox · Digest Verified</span>
                <span className="tamper-proof-tag">Cryptographic Hash Enforced</span>
              </div>
            </div>
          </div>
          <div className="dashboard-foot">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
              AST Pipeline Online · Ready for Human Review
            </span>
            <span>Deterministic Unified Diff · Zero Regressions</span>
          </div>
        </div>
      </div>
    </div>
  );
}


export function ApiMarquee() {
  const names = ['PostgreSQL', 'GitHub', 'Shopify', 'Stripe', 'OpenAI', 'Twilio'];
  const items = [...names, ...names];
  return (
    <section className="marquee-section" aria-label="Examples of APIs it can watch">
      <p className="small-label marquee-label">TRACKED ECOSYSTEM CONTRACTS & UPSTREAM REGISTRIES</p>
      <div className="marquee-clip" tabIndex={0} aria-label="Hover or focus to pause the API name strip">
        <div className="marquee-track">
          {items.map((name, index) => (
            <div key={`${name}-${index}`} className="marquee-brand-item">
              <span className="marquee-brand-icon" aria-hidden="true">
                <BrandIcon name={name} size={22} useBrandColor />
              </span>
              <span className="marquee-brand-name">{name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function LineArt({ variant }: { variant: number }) {
  const paths = [
    <g key="detect"><path d="M32 50h92M124 50l24-24M124 50l24 24" /><circle cx="32" cy="50" r="8" /><circle cx="148" cy="26" r="7" /><circle cx="148" cy="74" r="7" /><path d="M148 26h24M148 74h24" /></g>,
    <g key="map"><rect x="28" y="22" width="52" height="56" rx="5" /><path d="M40 37h28M40 49h20M40 61h23M80 50h38l24-24M118 50l24 24M142 26h20M142 74h20" /><circle cx="166" cy="26" r="5" /><circle cx="166" cy="74" r="5" /></g>,
    <g key="patch"><path d="M30 29h138v43H30zM44 43h36M44 57h78" /><path d="M98 43h55M132 57h22" /><path d="M149 37l7 6-7 6" /></g>,
    <g key="prove"><path d="M28 24h140v54H28zM42 40h50M42 54h75" /><path d="M130 48l8 8 16-18" /><path d="M43 66h68" /></g>,
  ];
  return <svg className="line-art" viewBox="0 0 200 100" role="img" aria-label="Abstract line diagram"> <g>{paths[variant]}</g></svg>;
}

const TAB_DATA = [
  { label: 'Detect', title: 'Start with a recorded change.', body: 'The prototype demonstrates a known breaking change using a bundled API fixture. Live provider watching is in development.' },
  { label: 'Map', title: 'See the affected call sites.', body: 'A local analysis maps detectable usage in the sample project. Dynamic or indirect use can be missed.' },
  { label: 'Patch', title: 'Keep the proposed diff small.', body: 'The fixture demonstrates a targeted rename. Patch generation for arbitrary repositories is in development.' },
  { label: 'Prove', title: 'Review the evidence locally.', body: 'The bundled fixture reruns its own tests. Sandboxed runs and pull request delivery are in development.' },
];

const TAB_ICONS = [ScanRadarIcon, TopologyIcon, FileDiffIcon, ShieldCheckIcon];

const STEP_IMAGES = [
  'https://framerusercontent.com/images/RHsfUQ9mSQJ5F6qbGUl40nif1IM.jpg?width=1200&height=800',
  'https://framerusercontent.com/images/ZklcwB3KmSKgLMzY89upy0vSg.jpg?width=1200&height=800',
  'https://framerusercontent.com/images/OtX7bK3CEtk1U11RkWSaEXmA.jpg?width=1200&height=800',
  'https://framerusercontent.com/images/9V9raZlhFsB0W0u7CYafv8IJUfQ.jpg?width=1200&height=800',
];

const STEP_PREVIEWS = [
  {
    title: 'mockpay · v1.0.0 → v2.0.0',
    badge: 'BREAKING CHANGE',
    sub: 'Parameter renamed: source becomes payment_method in charge creation payload.',
    tag: 'Admitted registry watch',
  },
  {
    title: 'src/createCharge.js : 42',
    badge: 'AST CALL-SITE',
    sub: 'Static syntax analysis traced matching call expression across the repository.',
    tag: '1 exact match found',
  },
  {
    title: 'Deterministic Rename Patch',
    badge: 'AST DIFF GENERATED',
    sub: 'Minimal AST patch scoped strictly to affected parameter identifier.',
    tag: 'sha256:7f160e',
  },
  {
    title: 'Local Fixture Verification',
    badge: 'EVIDENCE VERIFIED',
    sub: 'Proof loop executed in isolated container: 2 failing → 3/3 passing green suite.',
    tag: 'Verified green build',
  },
];

function StepVisualCard({ active }: { active: number }) {
  const imgSrc = STEP_IMAGES[active];
  const preview = STEP_PREVIEWS[active];

  return (
    <div className="step-visual-card">
      <div
        className="step-visual-bg"
        style={{
          backgroundImage: `url('${imgSrc}')`,
        }}
      />
      <div className="step-visual-overlay" />

      <div className="step-glass-card">
        <div className="step-glass-header">
          <div className="step-glass-dots" aria-hidden="true">
            <span style={{ background: '#ff5f56' }} />
            <span style={{ background: '#ffbd2e' }} />
            <span style={{ background: '#27c93f' }} />
          </div>
          <span className="step-glass-tag">{preview.tag}</span>
        </div>

        <div className="step-glass-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span className="step-badge">{preview.badge}</span>
            <span style={{ fontSize: 11, color: '#6b7382', fontWeight: 600 }}>STEP 0{active + 1}</span>
          </div>

          <h4 className="step-glass-title">{preview.title}</h4>

          {active === 2 ? (
            <div className="step-glass-code">
              <div style={{ color: '#ef4444' }}>− source: source,</div>
              <div style={{ color: '#10b981', background: 'rgba(16, 185, 129, 0.15)', padding: '2px 4px', borderRadius: 4 }}>
                + payment_method: source,
              </div>
              <div style={{ color: '#94a3b8' }}>  description: &apos;Order payment&apos;</div>
            </div>
          ) : active === 3 ? (
            <div className="step-glass-proof">
              <div className="proof-check-row">
                <span style={{ color: '#ef4444', fontWeight: 700 }}>✗</span>
                <span style={{ color: '#ef4444' }}>Baseline: 2 failing tests</span>
              </div>
              <div className="proof-check-row">
                <span style={{ color: '#10b981', fontWeight: 700 }}>✓</span>
                <span style={{ color: '#10b981', fontWeight: 600 }}>Verified: 3 / 3 passing</span>
              </div>
            </div>
          ) : active === 1 ? (
            <div className="step-glass-tree">
              <div className="tree-node">
                <TopologyIcon size={12} color="#2b59ff" />
                <span>createCharge(options)</span>
              </div>
              <div className="tree-branch" />
              <div className="tree-node child">
                <span>mockpay.charges.create(&#123; payment_method &#125;)</span>
              </div>
            </div>
          ) : (
            <div className="step-glass-desc">
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} />
                <span style={{ fontWeight: 600, color: '#15171c', fontSize: 13 }}>Parameter rename advisory</span>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: '#6b7382', lineHeight: 1.5 }}>{preview.sub}</p>
            </div>
          )}
        </div>

        <div className="step-glass-foot">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <PulseDotIcon color="#10b981" size={6} />
            AST Engine Active
          </span>
          <span>Single-use reviewable proof</span>
        </div>
      </div>
    </div>
  );
}

export function WorkflowTabs() {
  const [active, setActive] = useState(0);
  const current = TAB_DATA[active];
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const next = (active + (event.key === 'ArrowRight' ? 1 : -1) + TAB_DATA.length) % TAB_DATA.length;
    setActive(next);
    document.getElementById(`workflow-tab-${next}`)?.focus();
  };
  return (
    <div className="workflow-tabs">
      <div className="tab-list" role="tablist" aria-label="Prototype workflow">
        {TAB_DATA.map((tab, index) => {
          const Icon = TAB_ICONS[index % TAB_ICONS.length];
          return (
            <button
              key={tab.label}
              id={`workflow-tab-${index}`}
              role="tab"
              type="button"
              aria-selected={active === index}
              aria-controls="workflow-panel"
              tabIndex={active === index ? 0 : -1}
              onClick={() => setActive(index)}
              onKeyDown={onKeyDown}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <Icon size={14} color={active === index ? 'var(--navy-deep)' : '#737996'} />
              <span>{tab.label}</span>
            </button>
          );
        })}
        <span className="tab-underline" style={{ transform: `translateX(${active * 100}%)` }} />
      </div>
      <div className="workflow-panel" id="workflow-panel" role="tabpanel" aria-labelledby={`workflow-tab-${active}`} key={active}>
        <div><span className="small-label">STEP 0{active + 1}</span><h3>{current.title}</h3><p>{current.body}</p></div>
        <StepVisualCard active={active} />
      </div>
    </div>
  );
}

const CAROUSEL_ICONS = [ScanRadarIcon, TopologyIcon, FileDiffIcon, ShieldCheckIcon];

const CAROUSEL_COVERS = [
  {
    tag: 'Advisory Record',
    badge: 'mockpay · 1.0 → 2.0',
    meta: 'Upstream breaking contract',
  },
  {
    tag: 'AST Call-Site',
    badge: 'src/createCharge.js : 42',
    meta: 'Static syntax expression match',
  },
  {
    tag: 'Deterministic Diff',
    badge: 'sha256:7f160e',
    meta: 'Scoped parameter rename',
  },
  {
    tag: 'Isolated Proof',
    badge: '3 / 3 Passing',
    meta: 'Fail-closed Docker runner',
  },
];

function CarouselBlueprintCover({ index }: { index: number }) {
  if (index === 0) {
    return (
      <div className="carousel-blueprint-cover">
        <div className="cad-grid-overlay" />
        <div className="blueprint-circuit-traces">
          <svg className="blueprint-svg-lines" viewBox="0 0 320 180" fill="none">
            <path d="M 20 90 L 100 90 L 140 40 L 220 40 L 240 70 L 300 70" stroke="rgba(56, 189, 248, 0.4)" strokeWidth="1.5" strokeDasharray="4 4" />
            <path d="M 40 140 L 120 140 L 160 110 L 260 110" stroke="rgba(43, 89, 255, 0.5)" strokeWidth="1.5" />
            <circle cx="100" cy="90" r="3" fill="#38bdf8" />
            <circle cx="140" cy="40" r="3" fill="#38bdf8" />
            <circle cx="240" cy="70" r="3" fill="#60a5fa" />
            <circle cx="160" cy="110" r="3" fill="#2b59ff" />
          </svg>
        </div>
        <div className="blueprint-cad-meta-top">
          <span className="cad-mono-tag">SYS: CONTRACT-DIFF</span>
          <span className="cad-mono-coords">37.77°N // 122.41°W</span>
        </div>
        <div className="blueprint-code-box">
          <div className="blueprint-line">
            <span className="bp-del">- export function createCharge(source: string)</span>
          </div>
          <div className="blueprint-line">
            <span className="bp-add">+ export function createCharge(payment_method: string)</span>
          </div>
        </div>
        <div className="blueprint-cad-meta-bottom">
          <span className="cad-dim-label">LENGTH: 945.2m · CAD-REV: 3.0b</span>
        </div>
      </div>
    );
  }
  if (index === 1) {
    return (
      <div className="carousel-blueprint-cover">
        <div className="cad-grid-overlay" />
        <div className="blueprint-circuit-traces">
          <svg className="blueprint-svg-lines" viewBox="0 0 320 180" fill="none">
            <path d="M 60 40 L 120 70 L 180 70 L 240 120" stroke="rgba(56, 189, 248, 0.45)" strokeWidth="1.5" />
            <path d="M 120 70 L 120 130 L 180 130" stroke="rgba(43, 89, 255, 0.45)" strokeWidth="1.5" strokeDasharray="3 3" />
            <circle cx="60" cy="40" r="3.5" fill="#38bdf8" />
            <circle cx="120" cy="70" r="3.5" fill="#38bdf8" />
            <circle cx="180" cy="70" r="4" fill="#60a5fa" />
            <circle cx="240" cy="120" r="3.5" fill="#10b981" />
            <circle cx="180" cy="130" r="3" fill="#64748b" />
          </svg>
        </div>
        <div className="blueprint-cad-meta-top">
          <span className="cad-mono-tag">AST: SYNTAX-TRAVERSAL</span>
          <span className="cad-mono-coords">NODE: CallExpr[42]</span>
        </div>
        <div className="blueprint-code-box">
          <div className="blueprint-ast-tree">
            <span className="ast-node">Program &gt; CallExpression &gt; Property</span>
            <span className="ast-target">target: Identifier(&quot;source&quot;)</span>
          </div>
        </div>
        <div className="blueprint-cad-meta-bottom">
          <span className="cad-dim-label">DEPTH: 4 · MATCH: EXACT · SCOPE: FILE</span>
        </div>
      </div>
    );
  }
  if (index === 2) {
    return (
      <div className="carousel-blueprint-cover">
        <div className="cad-grid-overlay" />
        <div className="blueprint-circuit-traces">
          <svg className="blueprint-svg-lines" viewBox="0 0 320 180" fill="none">
            <path d="M 30 50 L 90 50 L 130 90 L 210 90 L 250 50 L 290 50" stroke="rgba(56, 189, 248, 0.4)" strokeWidth="1.5" />
            <circle cx="90" cy="50" r="3" fill="#38bdf8" />
            <circle cx="130" cy="90" r="3" fill="#ef4444" />
            <circle cx="210" cy="90" r="3" fill="#10b981" />
            <circle cx="250" cy="50" r="3" fill="#38bdf8" />
          </svg>
        </div>
        <div className="blueprint-cad-meta-top">
          <span className="cad-mono-tag">DIFF: DETERMINISTIC-AST</span>
          <span className="cad-mono-coords">DIGEST: 7f160e</span>
        </div>
        <div className="blueprint-code-box">
          <div className="blueprint-line"><span className="bp-num">42</span><span className="bp-del">- source: source,</span></div>
          <div className="blueprint-line"><span className="bp-num">42</span><span className="bp-add">+ payment_method: source,</span></div>
        </div>
        <div className="blueprint-cad-meta-bottom">
          <span className="cad-dim-label">TRIVIA-PRESERVED · SINGLE-TARGET</span>
        </div>
      </div>
    );
  }
  return (
    <div className="carousel-blueprint-cover">
      <div className="cad-grid-overlay" />
      <div className="blueprint-circuit-traces">
        <svg className="blueprint-svg-lines" viewBox="0 0 320 180" fill="none">
          <path d="M 20 70 L 90 70 L 130 110 L 220 110 L 260 60 L 300 60" stroke="rgba(16, 185, 129, 0.45)" strokeWidth="1.5" />
          <circle cx="90" cy="70" r="3" fill="#10b981" />
          <circle cx="130" cy="110" r="3" fill="#ef4444" />
          <circle cx="220" cy="110" r="3" fill="#10b981" />
          <circle cx="260" cy="60" r="3" fill="#10b981" />
        </svg>
      </div>
      <div className="blueprint-cad-meta-top">
        <span className="cad-mono-tag">PROOF: ISOLATED-MATRIX</span>
        <span className="cad-mono-coords">RUNNER: FAIL-CLOSED</span>
      </div>
      <div className="blueprint-code-box">
        <div className="bp-matrix-row"><span className="bp-mat-status pass">PASS</span><span className="bp-mat-name">01 Baseline (v1.0.4)</span><span className="bp-mat-time">124ms</span></div>
        <div className="bp-matrix-row"><span className="bp-mat-status fail">FAIL</span><span className="bp-mat-name">02 Bumped (v2.0.0)</span><span className="bp-mat-time">18ms</span></div>
        <div className="bp-matrix-row"><span className="bp-mat-status pass">PASS</span><span className="bp-mat-name">03 Patched (AST fix)</span><span className="bp-mat-time">131ms</span></div>
      </div>
      <div className="blueprint-cad-meta-bottom">
        <span className="cad-dim-label">SHA256:7f160e · EVIDENCE-BUNDLE</span>
      </div>
    </div>
  );
}

export function FeatureCarousel({ items }: { items: { title: string; body: string }[] }) {
  const [active, setActive] = useState(0);
  const rail = useRef<HTMLDivElement>(null);
  const move = (next: number) => {
    const index = (next + items.length) % items.length;
    setActive(index);
    rail.current?.querySelector<HTMLElement>(`[data-card-index="${index}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowRight') { event.preventDefault(); move(active + 1); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); move(active - 1); }
  };
  return (
    <div className="carousel-wrap">
      <div className="carousel-controls">
        <button type="button" aria-label="Previous card" onClick={() => move(active - 1)}>Previous</button>
        <span className="carousel-counter">
          <strong>{String(active + 1).padStart(2, '0')}</strong> / {String(items.length).padStart(2, '0')}
        </span>
        <button type="button" aria-label="Next card" onClick={() => move(active + 1)}>Next</button>
      </div>
      <div className="carousel-rail" ref={rail} tabIndex={0} onKeyDown={onKeyDown} aria-label="Product capability cards. Use left and right arrow keys.">
        {items.map((item, index) => {
          const Icon = CAROUSEL_ICONS[index % CAROUSEL_ICONS.length];
          const cover = CAROUSEL_COVERS[index % CAROUSEL_COVERS.length];
          const isActive = active === index;
          return (
            <article
              key={item.title}
              data-card-index={index}
              className={`carousel-card${isActive ? ' active' : ''}`}
              onClick={() => move(index)}
            >
              <span className="cad-corner cad-corner-tl" aria-hidden="true">+</span>
              <span className="cad-corner cad-corner-tr" aria-hidden="true">+</span>
              <span className="cad-corner cad-corner-bl" aria-hidden="true">+</span>
              <span className="cad-corner cad-corner-br" aria-hidden="true">+</span>

              <div className="carousel-card-cover">
                <CarouselBlueprintCover index={index} />
                <div className="carousel-card-overlay" />
                <div className="carousel-cover-glass-tag">
                  <Icon size={12} color="#ffffff" />
                  <span>{cover.tag}</span>
                </div>
                <div className="carousel-cover-bottom-pill">
                  <span>{cover.badge}</span>
                </div>
              </div>

              <div className="carousel-card-content">
                <div className="carousel-card-header">
                  <span className="small-label">CAPABILITY 0{index + 1}</span>
                  <span className="carousel-icon-box">
                    <Icon size={14} color="var(--navy-deep)" />
                  </span>
                </div>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
                <div className="carousel-card-meta">
                  <span className="carousel-meta-dot" />
                  <span>{cover.meta}</span>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

export function UpdatesForm({ id = 'hero-email' }: { id?: string }) {
  const [message, setMessage] = useState('');
  return <form className="updates-form" onSubmit={(event) => { event.preventDefault(); setMessage('Thank you! You have been subscribed to release notes.'); }}>
    <label htmlFor={id} className="sr-only">Email address</label>
    <input id={id} type="email" placeholder="you@company.com" required />
    <button type="submit" className="pill-button pill-button-dark">Get updates</button>
    <span className="form-note" aria-live="polite">{message || 'Product announcements and release notes'}</span>
  </form>;
}
