import { Link } from "wouter";
import { ArrowUpRight } from "lucide-react";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import BrandLogo from "./BrandLogo";

export default function Footer() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const subscribe = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setMessage("");
    try { await apiRequest("POST", "/api/newsletter", { email }); setEmail(""); setMessage("You're on the list. Thanks for joining!"); }
    catch { setMessage("We couldn't subscribe this email. It may already be on the list; please try again if needed."); }
    finally { setBusy(false); }
  };
  return <footer className="store-footer"><div className="shell">
    <div className="footer-grid">
      <div><BrandLogo /><p className="footer-brand-copy">For the love of a good crunch.<br />Ragi, oats, moong dal & mix veg chips.</p></div>
      <div><h2>Explore</h2><Link href="/products">Shop all chips</Link><Link href="/about">Our story</Link><Link href="/orders">Your orders</Link><Link href="/contact">Contact us</Link></div>
      <div><h2>Good to know</h2><Link href="/shipping">Shipping & offers</Link><Link href="/terms-of-service">Returns & terms</Link><Link href="/privacy-policy">Privacy policy</Link></div>
      <div className="footer-newsletter"><h2>A little crunch in your inbox.</h2><p>Sign up for product news and offers.</p><form onSubmit={subscribe}><label className="sr-only" htmlFor="newsletter-email">Email address</label><input id="newsletter-email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="Your email address" /><button aria-label="Subscribe to newsletter" disabled={busy}><ArrowUpRight /></button></form><p role="status" className="fine-print">{message || "By subscribing, you agree to receive our emails. See our privacy policy."}</p></div>
    </div>
    <div className="footer-bottom"><span>© {new Date().getFullYear()} The Crunch Era</span><span>Crunch Better. Live Better.</span><span>Payments via Razorpay</span></div>
  </div></footer>;
}
