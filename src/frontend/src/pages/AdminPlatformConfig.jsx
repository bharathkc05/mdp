/**
 * Story 2.6: Platform Configuration Management
 * Admin page to configure minimum donation and currency settings
 */

import { useState, useEffect } from 'react';
import { configAPI } from '../api';
import { formatCurrencySync, invalidateConfigCache, updateConfigCache } from '../utils/currencyFormatter';

export default function AdminPlatformConfig() {
  const [config, setConfig] = useState(null);
  const [presets, setPresets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  const [formData, setFormData] = useState({
    minimumDonation: {
      amount: 1,
      enabled: true
    },
    currency: {
      code: 'USD',
      symbol: '$',
      position: 'before',
      decimalPlaces: 2,
      thousandsSeparator: ',',
      decimalSeparator: '.'
    }
  });

  useEffect(() => {
    fetchConfig();
    fetchPresets();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await configAPI.getConfig();
      if (response.data.success) {
        const configData = response.data.data;
        setConfig(configData);
        setFormData(configData);
      }
    } catch (error) {
      console.error('Error fetching config:', error);
      setMessage({
        type: 'error',
        text: 'Failed to load configuration'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPresets = async () => {
    try {
      const response = await configAPI.getCurrencyPresets();
      if (response.data.success) {
        setPresets(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching presets:', error);
    }
  };

  const handlePresetSelect = (preset) => {
    setFormData({
      ...formData,
      currency: {
        code: preset.code,
        symbol: preset.symbol,
        position: preset.position,
        decimalPlaces: preset.decimalPlaces,
        thousandsSeparator: preset.thousandsSeparator,
        decimalSeparator: preset.decimalSeparator
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await configAPI.updateConfig(formData);
      if (response.data.success) {
        setConfig(response.data.data);
        
        // OPTIMIZED: Instantly update cache and notify all components
        // This propagates changes immediately without components needing to re-fetch
        updateConfigCache(response.data.data);
        
        setMessage({
          type: 'success',
          text: 'Platform configuration updated successfully! Changes applied instantly across all pages.'
        });
      }
    } catch (error) {
      console.error('Error updating config:', error);
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Failed to update configuration'
      });
    } finally {
      setSaving(false);
    }
  };

  const formatPreview = () => {
    const amount = 1234.56;
    const { symbol, position, decimalPlaces, thousandsSeparator, decimalSeparator } = formData.currency;
    
    const fixed = amount.toFixed(decimalPlaces);
    const [intPart, decPart] = fixed.split('.');
    const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSeparator);
    const formattedNumber = decimalPlaces > 0 && decPart 
      ? `${formattedInt}${decimalSeparator}${decPart}`
      : formattedInt;
    
    return position === 'after' 
      ? `${formattedNumber}${symbol}`
      : `${symbol}${formattedNumber}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading configuration...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Platform Configuration</h1>
        <p className="text-gray-600 mt-2">Configure minimum donation and currency formatting settings</p>
      </div>

      {message.text && (
        <div
          className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-100 text-green-800 border border-green-200' 
              : 'bg-red-100 text-red-800 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Minimum Donation Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Minimum Donation Settings</h2>
          
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="minDonationEnabled"
                checked={formData.minimumDonation.enabled}
                onChange={(e) => setFormData({
                  ...formData,
                  minimumDonation: {
                    ...formData.minimumDonation,
                    enabled: e.target.checked
                  }
                })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="minDonationEnabled" className="ml-2 block text-sm text-gray-700">
                Enable minimum donation requirement
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum Donation Amount
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={formData.minimumDonation.amount}
                onChange={(e) => setFormData({
                  ...formData,
                  minimumDonation: {
                    ...formData.minimumDonation,
                    amount: parseFloat(e.target.value) || 0.01
                  }
                })}
                disabled={!formData.minimumDonation.enabled}
                className="mt-1 block w-full md:w-1/2 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                required={formData.minimumDonation.enabled}
              />
              <p className="mt-1 text-sm text-gray-500">
                Users must donate at least this amount
              </p>
            </div>
          </div>
        </div>

        {/* Currency Configuration Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Currency Settings</h2>

          {/* Currency Presets */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quick Presets
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {presets.map((preset) => (
                <button
                  key={preset.code}
                  type="button"
                  onClick={() => handlePresetSelect(preset)}
                  className={`p-2 border rounded-md text-sm font-medium transition-colors ${
                    formData.currency.code === preset.code
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {preset.symbol} {preset.code}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Currency Code
                </label>
                <select
                  value={formData.currency.code}
                  onChange={(e) => setFormData({
                    ...formData,
                    currency: { ...formData.currency, code: e.target.value }
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="INR">INR</option>
                  <option value="CAD">CAD</option>
                  <option value="AUD">AUD</option>
                  <option value="JPY">JPY</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Currency Symbol
                </label>
                <input
                  type="text"
                  value={formData.currency.symbol}
                  onChange={(e) => setFormData({
                    ...formData,
                    currency: { ...formData.currency, symbol: e.target.value }
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="$"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Symbol Position
                </label>
                <select
                  value={formData.currency.position}
                  onChange={(e) => setFormData({
                    ...formData,
                    currency: { ...formData.currency, position: e.target.value }
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="before">Before amount ($100)</option>
                  <option value="after">After amount (100$)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Decimal Places
                </label>
                <input
                  type="number"
                  min="0"
                  max="4"
                  value={formData.currency.decimalPlaces}
                  onChange={(e) => setFormData({
                    ...formData,
                    currency: { ...formData.currency, decimalPlaces: parseInt(e.target.value) || 0 }
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Thousands Separator
                </label>
                <input
                  type="text"
                  maxLength="1"
                  value={formData.currency.thousandsSeparator}
                  onChange={(e) => setFormData({
                    ...formData,
                    currency: { ...formData.currency, thousandsSeparator: e.target.value }
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder=","
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Decimal Separator
                </label>
                <input
                  type="text"
                  maxLength="1"
                  value={formData.currency.decimalSeparator}
                  onChange={(e) => setFormData({
                    ...formData,
                    currency: { ...formData.currency, decimalSeparator: e.target.value }
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="."
                  required
                />
              </div>
            </div>

            {/* Format Preview */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Preview</h3>
              <p className="text-2xl font-semibold text-gray-900">
                {formatPreview()}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Example: 1,234.56 formatted with your settings
              </p>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className={`px-6 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              saving ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </form>
    </div>
  );
}
