import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const [userName, setUserName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (user) {
      const displayName = user.firstName 
        ? `${user.firstName} ${user.lastName || ''}`.trim()
        : user.email || "";
      setUserName(displayName);
      setIsAdmin(user.role === "admin");
    } else {
      setUserName("");
      setIsAdmin(false);
    }
    
    // Close mobile menu on route change
    setIsMobileMenuOpen(false);
  }, [location, user]);

  const handleLogout = async () => {
    await logout();
    setIsMobileMenuOpen(false);
    navigate("/");
  };

  return (
    <nav className="bg-blue-600 text-white shadow-md relative" role="navigation" aria-label="Main navigation">
      <div className="px-6 py-3 flex justify-between items-center">
        {/* Logo/Brand */}
        <Link to="/" className="text-xl font-bold hover:text-blue-100 transition-colors">
          MDP Donor Portal
        </Link>

        {/* Mobile menu button */}
        <div className="md:hidden">
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="text-white hover:text-blue-200 focus:outline-none"
            aria-label="Toggle mobile menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Desktop Navigation Links */}
        <div className="hidden md:flex items-center space-x-4">
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
              {!isAdmin && (
                <Link to="/donations" className="hover:text-blue-100 transition-colors">
                  My Donations
                </Link>
              )}

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
              <span className="text-sm">Welcome, {userName}</span>
              
              <Link 
                to="/profile" 
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

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden px-4 pt-2 pb-4 space-y-2 bg-blue-700 shadow-inner">
          <Link to="/" className="block py-2 hover:bg-blue-600 rounded px-2">
            Home
          </Link>
          <Link to="/causes" className="block py-2 hover:bg-blue-600 rounded px-2">
            Browse Causes
          </Link>
          
          {isAuthenticated && (
            <>
              <Link to="/donate/multi" className="block py-2 hover:bg-blue-600 rounded px-2">
                Multi-Cause Donate
              </Link>
              {!isAdmin && (
                <Link to="/donations" className="block py-2 hover:bg-blue-600 rounded px-2">
                  My Donations
                </Link>
              )}
              {isAdmin && (
                <Link to="/admin" className="block py-2 hover:bg-purple-600 bg-purple-500 rounded px-2 mt-2">
                  Admin Dashboard
                </Link>
              )}
              <div className="border-t border-blue-500 my-2 pt-2">
                <span className="block py-2 px-2 text-sm text-blue-200">Welcome, {userName}</span>
                <Link to="/profile" className="block py-2 hover:bg-blue-600 rounded px-2">
                  Profile
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full text-left block py-2 hover:bg-red-600 bg-red-500 rounded px-2 mt-2"
                >
                  Logout
                </button>
              </div>
            </>
          )}
          
          {!isAuthenticated && (
            <div className="border-t border-blue-500 my-2 pt-2 flex flex-col gap-2">
              <Link to="/login" className="block py-2 text-center bg-green-500 hover:bg-green-600 rounded px-2">
                Login
              </Link>
              <Link to="/register" className="block py-2 text-center bg-blue-500 hover:bg-blue-600 rounded px-2">
                Register
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
