# SEO rollout for Render

This change targets the existing Express deployment on Render. Build with `npm ci && npm run build` and start with `npm start`. A static-only deployment will not run the SEO response handlers. Keep the existing production DATABASE_URL: the development memory catalog generates new IDs on restart and is not suitable for permanent product URLs.

## What changed

| File | Purpose |
| --- | --- |
| shared/seo.ts | Shared public-page metadata, canonical product paths and Product/Offer schema from actual catalog values. |
| server/seo.ts | robots.txt, database-backed sitemap, escaped initial HTML metadata/catalog content, product redirects, noindex and real 404 responses. |
| server/routes.ts | Replace the sitemap that listed nonexistent /faq and /product routes; fix the existing notifyNewOSrder typo that broke payment-confirmation responses. |
| server/vite.ts | Apply SEO responses in development and production; stop static index handling from bypassing homepage metadata. |
| client/src/components/Seo.tsx | Keep titles, canonical URLs, sharing metadata, robots and product schema correct during SPA navigation. |
| client/src/pages/ProductDetailPage.tsx | Product landing page with current description, image, price and existing cart integration; loading, retry and missing-product states. |
| client/src/components/ProductCard.tsx | Crawlable links from product images and names to product pages. |
| client/src/App.tsx | Register product detail routing and metadata updates. |
| client/src/pages/ProductsPage.tsx | Descriptive catalog heading and product-specific introduction. |
| client/index.html | Allow mobile zoom. |
| client/src/components/ui/button.tsx | Define the link variant already used by the footer, resolving existing type errors. |
| client/src/pages/ManufacturingDetails.d.ts | Type the existing JavaScript component without changing its implementation. |
| server/seo.test.ts | Regression coverage for escaping, JSON-LD, sitemap, canonical redirects, status codes and indexing directives. |
| docs/seo-rollout.md | Deployment verification and remaining business work. |

No database migrations or product-price changes. No payment requests, emails or production writes were made during testing. The existing notification function typo is corrected; payment signature verification and pricing calculations remain as they were.

## Validation

- `npm run check`
- `npm run build`
- `env -u DATABASE_URL node --import tsx --test server/seo.test.ts` (isolated memory catalog)
- Smoke-test the built Express server: homepage, catalog, sitemap, robots, product initial HTML and checkout noindex.

The production build still reports its existing large JavaScript chunk and tooling-data/PostCSS warnings. This is not a full performance audit. Live site inspection was limited by network timeouts; production Neon data, authenticated checkout and browser visual behaviour were not tested.

## After deployment

1. Inspect `/sitemap.xml` and a product URL from it. View source and confirm the product name, actual price, canonical URL and Product JSON-LD are in the initial HTML. Check one nonexistent product returns HTTP 404.
2. Submit `https://thecrunchera.com/sitemap.xml` in Google Search Console. Use URL Inspection on the homepage, catalog and each product. Review indexing and search performance after Google recrawls.
3. Run Google's Rich Results Test on product URLs and PageSpeed Insights on mobile. Address measured bottlenecks before making broad performance changes.
4. Configure Google Merchant Center free listings with matching prices, actual availability, identifiers where assigned, shipping settings and return policy. Do not invent GTINs or availability. The current database has no stock field, so schema intentionally does not assert stock availability.
5. Verify purchase tracking in an analytics account before spending on ads. Track product views, add-to-cart, checkout and confirmed purchases; never count a button click as a paid order.

## Product content needed to improve sales

Supply verified pack weight, ingredients, allergen information, nutrition facts, shelf life, manufacturer details and clear label photos for each product. Add the real delivery charge, delivery estimate and applicable returns information near the buying decision. These facts should come from approved product packaging and actual operating policies.

The manufacturing page currently contains only a welcome sentence, so it is excluded from the sitemap and marked noindex until substantive content is available. Existing catalog descriptions and marketing claims were preserved; verify claims such as organic, high-protein and gluten-free against your product evidence before expanding them.

Start with product search intent: “buy ragi chips online”, “oats chips online”, “moong dal chips” and “mix veg chips”. These are suggested topics, not measured keyword volumes or ranking guarantees. Build helpful product content first, then publish genuinely useful snack and ingredient content that links to the appropriate products. Collect real customer reviews; do not add invented ratings to structured data.

## Scope of rendering

Express supplies metadata for public routes and initial catalog/product content on the homepage, catalog and product pages. React replaces that initial content with the existing interactive application. This is not full-site React SSR; other page bodies still render in the browser. It delivers the same response to shoppers and crawlers, without user-agent detection.

Useful references:
- https://developers.google.com/search/docs/specialty/ecommerce/designing-a-url-structure-for-ecommerce-sites
- https://developers.google.com/search/docs/appearance/structured-data/product
- https://developers.google.com/search/docs/monitor-debug/search-console-start
- https://support.google.com/merchants/answer/13889434
