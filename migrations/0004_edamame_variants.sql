-- Add the four owner-approved variants. Preserve existing products and prices on reruns.
INSERT INTO products (id, name, description, price, category, image, badge, featured) VALUES
('83d65a8f-56fb-4618-9cc2-97976aa0cfca', 'Roasted Edamame Beans - 150 g', 'Classic Salt roasted edamame beans. Ingredients: Edamame Beans, Rice Bran Oil, Salt. Contains soy.', 225.00, 'Roasted Beans', '/product-images/edamame-front.jpg', NULL, 0),
('5ecf8dcc-70af-492f-8af4-defce4676226', 'Roasted Edamame Beans - 400 g', 'Classic Salt roasted edamame beans. Ingredients: Edamame Beans, Rice Bran Oil, Salt. Contains soy.', 480.00, 'Roasted Beans', '/product-images/edamame-front.jpg', NULL, 0),
('1d23dfc6-e3dc-4a48-b922-13ccaa4962a1', 'Roasted Edamame Beans - 800 g', 'Classic Salt roasted edamame beans. Ingredients: Edamame Beans, Rice Bran Oil, Salt. Contains soy.', 750.00, 'Roasted Beans', '/product-images/edamame-front.jpg', NULL, 0),
('0ac48ae6-f85f-46cd-8cdb-2e0b1015f334', 'Roasted Edamame Beans - 1 kg', 'Classic Salt roasted edamame beans. Ingredients: Edamame Beans, Rice Bran Oil, Salt. Contains soy.', 850.00, 'Roasted Beans', '/product-images/edamame-front.jpg', NULL, 0)
ON CONFLICT (id) DO NOTHING;
