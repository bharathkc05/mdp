import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API } from '../api';
import { getMinimumDonation, formatCurrencySync } from '../utils/currencyFormatter';

export default function MultiCauseDonation() {
  const navigate = useNavigate();
  
  // State management
  const [causes, setCauses] = useState([]);
  const [basket, setBasket] = useState([]);
  const [totalAmount, setTotalAmount] = useState('');
  const [allocationType, setAllocationType] = useState('percentage'); // 'percentage' or 'fixed'
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  const [minDonation, setMinDonation] = useState({ amount: 1, enabled: true });
  
  // Fetch active causes on mount
  useEffect(() => {
    fetchCauses();
    
    // Story 2.6: Fetch minimum donation configuration
    const loadConfig = () => {
      getMinimumDonation().then(config => {
        setMinDonation(config);
      }).catch(err => {
        console.error('Failed to fetch minimum donation:', err);
      });
    };

    loadConfig();

    // Listen for config updates
    const handleConfigUpdate = () => {
      loadConfig();
    };

    window.addEventListener('platformConfigUpdated', handleConfigUpdate);
    return () => window.removeEventListener('platformConfigUpdated', handleConfigUpdate);
  }, []);
  
  const fetchCauses = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await API.get('/causes');
      
      if (response.data.success) {
        setCauses(response.data.causes);
      } else {
        setError('Failed to load causes');
      }
    } catch (err) {
      console.error('Error fetching causes:', err);
      setError(err.response?.data?.message || 'Failed to load causes. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Toggle cause in basket (add or remove)
  const toggleBasket = (cause) => {
    const isInBasket = basket.find(item => item._id === cause._id);
    
    if (isInBasket) {
      // Remove from basket
      setBasket(basket.filter(item => item._id !== cause._id));
      setSuccess(`${cause.name} removed from basket`);
      setTimeout(() => setSuccess(''), 2000);
    } else {
      // Add to basket
      setBasket([...basket, {
        ...cause,
        allocation: allocationType === 'percentage' ? 0 : 0,
        percentage: 0,
        amount: 0
      }]);
      setSuccess(`${cause.name} added to basket`);
      setTimeout(() => setSuccess(''), 2000);
    }
    
    setError('');
    setValidationErrors({});
  };
  
  // Remove cause from basket
  const removeFromBasket = (causeId) => {
    setBasket(basket.filter(item => item._id !== causeId));
    setValidationErrors({});
  };
  
  // Update allocation for a cause
  const updateAllocation = (causeId, value) => {
    setBasket(basket.map(item => {
      if (item._id === causeId) {
        if (allocationType === 'percentage') {
          const percentage = parseFloat(value) || 0;
          const amount = totalAmount ? (totalAmount * percentage / 100).toFixed(2) : 0;
          return { ...item, percentage, amount: parseFloat(amount) };
        } else {
          const amount = parseFloat(value) || 0;
          const percentage = totalAmount ? ((amount / totalAmount) * 100).toFixed(2) : 0;
          return { ...item, amount, percentage: parseFloat(percentage) };
        }
      }
      return item;
    }));
    setValidationErrors({});
  };
  
  // Handle total amount change
  const handleTotalAmountChange = (value) => {
    const amount = value;
    setTotalAmount(amount);
    
    // Recalculate amounts based on existing percentages
    if (amount && basket.length > 0) {
      setBasket(basket.map(item => {
        if (allocationType === 'percentage') {
          const newAmount = (amount * item.percentage / 100).toFixed(2);
          return { ...item, amount: parseFloat(newAmount) };
        } else {
          const newPercentage = ((item.amount / amount) * 100).toFixed(2);
          return { ...item, percentage: parseFloat(newPercentage) };
        }
      }));
    }
  };
  
  // Toggle allocation type
  const toggleAllocationType = (type) => {
    setAllocationType(type);
    setValidationErrors({});
  };
  
  // Auto-distribute evenly
  const distributeEvenly = () => {
    if (!basket.length) return;
    
    const evenPercentage = (100 / basket.length).toFixed(2);
    const evenAmount = totalAmount ? (totalAmount / basket.length).toFixed(2) : 0;
    
    setBasket(basket.map((item, index) => {
      // For the last item, adjust to ensure 100% total due to rounding
      if (index === basket.length - 1) {
        const totalSoFar = basket.slice(0, -1).reduce((sum) => sum + parseFloat(evenPercentage), 0);
        const finalPercentage = (100 - totalSoFar).toFixed(2);
        const finalAmount = totalAmount ? (totalAmount * finalPercentage / 100).toFixed(2) : 0;
        return {
          ...item,
          percentage: parseFloat(finalPercentage),
          amount: parseFloat(finalAmount)
        };
      }
      return {
        ...item,
        percentage: parseFloat(evenPercentage),
        amount: parseFloat(evenAmount)
      };
    }));
    setValidationErrors({});
  };

  // Auto-fill last cause with remaining percentage
  const autoFillLastCause = () => {
    if (basket.length < 2) {
      setError('Need at least 2 causes to auto-fill the last one');
      setTimeout(() => setError(''), 3000);
      return;
    }

    const updatedBasket = [...basket];
    const lastIndex = basket.length - 1;
    
    // Calculate total percentage of all causes except the last one
    const totalPercentageExceptLast = basket
      .slice(0, -1)
      .reduce((sum, item) => sum + (parseFloat(item.percentage) || 0), 0);
    
    // Calculate remaining percentage
    const remainingPercentage = 100 - totalPercentageExceptLast;
    
    if (remainingPercentage < 0) {
      setError('Total percentage of other causes exceeds 100%');
      setTimeout(() => setError(''), 3000);
      return;
    }
    
    if (remainingPercentage === 0) {
      setError('No remaining percentage to allocate');
      setTimeout(() => setError(''), 3000);
      return;
    }
    
    // Update last cause with remaining percentage
    updatedBasket[lastIndex] = {
      ...updatedBasket[lastIndex],
      percentage: parseFloat(remainingPercentage.toFixed(2)),
      amount: totalAmount ? parseFloat((totalAmount * remainingPercentage / 100).toFixed(2)) : 0
    };
    
    setBasket(updatedBasket);
    setValidationErrors({});
    setSuccess(`Last cause allocated ${remainingPercentage.toFixed(2)}% automatically!`);
    setTimeout(() => setSuccess(''), 3000);
  };
  
  // Validate allocations
  const validateAllocations = () => {
    const errors = {};
    
    if (!totalAmount || totalAmount <= 0) {
      errors.totalAmount = 'Please enter a total donation amount greater than 0';
    }

    // Story 2.6: Client-side validation for minimum donation
    if (minDonation.enabled && parseFloat(totalAmount) < minDonation.amount) {
      errors.totalAmount = `Total donation amount must be at least ${formatCurrencySync(minDonation.amount)}`;
    }
    
    if (basket.length === 0) {
      errors.basket = 'Please add at least one cause to your donation basket';
    }
    
    // Check if all allocations are set
    const hasEmptyAllocations = basket.some(item => 
      item.amount === 0 || item.amount === null || item.amount === undefined
    );
    
    if (hasEmptyAllocations) {
      errors.allocations = 'All causes must have an allocation greater than 0';
    }
    
    // Calculate totals
    const totalAllocatedAmount = basket.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    const totalPercentage = basket.reduce((sum, item) => sum + (parseFloat(item.percentage) || 0), 0);
    
    // Check if allocations sum to 100% or total amount (with 0.01 tolerance for floating point)
    if (Math.abs(totalPercentage - 100) > 0.1) {
      errors.percentage = `Allocations must sum to 100% (currently ${totalPercentage.toFixed(2)}%)`;
    }
    
    if (Math.abs(totalAllocatedAmount - parseFloat(totalAmount)) > 0.01) {
      errors.amount = `Allocated amounts must equal total amount (currently ₹${totalAllocatedAmount.toFixed(2)} of ₹${parseFloat(totalAmount).toFixed(2)})`;
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // Submit donation
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateAllocations()) {
      return;
    }
    
    setSubmitting(true);
    setError('');
    setSuccess('');
    
    try {
      const donationData = {
        totalAmount: parseFloat(totalAmount),
        causes: basket.map(item => ({
          causeId: item._id,
          amount: parseFloat(item.amount)
        })),
        paymentMethod: 'manual'
      };
      
      const response = await API.post('/donate/multi', donationData);
      
      if (response.data.success) {
        setSuccess(response.data.message || 'Donation successful! Thank you for your contribution.');
        setBasket([]);
        setTotalAmount('');
        setValidationErrors({});
        
        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      }
    } catch (err) {
      console.error('Error processing donation:', err);
      setError(err.response?.data?.message || 'Failed to process donation. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };
  
  const getCategoryLabel = (category) => {
    const labels = {
      education: 'Education',
      healthcare: 'Healthcare',
      environment: 'Environment',
      'disaster-relief': 'Disaster Relief',
      poverty: 'Poverty',
      'animal-welfare': 'Animal Welfare',
      other: 'Other'
    };
    return labels[category] || category;
  };
  
  const totalAllocatedPercentage = basket.reduce((sum, item) => sum + (parseFloat(item.percentage) || 0), 0);
  const totalAllocatedAmount = basket.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <button
          onClick={() => navigate('/causes')}
          className="mb-6 flex items-center text-blue-600 hover:text-blue-700"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Browse Causes
        </button>

        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-8">
            <h1 className="text-3xl font-bold text-white mb-2">
              Multi-Cause Donation
            </h1>
            <p className="text-blue-100">
              Support multiple causes in a single transaction by allocating your donation across different initiatives
            </p>
          </div>
        </div>
        
        {/* Success Message */}
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex">
              <svg className="h-5 w-5 text-green-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="font-medium text-green-800">Success!</p>
                <p className="text-green-700">{success}</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <svg className="h-5 w-5 text-red-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="font-medium text-red-800">Error</p>
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Available Causes */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg p-6" aria-label="Available causes">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                Available Causes
              </h2>
              
              {loading && (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" aria-hidden="true"></div>
                  <span className="sr-only">Loading causes...</span>
                </div>
              )}
              
              {!loading && causes.length === 0 && (
                <p className="text-gray-600 text-center py-8">No active causes available</p>
              )}
              
              {!loading && causes.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {causes.map((cause) => {
                    const isInBasket = basket.some(item => item._id === cause._id);
                    const progress = cause.targetAmount > 0 
                      ? Math.min((cause.currentAmount / cause.targetAmount) * 100, 100)
                      : 0;
                    
                    const categoryColors = {
                      education: 'bg-blue-100 text-blue-800',
                      healthcare: 'bg-red-100 text-red-800',
                      environment: 'bg-green-100 text-green-800',
                      poverty: 'bg-yellow-100 text-yellow-800',
                      'disaster-relief': 'bg-orange-100 text-orange-800',
                      other: 'bg-gray-100 text-gray-800'
                    };
                    
                    return (
                      <div
                        key={cause._id}
                        className={`border-2 rounded-lg p-4 transition-all ${
                          isInBasket 
                            ? 'border-green-500 bg-green-50 shadow-md' 
                            : 'border-gray-200 bg-white hover:border-blue-300'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="font-semibold text-gray-900 flex-1 text-lg">
                            {cause.name}
                          </h3>
                          <span className={`ml-2 px-3 py-1 rounded-full text-xs font-semibold ${
                            categoryColors[cause.category] || categoryColors.other
                          }`}>
                            {getCategoryLabel(cause.category)}
                          </span>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                          {cause.description}
                        </p>
                        
                        <div className="mb-4">
                          <div className="flex justify-between text-sm mb-2">
                            <span className="text-gray-600 font-medium">Progress</span>
                            <span className="font-semibold text-gray-900">{progress.toFixed(0)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div 
                              className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-300"
                              style={{ width: `${progress}%` }}
                              role="progressbar"
                              aria-valuenow={progress}
                              aria-valuemin="0"
                              aria-valuemax="100"
                            ></div>
                          </div>
                          <div className="flex justify-between mt-2">
                            <p className="text-xs text-gray-600">
                              <span className="font-semibold text-blue-900">{formatCurrencySync(cause.currentAmount || 0)}</span> raised
                            </p>
                            <p className="text-xs text-gray-600">
                              of <span className="font-semibold text-purple-900">{formatCurrencySync(cause.targetAmount || 0)}</span>
                            </p>
                          </div>
                        </div>
                        
                        <button
                          onClick={() => toggleBasket(cause)}
                          className={`w-full py-2.5 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center ${
                            isInBasket
                              ? 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500'
                              : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                          }`}
                          aria-label={isInBasket ? `Remove ${cause.name} from basket` : `Add ${cause.name} to basket`}
                        >
                          {isInBasket ? (
                            <>
                              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              Remove from Basket
                            </>
                          ) : (
                            <>
                              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                              </svg>
                              Add to Basket
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          
          {/* Donation Basket */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-6 sticky top-4" aria-label="Donation basket">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 -m-6 mb-6 p-6 rounded-t-lg">
                <h2 className="text-2xl font-semibold text-white flex items-center">
                  <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Donation Basket
                </h2>
                <p className="text-blue-100 text-sm mt-1">{basket.length} cause{basket.length !== 1 ? 's' : ''} selected</p>
              </div>
              
              {/* Total Amount Input */}
              <div className="mb-6">
                <label 
                  htmlFor="total-amount" 
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  Total Donation Amount *
                </label>
                <input
                  id="total-amount"
                  type="number"
                  min={minDonation.enabled ? minDonation.amount : 0.01}
                  step="0.01"
                  value={totalAmount}
                  onChange={(e) => handleTotalAmountChange(e.target.value)}
                  className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg ${
                    validationErrors.totalAmount ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder={minDonation.enabled ? `Min: ${formatCurrencySync(minDonation.amount)}` : "Enter total amount"}
                  aria-required="true"
                  aria-invalid={!!validationErrors.totalAmount}
                  aria-describedby={validationErrors.totalAmount ? "total-amount-error" : undefined}
                />
                {minDonation.enabled && !validationErrors.totalAmount && (
                  <p className="mt-1 text-sm text-gray-500">
                    Minimum donation: {formatCurrencySync(minDonation.amount)}
                  </p>
                )}
                {validationErrors.totalAmount && (
                  <p id="total-amount-error" className="mt-2 text-sm text-red-600 flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {validationErrors.totalAmount}
                  </p>
                )}
              </div>
              
              {/* Allocation Type Toggle */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Allocation Method
                </label>
                <div className="flex rounded-lg shadow-sm border-2 border-gray-300 overflow-hidden" role="group" aria-label="Allocation method">
                  <button
                    type="button"
                    onClick={() => toggleAllocationType('percentage')}
                    className={`flex-1 px-4 py-3 text-sm font-semibold transition-all ${
                      allocationType === 'percentage'
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                    aria-pressed={allocationType === 'percentage'}
                  >
                    <div className="flex items-center justify-center">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      Percentage
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleAllocationType('fixed')}
                    className={`flex-1 px-4 py-3 text-sm font-semibold transition-all ${
                      allocationType === 'fixed'
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                    aria-pressed={allocationType === 'fixed'}
                  >
                    <div className="flex items-center justify-center">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Fixed Amount
                    </div>
                  </button>
                </div>
              </div>
              
              {/* Auto Distribute Buttons */}
              {basket.length > 0 && totalAmount > 0 && (
                <div className="mb-6 space-y-3">
                  <button
                    type="button"
                    onClick={distributeEvenly}
                    className="w-full px-4 py-3 bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 text-sm font-semibold rounded-lg hover:from-purple-200 hover:to-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all flex items-center justify-center"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                    Distribute Evenly
                  </button>
                  
                  {basket.length >= 2 && (
                    <button
                      type="button"
                      onClick={autoFillLastCause}
                      className="w-full px-4 py-3 bg-gradient-to-r from-green-100 to-teal-100 text-green-700 text-sm font-semibold rounded-lg hover:from-green-200 hover:to-teal-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all flex items-center justify-center"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Auto-Fill Last Cause
                    </button>
                  )}
                </div>
              )}
              
              {/* Basket Items */}
              <div className="mb-6">
                {basket.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <svg 
                      className="mx-auto h-16 w-16 text-gray-400 mb-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" 
                      />
                    </svg>
                    <p className="text-gray-600 font-medium">Your basket is empty</p>
                    <p className="text-gray-500 text-sm mt-2">Add causes to start allocating your donation</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {basket.map((item) => (
                      <div key={item._id} className="border-2 border-gray-200 rounded-lg p-4 bg-gradient-to-br from-white to-gray-50 hover:border-blue-300 transition-all">
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="text-sm font-semibold text-gray-900 flex-1 pr-2">
                            {item.name}
                          </h3>
                          <button
                            onClick={() => removeFromBasket(item._id)}
                            className="text-red-600 hover:text-red-800 hover:bg-red-50 p-1 rounded transition-all focus:outline-none focus:ring-2 focus:ring-red-500"
                            aria-label={`Remove ${item.name} from basket`}
                          >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        
                        <div className="space-y-3">
                          <div>
                            <label 
                              htmlFor={`allocation-${item._id}`}
                              className="block text-xs font-semibold text-gray-700 mb-2"
                            >
                              {allocationType === 'percentage' ? 'Percentage (%)' : `Amount (${formatCurrencySync(0).replace(/[0-9.,]/g, '').trim()})`}
                            </label>
                            <input
                              id={`allocation-${item._id}`}
                              type="number"
                              min="0"
                              step={allocationType === 'percentage' ? '0.1' : '0.01'}
                              max={allocationType === 'percentage' ? '100' : totalAmount}
                              value={allocationType === 'percentage' ? item.percentage : item.amount}
                              onChange={(e) => updateAllocation(item._id, e.target.value)}
                              className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              aria-label={`Allocate ${allocationType === 'percentage' ? 'percentage' : 'amount'} for ${item.name}`}
                            />
                          </div>
                          
                          <div className="flex justify-between p-2 bg-blue-50 rounded-md">
                            <span className="text-xs font-semibold text-blue-900">{item.percentage.toFixed(2)}%</span>
                            <span className="text-xs font-semibold text-blue-900">{formatCurrencySync(item.amount)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {validationErrors.basket && (
                  <p className="mt-2 text-sm text-red-600">
                    {validationErrors.basket}
                  </p>
                )}
                
                {validationErrors.allocations && (
                  <p className="mt-2 text-sm text-red-600">
                    {validationErrors.allocations}
                  </p>
                )}
              </div>
              
              {/* Validation Summary */}
              {basket.length > 0 && (
                <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border-2 border-blue-200">
                  <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    Summary
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between p-2 bg-white rounded">
                      <span className="text-gray-600 font-medium">Causes:</span>
                      <span className="font-bold text-gray-900">{basket.length}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-white rounded">
                      <span className="text-gray-600 font-medium">Total Percentage:</span>
                      <span className={`font-bold ${Math.abs(totalAllocatedPercentage - 100) > 0.1 ? 'text-red-600' : 'text-green-600'}`}>
                        {totalAllocatedPercentage.toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex justify-between p-2 bg-white rounded">
                      <span className="text-gray-600 font-medium">Total Amount:</span>
                      <span className={`font-bold ${Math.abs(totalAllocatedAmount - (parseFloat(totalAmount) || 0)) > 0.01 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatCurrencySync(totalAllocatedAmount)}
                      </span>
                    </div>
                  </div>
                  
                  {validationErrors.percentage && (
                    <p className="mt-3 text-xs text-red-600 flex items-center bg-red-50 p-2 rounded">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {validationErrors.percentage}
                    </p>
                  )}
                  
                  {validationErrors.amount && (
                    <p className="mt-3 text-xs text-red-600 flex items-center bg-red-50 p-2 rounded">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {validationErrors.amount}
                    </p>
                  )}
                </div>
              )}
              
              {/* Submit Button */}
              <button
                onClick={handleSubmit}
                disabled={submitting || basket.length === 0 || !totalAmount}
                className={`w-full py-4 px-6 rounded-lg text-white font-bold text-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all flex items-center justify-center ${
                  submitting || basket.length === 0 || !totalAmount
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl'
                }`}
              >
                {submitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-6 w-6 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>
                    <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Donate {formatCurrencySync(parseFloat(totalAmount) || 0)}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
