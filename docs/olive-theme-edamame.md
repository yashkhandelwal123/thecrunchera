# Olive theme and edamame introduction

Prepared for owner review; not deployed.

- Storefront palette: olive (#425d2c), ivory (#faf8f1), charcoal (#273423), restrained lime (#d9e78c). Updated shared visual tokens, shopping surfaces, navigation, footer and responsive logo treatment.
- Original uploaded logo used without cropping in header/footer and favicon. Original product photos copied without edits, including label images.
- Homepage, shop, about, navigation and FAQ now cover chips and roasted edamame. Existing chips remain purchasable through their current product records.
- New /edamame-beans informational page includes supplied 800 g jar, Classic Salt, ingredients, soy warning, manufacturer/packer/importer, China origin, protein and fibre per 100 g. Shared product details explicitly isolate edamame from chip nutrition. Gallery includes all five uploaded photos.
- Metadata and sitemap include the new page. No fabricated price, discount, inventory, shelf life or Offer structured data.
- Edamame is not inserted into the live product database because no selling price was supplied. The informational page provides contact enquiries. If a genuine, priced edamame catalog record exists, it links to that record's existing purchase flow.
- Owner must supply selling price before adding the SKU to the database. Confirm stock availability when activating sales. No checkout, payment, shipping, promo, authentication or notification logic changed.

Validation: TypeScript and build, existing checkout/shipping/email/SEO tests, plus edamame nutrition isolation and no invented price tests. Browser visual validation remains pending because Chromium download in this environment was truncated.

## Approved variants and preview update

Owner supplied 150 g ₹225, 400 g ₹480, 800 g ₹750, and 1 kg ₹850. These supersede the previous price-pending note. Four distinct SKUs retain existing cart, checkout, shipping and email behavior; names include size. Apply additive migration 0004_edamame_variants.sql before activating sales in the real database. Local memory catalog includes them for preview. The page now has size selection and purchase controls, with server catalog pricing and no zero-price fallback. Original uploaded packaging images are shared across sizes.

Actual Chromium desktop (1440px) and mobile (390px) screenshots are in docs/previews. Neither page has horizontal overflow. Browser setup succeeded using a local Chromium package after the initial download failed. These findings supersede the earlier browser-QA limitation.

## Deployment

The server now inserts only the four approved edamame SKU IDs on startup, with ON CONFLICT DO NOTHING. This performs the same additive insert as 0004_edamame_variants.sql, automatically against the configured database, after existing chips seed initialization. No schema changes, deletions or price overwrites occur. Manual migration is optional, not required. Deployment must be verified by checking the live catalog for all four sizes and exact prices.
