// Supplied by the owner; kept separate from the four chips' nutrition panel.
export const edamame = {
  name: 'Roasted & Salted Edamame Beans',
  flavour: 'Classic Salt',
  packSize: '800 g',
  description: 'A savoury roasted flavour, a simple salt seasoning and a satisfying crunch. Made with edamame beans, rice bran oil and salt, these ready-to-eat beans bring variety to your snack break. Enjoy straight from the jar or add a little crunch to your favourite bowl.',
  ingredients: 'Edamame Beans, Rice Bran Oil, Salt.',
  allergenAdvice: 'Contains soy.',
  nutrition: [{ name: 'Protein', value: '46.3 g' }, { name: 'Dietary fibre', value: '14.92 g' }],
  manufacturer: 'Shree Harivansh Foods',
  origin: 'China',
  images: [
    { src: '/product-images/edamame-front.jpg', alt: 'The Crunch Era Classic Salt roasted edamame jar, front label' },
    { src: '/product-images/edamame-nutrition.jpg', alt: 'Roasted edamame jar nutritional information per 100 g' },
    { src: '/product-images/edamame-ingredients.jpg', alt: 'Roasted edamame ingredients and contains soy declaration' },
    { src: '/product-images/edamame-snack.jpg', alt: 'Roasted and salted edamame beans served beside the jar' },
    { src: '/product-images/edamame-highlight.jpg', alt: 'The Crunch Era edamame beans product highlights' },
  ],
};

export const edamameVariants = [
  {
    "id": "83d65a8f-56fb-4618-9cc2-97976aa0cfca",
    "size": "150 g",
    "price": "225.00"
  },
  {
    "id": "5ecf8dcc-70af-492f-8af4-defce4676226",
    "size": "400 g",
    "price": "480.00"
  },
  {
    "id": "1d23dfc6-e3dc-4a48-b922-13ccaa4962a1",
    "size": "800 g",
    "price": "750.00"
  },
  {
    "id": "0ac48ae6-f85f-46cd-8cdb-2e0b1015f334",
    "size": "1 kg",
    "price": "850.00"
  }
] as const;
