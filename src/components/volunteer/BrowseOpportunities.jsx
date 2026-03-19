/**
 * BrowseOpportunities.jsx
 * Public directory of all active volunteer opportunities
 * No login required - browse, search, filter, and view details
 */

const { useState, useEffect, useCallback, useMemo } = React;

// Category color mapping
const CATEGORY_COLORS = {
  'Front of House': 'bg-blue-100 text-blue-800 border-blue-300',
  'Backstage Crew': 'bg-purple-100 text-purple-800 border-purple-300',
  'Administrative': 'bg-green-100 text-green-800 border-green-300',
  'Event Support': 'bg-orange-100 text-orange-800 border-orange-300',
  'Special Events': 'bg-pink-100 text-pink-800 border-pink-300'
};

const CATEGORIES = [
  'Front of House',
  'Backstage Crew',
  'Administrative',
  'Event Support',
  'Special Events'
];

const SORT_OPTIONS = [
  { value: 'recent', label: 'Most Recent' },
  { value: 'alphabetical', label: 'Alphabetical (A-Z)' },
  { value: 'category', label: 'By Category' }
];

// Skeleton Card Component
const SkeletonCard = () => (
  <div className="bg-white rounded-lg shadow-sm overflow-hidden animate-pulse">
    <div className="h-12 bg-gray-200" />
    <div className="p-5 space-y-3">
      <div className="h-6 bg-gray-200 rounded w-3/4" />
      <div className="h-4 bg-gray-200 rounded w-1/2" />
      <div className="space-y-2">
        <div className="h-3 bg-gray-200 rounded" />
        <div className="h-3 bg-gray-200 rounded" />
        <div className="h-3 bg-gray-200 rounded w-5/6" />
      </div>
      <div className="h-4 bg-gray-200 rounded w-1/3" />
      <div className="h-10 bg-gray-200 rounded" />
    </div>
  </div>
);

