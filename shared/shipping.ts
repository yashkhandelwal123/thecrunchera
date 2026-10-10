import type { Order } from "./schema";

export function shipmentTrackingUrl(order: Pick<Order, "shippingProvider" | "awbCode">): string {
  if (!order.awbCode) throw new Error("Tracking number is missing");
  const awb = encodeURIComponent(order.awbCode);
  return order.shippingProvider === "delhivery"
    ? `https://www.delhivery.com/track/package/${awb}`
    : `https://shiprocket.co/tracking/${awb}`;
}

export function shipmentNotificationKey(order: Order): string {
  return order.shippingProvider === "delhivery" ? `delhivery/${order.awbCode}` : String(order.shiprocketShipmentId);
}
