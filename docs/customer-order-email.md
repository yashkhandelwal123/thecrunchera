# Customer order confirmations

The existing payment verification and signed Razorpay `payment.captured` webhook paths now send a separate customer confirmation through Resend. The recipient is the ordering user's stored account email, not the admin or shipping recipient. No email is sent when an unpaid order is merely created.

Subject: `Your The Crunch Era order is confirmed! 🎉`

The customer email contains no order number or internal ID. It uses stored order/item snapshots, includes quantity-adjusted line amounts and the saved subtotal, shipping, discount and total. The discount row is hidden when zero; zero shipping displays Free. Customer-entered HTML is escaped. HTML and plain-text versions are sent.

## Configuration

- Keep the existing `RESEND_API_KEY` and `ADMIN_EMAIL` settings on the backend.
- The default customer sender is `The Crunch Era <orders@thecrunchera.com>`, matching the existing admin sender. Its domain must be verified in Resend and the API key must allow sending from it.
- Optional `ORDER_EMAIL_FROM` overrides the customer sender with another verified sender.
- Optional `SUPPORT_EMAIL` sets the visible support email and Reply-To address. Use a monitored inbox. If unset, the email links customers to the site's contact page instead of inventing a support address.
- No database migration or new dependency is needed.

## Duplicate handling and limits

The database update atomically changes only pending orders to paid. Only the winning request triggers notifications; repeat verification/webhook requests cannot reset shipped/delivered orders or trigger another confirmation. Resend also receives separate stable customer/admin idempotency keys (provider retention: 24 hours).

Admin email, customer email and Telegram failures are isolated. Resend's returned API errors are checked and logged instead of being silently treated as success. Like the existing notification flow, this is background best-effort delivery, not a durable queue: a process termination or provider failure can leave an email unsent. There is no automatic historical backfill or resend endpoint in this change. Check backend logs and Resend delivery events when investigating missing mail.

## Verification before production rollout

Run `npm run check`, `npm run build`, and `node --import tsx --test server/customerOrderEmail.test.ts server/pricing.test.ts` in a test environment with DATABASE_URL unset. Tests use memory storage and mocked Resend requests; they do not send email or charge a payment.

After deployment, complete a Razorpay test-mode purchase in a staging environment using an inbox you control. Verify the customer and admin emails, exact subject, correct totals, mobile readability, and Resend delivery status. Replay the signed payment callback/webhook and verify no duplicate email. Production inbox delivery cannot be established by the mocked tests.

## Courier assignment email

The website admin's Assign Courier action sends a separate customer email after the AWB/courier data is saved. Subject: `Tracking details for your The Crunch Era order 📦`. It includes the courier, AWB, tracking link and delivery address, without the internal order number. It says courier assigned, not picked up or out for delivery, and does not invent a delivery date. A shipment without an assigned AWB does not trigger mail. Refresh Tracking does not repeatedly send mail.

The same Resend sender/support settings apply. A shipment-specific idempotency key protects repeated provider requests within Resend's retention period. Failures are logged without undoing the courier assignment; delivery is best-effort, as with order confirmation. Assignments made directly in the Shiprocket dashboard are not observed by this route; those would require a separate webhook integration.

Regression test: `node --import tsx --test server/customerShipmentEmail.test.ts server/customerOrderEmail.test.ts`. All provider calls in these tests are mocked: no live shipment, wallet debit or email is created.
