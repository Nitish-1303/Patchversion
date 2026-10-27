export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
      <p className="eyebrow mb-4">404</p>
      <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-ink mb-6">
        This page does not exist.
      </h1>
      <p className="text-lg text-text-secondary mb-12 max-w-md">
        The link may be outdated. The docs cover how trypatchbay is designed to work.
      </p>
      <div className="flex gap-4">
        <a href="/" className="btn-primary">Back to homepage</a>
        <a href="/docs" className="btn-secondary">Read the docs</a>
      </div>
    </div>
  );
}
