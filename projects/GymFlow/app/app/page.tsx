import Link from "next/link";
import { PROJECT_CONFIG } from "../lib/project-config";

export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold mb-4">{PROJECT_CONFIG.name}</h1>
      <p className="text-lg text-gray-600 mb-8 text-center max-w-xl">
        {PROJECT_CONFIG.description}
      </p>
      <Link
        href="/dashboard"
        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
      >
        Go to Dashboard
      </Link>
    </main>
  );
}
