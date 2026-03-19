/**
 * VenuesService
 * Manages venue/location data with localStorage persistence.
 * Provides CRUD operations and default venue seeding.
 */
const VenuesService = (() => {
  const STORAGE_KEY = 'showsuite_venues';

  const DEFAULT_VENUES = [
    {
      id: 'venue_main_stage',
      name: 'Main Stage',
      capacity: 500,
      type: 'performance',
      address: '',
      notes: '',
      createdAt: new Date().toISOString()
    },
    {
      id: 'venue_black_box',
      name: 'Black Box Theatre',
      capacity: 100,
      type: 'performance',
      address: '',
      notes: '',
      createdAt: new Date().toISOString()
    },
    {
      id: 'venue_rehearsal_a',
      name: 'Rehearsal Room A',
      capacity: 50,
      type: 'rehearsal',
      address: '',
      notes: '',
      createdAt: new Date().toISOString()
    },
    {
      id: 'venue_rehearsal_b',
      name: 'Rehearsal Room B',
      capacity: 30,
      type: 'rehearsal',
      address: '',
      notes: '',
      createdAt: new Date().toISOString()
    },
    {
      id: 'venue_scene_shop',
      name: 'Scene Shop',
      capacity: 20,
      type: 'workshop',
      address: '',
      notes: '',
      createdAt: new Date().toISOString()
    },
    {
      id: 'venue_costume_shop',
      name: 'Costume Shop',
      capacity: 15,
      type: 'workshop',
      address: '',
      notes: '',
      createdAt: new Date().toISOString()
    }
  ];

  const loadVenues = () => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) {
        saveVenues(DEFAULT_VENUES);
        return DEFAULT_VENUES;
      }
      return JSON.parse(data);
    } catch (error) {
      console.error('Error loading venues:', error);
      return DEFAULT_VENUES;
    }
  };

  const saveVenues = (venues) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(venues));
      return true;
    } catch (error) {
      console.error('Error saving venues:', error);
      return false;
    }
  };

  const createVenue = (venueData) => {
    const venues = loadVenues();
    const newVenue = {
      id: `venue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: venueData.name || 'Unnamed Venue',
      capacity: venueData.capacity || 0,
      type: venueData.type || 'other',
      address: venueData.address || '',
      notes: venueData.notes || '',
      createdAt: new Date().toISOString()
    };
    venues.push(newVenue);
    saveVenues(venues);
    return newVenue;
  };

  const updateVenue = (venueId, updates) => {
    const venues = loadVenues();
    const index = venues.findIndex(v => v.id === venueId);
    if (index === -1) throw new Error('Venue not found');
    venues[index] = {
      ...venues[index],
      ...updates,
      id: venueId,
      updatedAt: new Date().toISOString()
    };
    saveVenues(venues);
    return venues[index];
  };

  const deleteVenue = (venueId) => {
    const venues = loadVenues();
    const filtered = venues.filter(v => v.id !== venueId);
    if (filtered.length === venues.length) throw new Error('Venue not found');
    saveVenues(filtered);
    return true;
  };

  const getVenueById = (venueId) => {
    return loadVenues().find(v => v.id === venueId) || null;
  };

  const getVenuesByType = (type) => {
    return loadVenues().filter(v => v.type === type);
  };

  return {
    loadVenues,
    createVenue,
    updateVenue,
    deleteVenue,
    getVenueById,
    getVenuesByType,
    DEFAULT_VENUES
  };
})();

window.venuesService = VenuesService;
