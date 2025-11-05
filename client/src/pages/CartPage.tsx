import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus, Minus, ShoppingBag } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { Link } from "wouter";

export default function CartPage() {
  const { cart, removeFromCart, updateQuantity, clearCart } = useCart();

  if (cart.items.length === 0) {
    return (
      <div className="min-h-screen py-12">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="text-center py-20"
          >
            <Card className="max-w-md mx-auto p-12">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
                <ShoppingBag className="w-10 h-10 text-muted-foreground" />
              </div>
              <h2 className="font-heading font-bold text-3xl mb-4" data-testid="text-cart-empty">
                Your cart is empty
              </h2>
              <p className="text-muted-foreground mb-6">
                Add some delicious, healthy products to get started!
              </p>
              <Link href="/products">
                <Button size="lg" className="rounded-xl" data-testid="button-cart-shop">
                  Browse Products
                </Button>
              </Link>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <h1 className="font-heading font-bold text-4xl md:text-5xl" data-testid="text-cart-title">
              Shopping Cart
            </h1>
            <Button
              variant="outline"
              onClick={clearCart}
              className="rounded-xl"
              data-testid="button-clear-cart"
            >
              Clear Cart
            </Button>
          </div>
          <p className="text-muted-foreground">
            {cart.items.length} {cart.items.length === 1 ? 'item' : 'items'} in your cart
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {cart.items.map((item, index) => (
              <motion.div
                key={item.product.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <Card className="p-4 md:p-6" data-testid={`card-cart-item-${item.product.id}`}>
                  <div className="flex gap-4 md:gap-6">
                    <div className="w-24 h-24 md:w-32 md:h-32 rounded-lg bg-muted flex-shrink-0 overflow-hidden">
                      <img
                        src={item.product.image}
                        alt={item.product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="font-semibold text-lg mb-1" data-testid={`text-cart-item-name-${item.product.id}`}>
                          {item.product.name}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          {item.product.category}
                        </p>
                        <p className="text-xl font-bold text-primary" data-testid={`text-cart-item-price-${item.product.id}`}>
                          ${parseFloat(item.product.price).toFixed(2)}
                        </p>
                      </div>

                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                            className="h-8 w-8 rounded-md"
                            data-testid={`button-decrease-${item.product.id}`}
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                          <span className="w-12 text-center font-medium" data-testid={`text-quantity-${item.product.id}`}>
                            {item.quantity}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                            className="h-8 w-8 rounded-md"
                            data-testid={`button-increase-${item.product.id}`}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeFromCart(item.product.id)}
                          className="text-destructive hover:text-destructive"
                          data-testid={`button-remove-${item.product.id}`}
                        >
                          <Trash2 className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>

          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="sticky top-24"
            >
              <Card className="p-6">
                <h2 className="font-heading font-bold text-2xl mb-6">Order Summary</h2>
                
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span data-testid="text-subtotal">${cart.total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Shipping</span>
                    <span className="text-accent-foreground font-medium">FREE</span>
                  </div>
                  <div className="border-t pt-3 flex justify-between font-bold text-xl">
                    <span>Total</span>
                    <span className="text-primary" data-testid="text-total">${cart.total.toFixed(2)}</span>
                  </div>
                </div>

                <Button size="lg" className="w-full rounded-xl mb-4" data-testid="button-checkout">
                  Proceed to Checkout
                </Button>

                <Link href="/products">
                  <Button variant="outline" size="lg" className="w-full rounded-xl" data-testid="button-continue-shopping">
                    Continue Shopping
                  </Button>
                </Link>

                <div className="mt-6 p-4 bg-accent/10 rounded-xl">
                  <p className="text-sm text-center text-muted-foreground">
                    Free shipping on all orders! 🎉
                  </p>
                </div>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
