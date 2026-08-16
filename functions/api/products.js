export async function onRequestGet() {
  const products = [
    {
      id: "1",
      name: "Mix Veg Chips",
      description: "Crunchy baked chips made from real carrots, beetroot, and spinach, finished with a classic Indian masala.",
      price: "70.00",
      category: "Chips",
      image: "/attached_assets/generated_images/mix_veg_chips.webp",
      badge: "Best Seller",
      featured: 1,
    },
    {
      id: "2",
      name: "Moong Dal Chips",
      description: "High-protein chips made from moong dal, seasoned with authentic Indian masala.",
      price: "70.00",
      category: "Chips",
      image: "/attached_assets/generated_images/moong_dal_chips.webp",
      badge: "New",
      featured: 1,
    },
    {
      id: "3",
      name: "Oats Chips",
      description: "Wholesome oats baked into crispy chips with a bold Indian masala flavor.",
      price: "70.00",
      category: "Chips",
      image: "/attached_assets/generated_images/oats_chips.webp",
      badge: "Organic",
      featured: 1,
    },
    {
      id: "4",
      name: "Ragi Chips",
      description: "Nutrient-rich ragi (finger millet) chips with a spicy Peri Peri twist.",
      price: "70.00",
      category: "Chips",
      image: "/attached_assets/generated_images/ragi_chips.webp",
      badge: null,
      featured: 1,
    },
  ];

  return Response.json(products);
}
