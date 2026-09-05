import type { Order, OrderItem } from "@shared/schema";

/**
 * Fires both notification channels for a newly-paid order. Each channel
 * fails independently and silently (logged, not thrown) — a broken email
 * or Telegram setup should never break the actual checkout flow for the
 * customer. Call this AFTER the order is already marked paid in the DB.
 */
export async function notifyNewOrder(order: Order, items: OrderItem[]) {
  await Promise.allSettled([
    sendOrderEmail(order, items),
    sendTelegramMessage(order, items),
  ]);
}

function formatOrderSummary(order: Order, items: OrderItem[]): string {
  const itemLines = items
    .map((item) => `  • ${item.productName} × ${item.quantity} — ₹${item.unitPrice}`)
    .join("\n");

  return (
    `New paid order #${order.id.slice(0, 8)}\n` +
    `Total: ₹${order.total}\n\n` +
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
  const adminEmail = process.env.ADMIN_EMAIL;

  if (!apiKey || !adminEmail) {
    console.warn(
      "[notifications] RESEND_API_KEY or ADMIN_EMAIL not set — skipping order email.",
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

    await resend.emails.send({
      // Resend's shared test domain — works immediately with no DNS setup.
      // Swap to a verified domain address once you set one up in Resend.
      from: "The Crunch Era <onboarding@resend.dev>",
      to: adminEmail,
      subject: `New order — ₹${order.total} (#${order.id.slice(0, 8)})`,
      html: `
        <h2>New paid order</h2>
        <p><strong>Order:</strong> #${order.id.slice(0, 8)}</p>
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
    });
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
