// App.jsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import ManufacturingDetails from "./pages/ManufacturingDetails";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/manufacturing-details" element={<ManufacturingDetails />} />
      </Routes>
    </Router>
  );
}

export default App;
