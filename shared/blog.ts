export const edamameArticle = {
  slug: "roasted-edamame-beans-guide",
  title: "Roasted edamame beans: ingredients, nutrition & ways to enjoy",
  description: "Get to know roasted and salted edamame beans: ingredients, protein and fibre per 100 g, soy allergen information and easy snack ideas.",
  category: "Snack guides",
  author: "The Crunch Era",
  published: "2026-10-20",
  image: "/product-images/edamame-snack.jpg",
  imageAlt: "The Crunch Era roasted and salted edamame beans served beside the jar",
  intro: "A good snack break can be as simple as opening a jar. Roasted edamame beans bring a savoury flavour and a firm crunch to your desk, your movie-night bowl or the top of a salad. If you are trying them for the first time, here is a practical guide to The Crunch Era Classic Salt version: what is inside, how to read the nutrition numbers and a few ways to make it part of your snack rotation.",
  sections: [
    { id: "meet-edamame", title: "Meet your next crunchy snack", paragraphs: [
      "The Crunch Era Roasted & Salted Edamame Beans are a ready-to-eat roasted soybean snack. The Classic Salt flavour keeps the seasoning simple, letting the roasted taste and crunchy texture take centre stage. You can enjoy the beans straight from the jar; this product does not need cooking before eating.",
      "Think of them as a snack in their own right or an extra layer of texture in a meal. A spoonful over a bowl gives you a different experience from a handful enjoyed on its own. The ideas below are serving suggestions, so you can adjust the other ingredients to suit your taste."
    ] },
    { id: "ingredients", title: "Three ingredients, clearly listed", paragraphs: [
      "Our Classic Salt roasted edamame contains edamame beans, rice bran oil and salt. That is the ingredient list for this product—not a claim about every roasted edamame snack you might find elsewhere.",
      "Contains soy. Check the current jar label for the complete product information before eating, particularly if you have food allergies. If you need clarification about the label, contact us before placing your order."
    ] },
    { id: "nutrition", title: "Reading the protein and fibre numbers", paragraphs: [
      "The product information supplied for The Crunch Era roasted edamame lists 46.3 g of protein and 14.92 g of dietary fibre per 100 g. The words ‘per 100 g’ matter: these figures are not the amount in every handful or in every jar.",
      "For a simple illustration, a weighed 30 g portion would contain approximately 13.9 g of protein and 4.48 g of dietary fibre, calculated from those per-100-g figures. This is an arithmetic example, not a recommended daily serving. Use the portion you actually eat when comparing quantities.",
      "These two numbers are only part of the nutrition panel. Read the packaging for the full information rather than judging a snack on protein alone. The figures here describe this specific roasted product; they should not be applied to another brand or a differently prepared edamame product."
    ] },
    { id: "ways-to-eat", title: "Four easy ways to enjoy roasted edamame", paragraphs: [
      "At your desk: put some beans into a small bowl for a snack break. Serving them separately makes it easier to see how much you have chosen, and keeps the jar ready for another occasion.",
      "On a salad: finish chopped cucumber, tomato and your favourite greens with roasted edamame. Add the beans just before eating so you can enjoy the contrast between the vegetables and the crunch.",
      "In a quick chaat-style bowl: mix chopped onion, tomato and coriander with a squeeze of lemon, then add the roasted beans at the end. Taste before adding more salt because the Classic Salt beans are already seasoned. This is a serving idea, not a tested recipe with fixed nutrition values.",
      "Over a meal bowl: sprinkle them over stir-fried vegetables or a rice bowl just before serving. Keep a little aside if you want extra crunch as you eat. Any added ingredients change the nutrition of the finished dish."
    ] },
    { id: "choose-a-jar", title: "Choose the jar size that suits you", paragraphs: [
      "The Crunch Era Classic Salt edamame comes in 150 g, 400 g, 800 g and 1 kg options. The 150 g option is a smaller starting point if you are exploring the flavour. Larger options give you more of the same snack for sharing or using in different bowls.",
      "Choose a size on the product page to see its current price. The size selector changes the quantity you buy, not the per-100-g nutrition figures. Delivery charges and any applicable offer are shown in your bag and at checkout.",
      "Follow the storage instructions and use-by date on the jar. We have not specified a shelf-life duration here because the current pack should be your reference."
    ] }
  ],
  faqs: [
    { question: "Can I eat these roasted edamame beans straight from the jar?", answer: "Yes. The Crunch Era Roasted & Salted Edamame Beans are ready to eat. Enjoy them on their own or add them to a dish just before serving." },
    { question: "Does every jar contain 46.3 g of protein?", answer: "No. The stated 46.3 g protein figure is per 100 g of product. The amount in your portion depends on its weight; jar sizes range from 150 g to 1 kg." },
    { question: "Are these suitable for someone with a soy allergy?", answer: "This product contains soy. Do not choose it if you need to avoid soy. Check the current label and contact us if you need further product information." },
    { question: "Where can I buy The Crunch Era roasted edamame beans?", answer: "Choose your jar size on our Roasted Edamame Beans product page, add it to your bag and review the delivery charge before payment." }
  ]
};
export const articles = [edamameArticle];
export const blogPath = (article: typeof edamameArticle) => `/blog/${article.slug}`;
export const articleForPath = (path: string) => articles.find(a => blogPath(a) === path);
export function readingMinutes(article: typeof edamameArticle) {
  return Math.max(1, Math.ceil([article.intro, ...article.sections.flatMap(s => s.paragraphs), ...article.faqs.map(f => f.answer)].join(" ").split(/\s+/).length / 220));
}
