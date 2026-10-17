import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
export default function ContactPage() {
  const [busy, setBusy] = useState(false); const [status, setStatus] = useState("");
  const send = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const form = event.currentTarget; const values = Object.fromEntries(new FormData(form)); setBusy(true); setStatus("");
    try { await apiRequest("POST", "/api/contact", values); form.reset(); setStatus("Your message has been received. Thank you for getting in touch."); }
    catch { setStatus("We couldn't send your message. Please try again or email us directly."); }
    finally { setBusy(false); }
  };
  return <main id="main-content" className="shell section contact-layout"><div><span className="eyebrow">LET'S TALK CHIPS</span><h1>A question?<br />We're listening.</h1><p>Ask about a product, ingredient details, delivery or an order. If you're writing about an order, include your order number so we can help.</p><p>Prefer email?</p><a className="contact-email" href="mailto:khandelwalyash6185@gmail.com">khandelwalyash6185@gmail.com</a><p className="summary-note">Please don't include payment details, passwords or one-time codes.</p></div><form className="contact-form" onSubmit={send}><div><label htmlFor="contact-name">Your name</label><input id="contact-name" name="name" autoComplete="name" required minLength={2} maxLength={120} /></div><div><label htmlFor="contact-email">Email address</label><input id="contact-email" name="email" autoComplete="email" type="email" required /></div><div><label htmlFor="contact-subject">What can we help with?</label><input id="contact-subject" name="subject" required maxLength={200} /></div><div><label htmlFor="contact-message">Your message</label><textarea id="contact-message" name="message" required maxLength={5000} /></div><button className="btn-primary" disabled={busy}>{busy ? "Sending…" : "Send message ↗"}</button><p role="status">{status}</p></form></main>;
}
