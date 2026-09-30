import { Link } from "wouter";
import { ArrowUpRight, ShoppingBag, Package, ShieldCheck } from "lucide-react";
import ProductGrid from "@/components/ProductGrid";
import Faq from "@/components/Faq";

export default function HomePage() {
  return <main id="main-content">
    <section className="hero shell">
      <div className="hero-copy"><span className="eyebrow">THE CRUNCH ERA · CHIPS, WITH CHARACTER</span><h1>A little break.<br />A lot of <em>crunch.</em></h1><p>Big snack energy. Your kind of flavour. Meet ragi, oats, moong dal and mix veg chips made for your next “just one more” moment.</p><div className="hero-actions"><Link href="/products" className="btn-primary">Find your crunch <ArrowUpRight size={20} /></Link><Link href="/about" className="text-link">Meet the brand</Link></div><div className="hero-footnote"><span>60 g packs</span><span>Four ways to crunch</span><span>Pick. Mix. Enjoy.</span></div></div>
      <div className="hero-art"><div className="hero-orbit" /><span className="hero-spark spark-one" aria-hidden="true">✳</span><div className="hero-photo hero-photo-main"><img src="/product-images/ragi_chips.webp" alt="The Crunch Era Ragi Chips, Peri Peri flavour" width="800" height="800" fetchPriority="high" /></div><div className="hero-photo hero-photo-small"><img src="/product-images/moong_dal_chips.webp" alt="The Crunch Era Moong Dal Chips, Indian Masala flavour" width="800" height="800" /></div><span className="hero-stamp">SNACK BREAK?<br /><strong>Make it<br />a good one.</strong><span aria-hidden="true">↗</span></span><span className="hero-caption">YOUR NEXT FAVOURITE IS IN THE BAG.</span></div>
    </section>
    <div className="flavour-ribbon" aria-label="Our chips"><span>RAGI</span><span aria-hidden="true">✳</span><span>OATS</span><span aria-hidden="true">✳</span><span>MOONG DAL</span><span aria-hidden="true">✳</span><span>MIX VEG</span><span aria-hidden="true">✳</span><span>ALL CRUNCH.</span></div>
    <section className="section shell" id="shop"><div className="section-heading"><div><span className="eyebrow">MEET YOUR SNACK ROTATION</span><h2>Choose your crunch.</h2></div><Link href="/products" className="text-link">Shop all chips <ArrowUpRight size={18} /></Link></div><ProductGrid limit={4} /></section>
    <section className="section shell"><div className="brand-panel"><div className="brand-panel-image"><img src="/product-images/oats_chips.webp" width="800" height="800" loading="lazy" alt="Indian Masala Oats Chips from The Crunch Era" /></div><div className="brand-panel-copy"><span className="eyebrow">DIFFERENT CHIPS. SAME SNACK MOOD.</span><h2>Life's too short<br />for a boring break.</h2><p>Desk-side munching. Movie-night sharing. The pause between plans. There's always room for a little crunch.</p><p>Explore familiar Indian Masala flavours or turn things up with Peri Peri ragi chips. Mix your favourites, one pack at a time.</p><Link href="/products" className="btn-primary">Build your snack bag <ArrowUpRight size={19} /></Link></div></div></section>
    <section className="shell service-strip" aria-label="Shopping benefits"><div><Package /><span><strong>Your mix, your way</strong>Choose individual packs. Mix any flavours.</span></div><div><ShoppingBag /><span><strong>Clear before checkout</strong>Delivery and discounts shown in your bag.</span></div><div><ShieldCheck /><span><strong>Pay through Razorpay</strong>UPI, cards and netbanking at checkout.</span></div></section>
    <Faq />
    <section className="shell final-cta"><span className="eyebrow">GOOD BREAKS START HERE</span><h2>Got a snack mood?<br />We've got the crunch.</h2><Link href="/products" className="btn-light">Shop the chips <ArrowUpRight size={20} /></Link><span aria-hidden="true" className="cta-spark">✳</span></section>
  </main>;
}
