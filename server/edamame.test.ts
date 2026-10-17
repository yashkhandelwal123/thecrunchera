import { test } from 'node:test';
import assert from 'node:assert/strict';
import { productDetails } from '../shared/catalog';
import { renderSeoHtml } from './seo';
import { publicPages } from '../shared/seo';

test('edamame facts never inherit the chips nutrition or allergen panel', () => {
  const beans = productDetails({ name: 'Roasted & Salted Edamame Beans', description: 'Stored description' });
  assert.equal(beans.packSize, '800 g');
  assert.equal(beans.allergenAdvice, 'Contains soy.');
  assert.equal(beans.nutrition?.find(row => row.name === 'Protein')?.value, '46.3 g');
  const chips = productDetails({ name: 'Ragi Chips', description: '' });
  assert.equal(chips.packSize, '60 g');
  assert.equal(chips.nutrition?.find(row => row.name === 'Protein')?.value, '11.2 g');
});
test('edamame information page is indexable without an invented price or offer', () => {
  assert.ok(publicPages['/edamame-beans']);
  const html = renderSeoHtml('<html><head></head><body><div id="root"></div></body></html>', '/edamame-beans');
  for (const value of ['Contains soy.', '46.3 g', '800 g', 'China', 'index, follow']) assert.ok(html.includes(value));
  assert.ok(!html.includes('"offers"'));
  assert.ok(!html.includes('₹0'));
});

test('four sizes have distinct server-priced order lines', async () => {
  const { MemStorage } = await import('./storage');
  const { quoteCart } = await import('./pricing');
  const { edamameVariants } = await import('../shared/edamame');
  const store = new MemStorage();
  const quote = await quoteCart(store, edamameVariants.map(v => ({ productId: v.id, quantity: 1 })));
  assert.equal(quote.lineItems.length, 4);
  assert.deepEqual(quote.lineItems.map(item => item.unitPrice), ['225.00', '480.00', '750.00', '850.00']);
  assert.deepEqual(quote.lineItems.map(item => productDetails({ name: item.productName, description: '' }).packSize), ['150 g', '400 g', '800 g', '1 kg']);
});
