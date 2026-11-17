import { money } from "@shared/pricing";

/** Separate glyph boxes prevent rupee/first-digit kerning collisions. */
export default function Money({ paise }: { paise: number }) {
  const amount = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(paise / 100);
  return <span className="money-value" aria-label={money(paise)}><span className="money-symbol" aria-hidden="true">₹</span><span aria-hidden="true">{amount}</span></span>;
}
