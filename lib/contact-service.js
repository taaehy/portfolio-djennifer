const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalize(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function validateContact(input = {}) {
  const contact = {
    name: normalize(input.name),
    email: normalize(input.email).toLowerCase(),
    message: normalize(input.message),
    company: normalize(input.company),
  };

  if (contact.company) return { ok: true, spam: true, contact };
  if (contact.name.length < 2 || contact.name.length > 80) {
    return { ok: false, message: 'Informe um nome válido.' };
  }
  if (contact.email.length > 160 || !EMAIL_PATTERN.test(contact.email)) {
    return { ok: false, message: 'Informe um e-mail válido.' };
  }
  if (contact.message.length < 10 || contact.message.length > 3000) {
    return { ok: false, message: 'A mensagem deve ter entre 10 e 3000 caracteres.' };
  }

  return { ok: true, spam: false, contact };
}

export async function deliverContact(contact, env = process.env) {
  const apiKey = env.RESEND_API_KEY;
  const to = env.CONTACT_TO_EMAIL;
  const from = env.CONTACT_FROM_EMAIL;

  if (!apiKey || !to || !from) {
    const error = new Error('O serviço de contato ainda não foi configurado.');
    error.code = 'CONTACT_NOT_CONFIGURED';
    throw error;
  }

  const safeName = escapeHtml(contact.name);
  const safeEmail = escapeHtml(contact.email);
  const safeMessage = escapeHtml(contact.message).replaceAll('\n', '<br>');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `Portfólio Djennifer <${from}>`,
      to: [to],
      reply_to: contact.email,
      subject: `Novo contato do portfólio — ${contact.name}`,
      text: `Nome: ${contact.name}\nE-mail: ${contact.email}\n\n${contact.message}`,
      html: `
        <div style="background:#2b2c30;padding:32px;font-family:Arial,sans-serif;color:#f8f4f7">
          <div style="max-width:620px;margin:auto;background:#35313b;border-radius:16px;padding:32px;border:1px solid #613c4c">
            <p style="color:#ff1457;font-size:12px;text-transform:uppercase;letter-spacing:1px">Novo contato pelo portfólio</p>
            <h1 style="margin:12px 0 24px;font-size:28px">Mensagem de ${safeName}</h1>
            <p style="color:#c4b9c1"><strong style="color:#f8f4f7">E-mail:</strong> ${safeEmail}</p>
            <div style="margin-top:24px;padding:20px;background:#2b2c30;border-radius:10px;line-height:1.6">${safeMessage}</div>
          </div>
        </div>`,
    }),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(result.message || 'O provedor de e-mail recusou o envio.');
    error.code = 'EMAIL_PROVIDER_ERROR';
    throw error;
  }

  return { id: result.id };
}
