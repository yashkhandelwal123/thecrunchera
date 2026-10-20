import React from "react";
import { articles, blogPath, readingMinutes, type edamameArticle } from "./blog";

export default function BlogContent({ article }: { article?: typeof edamameArticle }) {
  if (!article) return <main id="main-content" className="shell section blog-index">
    <header className="blog-intro"><span className="eyebrow">THE CRUNCH ERA JOURNAL</span><h1>A little food for thought.</h1><p>Ingredient guides, snack ideas and more ways to enjoy your next crunch.</p></header>
    <div className="blog-cards">{articles.map(a => <article className="blog-card" key={a.slug}><a href={blogPath(a)} aria-label={`Read ${a.title}`}><img src={a.image} alt={a.imageAlt} width="568" height="568" /></a><div><span className="eyebrow">{a.category} · {readingMinutes(a)} min read</span><h2><a href={blogPath(a)}>{a.title}</a></h2><p>{a.description}</p><a className="text-link" href={blogPath(a)}>Read the guide <span aria-hidden="true">↗</span></a></div></article>)}</div>
  </main>;
  const a = article;
  return <main id="main-content" className="shell section blog-page">
    <nav className="breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a><span>/</span><a href="/blog">Journal</a><span>/</span><span aria-current="page">Roasted edamame guide</span></nav>
    <article>
      <header className="blog-hero"><div><span className="eyebrow">{a.category.toUpperCase()}</span><h1>{a.title}</h1><p className="blog-deck">A simple guide to the crunch inside the jar.</p><p className="blog-byline">By <a href="/about">{a.author}</a> · <time dateTime={a.published}>{new Date(a.published + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}</time> · {readingMinutes(a)} min read</p></div><figure><img src={a.image} alt={a.imageAlt} width="568" height="568" /><figcaption>Classic Salt roasted edamame. Product imagery; jar sizes vary.</figcaption></figure></header>
      <div className="blog-layout"><aside className="blog-toc"><nav aria-label="In this article"><h2>In this guide</h2>{a.sections.map(s => <a key={s.id} href={`#${s.id}`}>{s.title}</a>)}<a href="#questions">Your questions, answered</a></nav><a className="btn-primary" href="/edamame-beans">Explore edamame ↗</a></aside>
      <div className="blog-body"><p className="blog-lead">{a.intro}</p>
        {a.sections.map(s => <section key={s.id} id={s.id}><h2>{s.title}</h2>{s.paragraphs.map(p => <p key={p}>{p}</p>)}{s.id === "nutrition" && <div className="blog-nutrition"><table><caption>The Crunch Era roasted edamame · values per 100 g</caption><thead><tr><th scope="col">Nutrient</th><th scope="col">Amount</th></tr></thead><tbody><tr><th scope="row">Protein</th><td>46.3 g</td></tr><tr><th scope="row">Dietary fibre</th><td>14.92 g</td></tr></tbody></table><p><a href="/product-images/edamame-nutrition.jpg">View the nutrition-label photograph ↗</a></p></div>}{s.id === "ingredients" && <p><a href="/product-images/edamame-ingredients.jpg">View the ingredients-label photograph ↗</a></p>}{s.id === "choose-a-jar" && <p><a className="text-link" href="/edamame-beans">See available sizes and current prices ↗</a></p>}</section>)}
        <section id="questions"><h2>Your questions, answered</h2><div className="faq-list">{a.faqs.map(f => <details key={f.question}><summary>{f.question}<span aria-hidden="true">+</span></summary><p>{f.answer}</p></details>)}</div></section>
        <section className="blog-source"><h2>About this guide</h2><p>Published by The Crunch Era about our own Classic Salt product. Ingredients and nutrition are based on the product information and label photographs supplied for this product. The 30 g example is calculated from the stated values, rounded to two decimal places or fewer. Serving ideas are suggestions, not nutrition-tested recipes.</p><p>Packaging may be updated. Always read the current label for ingredients, allergens, storage and use-by information. <a href="/contact">Ask us a product question</a>.</p></section>
        <section className="blog-cta"><span className="eyebrow">READY FOR YOUR NEXT CRUNCH?</span><h2>Find your jar. Make it your snack.</h2><p>Explore Classic Salt roasted edamame in four sizes, or discover our chips for a different kind of crunch.</p><div><a className="btn-primary" href="/edamame-beans">Shop roasted edamame ↗</a><a className="btn-outline" href="/products">Explore all snacks</a></div></section>
        <nav className="blog-related" aria-label="More to explore"><h2>More to explore</h2><a href="/products/ragi-chips">Peri Peri ragi chips ↗</a><a href="/products/moong-dal-chips">Moong dal chips ↗</a><a href="/blog">Back to the journal ↗</a></nav>
      </div></div>
    </article>
  </main>;
}
