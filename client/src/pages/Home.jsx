import React, { useState } from 'react';
import axios from 'axios';
import { Search, Loader2, AlertCircle } from 'lucide-react';
import RestaurantCard from '../components/RestaurantCard';

export default function Home() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);
  const [loadingStep, setLoadingStep] = useState('');

  const loadingSteps = [
    "Understanding your request...",
    "Finding restaurants in Europe...",
    "Checking locations and ranking...",
    "Researching official websites...",
    "Extracting and translating menus...",
    "Analyzing reviews for your specific context...",
    "Synthesizing final recommendations..."
  ];

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setResults(null);
    setLoadingStep(loadingSteps[0]);

    // Simulate loading steps progression since the actual API is just a single long request
    let stepIndex = 0;
    const stepInterval = setInterval(() => {
      stepIndex++;
      if (stepIndex < loadingSteps.length - 1) {
        setLoadingStep(loadingSteps[stepIndex]);
      }
    }, 4000);

    try {
      const response = await axios.post('/api/recommendations', { query });
      clearInterval(stepInterval);
      setLoadingStep(loadingSteps[loadingSteps.length - 1]);
      setResults(response.data);
    } catch (err) {
      clearInterval(stepInterval);
      const errorMessage = err.response?.data?.message || err.message || "An error occurred";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center max-w-4xl mx-auto space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4 mt-8">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight">
          Find the right restaurant for your trip.
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Describe exactly what you want. We'll search real European locations, extract official menus, and analyze reviews to find the perfect match.
        </p>
      </div>

      {/* Search Input */}
      <form onSubmit={handleSearch} className="w-full relative shadow-lg rounded-2xl overflow-hidden border border-gray-200 focus-within:ring-2 focus-within:ring-blue-500 transition-all">
        <textarea 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. I'm visiting Barcelona near Sagrada Familia. I want vegetarian dinner, Spanish food, under €25 and not too spicy."
          className="w-full p-5 pl-14 text-lg resize-none outline-none text-gray-800 bg-white"
          rows={3}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSearch(e);
            }
          }}
        />
        <Search className="absolute left-5 top-5 w-6 h-6 text-gray-400" />
        <div className="absolute right-4 bottom-4">
          <button 
            type="submit" 
            disabled={loading || !query.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-6 rounded-full transition-colors flex items-center gap-2 shadow-sm"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {loading ? 'Researching...' : 'Search'}
          </button>
        </div>
      </form>

      {/* Loading State */}
      {loading && (
        <div className="w-full p-8 bg-blue-50 border border-blue-100 rounded-2xl flex flex-col items-center justify-center space-y-4 shadow-sm animate-pulse">
          <div className="w-12 h-12 bg-blue-200 rounded-full flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
          </div>
          <p className="text-blue-800 font-medium text-lg">{loadingStep}</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="w-full p-6 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 shadow-sm">
          <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-red-800 font-semibold">Could not complete search</h3>
            <p className="text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Results */}
      {results && !loading && (
        <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between border-b pb-4">
            <h2 className="text-2xl font-bold text-gray-900">Top Recommendations</h2>
            <div className="text-sm text-gray-500 font-medium">
              Found {results.restaurants} places matching your criteria
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-8">
            {results.recommendations.map((restaurant, idx) => (
              <RestaurantCard key={restaurant.placeId || idx} data={restaurant} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
