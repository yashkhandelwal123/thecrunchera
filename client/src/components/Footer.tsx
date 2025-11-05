import { Link } from "wouter";
import { Leaf, Facebook, Instagram, Twitter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Footer() {
  const [email, setEmail] = useState("");
  const { toast } = useToast();

  const newsletterMutation = useMutation({
    mutationFn: (email: string) => apiRequest("POST", "/api/newsletter", { email }),
    onSuccess: () => {
      toast({
        title: "Subscribed!",
        description: "Thank you for subscribing to our newsletter.",
      });
      setEmail("");
    },
    onError: (error: any) => {
      let errorMessage = "Something went wrong. Please try again.";
      
      if (error?.message) {
        try {
          const match = error.message.match(/\{.*\}/);
          if (match) {
            const parsed = JSON.parse(match[0]);
            errorMessage = parsed.error || errorMessage;
          }
        } catch {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      newsletterMutation.mutate(email);
    }
  };

  return (
    <footer className="bg-card border-t mt-20">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <Leaf className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-heading font-bold text-xl">The Crunch Era</span>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Wholesome, delicious, and kid-approved healthy food for families who care.
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" className="rounded-full" data-testid="link-facebook">
                <Facebook className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="rounded-full" data-testid="link-instagram">
                <Instagram className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="rounded-full" data-testid="link-twitter">
                <Twitter className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div>
            <h3 className="font-heading font-semibold text-lg mb-4">Company</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/about">
                  <Button variant="link" className="h-auto p-0 text-muted-foreground hover:text-foreground" data-testid="link-footer-about">
                    About Us
                  </Button>
                </Link>
              </li>
              <li>
                <Link href="/products">
                  <Button variant="link" className="h-auto p-0 text-muted-foreground hover:text-foreground" data-testid="link-footer-products">
                    Our Products
                  </Button>
                </Link>
              </li>
              <li>
                <Link href="/contact">
                  <Button variant="link" className="h-auto p-0 text-muted-foreground hover:text-foreground" data-testid="link-footer-contact">
                    Contact Us
                  </Button>
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-heading font-semibold text-lg mb-4">Resources</h3>
            <ul className="space-y-2">
              <li>
                <Button variant="link" className="h-auto p-0 text-muted-foreground hover:text-foreground">
                  Nutrition Guide
                </Button>
              </li>
              <li>
                <Button variant="link" className="h-auto p-0 text-muted-foreground hover:text-foreground">
                  Recipes
                </Button>
              </li>
              <li>
                <Button variant="link" className="h-auto p-0 text-muted-foreground hover:text-foreground">
                  FAQs
                </Button>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-heading font-semibold text-lg mb-4">Newsletter</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Get healthy eating tips and exclusive offers!
            </p>
            <form onSubmit={handleSubscribe} className="flex gap-2">
              <Input
                type="email"
                placeholder="Your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-xl"
                required
                data-testid="input-footer-email"
              />
              <Button
                type="submit"
                className="rounded-xl"
                disabled={newsletterMutation.isPending}
                data-testid="button-footer-subscribe"
              >
                Subscribe
              </Button>
            </form>
          </div>
        </div>

        <div className="border-t mt-8 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © 2024 TroovyBites. All rights reserved.
          </p>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <Button variant="link" className="h-auto p-0 text-muted-foreground hover:text-foreground">
              Privacy Policy
            </Button>
            <Button variant="link" className="h-auto p-0 text-muted-foreground hover:text-foreground">
              Terms of Service
            </Button>
          </div>
        </div>
      </div>
    </footer>
  );
}
