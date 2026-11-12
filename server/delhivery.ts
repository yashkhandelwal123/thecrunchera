import { z } from "zod";
import type { Order, OrderItem } from "@shared/schema";

export const parcelSchema = z.object({
  weightKg: z.coerce.number().finite().positive().max(50),
  lengthCm: z.coerce.number().finite().positive().max(300),
  breadthCm: z.coerce.number().finite().positive().max(300),
  heightCm: z.coerce.number().finite().positive().max(300),
  shippingMode: z.enum(["Surface", "Express"]).default("Surface"),
});
export type Parcel = z.infer<typeof parcelSchema>;

export function delhiveryConfig() {
  const environment = process.env.DELHIVERY_ENVIRONMENT || "staging";
  if (!["staging", "production"].includes(environment)) throw new Error("DELHIVERY_ENVIRONMENT must be staging or production");
  const token = process.env.DELHIVERY_API_TOKEN?.trim();
  const pickupLocation = process.env.DELHIVERY_PICKUP_LOCATION?.trim();
  if (process.env.DELHIVERY_ENABLED !== "true" || !token || !pickupLocation) {
    throw new Error("Delhivery is not configured. Set DELHIVERY_ENABLED, DELHIVERY_API_TOKEN and DELHIVERY_PICKUP_LOCATION on the server.");
  }
  // Sandbox tokens and bookings must never be mixed with live orders.
  if (environment === "staging" && process.env.NODE_ENV === "production") throw new Error("Delhivery staging is disabled on the production website. Complete testing on a separate staging service.");
  return { token, pickupLocation, environment, baseUrl: environment === "production" ? "https://track.delhivery.com" : "https://staging-express.delhivery.com" };
}

async function request(path: string, init: RequestInit = {}) {
  const { token, baseUrl } = delhiveryConfig();
  let response: Response;
  try {
    response = await fetch(baseUrl + path, { ...init, signal: AbortSignal.timeout(20000), headers: { Accept: "application/json", ...init.headers, Authorization: `Token ${token}` } });
  } catch { throw new Error("Delhivery did not respond. If creating a shipment, check Delhivery One before retrying."); }
  let raw: string;
  try { raw = await response.text(); }
  catch { throw new Error("Delhivery response was interrupted. If creating a shipment, check Delhivery One before retrying."); }
  if (!response.ok) throw new Error(`Delhivery returned HTTP ${response.status}. Check API access, account configuration and Delhivery One before retrying a booking.`);
  if (!raw.trim()) throw new Error("Delhivery returned an empty response. Booking outcome must be checked in Delhivery One.");
  try { return JSON.parse(raw); }
  catch { throw new Error("Delhivery returned an invalid JSON response. Booking outcome must be checked in Delhivery One."); }
}

export async function checkDelhiveryServiceability(pincode: string) {
  if (!/^[1-9]\d{5}$/.test(pincode)) throw new Error("A valid six-digit delivery pincode is required");
  const data = await request(`/c/api/pin-codes/json/?filter_codes=${encodeURIComponent(pincode)}`);
  const available = Array.isArray(data?.delivery_codes) && data.delivery_codes.some((entry: any) => {
    const code = entry?.postal_code;
    return String(code?.pin) === pincode && code?.pre_paid === "Y" && !String(code?.remarks || "").trim();
  });
  if (!available) throw new Error("Delhivery prepaid delivery is not available for this pincode. Choose another provider.");
}

export function buildDelhiveryPayload(order: Order, items: OrderItem[], parcel: Parcel, pickupLocation: string) {
  return {
    pickup_location: { name: pickupLocation },
    shipments: [{
      order: order.id, name: order.shippingName,
      add: [order.shippingAddressLine1, order.shippingAddressLine2].filter(Boolean).join(", "),
      pin: order.shippingPincode, city: order.shippingCity, state: order.shippingState, country: "India", phone: order.shippingPhone,
      payment_mode: "Prepaid", cod_amount: "0", total_amount: order.total,
      products_desc: items.map(item => `${item.productName} x ${item.quantity}`).join(", "),
      quantity: String(items.reduce((sum, item) => sum + item.quantity, 0)),
      weight: String(Math.round(parcel.weightKg * 1000)),
      shipment_length: String(parcel.lengthCm), shipment_width: String(parcel.breadthCm), shipment_height: String(parcel.heightCm),
      shipping_mode: parcel.shippingMode,
    }],
  };
}

