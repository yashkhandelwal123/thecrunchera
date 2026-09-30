import Money from "@/components/Money";
import { useState, useRef } from "react";
import { Link, useLocation } from "wouter";
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

import OrderSummary from "@/components/OrderSummary";
import { usePricing } from "@/hooks/usePricing";
import { money } from "@shared/pricing";

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
  const { cart, clearCart, promoCode } = useCart();
  const { data: quote, isFetching, isError, refetch } = usePricing();
  const [submitError, setSubmitError] = useState("");
  const submittingRef = useRef(false);
  const pendingOrderRef = useRef<{ fingerprint: string; order: { id: string; total: string } } | null>(null);
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
    if (cart.items.length === 0 || !user || !quote || isFetching || isError || quote.promoError || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitError("");

    setIsSubmitting(true);
    setPaymentStatus("creating-order");
    try {
      // Step 1: create the order (status: pending) with the shipping details.
      const orderPayload = {
        items: cart.items.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
        })),
        ...form,
        promoCode,
        expectedTotalPaise: quote.totalPaise,
      };
      const fingerprint = JSON.stringify(orderPayload);
      const order = pendingOrderRef.current?.fingerprint === fingerprint
        ? pendingOrderRef.current.order
        : await (await apiRequest("POST", "/api/orders", orderPayload)).json();
      pendingOrderRef.current = { fingerprint, order };

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
            navigate(`/orders/${order.id}`);
          } finally {
            setIsSubmitting(false);
            submittingRef.current = false;
            setPaymentStatus("idle");
          }
        },
        onDismiss: () => {
          // Customer closed the payment widget without paying — the order
          // stays pending, they can retry from the order detail page.
          setIsSubmitting(false);
            submittingRef.current = false;
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
      void refetch();
      setSubmitError(error instanceof Error ? error.message : "Your order could not be created. Please try again.");
      toast({
        title: "Something went wrong",
        description: "We couldn't place your order. Please try again.",
        variant: "destructive",
      });
      setIsSubmitting(false);
            submittingRef.current = false;
      setPaymentStatus("idle");
    }
  };

  if (!cart.items.length) return <main id="main-content" className="shell section empty-state"><h1>Your bag is empty.</h1><p>Choose a little crunch before checking out.</p><Link href="/products" className="btn-primary">Explore the chips</Link></main>;
  const fields: { name: keyof ShippingForm; label: string; autoComplete: string; optional?: boolean; full?: boolean; type?: string; pattern?: string; inputMode?: "numeric" | "tel" }[] = [
    { name: "shippingName", label: "Full name", autoComplete: "shipping name", full: true },
    { name: "shippingPhone", label: "Mobile number", autoComplete: "shipping tel", type: "tel", pattern: "(?:\\+91[ -]?)?[6-9][0-9]{9}", inputMode: "tel", full: true },
    { name: "shippingAddressLine1", label: "House / flat number and street", autoComplete: "shipping address-line1", full: true },
    { name: "shippingAddressLine2", label: "Area / landmark (optional)", autoComplete: "shipping address-line2", optional: true, full: true },
    { name: "shippingCity", label: "City", autoComplete: "shipping address-level2" },
    { name: "shippingState", label: "State / union territory", autoComplete: "shipping address-level1" },
    { name: "shippingPincode", label: "Pincode", autoComplete: "shipping postal-code", pattern: "[1-9][0-9]{5}", inputMode: "numeric" },
  ];
  return <main id="main-content" className="shell section"><div className="checkout-steps"><Link href="/cart">01 Bag</Link><span>—</span><strong>02 Checkout</strong><span>—</span><span>03 Payment</span></div><div className="checkout-heading"><h1>One step closer<br />to snack time.</h1><p>Review your bag, add your delivery address, and pay securely through Razorpay.</p></div><div className="bag-grid checkout-layout">
    <div>
      {authLoading ? <div className="checkout-panel" aria-busy="true">Checking your sign-in…</div> : !user ? <div className="checkout-panel"><h2>Sign in to continue</h2><p className="mb-6">Use your Google account to place your order and follow its progress. Your bag and promo code stay here while you sign in.</p><GoogleSignInButton /><p className="mt-5">You can review your total and apply a code before signing in.</p></div> : <form className="checkout-form" onSubmit={handleSubmit}><div className="checkout-panel"><h2>Deliver to</h2><p className="mb-5">Signed in as {user.email} · Delivery within India</p><fieldset disabled={isSubmitting} className="checkout-fields">{fields.map(field => <div key={field.name} className={field.full ? "full-span" : ""}><label htmlFor={field.name}>{field.label}</label><input id={field.name} type={field.type || "text"} autoComplete={field.autoComplete} required={!field.optional} pattern={field.pattern} inputMode={field.inputMode} maxLength={field.name === "shippingPincode" ? 6 : field.name === "shippingPhone" ? 14 : 250} value={form[field.name]} onChange={handleChange(field.name)} /></div>)}</fieldset></div><div className="checkout-panel"><h2>Payment</h2><p>Choose UPI, card or netbanking in Razorpay's secure payment window.</p>{submitError && <p role="alert" className="inline-error mt-4">{submitError}</p>}<button type="submit" className="btn-primary wide" disabled={isSubmitting || isFetching || isError || !quote || !!quote.promoError} data-testid="button-place-order">{paymentStatus === "creating-order" ? "Preparing your order…" : paymentStatus === "awaiting-payment" ? "Complete payment in Razorpay…" : paymentStatus === "verifying" ? "Confirming payment…" : isFetching ? "Updating total…" : quote ? <>Pay <Money paise={quote.totalPaise} /></> : "Waiting for your total…"}</button><p className="summary-note">By placing an order, you agree to our <Link href="/terms-of-service" className="underline">terms</Link> and <Link href="/privacy-policy" className="underline">privacy policy</Link>.</p></div></form>}
    </div>
    <div className="checkout-summary"><div className="checkout-panel mb-5"><div className="flex justify-between items-center"><h2>Your chips</h2><Link href="/cart" className="text-link">Edit bag</Link></div>{cart.items.map(item => <div key={item.product.id} className="flex gap-3 items-center py-3 border-b last:border-0"><img src={item.product.image} alt={item.product.name} width="48" height="48" className="rounded-lg" /><div className="text-sm"><strong>{item.product.name}</strong><p>{item.quantity} {item.quantity === 1 ? "pack" : "packs"}</p></div></div>)}</div><fieldset disabled={isSubmitting}><OrderSummary /></fieldset></div>
  </div></main>;
}
