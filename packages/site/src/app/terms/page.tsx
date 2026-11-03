import type { Metadata } from 'next';
import { PageHeading } from '../components/PageSections';
import { Reveal } from '../components/Experience';

export const metadata: Metadata = {
  title: 'Terms of Service · trypatchbay',
  description: 'Terms and conditions governing the use of the trypatchbay migration and dependency triage platform.',
};

export default function TermsPage() {
  return (
    <div className="content-width" style={{ padding: '48px 0 96px', maxWidth: 840, margin: '0 auto' }}>
      <PageHeading
        eyebrow="LEGAL AGREEMENT"
        title="Terms of Service"
        description="Effective Date: November 1, 2026 · Last Updated: November 1, 2026"
      />

      <article className="prose" style={{ marginTop: 40, lineHeight: 1.75, color: 'var(--body)' }}>
        <Reveal>
          <section style={{ marginBottom: 36 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--navy-deep)', marginBottom: 12 }}>1. Agreement to Terms</h2>
            <p>
              By accessing or using trypatchbay, you agree to be bound by these Terms of Service.
              If you are agreeing on behalf of an organization, you represent and warrant that you have the authority
              to bind that organization to these terms.
            </p>
          </section>

          <section style={{ marginBottom: 36 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--navy-deep)', marginBottom: 12 }}>2. Description of the Service</h2>
            <p>
              trypatchbay provides developer tooling for static AST analysis, dependency manifest scanning, breaking change classification,
              deterministic patch generation, and GitHub pull request delivery. The service is designed to support human engineering review
              and does not replace thorough human code review and integration testing.
            </p>
          </section>

          <section style={{ marginBottom: 36 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--navy-deep)', marginBottom: 12 }}>3. Account & Repository Authorization</h2>
            <p>
              You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur
              under your account. You warrant that you possess all necessary rights, licenses, and permissions to connect and scan
              the GitHub repositories you authorize.
            </p>
          </section>

          <section style={{ marginBottom: 36 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--navy-deep)', marginBottom: 12 }}>4. Human Review & Pull Request Delivery</h2>
            <p>
              trypatchbay operates on a review-first gate: deterministic patches require explicit human operator approval
              binding to the exact diff hash before pull requests are delivered to your repository. You acknowledge that you retain final
              responsibility for testing, reviewing, and merging any code generated or proposed by the service.
            </p>
          </section>

          <section style={{ marginBottom: 36 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--navy-deep)', marginBottom: 12 }}>5. Subscription Plans & Payments</h2>
            <p>
              Free accounts are provided subject to team and repository limits. Paid plans (Growth and Business) are billed in advance
              on a recurring monthly or annual basis via Stripe. You may cancel your subscription at any time through the billing dashboard.
            </p>
          </section>

          <section style={{ marginBottom: 36 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--navy-deep)', marginBottom: 12 }}>6. Warranty Disclaimer & Limitation of Liability</h2>
            <p>
              THE SERVICE IS PROVIDED ON AN &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; BASIS WITHOUT WARRANTIES OF ANY KIND.
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, TRYPATCHBAY SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL,
              CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, DATA, USE, OR GOODWILL.
            </p>
          </section>

          <section style={{ marginBottom: 36 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--navy-deep)', marginBottom: 12 }}>7. Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of the State of Delaware,
              without regard to its conflict of law provisions.
            </p>
          </section>
        </Reveal>
      </article>
    </div>
  );
}
