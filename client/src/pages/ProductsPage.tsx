import ProductGrid from "@/components/ProductGrid";
import Faq from "@/components/Faq";
import { Link } from "wouter";
export default function ProductsPage() {
  return <main id="main-content"><section className="shell section"><div className="collection-heading"><span className="eyebrow">THE CHIP SHOP</span><h1>Find your<br /><em>crunch match.</em></h1><p>Ragi, oats, moong dal or mix veg. Pick a favourite, or make room for a new one.</p><Link href="/shipping" className="offer-note">CRUNCH10: 10% off products on subtotals above ₹450. View terms ↗</Link></div><ProductGrid /></section><Faq /></main>;
}
