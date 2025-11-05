import { Link, useLocation } from "wouter";
import { ShoppingCart, Menu, X, Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";

export default function Navbar() {
  const [location] = useLocation();
  const { itemCount } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { path: "/", label: "Home" },
    { path: "/products", label: "Products" },
    { path: "/about", label: "About Us" },
    { path: "/contact", label: "Contact" },
  ];

  const isActive = (path: string) => location === path;

  return (
    <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2 hover-elevate rounded-md px-2 py-1">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <Leaf className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-heading font-bold text-xl text-foreground">The Crunch Era</span>
          </Link>

          <div className="hidden md:flex items-center gap-2">
            {navItems.map((item) => (
              <Link key={item.path} href={item.path}>
                <Button
                  variant={isActive(item.path) ? "secondary" : "ghost"}
                  className="font-medium"
                  data-testid={`link-nav-${item.label.toLowerCase().replace(" ", "-")}`}
                >
                  {item.label}
                </Button>
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Link href="/cart">
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                data-testid="button-cart"
              >
                <ShoppingCart className="w-5 h-5" />
                {itemCount > 0 && (
                  <Badge
                    className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center p-0 px-1"
                    variant="default"
                    data-testid="text-cart-count"
                  >
                    {itemCount}
                  </Badge>
                )}
              </Button>
            </Link>

            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="button-mobile-menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t bg-background"
          >
            <div className="px-6 py-4 space-y-2">
              {navItems.map((item) => (
                <Link key={item.path} href={item.path}>
                  <Button
                    variant={isActive(item.path) ? "secondary" : "ghost"}
                    className="w-full justify-start font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                    data-testid={`link-mobile-${item.label.toLowerCase().replace(" ", "-")}`}
                  >
                    {item.label}
                  </Button>
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
