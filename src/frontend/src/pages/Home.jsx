import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { formatCurrencySync } from '../utils/currencyFormatter';

export default function Home() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [stats, setStats] = useState({
    totalDonations: 0,
    activeCauses: 0,
    donors: 0,
    impactMade: 0
  });

  // Hero slideshow images with donation themes
  const slides = [
    {
      image: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=1200&q=80',
      title: 'Education for Every Child',
      subtitle: 'Help children access quality education and build a brighter future',
      category: 'Education'
    },
    {
      image: 'https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?w=1200&q=80',
      title: 'Healthcare for Communities',
      subtitle: 'Support medical care and health services for those in need',
      category: 'Healthcare'
    },
    {
      image: 'https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?w=1200&q=80',
      title: 'Environmental Conservation',
      subtitle: 'Protect our planet and create a sustainable future',
      category: 'Environment'
    },
    {
      image: 'https://images.unsplash.com/photo-1593113598332-cd288d649433?w=1200&q=80',
      title: 'Combat Hunger & Poverty',
      subtitle: 'Provide meals and essential resources to families',
      category: 'Hunger Relief'
    },
    {
      image: 'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=1200&q=80',
      title: 'Animal Welfare',
      subtitle: 'Care for and protect animals in need',
      category: 'Animal Care'
    }
  ];

  // Auto-advance slideshow
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000); // Change slide every 5 seconds

    return () => clearInterval(timer);
  }, [slides.length]);

  // Fetch platform statistics (optional - can be static for now)
  useEffect(() => {
    // Simulate loading stats - replace with actual API call
    setStats({
      totalDonations: 125000,
      activeCauses: 48,
      donors: 1250,
      impactMade: 95
    });
  }, []);

  const featuredCauses = [
    {
      icon: '📚',
      title: 'Education',
      description: 'Support schools, scholarships, and learning resources',
      color: 'from-blue-500 to-blue-600'
    },
    {
      icon: '🏥',
      title: 'Healthcare',
      description: 'Fund medical treatments and health facilities',
      color: 'from-red-500 to-pink-600'
    },
    {
      icon: '🌳',
      title: 'Environment',
      description: 'Protect nature and fight climate change',
      color: 'from-green-500 to-emerald-600'
    },
    {
      icon: '🍲',
      title: 'Hunger Relief',
      description: 'Provide meals and food security',
      color: 'from-orange-500 to-amber-600'
    },
    {
      icon: '🐾',
      title: 'Animal Welfare',
      description: 'Rescue and care for animals',
      color: 'from-purple-500 to-violet-600'
    },
    {
      icon: '🏘️',
      title: 'Community',
      description: 'Build stronger, healthier communities',
      color: 'from-indigo-500 to-blue-600'
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Slideshow Section */}
      <section className="relative h-[600px] overflow-hidden">
        {slides.map((slide, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              index === currentSlide ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {/* Background Image with Overlay */}
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${slide.image})` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent"></div>
            </div>

            {/* Slide Content */}
            <div className="relative h-full flex items-center">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
                <div className="max-w-2xl">
                  <span className="inline-block px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-full text-sm font-semibold mb-4">
                    {slide.category}
                  </span>
                  <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
                    {slide.title}
                  </h1>
                  <p className="text-xl text-gray-200 mb-8">
                    {slide.subtitle}
                  </p>
                  <div className="flex gap-4">
                    <Link
                      to="/causes"
                      className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 font-semibold shadow-lg transform hover:scale-105 transition-all"
                    >
                      Explore Causes
                    </Link>
                    <Link
                      to="/register"
                      className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white border-2 border-white rounded-lg hover:bg-white/20 font-semibold transition-all"
                    >
                      Start Donating
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Slide Indicators */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-2 z-10">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-3 h-3 rounded-full transition-all ${
                index === currentSlide
                  ? 'bg-white w-8'
                  : 'bg-white/50 hover:bg-white/75'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>

        {/* Navigation Arrows */}
        <button
          onClick={() => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)}
          className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/10 backdrop-blur-sm text-white p-3 rounded-full hover:bg-white/20 transition-all z-10"
          aria-label="Previous slide"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          onClick={() => setCurrentSlide((prev) => (prev + 1) % slides.length)}
          className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/10 backdrop-blur-sm text-white p-3 rounded-full hover:bg-white/20 transition-all z-10"
          aria-label="Next slide"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </section>

      {/* Platform Statistics */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div className="text-white">
              <div className="text-5xl font-bold mb-2">{formatCurrencySync(Math.round(stats.totalDonations / 1000))}K+</div>
              <div className="text-blue-100 text-lg">Total Donations</div>
            </div>
            <div className="text-white">
              <div className="text-5xl font-bold mb-2">{stats.activeCauses}+</div>
              <div className="text-blue-100 text-lg">Active Causes</div>
            </div>
            <div className="text-white">
              <div className="text-5xl font-bold mb-2">{stats.donors}+</div>
              <div className="text-blue-100 text-lg">Generous Donors</div>
            </div>
            <div className="text-white">
              <div className="text-5xl font-bold mb-2">{stats.impactMade}%</div>
              <div className="text-blue-100 text-lg">Impact Made</div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Cause Categories */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Support Causes That Matter
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Make a difference with micro-donations to verified causes across various categories
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredCauses.map((cause, index) => (
              <div
                key={index}
                className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transform hover:-translate-y-2 transition-all cursor-pointer"
              >
                <div className={`h-32 bg-gradient-to-br ${cause.color} flex items-center justify-center`}>
                  <span className="text-6xl">{cause.icon}</span>
                </div>
                <div className="p-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{cause.title}</h3>
                  <p className="text-gray-600 mb-4">{cause.description}</p>
                  <Link
                    to="/causes"
                    className="text-blue-600 hover:text-blue-700 font-semibold inline-flex items-center"
                  >
                    Browse {cause.title} Causes
                    <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600">
              Making a difference is easy with our simple 4-step process
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                <span className="text-3xl text-white font-bold">1</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Create Account</h3>
              <p className="text-gray-600">
                Register and verify your email to secure your account
              </p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                <span className="text-3xl text-white font-bold">2</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Browse Causes</h3>
              <p className="text-gray-600">
                Explore verified causes and find ones that resonate with you
              </p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-pink-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                <span className="text-3xl text-white font-bold">3</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Make Donation</h3>
              <p className="text-gray-600">
                Contribute any amount, even small donations make big impacts
              </p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                <span className="text-3xl text-white font-bold">4</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Track Impact</h3>
              <p className="text-gray-600">
                View your donation history and see the difference you've made
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Platform Features */}
      <section className="py-20 bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                Why Choose Our Platform?
              </h2>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Secure & Verified</h3>
                    <p className="text-gray-600">All causes are thoroughly vetted and donations are processed securely</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">100% Transparency</h3>
                    <p className="text-gray-600">Track every rupee and see exactly how your donations are used</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-pink-500 to-red-600 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Micro-Donations</h3>
                    <p className="text-gray-600">Every amount counts - start making a difference with as little as {formatCurrencySync(10)}</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-red-500 to-orange-600 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Impact Analytics</h3>
                    <p className="text-gray-600">Visualize your contribution with detailed impact statistics and charts</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-200 to-purple-200 rounded-3xl transform rotate-6"></div>
              <div className="relative bg-white rounded-3xl shadow-2xl p-8">
                <div className="space-y-6">
                  <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-6 text-white">
                    <div className="text-sm font-semibold mb-2">Your Impact This Month</div>
                    <div className="text-4xl font-bold mb-1">{formatCurrencySync(2500)}</div>
                    <div className="text-blue-100 text-sm">Donated to 5 causes</div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold text-gray-900">Education</span>
                        <span className="text-blue-600 font-bold">{formatCurrencySync(800)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full" style={{ width: '32%' }}></div>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold text-gray-900">Healthcare</span>
                        <span className="text-red-600 font-bold">{formatCurrencySync(700)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-gradient-to-r from-red-500 to-pink-600 h-2 rounded-full" style={{ width: '28%' }}></div>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold text-gray-900">Environment</span>
                        <span className="text-green-600 font-bold">{formatCurrencySync(1000)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-gradient-to-r from-green-500 to-emerald-600 h-2 rounded-full" style={{ width: '40%' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to Make a Difference?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
            Join thousands of donors who are creating positive change through micro-donations.
            Start your journey today!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="px-10 py-4 bg-white text-blue-600 rounded-lg hover:bg-gray-100 font-bold text-lg shadow-lg transform hover:scale-105 transition-all"
            >
              Create Free Account
            </Link>
            <Link
              to="/causes"
              className="px-10 py-4 bg-white/10 backdrop-blur-sm text-white border-2 border-white rounded-lg hover:bg-white/20 font-bold text-lg transition-all"
            >
              Browse All Causes
            </Link>
          </div>
        </div>
      </section>

      {/* Footer Info */}
      <section className="py-12 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8 text-center md:text-left">
            <div>
              <h3 className="text-white font-bold text-lg mb-4">Micro Donation Platform</h3>
              <p className="text-gray-400 text-sm">
                Making the world a better place, one micro-donation at a time.
              </p>
            </div>
            <div>
              <h3 className="text-white font-bold text-lg mb-4">Quick Links</h3>
              <ul className="space-y-2">
                <li><Link to="/causes" className="text-gray-400 hover:text-white text-sm transition-colors">Browse Causes</Link></li>
                <li><Link to="/register" className="text-gray-400 hover:text-white text-sm transition-colors">Get Started</Link></li>
                <li><Link to="/login" className="text-gray-400 hover:text-white text-sm transition-colors">Sign In</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-bold text-lg mb-4">Need Help?</h3>
              <p className="text-gray-400 text-sm">
                Contact: support@mdp.example<br />
                Available 24/7 for assistance
              </p>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center">
            <p className="text-gray-400 text-sm">
              © 2024 Micro Donation Platform. All rights reserved.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
