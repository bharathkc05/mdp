import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { authAPI } from '../api';

export default function Verify() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState('Verifying...');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorDetails, setErrorDetails] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      setStatus('No verification token provided');
      setIsLoading(false);
      setErrorDetails('Please use the verification link from your email.');
      return;
    }

    (async () => {
      try {
        console.log('Verifying token:', token);
        const { data } = await authAPI.verify(token);
        console.log('Verification successful:', data);
        setStatus(data.message || 'Email verified successfully! Redirecting to login...');
        setIsSuccess(true);
        setIsLoading(false);
        setTimeout(() => navigate('/login'), 3000);
      } catch (err) {
        console.error('Verification error:', err);
        setIsLoading(false);
        setIsSuccess(false);
        
        if (err.response) {
          setStatus(err.response.data?.message || 'Verification failed');
          setErrorDetails(err.response.data?.error || `Server responded with status ${err.response.status}`);
        } else if (err.request) {
          setStatus('Cannot connect to server');
          setErrorDetails('Please make sure the backend server is running on http://localhost:3000');
        } else {
          setStatus('Verification failed');
          setErrorDetails(err.message || 'Unknown error occurred');
        }
      }
    })();
  }, [token, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 p-6">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-lg w-full">
        <div className="text-center">
          {isLoading ? (
            <>
              <div className="flex justify-center mb-4">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
              </div>
              <h2 className="text-2xl font-bold mb-4 text-gray-900">Verifying Email</h2>
              <p className="text-gray-600">{status}</p>
            </>
          ) : isSuccess ? (
            <>
              <div className="flex justify-center mb-4">
                <svg className="h-16 w-16 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold mb-4 text-green-700">Success!</h2>
              <p className="text-gray-700">{status}</p>
            </>
          ) : (
            <>
              <div className="flex justify-center mb-4">
                <svg className="h-16 w-16 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold mb-4 text-red-700">Verification Failed</h2>
              <p className="text-gray-700 mb-2">{status}</p>
              {errorDetails && (
                <p className="text-sm text-gray-500 mb-4">{errorDetails}</p>
              )}
              <div className="mt-6 space-y-3">
                <a 
                  href="/login" 
                  className="block w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition"
                >
                  Go to Login
                </a>
                <a 
                  href="/register" 
                  className="block w-full bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300 transition"
                >
                  Register Again
                </a>
              </div>
            </>
          )}
        </div>

        {token && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center break-all">
              Token: {token.substring(0, 50)}...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
