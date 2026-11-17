import type { Express, RequestHandler } from 'express';
import { storage } from './storage';
import { parcelSchema, delhiveryConfig, verifyDelhiveryBooking } from './delhivery';
import { getShippingPlan, saveShippingPlan } from './shippingPlanStore';
import { prepareShippingPlan } from './shippingQuotes';
import { inspectShiprocketDraft } from './shiprocket';
import { shipmentTrackingUrl } from '../shared/shipping';

export function registerShippingPlannerRoutes(app: Express, requireAdmin: RequestHandler) {
  app.get('/api/admin/orders/:id/shipping-plan', requireAdmin, async (req, res) => {
    try { res.json(await getShippingPlan(req.params.id) || null); }
    catch { res.status(503).json({ error: 'Shipping preparation storage unavailable. Apply migration 0003_shipping_plans.sql and retry.' }); }
  });
  app.post('/api/admin/orders/:id/shipping-plan', requireAdmin, async (req, res) => {
    try {
      const order = await storage.getOrderById(req.params.id);
      if (!order) return res.status(404).json({ error: 'Order not found' });
      if (order.status !== 'paid' || order.awbCode || (order.shipmentBookingState && order.shipmentBookingState !== 'created')) return res.status(409).json({ error: 'Only paid orders without an assigned courier or pending booking can be prepared.' });
      const parcel = parcelSchema.safeParse(req.body);
      if (!parcel.success) return res.status(400).json({ error: 'Enter the actual positive packed weight (kg) and all dimensions (cm).' });
      res.json(await prepareShippingPlan(order, parcel.data));
    } catch (error) { res.status(503).json({ error: error instanceof Error ? error.message : 'Could not save shipment preparation.' }); }
  });
  app.post('/api/admin/orders/:id/verify-shiprocket-cancellation', requireAdmin, async (req, res) => {
    let claimed = false;
    let verified = false;
    try {
      const order = await storage.getOrderById(req.params.id);
      if (!order?.shiprocketShipmentId || !order.shiprocketOrderId) return res.status(400).json({ error: 'No Shiprocket draft to verify.' });
      const plan = await getShippingPlan(order.id);
      if (!plan) return res.status(400).json({ error: 'Prepare this shipment before switching providers.' });
      if (!await storage.claimShipmentAction(order.id, order.shiprocketShipmentId, 'releasing')) return res.status(409).json({ error: 'Shipment is assigned or another operation is running.' });
      claimed = true;
      const draft = await inspectShiprocketDraft(order);
      if (!/^cancelled$|^canceled$/i.test(String(draft.status).trim())) throw new Error('Cancel this unassigned order in Shiprocket first, then verify again. No local references have been removed.');
      verified = true;
      await saveShippingPlan({ ...plan, rates: [], expiresAt: new Date(0).toISOString(), archivedShiprocketIds: [...(plan.archivedShiprocketIds || []), order.shiprocketOrderId] });
      const updated = await storage.updateOrderShipping(order.id, { shiprocketOrderId: null, shiprocketShipmentId: null, shipmentBookingState: null, shippingStatus: 'Previous Shiprocket draft cancellation verified. Ready to prepare a new shipment.' });
      res.json(updated);
    } catch (error) {
      if (claimed) await storage.updateOrderShipping(req.params.id, { shipmentBookingState: verified ? 'needs_review' : 'created' }).catch(() => {});
      res.status(409).json({ error: error instanceof Error ? error.message : 'Could not verify cancellation. Keep existing shipment.' });
    }
  });
  app.post('/api/admin/orders/:id/import-delhivery-awb', requireAdmin, async (req, res) => {
    let claimed = false;
    try {
      const order = await storage.getOrderById(req.params.id);
      if (!order) return res.status(404).json({ error: 'Order not found' });
      const awb = String(req.body?.awb || '').trim();
      if (order.shippingProvider === 'delhivery' && order.awbCode === awb) return res.json(order);
      if (order.status !== 'paid' || order.awbCode || order.shiprocketShipmentId || order.shipmentBookingState) return res.status(409).json({ error: 'Resolve any existing shipment/booking before linking another AWB.' });
      if (!await getShippingPlan(order.id)) return res.status(400).json({ error: 'Prepare shipment first.' });
      const config = delhiveryConfig();
      const shipment = await verifyDelhiveryBooking(order, awb);
      if (!await storage.claimShipmentBooking(order.id, 'delhivery', config.environment)) return res.status(409).json({ error: 'Another booking has started; refresh the order.' });
      claimed = true;
      const updated = await storage.updateOrderShipping(order.id, { ...shipment, shipmentBookingState: 'created', trackingUrl: shipmentTrackingUrl({ shippingProvider: 'delhivery', awbCode: awb }) });
      if (!updated) throw new Error('Verified AWB could not be saved; review this order before retrying.');
      if (config.environment === 'production') {
        const { notifyCourierAssigned } = await import('./notifications');
        await notifyCourierAssigned(updated);
      }
      res.json(updated);
    } catch (error) {
      if (claimed) await storage.updateOrderShipping(req.params.id, { shipmentBookingState: 'needs_review' }).catch(() => {});
      res.status(400).json({ error: error instanceof Error ? error.message : 'Could not verify this AWB.' });
    }
  });
}
