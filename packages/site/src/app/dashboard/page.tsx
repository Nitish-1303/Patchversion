export default function DashboardPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Demo banner */}
      <div className="bg-warning-bg border border-warning/20 rounded-lg px-4 py-3 mb-8">
        <p className="text-sm text-warning font-medium">
          DEMO DATA - NOT A LIVE REPOSITORY SCAN. This dashboard displays simulated fixtures
          to demonstrate the interface. No repositories are connected.
        </p>
      </div>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-text-secondary">Workspace: demo-workspace</p>
        </div>
        <a href="/signup" className="btn-primary text-sm">Connect a Repository</a>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Monitored APIs" value="3" />
        <StatCard label="Connected Repos" value="1" />
        <StatCard label="Detected Changes" value="2" />
        <StatCard label="Pending Review" value="1" />
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Detected Changes */}
          <section>
            <h2 className="text-lg font-semibold mb-4">Recent Changes</h2>
            <div className="space-y-3">
              <ChangeCard
                package="stripe-node"
                from="14.2.0"
                to="15.0.0"
                severity="breaking"
                time="2 hours ago"
                affectedFiles={2}
                status="fix-verified"
              />
              <ChangeCard
                package="openai"
                from="4.28.0"
                to="4.29.0"
                severity="feature"
                time="6 hours ago"
                affectedFiles={0}
                status="no-impact"
              />
            </div>
          </section>

          {/* Proposed PR */}
          <section>
            <h2 className="text-lg font-semibold mb-4">Proposed Pull Requests</h2>
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-medium">Fix: stripe-node 14.2.0 to 15.0.0</h3>
                  <p className="text-sm text-text-secondary">acme/payments - 2 call sites affected</p>
                </div>
                <span className="badge-success">Tests: 15/15 passed</span>
              </div>

              <div className="code-block text-xs mb-4">
                <div className="text-text-tertiary">// src/createCharge.ts</div>
                <div className="text-error">- source: &apos;tok_visa&apos;,</div>
                <div className="text-success">+ payment_method: &apos;tok_visa&apos;,</div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-xs text-text-tertiary">
                  Coverage: 2 of 2 call sites verified | Sandbox: isolated
                </div>
                <div className="flex gap-2">
                  <button className="btn-secondary text-xs" disabled title="Demo mode - no real PR">View Full Diff</button>
                  <button className="btn-primary text-xs" disabled title="Demo mode - no real PR">Review PR</button>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Monitored APIs */}
          <section className="card">
            <h3 className="font-semibold mb-4">Monitored APIs</h3>
            <div className="space-y-3">
              <MonitoredAPI name="stripe-node" version="14.2.0" status="watching" />
              <MonitoredAPI name="openai" version="4.28.0" status="watching" />
              <MonitoredAPI name="twilio" version="4.20.0" status="paused" />
            </div>
          </section>

          {/* Activity */}
          <section className="card">
            <h3 className="font-semibold mb-4">Activity</h3>
            <div className="space-y-3 text-sm">
              <ActivityItem text="Breaking change detected in stripe-node@15.0.0" time="2h ago" />
              <ActivityItem text="Impact analysis completed for acme/payments" time="2h ago" />
              <ActivityItem text="Fix generated and verified in sandbox" time="2h ago" />
              <ActivityItem text="Feature release detected in openai@4.29.0" time="6h ago" />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card text-center">
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-sm text-text-secondary">{label}</p>
    </div>
  );
}

function ChangeCard({ package: pkg, from, to, severity, time, affectedFiles, status }: {
  package: string; from: string; to: string; severity: string; time: string;
  affectedFiles: number; status: string;
}) {
  return (
    <div className="card flex items-center justify-between">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium">{pkg}</span>
          <span className="text-sm text-text-secondary">{from} → {to}</span>
          <span className={severity === 'breaking' ? 'badge-breaking' : 'badge-feature'}>
            {severity}
          </span>
        </div>
        <p className="text-xs text-text-tertiary">{time} - {affectedFiles} file{affectedFiles !== 1 ? 's' : ''} affected</p>
      </div>
      <span className={`text-xs font-medium ${status === 'fix-verified' ? 'text-success' : 'text-text-tertiary'}`}>
        {status === 'fix-verified' ? 'Fix Verified' : 'No Impact'}
      </span>
    </div>
  );
}

function MonitoredAPI({ name, version, status }: { name: string; version: string; status: string }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium">{name}</p>
        <p className="text-xs text-text-tertiary">v{version}</p>
      </div>
      <span className={`w-2 h-2 rounded-full ${status === 'watching' ? 'bg-success' : 'bg-text-tertiary'}`} />
    </div>
  );
}

function ActivityItem({ text, time }: { text: string; time: string }) {
  return (
    <div className="flex justify-between">
      <p className="text-text-secondary">{text}</p>
      <p className="text-text-tertiary text-xs flex-shrink-0 ml-2">{time}</p>
    </div>
  );
}
