import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ShieldAlert, Truck, ExternalLink, RefreshCw } from "lucide-react";

interface AdminOrder {
  id: string;
  status: string;
  total: string;
  createdAt: string;
  customerName: string;
  customerEmail: string;
  shippingName: string;
  shippingPhone: string;
  shippingAddressLine1: string;
  shippingAddressLine2: string | null;
  shippingCity: string;
  shippingState: string;
  shippingPincode: string;
  awbCode: string | null;
  courierName: string | null;
  trackingUrl: string | null;
  shippingStatus: string | null;
}

const STATUS_OPTIONS = ["pending", "paid", "shipped", "delivered", "cancelled"];

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  paid: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  shipped: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  delivered: "bg-green-500/15 text-green-600 dark:text-green-400",
  cancelled: "bg-red-500/15 text-red-600 dark:text-red-400",
};

export default function AdminOrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  const loadOrders = () => {
    setIsLoading(true);
    fetch("/api/admin/orders", { credentials: "include" })
      .then((res) => {
        if (res.status === 403) {
          setForbidden(true);
          return [];
        }
        if (!res.ok) throw new Error("Failed to load");
        return res.json();
      })
      .then((data) => setOrders(data))
      .catch(() =>
        toast({
          title: "Couldn't load orders",
          description: "Something went wrong fetching the order list.",
          variant: "destructive",
        }),
      )
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    if (user) loadOrders();
    else setIsLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const updateStatus = async (orderId: string, status: string) => {
    const prev = orders;
    setOrders((cur) =>
      cur.map((o) => (o.id === orderId ? { ...o, status } : o)),
    );
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      toast({ title: "Order status updated" });
    } catch {
      setOrders(prev);
      toast({
        title: "Failed to update status",
        variant: "destructive",
      });
    }
  };

  const [shippingOrderId, setShippingOrderId] = useState<string | null>(null);
  const [shipForm, setShipForm] = useState({
    weightKg: "0.1",
    lengthCm: "15",
    breadthCm: "10",
    heightCm: "5",
  });
  const [isShipping, setIsShipping] = useState(false);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);

  const openShipForm = (orderId: string) => {
    setShippingOrderId(orderId);
    setShipForm({ weightKg: "0.1", lengthCm: "15", breadthCm: "10", heightCm: "5" });
  };

  const submitShipment = async (orderId: string) => {
    setIsShipping(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/ship`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(shipForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create shipment");

      setOrders((cur) => cur.map((o) => (o.id === orderId ? { ...o, ...data } : o)));
      setShippingOrderId(null);
      toast({
        title: "Shipment created",
        description: `${data.courierName} — AWB ${data.awbCode}`,
      });
    } catch (err) {
      toast({
        title: "Couldn't create shipment",
        description: err instanceof Error ? err.message : "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setIsShipping(false);
    }
  };

  const refreshTracking = async (orderId: string) => {
    setRefreshingId(orderId);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/refresh-tracking`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to refresh");
      setOrders((cur) => cur.map((o) => (o.id === orderId ? { ...o, ...data } : o)));
    } catch (err) {
      toast({
        title: "Couldn't refresh tracking",
        description: err instanceof Error ? err.message : "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setRefreshingId(null);
    }
  };

  if (!authLoading && !user) {
    return (
      <div className="min-h-screen pt-32 pb-16 px-6 flex flex-col items-center text-center gap-6">
        <h1 className="font-heading font-bold text-3xl">Admin sign-in required</h1>
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

  if (forbidden) {
    return (
      <div className="min-h-screen pt-32 pb-16 px-6 flex flex-col items-center text-center gap-4">
        <ShieldAlert className="w-12 h-12 text-muted-foreground" />
        <h1 className="font-heading font-bold text-2xl">Access denied</h1>
        <p className="text-muted-foreground">
          This account doesn't have admin access.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="font-heading font-bold text-3xl mb-8">
          All Orders ({orders.length})
        </h1>

        {orders.length === 0 ? (
          <p className="text-muted-foreground text-center py-16">
            No orders yet.
          </p>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <Card key={order.id} className="p-5">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">
                        #{order.id.slice(0, 8)}
                      </span>
                      <Badge
                        variant="secondary"
                        className={STATUS_COLORS[order.status] ?? ""}
                      >
                        {order.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {order.customerName} · {order.customerEmail}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(order.createdAt).toLocaleString()}
                    </div>
                    <div className="text-sm mt-2">
                      {order.shippingName} · {order.shippingPhone}
                      <br />
                      {order.shippingAddressLine1}
                      {order.shippingAddressLine2
                        ? `, ${order.shippingAddressLine2}`
                        : ""}
                      <br />
                      {order.shippingCity}, {order.shippingState} -{" "}
                      {order.shippingPincode}
                    </div>
                  </div>

                  <div className="flex flex-col items-start md:items-end gap-2">
                    <div className="font-bold text-lg text-primary">
                      ₹{order.total}
                    </div>
                    <Select
                      value={order.status}
                      onValueChange={(value) => updateStatus(order.id, value)}
                    >
                      <SelectTrigger className="w-[140px]" data-testid={`select-status-${order.id}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {order.status === "paid" && !order.awbCode && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openShipForm(order.id)}
                        data-testid={`button-ship-${order.id}`}
                      >
                        <Truck className="w-4 h-4 mr-1" />
                        Ship Now
                      </Button>
                    )}

                    {order.awbCode && (
                      <div className="text-xs text-right space-y-1">
                        <div className="font-medium">{order.courierName}</div>
                        <div className="text-muted-foreground">AWB: {order.awbCode}</div>
                        {order.shippingStatus && (
                          <div className="text-muted-foreground">{order.shippingStatus}</div>
                        )}
                        <div className="flex items-center gap-2 justify-end">
                          {order.trackingUrl && (
                            <a
                              href={order.trackingUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary inline-flex items-center gap-1 hover:underline"
                            >
                              Track <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                          <button
                            onClick={() => refreshTracking(order.id)}
                            disabled={refreshingId === order.id}
                            className="text-muted-foreground hover:text-foreground"
                            data-testid={`button-refresh-tracking-${order.id}`}
                          >
                            <RefreshCw
                              className={`w-3.5 h-3.5 ${refreshingId === order.id ? "animate-spin" : ""}`}
                            />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {shippingOrderId === order.id && (
                  <div className="mt-4 pt-4 border-t grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
                    <div>
                      <Label htmlFor={`weight-${order.id}`} className="text-xs">
                        Weight (kg)
                      </Label>
                      <Input
                        id={`weight-${order.id}`}
                        type="number"
                        step="0.01"
                        value={shipForm.weightKg}
                        onChange={(e) =>
                          setShipForm((f) => ({ ...f, weightKg: e.target.value }))
                        }
                        data-testid={`input-weight-${order.id}`}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`length-${order.id}`} className="text-xs">
                        Length (cm)
                      </Label>
                      <Input
                        id={`length-${order.id}`}
                        type="number"
                        value={shipForm.lengthCm}
                        onChange={(e) =>
                          setShipForm((f) => ({ ...f, lengthCm: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor={`breadth-${order.id}`} className="text-xs">
                        Breadth (cm)
                      </Label>
                      <Input
                        id={`breadth-${order.id}`}
                        type="number"
                        value={shipForm.breadthCm}
                        onChange={(e) =>
                          setShipForm((f) => ({ ...f, breadthCm: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor={`height-${order.id}`} className="text-xs">
                        Height (cm)
                      </Label>
                      <Input
                        id={`height-${order.id}`}
                        type="number"
                        value={shipForm.heightCm}
                        onChange={(e) =>
                          setShipForm((f) => ({ ...f, heightCm: e.target.value }))
                        }
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => submitShipment(order.id)}
                        disabled={isShipping}
                        data-testid={`button-confirm-ship-${order.id}`}
                      >
                        {isShipping ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          "Confirm"
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShippingOrderId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
