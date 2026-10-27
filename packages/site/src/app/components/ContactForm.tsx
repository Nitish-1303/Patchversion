'use client';

import { Check } from 'lucide-react';


import { useState } from 'react';

const ACCESS_KEY = '7f23b9a4-f5ae-4268-b7a2-aaa88bea3e5b';

type Status = 'idle' | 'sending' | 'success' | 'error';

export default function ContactForm() {
  const [status, setStatus] = useState<Status>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('sending');
    setErrorMessage('');

    const form = event.currentTarget;
    const data = new FormData(form);

    try {
      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          access_key: ACCESS_KEY,
          subject: `trypatchbay contact: ${String(data.get('name') || 'new message')}`,
          name: data.get('name'),
          email: data.get('email'),
          message: data.get('message'),
          botcheck: data.get('botcheck'),
        }),
      });
      const result = await response.json();
      if (result.success) {
        setStatus('success');
        form.reset();
      } else {
        setStatus('error');
        setErrorMessage(result.message || 'The form service rejected the submission.');
      }
    } catch {
      setStatus('error');
      setErrorMessage('Network error - the message could not reach the form service.');
    }
  }

  if (status === 'success') {
    return (
      <div className="card text-center py-14 px-8" role="status">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-success-bg">
          <Check size={20} strokeWidth={2} aria-hidden="true" />
        </div>
        <h2 className="font-display text-2xl font-bold text-ink mb-3">Message sent</h2>
        <p className="text-text-secondary max-w-md mx-auto">
          Thanks for reaching out. Your message landed in the trypatchbay inbox and
          you will hear back directly.
        </p>
        <button
          type="button"
          onClick={() => setStatus('idle')}
          className="pill-secondary mt-8"
        >
          Send another message
        </button>
      </div>
    );
  }

  const fieldClass =
    'w-full rounded-xl border border-rule-strong bg-white px-4 py-3 text-[15px] text-ink placeholder:text-text-tertiary outline-none transition-colors focus:border-navy';

  return (
    <form onSubmit={handleSubmit} className="card space-y-5">
      <noscript><p role="status" className="text-sm text-error">JavaScript is required to send this form. Enable it before submitting.</p></noscript>
      <div>
        <label htmlFor="contact-name" className="mb-1.5 block text-sm font-medium text-ink">
          Name
        </label>
        <input id="contact-name" name="name" type="text" required placeholder="Your name" className={fieldClass} />
      </div>
      <div>
        <label htmlFor="contact-email" className="mb-1.5 block text-sm font-medium text-ink">
          Email
        </label>
        <input id="contact-email" name="email" type="email" required placeholder="you@company.com" className={fieldClass} />
      </div>
      <div>
        <label htmlFor="contact-message" className="mb-1.5 block text-sm font-medium text-ink">
          Message
        </label>
        <textarea
          id="contact-message"
          name="message"
          required
          rows={6}
          placeholder="What would you like to know about trypatchbay?"
          className={`${fieldClass} resize-y`}
        />
      </div>

      {/* Honeypot - hidden from humans, bots fill it and Web3Forms drops the submission */}
      <input type="checkbox" name="botcheck" className="hidden" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" aria-hidden="true" />

      {status === 'error' && (
        <div className="rounded-xl border border-error/30 bg-error-bg px-4 py-3 text-sm text-error" role="alert">
          Something went wrong. {errorMessage} Please try again.
        </div>
      )}

      <button type="submit" disabled={status === 'sending'} className="pill-primary w-full disabled:opacity-60">
        {status === 'sending' ? 'Sending...' : 'Send message'}
      </button>
    </form>
  );
}
