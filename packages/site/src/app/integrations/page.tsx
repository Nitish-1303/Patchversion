export default function IntegrationsPage() {
  const integrations = [
    { name: 'GitHub', category: 'Git Platform', purpose: 'Repository access, PR creation, webhook events', status: 'planned', description: 'Connect repositories for monitoring, impact analysis, and automated PR creation.' },
    { name: 'npm Registry', category: 'API Provider', purpose: 'Package version tracking and changelog parsing', status: 'planned', description: 'Monitor npm packages for new releases and breaking changes.' },
    { name: 'OpenAPI', category: 'API Provider', purpose: 'Spec-based change detection', status: 'planned', description: 'Register OpenAPI specifications as monitoring sources.' },
    { name: 'Slack', category: 'Notifications', purpose: 'Team alerts for detected changes', status: 'planned', description: 'Send notifications when breaking changes affect your repositories.' },
    { name: 'GitLab', category: 'Git Platform', purpose: 'Repository access and merge requests', status: 'planned', description: 'Alternative to GitHub for repository monitoring.' },
    { name: 'Stripe', category: 'API Provider', purpose: 'Live API contract monitoring', status: 'planned', description: 'Monitor Stripe API endpoints for behavioral changes.' },
    { name: 'OpenAI', category: 'API Provider', purpose: 'Model API change detection', status: 'planned', description: 'Track OpenAI API updates and deprecation notices.' },
    { name: 'Generic Webhooks', category: 'CI/CD', purpose: 'Custom CI pipeline integration', status: 'planned', description: 'Trigger PatchBay analysis from your CI/CD pipeline.' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <div className="max-w-3xl mb-12">
        <h1 className="text-4xl font-bold mb-4">Integrations</h1>
        <p className="text-lg text-text-secondary">
          PatchBay is designed to connect to the tools and APIs your team already
          uses. All integrations are planned; none are live yet.
        </p>
      </div>

      {/* Filter placeholder - functional when client-side */}
      <div className="flex flex-wrap gap-2 mb-8">
        {['All', 'API Providers', 'Git Platforms', 'CI/CD', 'Notifications', 'Monitoring'].map(cat => (
          <button
            key={cat}
            className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
              cat === 'All'
                ? 'border-accent text-accent bg-accent-light'
                : 'border-rule text-text-secondary hover:border-accent hover:text-accent'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {integrations.map(int => (
          <div key={int.name} className="card flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">{int.name}</h3>
              <span className={`badge ${int.status === 'available' ? 'badge-success' : 'badge'}`}
                style={int.status === 'planned' ? { background: '#F3F4F6', color: '#6B7280' } : undefined}
              >
                {int.status === 'available' ? 'Available' : 'Planned'}
              </span>
            </div>
            <p className="text-xs text-text-tertiary mb-2">{int.category}</p>
            <p className="text-sm text-text-secondary flex-1">{int.description}</p>
            <div className="mt-4 pt-4 rule-t">
              {int.status === 'available' ? (
                <a href="/docs/integrations" className="text-sm text-accent font-medium hover:underline">
                  Setup instructions &rarr;
                </a>
              ) : (
                <span className="text-sm text-text-tertiary">Coming soon</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
