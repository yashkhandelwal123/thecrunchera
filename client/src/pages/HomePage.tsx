import EdamameFeature from "@/components/EdamameFeature";
import { Link } from "wouter";
import { ArrowUpRight, ShoppingBag, Package, ShieldCheck } from "lucide-react";
import ProductGrid from "@/components/ProductGrid";
import Faq from "@/components/Faq";

export default function HomePage() {
  return <main id="main-content">
    <section className="hero shell">
      <div className="hero-copy"><span className="eyebrow">THE CRUNCH ERA · MAKE ROOM FOR GOOD SNACKS</span><h1>Chips &amp; roasted<br /><em>edamame beans.</em></h1><p>From flavour-packed chips to roasted edamame beans, find a little something for every snack moment. Open a pack. Reach for a jar. Make the break yours.</p><div className="hero-actions"><Link href="/products" className="btn-primary">Find your crunch <ArrowUpRight size={20} /></Link><Link href="/about" className="text-link">Meet the brand</Link></div><div className="hero-footnote"><span>Chips & roasted edamame</span><span>Find your favourite</span></div></div>
      <div className="hero-range" aria-label="Explore all five snack varieties"><span className="eyebrow">FIVE WAYS TO FIND YOUR CRUNCH</span><div className="hero-range-grid">{[
        { name: 'Moong Dal Chips', image: 'moong_dal_chips.webp', href: '/products' },
        { name: 'Oats Chips', image: 'oats_chips.webp', href: '/products' },
        { name: 'Ragi Chips', image: 'ragi_chips.webp', href: '/products' },
        { name: 'Mix Veg Chips', image: 'mix_veg_chips.webp', href: '/products' },
        { name: 'Edamame Beans', image: 'edamame-front.jpg', href: '/edamame-beans' },
      ].map(product => <Link key={product.name} href={product.href} className="hero-range-card"><img src={`/product-images/${product.image}`} alt={`The Crunch Era ${product.name}`} width="400" height="400" /><span>{product.name}</span></Link>)}</div><p>Different snacks. A shared love of crunch.</p></div>
    </section>
    <div className="flavour-ribbon" aria-label="Our snack range"><span>RAGI</span><span aria-hidden="true">✳</span><span>OATS</span><span aria-hidden="true">✳</span><span>MOONG DAL</span><span aria-hidden="true">✳</span><span>MIX VEG</span><span aria-hidden="true">✳</span><span>EDAMAME</span></div>
    <section className="section shell" id="shop"><div className="section-heading"><div><span className="eyebrow">MEET YOUR SNACK ROTATION</span><h2>Choose your crunch.</h2></div><Link href="/products" className="text-link">Shop all snacks <ArrowUpRight size={18} /></Link></div><ProductGrid limit={4} /></section>
    <EdamameFeature />
    <section className="section shell"><div className="brand-panel"><div className="brand-panel-image"><img src="/product-images/oats_chips.webp" width="800" height="800" loading="lazy" alt="Indian Masala Oats Chips from The Crunch Era" /></div><div className="brand-panel-copy"><span className="eyebrow">DIFFERENT CHIPS. SAME SNACK MOOD.</span><h2>Life's too short<br />for a boring break.</h2><p>Desk-side munching. Movie-night sharing. The pause between plans. There's always room for a little crunch.</p><p>Explore familiar Indian Masala flavours or turn things up with Peri Peri ragi chips. Mix your favourites, one pack at a time.</p><Link href="/products" className="btn-primary">Build your snack bag <ArrowUpRight size={19} /></Link></div></div></section>
    <section className="shell service-strip" aria-label="Shopping benefits"><div><Package /><span><strong>Your mix, your way</strong>Choose individual packs. Mix any flavours.</span></div><div><ShoppingBag /><span><strong>Clear before checkout</strong>Delivery and discounts shown in your bag.</span></div><div><ShieldCheck /><span><strong>Pay through Razorpay</strong>UPI, cards and netbanking at checkout.</span></div></section>
    <Faq />
    <section className="shell final-cta"><span className="eyebrow">GOOD BREAKS START HERE</span><h2>Got a snack mood?<br />We've got the crunch.</h2><Link href="/products" className="btn-light">Explore the snacks <ArrowUpRight size={20} /></Link><span aria-hidden="true" className="cta-spark">✳</span></section>
  </main>;
}
