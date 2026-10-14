import { defineAction, ActionError } from 'astro:actions';
import { createClient } from '@supabase/supabase-js';
import { processLead, MESSAGES } from '../lib/leads';

export const server = {
  saveLead: defineAction({
    accept: 'form',
    handler: async (formData) => {
      const url = import.meta.env.PUBLIC_SUPABASE_URL;
      const key = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
      if (!url || !key) {
        throw new ActionError({ code: 'INTERNAL_SERVER_ERROR', message: MESSAGES.error });
      }
      const client = createClient(url, key, { auth: { persistSession: false } });
      const res = await processLead(
        {
          nombre: formData.get('nombre'),
          email: formData.get('email'),
          honeypot: formData.get('empresa'),
          utm_source: formData.get('utm_source'),
        },
        client,
      );
      if (res.status === 'invalid') {
        throw new ActionError({ code: 'BAD_REQUEST', message: res.message });
      }
      if (res.status === 'error') {
        throw new ActionError({ code: 'INTERNAL_SERVER_ERROR', message: res.message });
      }
      return { status: res.status, message: res.message };
    },
  }),
};
