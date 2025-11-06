import { createApp } from '@cloudflare/express';

const app = createApp();

app.get('/api/products', (req, res) => {
  res.json({ message: 'It works!', products: [] });
});

export default app;
