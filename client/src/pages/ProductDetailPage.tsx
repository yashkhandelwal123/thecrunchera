import { useQuery } from "@tanstack/react-query";
import { Link, useLocation, useParams } from "wouter";
import type { Product } from "@shared/schema";
import { productPath } from "@shared/seo";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { useEffect } from "react";

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [location, navigate] = useLocation();
  const { addToCart } = useCart();
  const { data: products, isLoading, isError, refetch } = useQuery<Product[]>({ queryKey: ["/api/products"] });
  const product = products?.find(item => item.id === id);
  useEffect(() => {
    if (product && location !== productPath(product)) navigate(productPath(product), { replace: true });
  }, [product, location, navigate]);
  if (isLoading) return <main className="max-w-7xl mx-auto px-6 py-16" aria-busy="true">Loading product…</main>;
  if (isError) return <main className="max-w-7xl mx-auto px-6 py-16"><h1 className="text-3xl font-bold mb-4">Unable to load this product</h1><Button onClick={() => refetch()}>Try again</Button></main>;
  if (!product) return <main className="max-w-7xl mx-auto px-6 py-16"><h1 className="text-3xl font-bold mb-4">Product not found</h1><Link href="/products" className="underline">Browse all chips</Link></main>;
  return (
    <main className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground mb-8"><Link href="/">Home</Link> / <Link href="/products">Chips</Link> / <span aria-current="page">{product.name}</span></nav>
      <div className="grid md:grid-cols-2 gap-10 items-start">
        <img src={product.image} alt={product.name} width={640} height={640} className="w-full rounded-2xl bg-muted aspect-square object-cover" />
        <div className="space-y-6">
          <h1 className="font-heading text-4xl md:text-5xl font-bold">{product.name}</h1>
          <p className="text-lg text-muted-foreground">{product.description}</p>
          <p className="text-3xl font-bold text-primary">₹{Number(product.price).toFixed(2)}</p>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" className="rounded-xl" onClick={() => addToCart(product)}>Add to Cart</Button>
            <Button size="lg" variant="outline" className="rounded-xl" asChild><Link href="/cart">View Cart</Link></Button>
          </div>
          <p className="text-sm text-muted-foreground">Questions about this product? <Link href="/contact" className="underline">Contact us</Link>.</p>
          <Link href="/products" className="inline-block underline">Explore all chips</Link>
        </div>
      </div>
    </main>
  );
}
