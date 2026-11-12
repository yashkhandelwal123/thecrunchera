import type { Order, OrderItem } from "@shared/schema";

export const CUSTOMER_ORDER_SUBJECT = "Your The Crunch Era order is confirmed! 🎉";
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const money = (value: string | number) => `₹${Number(value).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const lineTotal = (item: OrderItem) => money(Math.round(Number(item.unitPrice) * 100) * item.quantity / 100);

export function customerOrderEmail(order: Order, items: OrderItem[], supportEmail?: string) {
  const date = new Date(order.createdAt).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "long", year: "numeric" });
  const address = [order.shippingName, order.shippingAddressLine1, order.shippingAddressLine2, `${order.shippingCity}, ${order.shippingState} – ${order.shippingPincode}`].filter((v): v is string => Boolean(v));
  const shipping = Number(order.shippingCharge) === 0 ? "Free" : money(order.shippingCharge);
  const discount = Number(order.discountAmount) > 0;
  const support = supportEmail ? `Need help? Contact us at ${supportEmail}.` : "Need help? Visit https://thecrunchera.com/contact.";
  const text = [
    `Thanks for your order, ${order.shippingName}!`,
    "We’ve received your order.", `Order date: ${date}`, "Your chips",
    ...items.map(item => `${item.productName} × ${item.quantity} — ${lineTotal(item)}`),
    `Subtotal: ${money(order.subtotal)}`, ...(discount ? [`Discount: −${money(order.discountAmount)}`] : []),
    `Shipping: ${shipping}`, `Total: ${money(order.total)}`, "Payment status: Paid",
    "Delivery address", ...address, support, "Thanks for choosing The Crunch Era!", "https://thecrunchera.com",
  ].join("\n\n");
  const rows = items.map(item => `<tr><td style="padding:12px 0;border-bottom:1px solid #e9e2ef">${escapeHtml(item.productName)}</td><td style="padding:12px;text-align:center;border-bottom:1px solid #e9e2ef">${item.quantity}</td><td style="padding:12px 0;text-align:right;white-space:nowrap;border-bottom:1px solid #e9e2ef">${lineTotal(item)}</td></tr>`).join("");
  const totalRow = (label: string, value: string, bold = false) => `<tr><td style="padding:8px 0;${bold ? "font-weight:700;font-size:20px" : ""}">${label}</td><td style="padding:8px 0;text-align:right;white-space:nowrap;${bold ? "font-weight:700;font-size:20px" : ""}">${value}</td></tr>`;
  const html = `<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0;background:#faf7f1;color:#2d193d;font-family:Arial,sans-serif;font-size:16px;line-height:1.6"><table role="presentation" style="width:100%;border-collapse:collapse"><tr><td style="padding:24px 12px"><table role="presentation" style="width:100%;max-width:600px;margin:auto;background:#fff;border-radius:16px"><tr><td style="padding:24px;background:#542878;color:white;border-radius:16px 16px 0 0;font-size:24px;font-weight:700">The Crunch Era</td></tr><tr><td style="padding:24px"><h1 style="font-size:26px;line-height:1.3;margin:0 0 16px">Thanks for your order, ${escapeHtml(order.shippingName)}!</h1><p>We’ve received your order.</p><p><strong>Order date:</strong> ${date}</p><h2 style="font-size:20px">Your chips</h2><table style="width:100%;border-collapse:collapse;font-size:15px"><thead><tr><th scope="col" style="text-align:left">Product</th><th scope="col">Qty</th><th scope="col" style="text-align:right">Amount</th></tr></thead><tbody>${rows}</tbody></table><table style="width:100%;margin-top:16px">${totalRow("Subtotal", money(order.subtotal))}${discount ? totalRow("Discount", `−${money(order.discountAmount)}`) : ""}${totalRow("Shipping", shipping)}${totalRow("Total", money(order.total), true)}</table><p><strong>Payment status:</strong> Paid</p><h2 style="font-size:20px">Delivery address</h2><p>${address.map(escapeHtml).join("<br>")}</p><p>${escapeHtml(support)}</p><p>Thanks for choosing <strong>The Crunch Era</strong>!</p><a href="https://thecrunchera.com" style="display:inline-block;background:#542878;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:700">Visit our website</a></td></tr></table></td></tr></table></body></html>`;
  return { subject: CUSTOMER_ORDER_SUBJECT, html, text };
}

export async function sendCustomerOrderEmail(order: Order, items: OrderItem[], customerEmail: string) {
  if (order.status !== "paid" || !order.razorpayPaymentId) return;
  if (!process.env.RESEND_API_KEY) throw new Error("RESEND_API_KEY is missing; customer confirmation could not be sent");
  const { Resend } = await import("resend");
  const supportEmail = process.env.SUPPORT_EMAIL?.trim();
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: process.env.ORDER_EMAIL_FROM || "The Crunch Era <orders@thecrunchera.com>",
    to: customerEmail,
    ...(supportEmail ? { replyTo: supportEmail } : {}),
    ...customerOrderEmail(order, items, supportEmail),
  }, { idempotencyKey: `customer-order-confirmed/${order.id}` });
  if (error) throw new Error(`Customer confirmation rejected by Resend: ${error.name}: ${error.message}`);
}
