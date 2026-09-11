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
  subtotal: number;
  customerName: string;
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
      billing_email: "orders@thecrunchera.com",
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
      length: params.lengthCm,
      breadth: params.breadthCm,
      height: params.heightCm,
      weight: params.weightKg,
    }),
  });

  return {
    shiprocketOrderId: String(data.order_id),
    shipmentId: String(data.shipment_id),
  };
}

/**
 * Auto-assigns the best available courier to an already-created shipment
 * and returns the resulting tracking number (AWB code).
 */
export async function assignAWB(shipmentId: string) {
  const data = await shiprocketRequest("/courier/assign/awb", {
    method: "POST",
    body: JSON.stringify({ shipment_id: shipmentId }),
  });

  const response = data.response?.data;
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
