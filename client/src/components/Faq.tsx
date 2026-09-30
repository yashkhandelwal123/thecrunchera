import { Link } from "wouter";
export const shoppingFaqs = [
  { question: "What's in the range?", answer: "Choose from ragi, oats, moong dal and mix veg chips. Each product page shows the flavour, pack size and current price." },
  { question: "How much is delivery?", answer: "Shipping is ₹70 when the product subtotal is below ₹359, and free from ₹359. Eligibility is based on the product subtotal before any promo discount." },
  { question: "How does CRUNCH10 work?", answer: "Enter CRUNCH10 in your bag or at checkout for 10% off products when the original product subtotal is above ₹450. It does not discount shipping. One code can be applied per order." },
  { question: "Where can I check ingredients and allergens?", answer: "Full ingredient, allergen and nutrition details are not yet listed online. Please contact us before ordering if you have a dietary requirement, and check the product label." },
];
export default function Faq() {
  return <section className="section shell faq-section"><div><span className="eyebrow">GOOD QUESTIONS</span><h2>Before you<br />crunch.</h2><p>Something else on your mind?</p><Link className="text-link" href="/contact">Let's talk <span aria-hidden="true">↗</span></Link></div><div className="faq-list">{shoppingFaqs.map(item => <details key={item.question}><summary>{item.question}<span aria-hidden="true">+</span></summary><p>{item.answer}</p></details>)}</div></section>;
}
