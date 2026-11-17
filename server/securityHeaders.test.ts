import assert from "node:assert/strict";
import { test } from "node:test";
import { once } from "node:events";
import express from "express";
import { securityHeaders } from "./securityHeaders";

test("baseline headers cover HTML, assets and API responses without blocking integrations", async () => {
  const app = express();
  app.set("trust proxy", 1);
  app.use(securityHeaders(true));
  app.get("/", (_req, res) => res.type("html").send("<h1>Store</h1>"));
  app.get("/asset.js", (_req, res) => res.type("js").send("console.log('asset')"));
  app.get("/api/example", (_req, res) => res.json({ ok: true }));
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  try {
    for (const path of ["/", "/asset.js", "/api/example"]) {
      const response = await fetch(base + path, { headers: { "X-Forwarded-Proto": "https" } });
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("x-content-type-options"), "nosniff");
      assert.equal(response.headers.get("referrer-policy"), "strict-origin-when-cross-origin");
      assert.equal(response.headers.get("x-frame-options"), "SAMEORIGIN");
      assert.equal(response.headers.get("strict-transport-security"), "max-age=86400");
      const policy = response.headers.get("content-security-policy")!;
      assert.ok(policy.includes("frame-ancestors 'self'"));
      for (const directive of ["script-src", "connect-src", "frame-src", "default-src", "form-action"])
        assert.ok(!policy.includes(directive), `must not restrict ${directive} without integration testing`);
    }
    assert.match((await fetch(base + "/asset.js")).headers.get("content-type")!, /javascript/);
    assert.equal((await fetch(base)).headers.get("strict-transport-security"), null);
    assert.deepEqual(await (await fetch(base + "/api/example")).json(), { ok: true });
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});

test("development previews are not restricted by production framing or HTTPS policies", () => {
  const headers = new Map<string, string>(); let continued = false;
  securityHeaders(false)({ secure: true } as any, { setHeader: (k: string, v: string) => headers.set(k, v) } as any, () => { continued = true; });
  assert.ok(continued);
  assert.equal(headers.get("X-Content-Type-Options"), "nosniff");
  for (const name of ["Content-Security-Policy", "X-Frame-Options", "Strict-Transport-Security"])
    assert.ok(!headers.has(name));
});
