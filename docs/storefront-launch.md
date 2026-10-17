# The Crunch Era storefront redesign

## Audit and implementation

The live storefront was inspected on 28 September 2026. The original homepage targeted children and families, used unverified parent testimonials and “thousands of families” claims, displayed unsupported badges, and referred to products beyond the actual chips range. The about page contained an unverified founder story and sourcing claims. Contact included a malformed email address, an unimplemented live chat, and unconfirmed response times. Cart showed every shipment as free; order creation stored only the product subtotal. There was no functional promo entry or discount persistence.

Troovy's public homepage and ragi product page were reviewed for shopping principles: clear prices, product photography, pack choices, visible purchase actions and delivery information. No Troovy assets, reviews, product facts or text were reused.

Implemented:
- Original purple/cream design using the supplied logo and existing product photos; chips-only, age-neutral copy.
- Homepage, product collection, product detail, about, contact, footer and navigation redesign.
- Product sizes from the owner's 60 g specification; quantity selection, Add to Bag, Buy Now, related products and mobile purchase bar.
- Bag and checkout share server-authoritative pricing, promo feedback, delivery progress and line-by-line totals. Totals refresh when quantities/code change; payment is blocked while quotes are loading or invalid.
- Server validates prices from the catalog, quantities, address inputs and expected total; stores shipping, discount and promo with the order. Database order/line insertion is transactional.
- Order details, notifications and Shiprocket payload include the pricing breakdown. Razorpay charges the persisted total as before. Failed payment script loads can be retried.
- Shared catalog presentation replaces unsupported health/certification descriptions for the four existing chips without rewriting database records.
- Earlier SEO work remains: canonical product pages, metadata, Product schema, sitemap, robots and correct 404/noindex handling.

## Exact commercial rules

Rules come from the owner's latest explicit pricing instructions, retrieved during this task:

| Rule | Behaviour |
| --- | --- |
| Shipping below ₹359 original product subtotal | ₹70 |
| Shipping at or above ₹359 original product subtotal | Free |
| CRUNCH10 at a subtotal of exactly ₹450 | Not eligible |
| CRUNCH10 above ₹450 original product subtotal | 10% off merchandise |
| Discount on shipping | None |
| Extra checkout taxes/fees | None added by existing configuration |

All calculations use integer paise. ₹70 × 7 = ₹490 subtotal, ₹49 discount, ₹0 shipping, ₹441 payable. A single ₹70 pack totals ₹140 with shipping. No one-use/customer or expiry restriction has been invented. Confirm the business tax treatment before launch; the implementation does not infer GST rates or advertise tax exemptions.

## Required deployment order

1. Run `migrations/0001_order_pricing.sql` on Neon **before** deploying this version. It only adds the three columns if absent and keeps historical totals unchanged. This file is a manual additive migration, not registered in the existing Drizzle journal. Do not use a destructive schema reset. It has NOT been run on the live database.
2. Keep Render's existing DATABASE_URL, SESSION_SECRET, Google, Razorpay and Shiprocket settings. Build: `npm ci && npm run build`. Start: `npm start`.
3. Confirm both Google client IDs correspond and the production domain is allowed. The site preserves the existing Google sign-in requirement; guest checkout was not added.
4. Check the rendered homepage, product page, cart and checkout at 360/390/768/1440 px. Confirm no horizontal overflow, logo readability, menu keyboard access and sticky purchase-bar spacing.
5. Use Razorpay test mode to complete a purchase, cancel and retry one, and verify order/webhook status. Verify a test Shiprocket order's net merchandise subtotal, discount and shipping in its dashboard before live fulfilment.
6. Recheck Search Console sitemap and product rich results after deployment.

## Information still required from the owner

- Verified ingredient list, allergens, nutrition panel, shelf life and preparation details for each chip.
- Manufacturer/packer name, address, FSSAI details and label images. The placeholder manufacturing route is not indexed.
- Confirm the supplied product imagery accurately represents sale packaging and any claims printed on it.
- Confirm 60 g is still the sale pack size and verify the tax treatment of listed prices.
- Confirm delivery serviceability and realistic delivery estimates. No delivery dates were invented.
- Confirm the contact address already published in the privacy policy (`khandelwalyash6185@gmail.com`) remains the desired support address, or replace it with your business inbox.
- Approve actual customer reviews before adding a review section. No fabricated social proof is displayed.

## Validation and limits

`npm run check`, `npm run build`, and the six tests in `server/pricing.test.ts` / `server/seo.test.ts` pass. Tests cover threshold boundaries, paise rounding, unknown coupons, quantity limits, unavailable products, original database pricing rather than browser prices, unauthenticated order rejection, changed totals, saved totals and line items, sitemap, initial HTML, escaping, canonical redirects and noindex/404s.

Tests run against an isolated in-memory catalog, not live Neon. No live purchase, external notification or shipment was made. The browser inspected the existing public site and Troovy, but blocked access to the local preview (`ERR_BLOCKED_BY_CLIENT`), so redesigned browser visual/mobile QA and external payment/fulfilment verification remain launch gates. Build retains existing tool-data/PostCSS warnings and a roughly 506 kB main JS chunk (down from about 680 kB before the redesign).

## Main file map

- `client/src/store.css`, `client/src/main.tsx`, `client/index.html`: responsive visual system, typography and styles.
- `client/public/brand-logo.jpeg`: supplied logo, unchanged.
- `client/src/components/{BrandLogo,Navbar,Footer,Faq,ProductCard,ProductGrid,QuantitySelector,OrderSummary}.tsx`: shopping UI.
- `client/src/pages/{HomePage,ProductsPage,ProductDetailPage,AboutPage,ContactPage,ShippingPage,CartPage,CheckoutPage,OrderDetailPage}.tsx`: storefront and purchasing experience.
- `client/src/App.tsx`: shipping route.
- `client/src/contexts/CartContext.tsx`, `client/src/hooks/usePricing.ts`: resilient bag state and live quotes.
- `client/src/lib/{queryClient,razorpay}.ts`: useful errors and retriable payment script.
- `shared/{catalog,pricing,seo,schema}.ts`: supported copy, commercial rules, metadata and additive order fields.
- `server/{pricing,routes,storage,shiprocket,notifications,seo}.ts`: authoritative checkout and integration data.
- `server/pricing.test.ts`: pricing/order regression tests.
- `migrations/0001_order_pricing.sql`: required additive database change.

See the PR's Files changed tab for the complete diff. Nothing is merged or deployed by this change.
