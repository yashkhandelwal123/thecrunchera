import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/contexts/CartContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HomePage from "@/pages/HomePage";
import ProductsPage from "@/pages/ProductsPage";
import AboutPage from "@/pages/AboutPage";
import ContactPage from "@/pages/ContactPage";
import CartPage from "@/pages/CartPage";
import NotFound from "@/pages/not-found";
import ManufacturingDetails from "@/pages/ManufacturingDetails";

function Router() {
  return (
    <>
      <Navbar />
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/products" component={ProductsPage} />
        <Route path="/about" component={AboutPage} />
        <Route path="/manufacturing-details" component={ManufacturingDetails} />
        <Route path="/contact" component={ContactPage} />
        <Route path="/cart" component={CartPage} />
        <Route component={NotFound} />
      </Switch>
      <Footer />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <CartProvider>
          <Toaster />
          <Router />
        </CartProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
