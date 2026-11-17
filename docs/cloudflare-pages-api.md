# Cloudflare Pages checkout routing

Confirmed from the browser request supplied on 29 September: POST /api/checkout/quote on cb760463.thecrunchera.pages.dev returned 405 with Content-Length: 0. The client then attempted to parse an empty body. This is a routing/deployment failure before Express pricing executes.

The repo previously had only functions/api/products.js, returning a separate hard-coded catalog. No Pages quote/order/auth handler existed. The Express quote handler in server/routes.ts does not run automatically when Vite assets are deployed to Pages.

## Fix included

functions/api/[[path]].js proxies all /api/* methods to the configured Express origin. The products route delegates to it so browsing and charging use the same catalog. POST bodies, authorization/session cookies and JSON response status are preserved. Empty/non-JSON upstream responses become explicit 502 JSON errors. Missing configuration returns 503 JSON instead of silently suggesting checkout works. BASE_URL stays same-origin.

## Required configuration

1. Deploy the PR's Express backend to your Node hosting service using npm run build / npm start, with database, SESSION_SECRET, Google and Razorpay settings. Apply the additive order-pricing migration if not already applied.
2. In Cloudflare Pages Settings → Variables and Secrets, set API_ORIGIN to the actual HTTPS origin of that backend, without /api or another path. Configure both Preview and Production environments. Do not point it back to Pages or the same frontend domain.
3. Redeploy Pages from the repository root, keeping the root functions directory in the deployment. Git integration or Wrangler Pages deployment supports Functions; dashboard drag-and-drop upload does not. Frontend output remains dist. Do not assume uploading compiled Express index.js starts a server on Pages.
4. Add the intended storefront origin to the Google OAuth JavaScript origins where needed. Cookies remain host-only on each storefront origin; existing Express cookie configuration should not add a backend-specific Domain attribute.
5. Verify /api/products returns the actual database catalog, then POST a quote using one of those product IDs. Earlier Pages hard-coded IDs may no longer match database IDs: remove stale bag items and add products again if the API reports an unavailable item.
6. Check sign-in → bag → quote → promo → order → Razorpay in test mode. The live configuration and payment test have not been performed by this change.

The actual backend origin is not available in the repository. No value has been invented and no Cloudflare account setting has been changed. The supplied preview URL identifies the frontend, not the Express service.
