import type { Metadata } from 'next';
import { PageHeading } from '../components/PageSections';
import { Reveal } from '../components/Experience';

export const metadata: Metadata = {
  title: 'Privacy Policy · trypatchbay',
  description: 'How trypatchbay handles customer data, repository code, and telemetry with privacy-by-design and in-memory parsing.',
};

export default function PrivacyPage() {
  return (
    <div className="content-width" style={{ padding: '48px 0 96px', maxWidth: 840, margin: '0 auto' }}>
      <PageHeading
        eyebrow="LEGAL & DATA PRIVACY"
        title="Privacy Policy"
        description="Effective Date: November 1, 2026 · Last Updated: November 1, 2026"
      />

      <article className="prose" style={{ marginTop: 40, lineHeight: 1.75, color: 'var(--body)' }}>
        <Reveal>
          <section style={{ marginBottom: 36 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--navy-deep)', marginBottom: 12 }}>1. Architectural Privacy by Design</h2>
            <p>
              trypatchbay is engineered around a strict principle: <strong>your source code belongs to you</strong>.
              When our scanner analyzes a repository for breaking dependency changes, files are inspected in-memory during execution.
              We do not store your repository source files on persistent storage disks, nor do we train AI or machine learning models on your private codebase.
            </p>
          </section>

          <section style={{ marginBottom: 36 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--navy-deep)', marginBottom: 12 }}>2. Information We Collect</h2>
            <ul style={{ paddingLeft: 20, display: 'grid', gap: 8 }}>
              <li><strong>Account Credentials:</strong> Work email, organization name, and hashed passwords managed with cryptographic salt.</li>
              <li><strong>GitHub Integration Metadata:</strong> GitHub App installation IDs, repository names, commit SHAs, and branch references needed to deliver approved pull requests.</li>
              <li><strong>Migration Findings:</strong> AST call-site coordinates (file path, line number, column) and SHA-256 diff hashes representing proposed deterministic changes.</li>
              <li><strong>Operational Telemetry:</strong> Anonymized HTTP request logs, rate limit timestamps, and API response latency to maintain system availability and security.</li>
            </ul>
          </section>

          <section style={{ marginBottom: 36 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--navy-deep)', marginBottom: 12 }}>3. Code Execution & Sandboxing Safety</h2>
            <p>
              Arbitrary customer code execution is disabled on application hosts. Full red-to-green test verifications run in isolated environments
              only for qualified internal fixtures. When remote microVM workers are provisioned, execution runs inside ephemeral, network-isolated
              sandboxes that are completely destroyed upon completion.
            </p>
          </section>

          <section style={{ marginBottom: 36 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--navy-deep)', marginBottom: 12 }}>4. Data Retention & Deletion</h2>
            <p>
              You maintain total control over your data. If you disconnect a repository or terminate your trypatchbay account,
              associated watch targets, call-site findings, and single-use approvals are immediately purged from our PostgreSQL database.
            </p>
          </section>

          <section style={{ marginBottom: 36 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--navy-deep)', marginBottom: 12 }}>5. Third-Party Service Providers</h2>
            <p>
              We partner with trusted enterprise infrastructure providers to deliver trypatchbay:
            </p>
            <ul style={{ paddingLeft: 20, display: 'grid', gap: 8 }}>
              <li><strong>Neon Inc.:</strong> Serverless PostgreSQL storage located in AWS US-East (IAD) with encrypted storage at rest and in transit.</li>
              <li><strong>Vercel Inc.:</strong> Application edge routing and secure serverless API execution.</li>
              <li><strong>GitHub Inc.:</strong> Authenticated GitHub App installation and pull request delivery APIs.</li>
              <li><strong>Stripe Inc.:</strong> Payment processing and subscription management (credit card numbers are never stored on trypatchbay servers).</li>
            </ul>
          </section>

          <section style={{ marginBottom: 36 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--navy-deep)', marginBottom: 12 }}>6. Contact & Data Protection Officer</h2>
            <p>
              For privacy inquiries, GDPR data export requests, or security disclosures, reach our team at{' '}
              <a href="mailto:privacy@trypatchbay.dev" style={{ color: 'var(--blue-accent)', textDecoration: 'underline' }}>
                privacy@trypatchbay.dev
              </a>.
            </p>
          </section>
        </Reveal>
      </article>
    </div>
  );
}
