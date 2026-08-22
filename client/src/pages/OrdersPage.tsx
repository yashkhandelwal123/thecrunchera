import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import { Loader2, Package } from "lucide-react";

interface Order {
  id: string;
  status: string;
  total: string;
  createdAt: string;
}

export default function OrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    fetch("/api/orders", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => setOrders(data))
      .finally(() => setIsLoading(false));
  }, [user]);

  if (!authLoading && !user) {
    return (
      <div className="min-h-screen pt-32 pb-16 px-6 flex flex-col items-center text-center gap-6">
        <h1 className="font-heading font-bold text-3xl">
          Sign in to view your orders
        </h1>
        <GoogleSignInButton />
      </div>
    );
  }

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen pt-32 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="font-heading font-bold text-3xl mb-8">Your Orders</h1>

        {orders.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-6">
              You haven't placed any orders yet.
            </p>
            <Link href="/products">
              <Button>Browse Products</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <Link key={order.id} href={`/orders/${order.id}`}>
                <Card className="p-5 flex justify-between items-center hover-elevate cursor-pointer">
                  <div>
                    <div className="font-medium">
                      Order #{order.id.slice(0, 8)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString()} ·{" "}
                      <span className="capitalize">{order.status}</span>
                    </div>
                  </div>
                  <div className="font-bold text-primary">₹{order.total}</div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
