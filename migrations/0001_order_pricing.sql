-- Apply once before deploying the storefront/checkout update.
-- Additive and safe to rerun if the columns already exist. Does not rewrite old totals.
BEGIN;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount numeric(10,2) NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_charge numeric(10,2) NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS promo_code text;
COMMIT;
