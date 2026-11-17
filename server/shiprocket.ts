const SHIPROCKET_BASE_URL = "https://apiv2.shiprocket.in/v1/external";

// Shiprocket's auth token is valid for 240 hours (10 days). We cache it in
// memory and only re-authenticate when it's missing or actually expired,
// rather than logging in on every request.
let cachedToken: string | null = null;
let tokenExpiresAt = 0;

async function getToken(): Promise<string> {
  const email = process.env.SHIPROCKET_EMAIL;
  const password = process.env.SHIPROCKET_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD must be set. Create an API " +
        "user in your Shiprocket dashboard (Settings → API → Configure → " +
        "Create an API User) and add its credentials to your .env file.",
    );
  }

  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }

  const res = await fetch(`${SHIPROCKET_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Shiprocket login failed (${res.status}): ${body}`);
  }

  const data = await res.json();
  if (!data.token) {
    throw new Error("Shiprocket login response did not include a token.");
  }

  const token: string = data.token;
  cachedToken = token;
  // Refresh a little early (after 9.5 days) to be safe.
  tokenExpiresAt = Date.now() + 9.5 * 24 * 60 * 60 * 1000;
  return token;
}

async function shiprocketRequest(path: string, options: RequestInit = {}) {
  const token = await getToken();
  const res = await fetch(`${SHIPROCKET_BASE_URL}${path}`, {
    ...options,
    signal: AbortSignal.timeout(20000),
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(
      `Shiprocket API error (${res.status}) at ${path}: ${JSON.stringify(data)}`,
    );
  }

  if (!data) throw new Error("Shiprocket returned an empty or invalid JSON response. Check the provider dashboard before retrying a booking.");
  return data;
}

export interface ShiprocketOrderItem {
  name: string;
  sku: string;
  units: number;
  sellingPrice: number;
}

export interface CreateShiprocketOrderParams {
  orderId: string; // our own order id, used as Shiprocket's order_id
  subtotal: number; // Merchandise subtotal after discount, excluding shipping.
  shippingCharge: number;
  discountAmount: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  pincode: string;
  items: ShiprocketOrderItem[];
  weightKg: number;
  lengthCm: number;
  breadthCm: number;
  heightCm: number;
}

/**
 * Creates an order + shipment in Shiprocket for an order that's already
 * paid on our side. Always uses payment_method: "Prepaid" since payment
 * already went through Razorpay before this is ever called.
 */
export async function createShiprocketOrder(params: CreateShiprocketOrderParams) {
  const pickupLocation = process.env.SHIPROCKET_PICKUP_LOCATION;
  if (!pickupLocation) {
    throw new Error(
      "SHIPROCKET_PICKUP_LOCATION is not set. Add a pickup location in " +
        "your Shiprocket dashboard first, then set its exact nickname as " +
        "SHIPROCKET_PICKUP_LOCATION in your .env file.",
    );
  }

  const [firstName, ...rest] = params.customerName.trim().split(" ");
  const lastName = rest.join(" ") || firstName;

  const data = await shiprocketRequest("/orders/create/adhoc", {
    method: "POST",
    body: JSON.stringify({
      order_id: params.orderId,
      order_date: new Date().toISOString().slice(0, 19).replace("T", " "),
      pickup_location: pickupLocation,
      billing_customer_name: firstName,
      billing_last_name: lastName,
      billing_address: params.addressLine1,
      billing_address_2: params.addressLine2 || "",
      billing_city: params.city,
      billing_pincode: params.pincode,
      billing_state: params.state,
      billing_country: "India",
      billing_email: params.customerEmail,
      billing_phone: params.customerPhone,
      shipping_is_billing: true,
      order_items: params.items.map((item) => ({
        name: item.name,
        sku: item.sku,
        units: item.units,
        selling_price: item.sellingPrice,
      })),
      payment_method: "Prepaid",
      sub_total: params.subtotal,
      shipping_charges: params.shippingCharge,
      total_discount: params.discountAmount,
      length: params.lengthCm,
      breadth: params.breadthCm,
      height: params.heightCm,
      weight: params.weightKg,
    }),
  });

  if (!data?.order_id || !data?.shipment_id) throw new Error("Shiprocket did not confirm a shipment ID. Review the provider dashboard before retrying.");
  return {
    shiprocketOrderId: String(data.order_id),
    shipmentId: String(data.shipment_id),
  };
}

/**
 * Auto-assigns the best available courier to an already-created shipment
 * and returns the resulting tracking number (AWB code).
 */
export async function assignAWB(shipmentId: string, courierId?: number) {
  const data = await shiprocketRequest("/courier/assign/awb", {
    method: "POST",
    body: JSON.stringify({ shipment_id: shipmentId, ...(courierId ? { courier_id: courierId } : {}) }),
  });

  const response = data?.response?.data;
  if (!response?.awb_code) {
    throw new Error(
      `Shiprocket did not return an AWB code: ${JSON.stringify(data)}`,
    );
  }

  return {
    awbCode: String(response.awb_code),
    courierName: String(response.courier_name || "Unknown courier"),
  };
}

/**
 * Fetches the current tracking status for a shipment by AWB code.
 */
export async function trackShipment(awbCode: string) {
  const data = await shiprocketRequest(`/courier/track/awb/${awbCode}`);
  const trackData = data?.tracking_data;
  return {
    status: trackData?.shipment_track?.[0]?.current_status || "Unknown",
    trackingUrl: `https://shiprocket.co/tracking/${awbCode}`,
  };
}


export async function inspectShiprocketDraft(order: import('../shared/schema').Order, parcel?: import('../shared/shipping').ShippingParcel) {
  if (!order.shiprocketOrderId || !order.shiprocketShipmentId) throw new Error('Shiprocket draft reference is missing; reconcile it in Shiprocket.');
  const data = (await shiprocketRequest(`/orders/show/${encodeURIComponent(order.shiprocketOrderId)}`))?.data;
  const shipment = data?.shipments;
  if (String(data?.id) !== order.shiprocketOrderId || String(shipment?.id) !== order.shiprocketShipmentId || String(data?.channel_order_id) !== order.id) throw new Error('Shiprocket order reference could not be verified.');
  if (shipment.awb || data?.awb_data?.awb) throw new Error('A courier is already assigned in Shiprocket. Do not book another shipment.');
  if (parcel && (Number(shipment.weight) !== parcel.weightKg || Number(shipment.length) !== parcel.lengthCm || Number(shipment.breadth) !== parcel.breadthCm || Number(shipment.height) !== parcel.heightCm)) throw new Error('Packed measurements differ from the Shiprocket draft. Update the draft or enter its exact measurements before comparing/assigning.');
  return data;
}

export async function shiprocketRates(order: import('../shared/schema').Order, parcel: import('../shared/shipping').ShippingParcel): Promise<import('../shared/shipping').ShippingRate[]> {
  if (order.shiprocketShipmentId) {
    const draft = await inspectShiprocketDraft(order, parcel);
    if (/cancel/i.test(draft.status)) throw new Error('Shiprocket draft is cancelled. Verify cancellation before creating another shipment.');
  }
  const locations = (await shiprocketRequest('/settings/company/pickup'))?.data?.shipping_address;
  const pickup = Array.isArray(locations) ? locations.find((p: any) => p.pickup_location === process.env.SHIPROCKET_PICKUP_LOCATION) : undefined;
  if (!pickup || !/^[1-9]\d{5}$/.test(String(pickup.pin_code))) throw new Error('Shiprocket pickup location/pincode could not be verified. Check SHIPROCKET_PICKUP_LOCATION.');
  const params = new URLSearchParams({ pickup_postcode: String(pickup.pin_code), delivery_postcode: order.shippingPincode, cod: '0', weight: String(parcel.weightKg), length: String(parcel.lengthCm), breadth: String(parcel.breadthCm), height: String(parcel.heightCm), declared_value: order.total });
  if (order.shiprocketOrderId) params.set('order_id', order.shiprocketOrderId);
  const data = await shiprocketRequest(`/courier/serviceability/?${params}`);
  const companies = data?.data?.available_courier_companies;
  if (!Array.isArray(companies)) throw new Error('Shiprocket returned no courier rates. Check serviceability and account access.');
  const rates = companies.filter((c: any) => !Number(c.blocked) && !c.odablock && Number.isFinite(Number(c.rate)) && Number(c.rate) > 0 && Number.isInteger(Number(c.courier_company_id)) && Number(c.courier_company_id) > 0 && Number(c.charge_weight) > 0).map((c: any) => ({
    id: `shiprocket:${c.courier_company_id}`, provider: 'shiprocket' as const, service: String(c.courier_name), amount: Number(c.rate), currency: 'INR' as const, courierId: Number(c.courier_company_id), chargeableWeightKg: Number(c.charge_weight), estimatedDays: c.estimated_delivery_days ? String(c.estimated_delivery_days) : undefined,
    taxNote: 'Rate reported by Shiprocket. Tax, surcharges and final assessed weight may affect the wallet debit; verify in Shiprocket.',
  }));
  if (!rates.length) throw new Error('No usable Shiprocket courier rates are available for this parcel.');
  return rates;
}
