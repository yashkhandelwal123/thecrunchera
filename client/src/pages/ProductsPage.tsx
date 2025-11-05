import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Product } from "@shared/schema";
import ProductCard from "@/components/ProductCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

const categories = ["All", "Sauces", "Snacks", "Pasta", "Drinks"];

export default function ProductsPage() {
  const [selectedCategory, setSelectedCategory] = useState("All");

  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const filteredProducts = products?.filter((product) =>
    selectedCategory === "All" ? true : product.category === selectedCategory
  ) || [];

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h1 className="font-heading font-bold text-5xl md:text-6xl mb-4" data-testid="text-products-title">
            Our Products
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Explore our complete collection of healthy, delicious food for kids and families
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex flex-wrap gap-3 justify-center mb-12"
        >
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              onClick={() => setSelectedCategory(category)}
              className="rounded-xl"
              data-testid={`button-filter-${category.toLowerCase()}`}
            >
              {category}
            </Button>
          ))}
        </motion.div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(12)].map((_, i) => (
              <Card key={i} className="h-96 animate-pulse bg-muted" />
            ))}
          </div>
        ) : filteredProducts.length > 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            {filteredProducts.map((product, index) => (
              <ProductCard key={product.id} product={product} index={index} />
            ))}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="text-center py-20"
          >
            <Card className="max-w-md mx-auto p-12">
              <h3 className="font-heading font-semibold text-2xl mb-4">
                No products found
              </h3>
              <p className="text-muted-foreground mb-6">
                We couldn't find any products in this category. Try selecting a different category.
              </p>
              <Button
                onClick={() => setSelectedCategory("All")}
                className="rounded-xl"
                data-testid="button-reset-filter"
              >
                View All Products
              </Button>
            </Card>
          </motion.div>
        )}

        {filteredProducts.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-center mt-12"
          >
            <p className="text-muted-foreground" data-testid="text-product-count">
              Showing {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'}
              {selectedCategory !== "All" && ` in ${selectedCategory}`}
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
