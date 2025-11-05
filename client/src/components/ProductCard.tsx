import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart } from "lucide-react";
import type { Product } from "@shared/schema";
import { useCart } from "@/contexts/CartContext";
import { motion } from "framer-motion";

interface ProductCardProps {
  product: Product;
  index?: number;
}

export default function ProductCard({ product, index = 0 }: ProductCardProps) {
  const { addToCart } = useCart();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Card className="overflow-hidden hover-elevate active-elevate-2 group h-full flex flex-col" data-testid={`card-product-${product.id}`}>
        <div className="relative aspect-square bg-muted overflow-hidden">
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {product.badge && (
            <Badge
              className="absolute top-3 right-3"
              variant={product.badge === "Best Seller" ? "default" : "secondary"}
              data-testid={`badge-${product.id}`}
            >
              {product.badge}
            </Badge>
          )}
        </div>
        <div className="p-4 flex flex-col flex-1 gap-3">
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-1" data-testid={`text-product-name-${product.id}`}>
              {product.name}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-2" data-testid={`text-product-description-${product.id}`}>
              {product.description}
            </p>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-xl font-bold text-primary" data-testid={`text-product-price-${product.id}`}>
              ${parseFloat(product.price).toFixed(2)}
            </span>
            <Button
              onClick={() => addToCart(product)}
              className="rounded-xl gap-2"
              data-testid={`button-add-to-cart-${product.id}`}
            >
              <ShoppingCart className="w-4 h-4" />
              Add to Cart
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
