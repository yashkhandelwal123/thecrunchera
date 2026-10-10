import type { Order, OrderItem } from "@shared/schema";

// Notification recipients only; never used for admin-panel authorization.
export function adminNotificationRecipients(): string[] {
  const additional = process.env.ADMIN_NOTIFICATION_EMAILS ?? "khandelwalshubham5775@gmail.com";
  return Array.from(new Set([process.env.ADMIN_EMAIL || "", additional]
    .flatMap(value => value.split(","))
    .map(value => value.trim().toLowerCase())
    .filter(Boolean)));
}


/**
 * Fires the admin, customer and Telegram notification channels for a newly-paid order. Each channel
 * fails independently and silently (logged, not thrown) — a broken email
 * or Telegram setup should never break the actual checkout flow for the
 * customer. Call this AFTER the order is already marked paid in the DB.
 */
export async function notifyNewOrder(order: Order, items: OrderItem[]) {
  await Promise.allSettled([
    sendOrderEmail(order, items),
    notifyCustomer(order, items),
    sendTelegramMessage(order, items),
  ]);
}

async function notifyCustomer(order: Order, items: OrderItem[]) {
  try {
    const { storage } = await import("./storage");
    const customer = await storage.getUserById(order.userId);
    if (!customer?.email) throw new Error("Order customer has no email address");
    const { sendCustomerOrderEmail } = await import("./customerOrderEmail");
    await sendCustomerOrderEmail(order, items, customer.email);
  } catch (error) {
    console.error(`[notifications] Customer confirmation failed for order ${order.id}:`, error);
  }
}

function formatOrderSummary(order: Order, items: OrderItem[]): string {
  const itemLines = items
    .map((item) => `  • ${item.productName} × ${item.quantity} — ₹${item.unitPrice}`)
    .join("\n");

  return (
    `New paid order #${order.id.slice(0, 8)}\n` +
    `Subtotal: ₹${order.subtotal}\nShipping: ₹${order.shippingCharge}\nDiscount: ₹${order.discountAmount}${order.promoCode ? ` (${order.promoCode})` : ""}\nTotal: ₹${order.total}\n\n` +
    `Items:\n${itemLines}\n\n` +
    `Ship to:\n` +
    `${order.shippingName} · ${order.shippingPhone}\n` +
    `${order.shippingAddressLine1}` +
    `${order.shippingAddressLine2 ? ", " + order.shippingAddressLine2 : ""}\n` +
    `${order.shippingCity}, ${order.shippingState} - ${order.shippingPincode}`
  );
}

async function sendOrderEmail(order: Order, items: OrderItem[]) {
  const apiKey = process.env.RESEND_API_KEY;
  const adminEmails = adminNotificationRecipients();

  if (!apiKey || !adminEmails.length) {
    console.warn(
      "[notifications] RESEND_API_KEY or admin notification recipients not set — skipping order email.",
    );
    return;
  }

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);

    const itemRows = items
      .map(
        (item) =>
          `<tr><td style="padding:4px 8px;">${item.productName}</td>` +
          `<td style="padding:4px 8px;">×${item.quantity}</td>` +
          `<td style="padding:4px 8px;">₹${item.unitPrice}</td></tr>`,
      )
      .join("");

    const { error } = await resend.emails.send({
      // This sender domain must be verified in Resend.
      from: "The Crunch Era <orders@thecrunchera.com>",
      to: adminEmails,
      subject: `New order — ₹${order.total} (#${order.id.slice(0, 8)})`,
      html: `
        <h2>New paid order</h2>
        <p><strong>Order:</strong> #${order.id.slice(0, 8)}</p>
        <p>Subtotal: ₹${order.subtotal} · Shipping: ₹${order.shippingCharge} · Discount: ₹${order.discountAmount}</p>
        <p><strong>Total:</strong> ₹${order.total}</p>
        <table style="border-collapse:collapse;">${itemRows}</table>
        <h3>Ship to</h3>
        <p>
          ${order.shippingName}<br/>
          ${order.shippingPhone}<br/>
          ${order.shippingAddressLine1}${order.shippingAddressLine2 ? ", " + order.shippingAddressLine2 : ""}<br/>
          ${order.shippingCity}, ${order.shippingState} - ${order.shippingPincode}
        </p>
      `,
    }, { idempotencyKey: `admin-order-paid/${order.id}` });
    if (error) throw new Error(`${error.name}: ${error.message}`);
  } catch (error) {
    console.error("[notifications] Failed to send order email:", error);
  }
}

async function sendTelegramMessage(order: Order, items: OrderItem[]) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.warn(
      "[notifications] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set — skipping Telegram alert.",
    );
    return;
  }

  try {
    const text = formatOrderSummary(order, items);
    const res = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text }),
      },
    );
    if (!res.ok) {
      const body = await res.text();
      console.error("[notifications] Telegram API error:", res.status, body);
    }
  } catch (error) {
    console.error("[notifications] Failed to send Telegram message:", error);
  }
}


/** Email failure must not undo a successfully purchased courier assignment. */
export async function notifyCourierAssigned(order: Order) {
  await Promise.allSettled([
    notifyCustomerCourierAssigned(order),
    notifyAdminCourierAssigned(order),
  ]);
}

async function notifyCustomerCourierAssigned(order: Order) {
  try {
    const { storage } = await import("./storage");
    const customer = await storage.getUserById(order.userId);
    if (!customer?.email) throw new Error("Order customer has no email address");
    const { sendCustomerShipmentEmail } = await import("./customerShipmentEmail");
    await sendCustomerShipmentEmail(order, customer.email);
  } catch (error) {
    console.error(`[notifications] Shipping email failed for order ${order.id}:`, error);
  }
}

async function notifyAdminCourierAssigned(order: Order) {
  try {
    if (!process.env.RESEND_API_KEY) throw new Error("RESEND_API_KEY is missing");
    const recipients = adminNotificationRecipients();
    if (!recipients.length) throw new Error("No admin notification recipients configured");
    const { customerShipmentEmail } = await import("./customerShipmentEmail");
    // Use the same required-data validation as the customer message.
    customerShipmentEmail(order);
    const trackingUrl = `https://shiprocket.co/tracking/${encodeURIComponent(order.awbCode!)}`;
    const text = [
      "Courier assigned — The Crunch Era",
      `Order: ${order.id}`,
      `Customer: ${order.shippingName}`,
      `Phone: ${order.shippingPhone}`,
      `Courier: ${order.courierName}`,
      `Tracking number (AWB): ${order.awbCode}`,
      `Track parcel: ${trackingUrl}`,
      "Status: Courier assigned. Pickup is not yet confirmed.",
      "Delivery address:",
      order.shippingAddressLine1,
      order.shippingAddressLine2,
      `${order.shippingCity}, ${order.shippingState} – ${order.shippingPincode}`,
    ].filter(Boolean).join("\n\n");
    const escaped = text.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
    const { Resend } = await import("resend");
    const { error } = await new Resend(process.env.RESEND_API_KEY).emails.send({
      from: process.env.ORDER_EMAIL_FROM || "The Crunch Era <orders@thecrunchera.com>",
      to: recipients,
      subject: "Courier assigned — The Crunch Era",
      text,
      html: `<div style="font-family:Arial,sans-serif;font-size:16px;line-height:1.6;white-space:pre-wrap">${escaped}</div>`,
    }, { idempotencyKey: `admin-courier-assigned/${order.id}/${order.shiprocketShipmentId}` });
    if (error) throw new Error(`${error.name}: ${error.message}`);
  } catch (error) {
    console.error(`[notifications] Admin shipping email failed for order ${order.id}:`, error);
  }
}
