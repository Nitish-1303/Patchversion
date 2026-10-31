import Link from 'next/link';
import { ParallaxCard, Reveal } from './Experience';

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
        {cards.map((card, index) => <Reveal key={card.title} delay={index * 80}><article className="feature-card"><span className="small-label">{card.eyebrow || `POINT 0${index + 1}`}</span><h3>{card.title}</h3><p>{card.body}</p></article></Reveal>)}
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
              <span className="small-label">{featured.eyebrow || 'CORE CAPABILITY'}</span>
              <h3>{featured.title}</h3>
              <p>{featured.body}</p>
              <div className="bento-highlight-badge">AST Verification Engine</div>
            </article>
          </Reveal>
        )}
        <div className="bento-stacked-col">
          {rest.map((card, idx) => (
            <Reveal key={card.title} delay={(idx + 1) * 80}>
              <article className="bento-card">
                <span className="small-label">{card.eyebrow || `POINT 0${idx + 2}`}</span>
                <h3>{card.title}</h3>
                <p>{card.body}</p>
              </article>
            </Reveal>
          ))}
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
  lines = ['Change recorded', 'Call sites mapped', 'Local fixture checked'],
}: {
  eyebrow: string;
  title: string;
  body: string;
  caption: string;
  reverse?: boolean;
  lines?: string[];
}) {
  return (
    <section className={`split-section content-width${reverse ? ' reverse' : ''}`}>
      <Reveal className="split-copy"><span className="eyebrow-chip">{eyebrow}</span><h2>{title}</h2><p>{body}</p></Reveal>
      <ParallaxCard className="split-art-wrap">
        <div className="split-art-card">
          <span className="small-label">LOCAL PROTOTYPE VIEW</span>
          <div className="mini-flow">{lines.map((line, index) => <Reveal key={line} delay={index * 80}><div className="mini-flow-row"><span className="mini-flow-number">0{index + 1}</span><span>{line}</span></div></Reveal>)}</div>
          <p className="art-caption">{caption}</p>
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
        <Reveal className="band-device" delay={100}><div className="band-device-top"><span>trypatchbay / local preview</span><span>Illustrative</span></div><div className="band-device-body"><div className="band-device-title">A change, made reviewable.</div><div className="band-lines"><i /><i /><i /><i /></div><div className="band-device-foot">Live repository connections are in development.</div></div></Reveal>
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
    </>
  );
}
