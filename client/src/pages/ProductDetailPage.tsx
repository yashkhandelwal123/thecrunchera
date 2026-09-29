import Money from "@/components/Money";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation, useParams } from "wouter";
import { useEffect, useState } from "react";
import { ArrowUpRight, Truck } from "lucide-react";
import type { Product } from "@shared/schema";
import { productPath } from "@shared/seo";
import { productDetails, productLabelNotice } from "@shared/catalog";
import { money, toPaise, MAX_ITEM_QUANTITY } from "@shared/pricing";
import { useCart } from "@/contexts/CartContext";
import QuantitySelector from "@/components/QuantitySelector";
import ProductCard from "@/components/ProductCard";

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [location, navigate] = useLocation();
  const { addToCart, cart } = useCart();
  const [quantity, setQuantity] = useState(1);
  const { data: products, isLoading, isError, refetch } = useQuery<Product[]>({ queryKey: ["/api/products"] });
  const product = products?.find(item => item.id === id);
  useEffect(() => { setQuantity(1); }, [id]);
  useEffect(() => { if (product && location !== productPath(product)) navigate(productPath(product), { replace: true }); }, [product, location, navigate]);
  if (isLoading) return <main id="main-content" className="shell section" aria-busy="true">Getting your chips ready…</main>;
  if (isError) return <main id="main-content" className="shell section empty-state"><h1>We couldn't load this product.</h1><button className="btn-primary" onClick={() => refetch()}>Try again</button></main>;
  if (!product) return <main id="main-content" className="shell section empty-state"><h1>This crunch couldn't be found.</h1><Link className="btn-primary" href="/products">Explore all chips</Link></main>;
  const detail = productDetails(product);
  const inBag = cart.items.find(item => item.product.id === id)?.quantity || 0;
  const atLimit = inBag >= MAX_ITEM_QUANTITY;
  const add = (buyNow = false) => { addToCart(product, Math.min(quantity, MAX_ITEM_QUANTITY - inBag)); setQuantity(1); if (buyNow) navigate("/checkout"); };
  return <main id="main-content" className="product-detail-page">
    <section className="shell section"><nav className="breadcrumb" aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><Link href="/products">Chips</Link><span>/</span><span aria-current="page">{product.name}</span></nav>
      <div className="detail-grid"><div><img className="detail-image" src={product.image} alt={`${product.name}, ${detail.flavour} flavour`} width="800" height="800" fetchPriority="high" /><p className="summary-note">Product imagery. Please refer to the pack label for the full product details.</p></div><div className="detail-copy"><span className="eyebrow">THE CRUNCH ERA · {detail.flavour.toUpperCase()}</span><h1>{product.name}</h1><p>{detail.description}</p><div className="detail-price"><Money paise={toPaise(product.price)} /></div><span className="price-caption">Per pack · delivery calculated in your bag</span><div><span className="pack-pill">{detail.packSize ? `${detail.packSize} · Single pack` : "Single pack"}</span></div><div className="purchase-row"><QuantitySelector value={quantity} onChange={setQuantity} name={product.name} max={Math.max(1, MAX_ITEM_QUANTITY - inBag)} /><button className="btn-primary" onClick={() => add()} disabled={atLimit}>{atLimit ? "Pack limit reached" : "Add to bag"} <ArrowUpRight size={19} /></button></div><button className="btn-outline wide buy-now" disabled={atLimit} onClick={() => add(true)}>Buy now</button><p className="summary-note">Buy now adds your selection to your bag and takes you to checkout.</p><div className="detail-shipping"><strong><Truck size={16} className="inline mr-2" />Free delivery from ₹359</strong>₹70 below ₹359, based on product subtotal before discounts.<br /><Link href="/shipping" className="underline">CRUNCH10: 10% off products above ₹450. See terms.</Link></div><div className="faq-list"><details open><summary>Flavour & pack details<span aria-hidden="true">+</span></summary><p>{detail.flavour}{detail.packSize && ` · ${detail.packSize} per pack`}. Choose the number of packs above, or mix flavours in your bag.</p></details><details><summary>Ingredients, nutrition & allergens<span aria-hidden="true">+</span></summary><div>{detail.ingredients && <p><strong>Ingredients:</strong> {detail.ingredients}</p>}<p>Nutrition and allergen details are not yet listed online. <Link href="/contact" className="underline">Contact us</Link> before ordering if you have a dietary requirement.</p><p>{productLabelNotice}</p></div></details>{detail.shelfLife && <details><summary>Shelf life<span aria-hidden="true">+</span></summary><p>{detail.shelfLife}</p></details>}<details><summary>Delivery & returns<span aria-hidden="true">+</span></summary><p>Delivery charges are shown before payment. For an estimated delivery time to your location, <Link href="/contact" className="underline">contact us</Link>. Read our <Link href="/terms-of-service" className="underline">returns and refund terms</Link> for damaged or incorrect items.</p></details></div></div></div>
    </section>
    <section className="shell section"><div className="section-heading"><div><span className="eyebrow">MAKE IT A MIX</span><h2>More crunch to discover.</h2></div><Link href="/products" className="text-link">All chips ↗</Link></div><div className="product-grid">{products?.filter(item => item.id !== id).slice(0, 4).map(item => <ProductCard key={item.id} product={item} />)}</div></section>
    <div className="mobile-purchase"><div><strong>{product.name}</strong><small><Money paise={toPaise(product.price) * quantity} /> · {quantity} {quantity === 1 ? "pack" : "packs"}</small></div><button className="btn-primary" disabled={atLimit} onClick={() => add()}>{atLimit ? "Pack limit reached" : "Add to bag"}</button></div>
  </main>;
}
