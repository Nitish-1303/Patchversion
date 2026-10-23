export default function ContactPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <h1 className="text-3xl font-bold mb-8">Contact</h1>
      <div className="space-y-6 text-text-secondary">
        <p>
          PatchBay is in early development by a solo founder.
        </p>
        <p>
          For questions, feedback, or design-partner inquiries, open an issue on the
          GitHub repository.
        </p>
        <a
          href="https://github.com/Nitish-1303/Patchversion/issues"
          className="btn-secondary inline-block"
        >
          Open an Issue on GitHub
        </a>
      </div>
    </div>
  );
}
