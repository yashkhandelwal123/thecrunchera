import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { registerRoutes } from './routes';
import { storage } from './storage';

test('contact form saves queries, emails admins safely, and preserves submissions on email failure', async () => {
  const oldFetch = global.fetch;
  const oldEnv = { ...process.env };
  process.env.RESEND_API_KEY = 're_mock';
  process.env.ADMIN_EMAIL = 'owner@example.test';
  process.env.ADMIN_NOTIFICATION_EMAILS = 'khandelwalshubham5775@gmail.com';
  const sent: any[] = [];
  let fail = false;
  global.fetch = (async (input: any, init: any) => {
    if (String(input).startsWith('https://api.resend.com/')) {
      sent.push(JSON.parse(init.body));
      return fail ? Response.json({ name: 'validation_error', message: 'mock failure' }, { status: 403 }) : Response.json({ id: 'mock' });
    }
    return oldFetch(input, init);
  }) as typeof fetch;
  const app = express(); app.use(express.json());
  const server = await registerRoutes(app);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address() as { port: number };
  const payload = { name: 'Test Customer', email: 'customer@example.test', subject: 'Delivery question', message: '<script>alert(1)</script>\nWhere do you deliver?' };
  const post = (data: object) => fetch(`http://127.0.0.1:${address.port}/api/contact`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  try {
    assert.equal((await post(payload)).status, 201);
    assert.deepEqual(sent[0].to, ['owner@example.test', 'khandelwalshubham5775@gmail.com']);
    assert.equal(sent[0].reply_to, payload.email);
    assert.ok(sent[0].html.includes('&lt;script&gt;'));
    assert.ok(!sent[0].html.includes('<script>'));
    fail = true;
    const result = await post({ ...payload, subject: 'Saved despite failure' });
    assert.equal(result.status, 201);
    const saved = await result.json();
    assert.ok((await storage.getAllContacts()).some(c => c.id === saved.id));
    assert.equal((await post({ ...payload, email: 'invalid' })).status, 400);
    assert.equal(sent.length, 2);
  } finally {
    global.fetch = oldFetch;
    for (const key of ['RESEND_API_KEY', 'ADMIN_EMAIL', 'ADMIN_NOTIFICATION_EMAILS']) {
      if (oldEnv[key] === undefined) delete process.env[key]; else process.env[key] = oldEnv[key];
    }
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});
