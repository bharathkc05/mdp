import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";

export default function Navbar() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState("");
  const navigate = useNavigate();

  const location = useLocation();

  // Re-evaluate auth state whenever location changes (so Navbar updates after login/logout)
  useEffect(() => {
    const token = localStorage.getItem("token");
    const userEmail = localStorage.getItem("email");
    setIsAuthenticated(!!token);
    setEmail(userEmail || "");
  }, [location]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("email");
    setIsAuthenticated(false);
    navigate("/");
  };

  return (
    <nav className="bg-blue-600 text-white px-6 py-3 flex justify-between items-center shadow-md">
      <h1 className="text-xl font-bold">MDP Donor Portal</h1>
      <div className="space-x-4">
        <Link to="/" className="hover:underline">Home</Link>
        <Link to="/causes" className="hover:underline">Browse Causes</Link>
        {isAuthenticated ? (
          <>
            <span className="text-sm">Welcome, {email}</span>
            <Link to="/dashboard" className="hover:underline">Dashboard</Link>
            <button onClick={handleLogout} className="hover:underline">Logout</button>
          </>
        ) : (
          <>
            <Link to="/login" className="hover:underline">Login</Link>
            <Link to="/register" className="hover:underline">Register</Link>
          </>
        )}
      </div>
    </nav>
  );
}
