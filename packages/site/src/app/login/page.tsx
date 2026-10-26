import BrandLogo from '../components/BrandLogo';
export default function LoginPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="card max-w-md w-full">
        <h1 className="text-2xl font-bold mb-2">Sign in to PatchBay</h1>
        <p className="text-sm text-text-secondary mb-8">
          Planned sign-in preview. GitHub authentication and account-backed dashboards are not implemented.
        </p>

        <div className="space-y-4">
          <button
            className="w-full btn-primary flex items-center justify-center gap-2"
            disabled
            title="Authentication not yet implemented"
          >
            <BrandLogo name="github" size={20} />
            Sign in with GitHub
          </button>

          <div className="bg-warning-bg border border-warning/20 rounded-md p-4">
            <p className="text-sm text-warning">
              <strong>Not yet available.</strong> Adding environment variables does not enable
              authentication in this prototype. The GitHub App sign-in flow still needs to be implemented.
            </p>
          </div>

          <p className="text-center text-sm text-text-secondary">
            Don&apos;t have an account?{' '}
            <a href="/signup" className="text-accent hover:underline">Sign up</a>
          </p>
        </div>
      </div>
    </div>
  );
}
