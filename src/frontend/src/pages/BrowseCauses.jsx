import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { API } from '../api';
import { formatCurrencySync, invalidateConfigCache } from '../utils/currencyFormatter';

export default function BrowseCauses() {
  const [causes, setCauses] = useState([]);
  const [filteredCauses, setFilteredCauses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  // Fetch categories and causes on mount
  useEffect(() => {
    fetchCategories();
    fetchCauses();

    // Listen for config updates
    const handleConfigUpdate = () => {
      invalidateConfigCache();
      setRefreshKey(prev => prev + 1);
    };

    window.addEventListener('platformConfigUpdated', handleConfigUpdate);
    return () => window.removeEventListener('platformConfigUpdated', handleConfigUpdate);
  }, []);
  
  // Apply filters whenever search term or category changes
  useEffect(() => {
    applyFilters();
  }, [searchTerm, selectedCategory, causes]);
  
  const fetchCategories = async () => {
    try {
      const response = await API.get('/causes/categories/list');
      if (response.data.success) {
        setCategories(response.data.categories);
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };
  
  const fetchCauses = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await API.get('/causes');
      
      if (response.data.success) {
        setCauses(response.data.causes);
        setFilteredCauses(response.data.causes);
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
  
  const applyFilters = () => {
    let filtered = [...causes];
    
    // Apply search filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(cause => 
        cause.name.toLowerCase().includes(search) || 
        cause.description.toLowerCase().includes(search)
      );
    }
    
    // Apply category filter
    if (selectedCategory && selectedCategory !== 'all') {
      filtered = filtered.filter(cause => cause.category === selectedCategory);
    }
    
    setFilteredCauses(filtered);
  };
  
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };
  
  const handleCategoryChange = (e) => {
    setSelectedCategory(e.target.value);
  };
  
  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('all');
  };
  
  const formatCurrency = (amount) => {
    return formatCurrencySync(amount);
  };
  
  const getCategoryLabel = (category) => {
    const cat = categories.find(c => c.value === category);
    return cat ? cat.label : category;
  };
  
  const getDefaultImage = (category) => {
    // Placeholder images based on category
    const images = {
      education: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400&h=300&fit=crop',
      healthcare: 'https://images.unsplash.com/photo-1584982751601-97dcc096659c?w=400&h=300&fit=crop',
      environment: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=400&h=300&fit=crop',
      'disaster-relief': 'https://images.unsplash.com/photo-1547683905-f686c993aae5?w=400&h=300&fit=crop',
      poverty: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=400&h=300&fit=crop',
      'animal-welfare': 'https://images.unsplash.com/photo-1425082661705-1834bfd09dca?w=400&h=300&fit=crop',
      other: 'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=400&h=300&fit=crop'
    };
    return images[category] || images.other;
  };
  
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Browse Causes
          </h1>
          <p className="text-gray-600">
            Discover meaningful causes and make a difference with your contribution
          </p>
        </header>
        
        {/* Search and Filter Section */}
        <section 
          className="bg-white rounded-lg shadow-sm p-6 mb-8"
          aria-label="Search and filter causes"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search Bar */}
            <div className="md:col-span-2">
              <label 
                htmlFor="search-causes" 
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Search Causes
              </label>
              <div className="relative">
                <input
                  id="search-causes"
                  type="text"
                  placeholder="Search by title or description..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  aria-label="Search causes by keywords"
                  aria-describedby="search-hint"
                />
                {/* Search Icon */}
                <svg 
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <p id="search-hint" className="mt-1 text-sm text-gray-500">
                Enter keywords to find causes
              </p>
            </div>
            
            {/* Category Filter */}
            <div>
              <label 
                htmlFor="category-filter" 
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Category
              </label>
              <select
                id="category-filter"
                value={selectedCategory}
                onChange={handleCategoryChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                aria-label="Filter causes by category"
              >
                <option value="all">All Categories</option>
                {categories.map(category => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Active Filters Display */}
          {(searchTerm || selectedCategory !== 'all') && (
            <div className="mt-4 flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-gray-700">Active filters:</span>
              {searchTerm && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                  Search: "{searchTerm}"
                </span>
              )}
              {selectedCategory !== 'all' && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
                  Category: {getCategoryLabel(selectedCategory)}
                </span>
              )}
              <button
                onClick={clearFilters}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
                aria-label="Clear all filters"
              >
                Clear all
              </button>
            </div>
          )}
        </section>
        
        {/* Results Summary */}
        <div className="mb-4" role="status" aria-live="polite">
          <p className="text-gray-600">
            Showing {filteredCauses.length} of {causes.length} causes
          </p>
        </div>
        
        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-12" role="status" aria-live="polite">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" aria-hidden="true"></div>
            <span className="sr-only">Loading causes...</span>
          </div>
        )}
        
        {/* Error State */}
        {error && (
          <div 
            className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md mb-6"
            role="alert"
            aria-live="assertive"
          >
            <p className="font-medium">Error</p>
            <p>{error}</p>
          </div>
        )}
        
        {/* No Results */}
        {!loading && !error && filteredCauses.length === 0 && (
          <div className="text-center py-12">
            <svg 
              className="mx-auto h-12 w-12 text-gray-400 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
              />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No causes found</h3>
            <p className="text-gray-600 mb-4">
              Try adjusting your search or filter to find what you're looking for
            </p>
            <button
              onClick={clearFilters}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Clear Filters
            </button>
          </div>
        )}
        
        {/* Causes Grid */}
        {!loading && !error && filteredCauses.length > 0 && (
          <div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            role="list"
            aria-label="List of causes"
          >
            {filteredCauses.map((cause) => (
              <article
                key={cause._id}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 focus-within:ring-2 focus-within:ring-blue-500"
                role="listitem"
              >
                {/* Cause Image */}
                <div className="relative h-48 bg-gray-200 overflow-hidden">
                  <img
                    src={cause.imageUrl || getDefaultImage(cause.category)}
                    alt={`${cause.name} - ${getCategoryLabel(cause.category)} cause`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = getDefaultImage(cause.category);
                    }}
                  />
                  {/* Category Badge */}
                  <span className="absolute top-3 right-3 px-3 py-1 bg-white/90 backdrop-blur-sm text-sm font-medium text-gray-800 rounded-full">
                    {getCategoryLabel(cause.category)}
                  </span>
                </div>
                
                {/* Cause Details */}
                <div className="p-5">
                  <h2 className="text-xl font-semibold text-gray-900 mb-2 line-clamp-2">
                    {cause.name}
                  </h2>
                  
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                    {cause.description}
                  </p>
                  
                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-gray-700">
                        {formatCurrency(cause.currentAmount)} raised
                      </span>
                      <span className="text-gray-600">
                        {cause.percentageAchieved}%
                      </span>
                    </div>
                    <div 
                      className="w-full bg-gray-200 rounded-full h-2.5"
                      role="progressbar"
                      aria-valuenow={cause.percentageAchieved}
                      aria-valuemin="0"
                      aria-valuemax="100"
                      aria-label={`${cause.percentageAchieved}% of ${formatCurrency(cause.targetAmount)} goal reached`}
                    >
                      <div 
                        className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(cause.percentageAchieved, 100)}%` }}
                      ></div>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Goal: {formatCurrency(cause.targetAmount)}
                    </p>
                  </div>
                  
                  {/* Donor Count */}
                  <div className="flex items-center text-sm text-gray-600 mb-4">
                    <svg 
                      className="h-5 w-5 mr-2 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" 
                      />
                    </svg>
                    <span>{cause.donorCount || 0} donors</span>
                  </div>
                  
                  {/* Action Button */}
                  <Link
                    to={`/causes/${cause._id}`}
                    className="block w-full text-center px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                    aria-label={`View details and donate to ${cause.name}`}
                  >
                    View Details & Donate
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
