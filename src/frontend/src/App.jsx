import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Navbar from "./components/Navbar";
import Register from "./pages/Register";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Verify from "./pages/Verify";
import Home from "./pages/Home";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import BrowseCauses from "./pages/BrowseCauses";

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem("token");
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if token exists and is valid
    const token = localStorage.getItem("token");
    if (!token) {
      setIsLoading(false);
      return;
    }

    // You can add token validation logic here if needed
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto p-4">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify" element={<Verify />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/causes" element={<BrowseCauses />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
