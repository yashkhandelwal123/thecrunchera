#!/usr/bin/env bash
set -euo pipefail

test -f package.json || { echo "ERROR: Run this from the repository root."; exit 1; }
test -f shared/schema.ts || { echo "ERROR: shared/schema.ts not found."; exit 1; }
test -f server/routes.ts || { echo "ERROR: server/routes.ts not found."; exit 1; }

cat > shared/pricing.ts <<'EOF'
export const FREE_SHIPPING_THRESHOLD = 359;
export const FLAT_SHIPPING_CHARGE = 70;
export const PROMO_CODE = "CRUNCH10";
export const PROMO_PERCENT = 10;

export interface PricingResult {
  subtotal: number;
  discountAmount: number;
  shippingCharge: number;
  total: number;
  promoCode: string | null;
  promoEligible: boolean;
  promoApplied: boolean;
  amountUntilEligible: number;
}

const money = (value: number) => Number(value.toFixed(2));

export function normalizePromoCode(code?: string | null): string {
  return (code ?? "").trim().toUpperCase();
}

export function calculatePricing(
  subtotalInput: number,
  promoCodeInput?: string | null,
): PricingResult {
  const subtotal = money(Math.max(0, subtotalInput));
  const promoEligible = subtotal >= FREE_SHIPPING_THRESHOLD;
  const normalizedPromo = normalizePromoCode(promoCodeInput);
  const promoApplied = promoEligible && normalizedPromo === PROMO_CODE;
  const discountAmount = promoApplied
    ? money((subtotal * PROMO_PERCENT) / 100)
    : 0;
  const shippingCharge = promoEligible ? 0 : FLAT_SHIPPING_CHARGE;
  const total = money(subtotal - discountAmount + shippingCharge);

  return {
    subtotal,
    discountAmount,
    shippingCharge,
    total,
    promoCode: promoApplied ? PROMO_CODE : null,
    promoEligible,
    promoApplied,
    amountUntilEligible: promoEligible
      ? 0
      : money(FREE_SHIPPING_THRESHOLD - subtotal),
  };
}
EOF

python3 <<'PY'
from pathlib import Path

def replace_once(path, old, new):
    p = Path(path)
    s = p.read_text()
    if old not in s:
        raise SystemExit(f"ERROR: expected block not found in {path}. Your branch may differ from db-added.")
    p.write_text(s.replace(old, new, 1))

replace_once(
    "shared/schema.ts",
    '  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),\n  total: decimal("total", { precision: 10, scale: 2 }).notNull(),\n\n  // Shipping address, collected at checkout',
    '  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),\n  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).notNull().default("0"),\n  shippingCharge: decimal("shipping_charge", { precision: 10, scale: 2 }).notNull().default("0"),\n  promoCode: text("promo_code"),\n  total: decimal("total", { precision: 10, scale: 2 }).notNull(),\n\n  // Shipping address, collected at checkout'
)

replace_once(
    "shared/schema.ts",
    '  shippingPincode: z.string().min(4),\n});',
    '  shippingPincode: z.string().min(4),\n  promoCode: z.string().trim().max(50).optional().nullable(),\n});'
)

replace_once(
    "server/routes.ts",
    'import { insertNewsletterSchema, insertContactSchema, checkoutSchema } from "@shared/schema";',
    'import { insertNewsletterSchema, insertContactSchema, checkoutSchema } from "@shared/schema";\nimport { calculatePricing, PROMO_CODE } from "@shared/pricing";'
)

replace_once(
    "server/routes.ts",
    '''      // Shipping is free for now (matches what the cart page already shows).
      const total = subtotal;

      const order = await storage.createOrder(
        {
          userId: req.session.userId!,
          subtotal: subtotal.toFixed(2),
          total: total.toFixed(2),''',
    '''      // Eligibility is based only on the ORIGINAL product subtotal.
      const requestedPromo = checkout.promoCode?.trim() || null;
      const pricing = calculatePricing(subtotal, requestedPromo);

      if (requestedPromo && requestedPromo.toUpperCase() !== PROMO_CODE) {
        return res.status(400).json({ error: "Invalid promo code" });
      }

      const order = await storage.createOrder(
        {
          userId: req.session.userId!,
          subtotal: pricing.subtotal.toFixed(2),
          discountAmount: pricing.discountAmount.toFixed(2),
          shippingCharge: pricing.shippingCharge.toFixed(2),
          promoCode: pricing.promoCode,
          total: pricing.total.toFixed(2),'''
)

