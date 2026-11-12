-- Admin-only parcel drafts/quotes. No existing orders or pricing fields are changed.
CREATE TABLE IF NOT EXISTS shipping_plans (
  order_id varchar PRIMARY KEY REFERENCES orders(id),
  plan jsonb NOT NULL
);
