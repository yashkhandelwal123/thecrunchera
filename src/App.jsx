import { useState } from "react";

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-100 to-blue-300 text-gray-800">
      <h1 className="text-4xl font-bold mb-4">🚀 Welcome to My Cloudflare Site</h1>
      <p className="mb-6 text-lg text-gray-600">
        This is a simple React app deployed on <strong>Cloudflare Pages</strong>.
      </p>
      <button
        onClick={() => setCount(count + 1)}
        className="px-6 py-3 bg-blue-600 text-white rounded-xl shadow-md hover:bg-blue-700 transition"
      >
        You clicked {count} times
      </button>
      <footer className="mt-10 text-sm text-gray-500">
        Made with ❤️ using React + Cloudflare
      </footer>
    </div>
  );
}

export default App;
