# Phase 1 SEO and measurement audit

> Read-only run. No storefront changes, publishing, orders or account configuration writes.

Generated: 2026-11-08T00:56:38.211021+05:30 (Asia/Kolkata).
Requested analytics window: 2026-08-07 through 2026-11-04 (90 inclusive days; GSC Pacific dates).

## Coverage and limits

| Component | Status | Evidence / limitation |
|---|---|---|
| Crawl | ok | Initial HTML, same-origin links only; no JavaScript execution or checkout interaction |
| Official GSC / GA4 service-account collector | not_measured | Service-account credentials missing |
| PageSpeed | not_measured | Lighthouse lab only; missing data is not a passing score |

A successful fetch is not proof of Google indexing. Schema checks are structural heuristics, not Google eligibility validation. FAQ markup is inspected when present; it does not promise a rich result. Short product copy alone is not a defect. External links and fragments are not checked; private routes are excluded from crawling. GA4 key events are distinct from purchases.
- PageSpeed: PAGESPEED_API_KEY not configured

## Prioritised fix and verification list

| Priority | Finding / task | Evidence | Action |
|---|---|---|---|
| P0 | Revenue and search baseline incomplete | Official collector has missing or partial inputs | Configure read-only service account and numeric GA4 property ID; rerun before choosing content investments |
| P2 | h1-count | https://thecrunchera.com/shipping | Found 0 H1 headings in initial HTML |
| P2 | no-internal-links | https://thecrunchera.com/shipping | No crawlable internal anchors in initial HTML |
| P2 | h1-count | https://thecrunchera.com/about | Found 0 H1 headings in initial HTML |
| P2 | no-internal-links | https://thecrunchera.com/about | No crawlable internal anchors in initial HTML |
| P2 | h1-count | https://thecrunchera.com/contact | Found 0 H1 headings in initial HTML |
| P2 | no-internal-links | https://thecrunchera.com/contact | No crawlable internal anchors in initial HTML |
| P2 | h1-count | https://thecrunchera.com/privacy-policy | Found 0 H1 headings in initial HTML |
| P2 | no-internal-links | https://thecrunchera.com/privacy-policy | No crawlable internal anchors in initial HTML |
| P2 | h1-count | https://thecrunchera.com/terms-of-service | Found 0 H1 headings in initial HTML |
| P2 | no-internal-links | https://thecrunchera.com/terms-of-service | No crawlable internal anchors in initial HTML |
| P2 | Page experience unmeasured | No complete PageSpeed run | Configure PageSpeed API key and compare mobile/desktop lab results; field INP needs separate CrUX data |
| P2 | Product/offer facts need reconciliation | Founder brief gives 150 g edamame; repository includes other sizes | Confirm supported sizes and threshold basis; do not alter current offers |
| P2 | Verify purchase measurement | GA4 connectivity does not prove purchase events match paid orders | Founder validates purchase event deduplication, INR value and transaction IDs against real orders |
| P3 | missing-breadcrumb-schema | https://thecrunchera.com/edamame-beans | Consider matching visible breadcrumbs; not a ranking requirement |
| P3 | missing-breadcrumb-schema | https://thecrunchera.com/products/ragi-chips | Consider matching visible breadcrumbs; not a ranking requirement |
| P3 | missing-breadcrumb-schema | https://thecrunchera.com/products/oats-chips | Consider matching visible breadcrumbs; not a ranking requirement |
| P3 | missing-breadcrumb-schema | https://thecrunchera.com/products/moong-dal-chips | Consider matching visible breadcrumbs; not a ranking requirement |
| P3 | missing-breadcrumb-schema | https://thecrunchera.com/products/mix-veg-chips | Consider matching visible breadcrumbs; not a ranking requirement |
| P3 | Bundle opportunities for a later phase | Arithmetic from founder prices only, not an experiment result | Six chips cost INR 420; seven cost INR 490 before discount / INR 441 after CRUNCH10. Review margin, stock and shipping rules before publishing a bundle |

