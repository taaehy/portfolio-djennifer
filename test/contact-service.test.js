import test from 'node:test';
import assert from 'node:assert/strict';
import { deliverContact, validateContact } from '../lib/contact-service.js';

test('accepts a valid contact message', () => {
  const result = validateContact({ name: 'Ana Souza', email: 'ANA@example.com', message: 'Gostaria de conversar sobre uma oportunidade.' });
  assert.equal(result.ok, true);
  assert.equal(result.spam, false);
  assert.equal(result.contact.email, 'ana@example.com');
});

test('rejects invalid fields', () => {
  assert.equal(validateContact({ name: 'A', email: 'invalid', message: 'short' }).ok, false);
  assert.equal(validateContact({ name: 'Ana', email: 'invalid', message: 'Uma mensagem suficientemente longa.' }).ok, false);
});

test('silently accepts honeypot submissions as spam', () => {
  const result = validateContact({ name: 'Bot', email: 'bot@example.com', message: 'Mensagem automática qualquer.', company: 'Spam Inc.' });
  assert.equal(result.ok, true);
  assert.equal(result.spam, true);
});

test('builds the Resend request without exposing unsafe HTML', async () => {
  const originalFetch = globalThis.fetch;
  let requestBody;
  globalThis.fetch = async (_url, options) => {
    requestBody = JSON.parse(options.body);
    return { ok: true, json: async () => ({ id: 'email_123' }) };
  };

  try {
    const result = await deliverContact(
      { name: '<Ana>', email: 'ana@example.com', message: '<script>alert(1)</script>' },
      { RESEND_API_KEY: 'test', CONTACT_TO_EMAIL: 'owner@example.com', CONTACT_FROM_EMAIL: 'hello@example.com' },
    );
    assert.equal(result.id, 'email_123');
    assert.equal(requestBody.reply_to, 'ana@example.com');
    assert.match(requestBody.html, /&lt;script&gt;/);
    assert.doesNotMatch(requestBody.html, /<script>/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
