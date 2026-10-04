export const questions = [
  {
    key: 'volume',
    title: '¿Cuántos nuevos pacientes empiezan un tratamiento al mes?',
    description:
      'Usa una media realista de los últimos tres meses. Piensa en el tratamiento capilar que quieres impulsar.',
    options: [
      ['1-5', 'Entre 1 y 5 pacientes'],
      ['6-10', 'Entre 6 y 10 pacientes'],
      ['11-25', 'Entre 11 y 25 pacientes'],
      ['25+', 'Más de 25 pacientes'],
      ['0', 'Todavía no tengo pacientes'],
    ],
  },
  {
    key: 'ticket',
    title: '¿Cuál es tu ticket medio por paciente?',
    description:
      'Selecciona el importe total medio que factura tu clínica por ese mismo tratamiento.',
    options: [
      ['under1000', 'Menos de 1.000 €'],
      ['1000-2500', 'De 1.000 € a menos de 2.500 €'],
      ['2500-5000', 'De 2.500 € a menos de 5.000 €'],
      ['5000-7500', 'De 5.000 € a 7.500 €'],
      ['7500+', 'Más de 7.500 €'],
    ],
  },
  {
    key: 'team',
    title: '¿Tienes un equipo que gestione las nuevas consultas?',
    description:
      'Alguien que responda, haga seguimiento y acompañe al interesado hasta su valoración en la clínica.',
    options: [
      ['no', 'No, lo gestionamos cuando podemos'],
      ['yes', 'Sí, tenemos una persona o equipo responsable'],
    ],
  },
  {
    key: 'zone',
    title: '¿Dónde quieres captar nuevos pacientes?',
    description:
      'Indica la ciudad o provincia de España en la que quieres impulsar tu captación.',
  },
  {
    key: 'goal',
    title: '¿Qué quieres mejorar ahora en tu clínica?',
    description:
      'Elige tu prioridad. Enfocaremos el diagnóstico en lo que más importa para tu crecimiento.',
    options: [
      ['volume', 'Recibir más solicitudes de valoración'],
      ['quality', 'Atraer contactos con más interés real'],
      ['conversion', 'Convertir más valoraciones en pacientes'],
      ['cost', 'Reducir el coste de captar un paciente'],
      ['scale', 'Aumentar el volumen de tratamientos'],
    ],
  },
];

export const volumeValues = {
  '1-5': 3,
  '6-10': 8,
  '11-25': 18,
  '0': 0,
};

export const ticketValues = {
  '1000-2500': 1750,
  '2500-5000': 3750,
  '5000-7500': 6250,
};

export function validateStep(index, a) {
  const q = questions[index];

  if (!q) return '';

  if (q.key === 'zone') {
    return typeof a.zone === 'string' &&
      a.zone.trim().length >= 2 &&
      a.zone.trim().length <= 100
      ? ''
      : 'Indica una ciudad o provincia (entre 2 y 100 caracteres).';
  }

  if (!q.options.some((o) => o[0] === a[q.key])) {
    return 'Selecciona una opción para continuar.';
  }

  if (
    q.key === 'volume' &&
    a.volume === '25+' &&
    (!Number.isInteger(Number(a.volumeExact)) ||
      Number(a.volumeExact) <= 25 ||
      Number(a.volumeExact) > 10000)
  ) {
    return 'Indica tu media mensual: un número entero mayor de 25.';
  }

  if (
    q.key === 'ticket' &&
    (a.ticket === 'under1000' || a.ticket === '7500+')
  ) {
    const n = Number(a.ticketExact);

    if (
      !Number.isFinite(n) ||
      n <= 0 ||
      n > 1000000 ||
      (a.ticket === 'under1000' && n >= 1000) ||
      (a.ticket === '7500+' && n <= 7500)
    ) {
      return a.ticket === 'under1000'
        ? 'Indica un importe mayor de 0 € e inferior a 1.000 €.'
        : 'Indica un importe mayor de 7.500 €.';
    }
  }

  return '';
}

