import { Link } from "wouter";
import { ArrowUpRight, Plus, Check } from "lucide-react";
import type { Product } from "@shared/schema";
import { productDetails } from "@shared/catalog";
import { productPath } from "@shared/seo";
import { money, toPaise } from "@shared/pricing";
import { useCart } from "@/contexts/CartContext";
import { useState, useEffect } from "react";

export default function ProductCard({ product }: { product: Product; index?: number }) {
  const { addToCart, cart } = useCart();
  const atLimit = (cart.items.find(item => item.product.id === product.id)?.quantity || 0) >= 99;
  const detail = productDetails(product);
  const [added, setAdded] = useState(false);
  useEffect(() => { if (added) { const id = setTimeout(() => setAdded(false), 1600); return () => clearTimeout(id); } }, [added]);
  return <article className={`product-card tone-${detail.tone}`} data-testid={`card-product-${product.id}`}>
    <Link className="product-image-link" href={productPath(product)} aria-label={`View ${product.name}`}><img src={product.image} alt={`${product.name} pack`} loading="lazy" decoding="async" width="800" height="800" /><span className="product-arrow"><ArrowUpRight size={22} /></span></Link>
    <div className="product-card-body"><div className="product-kicker"><span>{detail.flavour}</span>{detail.packSize && <span>{detail.packSize}</span>}</div><h3><Link href={productPath(product)}>{product.name}</Link></h3><div className="product-card-bottom"><span className="product-price">{money(toPaise(product.price))}</span><button className="small-add" disabled={atLimit} onClick={() => { addToCart(product); setAdded(true); }} aria-label={`Add ${product.name} to bag`} data-testid={`button-add-to-cart-${product.id}`}>{added ? <Check size={16} /> : <Plus size={16} />} {added ? "Added" : "Add to bag"}</button></div></div>
  </article>;
}
