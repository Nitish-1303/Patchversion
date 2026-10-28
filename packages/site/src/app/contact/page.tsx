import ContactForm from '../components/ContactForm';
import { Reveal } from '../components/Experience';

export default function ContactPage() {
  return <section className="contact-card"><Reveal><span className="eyebrow-chip">CONTACT</span><h1>Send a note.</h1><p>Questions or product feedback are welcome. This prototype form is a visual preview only and does not send or store messages.</p><ContactForm /></Reveal></section>;
}
