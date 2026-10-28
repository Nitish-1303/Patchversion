'use client';

import { useState } from 'react';

export default function ContactForm() {
  const [status, setStatus] = useState('');
  return <form className="contact-form" onSubmit={(event) => { event.preventDefault(); setStatus('This preview does not send messages yet. No information was stored.'); }}>
    <label htmlFor="contact-name">Name</label><input id="contact-name" name="name" autoComplete="name" required />
    <label htmlFor="contact-email">Email</label><input id="contact-email" name="email" type="email" autoComplete="email" required />
    <label htmlFor="contact-message">Message</label><textarea id="contact-message" name="message" rows={4} required />
    <button className="pill-button pill-button-dark" type="submit">Preview message</button>
    <p className="form-note" aria-live="polite">{status || 'The contact form is not connected.'}</p>
  </form>;
}
