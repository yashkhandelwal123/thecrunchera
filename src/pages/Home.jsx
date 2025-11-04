import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-center p-6">
      <h1 className="text-4xl font-bold text-blue-700 mb-4">
        Welcome to The Crunchera
      </h1>
      <p className="text-gray-600 mb-6 max-w-xl">
        Explore our platform to discover insights, tools, and analytics that drive smart manufacturing and business decisions.
      </p>

      <div className="flex gap-4">
        <Link
          to="/manufacturing-details"
          className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          View Manufacturing Details
        </Link>

        <a
          href="https://thecrunchera.com"
          className="border border-blue-600 text-blue-600 px-5 py-2 rounded-lg hover:bg-blue-50 transition"
        >
          Visit Main Site
        </a>
      </div>
    </div>
  );
}
