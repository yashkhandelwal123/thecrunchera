import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="text-center">
        <h1 className="font-heading font-bold text-8xl md:text-9xl text-primary mb-4">404</h1>
        <h2 className="font-heading font-bold text-3xl md:text-4xl mb-4">Page Not Found</h2>
        <p className="text-lg text-muted-foreground mb-8 max-w-md mx-auto">
          Oops! The page you're looking for doesn't exist. Let's get you back on track.
        </p>
        <Link href="/">
          <Button size="lg" className="rounded-xl gap-2" data-testid="button-home">
            <Home className="w-5 h-5" />
            Back to Home
          </Button>
        </Link>
      </div>
    </div>
  );
}
