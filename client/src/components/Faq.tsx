import { Link } from "wouter";
import { shoppingFaqs } from "@shared/faqs";
export { shoppingFaqs } from "@shared/faqs";
export default function Faq() {
  return <section className="section shell faq-section"><div><span className="eyebrow">GOOD QUESTIONS</span><h2>Before you<br />crunch.</h2><p>Something else on your mind?</p><Link className="text-link" href="/contact">Let's talk <span aria-hidden="true">↗</span></Link></div><div className="faq-list">{shoppingFaqs.map(item => <details key={item.question}><summary>{item.question}<span aria-hidden="true">+</span></summary><p>{item.answer}</p></details>)}</div></section>;
}
