export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#FFF8F3] text-[#1A1A1A] scroll-smooth">

      {/* Hero - Split Screen */}
      <section className="min-h-screen grid lg:grid-cols-2">
        <div className="px-6 lg:px-16 pt-16 lg:pt-20 pb-20 flex flex-col justify-center">
          <span className="inline-block bg-[#FFF0EB] text-[#E85D3D] px-3 py-1.5 text-xs font-semibold uppercase tracking-wider rounded mb-6 w-fit">
            Local Fixture Demo
          </span>
          <h1 className="text-4xl lg:text-[52px] font-semibold leading-[1.1] tracking-[-2px] mb-6">
            Automated dependency updates, verified.
          </h1>
          <p className="text-lg text-[#6B6B6B] mb-10 max-w-md">
            Demonstrates detecting breaking changes in mockpay, mapping affected call sites, and preparing a tested patch.
          </p>
          <a href="#problem" className="inline-block bg-[#E85D3D] text-white px-8 py-4 font-semibold text-[15px] rounded-md w-fit hover:bg-[#D14D2D] transition-colors">
            See the problem
          </a>
        </div>
        <div className="hidden lg:flex bg-[#FFF0EB] items-center justify-center p-16">
          <div className="bg-[#1A1A1A] rounded-xl overflow-hidden w-full max-w-lg shadow-2xl">
            <div className="bg-[#2A2A2A] px-4 py-3 flex gap-2">
              <div className="w-3 h-3 rounded-full bg-[#FF5F56]" />
              <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
              <div className="w-3 h-3 rounded-full bg-[#27CA40]" />
            </div>
            <div className="p-6 font-mono text-[13px] leading-[1.8] text-[#A0A0A0]">
              <div className="text-[#666]">{'// fixture: createCharge.js'}</div>
              <div className="text-[#666]">{'// mockpay v1 → v2'}</div>
              <div className="mt-4 text-[#FF6B6B]">- mockpay.charges.create({'{'}</div>
              <div className="text-[#FF6B6B]">-   source: token</div>
              <div className="text-[#FF6B6B]">- {'}'})</div>
              <div className="mt-4 text-[#51CF66]">+ mockpay.charges.create({'{'}</div>
              <div className="text-[#51CF66]">+   payment_method: token</div>
              <div className="text-[#51CF66]">+ {'}'})</div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section id="problem" className="py-24 px-6 lg:px-16 max-w-6xl mx-auto">
        <div className="text-[#E85D3D] text-[13px] uppercase tracking-[2px] mb-4">The Problem</div>
        <h2 className="text-4xl font-semibold tracking-[-1px] mb-8">Breaking API changes break production.</h2>
        <div className="grid lg:grid-cols-2 gap-12">
          <div className="space-y-6">
            <p className="text-lg text-[#6B6B6B]">
              When a dependency releases a breaking change, the burden falls on your team to discover it, find affected code, and fix it before users are impacted.
            </p>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="w-8 h-8 bg-[#FFF0EB] rounded-full flex items-center justify-center text-[#E85D3D] font-semibold text-sm shrink-0">1</div>
                <div>
                  <h4 className="font-semibold mb-1">Silent releases</h4>
                  <p className="text-sm text-[#6B6B6B]">Breaking changes ship in minor versions. Release notes go unread.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 bg-[#FFF0EB] rounded-full flex items-center justify-center text-[#E85D3D] font-semibold text-sm shrink-0">2</div>
                <div>
                  <h4 className="font-semibold mb-1">Hidden impact</h4>
                  <p className="text-sm text-[#6B6B6B]">Finding which code uses changed APIs requires manual search.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 bg-[#FFF0EB] rounded-full flex items-center justify-center text-[#E85D3D] font-semibold text-sm shrink-0">3</div>
                <div>
                  <h4 className="font-semibold mb-1">Risky fixes</h4>
                  <p className="text-sm text-[#6B6B6B]">Manual patches may miss edge cases or introduce new bugs.</p>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white border border-[#F0E6DE] rounded-xl p-8">
            <h4 className="font-semibold mb-4">Example: Stripe Charges API deprecation</h4>
            <p className="text-sm text-[#6B6B6B] mb-4">
              Stripe deprecated the Charges API for creating payments, requiring migration to the PaymentIntents API. The migration involves mapping <code className="bg-[#FFF0EB] px-1.5 py-0.5 rounded text-[#E85D3D]">charge.source.id</code> to <code className="bg-[#FFF0EB] px-1.5 py-0.5 rounded text-[#E85D3D]">charge.payment_method</code> and updating integration code.
            </p>
            <p className="text-sm text-[#6B6B6B]">
              Teams must identify affected code, understand the new API structure, and verify their changes work correctly.
            </p>
            <a href="https://docs.stripe.com/payments/payment-intents/migration/charges" target="_blank" rel="noopener" className="inline-block mt-4 text-sm text-[#E85D3D] font-medium hover:underline">
              View Stripe migration guide →
            </a>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section id="solution" className="py-24 px-6 lg:px-16 max-w-6xl mx-auto border-t border-[#F0E6DE]">
        <div className="text-[#E85D3D] text-[13px] uppercase tracking-[2px] mb-4">The Solution</div>
        <h2 className="text-4xl font-semibold tracking-[-1px] mb-16">Automated detection, mapping, and patching.</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="p-8 bg-white border border-[#F0E6DE] rounded-xl">
            <div className="text-5xl font-semibold text-[#E85D3D] leading-none mb-5">1</div>
            <h3 className="text-lg font-semibold mb-3">Detect</h3>
            <p className="text-sm text-[#6B6B6B]">Local fixture: simulates detecting mockpay 2.0.0 breaking change.</p>
          </div>
          <div className="p-8 bg-white border border-[#F0E6DE] rounded-xl">
            <div className="text-5xl font-semibold text-[#E85D3D] leading-none mb-5">2</div>
            <h3 className="text-lg font-semibold mb-3">Map</h3>
            <p className="text-sm text-[#6B6B6B]">Local fixture: maps 2 call sites in sample repo.</p>
          </div>
          <div className="p-8 bg-white border border-[#F0E6DE] rounded-xl">
            <div className="text-5xl font-semibold text-[#E85D3D] leading-none mb-5">3</div>
            <h3 className="text-lg font-semibold mb-3">Patch</h3>
            <p className="text-sm text-[#6B6B6B]">Local fixture: renames source → payment_method.</p>
          </div>
          <div className="p-8 bg-white border border-[#F0E6DE] rounded-xl">
            <div className="text-5xl font-semibold text-[#E85D3D] leading-none mb-5">4</div>
            <h3 className="text-lg font-semibold mb-3">Verify</h3>
            <p className="text-sm text-[#6B6B6B]">Local fixture: runs 3 scenarios to verify patch.</p>
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section id="demo" className="py-24 px-6 lg:px-16 max-w-6xl mx-auto border-t border-[#F0E6DE]">
        <div className="text-[#E85D3D] text-[13px] uppercase tracking-[2px] mb-4">Fixture Demo</div>
        <h2 className="text-4xl font-semibold tracking-[-1px] mb-8">Before and after.</h2>
        <div className="grid lg:grid-cols-2 gap-8">
          <div>
            <h4 className="font-semibold mb-4 text-[#DC2626]">Before (mockpay v1)</h4>
            <div className="bg-[#1A1A1A] rounded-xl p-6 font-mono text-sm overflow-x-auto">
              <div className="text-[#666]">{'// createCharge.js'}</div>
              <div className="mt-2 text-[#A0A0A0]">const charge = await mockpay.charges.create({'{'}</div>
              <div className="text-[#A0A0A0]">  amount: 2000,</div>
              <div className="text-[#FF6B6B]">  source: token.id</div>
              <div className="text-[#A0A0A0]">{'}'});</div>
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-[#059669]">After (mockpay v2 - patched)</h4>
            <div className="bg-[#1A1A1A] rounded-xl p-6 font-mono text-sm overflow-x-auto">
              <div className="text-[#666]">{'// createCharge.js'}</div>
              <div className="mt-2 text-[#A0A0A0]">const charge = await mockpay.charges.create({'{'}</div>
              <div className="text-[#A0A0A0]">  amount: 2000,</div>
              <div className="text-[#51CF66]">  payment_method: token.id</div>
              <div className="text-[#A0A0A0]">{'}'});</div>
            </div>
          </div>
        </div>
        <div className="mt-8 bg-white border border-[#F0E6DE] rounded-xl overflow-hidden">
          <div className="grid grid-cols-3 px-8 py-6 bg-[#FFF0EB] font-semibold text-[13px] uppercase tracking-wider">
            <span>Metric</span>
            <span>Value</span>
            <span>Status</span>
          </div>
          <div className="grid grid-cols-3 px-8 py-6 border-b border-[#F0E6DE] items-center">
            <span className="text-[#6B6B6B] text-sm">Call sites mapped</span>
            <span className="font-semibold text-2xl">2</span>
            <span className="text-[#059669]">✓</span>
          </div>
          <div className="grid grid-cols-3 px-8 py-6 border-b border-[#F0E6DE] items-center">
            <span className="text-[#6B6B6B] text-sm">Scenarios verified</span>
            <span className="font-semibold text-2xl">3/3</span>
            <span className="text-[#059669]">✓</span>
          </div>
          <div className="grid grid-cols-3 px-8 py-6 items-center">
            <span className="text-[#6B6B6B] text-sm">Patches generated</span>
            <span className="font-semibold text-2xl">1</span>
            <span className="text-[#059669]">✓</span>
          </div>
        </div>
      </section>

      {/* References Section */}
      <section id="references" className="py-24 px-6 lg:px-16 max-w-6xl mx-auto border-t border-[#F0E6DE]">
        <div className="text-[#E85D3D] text-[13px] uppercase tracking-[2px] mb-4">References</div>
        <h2 className="text-4xl font-semibold tracking-[-1px] mb-8">Learn more.</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <a href="https://docs.stripe.com/payments/payment-intents/migration/charges" target="_blank" rel="noopener" className="block p-6 bg-white border border-[#F0E6DE] rounded-xl hover:border-[#E85D3D] transition-colors">
            <h4 className="font-semibold mb-2">Stripe Charges to PaymentIntents Migration</h4>
            <p className="text-sm text-[#6B6B6B]">Official guide for migrating from deprecated Charges API to PaymentIntents API.</p>
          </a>
          <a href="https://docs.github.com/en/code-security/dependabot" target="_blank" rel="noopener" className="block p-6 bg-white border border-[#F0E6DE] rounded-xl hover:border-[#E85D3D] transition-colors">
            <h4 className="font-semibold mb-2">GitHub Dependabot</h4>
            <p className="text-sm text-[#6B6B6B]">Automated dependency updates for security vulnerabilities.</p>
          </a>
          <a href="https://semver.org/" target="_blank" rel="noopener" className="block p-6 bg-white border border-[#F0E6DE] rounded-xl hover:border-[#E85D3D] transition-colors">
            <h4 className="font-semibold mb-2">Semantic Versioning</h4>
            <p className="text-sm text-[#6B6B6B]">Understanding MAJOR.MINOR.PATCH version semantics.</p>
          </a>
          <div className="p-6 bg-[#FFF0EB] border border-[#E85D3D] rounded-xl">
            <h4 className="font-semibold mb-2 text-[#E85D3D]">Fixture Scope</h4>
            <p className="text-sm text-[#6B6B6B]">This demo uses a controlled local fixture with mockpay package. It does not connect to live npm registries or real payment providers.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
