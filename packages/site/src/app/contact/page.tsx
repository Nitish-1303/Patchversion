import ContactForm from '../components/ContactForm';

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
      <p className="eyebrow mb-4">CONTACT</p>
      <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-ink mb-6">
        Talk to the founder.
      </h1>
      <p className="text-lg text-text-secondary mb-12">
        PatchBay is in early development by a solo founder. Questions, feedback,
        or design-partner inquiries all land in the same inbox - and get a real reply.
      </p>
      <ContactForm />
    </div>
  );
}
