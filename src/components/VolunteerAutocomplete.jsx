/**
 * VolunteerAutocomplete Component
 * 
 * Provides an autocomplete search input for quickly finding volunteers
 * by name, email, or skills. Includes keyboard navigation.
 */

const { useState, useEffect, useRef } = React;

const VolunteerAutocomplete = ({ 
  volunteers = [],
  onSelect = (volunteer) => {},
  placeholder = "Search volunteers...",
  className = ""
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [filteredVolunteers, setFilteredVolunteers] = useState([]);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Filter volunteers based on query
  useEffect(() => {
    if (!query.trim()) {
      setFilteredVolunteers([]);
      setIsOpen(false);
      return;
    }

    const lowerQuery = query.toLowerCase();
    const matches = volunteers.filter(v => {
      // Search by name
      const fullName = `${v.firstName} ${v.lastName}`.toLowerCase();
      if (fullName.includes(lowerQuery)) return true;

      // Search by email
      if (v.email && v.email.toLowerCase().includes(lowerQuery)) return true;

      // Search by phone
      if (v.phone && v.phone.includes(lowerQuery)) return true;

      // Search by skills
      if (v.volunteerInfo?.skills && 
          v.volunteerInfo.skills.some(s => s.toLowerCase().includes(lowerQuery))) {
        return true;
      }

      return false;
    }).slice(0, 10); // Limit to 10 results

    setFilteredVolunteers(matches);
    setIsOpen(matches.length > 0);
    setHighlightedIndex(0);
  }, [query, volunteers]);

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!isOpen) return;

    switch(e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredVolunteers.length - 1 ? prev + 1 : prev
        );
        break;

      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0);
        break;

      case 'Enter':
        e.preventDefault();
        if (filteredVolunteers[highlightedIndex]) {
          selectVolunteer(filteredVolunteers[highlightedIndex]);
        }
        break;

      case 'Escape':
        setIsOpen(false);
        inputRef.current?.blur();
        break;

      default:
        break;
    }
  };

  // Scroll highlighted item into view
  useEffect(() => {
    if (dropdownRef.current && isOpen) {
      const highlightedElement = dropdownRef.current.children[highlightedIndex];
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [highlightedIndex, isOpen]);

  // Select volunteer
  const selectVolunteer = (volunteer) => {
    onSelect(volunteer);
    setQuery('');
    setIsOpen(false);
    inputRef.current?.blur();
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (inputRef.current && !inputRef.current.contains(e.target) &&
          dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Highlight matching text
  const highlightMatch = (text, query) => {
    if (!text || !query) return text;
    
    const index = text.toLowerCase().indexOf(query.toLowerCase());
    if (index === -1) return text;

    return (
      <>
        {text.substring(0, index)}
        <mark className="bg-yellow-200 text-gray-900">{text.substring(index, index + query.length)}</mark>
        {text.substring(index + query.length)}
      </>
    );
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query && setIsOpen(filteredVolunteers.length > 0)}
          placeholder={placeholder}
          className="w-full border rounded px-3 py-2 pr-10 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          autoComplete="off"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && filteredVolunteers.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-y-auto"
        >
          {filteredVolunteers.map((volunteer, index) => {
            const fullName = `${volunteer.firstName} ${volunteer.lastName}`;
            const isHighlighted = index === highlightedIndex;
            const skills = volunteer.volunteerInfo?.skills || [];

            return (
              <button
                key={volunteer.id}
                onClick={() => selectVolunteer(volunteer)}
                className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-blue-50 transition-colors ${
                  isHighlighted ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 text-sm">
                      {highlightMatch(fullName, query)}
                    </div>
                    {volunteer.email && (
                      <div className="text-xs text-gray-600 truncate">
                        {highlightMatch(volunteer.email, query)}
                      </div>
                    )}
                    {skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {skills.slice(0, 3).map((skill, i) => (
                          <span
                            key={i}
                            className="inline-block px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs"
                          >
                            {highlightMatch(skill, query)}
                          </span>
                        ))}
                        {skills.length > 3 && (
                          <span className="text-xs text-gray-500">+{skills.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 whitespace-nowrap">
                    {volunteer.volunteerInfo?.status === 'active' ? (
                      <span className="text-green-600">● Active</span>
                    ) : (
                      <span className="text-gray-400">○ Inactive</span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Helper text */}
      {query && filteredVolunteers.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg px-4 py-3">
          <div className="text-sm text-gray-500 text-center">
            No volunteers found for "{query}"
          </div>
        </div>
      )}

      {/* Keyboard hints */}
      {isOpen && filteredVolunteers.length > 0 && (
        <div className="mt-1 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded text-xs text-gray-500">
          <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded">↑↓</kbd> Navigate
          <span className="mx-2">•</span>
          <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded">Enter</kbd> Select
          <span className="mx-2">•</span>
          <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded">Esc</kbd> Close
        </div>
      )}
    </div>
  );
};

// Export to window for use in other components
window.VolunteerAutocomplete = VolunteerAutocomplete;