## Page audit

| URL | HTTP | Title | H1 count | Schema types |
|---|---|---|---|---|
| https://thecrunchera.com/ | 200 | Chips & Roasted Edamame Beans / The Crunch Era | 1 | Answer, FAQPage, Organization, Question |
| https://thecrunchera.com/products | 200 | Shop Chips & Roasted Edamame / The Crunch Era | 1 |  |
| https://thecrunchera.com/edamame-beans | 200 | Roasted Edamame Beans, Classic Salt / The Crunch Era | 1 | Answer, Brand, FAQPage, Offer, Product, ProductGroup, Question |
| https://thecrunchera.com/products/ragi-chips | 200 | Buy Ragi Chips Online / The Crunch Era | 1 | Answer, Brand, FAQPage, Offer, Product, Question |
| https://thecrunchera.com/products/oats-chips | 200 | Buy Oats Chips Online / The Crunch Era | 1 | Answer, Brand, FAQPage, Offer, Product, Question |
| https://thecrunchera.com/products/moong-dal-chips | 200 | Buy Moong Dal Chips Online / The Crunch Era | 1 | Answer, Brand, FAQPage, Offer, Product, Question |
| https://thecrunchera.com/products/mix-veg-chips | 200 | Buy Mix Veg Chips Online / The Crunch Era | 1 | Answer, Brand, FAQPage, Offer, Product, Question |
| https://thecrunchera.com/blog | 200 | Snack Guides & Ideas / The Crunch Era Journal | 1 |  |
| https://thecrunchera.com/blog/roasted-edamame-beans-guide | 200 | Roasted edamame beans: nutrition & uses / The Crunch Era | 1 | BlogPosting, BreadcrumbList, ImageObject, ListItem, Organization, WebPage |
| https://thecrunchera.com/blog/ragi-oats-moong-dal-mix-veg-chips-guide | 200 | Ragi, oats, moong dal & mix veg chips / The Crunch Era | 1 | BlogPosting, BreadcrumbList, ImageObject, ListItem, Organization, WebPage |
| https://thecrunchera.com/shipping | 200 | Shipping & Offers / The Crunch Era | 0 |  |
| https://thecrunchera.com/about | 200 | About Us / The Crunch Era | 0 |  |
| https://thecrunchera.com/contact | 200 | Contact Us / The Crunch Era | 0 |  |
| https://thecrunchera.com/privacy-policy | 200 | Privacy Policy / The Crunch Era | 0 |  |
| https://thecrunchera.com/terms-of-service | 200 | Terms of Service / The Crunch Era | 0 |  |
| https://thecrunchera.com/product-images/edamame-ingredients.jpg | 200 | not measured | unknown |  |
| https://thecrunchera.com/product-images/edamame-nutrition.jpg | 200 | not measured | unknown |  |

## Official analytics baseline

Search Console property totals: not measured in this run. Query-row totals must not replace property totals.

### GA4 all traffic

Not measured. Service-account credentials missing

### GA4 google organic

Not measured. Service-account credentials missing

## PageSpeed lab measurements

| Page | Device | Status | Score (0–1) | LCP ms | CLS | TBT ms |
|---|---|---|---|---|---|---|

## Required founder inputs

- A service account granted Search Console access and GA4 Viewer access. Supply its key only through local environment / CI secret configuration.
- Numeric GA4 property ID; enable Search Console API and Google Analytics Data API in the key’s Google Cloud project.
- Optional PageSpeed API key with PageSpeed Insights API enabled.
- Confirm edamame variants and whether the free-shipping threshold uses subtotal before or after discount.
- Confirm current pack-label evidence for claims before any Phase 3 draft is approved.

## Next gate

Phase 1 code can run offline and read-only. A complete measurement audit requires the missing inputs above. Phase 2 is not started; wait for founder OK.

## API references

- https://developers.google.com/webmaster-tools/v1/searchanalytics/query
- https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/properties/runReport
- https://developers.google.com/speed/docs/insights/v5/get-started
