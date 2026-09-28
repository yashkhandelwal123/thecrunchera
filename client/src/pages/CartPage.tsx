import { Trash2, ArrowUpRight } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { usePricing } from "@/hooks/usePricing";
import { Link } from "wouter";
import { productPath } from "@shared/seo";
import { productDetails } from "@shared/catalog";
import { money, toPaise } from "@shared/pricing";
import QuantitySelector from "@/components/QuantitySelector";
import OrderSummary from "@/components/OrderSummary";
export default function CartPage() {
  const { cart, itemCount, removeFromCart, updateQuantity } = useCart();
  const { data: quote, isFetching, isError } = usePricing();
  if (!cart.items.length) return <main id="main-content" className="shell section"><div className="empty-state"><span className="eyebrow">SOMETHING CRUNCHY IS MISSING</span><h1>Your bag's taking a snack break.</h1><p>Pick a flavour. Find a favourite. Let's fill it up.</p><Link className="btn-primary" href="/products">Explore the chips <ArrowUpRight size={18} /></Link></div></main>;
  return <main id="main-content" className="shell section"><div className="bag-heading"><div><span className="eyebrow">GOOD TASTE. GREAT CHOICES.</span><h1>Your snack bag.</h1><p>{itemCount} {itemCount === 1 ? "pack" : "packs"}, ready for your next break.</p></div><Link className="text-link" href="/products">Keep exploring ↗</Link></div><div className="bag-grid"><div>{cart.items.map(item => {
    const detail = productDetails(item.product); const line = quote?.lineItems.find(line => line.productId === item.product.id);
    return <article key={item.product.id} className="bag-item"><Link href={productPath(item.product)}><img src={item.product.image} alt={item.product.name} width="125" height="125" /></Link><div className="bag-item-body"><div className="bag-item-top"><h2><Link href={productPath(item.product)}>{item.product.name}</Link></h2><strong>{money(toPaise(line?.unitPrice || item.product.price) * item.quantity)}</strong></div><p>{detail.flavour}{detail.packSize && ` · ${detail.packSize}`} · {money(toPaise(line?.unitPrice || item.product.price))} each</p><div className="bag-item-controls"><QuantitySelector value={item.quantity} name={item.product.name} onChange={quantity => updateQuantity(item.product.id, quantity)} /><button className="remove-button" onClick={() => removeFromCart(item.product.id)} aria-label={`Remove ${item.product.name}`}><Trash2 size={18} /></button></div></div></article>;
  })}<p className="summary-note">Want to try another flavour? Mix any individual packs in the same bag.</p></div><OrderSummary>{quote && !isError && !isFetching && !quote.promoError ? <Link className="btn-primary wide" href="/checkout">Go to checkout <ArrowUpRight size={18} /></Link> : <button className="btn-primary wide" disabled>{isFetching ? "Updating bag…" : "Check your bag to continue"}</button>}<p className="summary-note">Review delivery and payment on the next step.</p></OrderSummary></div></main>;
}
