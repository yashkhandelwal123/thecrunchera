-- Apply before deploying provider support. Additive: existing shipments stay on Shiprocket.
BEGIN;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_provider text NOT NULL DEFAULT 'shiprocket';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_environment text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipment_booking_state text;
COMMIT;
