import ContactForm from '../components/ContactForm';
import { Reveal } from '../components/Experience';
import { SocialCommunityGrid } from '../components/SocialIcons';

export default function ContactPage() {
  return (
    <>
      <section className="contact-card">
        <Reveal>
          <span className="eyebrow-chip">CONTACT</span>
          <h1>Send a note.</h1>
          <p>Questions or product feedback are welcome. This prototype form is a visual preview only and does not send or store messages.</p>
          <ContactForm />
        </Reveal>
      </section>

      <section className="social-community-section">
        <Reveal>
          <span className="eyebrow-chip">COMMUNITY & SOCIAL</span>
          <h2>Connect with TryPatchBay</h2>
          <p className="community-subhead">
            Join the conversation across developer communities, explore breaking dependency migrations, or follow our public roadmap.
          </p>
          <SocialCommunityGrid />
        </Reveal>
      </section>
    </>
  );
}
