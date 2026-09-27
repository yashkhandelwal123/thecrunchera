const SHIPROCKET_TOKEN_URL = "https://apiv2.shiprocket.in/v1/external/auth/login";
const SHIPROCKET_BASE_URL = "https://apiv2.shiprocket.in/v1/external";

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAuthToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }

  const email = process.env.SHIPROCKET_EMAIL;
  const password = process.env.SHIPROCKET_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "Shiprocket credentials not configured. Set SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD.",
    );
  }

  const response = await fetch(SHIPROCKET_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new Error(`Shiprocket auth failed: ${response.statusText}`);
  }

  const data = (await response.json()) as { token: string };
  cachedToken = {
    token: data.token,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
  };

  return data.token;
}

async function shiprocketRequest(
  path: string,
  method: string = "GET",
  body?: object,
): Promise<any> {
  const token = await getAuthToken();
  const url = `${SHIPROCKET_BASE_URL}${path}`;

  const options: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    throw new Error(`Shiprocket API error: ${response.statusText}`);
  }

  return response.json();
}

export interface ShipmentCreateParams {
  orderId: number;
  orderDate: string;
  pickupLocation: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  customerCity: string;
  customerState: string;
  customerPincode: string;
  weightKg: number;
  items: Array<{ name: string; quantity: number; price: number }>;
}

export interface ShipmentCreateResult {
  shiprocketOrderId: number;
  statusCode: number;
  message: string;
}

export async function createShipment(
  params: ShipmentCreateParams,
): Promise<ShipmentCreateResult> {
  const payload = {
    order_id: params.orderId.toString(),
    order_date: params.orderDate,
    pickup_location: params.pickupLocation,
    customer_name: params.customerName,
    customer_email: params.customerEmail,
    customer_phone: params.customerPhone,
    customer_address: params.customerAddress,
    customer_city: params.customerCity,
    customer_state: params.customerState,
    customer_pincode: params.customerPincode,
    weight: params.weightKg,
    length: 15,
    breadth: 10,
    height: 5,
    order_items: params.items.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      price: item.price,
    })),
  };

  const data = await shiprocketRequest("/orders/create/adhoc", "POST", payload);

  return {
    shiprocketOrderId: data.order_id,
    statusCode: data.status_code,
    message: data.message,
  };
}

export interface CourierAssignParams {
  shiprocketOrderId: number;
  courierId: number;
}

export interface CourierAssignResult {
  shipmentId: number;
  awbCode: string;
  courierName: string;
}

export async function assignCourier(
  params: CourierAssignParams,
): Promise<CourierAssignResult> {
  const payload = {
    shipment_id: params.shiprocketOrderId,
    courier_id: params.courierId,
  };

  const data = await shiprocketRequest("/courier/assign/awb", "POST", payload);

  return {
    shipmentId: data.shipment_id,
    awbCode: data.awb_code,
    courierName: data.courier_name,
  };
}

export interface TrackingResult {
  status: string;
  statusCode: number;
  trackingData: {
    awbCode: string;
    trackingUrl: string;
    courierName: string;
    currentStatus: string;
  };
}

export async function trackShipment(
  shiprocketShipmentId: number,
  awbCode: string,
): Promise<TrackingResult> {
  const data = await shiprocketRequest(
    `/courier/track/awb/${awbCode}`,
  );

  return {
    status: "success",
    statusCode: 200,
    trackingData: {
      awbCode: data.awb_code,
      trackingUrl: data.track_url,
      courierName: data.courier_name,
      currentStatus: data.scans?.[0]?.status || "In Transit",
    },
  };
}

export interface ShippingRateParams {
  deliveryPincode: string;
  weightKg: number;
}

export interface ShippingRateResult {
  rate: number;
  courierName: string;
  serviceable: boolean;
}

/**
 * Checks live shipping cost for a delivery pincode via Shiprocket's
 * serviceability endpoint. Picks the cheapest available courier.
 */
export async function checkShippingRate(
  params: ShippingRateParams,
): Promise<ShippingRateResult> {
  const pickupPincode = process.env.SHIPROCKET_PICKUP_PINCODE || "302029";

  const data = await shiprocketRequest(
    `/courier/serviceability/?pickup_postcode=${pickupPincode}&delivery_postcode=${params.deliveryPincode}&weight=${params.weightKg}&cod=0`,
  );

  const couriers = data?.data?.available_courier_companies;
  if (!couriers || couriers.length === 0) {
    return { rate: 0, courierName: "", serviceable: false };
  }

  const cheapest = couriers.reduce((min: any, c: any) =>
    parseFloat(c.rate) < parseFloat(min.rate) ? c : min,
  );

  return {
    rate: parseFloat(cheapest.rate),
    courierName: cheapest.courier_name,
    serviceable: true,
  };
}
