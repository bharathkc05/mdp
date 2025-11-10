import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50">
      <div className="max-w-3xl bg-white p-8 rounded-lg shadow">
        <h1 className="text-3xl font-extrabold mb-4 text-center">Micro Donation Platform</h1>
        <p className="text-gray-700 mb-4">
          Welcome to the Micro Donation Platform — a simple, secure way for donors to support
          meaningful causes with small, impactful contributions. Create an account to start donating
          to vetted causes, track your donations, and make a difference.
        </p>

        <h2 className="text-xl font-semibold mt-4">What you can do</h2>
        <ul className="list-disc list-inside text-gray-700 mb-4">
          <li>Register and verify your email to secure your account.</li>
          <li>Browse and search for causes that matter to you.</li>
          <li>Make micro-donations to support meaningful causes.</li>
          <li>Track past donations and view impact statistics.</li>
        </ul>

        <div className="flex gap-4 justify-center mt-6">
          <Link to="/causes" className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">Browse Causes</Link>
          <Link to="/register" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Get Started</Link>
          <Link to="/login" className="px-4 py-2 border border-blue-600 text-blue-600 rounded hover:bg-blue-50">Sign in</Link>
        </div>

        <p className="text-xs text-gray-500 mt-6">Need help? Contact support@mdp.example (demo)</p>
      </div>
    </div>
  );
}
