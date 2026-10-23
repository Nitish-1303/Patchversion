export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <h1 className="text-3xl font-bold mb-8">About PatchBay</h1>
      <div className="space-y-6 text-text-secondary">
        <p>
          PatchBay is building the automated maintenance layer between API providers
          and the applications that depend on them.
        </p>
        <p>
          When a third-party API ships a breaking change, most engineering teams discover
          it through a production error, a customer complaint, or hours of manual
          investigation. PatchBay detects the change, maps the affected code,
          generates a tested fix, and presents it as a reviewable pull request.
        </p>
        <p>
          The product is in early development. No customers, no revenue, no external
          validation yet. What exists is a working engine with tests, a website, and
          a research-driven plan.
        </p>
      </div>
    </div>
  );
}
