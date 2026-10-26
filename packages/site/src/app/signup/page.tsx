import BrandLogo from '../components/BrandLogo';
export default function SignupPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="card max-w-md w-full">
        <h1 className="text-2xl font-bold mb-2">Get started with PatchBay</h1>
        <p className="text-sm text-text-secondary mb-8">
          Planned signup preview. GitHub authentication, App installation, and repository
          permissions are not implemented. No repository access is requested here.
        </p>

        <div className="space-y-4">
          <button
            className="w-full btn-primary flex items-center justify-center gap-2"
            disabled
            title="Authentication not yet implemented"
          >
            <BrandLogo name="github" size={20} />
            Sign up with GitHub
          </button>

          <div className="bg-warning-bg border border-warning/20 rounded-md p-4">
            <p className="text-sm text-warning">
              <strong>Not yet available.</strong> A GitHub App with limited repository permissions
              is planned, not an available installation flow. See the <a href="/docs/getting-started" className="underline">getting started guide</a> for
              the current local fixture demo.
            </p>
          </div>

          <p className="text-center text-sm text-text-secondary">
            Already have an account?{' '}
            <a href="/login" className="text-accent hover:underline">Sign in</a>
          </p>
        </div>
      </div>
    </div>
  );
}
