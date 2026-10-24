import { edamame, edamameVariants } from '../shared/edamame';
import type { Product } from '../shared/schema';
export const edamameProducts: Product[] = edamameVariants.map(variant => ({
  id: variant.id, name: `Roasted Edamame Beans - ${variant.size}`, description: edamame.description,
  price: variant.price, category: 'Roasted Beans', image: edamame.images[0].src, badge: null, featured: 0,
}));

/** Add only these approved SKUs at startup; never alter existing products/prices. */
export async function installEdamameCatalog() {
  if (!process.env.DATABASE_URL) return;
  const { storage } = await import('./storage');
  await storage.getAllProducts(); // Preserve initial chips seeding for a fresh database.
  const { db } = await import('./db');
  const { products } = await import('../shared/schema');
  await db.insert(products).values(edamameProducts).onConflictDoNothing({ target: products.id });
}
