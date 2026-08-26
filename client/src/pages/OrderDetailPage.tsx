import { useEffect, useState } from "react";
import { useParams, Link } from "wouter";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { openRazorpayCheckout } from "@/lib/razorpay";
import { CheckCircle2, Clock, Loader2 } from "lucide-react";

interface OrderItem {
  id: string;
  productName: string;
  productImage: string;
  unitPrice: string;
  quantity: number;
}

interface OrderDetail {
  id: string;
  status: string;
  subtotal: string;
  total: string;
  shippingName: string;
  shippingPhone: string;
  shippingAddressLine1: string;
  shippingAddressLine2: string | null;
  shippingCity: string;
  shippingState: string;
  shippingPincode: string;
  createdAt: string;
  items: OrderItem[];
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isPaying, setIsPaying] = useState(false);

  const loadOrder = () => {
    fetch(`/api/orders/${id}`, { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("not found");
        return res.json();
      })
      .then((data) => setOrder(data))
      .catch(() => setNotFound(true))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handlePayNow = async () => {
    if (!order) return;
    setIsPaying(true);
    try {
      const rzpOrderRes = await apiRequest(
        "POST",
        "/api/checkout/create-razorpay-order",
        { orderId: order.id },
      );
      const rzpOrder = await rzpOrderRes.json();

      await openRazorpayCheckout({
        keyId: rzpOrder.keyId,
        amount: rzpOrder.amount,
        currency: rzpOrder.currency,
        razorpayOrderId: rzpOrder.razorpayOrderId,
        customerName: order.shippingName,
        customerEmail: user?.email,
        customerPhone: order.shippingPhone,
        onSuccess: async (response) => {
          try {
            await apiRequest("POST", "/api/checkout/verify", {
              orderId: order.id,
              ...response,
            });
            toast({
              title: "Payment successful!",
              description: `Your order for ₹${order.total} is confirmed.`,
            });
            loadOrder();
          } catch {
            toast({
              title: "Payment verification failed",
              description:
                "Your payment may have gone through. Please refresh or contact us.",
              variant: "destructive",
            });
          } finally {
            setIsPaying(false);
          }
        },
        onDismiss: () => setIsPaying(false),
      });
    } catch {
      toast({
        title: "Something went wrong",
        description: "Couldn't start payment. Please try again.",
        variant: "destructive",
      });
      setIsPaying(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen pt-32 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <div className="min-h-screen pt-32 pb-16 px-6 text-center">
        <h1 className="font-heading font-bold text-3xl mb-4">
          Order not found
        </h1>
        <Link href="/orders">
          <Button>View your orders</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-6">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          {order.status === "pending" ? (
            <Clock className="w-14 h-14 text-muted-foreground mx-auto mb-4" />
          ) : (
            <CheckCircle2 className="w-14 h-14 text-primary mx-auto mb-4" />
          )}
          <h1 className="font-heading font-bold text-3xl mb-2">
            {order.status === "pending" ? "Payment pending" : "Order placed!"}
          </h1>
          <p className="text-muted-foreground">
            Order #{order.id.slice(0, 8)} · Status:{" "}
            <span className="font-medium capitalize">{order.status}</span>
          </p>
          {order.status === "pending" && (
            <Button
              className="mt-4 rounded-xl"
              onClick={handlePayNow}
              disabled={isPaying}
              data-testid="button-pay-now"
            >
              {isPaying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                `Pay ₹${order.total}`
              )}
            </Button>
          )}
        </motion.div>

        <Card className="p-6 space-y-4 mb-6">
          <h2 className="font-heading font-bold text-lg">Items</h2>
          {order.items.map((item) => (
            <div
              key={item.id}
              className="flex justify-between items-center text-sm border-b last:border-0 pb-3 last:pb-0"
            >
              <div className="flex items-center gap-3">
                <img
                  src={item.productImage}
                  alt={item.productName}
                  className="w-12 h-12 rounded-lg object-cover"
                  loading="lazy"
                />
                <div>
                  <div className="font-medium">{item.productName}</div>
                  <div className="text-muted-foreground">
                    Qty {item.quantity} × ₹{item.unitPrice}
                  </div>
                </div>
              </div>
              <div className="font-medium">
                ₹{(parseFloat(item.unitPrice) * item.quantity).toFixed(2)}
              </div>
            </div>
          ))}
          <div className="border-t pt-3 flex justify-between font-bold text-lg">
            <span>Total</span>
            <span className="text-primary">₹{order.total}</span>
          </div>
        </Card>

        <Card className="p-6 space-y-1 text-sm">
          <h2 className="font-heading font-bold text-lg mb-2">
            Shipping to
          </h2>
          <p>{order.shippingName}</p>
          <p>{order.shippingPhone}</p>
          <p>{order.shippingAddressLine1}</p>
          {order.shippingAddressLine2 && <p>{order.shippingAddressLine2}</p>}
          <p>
            {order.shippingCity}, {order.shippingState} -{" "}
            {order.shippingPincode}
          </p>
        </Card>

        <div className="text-center mt-8">
          <Link href="/products">
            <Button variant="outline">Continue Shopping</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
