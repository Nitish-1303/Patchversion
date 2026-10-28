'use client';

import {
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react';

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
    if (reduced || !('IntersectionObserver' in window)) {
      setVisible(true);
      return;
    }
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
    if (reduced) {
      setShown(value);
      return;
    }
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

  return <span ref={ref}>{shown}{suffix}</span>;
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
    let initialScroll = window.scrollY;
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

export function HeroDashboard() {
  const ref = useRef<HTMLDivElement>(null);
  useScrollTransform(ref, 'hero');
  return (
    <div className="hero-perspective">
      <div ref={ref} className="dashboard-browser hero-dashboard">
        <div className="browser-bar">
          <div className="browser-dots" aria-hidden="true"><i /><i /><i /></div>
          <span>trypatchbay · local proof preview</span>
          <span className="demo-label">BUNDLED FIXTURE · LOCAL RUN</span>
        </div>
        <div className="demo-banner">Bundled fixture only · no live repository watching</div>
        <div className="dashboard-topline"><div><span className="small-label">CHANGE REVIEW</span><h2>mockpay · 1.0 → 2.0</h2></div><span className="status-pill">Local fixture</span></div>
        <div className="dashboard-preview-grid">
          <div className="preview-pane"><span className="small-label">CHANGE</span><h3>Parameter renamed</h3><p><code>source</code> becomes <code>payment_method</code> in a bundled example.</p><div className="preview-rule" /><p className="muted">Example call site · src/createCharge.js</p></div>
          <div className="preview-pane code-pane"><span className="small-label">ILLUSTRATIVE DIFF</span><div className="diff-line">− source: source,</div><div className="diff-line diff-added">+ payment_method: source,</div><div className="diff-line faded-line">  description: 'Order payment'</div></div>
          <div className="preview-pane proof-pane"><span className="small-label">LOCAL FIXTURE CHECK</span><h3>Proof stays reviewable</h3><div className="proof-row"><span>Before patch</span><strong>2 failing</strong></div><div className="proof-row"><span>After patch</span><strong>3 / 3 passing</strong></div><p className="muted">Example fixture output · not a live run</p></div>
        </div>
        <div className="dashboard-foot"><span>Local prototype</span><span>Reviewable diff · example test output</span></div>
      </div>
    </div>
  );
}

export function ApiMarquee() {
  const names = ['Stripe', 'OpenAI', 'Twilio', 'PostgreSQL', 'GitHub', 'Shopify'];
  const items = [...names, ...names];
  return (
    <section className="marquee-section" aria-label="Examples of APIs it can watch">
      <p className="small-label marquee-label">APIs IT CAN WATCH · EXAMPLES ONLY · NO LIVE INTEGRATIONS</p>
      <div className="marquee-clip" tabIndex={0} aria-label="Hover or focus to pause the API name strip">
        <div className="marquee-track">{items.map((name, index) => <span key={`${name}-${index}`}>{name}</span>)}</div>
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
        {TAB_DATA.map((tab, index) => <button key={tab.label} id={`workflow-tab-${index}`} role="tab" type="button" aria-selected={active === index} aria-controls="workflow-panel" tabIndex={active === index ? 0 : -1} onClick={() => setActive(index)} onKeyDown={onKeyDown}>{tab.label}</button>)}
        <span className="tab-underline" style={{ transform: `translateX(${active * 100}%)` }} />
      </div>
      <div className="workflow-panel" id="workflow-panel" role="tabpanel" aria-labelledby={`workflow-tab-${active}`} key={active}>
        <div><span className="small-label">STEP 0{active + 1}</span><h3>{current.title}</h3><p>{current.body}</p></div>
        <div className="line-art-panel"><LineArt variant={active} /><p>Local sample workflow · conceptual view</p></div>
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
      <div className="carousel-controls"><button type="button" aria-label="Previous card" onClick={() => move(active - 1)}>Previous</button><span>{String(active + 1).padStart(2, '0')} / {String(items.length).padStart(2, '0')}</span><button type="button" aria-label="Next card" onClick={() => move(active + 1)}>Next</button></div>
      <div className="carousel-rail" ref={rail} tabIndex={0} onKeyDown={onKeyDown} aria-label="Product capability cards. Use left and right arrow keys.">
        {items.map((item, index) => <article key={item.title} data-card-index={index} className={`carousel-card${active === index ? ' active' : ''}`} onClick={() => move(index)}><span className="small-label">CAPABILITY 0{index + 1}</span><h3>{item.title}</h3><p>{item.body}</p></article>)}
      </div>
    </div>
  );
}

export function UpdatesForm({ id = 'hero-email' }: { id?: string }) {
  const [message, setMessage] = useState('');
  return <form className="updates-form" onSubmit={(event) => { event.preventDefault(); setMessage('Email updates are not connected in this prototype yet.'); }}>
    <label htmlFor={id} className="sr-only">Email address</label>
    <input id={id} type="email" placeholder="you@company.com" required />
    <button type="submit" className="pill-button pill-button-dark">Get updates</button>
    <span className="form-note" aria-live="polite">{message || 'Product updates · signups are not connected yet'}</span>
  </form>;
}
