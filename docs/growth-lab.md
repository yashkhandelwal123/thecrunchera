# Growth lab v1

URL: `/admin/growth`. Uses the existing ADMIN_EMAILS server check. No new API key.

## Launch

Deploy with the experiment paused and no automatic database migration. Sign in
as an administrator, review the two fixed messages, check the approval and label-evidence confirmation boxes,
and select Approve and start test. This transaction creates only the four
`growth_*` tables if missing and records the approval. It requires CREATE TABLE
permission. No existing table is altered or deleted. A database failure leaves
the product description unchanged. The dashboard displays an actionable error.

Participants must explicitly opt in through the inline product-page prompt or `/privacy-policy` and must not have
browser analytics disabled or Global Privacy Control enabled. This limits the
sample to volunteers; do not generalise results to every shopper. There is an inline, dismissible prompt with equal allow/decline controls; no
recruitment popup and no tracking before opt-in. Signed-in admins and common
crawler user agents are excluded. Anonymous admins cannot be recognised.

## What learns

One fixed 50/50 experiment, `edamame-message-v1`, with existing description as
control and an owner-supplied protein claim as alternative. Assignment is stored
in the existing server session and remains stable for that session. Assignments
log selection probability (0.5), first visible exposure and timestamps. Clearing
cookies, signing out or another device can create a new experimental unit.
This first release is a randomised experiment plus a Bayesian shadow learner,
not a contextual bandit or an autonomously retrained LLM. The Beta(1,1) posterior mean and 95% equal-tail credible interval update when the admin refreshes data. No allocation changes automatically.
A gate of 100 mature viewed sessions per arm and 20 converted sessions overall permits
review, not a claim of statistical significance. No winner is declared.

Seven days after first exposure, the session becomes mature. An attributed
order must be created after exposure and within seven days, contain a known
edamame SKU, have a payment ID, have a signature-verified payment callback
recorded within seven days, and remain paid/shipped/delivered. Payment attribution
failure never reverses or fails a valid payment; it can cause undercounting.
Repeated verify callbacks do not change the first recorded verification time.
Order linking is server-side, unique by order ID; there is no client purchase
endpoint. A session counts once even if it purchases several times. Merchandise
revenue sums qualifying orders after discounts, excludes delivery, and includes
other merchandise in the same order. This is not net profit or incremental lift.
Cancellation is reflected on refresh. Partial refunds and external reconciliation
are not integrated. These limitations preclude automatic advertising budgets.

Pausing restores original copy on future page loads and stops assignments.
Already rendered pages stay as displayed. Existing links and eligible attribution
continue. Re-start resumes the same experiment; it does not reset it or change
copy. Opt-out drops the session attribution reference and prevents future order
links; already recorded history remains. Honour deletion requests by locating
an order's assignment, deleting its growth_order_links, then its
 growth_assignments record (do not delete the order). No customer names, emails,
addresses or raw query parameters are stored in these tables.

## Validation

`npm run check`
`env -u DATABASE_URL node --import tsx --test server/growth.test.ts server/seo.test.ts server/pricing.test.ts server/databasePool.test.ts`
`npm run build`

The growth test uses embedded PostgreSQL (PGlite) and fake orders locally, never
Neon. It exercises migrations, admin gate wiring, origin checks, consent,
assignment reuse, exposure deduplication, order deduplication, mature cohorts,
verified purchases, cancellations, opt-out, pause and database failure fallback.

## Next stages

Connect costs, refunds, acquisition source and GA4/GSC reporting. Plan a
statistical evaluation with uncertainty and an untouched holdout. Only then
consider bounded adaptive selection, with action probabilities recorded and
versioned policies. Ad spend, messaging campaigns, external API calls, automatic
content publishing and LLM fine-tuning are not implemented or enabled.

## Feasibility and uncertainty update

The existing cookie lasts 30 days; a return three days later does not normally
create a new assignment. No new persistent tracking ID was added. Cookie loss,
session regeneration and other devices remain limitations.

The dashboard calculator takes measured daily edamame-page sessions, expected
opt-in-and-view percentage and participant conversion percentage. It estimates
ceil(max(200,20/conversionRate)/eligibleViewsPerDay)+7 days from a fresh start.
Inputs start blank. This is a review-gate planning estimate, not a power analysis;
random allocation and uncertain inputs can extend it. GA4 account data is not
connected and Amazon traffic must not be substituted. Over 90 days triggers a
practical caution. Conversion is primary; whole-order revenue is secondary.

Starting now requires explicit claimVerified=true, enforced server-side and
recorded in the audit action. This is an admin attestation, not verification by
this software or a legal certification. No existing test is automatically started
or stopped by deploying this update. Before/after observations are descriptive,
not causal experiments. No Clarity integration or consent-policy relaxation.