p = Path("client/src/contexts/CartContext.tsx")
s = p.read_text()
for old, new in [
    ('  clearCart: () => void;\n  itemCount: number;',
     '  clearCart: () => void;\n  promoCode: string | null;\n  setPromoCode: (code: string | null) => void;\n  itemCount: number;'),
    ('const CART_STORAGE_KEY = "The Crunch era_cart";',
     'const CART_STORAGE_KEY = "The Crunch era_cart";\nconst PROMO_STORAGE_KEY = "The Crunch era_promo";'),
    ('  const [cart, setCart] = useState<Cart>(() => {',
     '  const [promoCode, setPromoCodeState] = useState<string | null>(() => localStorage.getItem(PROMO_STORAGE_KEY));\n\n  const [cart, setCart] = useState<Cart>(() => {'),
    ('  const calculateTotal = (items: CartItem[]): number => {',
     '''  const setPromoCode = (code: string | null) => {
    const normalized = code?.trim().toUpperCase() || null;
    setPromoCodeState(normalized);
    if (normalized) localStorage.setItem(PROMO_STORAGE_KEY, normalized);
    else localStorage.removeItem(PROMO_STORAGE_KEY);
  };

  const calculateTotal = (items: CartItem[]): number => {'''),
    ('  const clearCart = () => {\n    setCart({ items: [], total: 0 });\n  };',
     '  const clearCart = () => {\n    setCart({ items: [], total: 0 });\n    setPromoCode(null);\n  };'),
    ('        clearCart,\n        itemCount,',
     '        clearCart,\n        promoCode,\n        setPromoCode,\n        itemCount,'),
]:
    if old not in s:
        raise SystemExit("ERROR: expected CartContext block not found.")
    s = s.replace(old, new, 1)
p.write_text(s)

p = Path("client/src/pages/CheckoutPage.tsx")
s = p.read_text()
for old, new in [
    ('import { Loader2 } from "lucide-react";',
     'import { Loader2 } from "lucide-react";\nimport { calculatePricing } from "@shared/pricing";'),
    ('  const { cart, clearCart } = useCart();',
     '  const { cart, clearCart, promoCode } = useCart();\n  const pricing = calculatePricing(cart.total, promoCode);'),
    ('        ...form,\n      });',
     '        promoCode,\n        ...form,\n      });'),
    ('              {paymentStatus === "idle" &&\n                `Pay ₹${cart.total.toFixed(2)}`}',
     '              {paymentStatus === "idle" &&\n                `Pay ₹${pricing.total.toFixed(2)}`}'),
]:
    if old not in s:
        raise SystemExit("ERROR: expected CheckoutPage block not found.")
    s = s.replace(old, new, 1)

old = '''              <div className="border-t pt-3 flex justify-between font-bold text-lg">
                <span>Total</span>
                <span className="text-primary">
                  ₹{cart.total.toFixed(2)}
                </span>
              </div>'''
new = '''              <div className="border-t pt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Product subtotal</span>
                  <span>₹{pricing.subtotal.toFixed(2)}</span>
                </div>
                {pricing.promoApplied && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{pricing.promoCode} (10% off)</span>
                    <span>-₹{pricing.discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>{pricing.shippingCharge === 0 ? "FREE" : `₹${pricing.shippingCharge.toFixed(2)}`}</span>
                </div>
                <div className="border-t pt-3 flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span className="text-primary">₹{pricing.total.toFixed(2)}</span>
                </div>
              </div>'''
if old not in s:
    raise SystemExit("ERROR: checkout summary block not found.")
p.write_text(s.replace(old, new, 1))

p = Path("client/src/pages/OrderDetailPage.tsx")
s = p.read_text()
old = '  subtotal: string;\n  total: string;'
new = '  subtotal: string;\n  discountAmount: string;\n  shippingCharge: string;\n  promoCode: string | null;\n  total: string;'
if old not in s:
    raise SystemExit("ERROR: OrderDetail interface block not found.")
