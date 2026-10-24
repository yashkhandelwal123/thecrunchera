import { createRoot } from "react-dom/client";
import App from "./App";
import { initAnalytics } from "./lib/analytics";
initAnalytics();
import "./index.css";
import "./store.css";
import "./blog.css";
import "./growth.css";

createRoot(document.getElementById("root")!).render(<App />);

