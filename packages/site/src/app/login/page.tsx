import BrandLogo from '../components/BrandLogo';
export default function LoginPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="card max-w-md w-full">
        <h1 className="text-2xl font-bold mb-2">Sign in to PatchBay</h1>
        <p className="text-sm text-text-secondary mb-8">
          Sign in with your GitHub account to access your dashboard.
        </p>

        <div className="space-y-4">
          <button
            className="w-full btn-primary flex items-center justify-center gap-2"
            disabled
            title="Authentication not yet configured"
          >
            <BrandLogo name="github" size={20} />
            Sign in with GitHub
          </button>

          <div className="bg-warning-bg border border-warning/20 rounded-md p-4">
            <p className="text-sm text-warning">
              <strong>Configuration required.</strong> GitHub App credentials are not yet configured.
              Set the following environment variables to enable authentication:
            </p>
            <ul className="mt-2 text-xs text-warning space-y-1 font-mono">
              <li>GITHUB_APP_ID</li>
              <li>GITHUB_APP_PRIVATE_KEY</li>
              <li>GITHUB_APP_CLIENT_ID</li>
              <li>GITHUB_APP_CLIENT_SECRET</li>
              <li>NEXTAUTH_SECRET</li>
              <li>NEXTAUTH_URL</li>
            </ul>
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

