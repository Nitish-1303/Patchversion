import Link from 'next/link';
import { PageHeading } from '../components/PageSections';
import { Reveal } from '../components/Experience';

export default function OnboardingPage() {
  return <section className="section-block content-width"><PageHeading eyebrow="Planned onboarding preview" title="Repository setup is in development." description="There is no live repository connection or installation flow. This page outlines the intended steps without requesting access." /><div className="feature-grid onboarding-grid">{[
    ['Choose a repository', 'App installation is not implemented, and neither is a repository connection flow.'],
    ['Select API dependencies', 'Live dependency watching has not been implemented.'],
    ['Review the evidence', 'Sandboxed runs and pull request delivery are in development.'],
  ].map(([title, body], index) => <Reveal key={title} delay={index * 80}><article className="feature-card"><span className="small-label">PLANNED STEP 0{index + 1}</span><h3>{title}</h3><p>{body}</p></article></Reveal>)}</div><Reveal className="onboarding-link"><Link className="pill-button pill-button-dark" href="/dashboard">View the illustrative demo</Link></Reveal></section>;
}
