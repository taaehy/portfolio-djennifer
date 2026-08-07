import { deliverContact, validateContact } from '../lib/contact-service.js';

const attempts = new Map();
const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 5;

function getClientIp(request) {
  const forwarded = request.headers['x-forwarded-for'];
  return (Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0]) || request.socket?.remoteAddress || 'unknown';
}

function isRateLimited(ip) {
  const now = Date.now();
  const recent = (attempts.get(ip) || []).filter((time) => now - time < WINDOW_MS);
  recent.push(now);
  attempts.set(ip, recent);
  return recent.length > MAX_ATTEMPTS;
}

export default async function handler(request, response) {
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');

  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ message: 'Método não permitido.' });
  }

  const ip = getClientIp(request);
  if (isRateLimited(ip)) {
    return response.status(429).json({ message: 'Muitas tentativas. Aguarde um minuto e tente novamente.' });
  }

  try {
    const body = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;
    const validation = validateContact(body);
    if (!validation.ok) return response.status(400).json({ message: validation.message });
    if (validation.spam) return response.status(200).json({ ok: true });

    await deliverContact(validation.contact);
    return response.status(200).json({ ok: true });
  } catch (error) {
    if (error instanceof SyntaxError) return response.status(400).json({ message: 'Dados inválidos.' });
    if (error.code === 'CONTACT_NOT_CONFIGURED') {
      return response.status(503).json({ message: 'O formulário está temporariamente indisponível.' });
    }
    console.error('Contact form error:', error.message);
    return response.status(502).json({ message: 'Não foi possível enviar a mensagem. Tente novamente.' });
  }
}
