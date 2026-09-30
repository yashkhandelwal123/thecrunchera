import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import type { Product, CartItem, Cart } from "@shared/schema";
import { MAX_ITEM_QUANTITY } from "@shared/pricing";
import { useToast } from "@/hooks/use-toast";

interface CartContextType {
  cart: Cart; itemCount: number; promoCode: string;
  setPromoCode: (code: string) => void;
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
}
const CartContext = createContext<CartContextType | undefined>(undefined);
const KEY = "The Crunch era_cart";
function readCart(): CartItem[] {
  try {
    const stored = JSON.parse(localStorage.getItem(KEY) || '{"items":[]}');
    if (!Array.isArray(stored.items)) return [];
    const valid = stored.items.filter((item: CartItem) => item?.product && typeof item.product.id === "string" && typeof item.product.name === "string" && typeof item.product.image === "string" && Number.isFinite(Number(item.product.price)) && Number(item.product.price) > 0 && Number.isInteger(item.quantity) && item.quantity > 0);
    const unique = new Map<string, CartItem>();
    for (const item of valid) unique.set(item.product.id, { ...item, quantity: Math.min(MAX_ITEM_QUANTITY, (unique.get(item.product.id)?.quantity || 0) + item.quantity) });
    return Array.from(unique.values()).slice(0, 50);
  } catch { return []; }
}
export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(readCart);
  const [promoCode, setPromoCode] = useState(() => { try { return sessionStorage.getItem("crunch-promo") || ""; } catch { return ""; } });
  const { toast } = useToast();
  const cart: Cart = { items, total: items.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0) };
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify({ items })); } catch { /* Shopping remains usable if browser storage is unavailable. */ } }, [items]);
  useEffect(() => { try { sessionStorage.setItem("crunch-promo", promoCode); } catch { /* Keep in memory. */ } }, [promoCode]);
  const addToCart = (product: Product, quantity = 1) => {
    if (!Number.isInteger(quantity) || quantity < 1) return;
    setItems(previous => {
      const existing = previous.find(item => item.product.id === product.id);
      if (existing) return previous.map(item => item.product.id === product.id ? { product, quantity: Math.min(MAX_ITEM_QUANTITY, item.quantity + quantity) } : item);
      return [...previous, { product, quantity: Math.min(MAX_ITEM_QUANTITY, quantity) }];
    });
    toast({ title: "Added to your bag", description: `${product.name}. Your bag is ready when you are.` });
  };
  const removeFromCart = (id: string) => setItems(previous => previous.filter(item => item.product.id !== id));
  const updateQuantity = (id: string, quantity: number) => {
    if (!Number.isInteger(quantity)) return;
    if (quantity <= 0) return removeFromCart(id);
    setItems(previous => previous.map(item => item.product.id === id ? { ...item, quantity: Math.min(MAX_ITEM_QUANTITY, quantity) } : item));
  };
  const clearCart = () => { setItems([]); setPromoCode(""); };
  return <CartContext.Provider value={{ cart, itemCount: items.reduce((sum, item) => sum + item.quantity, 0), promoCode, setPromoCode, addToCart, removeFromCart, updateQuantity, clearCart }}>{children}</CartContext.Provider>;
}
export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within a CartProvider");
  return context;
}
