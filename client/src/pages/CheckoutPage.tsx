import { useState, useEffect } from "react";
import { useRouter } from "wouter";
import { useCart } from "../context/CartContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

interface ShippingRateResult {
  rate: number;
  courierName: string;
  serviceable: boolean;
}

export function CheckoutPage() {
  const router = useRouter();
  const { cart } = useCart();

  const [form, setForm] = useState({
    shippingAddress: "",
    shippingPincode: "",
    shippingPhone: "",
  });

  const [shippingRate, setShippingRate] = useState<ShippingRateResult | null>(
    null,
  );
  const [checkingRate, setCheckingRate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<{ userId: number; email: string } | null>(null);

  useEffect(() => {
    fetch("/api/session")
      .then((res) => res.json())
      .then((data) => {
        if (!data || !data.userId) {
          router("/");
        } else {
          setSession(data);
        }
      });
  }, [router]);

  // Shipping rate check effect - triggers when pincode is valid (6 digits)
  useEffect(() => {
    if (form.shippingPincode.length !== 6) {
      setShippingRate(null);
      return;
    }

    setCheckingRate(true);
    fetch("/api/checkout/shipping-rate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pincode: form.shippingPincode,
        items: cart.items.map((i) => ({ quantity: i.quantity })),
      }),
    })
      .then((res) => res.json())
      .then((data) => setShippingRate(data))
      .catch((err) => {
        console.error("Rate check error:", err);
        setShippingRate(null);
      })
      .finally(() => setCheckingRate(false));
  }, [form.shippingPincode, cart.items]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleCheckout = async () => {
    setError(null);
    setLoading(true);

    try {
      if (
        !form.shippingAddress ||
        !form.shippingPincode ||
        !form.shippingPhone
      ) {
        throw new Error("All fields are required");
      }

      if (form.shippingPincode.length !== 6) {
        throw new Error("Pincode must be 6 digits");
      }

      if (!shippingRate?.serviceable) {
        throw new Error(
          "Shipping not available for this pincode. Please try another.",
        );
      }

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.items,
          shippingAddress: form.shippingAddress,
          shippingPincode: form.shippingPincode,
          shippingPhone: form.shippingPhone,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create order");
      }

      // Launch Razorpay checkout
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => {
        const options = {
          key: data.keyId,
          amount: data.amount,
          currency: data.currency,
          order_id: data.razorpayOrderId,
          handler: async (response: any) => {
            try {
              const verifyRes = await fetch(
                `/api/orders/${data.orderId}/payment-verify`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    razorpayPaymentId: response.razorpay_payment_id,
                    razorpayOrderId: response.razorpay_order_id,
                    razorpaySignature: response.razorpay_signature,
                  }),
                },
              );

              if (verifyRes.ok) {
                router(`/order-confirmation/${data.orderId}`);
              } else {
                throw new Error("Payment verification failed");
              }
            } catch (err) {
              setError("Payment verification failed. Please contact support.");
              console.error("Verification error:", err);
            }
          },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      };
      document.body.appendChild(script);
    } catch (err: any) {
      setError(err.message || "Checkout failed");
    } finally {
      setLoading(false);
    }
  };

  if (!session) {
    return <div>Loading...</div>;
  }

  const subtotal = cart.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const shippingCost = shippingRate?.serviceable ? shippingRate.rate : 0;
  const total = subtotal + shippingCost;

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="mx-auto max-w-2xl px-4">
        <h1 className="text-3xl font-bold mb-8">Checkout</h1>

        {error && (
          <div className="mb-6 rounded-lg bg-destructive/10 p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
            <div className="text-destructive">{error}</div>
          </div>
        )}

        <div className="grid gap-8 md:grid-cols-3">
          <div className="md:col-span-2 space-y-6">
            {/* Shipping Address */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Shipping Address</h2>
              <Textarea
                name="shippingAddress"
                placeholder="Street address, city, state, country"
                value={form.shippingAddress}
                onChange={handleChange}
                className="mb-4"
                rows={4}
              />
              <Input
                type="text"
                name="shippingPincode"
                placeholder="Pincode (6 digits)"
                value={form.shippingPincode}
                onChange={handleChange}
                maxLength={6}
                className="mb-4"
              />
              <Input
                type="tel"
                name="shippingPhone"
                placeholder="Phone number"
                value={form.shippingPhone}
                onChange={handleChange}
              />
            </Card>

            {/* Order Summary */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Order Summary</h2>
              <div className="space-y-2">
                {cart.items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span>
                      {item.name} × {item.quantity}
                    </span>
                    <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Order Total Card */}
          <div className="md:col-span-1">
            <Card className="p-6 sticky top-4">
              <h2 className="text-lg font-semibold mb-4">Total</h2>
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Shipping</span>
                  <span>
                    {checkingRate
                      ? "Calculating..."
                      : shippingRate?.serviceable
                      ? `₹${shippingRate.rate.toFixed(2)} (${shippingRate.courierName})`
                      : form.shippingPincode.length === 6
                      ? "Not available"
                      : "Enter pincode"}
                  </span>
                </div>

                <div className="border-t pt-3 flex justify-between font-semibold">
                  <span>Total</span>
                  <span>₹{total.toFixed(2)}</span>
                </div>
              </div>

              <Button
                onClick={handleCheckout}
                disabled={
                  loading ||
                  checkingRate ||
                  !form.shippingAddress ||
                  !form.shippingPhone ||
                  form.shippingPincode.length !== 6 ||
                  !shippingRate?.serviceable
                }
                className="w-full"
              >
                {loading ? "Processing..." : "Pay with Razorpay"}
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
