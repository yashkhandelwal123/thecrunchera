/** Cloudflare Pages API bridge. API_ORIGIN must point to the Express service. */
const failure = (status, error) => Response.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
export async function onRequest({ request, env }) {
  const incoming = new URL(request.url);
  let origin;
  try {
    origin = new URL(env.API_ORIGIN);
    if (origin.protocol !== "https:" || origin.username || origin.password || origin.pathname !== "/" || origin.search || origin.hash || origin.host === incoming.host || origin.hostname.endsWith(".pages.dev")) throw new Error("Invalid API_ORIGIN");
  } catch {
    return failure(503, "Checkout is not configured yet. Please contact the store before placing an order.");
  }
  const target = new URL(incoming.pathname + incoming.search, origin);
  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.set("X-Forwarded-Proto", "https");
  headers.set("X-Forwarded-Host", incoming.host);
  try {
    const upstream = await fetch(target, {
      method: request.method, headers,
      body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
      redirect: "manual",
    });
    // Redirects to a login HTML page or a stale deployment are not API responses.
    if (upstream.status >= 300 && upstream.status < 400) return failure(502, "The store service is incorrectly configured. Please contact support.");
    if (upstream.status === 204) return new Response(null, { status: 204 });
    const body = await upstream.text();
    if (!body.trim() || !/\bapplication\/(?:[\w.-]+\+)?json\b/i.test(upstream.headers.get("Content-Type") || "")) {
      console.error("API origin returned a non-JSON response", { path: incoming.pathname, status: upstream.status });
      return failure(502, "The store service is temporarily unavailable. Please retry shortly.");
    }
    try { JSON.parse(body); } catch { return failure(502, "The store service returned an incomplete response. Please retry."); }
    const responseHeaders = new Headers(upstream.headers);
    responseHeaders.delete("content-length");
    responseHeaders.delete("content-encoding");
    responseHeaders.delete("access-control-allow-origin");
    responseHeaders.set("Cache-Control", "no-store");
    // Express uses host-only session cookies; keep them attached to this Pages origin.
    return new Response(body, { status: upstream.status, headers: responseHeaders });
  } catch {
    return failure(502, "Couldn't reach the store service. Please retry shortly.");
  }
}
