import { createHash, randomUUID } from 'node:crypto';
import type { Order } from '../shared/schema';
import type { ShippingParcel, ShippingPlan } from '../shared/shipping';
import { delhiveryRates } from './delhivery';
import { shiprocketRates } from './shiprocket';
import { getShippingPlan, saveShippingPlan } from './shippingPlanStore';

export function shippingFingerprint(order: Order) {
  return createHash('sha256').update(JSON.stringify([order.shippingAddressLine1, order.shippingAddressLine2, order.shippingCity, order.shippingState, order.shippingPincode, order.total, process.env.SHIPROCKET_PICKUP_LOCATION, process.env.DELHIVERY_PICKUP_LOCATION, process.env.DELHIVERY_PICKUP_PINCODE, process.env.DELHIVERY_ENVIRONMENT])).digest('hex');
}
export async function prepareShippingPlan(order: Order, parcel: ShippingParcel) {
  const previous = await getShippingPlan(order.id);
  // Keep preparation even when both rate providers fail.
  const plan: ShippingPlan = { id: randomUUID(), orderId: order.id, parcel, rates: [], warnings: [], expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(), fingerprint: shippingFingerprint(order), archivedShiprocketIds: previous?.archivedShiprocketIds || [] };
  const results = await Promise.allSettled([shiprocketRates(order, parcel), delhiveryRates(order, parcel)]);
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') plan.rates.push(...result.value);
    else plan.warnings.push(`${index === 0 ? 'Shiprocket' : 'Delhivery'}: ${result.reason instanceof Error ? result.reason.message : 'Rate service unavailable. Try again.'}`);
  });
  plan.rates.sort((a, b) => a.amount - b.amount);
  await saveShippingPlan(plan);
  return plan;
}
export async function selectedShippingRate(order: Order, body: any, provider: 'shiprocket' | 'delhivery') {
  const plan = await getShippingPlan(order.id);
  if (!plan || body?.planId !== plan.id || plan.fingerprint !== shippingFingerprint(order) || Date.parse(plan.expiresAt) <= Date.now()) throw new Error('Shipping estimate is missing, changed or expired. Compare rates again.');
  const rate = plan.rates.find(rate => rate.id === body?.rateId && rate.provider === provider);
  if (!rate) throw new Error('Choose a valid shipping option from the current rate comparison.');
  return { rate, parcel: { ...plan.parcel, shippingMode: rate.shippingMode || plan.parcel.shippingMode } };
}
