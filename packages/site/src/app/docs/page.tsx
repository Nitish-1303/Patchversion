import Link from 'next/link';
import { Reveal } from '../components/Experience';
import { PageHeading } from '../components/PageSections';

const docs = [
  { href: '/docs/getting-started', title: 'Getting started', body: 'What the local fixture can do and how to inspect the demo.' },
  { href: '/docs/security', title: 'Security and execution', body: 'Current access boundaries and planned safeguards.' },
  { href: '/docs/concepts', title: 'Core concepts', body: 'Change records, call-site mapping and local proof.' },
];

export default function DocsPage() {
  return <section className="section-block content-width docs-home"><PageHeading eyebrow="DOCUMENTATION" title="A guide to the prototype." description="These docs describe the local fixture and planned workflow. Hosted accounts, repository access and live monitoring are not available." /><div className="feature-grid">{docs.map((doc, index) => <Reveal key={doc.href} delay={index * 80}><Link href={doc.href} className="feature-card docs-card"><span className="small-label">DOCS 0{index + 1}</span><h3>{doc.title}</h3><p>{doc.body}</p><span className="text-link">Read article</span></Link></Reveal>)}</div></section>;
}
