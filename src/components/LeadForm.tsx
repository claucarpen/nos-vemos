import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { actions } from 'astro:actions';

type Feedback = { kind: 'ok' | 'error'; text: string } | null;

export default function LeadForm() {
  const [utmSource, setUtmSource] = useState('');
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  useEffect(() => {
    setUtmSource(new URLSearchParams(window.location.search).get('utm_source') ?? '');
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setSending(true);
    setFeedback(null);
    const { data, error } = await actions.saveLead(new FormData(form));
    setSending(false);
    if (error) {
      setFeedback({ kind: 'error', text: error.message });
      return;
    }
    setFeedback({ kind: 'ok', text: data.message });
    form.reset();
  }

  return (
    <form className="lead-form" onSubmit={onSubmit}>
      <label htmlFor="nombre">Tu nombre</label>
      <input id="nombre" name="nombre" type="text" required maxLength={80} autoComplete="given-name" />

      <label htmlFor="email">Tu email</label>
      <input id="email" name="email" type="email" required autoComplete="email" />

      {/* Honeypot: invisible para personas y lectores de pantalla; los bots lo completan. */}
      <div className="hp" aria-hidden="true">
        <label htmlFor="empresa">No completar</label>
        <input id="empresa" name="empresa" type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      </div>

      <input type="hidden" name="utm_source" value={utmSource} />

      <button type="submit" className="btn-start" disabled={sending}>
        {sending ? 'Cargando…' : 'Press Start'}
      </button>

      <p className={`feedback ${feedback ? feedback.kind : ''}`} role="status" aria-live="polite">
        {feedback?.text}
      </p>
    </form>
  );
}
