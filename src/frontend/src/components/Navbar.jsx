import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";

export default function Navbar() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Update auth state whenever location changes
  useEffect(() => {
    const token = localStorage.getItem("token");
    const userEmail = localStorage.getItem("email");
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    
    setIsAuthenticated(!!token);
    setEmail(userEmail || "");
    setIsAdmin(user.role === "admin");
  }, [location]);

  const handleLogout = () => {
    // Clear all authentication data
    localStorage.removeItem("token");
    localStorage.removeItem("email");
    localStorage.removeItem("user");
    localStorage.removeItem("role");
    
    setIsAuthenticated(false);
    setIsAdmin(false);
    navigate("/");
  };

  return (
    <nav className="bg-blue-600 text-white px-6 py-3 shadow-md" role="navigation" aria-label="Main navigation">
      <div className="flex justify-between items-center">
        {/* Logo/Brand */}
        <Link to="/" className="text-xl font-bold hover:text-blue-100 transition-colors">
          MDP Donor Portal
        </Link>

        {/* Navigation Links */}
        <div className="flex items-center space-x-4">
          {/* Public Links */}
          <Link to="/" className="hover:text-blue-100 transition-colors">
            Home
          </Link>
          <Link to="/causes" className="hover:text-blue-100 transition-colors">
            Browse Causes
          </Link>

          {/* Authenticated User Links */}
          {isAuthenticated && (
            <>
              <Link to="/donate/multi" className="hover:text-blue-100 transition-colors">
                Multi-Cause Donate
              </Link>
              
              {/* Admin-Only Link */}
              {isAdmin && (
                <Link 
                  to="/admin" 
                  className="px-3 py-1 bg-purple-500 rounded-md hover:bg-purple-600 font-semibold transition-colors"
                  aria-label="Admin Dashboard"
                >
                  Admin Dashboard
                </Link>
              )}

              <span className="text-sm text-blue-100 px-2">|</span>
              <span className="text-sm">Welcome, {email}</span>
              
              {/* User Profile Link - navigates to /dashboard route */}
              {/* Note: Route is "/dashboard" but labeled "Profile" for better UX */}
              <Link 
                to="/dashboard" 
                className="px-3 py-1 bg-blue-500 rounded-md hover:bg-blue-700 transition-colors"
              >
                Profile
              </Link>
              
              <button
                onClick={handleLogout}
                className="px-3 py-1 bg-red-500 rounded-md hover:bg-red-600 transition-colors"
                aria-label="Logout"
              >
                Logout
              </button>
            </>
          )}

          {/* Unauthenticated User Links */}
          {!isAuthenticated && (
            <>
              <Link 
                to="/login" 
                className="px-3 py-1 bg-green-500 rounded-md hover:bg-green-600 transition-colors"
              >
                Login
              </Link>
              <Link 
                to="/register" 
                className="px-3 py-1 bg-blue-500 rounded-md hover:bg-blue-700 transition-colors"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
