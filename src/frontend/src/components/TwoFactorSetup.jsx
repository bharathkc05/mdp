import { useState, useEffect } from 'react';
import { API } from '../api';

export default function TwoFactorSetup() {
  const [step, setStep] = useState('initial'); // initial, setup, verify, enabled
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [password, setPassword] = useState('');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    check2FAStatus();
  }, []);

  const check2FAStatus = async () => {
    try {
      const response = await API.get('/2fa/status');
      setTwoFactorEnabled(response.data.data.twoFactorEnabled);
      setStep(response.data.data.twoFactorEnabled ? 'enabled' : 'initial');
    } catch (err) {
      console.error('Error checking 2FA status:', err);
    }
  };

  const handleSetup2FA = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await API.post('/2fa/setup', {});
      
      setQrCode(response.data.data.qrCode);
      setSecret(response.data.data.secret);
      setStep('setup');
      setSuccess('QR code generated! Scan with your authenticator app.');
    } catch (err) {
      setError(err.response?.data?.message || 'Error setting up 2FA');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySetup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await API.post('/2fa/verify-setup', { token: verificationCode });
      
      setBackupCodes(response.data.data.backupCodes);
      setStep('verify');
      setSuccess('2FA enabled successfully! Save your backup codes.');
      setTwoFactorEnabled(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable2FA = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await API.post('/2fa/disable', { password });
      
      setStep('initial');
      setTwoFactorEnabled(false);
      setPassword('');
      setSuccess('2FA has been disabled');
    } catch (err) {
      setError(err.response?.data?.message || 'Error disabling 2FA');
    } finally {
      setLoading(false);
    }
  };

  const downloadBackupCodes = () => {
    const blob = new Blob(
      [backupCodes.join('\n')],
      { type: 'text/plain' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mdp-2fa-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-4">Two-Factor Authentication (2FA)</h2>
      <p className="text-gray-600 mb-6">
        Add an extra layer of security to your admin account
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded" role="alert">
          {success}
        </div>
      )}

      {/* Initial State - 2FA Not Enabled */}
      {step === 'initial' && (
        <div>
          <p className="mb-4 text-gray-700">
            Two-factor authentication is currently <strong>disabled</strong> for your account.
          </p>
          <button
            onClick={handleSetup2FA}
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
          >
            {loading ? 'Setting up...' : 'Enable 2FA'}
          </button>
        </div>
      )}

      {/* Setup Step - Show QR Code */}
      {step === 'setup' && (
        <div>
          <h3 className="text-xl font-semibold mb-4">Step 1: Scan QR Code</h3>
          <p className="mb-4 text-gray-700">
            Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
          </p>
          
          {qrCode && (
            <div className="mb-4 flex justify-center">
              <img src={qrCode} alt="2FA QR Code" className="border-2 border-gray-300 rounded" />
            </div>
          )}

          <div className="mb-4 p-3 bg-gray-100 rounded">
            <p className="text-sm font-semibold mb-1">Manual Entry Code:</p>
            <code className="text-sm break-all">{secret}</code>
          </div>

          <h3 className="text-xl font-semibold mb-4">Step 2: Verify Code</h3>
          <form onSubmit={handleVerifySetup}>
            <div className="mb-4">
              <label htmlFor="verificationCode" className="block text-sm font-medium text-gray-700 mb-2">
                Enter 6-digit code from your app
              </label>
              <input
                type="text"
                id="verificationCode"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="000000"
                maxLength="6"
                pattern="[0-9]{6}"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              type="submit"
              disabled={loading || verificationCode.length !== 6}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors"
            >
              {loading ? 'Verifying...' : 'Verify and Enable 2FA'}
            </button>
          </form>
        </div>
      )}

      {/* Verify Step - Show Backup Codes */}
      {step === 'verify' && (
        <div>
          <h3 className="text-xl font-semibold mb-4 text-green-600">✓ 2FA Enabled Successfully!</h3>
          <p className="mb-4 text-gray-700">
            Save these backup codes in a safe place. Each code can only be used once.
          </p>
          
          <div className="mb-4 p-4 bg-yellow-50 border-2 border-yellow-400 rounded-lg">
            <h4 className="font-semibold mb-2 text-yellow-800">⚠️ Important - Save Backup Codes</h4>
            <div className="grid grid-cols-2 gap-2 font-mono text-sm">
              {backupCodes?.map((code, index) => (
                <div key={index} className="bg-white p-2 rounded border border-gray-300">
                  {code}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={downloadBackupCodes}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Download Backup Codes
            </button>
            <button
              onClick={() => setStep('enabled')}
              className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              I've Saved My Codes
            </button>
          </div>
        </div>
      )}

      {/* Enabled State - 2FA Is Active */}
      {step === 'enabled' && twoFactorEnabled && (
        <div>
          <div className="mb-6 p-4 bg-green-50 border border-green-400 rounded-lg">
            <p className="text-green-800 font-semibold">✓ Two-factor authentication is enabled</p>
            <p className="text-green-700 text-sm mt-1">
              Your account is protected with an additional security layer
            </p>
          </div>

          <h3 className="text-xl font-semibold mb-4">Disable 2FA</h3>
          <p className="mb-4 text-gray-700">
            Enter your password to disable two-factor authentication
          </p>
          
          <form onSubmit={handleDisable2FA}>
            <div className="mb-4">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 transition-colors"
            >
              {loading ? 'Disabling...' : 'Disable 2FA'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
