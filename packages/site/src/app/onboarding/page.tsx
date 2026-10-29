import Link from 'next/link';
import { PageHeading } from '../components/PageSections';
import { Reveal } from '../components/Experience';
import { BrandIcon } from '../components/BrandIcons';

export default function OnboardingPage() {
  const steps = [
    {
      title: 'Choose a repository',
      body: 'App installation is not implemented, and neither is a repository connection flow.',
      icons: ['github'],
    },
    {
      title: 'Select API dependencies',
      body: 'Live dependency watching has not been implemented. Planned support covers breaking API migrations.',
      icons: ['postgresql', 'shopify', 'stripe', 'openai', 'twilio'],
    },
    {
      title: 'Review the evidence',
      body: 'Sandboxed runs and pull request delivery are in development.',
      icons: ['npm', 'nodejs', 'typescript'],
    },
  ];

  return (
    <section className="section-block content-width">
      <PageHeading
        eyebrow="Planned onboarding preview"
        title="Repository setup is in development."
        description="There is no live repository connection or installation flow. This page outlines the intended steps without requesting access."
      />
      <div className="feature-grid onboarding-grid">
        {steps.map((step, index) => (
          <Reveal key={step.title} delay={index * 80}>
            <article className="feature-card onboarding-card">
              <div className="onboarding-step-icons">
                {step.icons.map((icon) => (
                  <span key={icon} className="onboarding-icon-pill" title={icon}>
                    <BrandIcon name={icon} size={20} useBrandColor />
                  </span>
                ))}
              </div>
              <span className="small-label">PLANNED STEP 0{index + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </article>
          </Reveal>
        ))}
      </div>
      <Reveal className="onboarding-link">
        <Link className="pill-button pill-button-dark" href="/docs/getting-started">
          Read setup status
        </Link>
      </Reveal>
    </section>
  );
}
