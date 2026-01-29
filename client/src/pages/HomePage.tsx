import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Leaf, Shield, Heart, Award, Star, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { Product, Testimonial } from "@shared/schema";
import ProductCard from "@/components/ProductCard";
import TrustBadge from "@/components/TrustBadge";
import { useState } from "react";
import heroImage from "@assets/generated_images/Kids_enjoying_healthy_snacks_outdoors_03593304.png";
import {BASE_URL} from "../ENDPOINTS"

const testimonials: Testimonial[] = [
  {
    id: "1",
    parentName: "Sarah M.",
    childAge: "Kids aged 4 & 7",
    rating: 5,
    comment: "My kids actually ask for these snacks! Finally, something healthy that they genuinely enjoy. No more battles at snack time!",
  },
  {
    id: "2",
    parentName: "Michael R.",
    childAge: "Daughter, 5",
    rating: 5,
    comment: "Clean ingredients, great taste, and my daughter loves them. These products have been a game-changer for our family meals.",
  },
  {
    id: "3",
    parentName: "Jennifer L.",
    childAge: "Twin boys, 6",
    rating: 5,
    comment: "As a busy mom, I love that these are both nutritious and convenient. My twins devour everything, especially the pasta!",
  },
  {
    id: "4",
    parentName: "David K.",
    childAge: "Son, 8",
    rating: 5,
    comment: "Finally found healthy food my son will eat without complaining. The quality and taste are outstanding!",
  },
];

export default function HomePage() {
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: [`${BASE_URL}/api/products`],
  });

  const featuredProducts = products?.filter((p) => p.featured === 1)?.slice(0, 8) || [];

  const nextTestimonial = () => {
    setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setCurrentTestimonial((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  return (
    <div className="min-h-screen">
      <section className="relative h-[85vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={heroImage}
            alt="Happy kids enjoying healthy snacks"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/50" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="font-heading font-bold text-5xl md:text-6xl lg:text-7xl text-white mb-6" data-testid="text-hero-title">
              Wholesome. Delicious.<br />Crunch-Approved.
            </h1>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-xl md:text-2xl text-white/90 mb-8 max-w-2xl mx-auto"
            data-testid="text-hero-subtitle"
          >
            Healthy, clean-label food that your kids will actually love
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-wrap gap-4 justify-center"
          >
            <Link href="/products">
              <Button size="lg" className="rounded-xl text-lg px-8" data-testid="button-hero-shop">
                Shop Now
              </Button>
            </Link>
            <Link href="/about">
              <Button
                size="lg"
                variant="outline"
                className="rounded-xl text-lg px-8 bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20"
                data-testid="button-hero-learn"
              >
                Learn Our Story
              </Button>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-wrap gap-4 md:gap-6 justify-center mt-12 text-white"
          >
            <div className="flex items-center gap-2">
              <Leaf className="w-5 h-5" />
              <span className="font-medium">100% Natural</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              <span className="font-medium">No Preservatives</span>
            </div>
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5" />
              <span className="font-medium">Crunch-Approved Taste</span>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h2 className="font-heading font-bold text-4xl md:text-5xl mb-4" data-testid="text-featured-title">
              Featured Products
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Discover our most-loved healthy snacks and meals
            </p>
          </motion.div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <Card key={i} className="h-96 animate-pulse bg-muted" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {featuredProducts.map((product, index) => (
                <ProductCard key={product.id} product={product} index={index} />
              ))}
            </div>
          )}

          <div className="text-center mt-12">
            <Link href="/products">
              <Button size="lg" variant="outline" className="rounded-xl" data-testid="button-view-all">
                View All Products
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="py-20 bg-card">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h2 className="font-heading font-bold text-4xl md:text-5xl mb-4">
              Why Families Love Us
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Pure ingredients, proven benefits, perfect for growing kids
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <TrustBadge
              icon={Leaf}
              title="100% Natural"
              description="Only real, wholesome ingredients you can recognize and trust"
            />
            <TrustBadge
              icon={Shield}
              title="No Preservatives"
              description="Free from artificial colors, flavors, and preservatives"
            />
            <TrustBadge
              icon={Heart}
              title="Crunch-Approved"
              description="Taste-tested and loved by real kids and families"
            />
            <TrustBadge
              icon={Award}
              title="Nutritious"
              description="Packed with vitamins, minerals, and whole food nutrition"
            />
          </div>
        </div>
      </section>

      <section className="py-20 bg-background">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h2 className="font-heading font-bold text-4xl md:text-5xl mb-4">
              Parent Testimonials
            </h2>
            <p className="text-xl text-muted-foreground">
              Real stories from real families
            </p>
          </motion.div>

          <div className="relative">
            <Card className="p-8 md:p-12">
              <div className="flex justify-center mb-4">
                {[...Array(testimonials[currentTestimonial].rating)].map((_, i) => (
                  <Star key={i} className="w-6 h-6 fill-primary text-primary" />
                ))}
              </div>
              <p className="text-lg md:text-xl text-center mb-6 italic" data-testid="text-testimonial-comment">
                "{testimonials[currentTestimonial].comment}"
              </p>
              <div className="text-center">
                <p className="font-semibold text-lg" data-testid="text-testimonial-name">
                  {testimonials[currentTestimonial].parentName}
                </p>
                <p className="text-muted-foreground" data-testid="text-testimonial-age">
                  {testimonials[currentTestimonial].childAge}
                </p>
              </div>
            </Card>

            <div className="flex justify-center gap-4 mt-6">
              <Button
                variant="outline"
                size="icon"
                onClick={prevTestimonial}
                className="rounded-full"
                data-testid="button-testimonial-prev"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-2">
                {testimonials.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentTestimonial(index)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      index === currentTestimonial ? "bg-primary w-8" : "bg-muted"
                    }`}
                    data-testid={`button-testimonial-dot-${index}`}
                  />
                ))}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={nextTestimonial}
                className="rounded-full"
                data-testid="button-testimonial-next"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-primary text-primary-foreground">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="font-heading font-bold text-4xl md:text-5xl mb-6">
              Ready to Make Healthy Eating Fun?
            </h2>
            <p className="text-xl mb-8 opacity-90">
              Join thousands of families who've discovered delicious, nutritious food their kids actually enjoy
            </p>
            <Link href="/products">
              <Button
                size="lg"
                variant="secondary"
                className="rounded-xl text-lg px-8"
                data-testid="button-cta-shop"
              >
                Start Shopping
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
