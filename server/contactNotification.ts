import type { Contact } from '@shared/schema';
import { adminNotificationRecipients } from './notifications';

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));

export async function notifyContactQuery(contact: Contact): Promise<boolean> {
  try {
    const recipients = adminNotificationRecipients();
    if (!process.env.RESEND_API_KEY || !recipients.length) throw new Error('Email configuration missing');
    const { Resend } = await import('resend');
    const text = `New website enquiry\n\nName: ${contact.name}\nEmail: ${contact.email}\nSubject: ${contact.subject}\n\n${contact.message}\n\nReply to this email to respond directly to the customer.`;
    const { error } = await new Resend(process.env.RESEND_API_KEY).emails.send({
      from: process.env.ORDER_EMAIL_FROM || 'The Crunch Era <orders@thecrunchera.com>',
      to: recipients,
      replyTo: contact.email,
      subject: `New website enquiry: ${contact.subject.replace(/[\r\n]/g, ' ')}`,
      text,
      html: `<div style="font-family:Arial,sans-serif;color:#273423;font-size:16px;line-height:1.6"><h1 style="color:#425d2c">New website enquiry</h1><p><strong>Name:</strong> ${escapeHtml(contact.name)}<br><strong>Email:</strong> ${escapeHtml(contact.email)}<br><strong>Subject:</strong> ${escapeHtml(contact.subject)}</p><p style="white-space:pre-wrap">${escapeHtml(contact.message)}</p><p>Reply to this email to respond directly to the customer.</p></div>`,
    }, { idempotencyKey: `contact-query/${contact.id}` });
    if (error) throw new Error(`Email provider rejected notification (${error.name})`);
    return true;
  } catch (error) {
    // The query is already saved. Never ask a customer to submit it again because email failed.
    console.error(`[contact] Notification failed for saved query ${contact.id}:`, error instanceof Error ? error.message : 'Unknown error');
    return false;
  }
}
