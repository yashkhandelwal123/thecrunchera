import { Minus, Plus } from "lucide-react";
import { MAX_ITEM_QUANTITY } from "@shared/pricing";
export default function QuantitySelector({ value, onChange, name = "packs", max = MAX_ITEM_QUANTITY }: { value: number; onChange: (value: number) => void; name?: string; max?: number }) {
  return <div className="quantity-control" role="group" aria-label={`Quantity of ${name}`}><button type="button" aria-label={`Decrease ${name}`} disabled={value <= 1} onClick={() => onChange(value - 1)}><Minus size={15} /></button><output aria-live="polite">{value}</output><button type="button" aria-label={`Increase ${name}`} disabled={value >= max} onClick={() => onChange(value + 1)}><Plus size={15} /></button></div>;
}