export async function createDelhiveryShipment(order: Order, items: OrderItem[], parcel: Parcel) {
  const { pickupLocation } = delhiveryConfig();
  if (!items.length) throw new Error("This order has no items; a shipment cannot be created");
  const data = await request("/api/cmu/create.json", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ format: "json", data: JSON.stringify(buildDelhiveryPayload(order, items, parcel, pickupLocation)) }).toString(),
  });
  const pkg = data?.packages?.[0];
  if (data?.success !== true || pkg?.status !== "Success" || !pkg?.waybill || (pkg.refnum && pkg.refnum !== order.id)) {
    throw new Error("Delhivery did not confirm shipment creation. Review this order in Delhivery One before retrying.");
  }
  return { awbCode: String(pkg.waybill), courierName: "Delhivery" };
}

export async function trackDelhiveryShipment(order: Order) {
  const { environment } = delhiveryConfig();
  if (order.shippingEnvironment !== environment) throw new Error("This shipment belongs to a different Delhivery environment. Restore the matching configuration.");
  const data = await request(`/api/v1/packages/json/?waybill=${encodeURIComponent(order.awbCode!)}`);
  const shipment = Array.isArray(data?.ShipmentData) ? data.ShipmentData.find((entry: any) => String(entry?.Shipment?.AWB) === order.awbCode)?.Shipment : undefined;
  const status = shipment?.Status?.Status;
  if (typeof status !== "string" || !status.trim()) throw new Error("Delhivery has not returned a tracking status for this AWB yet");
  return { status };
}

/** Read-only estimate; rate endpoint expects chargeable weight in grams. */
export async function delhiveryRates(order: Order, parcel: Parcel): Promise<import("../shared/shipping").ShippingRate[]> {
  if (delhiveryConfig().environment !== "production") throw new Error("Delhivery does not provide usable shipping rates in staging. Configure live credentials for rate estimates.");
  const origin = process.env.DELHIVERY_PICKUP_PINCODE?.trim();
  if (!origin || !/^[1-9]\d{5}$/.test(origin)) throw new Error("Set DELHIVERY_PICKUP_PINCODE to the pincode of your registered pickup warehouse.");
  await checkDelhiveryServiceability(order.shippingPincode);
  const kg = Math.max(parcel.weightKg, parcel.lengthCm * parcel.breadthCm * parcel.heightCm / 5000);
  const results = await Promise.allSettled((["Surface", "Express"] as const).map(async mode => {
    const query = new URLSearchParams({ md: mode === "Surface" ? "S" : "E", ss: "Delivered", d_pin: order.shippingPincode, o_pin: origin, cgm: String(Math.ceil(kg * 1000)), pt: "Pre-paid" });
    const data = await request(`/api/kinko/v1/invoice/charges/.json?${query}`);
    const charge = Array.isArray(data) ? data[0] : data;
    const amount = Number(charge?.total_amount);
    if (!Number.isFinite(amount) || amount <= 0) throw new Error(`No valid Delhivery ${mode} rate returned`);
    return { id: `delhivery:${mode}`, provider: "delhivery" as const, service: `Delhivery ${mode}`, amount, currency: "INR" as const, chargeableWeightKg: kg, shippingMode: mode, taxNote: "Estimated total includes taxes returned by Delhivery; final billed weight/charges may differ." };
  }));
  const rates = results.flatMap(result => result.status === "fulfilled" ? [result.value] : []);
  if (!rates.length) throw new Error("Delhivery could not return Surface or Express rates. Check account API access and pickup pincode.");
  return rates;
}

/** Verify ownership by provider reference, not by a manually typed tracking URL. */
export async function verifyDelhiveryBooking(order: Order, awb: string) {
  if (!/^\d{8,30}$/.test(awb)) throw new Error("Enter a valid numeric Delhivery AWB");
  const data = await request(`/api/v1/packages/json/?waybill=${encodeURIComponent(awb)}`);
  const shipment = Array.isArray(data?.ShipmentData) ? data.ShipmentData.find((entry: any) => String(entry?.Shipment?.AWB) === awb)?.Shipment : undefined;
  if (!shipment || String(shipment.ReferenceNo) !== order.id) throw new Error("This AWB does not match this website order. Use the full website order ID as the reference in Delhivery One.");
  const status = shipment.Status?.Status;
  if (typeof status !== "string" || !status.trim() || /cancel|return|rto|dto/i.test(status)) throw new Error("This Delhivery booking is not an active forward shipment");
  return { awbCode: awb, courierName: "Delhivery", shippingStatus: status };
}
