# The Crunch Era growth workflow

## Scope and phase gates
- Phase 1 is read-only. Do not alter storefront, checkout, login, prices, offers, payment, inventory or database code during this phase.
- Complete and test each phase, report results and wait for the founder's explicit OK before starting the next phase. Phase 2 has not been approved.
- Work on `codex/*` branches and open pull requests. Never push to main or merge/publish without the founder's approval for that exact change.
- Every entry point, scheduled task and external request must check root `PAUSE`. If present, stop without requests or generated outputs. Check again during long runs.

## Business facts and claims
- `config/business.json` records the founder's latest supplied facts. Existing product pages and readable pack labels may provide additional evidence; record the source and date. Conflicts require founder clarification, not silent changes.
- No invented reviews, testimonials, ratings, statistics, certifications, shelf lives, nutrition, delivery promises or medical claims.
- Claims such as healthy, high protein, diabetic friendly and weight loss require applicable pack-label evidence and FSSAI review. If uncertain, flag `[NEED FROM FOUNDER]`. Do not treat a generic selling point as proof for every SKU.
- No keyword stuffing, doorway pages, copied competitor text or mass-produced thin pages. Use original helpful content and a separate factual review on every draft, listing unsupported claims.

## Publishing gates (future phases)
- Phase 1 has no publisher. All generated content, videos, metadata, TTS and renders are drafts.
- Future publishers must fail closed unless the exact item has boolean `APPROVED: true`, an approver, approval timestamp, destination and SHA-256 of the reviewed payload. Any edit invalidates approval. Approval is item-specific, never a repository-wide switch.
- A PR merge, site release, YouTube upload and Instagram upload are separate publish actions requiring approval of that destination. Do not infer approval from a scheduled trigger.
- Maximum three blog pages in any rolling seven days, checked against a persistent publication ledger immediately before publishing. Fail closed if the ledger is missing/unreadable.
- Use real founder-approved product assets in `videos/assets`. Disclose synthetic voice/visuals when required by the platform. Rotate formats; weekly batch approval never approves later edited assets.
- No YouTube or Instagram publishing credentials are needed in Phase 1. Export Instagram deliverables unless Graph API is explicitly configured and approved.

## Data, secrets and operations
- Use official Search Console and GA4 APIs with read-only scopes and a service account from environment variables / CI secrets. OAuth connected in ChatGPT does not provision CI credentials.
- Never commit credentials, tokens, service-account key files, customer/order data or raw analytics exports. Do not ask the founder to paste private keys into chat.
- Log every action/API attempt/result in `reports/run-log.md`, recording provider, safe endpoint label, status and time. Never log request headers, secrets, raw query strings or raw exception bodies. Authentication refresh is logged as an authentication step, without its payload.
- `--dry-run` must use clearly labelled synthetic fixtures and make zero network requests, including auth refresh. Never mix fixture numbers with real observations.
- Live failures, missing integrations, quota limits and partial data are gaps, not zero traffic. Search Console query rows omit anonymised queries; do not sum them into property totals. GA4 key events are not automatically purchases.
- Preserve page rendering and purchasing functionality. Verify type-check, SEO regression tests and build if storefront code ever changes. Never run production writes or place test orders without explicit authorization.
- Run `python -m unittest discover -s scripts/tests -v` for workflow changes. Validate read-only behavior and PAUSE handling. Do not implement a later phase until its gate is passed.