// Opportunity Card Component
const OpportunityCard = React.memo(({ opportunity, onLearnMore }) => {
  const categoryColor = CATEGORY_COLORS[opportunity.category] || 'bg-gray-100 text-gray-800 border-gray-300';
  
  const requirementsCount = (opportunity.requirements || []).length;
  const descriptionPreview = (opportunity.description || '').substring(0, 100);
  const showEllipsis = (opportunity.description || '').length > 100;

  return (
    <div 
      className="bg-white rounded-lg shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden h-full flex flex-col"
      role="article"
      aria-label={`${opportunity.title} opportunity`}
    >
      {/* Category Badge */}
      <div className="p-4 pb-2">
        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${categoryColor}`}>
          {opportunity.category || 'General'}
        </span>
      </div>

      {/* Card Content */}
      <div className="px-4 pb-4 flex-1 flex flex-col">
        {/* Title */}
        <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">
          {opportunity.title}
        </h3>

        {/* Time Commitment */}
        <div className="flex items-center text-sm text-gray-600 mb-3">
          <span className="mr-1">⏱️</span>
          <span>{opportunity.timeCommitment || 'Flexible schedule'}</span>
        </div>

        {/* Description Preview */}
        <p className="text-sm text-gray-600 mb-3 line-clamp-3 flex-1">
          {descriptionPreview}
          {showEllipsis && '...'}
        </p>

        {/* Requirements Count */}
        {requirementsCount > 0 && (
          <div className="text-sm text-blue-600 mb-4 flex items-center">
            <span className="mr-1">📋</span>
            <span>{requirementsCount} requirement{requirementsCount !== 1 ? 's' : ''}</span>
          </div>
        )}

        {/* Learn More Button */}
        <button
          onClick={() => onLearnMore(opportunity)}
          className="w-full px-4 py-2 bg-white border-2 border-violet-600 text-violet-600 rounded-lg font-semibold hover:bg-violet-50 transition-colors"
        >
          Learn More
        </button>
      </div>
    </div>
  );
});

// Main Component
window.BrowseOpportunities = ({ onSelectOpportunity }) => {
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [sortBy, setSortBy] = useState('recent');
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Load opportunities
  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      if (window.volunteerStorageService?.getVolunteerOpportunities) {
        const allOpps = window.volunteerStorageService.getVolunteerOpportunities();
        // Only show active opportunities (isActive boolean)
        const activeOpps = allOpps.filter(opp => opp.isActive === true);
        setOpportunities(activeOpps);
      }
      setLoading(false);
    }, 300);
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounced(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Toggle category filter
  const toggleCategory = useCallback((category) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setSearchTerm('');
    setSearchDebounced('');
    setSelectedCategories([]);
    setSortBy('recent');
  }, []);

  // Filter and sort opportunities
  const filteredOpportunities = useMemo(() => {
    let filtered = [...opportunities];

    // Search filter
    if (searchDebounced.trim()) {
      const query = searchDebounced.toLowerCase();
      if (window.volunteerFilters?.searchOpportunities) {
        filtered = window.volunteerFilters.searchOpportunities(filtered, query);
      } else {
        filtered = filtered.filter(opp =>
          (opp.title || '').toLowerCase().includes(query) ||
          (opp.description || '').toLowerCase().includes(query)
        );
      }
    }

    // Category filter (OR logic)
    if (selectedCategories.length > 0) {
      if (window.volunteerFilters?.filterOpportunitiesByCategory) {
        filtered = window.volunteerFilters.filterOpportunitiesByCategory(filtered, selectedCategories);
      } else {
        filtered = filtered.filter(opp => selectedCategories.includes(opp.category));
      }
    }

    // Sort
    if (sortBy === 'recent') {
      filtered.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    } else if (sortBy === 'alphabetical') {
      filtered.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    } else if (sortBy === 'category') {
      filtered.sort((a, b) => {
        const catCompare = (a.category || '').localeCompare(b.category || '');
        if (catCompare !== 0) return catCompare;
        return (a.title || '').localeCompare(b.title || '');
      });
    }

    return filtered;
  }, [opportunities, searchDebounced, selectedCategories, sortBy]);

  const hasActiveFilters = selectedCategories.length > 0 || searchDebounced.trim();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Volunteer Opportunities</h1>
          <p className="text-xl text-gray-600">Find the perfect way to contribute</p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="Search opportunities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent text-lg"
              aria-label="Search opportunities"
            />
            <span className="absolute left-4 top-3.5 text-gray-400 text-xl">🔍</span>
          </div>
        </div>

        <div className="lg:grid lg:grid-cols-4 lg:gap-8">
          {/* Filter Sidebar */}
          <div className="lg:col-span-1">
            {/* Mobile Filter Toggle */}
            <button
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className="lg:hidden w-full mb-4 px-4 py-3 bg-white border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50"
            >
              {showMobileFilters ? '✕ Hide Filters' : '⚙️ Show Filters'}
            </button>

            {/* Filters */}
            <div className={`${showMobileFilters ? 'block' : 'hidden'} lg:block bg-white rounded-lg shadow-sm p-6 mb-6 lg:mb-0 lg:sticky lg:top-4`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Filters</h3>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {/* Category Filter */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Category</h4>
                
                {/* All Opportunities Radio */}
                <label className="flex items-center mb-2 cursor-pointer group">
                  <input
                    type="radio"
                    checked={selectedCategories.length === 0}
                    onChange={() => setSelectedCategories([])}
                    className="mr-2 h-4 w-4 text-violet-600 focus:ring-violet-500"
                  />
                  <span className="text-sm text-gray-700 group-hover:text-gray-900">All Opportunities</span>
                </label>

                {/* Category Checkboxes */}
                <div className="space-y-2 mt-3 pt-3 border-t border-gray-200">
                  {CATEGORIES.map(category => (
                    <label key={category} className="flex items-center cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(category)}
                        onChange={() => toggleCategory(category)}
                        className="mr-2 h-4 w-4 text-violet-600 rounded focus:ring-violet-500"
                      />
                      <span className="text-sm text-gray-700 group-hover:text-gray-900">{category}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Results Count */}
              <div className="pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600">
                  Showing <span className="font-semibold text-gray-900">{filteredOpportunities.length}</span> opportunit{filteredOpportunities.length === 1 ? 'y' : 'ies'}
                </p>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Sort Dropdown */}
            <div className="flex items-center justify-between mb-6">
              <div className="text-sm text-gray-600">
                {loading ? 'Loading...' : `${filteredOpportunities.length} opportunit${filteredOpportunities.length === 1 ? 'y' : 'ies'} found`}
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="sort-select" className="text-sm text-gray-700 font-medium">
                  Sort by:
                </label>
                <select
                  id="sort-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                >
                  {SORT_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            )}

            {/* Empty State - No Results */}
            {!loading && filteredOpportunities.length === 0 && hasActiveFilters && (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">No opportunities match your search</h3>
                <p className="text-gray-600 mb-6">Try different filters or check back soon!</p>
                <button
                  onClick={clearFilters}
                  className="px-6 py-3 bg-violet-600 text-white rounded-lg font-semibold hover:bg-violet-700"
                >
                  Clear Filters
                </button>
              </div>
            )}

            {/* Empty State - No Opportunities at All */}
            {!loading && opportunities.length === 0 && (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <div className="text-6xl mb-4">📋</div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">No volunteer opportunities available</h3>
                <p className="text-gray-600">Check back soon for new opportunities!</p>
              </div>
            )}

            {/* Opportunities Grid */}
            {!loading && filteredOpportunities.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredOpportunities.map(opportunity => (
                  <OpportunityCard
                    key={opportunity.id}
                    opportunity={opportunity}
                    onLearnMore={onSelectOpportunity}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
