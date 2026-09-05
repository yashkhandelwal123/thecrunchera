import { useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/contexts/CartContext";
import { AuthProvider } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HomePage from "@/pages/HomePage";
import ProductsPage from "@/pages/ProductsPage";
import AboutPage from "@/pages/AboutPage";
import ContactPage from "@/pages/ContactPage";
import CartPage from "@/pages/CartPage";
import CheckoutPage from "@/pages/CheckoutPage";
import OrdersPage from "@/pages/OrdersPage";
import OrderDetailPage from "@/pages/OrderDetailPage";
import AdminOrdersPage from "@/pages/AdminOrdersPage";
import NotFound from "@/pages/not-found";
import ManufacturingDetails from "@/pages/ManufacturingDetails";
import JalwaInvitation from "./pages/Ridhav";

// Routes that should render full-bleed, with no site chrome
const NO_CHROME_ROUTES = ["/Ridhav"];

function Router() {
  const [location] = useLocation();
  const hideChrome = NO_CHROME_ROUTES.includes(location);

  // wouter (like most SPA routers) doesn't reset scroll position on
  // navigation the way a full page load does — without this, clicking a
  // link while scrolled down keeps you at that same scroll position on
  // the new page, which can land you mid-page or even at the bottom.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);

  return (
    <>
      {!hideChrome && <Navbar />}
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/products" component={ProductsPage} />
        <Route path="/about" component={AboutPage} />
        <Route path="/manufacturing-details" component={ManufacturingDetails} />
        <Route path="/contact" component={ContactPage} />
        <Route path="/cart" component={CartPage} />
        <Route path="/checkout" component={CheckoutPage} />
        <Route path="/orders" component={OrdersPage} />
        <Route path="/orders/:id" component={OrderDetailPage} />
        <Route path="/admin/orders" component={AdminOrdersPage} />
        <Route path="/Ridhav" component={JalwaInvitation} />
        <Route component={NotFound} />
      </Switch>
      {!hideChrome && <Footer />}
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <CartProvider>
            <Toaster />
            <Router />
          </CartProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