export function calculate(a) {
  for (let i = 0; i < questions.length; i++) {
    const error = validateStep(i, a);
    if (error) throw new Error(error);
  }

  const currentPatients =
    a.volume === '25+'
      ? Number(a.volumeExact)
      : volumeValues[a.volume];

  const ticket =
    a.ticket === 'under1000' || a.ticket === '7500+'
      ? Number(a.ticketExact)
      : ticketValues[a.ticket];

  const targetPatients =
    currentPatients === 0
      ? 2
      : Math.ceil(currentPatients * 1.25);

  const extraPatients =
    targetPatients - currentPatients;

  const currentRevenue =
    currentPatients * ticket;

  const targetRevenue =
    targetPatients * ticket;

  const assumedConversion = 0.2;

  return {
    modelVersion: 'folia-scenario-v2',
    currentPatients,
    ticket,
    targetPatients,
    extraPatients,
    currentRevenue,
    targetRevenue,
    additionalRevenue:
      targetRevenue - currentRevenue,
    growthPercent: currentPatients
      ? Math.round(
          (extraPatients / currentPatients) * 100
        )
      : null,
    additionalOpportunities: Math.ceil(
      extraPatients / assumedConversion
    ),
    assumedValuations:
      currentPatients / assumedConversion,
    assumedConversion,
    conversionAlternative: currentPatients
      ? targetPatients /
        (currentPatients / assumedConversion)
      : null,
    illustrative: true,
  };
}

export function validateContact(c) {
  if (
    typeof c?.name !== 'string' ||
    c.name.trim().length < 3 ||
    c.name.length > 120
  ) {
    return 'Introduce tu nombre completo.';
  }

  if (
    typeof c.email !== 'string' ||
    c.email.length > 254 ||
    !/^\S+@[^\s@]+\.[^\s@]+$/.test(c.email)
  ) {
    return 'Introduce un email válido.';
  }

  if (
    typeof c.phone !== 'string' ||
    !/^[+\d\s().-]+$/.test(c.phone) ||
    c.phone.replace(/\D/g, '').length < 9 ||
    c.phone.replace(/\D/g, '').length > 15
  ) {
    return 'Introduce un teléfono válido, con prefijo si es internacional.';
  }

  return '';
}

const requests = new Map();

const response = (status, data) =>
  Response.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store',
    },
  });

async function hubspotFetch(
  path,
  options = {},
  env = process.env
) {
  const token = env.HUBSPOT_SERVICE_KEY;

  if (!token) {
    console.error(
      'HUBSPOT_SERVICE_KEY no existe en Netlify'
    );

    throw new Error(
      'HubSpot no está configurado.'
    );
  }

  const res = await fetch(
    `https://api.hubapi.com${path}`,
    {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      signal: AbortSignal.timeout(10000),
    }
  );

  const text = await res.text();

  let data = null;

  try {
    data = text
      ? JSON.parse(text)
      : null;
  } catch {
    data = text;
  }

  console.log(
    'HubSpot status:',
    res.status
  );

  if (!res.ok) {
    console.error(
      'HubSpot error:',
      res.status,
      data
    );

    throw new Error(
      `HubSpot devolvió error ${res.status}`
    );
  }

  return data;
}

async function findContactByEmail(
  email,
  env
) {
  const data = await hubspotFetch(
    '/crm/v3/objects/contacts/search',
    {
      method: 'POST',
      body: JSON.stringify({
        filterGroups: [
          {
            filters: [
              {
                propertyName: 'email',
                operator: 'EQ',
                value: email,
              },
            ],
          },
        ],
        properties: ['email'],
        limit: 1,
      }),
    },
    env
  );

  return data?.results?.[0] || null;
}

