import { useState } from "react";
import { API } from "../api";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [message, setMessage] = useState("");
  const [resendStatus, setResendStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const validate = () => {
    const errors = {};
    
    if (!form.email) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errors.email = "Please enter a valid email address";
    }
    if (!form.password) {
      errors.password = "Password is required";
    }
    
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleResendVerification = async () => {
    if (!form.email) {
      setResendStatus("Please enter your email first");
      return;
    }
    
    setLoading(true);
    try {
      const { data } = await API.post("/auth/resend-verification", { email: form.email });
      setResendStatus(data.message);
      if (data.previewUrl) {
        window.open(data.previewUrl, '_blank');
      }
    } catch (err) {
      setResendStatus(err.response?.data?.message || "Failed to resend verification email");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setFieldErrors({});
    
    if (!validate()) {
      return;
    }
    
    setLoading(true);
    try {
      const { data } = await API.post("/auth/login", form);
      localStorage.setItem("token", data.token);
      localStorage.setItem("email", form.email);
      setMessage('Successfully logged in');
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err) {
      setMessage(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="p-8">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Welcome Back</h1>
            <p className="mt-2 text-gray-600">Sign in to your MDP account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate aria-labelledby="login-heading">
            <h2 id="login-heading" className="sr-only">Login Form</h2>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email <span className="text-red-600" aria-label="required">*</span>
              </label>
              <input
                id="email"
                type="email"
                placeholder="Enter your email"
                className={`w-full border rounded-md px-3 py-2 ${fieldErrors.email ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                aria-required="true"
                aria-invalid={!!fieldErrors.email}
                aria-describedby={fieldErrors.email ? "email-error" : undefined}
              />
              {fieldErrors.email && (
                <p id="email-error" className="text-red-600 text-sm mt-1" role="alert">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password <span className="text-red-600" aria-label="required">*</span>
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  className={`w-full border rounded-md px-3 py-2 pr-10 ${fieldErrors.password ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  aria-required="true"
                  aria-invalid={!!fieldErrors.password}
                  aria-describedby={fieldErrors.password ? "password-error" : undefined}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {fieldErrors.password && (
                <p id="password-error" className="text-red-600 text-sm mt-1" role="alert">
                  {fieldErrors.password}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <a
                href="/forgot-password"
                className="text-sm text-blue-600 hover:text-blue-800 underline focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Forgot Password?
              </a>
            </div>
            
            <button 
              type="submit" 
              className="w-full bg-indigo-600 text-white py-2 rounded-md font-semibold hover:bg-indigo-700 transition focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
              aria-busy={loading}
            >
              {loading ? 'Signing in...' : 'Login'}
            </button>
          </form>

          {message && (
            <div className={`mt-4 p-3 rounded-md ${message.includes('Successfully') ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`} role="alert">
              <p className={`text-center text-sm ${message.includes('Successfully') ? 'text-green-600' : 'text-red-600'}`}>
                {message}
              </p>
            </div>
          )}
          
          {/* Resend verification button */}
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={handleResendVerification}
              disabled={loading}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium underline focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? "Sending..." : "Resend verification email"}
            </button>
            {resendStatus && (
              <div className="mt-2 p-2 bg-gray-50 rounded-md" role="status">
                <p className="text-sm text-gray-600">{resendStatus}</p>
              </div>
            )}
          </div>

          <p className="mt-6 text-center text-sm text-gray-600">
            Don't have an account?{" "}
            <a href="/register" className="text-indigo-600 hover:text-indigo-800 font-medium underline focus:outline-none focus:ring-2 focus:ring-indigo-500">
              Sign up
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
