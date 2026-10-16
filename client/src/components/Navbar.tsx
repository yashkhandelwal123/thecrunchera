import { Link, useLocation } from "wouter";
import { ShoppingBag, Menu, X, UserRound, LogOut } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import BrandLogo from "./BrandLogo";

export default function Navbar() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const [signingOut, setSigningOut] = useState(false);
  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut();
      setOpen(false);
      navigate("/");
    } catch {
      toast({ title: "Could not sign out", description: "Please check your connection and try again.", variant: "destructive" });
    } finally {
      setSigningOut(false);
    }
  };
  const { itemCount } = useCart();
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  useEffect(() => { setOpen(false); }, [location]);
  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", close); return () => window.removeEventListener("keydown", close);
  }, []);
  const links = [{ href: "/products", label: "Shop snacks" }, { href: "/about", label: "Our story" }, { href: "/shipping", label: "Shipping & offers" }];
  return <>
    <a className="skip-link" href="#main-content">Skip to content</a>
    <div className="announcement">A little more crunch, a little less shipping. <Link href="/shipping">Free delivery from ₹359 <span aria-hidden="true">↗</span></Link></div>
    <header className="store-header">
      <div className="shell header-inner">
        <BrandLogo />
        <nav aria-label="Main navigation" className="desktop-nav">{links.map(link => <Link key={link.href} href={link.href} aria-current={location === link.href ? "page" : undefined}>{link.label}</Link>)}</nav>
        <div className="header-actions">
          <Link href="/orders" className="icon-link account-link" aria-label="Your orders"><UserRound size={21} /></Link>
          {user && <button type="button" className="desktop-sign-out" disabled={signingOut} onClick={handleSignOut}><LogOut size={18} aria-hidden="true" />{signingOut ? "Signing out…" : "Sign out"}</button>}
          <Link href="/cart" className="cart-link" aria-label={`Shopping bag, ${itemCount} items`} data-testid="button-cart"><ShoppingBag size={21} /><span className="bag-label">Bag</span><span className="bag-count" aria-live="polite">{itemCount}</span></Link>
          <button className="icon-link mobile-menu-button" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} aria-controls="mobile-nav" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
        </div>
      </div>
      {open && <nav id="mobile-nav" className="mobile-nav shell" aria-label="Mobile navigation">{links.map(link => <Link key={link.href} href={link.href}>{link.label}</Link>)}<Link href="/contact">Contact us</Link><Link href="/orders">Your orders</Link>{user && <button type="button" disabled={signingOut} onClick={handleSignOut}><LogOut size={16} aria-hidden="true" />{signingOut ? "Signing out…" : "Sign out"}</button>}</nav>}
    </header>
  </>;
}
