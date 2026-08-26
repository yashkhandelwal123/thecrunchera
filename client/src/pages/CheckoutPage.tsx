import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import { openRazorpayCheckout } from "@/lib/razorpay";
import { Loader2 } from "lucide-react";

interface ShippingForm {
  shippingName: string;
  shippingPhone: string;
  shippingAddressLine1: string;
  shippingAddressLine2: string;
  shippingCity: string;
  shippingState: string;
  shippingPincode: string;
}

const EMPTY_FORM: ShippingForm = {
  shippingName: "",
  shippingPhone: "",
  shippingAddressLine1: "",
  shippingAddressLine2: "",
  shippingCity: "",
  shippingState: "",
  shippingPincode: "",
};

export default function CheckoutPage() {
  const { cart, clearCart } = useCart();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [form, setForm] = useState<ShippingForm>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange =
    (field: keyof ShippingForm) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const [paymentStatus, setPaymentStatus] = useState<
    "idle" | "creating-order" | "awaiting-payment" | "verifying"
  >("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.items.length === 0) return;

    setIsSubmitting(true);
    setPaymentStatus("creating-order");
    try {
      // Step 1: create the order (status: pending) with the shipping details.
      const orderRes = await apiRequest("POST", "/api/orders", {
        items: cart.items.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
        })),
        ...form,
      });
      const order = await orderRes.json();

      // Step 2: create a matching Razorpay order for it.
      const rzpOrderRes = await apiRequest(
        "POST",
        "/api/checkout/create-razorpay-order",
        { orderId: order.id },
      );
      const rzpOrder = await rzpOrderRes.json();

      setPaymentStatus("awaiting-payment");

      // Step 3: open Razorpay's Checkout widget for the customer to pay.
      await openRazorpayCheckout({
        keyId: rzpOrder.keyId,
        amount: rzpOrder.amount,
        currency: rzpOrder.currency,
        razorpayOrderId: rzpOrder.razorpayOrderId,
        customerName: form.shippingName,
        customerEmail: user?.email,
        customerPhone: form.shippingPhone,
        onSuccess: async (response) => {
          setPaymentStatus("verifying");
          try {
            // Step 4: verify the payment server-side, then we're done.
            await apiRequest("POST", "/api/checkout/verify", {
              orderId: order.id,
              ...response,
            });
            clearCart();
            toast({
              title: "Payment successful!",
              description: `Your order for ₹${order.total} is confirmed.`,
            });
            navigate(`/orders/${order.id}`);
          } catch (error) {
            toast({
              title: "Payment verification failed",
              description:
                "Your payment may have gone through, but we couldn't confirm it. Please check your orders or contact us.",
              variant: "destructive",
            });
          } finally {
            setIsSubmitting(false);
            setPaymentStatus("idle");
          }
        },
        onDismiss: () => {
          // Customer closed the payment widget without paying — the order
          // stays pending, they can retry from the order detail page.
          setIsSubmitting(false);
          setPaymentStatus("idle");
          toast({
            title: "Payment cancelled",
            description:
              "Your order is saved and still pending. You can complete payment anytime from your orders.",
          });
          navigate(`/orders/${order.id}`);
        },
      });
    } catch (error) {
      toast({
        title: "Something went wrong",
        description: "We couldn't place your order. Please try again.",
        variant: "destructive",
      });
      setIsSubmitting(false);
      setPaymentStatus("idle");
    }
  };

  if (cart.items.length === 0) {
    return (
      <div className="min-h-screen pt-32 pb-16 px-6 text-center">
        <h1 className="font-heading font-bold text-3xl mb-4">
          Your cart is empty
        </h1>
        <Button onClick={() => navigate("/products")}>
          Browse Products
        </Button>
      </div>
    );
  }

  if (!authLoading && !user) {
    return (
      <div className="min-h-screen pt-32 pb-16 px-6 flex flex-col items-center text-center gap-6">
        <h1 className="font-heading font-bold text-3xl">
          Sign in to check out
        </h1>
        <p className="text-muted-foreground max-w-md">
          We use your Google account to keep track of your orders so you can
          see them anytime.
        </p>
        <GoogleSignInButton />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-6">
      <div className="max-w-4xl mx-auto">
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-heading font-bold text-3xl md:text-4xl mb-8"
        >
          Checkout
        </motion.h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-6">
            <Card className="p-6 space-y-4">
              <h2 className="font-heading font-bold text-xl mb-2">
                Shipping Address
              </h2>

              <div>
                <Label htmlFor="shippingName">Full name</Label>
                <Input
                  id="shippingName"
                  required
                  value={form.shippingName}
                  onChange={handleChange("shippingName")}
                  data-testid="input-shipping-name"
                />
              </div>

              <div>
                <Label htmlFor="shippingPhone">Phone number</Label>
                <Input
                  id="shippingPhone"
                  type="tel"
                  required
                  value={form.shippingPhone}
                  onChange={handleChange("shippingPhone")}
                  data-testid="input-shipping-phone"
                />
              </div>

              <div>
                <Label htmlFor="shippingAddressLine1">Address line 1</Label>
                <Input
                  id="shippingAddressLine1"
                  required
                  value={form.shippingAddressLine1}
                  onChange={handleChange("shippingAddressLine1")}
                  data-testid="input-shipping-address1"
                />
              </div>

              <div>
                <Label htmlFor="shippingAddressLine2">
                  Address line 2 (optional)
                </Label>
                <Input
                  id="shippingAddressLine2"
                  value={form.shippingAddressLine2}
                  onChange={handleChange("shippingAddressLine2")}
                  data-testid="input-shipping-address2"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="shippingCity">City</Label>
                  <Input
                    id="shippingCity"
                    required
                    value={form.shippingCity}
                    onChange={handleChange("shippingCity")}
                    data-testid="input-shipping-city"
                  />
                </div>
                <div>
                  <Label htmlFor="shippingState">State</Label>
                  <Input
                    id="shippingState"
                    required
                    value={form.shippingState}
                    onChange={handleChange("shippingState")}
                    data-testid="input-shipping-state"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="shippingPincode">Pincode</Label>
                <Input
                  id="shippingPincode"
                  required
                  value={form.shippingPincode}
                  onChange={handleChange("shippingPincode")}
                  data-testid="input-shipping-pincode"
                />
              </div>
            </Card>

            <Button
              type="submit"
              size="lg"
              className="w-full rounded-xl"
              disabled={isSubmitting}
              data-testid="button-place-order"
            >
              {paymentStatus === "creating-order" && (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Preparing your order...
                </>
              )}
              {paymentStatus === "awaiting-payment" && (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Waiting for payment...
                </>
              )}
              {paymentStatus === "verifying" && (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Confirming payment...
                </>
              )}
              {paymentStatus === "idle" &&
                `Pay ₹${cart.total.toFixed(2)}`}
            </Button>
          </form>

          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-24">
              <h2 className="font-heading font-bold text-xl mb-4">
                Order Summary
              </h2>
              <div className="space-y-3 mb-4">
                {cart.items.map((item) => (
                  <div
                    key={item.product.id}
                    className="flex justify-between text-sm"
                  >
                    <span className="text-muted-foreground">
                      {item.product.name} × {item.quantity}
                    </span>
                    <span>
                      ₹
                      {(
                        parseFloat(item.product.price) * item.quantity
                      ).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="border-t pt-3 flex justify-between font-bold text-lg">
                <span>Total</span>
                <span className="text-primary">
                  ₹{cart.total.toFixed(2)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                You'll be asked to pay via Razorpay (UPI, cards, netbanking)
                after clicking "Pay". Your order is created first and marked
                paid automatically once payment is confirmed.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
