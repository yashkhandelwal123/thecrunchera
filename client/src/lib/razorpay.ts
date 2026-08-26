// Loads Razorpay's Checkout script on demand (only when someone actually
// reaches payment) and exposes a small helper to open the payment widget.

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => {
      open: () => void;
      on: (event: string, handler: (response: unknown) => void) => void;
    };
  }
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  order_id: string;
  handler: (response: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => void;
  prefill?: { name?: string; email?: string; contact?: string };
  theme?: { color?: string };
  modal?: { ondismiss?: () => void };
}

let scriptLoadingPromise: Promise<void> | null = null;

function loadRazorpayScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  if (scriptLoadingPromise) return scriptLoadingPromise;

  scriptLoadingPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Razorpay checkout script"));
    document.body.appendChild(script);
  });

  return scriptLoadingPromise;
}

export interface OpenRazorpayCheckoutParams {
  keyId: string;
  amount: number;
  currency: string;
  razorpayOrderId: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  onSuccess: (response: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => void;
  onDismiss?: () => void;
}

export async function openRazorpayCheckout(params: OpenRazorpayCheckoutParams) {
  await loadRazorpayScript();

  if (!window.Razorpay) {
    throw new Error("Razorpay checkout script did not load correctly");
  }

  const rzp = new window.Razorpay({
    key: params.keyId,
    amount: params.amount,
    currency: params.currency,
    name: "The Crunch Era",
    description: "Order payment",
    order_id: params.razorpayOrderId,
    handler: params.onSuccess,
    prefill: {
      name: params.customerName,
      email: params.customerEmail,
      contact: params.customerPhone,
    },
    theme: { color: "#f97316" },
    modal: { ondismiss: params.onDismiss },
  });

  rzp.open();
}
