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

export interface ShippingParcel {
  weightKg: number;
  lengthCm: number;
  breadthCm: number;
  heightCm: number;
  shippingMode: "Surface" | "Express";
}
export interface ShippingRate {
  id: string;
  provider: "shiprocket" | "delhivery";
  service: string;
  amount: number;
  currency: "INR";
  estimatedDays?: string;
  chargeableWeightKg: number;
  courierId?: number;
  shippingMode?: "Surface" | "Express";
  taxNote: string;
}
export interface ShippingPlan {
  id: string;
  orderId: string;
  parcel: ShippingParcel;
  rates: ShippingRate[];
  warnings: string[];
  expiresAt: string;
  fingerprint: string;
  archivedShiprocketIds?: string[];
}
