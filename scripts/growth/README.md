# Phase 1: read-only growth audit

No storefront files are modified. There is no content or video publisher. Future phases are gated in root `AGENTS.md`.

## Offline test / dry run (Python 3.11+)

From the repository root:

```bash
python -m unittest discover -s scripts/tests -v
python -m scripts.growth.audit --dry-run
```

Dry run uses synthetic HTML, never contacts the network, and needs no dependencies beyond Python's standard library. It writes `reports/dry-run/audit.md` and `data/generated/dry-run/*.json`, explicitly labelled fixtures. It never overwrites the real audit.

## Live audit

```bash
python -m venv .venv-growth
. .venv-growth/bin/activate
python -m pip install -r scripts/growth/requirements.txt
# Set the credentials below through your shell/secret manager; do not paste them in chat.
python -m scripts.growth.audit
# CI validation after all sources are connected:
python -m scripts.growth.audit --require-complete
```

The live runner writes `reports/audit.md`, safe `reports/run-log.md`, and git-ignored `data/generated/live/*.json`. Missing credentials or denied requests are recorded as gaps. `--require-complete` returns a failing exit code for partial live audits, after writing their report. Runtime determines the most recent 90-day range ending three days before the current Pacific date; it requests final GSC data. GA4 uses the same calendar labels in its property's timezone, documented in response metadata; daily attribution across the two systems is not identical.

### Credentials and permissions

1. Create a dedicated Google Cloud service account, enable Search Console API and Google Analytics Data API, and add that service-account email to the exact Search Console property (`https://thecrunchera.com/`) with reporting access. Add it as **Viewer** on the GA4 property. Its scope is limited to `webmasters.readonly` and `analytics.readonly`; no ecommerce, site, Ads or social write scopes.
2. Set exactly one of `GOOGLE_SERVICE_ACCOUNT_JSON` (entire JSON, convenient as a GitHub Actions secret) or `GOOGLE_APPLICATION_CREDENTIALS` (absolute path to a private local key file outside the repo). Do not commit that key or filled env files. For CI, repository secret `GOOGLE_SERVICE_ACCOUNT_JSON` is passed only to the reporting step.
3. Set `GA4_PROPERTY_ID` to the numeric property ID, not a `G-...` measurement ID. In CI this is the `GA4_PROPERTY_ID` repository variable.
4. Optional: `PAGESPEED_API_KEY`, with PageSpeed Insights API enabled. This runner skips speed when absent; it never guesses from HTTP response times. CI uses a secret with the same name.

A local-only dated supplemental snapshot may be supplied at ignored `data/generated/bootstrap-observations.json`. Reports label it separately; it never stands in for fresh service-account measurements and is not refreshed by the runner. The repository contains no connector-derived analytics snapshot. Review generated reports before sharing them.

A ChatGPT/GSC Wizard OAuth connection is separate from these credentials. The current GSC Wizard session has no GA4 scope, even if the founder has configured GA4 on the site. No YouTube/Instagram/keyword provider setup is requested yet.

### What gets checked

- Titles, descriptions, canonical tags, H1 count, meta robots, crawlable internal links and internal 404/410s from bounded initial HTML.
- `robots.txt` directives and sitemap/sitemap-index XML. Respect robots; stop if robots cannot be read. Crawl caps and blocked URLs are explicit gaps. No external-link requests, anchor checks or JS rendering. Only configured content paths are fetched; unapproved routes (including logout/auth actions) are skipped and reported. Off-origin redirects are blocked. Redirected URLs are reported; a working 301 is not itself a defect.
- Structural Product/Offer, Article, FAQ and Breadcrumb JSON-LD heuristics. Missing optional FAQ/Breadcrumb does not imply Google requires it. No fake availability or ratings. This is not a full rich-results validator.
- GSC property totals, daily series, queries and pages, separately paginated. Raw official GSC CTR is a fraction; report converts it to percent. Query rows exclude anonymised searches, and API internal limits may omit rows even when pagination ends. Query totals must not replace property totals.
- GA4 landing pages for **all traffic** and **google / organic**, hostname-filtered. Sessions, configured key events, ecommerce purchases, purchase revenue (requested INR) and derived revenue per session. GA4 `purchaseRevenue` is attributed analytics data, not payment reconciliation. Query strings remain distinct; raw exports stay private and ignored by git. Reports omit query strings to reduce accidental personal-data exposure; multiple variant/query rows can consequently display the same path. `limit_reached`, sampling and thresholding metadata stay in exports. Key events must not be described as purchases.
- PageSpeed mobile and desktop Lighthouse lab score, LCP, CLS, TBT on homepage and edamame page; no fabricated field INP.

No report means end-to-end login/cart/payment testing passed. This workflow never submits forms or places orders.

### Operation / stop switch

`touch PAUSE` stops every runner entry point and request, including a run already in progress at its next action boundary. Remove PAUSE to resume. In CI, commit PAUSE to the branch you run against; a local-only file cannot pause another machine. An already in-flight request may finish. Manual CI can also be cancelled in GitHub.

The workflow is **manual only**, with offline mode selected by default. GitHub exposes `workflow_dispatch` only after the workflow exists on the repository default branch (currently `main`); this PR targets the deployment branch and does not change `main`. Until the founder separately approves default-branch adoption, run the commands locally. Do not merge to main merely to enable CI. Scheduling belongs to a later approved phase. It has `contents: read` and cannot push/merge/publish. Results are CI artifacts, never automatic commits. Live raw analytics artifact retention is seven days; access follows repository/Actions access. Do not enable it in a public repository if that audience should not see analytics. Local raw exports are git-ignored. Logs contain labels/statuses, not auth headers or bodies.

## Before Phase 2

Obtain a complete analytics baseline, clarify product variants/claims and shipping threshold basis, review the audit, then ask the founder for an explicit Phase 2 OK. Keyword volumes, top-ten SERPs, content briefs, bundle implementation, video generation and publishing are intentionally not part of Phase 1.
