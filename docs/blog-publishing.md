# Publishing the snack journal

The journal is at /blog. Content lives in shared/blog.ts and is rendered by shared/BlogContent.tsx for both the initial server HTML and the React app. The same article registry creates metadata and sitemap entries automatically.

To publish another article, add a record to articles with a unique slug, original title/description, actual publication date, original product image/alt text, sections and FAQs. Keep product claims tied to the exact product label. The author is the brand organization, not an invented expert. Update article dates only after a substantive edit, and keep visible dates and schema synchronized. The current first article uses 20 October 2026. Dates are stored per article and visible dates are formatted from that record.

Included: /blog index, article page, navigation/footer links, contextual product link, headings, table of contents, nutrition table, label references, related product links, CTAs, responsive typography, canonical, Open Graph/Twitter previews, BlogPosting and BreadcrumbList JSON-LD, server-rendered text and sitemap discovery. Unknown article URLs return 404/noindex. No CMS, database migration, newsletter automation or fabricated reviews are introduced.
