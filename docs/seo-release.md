# Clean product URLs and consolidated edamame SEO

## Release scope
- Restore HomePage.tsx and store.css to approved bec73bf design; update only homepage H1 copy.
- Chips use /products/ragi-chips, /products/oats-chips, /products/moong-dal-chips and /products/mix-veg-chips.
- Old /products/{slug}/{id} links receive an HTTP 301, resolved from existing database IDs. IDs remain unchanged in cart, checkout and orders.
- All four edamame SKUs share /edamame-beans. Links such as ?size=400g preselect a size; canonical always excludes the query. Legacy variant links redirect to that same page with the correct size selected.
- The XML sitemap includes only canonical public URLs, once each. robots.txt references it. Private pages remain noindex.
- Server and client emit matching Product/Offer, ProductGroup with four real offers, Organization and FAQPage data. FAQs are visibly rendered from the same data. Ratings and stock claims are not invented. Structured data does not guarantee search enhancements; FAQ markup is not a promise of a Google FAQ rich result.
- Existing ingredients, nutrition and allergen panels retained; add product-specific FAQs and shelf-life guidance. No unprovided shelf-life duration is introduced.
- Checkout, order and admin pages are lazy loaded to reduce initial storefront JavaScript.

## Account setup still needed
- Existing Google verification file: /googlebe65a447e08b2b1e.html. Its presence does not prove current Search Console ownership/status.
- In the verified Search Console property submit or retain https://thecrunchera.com/sitemap.xml, inspect the four clean chips URLs and /edamame-beans, then request indexing after deployment.
- GA4: implemented in the subsequent analytics release with G-Y4RDB3EG4E. See docs/ga4-setup.md for events, verification and browser-measurement limitations.
- Bing Webmaster Tools: sign in and import the verified Search Console property, or provide the verification tag. Submit the same sitemap.
- A public PageSpeed Insights API run was attempted for the production homepage with mobile strategy. Google returned 429 RESOURCE_EXHAUSTED/quota exceeded. No score or Core Web Vitals pass is claimed. Retry https://pagespeed.web.dev/analysis?url=https%3A%2F%2Fthecrunchera.com%2F after this release. Field metrics require sufficient real visitor data.

## Product information still needed
- Confirm full shelf life for ragi, mix veg and edamame; current code has confirmed six months only for oats and moong dal.
- Supply genuine reviews before AggregateRating can be added.
- Add real inventory management before publishing stock availability markup.

## Deployment
No database migration, product-ID change or new environment variable is required for this SEO release. Deploy the new commit on codex/seo-product-pages; do not reselect the older bec73bf commit, as it lacks these SEO changes. The approved layout is included in this new release.
