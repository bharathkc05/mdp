import { useState } from "react";
import { API } from "../api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [fieldError, setFieldError] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");

  const validate = () => {
    if (!email) {
      setFieldError("Email is required");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFieldError("Please enter a valid email address");
      return false;
    }
    setFieldError("");
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setPreviewUrl("");
    
    if (!validate()) {
      return;
    }

    setLoading(true);
    try {
      const { data } = await API.post("/auth/forgot-password", { email });
      setMessage(data.message);
      if (data.previewUrl) {
        setPreviewUrl(data.previewUrl);
      }
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to send reset instructions");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="p-8">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Reset Password</h1>
            <p className="mt-2 text-gray-600">
              Enter your email address and we'll send you instructions to reset your password.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate aria-labelledby="forgot-password-heading">
            <h2 id="forgot-password-heading" className="sr-only">Forgot Password Form</h2>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email <span className="text-red-600" aria-label="required">*</span>
              </label>
              <input
                id="email"
                type="email"
                placeholder="Enter your email"
                className={`w-full border rounded-md px-3 py-2 ${fieldError ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-required="true"
                aria-invalid={!!fieldError}
                aria-describedby={fieldError ? "email-error" : "email-hint"}
              />
              {fieldError && (
                <p id="email-error" className="text-red-600 text-sm mt-1" role="alert">
                  {fieldError}
                </p>
              )}
              {!fieldError && (
                <p id="email-hint" className="text-gray-500 text-xs mt-1">
                  We'll send password reset instructions to this email
                </p>
              )}
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-2 rounded-md font-semibold hover:bg-indigo-700 transition focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-busy={loading}
            >
              {loading ? "Sending..." : "Send Reset Instructions"}
            </button>
          </form>

          {message && (
            <div className={`mt-4 p-3 rounded-md ${message.includes("sent") || message.includes("success") ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`} role="alert">
              <p className={`text-center text-sm ${message.includes("sent") || message.includes("success") ? 'text-green-600' : 'text-red-600'}`}>
                {message}
              </p>
              {previewUrl && (
                <div className="mt-3 text-center">
                  <a 
                    href={previewUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 underline font-medium"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Open Email Preview (Ethereal Mail)
                  </a>
                  <p className="text-xs text-gray-500 mt-1">Click to view the reset email in your browser</p>
                </div>
              )}
            </div>
          )}

          <p className="mt-6 text-center text-sm text-gray-600">
            Remember your password?{" "}
            <a href="/login" className="text-indigo-600 hover:text-indigo-800 font-medium underline focus:outline-none focus:ring-2 focus:ring-indigo-500">
              Login here
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}