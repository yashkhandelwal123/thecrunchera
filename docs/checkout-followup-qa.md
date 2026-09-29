# Checkout and readability follow-up — 28 September 2026

## Changes

- Fluid 1600px maximum storefront container with responsive 18–56px side gutters. At 1280/1440/1920px viewports the intended container widths are 1216/1368/1600px. Product grids, hero and checkout columns retain mobile breakpoints; prose retains a readable measure.
- Increased navigation, body, labels, inputs, promo text, prices, buttons and footer typography. Currency uses nonbreaking spacing after ₹, normal letter spacing and tabular numerals.
- Shared API reader distinguishes empty bodies, unexpected content types, malformed JSON, HTTP failures and network failure. Errors retain status, content type and diagnostic reason without showing raw proxy HTML. Invalid totals never enable payment.
- Server now returns JSON 404s for unknown API paths instead of falling into the SPA. Error middleware returns JSON without rethrowing after headers are sent. That rethrow previously entered Express's headers-sent error handling, which can close the socket.
- Promo input handles empty submissions and retries; failed/stale quotes no longer display a misleading applied-code or free-shipping success message.

## Investigation evidence and limits

The frontend calls same-origin POST /api/checkout/quote with product IDs, quantities and the promo code. The server reads catalog prices, computes shipping and discounts in integer paise, and returns line items and totals. Order creation requotes and rejects changed totals; Razorpay uses the persisted order total.

The prior frontend unconditionally called response.json(). Empty bodies cause the reported parse error; HTML/plain-text responses also fail parsing. The quote route already explicitly returns JSON for successful pricing, invalid cart data and storage failures. The new handlers address errors outside that route and unknown endpoint responses as well.

A live diagnostic request to both /api/products and /api/checkout/quote received HTTP 403, Content-Type text/plain, body `error code: 1010`, from Cloudflare. This is evidence of the probe being blocked, NOT proof of the exact response the customer's browser received. No production server logs or failing browser Network capture were available. The exact production incident root cause remains unconfirmed.

GitHub db-added at 761fa22 does not contain /api/checkout/quote. The current redesign lives in the open codex/seo-product-pages PR. Frontend and Express backend MUST be deployed together; publishing only dist static assets or running the old server will not supply this endpoint.

## Verified locally

`npm run check`, `npm run build`, and:

```
env -u DATABASE_URL node --import tsx --test server/pricing.test.ts server/seo.test.ts server/apiErrors.test.ts
```

Tests cover authoritative catalog pricing and quantities, shipping boundaries, promo threshold/case/invalid/removal, persisted order totals, unauthenticated orders, changed-total rejection, missing/invalid product data, quote storage failure (503 JSON), malformed requests (400 JSON), unknown API routes (404 JSON), server exceptions (500 JSON), continued server availability, empty/non-JSON/malformed responses, network failures and cancellation. Orders created by tests are in isolated memory storage; no payment, shipment or customer notification is sent.

Examples: 1 × ₹70 gives ₹70 subtotal + ₹70 shipping = ₹140; 7 × ₹70 with CRUNCH10 gives ₹490 subtotal − ₹49 discount + ₹0 shipping = ₹441. Removing the code restores ₹490. Shipping uses the original merchandise subtotal.

## Launch / remaining verification

1. Apply migrations/0001_order_pricing.sql, then deploy the complete PR with `npm run build` and `npm start` on the existing Express service. Do not use static-only hosting.
2. Confirm Google sign-in, database/session settings and Razorpay test-mode settings in that deployment. No invented promo expiry or tax rate was added.
3. Capture the failing request's status, content type and response body in browser Network if the issue persists, and correlate its timestamp with Render/Cloudflare logs. Never send cookies, tokens or payment credentials in a diagnostic export.
4. Browser access to the local preview was blocked (ERR_BLOCKED_BY_CLIENT). Desktop/mobile rendered visual QA and the complete interactive add-to-cart/payment journey are NOT signed off. Verify 390/768/1280/1440/1920px on a reachable preview of this branch, including currency spacing, scrolling, cart updates, code apply/remove and Razorpay test payment/verification. A build and HTTP tests do not substitute for these checks.
