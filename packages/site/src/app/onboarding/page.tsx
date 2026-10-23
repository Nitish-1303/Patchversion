export default function OnboardingPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-2xl w-full">
        <h1 className="text-3xl font-bold mb-2">Welcome to Patchversion</h1>
        <p className="text-text-secondary mb-12">Let&apos;s get your first repository connected.</p>

        <div className="space-y-6">
          <OnboardingStep
            step={1}
            title="Create a workspace"
            description="A workspace groups your repositories, team members, and monitoring configuration."
            status="pending"
          />
          <OnboardingStep
            step={2}
            title="Connect a repository"
            description="Install the Patchversion GitHub App on the repositories you want to monitor."
            status="pending"
          />
          <OnboardingStep
            step={3}
            title="Select API providers"
            description="Choose which npm packages or API endpoints to track for changes."
            status="pending"
          />
          <OnboardingStep
            step={4}
            title="Configure monitoring"
            description="Set how often Patchversion checks for new versions and live API drift."
            status="pending"
          />
          <OnboardingStep
            step={5}
            title="Run first analysis"
            description="Trigger an initial scan to map your current API usage across connected repositories."
            status="pending"
          />
          <OnboardingStep
            step={6}
            title="View results"
            description="See your usage map, current dependency versions, and any pending updates."
            status="pending"
          />
        </div>

        <div className="mt-12 card bg-warning-bg border-warning/20">
          <p className="text-sm text-warning">
            <strong>Setup required.</strong> The onboarding flow requires a configured GitHub App
            and database. Follow the <a href="/docs/quickstart" className="underline">quickstart guide</a> to
            set up your environment.
          </p>
        </div>
      </div>
    </div>
  );
}

function OnboardingStep({ step, title, description, status }: {
  step: number;
  title: string;
  description: string;
  status: 'done' | 'current' | 'pending';
}) {
  return (
    <div className="flex gap-4">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 ${
        status === 'done' ? 'bg-success text-white' :
        status === 'current' ? 'bg-accent text-white' :
        'bg-rule text-text-tertiary'
      }`}>
        {status === 'done' ? (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : step}
      </div>
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="text-sm text-text-secondary">{description}</p>
      </div>
    </div>
  );
}
