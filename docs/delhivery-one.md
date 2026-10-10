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
