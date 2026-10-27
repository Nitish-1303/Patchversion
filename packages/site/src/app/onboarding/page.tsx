import { ArrowRight } from 'lucide-react';
export default function OnboardingPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-2xl w-full">
        <h1 className="text-3xl font-bold mb-2">Welcome to trypatchbay</h1>
        <p className="text-text-secondary mb-12">Planned onboarding preview. Repository connection and hosted monitoring are not available.</p>

        <div className="space-y-6">
          <OnboardingStep
            step={1}
            title="Create a workspace"
            description="Planned: group repositories, team members, and monitoring configuration in a workspace."
            status="pending"
          />
          <OnboardingStep
            step={2}
            title="Connect a repository"
            description="Planned: connect selected repositories through a GitHub App. App installation is not implemented."
            status="pending"
          />
          <OnboardingStep
            step={3}
            title="Select API providers"
            description="Planned: choose npm packages or API endpoints to track for changes."
            status="pending"
          />
          <OnboardingStep
            step={4}
            title="Configure monitoring"
            description="Planned: schedule checks for new versions and live API drift. Hosted monitoring is not running."
            status="pending"
          />
          <OnboardingStep
            step={5}
            title="Run first analysis"
            description="Planned: scan connected repositories to map API usage. No connected-repository scan is available today."
            status="pending"
          />
          <OnboardingStep
            step={6}
            title="View results"
            description="Planned: view a usage map, dependency versions, and pending updates in a hosted dashboard."
            status="pending"
          />
        </div>

        <div className="mt-12 card bg-warning-bg border-warning/20">
          <p className="text-sm text-warning">
            <strong>Prototype only.</strong> Today the end-to-end proof loop runs locally on bundled fixtures,
            without isolation, and prepares PR text only. It does not open or submit pull requests.
            The <a href="/docs/getting-started" className="underline">getting started guide</a> separates
            this local demo from the planned onboarding flow.
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
          <ArrowRight size={20} strokeWidth={2} aria-hidden="true" className="w-4 h-4" />
        ) : step}
      </div>
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="text-sm text-text-secondary">{description}</p>
      </div>
    </div>
  );
}
