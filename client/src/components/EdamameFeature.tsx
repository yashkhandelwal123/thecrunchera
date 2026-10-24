import { Link } from 'wouter';
import { ArrowUpRight } from 'lucide-react';
export default function EdamameFeature() {
  return <section className="shell section" aria-label="Discover roasted edamame"><div className="edamame-feature">
    <Link href="/edamame-beans"><img src="/product-images/edamame-front.jpg" alt="The Crunch Era roasted and salted edamame beans jar" width="568" height="568" loading="lazy" /></Link>
    <div><span className="eyebrow">MEET THE NEW CRUNCH</span><h2>A little bean.<br />A big snack moment.</h2><p>Roasted edamame beans, finished with Classic Salt. Ready to enjoy by the handful or sprinkled over your favourite bowl.</p><div className="edamame-facts"><span>46.3 g protein / 100 g</span><span>Roasted, not fried</span></div><Link href="/edamame-beans" className="btn-primary">Discover edamame <ArrowUpRight size={19} /></Link></div>
  </div></section>;
}