s = s.replace(old, new, 1)
old = '''          <div className="border-t pt-3 flex justify-between font-bold text-lg">
            <span>Total</span>
            <span className="text-primary">₹{order.total}</span>
          </div>'''
new = '''          <div className="border-t pt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Product subtotal</span>
              <span>₹{order.subtotal}</span>
            </div>
            {parseFloat(order.discountAmount) > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{order.promoCode ?? "Promo discount"}</span>
                <span>-₹{order.discountAmount}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Shipping</span>
              <span>{parseFloat(order.shippingCharge) === 0 ? "FREE" : `₹${order.shippingCharge}`}</span>
            </div>
            <div className="border-t pt-3 flex justify-between font-bold text-lg">
              <span>Total</span>
              <span className="text-primary">₹{order.total}</span>
            </div>
          </div>'''
if old not in s:
    raise SystemExit("ERROR: OrderDetail total block not found.")
p.write_text(s.replace(old, new, 1))
PY

cat > client/src/pages/CartPage.tsx <<'EOF'
import { useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus, Minus, ShoppingBag, Tag } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { Link } from "wouter";
import { calculatePricing, FREE_SHIPPING_THRESHOLD, PROMO_CODE } from "@shared/pricing";

export default function CartPage() {
  const { cart, removeFromCart, updateQuantity, clearCart, promoCode, setPromoCode } = useCart();
  const [promoInput, setPromoInput] = useState(promoCode ?? "");
  const [promoMessage, setPromoMessage] = useState("");
  const pricing = calculatePricing(cart.total, promoCode);

  const applyPromo = () => {
    const normalized = promoInput.trim().toUpperCase();
    if (!normalized) {
      setPromoCode(null);
      setPromoMessage("");
      return;
    }
    if (normalized !== PROMO_CODE) {
      setPromoCode(null);
      setPromoMessage("Invalid promo code.");
      return;
    }
    if (cart.total < FREE_SHIPPING_THRESHOLD) {
      setPromoCode(null);
      setPromoMessage(`${PROMO_CODE} is available on product orders of ₹${FREE_SHIPPING_THRESHOLD} or more.`);
      return;
    }
    setPromoCode(PROMO_CODE);
    setPromoMessage("10% discount applied.");
  };

  const removePromo = () => {
    setPromoCode(null);
    setPromoInput("");
    setPromoMessage("");
  };

  if (cart.items.length === 0) {
    return (
      <div className="min-h-screen py-12">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center py-20">
            <Card className="max-w-md mx-auto p-12">
              <ShoppingBag className="w-10 h-10 text-muted-foreground mx-auto mb-6" />
              <h2 className="font-heading font-bold text-3xl mb-4">Your cart is empty</h2>
              <p className="text-muted-foreground mb-6">Add some delicious, healthy products to get started!</p>
              <Link href="/products"><Button size="lg" className="rounded-xl">Browse Products</Button></Link>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="font-heading font-bold text-4xl md:text-5xl">Shopping Cart</h1>
            <Button variant="outline" onClick={clearCart} className="rounded-xl">Clear Cart</Button>
          </div>
          <p className="text-muted-foreground">{cart.items.length} {cart.items.length === 1 ? "item" : "items"} in your cart</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {cart.items.map((item) => (
              <Card key={item.product.id} className="p-4 md:p-6">
                <div className="flex gap-4 md:gap-6">
                  <div className="w-24 h-24 md:w-32 md:h-32 rounded-lg bg-muted flex-shrink-0 overflow-hidden">
                    <img src={item.product.image} alt={item.product.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-semibold text-lg mb-1">{item.product.name}</h3>
                      <p className="text-sm text-muted-foreground mb-2">{item.product.category}</p>
                      <p className="text-xl font-bold text-primary">₹{parseFloat(item.product.price).toFixed(2)}</p>
                    </div>
                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" onClick={() => updateQuantity(item.product.id, item.quantity - 1)} disabled={item.quantity <= 1} className="h-8 w-8 rounded-md"><Minus className="w-4 h-4" /></Button>
                        <span className="w-12 text-center font-medium">{item.quantity}</span>
                        <Button variant="outline" size="icon" onClick={() => updateQuantity(item.product.id, item.quantity + 1)} className="h-8 w-8 rounded-md"><Plus className="w-4 h-4" /></Button>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => removeFromCart(item.product.id)} className="text-destructive hover:text-destructive"><Trash2 className="w-5 h-5" /></Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-24">
              <h2 className="font-heading font-bold text-2xl mb-6">Order Summary</h2>

              <div className="mb-6">
                <label className="text-sm font-medium flex items-center gap-2 mb-2"><Tag className="w-4 h-4" />Promo code</label>
                <div className="flex gap-2">
                  <Input value={promoInput} onChange={(e) => setPromoInput(e.target.value)} placeholder="Enter promo code" disabled={pricing.promoApplied} />
                  {pricing.promoApplied
                    ? <Button type="button" variant="outline" onClick={removePromo}>Remove</Button>
                    : <Button type="button" onClick={applyPromo}>Apply</Button>}
                </div>
                {promoMessage && <p className="text-xs mt-2 text-muted-foreground">{promoMessage}</p>}
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-muted-foreground"><span>Product subtotal</span><span>₹{pricing.subtotal.toFixed(2)}</span></div>
                {pricing.promoApplied && <div className="flex justify-between text-muted-foreground"><span>{PROMO_CODE} (10% off)</span><span>-₹{pricing.discountAmount.toFixed(2)}</span></div>}
                <div className="flex justify-between text-muted-foreground"><span>Shipping</span><span className="font-medium">{pricing.shippingCharge === 0 ? "FREE" : `₹${pricing.shippingCharge.toFixed(2)}`}</span></div>
                <div className="border-t pt-3 flex justify-between font-bold text-xl"><span>Total</span><span className="text-primary">₹{pricing.total.toFixed(2)}</span></div>
              </div>

              <div className="mb-5 p-4 bg-accent/10 rounded-xl">
                <p className="text-sm text-center text-muted-foreground">
                  {pricing.promoEligible
                    ? `🎉 FREE shipping unlocked. Use ${PROMO_CODE} for 10% off.`
                    : `Add ₹${pricing.amountUntilEligible.toFixed(2)} more in products to unlock FREE shipping + 10% off with ${PROMO_CODE}.`}
                </p>
              </div>

              <Link href="/checkout"><Button size="lg" className="w-full rounded-xl mb-4">Proceed to Checkout</Button></Link>
              <Link href="/products"><Button variant="outline" size="lg" className="w-full rounded-xl">Continue Shopping</Button></Link>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
EOF

cat > /tmp/thecrunchera-pricing-test.mjs <<'EOF'
import assert from "node:assert/strict";
const calc = (subtotal, code = null) => {
  const eligible = subtotal >= 359;
  const promo = eligible && (code ?? "").trim().toUpperCase() === "CRUNCH10";
  const discount = promo ? Number((subtotal * 0.10).toFixed(2)) : 0;
  const shipping = eligible ? 0 : 70;
  return { discount, shipping, total: Number((subtotal - discount + shipping).toFixed(2)) };
};
assert.deepEqual(calc(280), { discount: 0, shipping: 70, total: 350 });
assert.deepEqual(calc(280, "CRUNCH10"), { discount: 0, shipping: 70, total: 350 });
assert.deepEqual(calc(358, "CRUNCH10"), { discount: 0, shipping: 70, total: 428 });
assert.deepEqual(calc(359), { discount: 0, shipping: 0, total: 359 });
assert.deepEqual(calc(359, "CRUNCH10"), { discount: 35.9, shipping: 0, total: 323.1 });
assert.deepEqual(calc(400, "crunch10"), { discount: 40, shipping: 0, total: 360 });
console.log("Pricing smoke tests passed.");
EOF

node /tmp/thecrunchera-pricing-test.mjs

echo
echo "Pricing update applied and smoke-tested."
echo "IMPORTANT: update the database schema before starting the app:"
echo "  npm run db:push"
echo
echo "Then validate the project:"
echo "  npm run check"
echo "  npm run build"
