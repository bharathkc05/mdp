import { useState } from "react";
import { authAPI } from "../api";
import { useNavigate } from "react-router-dom";

export default function Register() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    age: "",
    gender: "",
    email: "",
    password: "",
    confirmPassword: ""
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [verificationToken, setVerificationToken] = useState("");
  const [verificationLink, setVerificationLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();

  const validate = () => {
    const errors = {};
    
    if (!form.firstName || form.firstName.trim().length === 0) {
      errors.firstName = "First name is required";
    }
    if (!form.lastName || form.lastName.trim().length === 0) {
      errors.lastName = "Last name is required";
    }
    if (!form.age || isNaN(form.age) || Number(form.age) < 13) {
      errors.age = "You must be at least 13 years old";
    }
    if (!form.gender) {
      errors.gender = "Please select your gender";
    }
    if (!form.email) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errors.email = "Please enter a valid email address";
    }
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
    setError("");
    setSuccess("");
    setFieldErrors({});
    
    if (!validate()) {
      return;
    }

    setLoading(true);
    try {
      const payload = {
        firstName: form.firstName,
        lastName: form.lastName,
        age: Number(form.age),
        gender: form.gender,
        email: form.email,
        password: form.password,
        confirmPassword: form.confirmPassword
      };
      const { data } = await authAPI.register(payload);
      let message = data.message || "Registration successful! Please check your email to verify your account.";
      if (data.previewUrl) {
        setPreviewUrl(data.previewUrl);
        message += `\n\nPreview available.`;
      }
      if (data.verificationToken) {
        setVerificationToken(data.verificationToken);
      }
      if (data.verificationLink) {
        setVerificationLink(data.verificationLink);
      }
      setSuccess(message);
      // Increase delay to 10 seconds to give user time to read and copy the verification link
      setTimeout(() => navigate('/login'), 10000);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="md:flex">
          <div className="md:w-1/2 p-8 bg-gradient-to-b from-blue-600 to-indigo-700 text-white">
            <h1 className="text-3xl font-bold">Create your account</h1>
            <p className="mt-3 text-blue-100">Join MDP and start supporting causes you care about. Quick, secure and community-driven.</p>
            <div className="mt-6 space-y-2 text-sm text-blue-100">
              <p>• Secure password with hashing</p>
              <p>• Email verification required to login</p>
              <p>• Track your donations & impact</p>
            </div>
          </div>
          <div className="md:w-1/2 p-8">
            <form onSubmit={handleSubmit} className="space-y-4" noValidate aria-labelledby="register-heading">
              <h2 id="register-heading" className="sr-only">Registration Form</h2>
              
              <div className="flex gap-3">
                <div className="flex-1">
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                    First name <span className="text-red-600" aria-label="required">*</span>
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    className={`w-full border rounded-md px-3 py-2 ${fieldErrors.firstName ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    placeholder="First name"
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    aria-required="true"
                    aria-invalid={!!fieldErrors.firstName}
                    aria-describedby={fieldErrors.firstName ? "firstName-error" : undefined}
                  />
                  {fieldErrors.firstName && (
                    <p id="firstName-error" className="text-red-600 text-sm mt-1" role="alert">
                      {fieldErrors.firstName}
                    </p>
                  )}
                </div>
                <div className="flex-1">
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                    Last name <span className="text-red-600" aria-label="required">*</span>
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    className={`w-full border rounded-md px-3 py-2 ${fieldErrors.lastName ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    placeholder="Last name"
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    aria-required="true"
                    aria-invalid={!!fieldErrors.lastName}
                    aria-describedby={fieldErrors.lastName ? "lastName-error" : undefined}
                  />
                  {fieldErrors.lastName && (
                    <p id="lastName-error" className="text-red-600 text-sm mt-1" role="alert">
                      {fieldErrors.lastName}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-1/3">
                  <label htmlFor="age" className="block text-sm font-medium text-gray-700 mb-1">
                    Age <span className="text-red-600" aria-label="required">*</span>
                  </label>
                  <input
                    id="age"
                    type="number"
                    min="13"
                    className={`w-full border rounded-md px-3 py-2 ${fieldErrors.age ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    placeholder="Age"
                    value={form.age}
                    onChange={(e) => setForm({ ...form, age: e.target.value })}
                    aria-required="true"
                    aria-invalid={!!fieldErrors.age}
                    aria-describedby={fieldErrors.age ? "age-error" : undefined}
                  />
                  {fieldErrors.age && (
                    <p id="age-error" className="text-red-600 text-sm mt-1" role="alert">
                      {fieldErrors.age}
                    </p>
                  )}
                </div>
                <div className="flex-1">
                  <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">
                    Gender <span className="text-red-600" aria-label="required">*</span>
                  </label>
                  <select
                    id="gender"
                    className={`w-full border rounded-md px-3 py-2 ${fieldErrors.gender ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    value={form.gender}
                    onChange={(e) => setForm({ ...form, gender: e.target.value })}
                    aria-required="true"
                    aria-invalid={!!fieldErrors.gender}
                    aria-describedby={fieldErrors.gender ? "gender-error" : undefined}
                  >
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                  {fieldErrors.gender && (
                    <p id="gender-error" className="text-red-600 text-sm mt-1" role="alert">
                      {fieldErrors.gender}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-600" aria-label="required">*</span>
                </label>
                <input
                  id="email"
                  type="email"
                  className={`w-full border rounded-md px-3 py-2 ${fieldErrors.email ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="Email"
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
                    className={`w-full border rounded-md px-3 py-2 pr-10 ${fieldErrors.password ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    placeholder="Password (min 8 chars)"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
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
                  Confirm password <span className="text-red-600" aria-label="required">*</span>
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    className={`w-full border rounded-md px-3 py-2 pr-10 ${fieldErrors.confirmPassword ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    placeholder="Confirm password"
                    value={form.confirmPassword}
                    onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
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
                className="w-full py-2 rounded-md bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
                aria-busy={loading}
              >
                {loading ? 'Creating account...' : 'Create account'}
              </button>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3" role="alert">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}
              {success && (
                <div className="bg-green-50 border border-green-200 rounded-md p-3" role="alert">
                  <p className="text-green-600 text-sm break-words">{success}</p>
                  {previewUrl && (
                    <p className="mt-2 text-sm">Preview email: <a href={previewUrl} target="_blank" rel="noreferrer" className="text-indigo-600 underline hover:text-indigo-800">Open preview</a></p>
                  )}
                  {verificationLink && (
                    <p className="mt-2 text-sm">Verification link: <a href={verificationLink} target="_blank" rel="noreferrer" className="text-indigo-600 underline hover:text-indigo-800">Open verify page</a></p>
                  )}
                  {verificationToken && (
                    <div className="mt-2">
                      <p className="text-sm">Verification token (use if link fails):</p>
                      <div className="flex items-center gap-2 mt-1">
                        <pre className="bg-gray-100 p-2 rounded break-words flex-1 text-xs">{verificationToken}</pre>
                        <button
                          type="button"
                          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          onClick={() => { navigator.clipboard?.writeText(verificationToken); }}
                          aria-label="Copy verification token"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </form>
            <p className="mt-4 text-sm text-gray-500">
              Already have an account? <a href="/login" className="text-indigo-600 hover:text-indigo-800 underline focus:outline-none focus:ring-2 focus:ring-indigo-500">Sign in</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
