import { useProductView } from "@/hooks/useCommerceView";
import ProductImageGallery from "@/components/ProductImageGallery";
import { useCart } from "@/contexts/CartContext";
import QuantitySelector from "@/components/QuantitySelector";
import Money from "@/components/Money";
import { toPaise, MAX_ITEM_QUANTITY } from "@shared/pricing";
import { useState, useEffect } from 'react';
import { Link, useLocation, useSearch } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import type { Product } from '@shared/schema';
import { edamame, edamameVariants } from '@shared/edamame';
import { productPath } from '@shared/seo';
import { productLabelNotice, productFaqs } from '@shared/catalog';

export default function EdamamePage() {
  const search = useSearch();
  const selectedSize = new URLSearchParams(search).get("size");
  const [variantId, setVariantId] = useState<string>(() => edamameVariants.find(v => v.size.replace(/\s/g, "") === selectedSize)?.id || edamameVariants[0].id);
  useEffect(() => { const selected = edamameVariants.find(v => v.size.replace(/\s/g, "") === selectedSize); setVariantId(selected?.id || edamameVariants[0].id); setQuantity(1); setAdded(false); }, [selectedSize]);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const { addToCart, cart } = useCart();
  const [, navigate] = useLocation();
  const variant = edamameVariants.find(item => item.id === variantId)!;
  const { data: products } = useQuery<Product[]>({ queryKey: ['/api/products'] });
  // Purchasing uses a real catalog record and server price, never a placeholder price.
  const purchasable = products?.find(product => product.id === variantId && Number(product.price) > 0);
  useProductView(purchasable);
  const inBag = cart.items.find(item => item.product.id === variantId)?.quantity || 0;
  const atLimit = inBag >= MAX_ITEM_QUANTITY;
  const add = (buyNow = false) => {
    if (!purchasable || atLimit) return;
    addToCart(purchasable, Math.min(quantity, MAX_ITEM_QUANTITY - inBag));
    setAdded(true); setQuantity(1);
    if (buyNow) navigate('/checkout');
  };
  return <main id="main-content" className="shell section">
    <nav className="breadcrumb" aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><Link href="/products">Snacks</Link><span>/</span><span aria-current="page">Edamame beans</span></nav>
    <div className="detail-grid"><ProductImageGallery images={edamame.images} />
    <div className="detail-copy"><span className="eyebrow">THE CRUNCH ERA · CLASSIC SALT</span><h1>Roasted edamame beans.<br />Classic Salt.</h1><p>{edamame.description}</p><span className="pack-pill">{variant.size} · Jar</span><div className="edamame-facts"><span>46.3 g protein / 100 g</span><span>14.92 g fibre / 100 g</span><span>Roasted, not fried</span></div>
      <fieldset className="variant-picker"><legend>Choose your jar size</legend><div>{edamameVariants.map(option => <label key={option.id} className={variantId === option.id ? 'variant-option selected' : 'variant-option'}><input type="radio" name="edamame-size" value={option.id} checked={variantId === option.id} onChange={() => { setVariantId(option.id); setQuantity(1); setAdded(false); navigate(`/edamame-beans?size=${option.size.replace(/\s/g, "")}`, { replace: true }); }} /><strong>{option.size}</strong><span><Money paise={toPaise(products?.find(p => p.id === option.id)?.price || option.price)} /></span></label>)}</div></fieldset>
      <div className="detail-price"><Money paise={toPaise(purchasable?.price || variant.price)} /></div><p className="price-caption">Per {variant.size} jar · delivery calculated in your bag</p>
      <div className="purchase-row"><QuantitySelector value={quantity} onChange={setQuantity} name={`Edamame ${variant.size}`} max={Math.max(1, MAX_ITEM_QUANTITY - inBag)} /><button className="btn-primary" disabled={!purchasable || atLimit} onClick={() => add()}>{atLimit ? 'Jar limit reached' : added ? 'Added to bag ✓' : 'Add to bag'}</button></div>
      <button className="btn-outline wide buy-now" disabled={!purchasable || atLimit} onClick={() => add(true)}>Buy now</button>
      {!purchasable && <p className="summary-note">This size is not currently available to order online. <Link href="/contact" className="underline">Contact us</Link> for availability.</p>}
      <p className="summary-note" role="status">{added ? `${variant.size} edamame added to your bag.` : 'Your selected size will appear in your bag and order confirmation.'}</p>
      <div className="faq-list">{productFaqs({ name: edamame.name, description: edamame.description }).map(faq => <details key={faq.question}><summary>{faq.question}<span aria-hidden="true">+</span></summary><p>{faq.answer}</p></details>)}<details open><summary>Ingredients & allergens<span aria-hidden="true">+</span></summary><p><strong>Ingredients:</strong> {edamame.ingredients}</p><p><strong>Allergen information:</strong> {edamame.allergenAdvice}</p></details>
      <details open><summary>Nutrition per 100 g<span aria-hidden="true">+</span></summary><table className="w-full my-4"><caption className="sr-only">Edamame nutrition per 100 grams</caption><tbody>{edamame.nutrition.map(item => <tr className="border-b" key={item.name}><th scope="row" className="text-left font-normal py-3">{item.name}</th><td className="text-right py-3">{item.value}</td></tr>)}</tbody></table><p>See the nutrition-label image for the full panel. Values are per 100 g, not per serving.</p></details>
      <details><summary>Product information<span aria-hidden="true">+</span></summary><dl className="edamame-specs"><dt>Flavour</dt><dd>{edamame.flavour}</dd><dt>Manufacturer, packer & importer</dt><dd>{edamame.manufacturer}</dd><dt>Country of origin</dt><dd>{edamame.origin}</dd><dt>Net quantity</dt><dd>{variant.size}</dd><dt>Item form</dt><dd>Whole roasted beans</dd></dl><p>Check the jar for net weight, manufacture date and use-by date.</p></details>
      <details><summary>Ways to enjoy<span aria-hidden="true">+</span></summary><p>Open the jar for a work-break snack, share a bowl on movie night, or sprinkle over stir-fried vegetables. You can also add a handful to a nuts-and-seeds mix.</p></details></div><p className="summary-note">{productLabelNotice}</p>
    </div></div>
    <div className="section-heading section"><h2>More ways to crunch.</h2><Link href="/products" className="btn-outline">Explore our chips ↗</Link></div>
  </main>;
}