async function createOrUpdateHubSpotContact(
  payload,
  env
) {
  const properties = {
    firstname: payload.name,
    email: payload.email,
    phone: payload.phone,

    calc_current_patients:
      payload.projection?.currentPatients != null
        ? String(
            payload.projection.currentPatients
          )
        : '',

    calc_ticket:
      payload.projection?.ticket != null
        ? String(
            payload.projection.ticket
          )
        : '',

    calc_has_team:
      payload.has_team === 'yes'
        ? 'Sí'
        : payload.has_team === 'no'
          ? 'No'
          : '',

    calc_zone:
      payload.zone || '',

    calc_goal:
      payload.goal || '',

    calc_target_patients:
      payload.projection?.targetPatients != null
        ? String(
            payload.projection.targetPatients
          )
        : '',

    calc_current_revenue:
      payload.projection?.currentRevenue != null
        ? String(
            payload.projection.currentRevenue
          )
        : '',

    calc_target_revenue:
      payload.projection?.targetRevenue != null
        ? String(
            payload.projection.targetRevenue
          )
        : '',

    calc_additional_revenue:
      payload.projection?.additionalRevenue != null
        ? String(
            payload.projection.additionalRevenue
          )
        : '',
  };

  Object.keys(properties).forEach(
    (key) => {
      if (
        properties[key] === '' ||
        properties[key] == null
      ) {
        delete properties[key];
      }
    }
  );

  console.log(
    'Buscando contacto HubSpot:',
    payload.email
  );

  const existing =
    await findContactByEmail(
      payload.email,
      env
    );

  if (existing?.id) {
    console.log(
      'Actualizando contacto HubSpot:',
      existing.id
    );

    await hubspotFetch(
      `/crm/v3/objects/contacts/${existing.id}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          properties,
        }),
      },
      env
    );

    return {
      action: 'updated',
      id: existing.id,
    };
  }

  console.log(
    'Creando nuevo contacto HubSpot'
  );

  const created =
    await hubspotFetch(
      '/crm/v3/objects/contacts',
      {
        method: 'POST',
        body: JSON.stringify({
          properties,
        }),
      },
      env
    );

  return {
    action: 'created',
    id: created?.id || null,
  };
}

export async function handleLead(
  request,
  {
    env = process.env,
    ip = 'local',
    now = Date.now(),
  } = {}
) {
  if (request.method !== 'POST') {
    return response(405, {
      message: 'Método no permitido.',
    });
  }

  const origin =
    request.headers.get('Origin');

  const expected =
    env.SITE_URL ||
    new URL(request.url).origin;

  if (
    origin &&
    origin !== expected
  ) {
    return response(403, {
      message: 'Origen no permitido.',
    });
  }

  if (
    !request.headers
      .get('content-type')
      ?.includes('application/json')
  ) {
    return response(415, {
      message: 'Formato no válido.',
    });
  }

  const contentLength = Number(
    request.headers.get(
      'content-length'
    ) || 0
  );

  if (contentLength > 16000) {
    return response(413, {
      message:
        'Solicitud demasiado grande.',
    });
  }

  let body;

  try {
    const text =
      await request.text();

    if (text.length > 16000) {
      return response(413, {
        message:
          'Solicitud demasiado grande.',
      });
    }

    body = JSON.parse(text);
  } catch {
    return response(400, {
      message:
        'Solicitud no válida.',
    });
  }

  if (
    !body ||
    typeof body !== 'object'
  ) {
    return response(400, {
      message:
        'Solicitud no válida.',
    });
  }

  if (body.website) {
    return response(400, {
      message:
        'No hemos podido validar la solicitud.',
    });
  }

  if (
    ![
      'analysis',
      'audit',
      'contact',
    ].includes(body.eventType) ||
    typeof body.submissionId !==
      'string' ||
    !/^[a-zA-Z0-9-]{16,80}$/.test(
      body.submissionId
    )
  ) {
    return response(400, {
      message:
        'Solicitud no válida.',
    });
  }

  const error =
    validateContact(body.contact);

  if (error) {
    return response(400, {
      message: error,
    });
  }

  if (
    typeof body.contact.marketing !==
    'boolean'
  ) {
    return response(400, {
      message:
        'Preferencia de contacto no válida.',
    });
  }

  if (
    body.note != null &&
    (
      typeof body.note !== 'string' ||
      body.note.length > 1000
    )
  ) {
    return response(400, {
      message:
        'El mensaje es demasiado largo.',
    });
  }

  let result = null;

  try {
    if (
      body.eventType !== 'contact'
    ) {
      result = calculate(
        body.answers ?? {}
      );
    }
  } catch (err) {
    return response(400, {
      message: err.message,
    });
  }

  if (
    (env.FOLIA_MODE || 'live') !==
    'live'
  ) {
    return response(200, {
      ok: true,
      simulated: true,
      result,
    });
  }

  for (
    const [key, value] of requests
  ) {
    if (
      now - value.start > 60000
    ) {
      requests.delete(key);
    }
  }

  const meter =
    requests.get(ip) || {
      start: now,
      count: 0,
    };

  if (meter.count >= 8) {
    return response(429, {
      message:
        'Has realizado varios intentos. Espera un minuto y vuelve a intentarlo.',
    });
  }

  meter.count++;

  requests.set(
    ip,
    meter
  );

  const a =
    body.answers || {};

  const payload = {
    event_type:
      body.eventType,

    submission_id:
      body.submissionId,

    source:
      'folia-web',

    submitted_at:
      new Date(now).toISOString(),

    name:
      body.contact.name.trim(),

    email:
      body.contact.email
        .trim()
        .toLowerCase(),

    phone:
      body.contact.phone.trim(),

    marketing_consent:
      body.contact.marketing,

    consent_version:
      '2026-09-25',

    note:
      body.note || '',

    volume_range:
      a.volume || '',

    volume_exact:
      a.volumeExact
        ? Number(a.volumeExact)
        : null,

    ticket_range:
      a.ticket || '',

    ticket_exact:
      a.ticketExact
        ? Number(a.ticketExact)
        : null,

    has_team:
      a.team || '',

    zone:
      typeof a.zone === 'string'
        ? a.zone.trim()
        : '',

    goal:
      a.goal || '',

    projection:
      result,
  };

  try {
    const hubspot =
      await createOrUpdateHubSpotContact(
        payload,
        env
      );

    console.log(
      'HubSpot OK:',
      hubspot.action,
      hubspot.id
    );

    return response(200, {
      ok: true,
      simulated: false,
      result,
      hubspot,
    });
  } catch (err) {
    console.error(
      'Error final HubSpot:',
      err
    );

    return response(502, {
      message:
        'No hemos podido guardar los datos en HubSpot. Tus respuestas siguen aquí; vuelve a intentarlo.',
    });
  }
}

export function publicConfig(
  env = process.env
) {
  const validURL = (v) => {
    try {
      const u =
        new URL(v);

      return u.protocol === 'https:'
        ? u.href
        : '';
    } catch {
      return '';
    }
  };

  const live =
    (env.FOLIA_MODE || 'live') ===
    'live';

  return {
    demo: !live,

    calendarUrl:
      validURL(
        env.CALENDAR_URL ||
          env.GHL_CALENDAR_URL ||
          'https://calendly.com/josemartinez31k/30min'
      ),

    marketingEnabled:
      false,

    privacyUrl:
      validURL(
        env.PRIVACY_URL
      ),

    legalUrl:
      validURL(
        env.LEGAL_URL
      ),

    cookiesUrl:
      validURL(
        env.COOKIES_URL
      ),
  };
}

export default async function api(
  request,
  context = {}
) {
  const path =
    new URL(
      request.url
    ).pathname;

  if (
    path === '/api/config'
  ) {
    if (
      request.method !== 'GET'
    ) {
      return new Response(
        null,
        {
          status: 405,
        }
      );
    }

    return Response.json(
      publicConfig(),
      {
        headers: {
          'Cache-Control':
            'no-store',
        },
      }
    );
  }

  if (
    path === '/api/lead'
  ) {
    return handleLead(
      request,
      {
        ip:
          context.ip ||
          'unknown',
      }
    );
  }

  return new Response(
    'Not found',
    {
      status: 404,
    }
  );
}

export const config = {
  path: [
    '/api/config',
    '/api/lead',
  ],
};
