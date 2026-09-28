import { useQuery } from "@tanstack/react-query";
import type { Product } from "@shared/schema";
import ProductCard from "./ProductCard";
export default function ProductGrid({ limit }: { limit?: number }) {
  const { data, isLoading, isError, refetch } = useQuery<Product[]>({ queryKey: ["/api/products"] });
  if (isLoading) return <div className="product-grid" aria-label="Loading chips" aria-busy="true">{[0, 1, 2, 3].map(i => <div className="product-skeleton" key={i} />)}</div>;
  if (isError) return <div className="empty-state"><h3>Our chips couldn't load.</h3><p>Please try again in a moment.</p><button className="btn-primary" onClick={() => refetch()}>Try again</button></div>;
  if (!data?.length) return <div className="empty-state"><h3>The shelf is being refreshed.</h3><p>Please check back soon or contact us with a product question.</p></div>;
  return <div className="product-grid">{data.slice(0, limit).map(product => <ProductCard key={product.id} product={product} />)}</div>;
}
