// Vercel entry point: reuses the same handler as the Netlify function.
import api from '../api.mjs';

export default {
  fetch(request) {
    const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
    return api(request, { ip });
  },
};
