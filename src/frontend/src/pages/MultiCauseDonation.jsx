import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API } from '../api';

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
  
  // Fetch active causes on mount
  useEffect(() => {
    fetchCauses();
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
  
  // Add cause to basket
  const addToBasket = (cause) => {
    if (basket.find(item => item._id === cause._id)) {
      setError('This cause is already in your donation basket');
      setTimeout(() => setError(''), 3000);
      return;
    }
    
    setBasket([...basket, {
      ...cause,
      allocation: allocationType === 'percentage' ? 0 : 0,
      percentage: 0,
      amount: 0
    }]);
    setError('');
    setSuccess('');
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
  
  // Validate allocations
  const validateAllocations = () => {
    const errors = {};
    
    if (!totalAmount || totalAmount <= 0) {
      errors.totalAmount = 'Please enter a total donation amount greater than 0';
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
  
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
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
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Multi-Cause Donation
          </h1>
          <p className="text-gray-600">
            Support multiple causes in a single transaction by allocating your donation across different initiatives
          </p>
        </header>
        
        {/* Success Message */}
        {success && (
          <div 
            className="mb-6 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-md"
            role="alert"
            aria-live="assertive"
          >
            <p className="font-medium">Success!</p>
            <p>{success}</p>
          </div>
        )}
        
        {/* Error Message */}
        {error && (
          <div 
            className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md"
            role="alert"
            aria-live="assertive"
          >
            <p className="font-medium">Error</p>
            <p>{error}</p>
          </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Available Causes */}
          <div className="lg:col-span-2">
            <section className="bg-white rounded-lg shadow-sm p-6" aria-label="Available causes">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
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
                    
                    return (
                      <article
                        key={cause._id}
                        className={`border rounded-lg p-4 ${isInBasket ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold text-gray-900 flex-1">
                            {cause.name}
                          </h3>
                          <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                            {getCategoryLabel(cause.category)}
                          </span>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                          {cause.description}
                        </p>
                        
                        <div className="mb-3">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-600">Progress</span>
                            <span className="font-medium">{cause.percentageAchieved || 0}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${Math.min(cause.percentageAchieved || 0, 100)}%` }}
                            ></div>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatCurrency(cause.currentAmount || 0)} of {formatCurrency(cause.targetAmount || 0)}
                          </p>
                        </div>
                        
                        <button
                          onClick={() => addToBasket(cause)}
                          disabled={isInBasket}
                          className={`w-full py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                            isInBasket
                              ? 'bg-green-500 text-white cursor-not-allowed'
                              : 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                          }`}
                          aria-label={isInBasket ? `${cause.name} already in basket` : `Add ${cause.name} to basket`}
                        >
                          {isInBasket ? '✓ Added to Basket' : '+ Add to Basket'}
                        </button>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
          
          {/* Donation Basket */}
          <div className="lg:col-span-1">
            <section className="bg-white rounded-lg shadow-sm p-6 sticky top-4" aria-label="Donation basket">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Donation Basket
              </h2>
              
              {/* Total Amount Input */}
              <div className="mb-4">
                <label 
                  htmlFor="total-amount" 
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Total Donation Amount (₹) *
                </label>
                <input
                  id="total-amount"
                  type="number"
                  min="1"
                  step="0.01"
                  value={totalAmount}
                  onChange={(e) => handleTotalAmountChange(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    validationErrors.totalAmount ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter total amount"
                  aria-required="true"
                  aria-invalid={!!validationErrors.totalAmount}
                  aria-describedby={validationErrors.totalAmount ? "total-amount-error" : undefined}
                />
                {validationErrors.totalAmount && (
                  <p id="total-amount-error" className="mt-1 text-sm text-red-600">
                    {validationErrors.totalAmount}
                  </p>
                )}
              </div>
              
              {/* Allocation Type Toggle */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Allocation Method
                </label>
                <div className="flex rounded-md shadow-sm" role="group" aria-label="Allocation method">
                  <button
                    type="button"
                    onClick={() => toggleAllocationType('percentage')}
                    className={`flex-1 px-4 py-2 text-sm font-medium rounded-l-md border ${
                      allocationType === 'percentage'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                    aria-pressed={allocationType === 'percentage'}
                  >
                    Percentage
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleAllocationType('fixed')}
                    className={`flex-1 px-4 py-2 text-sm font-medium rounded-r-md border-t border-r border-b ${
                      allocationType === 'fixed'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                    aria-pressed={allocationType === 'fixed'}
                  >
                    Fixed Amount
                  </button>
                </div>
              </div>
              
              {/* Auto Distribute Button */}
              {basket.length > 0 && totalAmount > 0 && (
                <button
                  type="button"
                  onClick={distributeEvenly}
                  className="w-full mb-4 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Distribute Evenly
                </button>
              )}
              
              {/* Basket Items */}
              <div className="mb-4">
                {basket.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <svg 
                      className="mx-auto h-12 w-12 text-gray-400 mb-2"
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
                    <p className="text-sm">Your basket is empty</p>
                    <p className="text-xs mt-1">Add causes to start allocating your donation</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {basket.map((item) => (
                      <div key={item._id} className="border border-gray-200 rounded-lg p-3">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="text-sm font-medium text-gray-900 flex-1 pr-2">
                            {item.name}
                          </h3>
                          <button
                            onClick={() => removeFromBasket(item._id)}
                            className="text-red-600 hover:text-red-800 focus:outline-none"
                            aria-label={`Remove ${item.name} from basket`}
                          >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        
                        <div className="space-y-2">
                          <div>
                            <label 
                              htmlFor={`allocation-${item._id}`}
                              className="block text-xs text-gray-600 mb-1"
                            >
                              {allocationType === 'percentage' ? 'Percentage (%)' : 'Amount (₹)'}
                            </label>
                            <input
                              id={`allocation-${item._id}`}
                              type="number"
                              min="0"
                              step={allocationType === 'percentage' ? '0.1' : '0.01'}
                              max={allocationType === 'percentage' ? '100' : totalAmount}
                              value={allocationType === 'percentage' ? item.percentage : item.amount}
                              onChange={(e) => updateAllocation(item._id, e.target.value)}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              aria-label={`Allocate ${allocationType === 'percentage' ? 'percentage' : 'amount'} for ${item.name}`}
                            />
                          </div>
                          
                          <div className="flex justify-between text-xs text-gray-600">
                            <span>{item.percentage.toFixed(2)}%</span>
                            <span>₹{item.amount.toFixed(2)}</span>
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
                <div className="mb-4 p-3 bg-gray-50 rounded-md">
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Summary</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Causes:</span>
                      <span className="font-medium">{basket.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Percentage:</span>
                      <span className={`font-medium ${Math.abs(totalAllocatedPercentage - 100) > 0.1 ? 'text-red-600' : 'text-green-600'}`}>
                        {totalAllocatedPercentage.toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Amount:</span>
                      <span className={`font-medium ${Math.abs(totalAllocatedAmount - (parseFloat(totalAmount) || 0)) > 0.01 ? 'text-red-600' : 'text-green-600'}`}>
                        ₹{totalAllocatedAmount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  
                  {validationErrors.percentage && (
                    <p className="mt-2 text-xs text-red-600">
                      {validationErrors.percentage}
                    </p>
                  )}
                  
                  {validationErrors.amount && (
                    <p className="mt-2 text-xs text-red-600">
                      {validationErrors.amount}
                    </p>
                  )}
                </div>
              )}
              
              {/* Submit Button */}
              <button
                onClick={handleSubmit}
                disabled={submitting || basket.length === 0 || !totalAmount}
                className={`w-full py-3 px-4 rounded-md text-white font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                  submitting || basket.length === 0 || !totalAmount
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {submitting ? 'Processing...' : `Donate ₹${totalAmount || '0'}`}
              </button>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
