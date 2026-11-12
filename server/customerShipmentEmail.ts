import type { Order } from "@shared/schema";
import { shipmentTrackingUrl, shipmentNotificationKey } from "../shared/shipping";

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

export function customerShipmentEmail(order: Order, supportEmail?: string) {
  if ((order.shippingProvider !== "delhivery" && !order.shiprocketShipmentId) || !order.awbCode || !order.courierName) {
    throw new Error("Shipment, tracking number and courier are required for a shipping email");
  }
  // Build the URL from the AWB instead of trusting an arbitrary URL in stored data.
  const trackingUrl = shipmentTrackingUrl(order);
  const subject = "Tracking details for your The Crunch Era order 📦";
  const address = [order.shippingName, order.shippingAddressLine1, order.shippingAddressLine2, `${order.shippingCity}, ${order.shippingState} – ${order.shippingPincode}`].filter((v): v is string => Boolean(v));
  const support = supportEmail ? `Need help? Contact us at ${supportEmail}.` : "Need help? Visit https://thecrunchera.com/contact.";
  const note = "Your tracking details are ready. Open the tracking link for the latest scans and delivery progress. An AWB alone does not confirm pickup.";
  const status = order.shippingStatus || "Courier assigned";
  const text = [`Hi ${order.shippingName},`, note, `Courier: ${order.courierName}`, `Tracking number (AWB): ${order.awbCode}`, `Status: ${status}`, `Track your parcel: ${trackingUrl}`, "Delivery address", ...address, support, "Thanks for choosing The Crunch Era!"].join("\n\n");
  const html = `<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0;background:#faf7f1;color:#2d193d;font-family:Arial,sans-serif;font-size:16px;line-height:1.6"><table role="presentation" style="width:100%"><tr><td style="padding:24px 12px"><table role="presentation" style="width:100%;max-width:600px;margin:auto;background:white;border-radius:16px"><tr><td style="padding:24px;background:#542878;color:white;font-size:24px;font-weight:700;border-radius:16px 16px 0 0">The Crunch Era</td></tr><tr><td style="padding:24px"><h1 style="font-size:26px;line-height:1.3">Your tracking details are ready</h1><p>Hi ${escapeHtml(order.shippingName)},</p><p>${note}</p><p><strong>Courier:</strong> ${escapeHtml(order.courierName)}<br><strong>Tracking number (AWB):</strong> <span style="overflow-wrap:anywhere">${escapeHtml(order.awbCode)}</span><br><strong>Status:</strong> ${escapeHtml(status)}</p><p><a href="${escapeHtml(trackingUrl)}" style="display:inline-block;background:#542878;color:white;text-decoration:none;border-radius:8px;padding:12px 20px;font-weight:700">Track your parcel</a></p><p style="font-size:14px;overflow-wrap:anywhere">Or open: <a href="${escapeHtml(trackingUrl)}">${escapeHtml(trackingUrl)}</a></p><h2 style="font-size:20px">Delivery address</h2><p>${address.map(escapeHtml).join("<br>")}</p><p>${escapeHtml(support)}</p><p>Thanks for choosing <strong>The Crunch Era</strong>!</p></td></tr></table></td></tr></table></body></html>`;
  return { subject, html, text };
}

export async function sendCustomerShipmentEmail(order: Order, customerEmail: string, preparedEmail?: ReturnType<typeof customerShipmentEmail>) {
  if (!process.env.RESEND_API_KEY) throw new Error("RESEND_API_KEY is missing; shipping email could not be sent");
  const { Resend } = await import("resend");
  const supportEmail = process.env.SUPPORT_EMAIL?.trim();
  const email = preparedEmail ?? customerShipmentEmail(order, supportEmail);
  const { error } = await new Resend(process.env.RESEND_API_KEY).emails.send({
    from: process.env.ORDER_EMAIL_FROM || "The Crunch Era <orders@thecrunchera.com>",
    to: customerEmail,
    ...(supportEmail ? { replyTo: supportEmail } : {}),
    ...email,
  }, { idempotencyKey: `customer-courier-assigned/${order.id}/${shipmentNotificationKey(order)}` });
  if (error) throw new Error(`Shipping email rejected by Resend: ${error.name}: ${error.message}`);
}
