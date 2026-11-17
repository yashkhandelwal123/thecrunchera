import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { once } from 'node:events';
import { storage } from './storage';
import { registerRoutes } from './routes';
import { saveShippingPlan, getShippingPlan } from './shippingPlanStore';

const parcel = { weightKg: .5, lengthCm: 20, breadthCm: 15, heightCm: 10, shippingMode: 'Surface' };
test('admin plans: real rate normalization, private totals, partial failure, expiry, courier selection, cancellation and external AWB verification', async () => {
  const env = { ...process.env };
  Object.assign(process.env, { ADMIN_EMAILS: 'planner@example.test', SHIPROCKET_EMAIL: 'mock', SHIPROCKET_PASSWORD: 'mock', SHIPROCKET_PICKUP_LOCATION: 'Warehouse', DELHIVERY_ENABLED: 'true', DELHIVERY_ENVIRONMENT: 'production', DELHIVERY_API_TOKEN: 'mock', DELHIVERY_PICKUP_LOCATION: 'Warehouse', DELHIVERY_PICKUP_PINCODE: '302001' });
  delete process.env.RESEND_API_KEY;
  const admin = await storage.createUser({ googleId: 'planner-admin', email: 'planner@example.test', name: 'Admin' });
  const buyer = await storage.createUser({ googleId: 'planner-buyer', email: 'buyer@example.test', name: 'Buyer' });
  const app = express(); app.use(express.json()); app.use((req, _res, next) => { req.session = { userId: req.headers['x-admin'] ? admin.id : buyer.id } as any; next(); });
  const server = await registerRoutes(app); server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  const original = globalThis.fetch;
  let failDelhivery = false, failShiprocket = false, cancelled = false, assigned = 0, trackingReference = '';
  globalThis.fetch = (async (url, init) => {
    const target = String(url);
    if (target.startsWith(base)) return original(url, init);
    if (target.endsWith('/auth/login')) return Response.json({ token: 'mock' });
    if (target.endsWith('/settings/company/pickup')) return Response.json({ data: { shipping_address: [{ pickup_location: 'Warehouse', pin_code: '302001' }] } });
    if (target.includes('/orders/show/')) { const id = target.split('/').pop(); return Response.json({ data: { id, channel_order_id: id, status: cancelled ? 'CANCELED' : 'NEW', shipments: { id: `s-${id}`, weight: .5, length: 20, breadth: 15, height: 10, awb: null } } }); }
    if (target.includes('/courier/serviceability')) {
      if (failShiprocket) return new Response('<html>Unavailable</html>', { status: 503 });
      return Response.json({ data: { available_courier_companies: [ { courier_company_id: 42, courier_name: 'Test Surface', rate: 65.2, charge_weight: .6, estimated_delivery_days: '4', blocked: 0 }, { courier_company_id: 43, rate: 0, charge_weight: 1 }, { courier_company_id: 44, rate: 10, charge_weight: 1, blocked: 1 } ] } });
    }
    if (target.includes('/pin-codes/')) return Response.json({ delivery_codes: [{ postal_code: { pin: 302001, pre_paid: 'Y', remarks: '' } }] });
    if (target.includes('/invoice/charges/')) {
      assert.equal(new URL(target).searchParams.get('cgm'), '600');
      if (failDelhivery) return new Response('');
      return Response.json([{ total_amount: new URL(target).searchParams.get('md') === 'S' ? 51.8 : 72 }]);
    }
    if (target.includes('/orders/create/adhoc')) {
      const payload = JSON.parse(init!.body as string);
      assert.equal(payload.weight, .5); assert.equal(payload.length, 20);
      return Response.json({ order_id: payload.order_id, shipment_id: `s-${payload.order_id}` });
    }
    if (target.includes('/courier/assign/awb')) {
      assert.equal(JSON.parse(init!.body as string).courier_id, 42); assigned++;
      return Response.json({ response: { data: { awb_code: 'TEST123', courier_name: 'Test Surface' } } });
    }
    if (target.includes('/packages/json/')) return Response.json({ ShipmentData: [{ Shipment: { AWB: '123456789012', ReferenceNo: trackingReference, Status: { Status: 'In Transit' } } }] });
    throw new Error('Unexpected network request: '+target);
  }) as typeof fetch;
  const create = async (draft = false) => {
    const order = await storage.createOrder({ userId: buyer.id, shippingName: 'Buyer', shippingPhone: '9999999999', shippingAddressLine1: 'Test', shippingCity: 'Jaipur', shippingState: 'Rajasthan', shippingPincode: '302001', subtotal: '300.00', shippingCharge: '70.00', total: '370.00' }, [{ productId: 'qa', productName: 'Chips', productImage: '/test.png', quantity: 1, unitPrice: '300.00' }]);
    await storage.markOrderPaid(order.id, 'test');
    if (draft) await storage.updateOrderShipping(order.id, { shiprocketOrderId: order.id, shiprocketShipmentId: `s-${order.id}`, shipmentBookingState: 'created' });
    return order;
  };
  const post = (id: string, action: string, body: any, admin = true) => fetch(`${base}/api/admin/orders/${id}/${action}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(admin ? { 'x-admin': '1' } : {}) }, body: JSON.stringify(body) });
  try {
    const fresh = await create();
    const freshPlan = await (await post(fresh.id, 'shipping-plan', parcel)).json();
    const draftResponse = await post(fresh.id, 'create-shipment', { ...parcel, weightKg: 2, planId: freshPlan.id, rateId: 'shiprocket:42' });
    assert.equal(draftResponse.status, 200); assert.equal((await draftResponse.json()).awbCode, null); assert.equal(assigned, 0);
    const order = await create(true);
    assert.equal((await post(order.id, 'shipping-plan', parcel, false)).status, 403);
    assert.equal((await post(order.id, 'shipping-plan', { ...parcel, weightKg: '' })).status, 400);
    const response = await post(order.id, 'shipping-plan', parcel); assert.equal(response.status, 200);
    const plan = await response.json(); assert.equal(plan.rates.length, 3); assert.equal(plan.rates[0].amount, 51.8); assert.equal(assigned, 0);
    const unchanged = await storage.getOrderById(order.id); assert.equal(unchanged?.total, '370.00'); assert.equal(unchanged?.shippingCharge, '70.00'); assert.ok(!('rates' in unchanged!));
    const selection = { planId: plan.id, rateId: 'shiprocket:42' };
    assert.equal((await post(order.id, 'create-delhivery-shipment', { planId: plan.id, rateId: 'delhivery:Surface' })).status, 409);
    assert.equal((await post(order.id, 'assign-courier', { ...selection, rateId: 'shiprocket:999' })).status, 400); assert.equal(assigned, 0);
    await saveShippingPlan({ ...plan, expiresAt: new Date(0).toISOString() });
    assert.equal((await post(order.id, 'assign-courier', selection)).status, 400); assert.equal(assigned, 0);
    await saveShippingPlan(plan);
    const booked = await Promise.all([post(order.id, 'assign-courier', selection), post(order.id, 'assign-courier', selection)]);
    assert.equal(booked.filter(r => r.status === 200).length, 1); assert.equal(assigned, 1);
    const alternate = await create(true);
    failDelhivery = true;
    const partial = await (await post(alternate.id, 'shipping-plan', parcel)).json(); assert.equal(partial.rates.length, 1); assert.equal(partial.warnings.length, 1);
    assert.equal((await post(alternate.id, 'verify-shiprocket-cancellation', {})).status, 409);
    assert.equal((await storage.getOrderById(alternate.id))?.shiprocketShipmentId, `s-${alternate.id}`);
    cancelled = true;
    assert.equal((await post(alternate.id, 'verify-shiprocket-cancellation', {})).status, 200);
    assert.equal((await storage.getOrderById(alternate.id))?.shiprocketShipmentId, null);
    assert.deepEqual((await getShippingPlan(alternate.id))?.archivedShiprocketIds, [alternate.id]);
    failShiprocket = true;
    const unavailable = await (await post(alternate.id, 'shipping-plan', parcel)).json(); assert.equal(unavailable.rates.length, 0); assert.equal(unavailable.warnings.length, 2);
    assert.equal((await post(alternate.id, 'import-delhivery-awb', { awb: '123456789012' })).status, 400);
    trackingReference = alternate.id;
    const imported = await post(alternate.id, 'import-delhivery-awb', { awb: '123456789012' }); assert.equal(imported.status, 200); assert.equal((await imported.json()).shippingStatus, 'In Transit');
    assert.equal((await post(alternate.id, 'import-delhivery-awb', { awb: '123456789012' })).status, 200);
  } finally {
    globalThis.fetch = original;
    await new Promise<void>(resolve => server.close(() => resolve()));
    for (const key of Object.keys(process.env)) if (!(key in env)) delete process.env[key];
    Object.assign(process.env, env);
  }
});
