// Candidaturas de closer desde /closers/. Se guardan como contacto en
// HubSpot (cargo "Candidato closer") asignado al propietario, para que
// llegue el aviso igual que con los leads.
const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

const clean = (v, max = 500) => String(v ?? '').trim().slice(0, max);

async function hubspot(path, options = {}) {
  const res = await fetch(`https://api.hubapi.com${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${process.env.HUBSPOT_SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(10000),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`HubSpot ${res.status}`);
  return data;
}

export default {
  async fetch(request) {
    if (request.method !== 'POST') return json(405, { message: 'Método no permitido.' });
    let b;
    try { b = await request.json(); } catch { return json(400, { message: 'Solicitud no válida.' }); }
    if (b.website) return json(400, { message: 'No hemos podido validar la solicitud.' });

    const name = clean(b.name, 120);
    const email = clean(b.email, 254).toLowerCase();
    const phone = clean(b.phone, 30);
    if (name.length < 3) return json(400, { message: 'Introduce tu nombre completo.' });
    if (!/^\S+@[^\s@]+\.[^\s@]+$/.test(email)) return json(400, { message: 'Introduce un email válido.' });
    if (phone.replace(/\D/g, '').length < 9) return json(400, { message: 'Introduce un teléfono válido.' });

    const message = [
      'CANDIDATURA CLOSER',
      `Años como closer: ${clean(b.years, 40)}`,
      `Ticket más alto cerrado: ${clean(b.ticket, 60)}`,
      `Experiencia en salud / captación de clientes: ${clean(b.sector, 40)}`,
      `Llamadas por semana: ${clean(b.calls, 40)}`,
      `LinkedIn: ${clean(b.linkedin, 200)}`,
      `Sobre mí: ${clean(b.about, 1000)}`,
    ].join('\n');

    const properties = {
      firstname: name,
      email,
      phone,
      jobtitle: 'Candidato closer',
      message,
      hubspot_owner_id: process.env.HUBSPOT_OWNER_ID || '99940934',
    };

    try {
      const found = await hubspot('/crm/v3/objects/contacts/search', {
        method: 'POST',
        body: JSON.stringify({ filterGroups: [{ filters: [{ propertyName: 'email', operator: 'EQ', value: email }] }], limit: 1 }),
      });
      const id = found?.results?.[0]?.id;
      if (id) {
        await hubspot(`/crm/v3/objects/contacts/${id}`, { method: 'PATCH', body: JSON.stringify({ properties }) });
      } else {
        await hubspot('/crm/v3/objects/contacts', { method: 'POST', body: JSON.stringify({ properties }) });
      }
      return json(200, { ok: true });
    } catch (err) {
      console.error('Candidatura closer:', err);
      return json(500, { message: 'No hemos podido enviar tu candidatura. Vuelve a intentarlo.' });
    }
  },
};
