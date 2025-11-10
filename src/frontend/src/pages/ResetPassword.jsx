import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { API } from "../api";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    password: "",
    confirmPassword: "",
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const token = searchParams.get("token");

  useEffect(() => {
    if (!token) {
      setMessage("Invalid reset link. Please request a new one.");
    }
  }, [token]);

  const validate = () => {
    const errors = {};
    
    if (!form.password) {
      errors.password = "Password is required";
    } else if (form.password.length < 8) {
      errors.password = "Password must be at least 8 characters";
    }
    
    if (!form.confirmPassword) {
      errors.confirmPassword = "Please confirm your password";
    } else if (form.password !== form.confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }
    
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    
    if (!token) {
      setMessage("Invalid reset link. Please request a new one.");
      return;
    }

    if (!validate()) {
      return;
    }

    setLoading(true);
    try {
      const { data } = await API.post("/auth/reset-password", {
        token,
        newPassword: form.password,
      });
      setMessage(data.message);
      // Redirect to login after successful reset
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="p-8">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Set New Password</h1>
            <p className="mt-2 text-gray-600">
              Enter your new password below
            </p>
          </div>

          {!token ? (
            <div className="text-center">
              <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4" role="alert">
                <p className="text-red-600">{message}</p>
              </div>
              <a 
                href="/forgot-password" 
                className="text-indigo-600 hover:text-indigo-800 font-medium underline focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                Request new reset link
              </a>
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-4" noValidate aria-labelledby="reset-password-heading">
                <h2 id="reset-password-heading" className="sr-only">Reset Password Form</h2>
                
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    New Password <span className="text-red-600" aria-label="required">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="New Password"
                      className={`w-full border rounded-md px-3 py-2 pr-10 ${fieldErrors.password ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      value={form.password}
                      onChange={(e) =>
                        setForm({ ...form, password: e.target.value })
                      }
                      aria-required="true"
                      aria-invalid={!!fieldErrors.password}
                      aria-describedby={fieldErrors.password ? "password-error" : "password-hint"}
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
                  {!fieldErrors.password && (
                    <p id="password-hint" className="text-gray-500 text-xs mt-1">
                      Must be at least 8 characters
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm New Password <span className="text-red-600" aria-label="required">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm New Password"
                      className={`w-full border rounded-md px-3 py-2 pr-10 ${fieldErrors.confirmPassword ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      value={form.confirmPassword}
                      onChange={(e) =>
                        setForm({ ...form, confirmPassword: e.target.value })
                      }
                      aria-required="true"
                      aria-invalid={!!fieldErrors.confirmPassword}
                      aria-describedby={fieldErrors.confirmPassword ? "confirmPassword-error" : undefined}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                    >
                      {showConfirmPassword ? (
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
                  {fieldErrors.confirmPassword && (
                    <p id="confirmPassword-error" className="text-red-600 text-sm mt-1" role="alert">
                      {fieldErrors.confirmPassword}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 text-white py-2 rounded-md font-semibold hover:bg-indigo-700 transition focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-busy={loading}
                >
                  {loading ? "Resetting..." : "Reset Password"}
                </button>
              </form>

              {message && (
                <div className={`mt-4 p-3 rounded-md ${message.includes("success") ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`} role="alert">
                  <p className={`text-center text-sm ${message.includes("success") ? 'text-green-600' : 'text-red-600'}`}>
                    {message}
                  </p>
                </div>
              )}
            </>
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