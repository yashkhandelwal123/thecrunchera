# Delhivery One alongside Shiprocket

Prepared for review; integration uses the B2C parcel API. No live account setup, migration, shipment, pickup, email or wallet operation has been performed by development tests.

## What is included

- Admin chooses Shiprocket or Delhivery One per new paid order.
- Delhivery prepaid pincode serviceability is checked before booking.
- Surface/Express selection, actual packed weight (kg in the UI, grams for Delhivery), and dimensions in cm.
- Shipment manifestation creates the AWB; it does not itself confirm pickup.
- Provider-specific tracking link, manual tracking refresh, and separate customer/admin emails for production bookings.
- Existing Shiprocket shipments retain Shiprocket tracking and assignment flows.
- An atomic database claim prevents simultaneous booking in either provider. Uncertain outcomes remain blocked for manual reconciliation, including network/empty/malformed responses and process crashes.
- Existing customer checkout shipping fees, discounts and payments are unchanged. No promise of lower courier charges; Delhivery uses your account tariff and measured/billable weight.

## Database: apply BEFORE deploying this code

Run `migrations/0002_shipping_provider.sql` against the intended database. This only adds three fields, defaults existing orders to Shiprocket, and does not delete any rows/tables. The app's updated order queries require these columns, so do not deploy the new code before the migration.

## Backend environment settings

Do not put any token in VITE_* settings, frontend source, git, or a chat message.

- `DELHIVERY_ENABLED=true`
- `DELHIVERY_API_TOKEN`: token supplied by your Delhivery One account for the selected environment.
- `DELHIVERY_PICKUP_LOCATION`: exact, case-sensitive warehouse name registered in Delhivery One.
- `DELHIVERY_ENVIRONMENT=production` for the live website; `staging` for local integration testing. Default is staging.

For local API testing, use a separate test database, staging token/location, and development server. The integration explicitly refuses staging bookings when NODE_ENV=production to prevent sandbox AWBs being attached to live customer orders. Staging bookings do not send customer/admin emails. Never change a production service to development mode to get around this check.

Production activation: complete account onboarding/API activation, verify pickup and return addresses and account balance, and validate your account's tariff. Ensure existing Resend sender/API configuration is available for emails. Generate/view API credentials through Delhivery One Settings > API Setup. Do not rotate an already-used token unnecessarily.

## Operations

Admin > All Orders > Create shipment > Delhivery One > enter actual packed parcel measurements > select service > Book Delhivery. The action can create a live carrier booking and incur account charges. It is not a free quote.

For this release, arrange pickup and download labels in Delhivery One after creation. The website does not schedule pickups, generate labels, cancel shipments, perform automatic status polling/webhooks, or import bookings made directly in the Delhivery dashboard. Refresh tracking uses Delhivery's API for Delhivery orders.

All items in the order must fit one parcel; multi-parcel orders and high-value consignments needing e-waybill/invoice review must be booked through the provider dashboard. No tax IDs, invoice identifiers, invoice values beyond the saved order total, or e-waybill data are fabricated.

## If booking is stuck or needs review

Do not clear the marker or repeatedly click booking without checking the provider. Search the chosen provider dashboard for the exact website order UUID. A timeout does not prove that no shipment was created.

- If a booking exists: reconcile its AWB, provider/environment and tracking details to the existing order with developer assistance. Do not create another booking.
- Only if the provider confirms that no booking exists and no request is still in flight may an operator reset `shipment_booking_state` to NULL for that single order to allow retry.
- A failed confirmation email does not undo an accepted booking. Existing email delivery is best-effort; no durable mail queue/backfill is included.

## Tests

`node --import tsx --test server/delhivery.test.ts server/customerOrderEmail.test.ts server/customerShipmentEmail.test.ts server/pricing.test.ts`

Tests use in-memory storage and mocked provider requests. Run with DATABASE_URL unset. Covered: authentication, configuration, invalid dimensions, gram conversion, payload encoding, pincode refusal, booking success, concurrent clicks, cross-provider prevention, bad/empty responses, network failure, tracking, no sandbox email, and preserved checkout totals. Live Delhivery API/UAT and inbox delivery still need account credentials and a test parcel.

## Primary documentation used

- https://one.delhivery.com/developer-portal/document/b2c/detail/order-creation (public JS document includes prepaid payload, weight units and parcel dimensions)
- https://one.delhivery.com/developer-portal/document/b2c/detail/order-tracking
- https://one.delhivery.com/developer-portal/document/b2c/detail/faq
- https://delhivery-express-api-doc.readme.io/reference/1-pincode-servicability-api
- https://help.delhivery.com/docs/api-token-generation

## Admin shipment preparation and rate comparison

Apply `migrations/0003_shipping_plans.sql` to the same database used by Render before deploying this change. It creates an admin-only JSONB table; it does not alter checkout totals or existing shipments.

Add server environment variable `DELHIVERY_PICKUP_PINCODE` with the actual six-digit pincode of the warehouse named in `DELHIVERY_PICKUP_LOCATION`. Do not use the customer's pincode. Live estimates require `DELHIVERY_ENVIRONMENT=production` and a live account with rate API access. Shiprocket origin pincode is read from the pickup address matching `SHIPROCKET_PICKUP_LOCATION`; no extra Shiprocket pincode variable is required.

Workflow:
1. On a paid order without an AWB, choose **Prepare shipment / compare prices**.
2. Enter actual packed box weight and dimensions. Save preparation and compare rates. This only reads carrier APIs and saves a local preparation; it creates no shipment and sends no email.
3. Choose a carrier. For a new Shiprocket order the first action creates its draft only; reopen comparison to assign the chosen courier afterward. Delhivery booking creates the shipment and AWB together, after explicit confirmation.
4. Arrange pickup/download labels on the chosen provider's platform. AWB assignment alone no longer marks an order shipped.

Quotes expire after 15 minutes. Delhivery uses the higher of dead weight and box volumetric weight (cm³ / 5000), converted to grams for its estimate API. Provider assessments can differ. Shiprocket rates show its reported rate and explicit tax caveat; Delhivery shows its returned total amount. These are estimates, not guaranteed final invoices. Partial provider failures show warnings; missing rates are never shown as zero/free shipping. Customers do not receive or see the admin rate plan.

Existing unassigned Shiprocket draft:
- Enter measurements matching the existing draft to compare/assign Shiprocket rates.
- To choose Delhivery, cancel that draft in Shiprocket yourself, then use **Verify Shiprocket cancellation**. The website checks the order/shipment reference, absence of AWB and cancelled status, archives the old reference and unlocks new booking. No cancellation happens automatically.
- If an AWB is already assigned in Shiprocket, switching is blocked. Reconcile that shipment; never book the same parcel twice.

Delhivery One manual booking:
- Prepare locally, then book on Delhivery One with the full website order UUID as the order/reference number.
- Paste the AWB into **Verify & link existing AWB**. The website validates the provider reference, links tracking, and sends existing customer/admin tracking emails. It does not book again. Repeated imports of the same linked AWB do not resend.
- Provider statuses are shown in tracking emails, including when a manually booked parcel is already in transit.

Uncertain booking outcomes remain locked for review. Check the provider dashboard before recovery. This release does not automatically recover ambiguous bookings or sync a manually assigned Shiprocket AWB. Carrier credentials, account entitlement, actual wallet debit, live database migration and email delivery require a live-account smoke test; mocked tests cannot verify them.

Validation: TypeScript, production build and mocked integration tests cover access controls, rates, expired/invalid selection, duplicate assignment, partial/empty responses, verified cancellation, AWB ownership and unchanged customer totals. No test creates a real shipment or sends a real email.
