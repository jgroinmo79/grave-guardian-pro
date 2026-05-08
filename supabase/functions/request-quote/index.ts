// Public quote-request endpoint for "quoted on-site" services
// (Bronze cleaning, Crack/chip repair, Video documentation).
// Sends an email to the admin via Resend. No auth required.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QuoteBody {
  service: string;        // human label, e.g. "Bronze Marker Specialized Cleaning"
  serviceCode: string;    // addon id
  name: string;
  email: string;
  phone?: string;
  cemetery?: string;
  message?: string;
}

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const clean = (v: unknown, max = 500) =>
  typeof v === 'string' ? v.trim().slice(0, max) : '';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body: QuoteBody;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const service = clean(body.service, 120);
  const serviceCode = clean(body.serviceCode, 60);
  const name = clean(body.name, 120);
  const email = clean(body.email, 200);
  const phone = clean(body.phone, 40);
  const cemetery = clean(body.cemetery, 200);
  const message = clean(body.message, 2000);

  if (!service || !name || !email || !isEmail(email)) {
    return new Response(
      JSON.stringify({ error: 'Missing or invalid name, email, or service.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  const ADMIN_EMAIL = Deno.env.get('ADMIN_NOTIFICATION_EMAIL') || 'josh@gravedetail.net';
  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY not configured');
    return new Response(JSON.stringify({ error: 'Email service unavailable' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const html = `
    <div style="font-family:Georgia,serif;background:#141414;color:#E8E1D8;padding:24px;">
      <h2 style="color:#C9976B;margin:0 0 12px;">New Quote Request</h2>
      <p style="margin:0 0 16px;color:#B7AFA4;">A customer requested a quote on a quoted-on-site service.</p>
      <table style="border-collapse:collapse;width:100%;font-size:14px;">
        <tr><td style="padding:6px 0;color:#9C948A;width:140px;">Service</td><td><strong>${esc(service)}</strong> <span style="color:#9C948A;">(${esc(serviceCode)})</span></td></tr>
        <tr><td style="padding:6px 0;color:#9C948A;">Name</td><td>${esc(name)}</td></tr>
        <tr><td style="padding:6px 0;color:#9C948A;">Email</td><td><a href="mailto:${esc(email)}" style="color:#C9976B;">${esc(email)}</a></td></tr>
        ${phone ? `<tr><td style="padding:6px 0;color:#9C948A;">Phone</td><td>${esc(phone)}</td></tr>` : ''}
        ${cemetery ? `<tr><td style="padding:6px 0;color:#9C948A;">Cemetery</td><td>${esc(cemetery)}</td></tr>` : ''}
      </table>
      ${message ? `<div style="margin-top:16px;padding:12px;background:#2C2C2C;border-left:3px solid #C9976B;"><div style="color:#9C948A;font-size:12px;margin-bottom:4px;">Message</div><div style="white-space:pre-wrap;">${esc(message)}</div></div>` : ''}
    </div>`;

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Grave Detail Quotes <quotes@notify.gravedetail.net>',
      to: [ADMIN_EMAIL],
      reply_to: email,
      subject: `Quote request: ${service} — ${name}`,
      html,
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    console.error('Resend error', resp.status, err);
    return new Response(JSON.stringify({ error: 'Failed to send quote request' }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
