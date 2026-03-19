/**
 * VolunteerSelfDashboard.jsx
 * Personal dashboard for logged-in volunteers to view and manage their volunteer commitments.
 */

const { useState, useEffect, useMemo } = React;

const VolunteerSelfDashboard = () => {
        // Add missing categoryFilter state
        const [categoryFilter, setCategoryFilter] = useState('all');
      // Add missing customStart and customEnd state
      const [customStart, setCustomStart] = useState('');
      const [customEnd, setCustomEnd] = useState('');
    // Add missing dateFilter state
    const [dateFilter, setDateFilter] = useState('7days');
  const storage = window.volunteerStorageService;
  const calc = window.volunteerCalculationService;

  // Session & Volunteer State
  const [volunteer, setVolunteer] = useState(null);
  const [sessionValid, setSessionValid] = useState(true);
  const [loading, setLoading] = useState(true);

  // Data State
  const [shifts, setShifts] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [myAssignments, setMyAssignments] = useState([]);

  // UI State
  const [profileExpanded, setProfileExpanded] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null);
  const [detailsModal, setDetailsModal] = useState(false);
  const [cancelModal, setCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [allShiftsModal, setAllShiftsModal] = useState(false);
  const [editProfileModal, setEditProfileModal] = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  const [sessionWarning, setSessionWarning] = useState(false);
  const [editedProfile, setEditedProfile] = useState(null);

  // Session Management
  useEffect(() => {
    const sessionData = sessionStorage.getItem('volunteerSession');

    try {
      const session = JSON.parse(sessionData);
      const now = Date.now();
      
      // Check if session expired (8 hours = 28800000ms)
      if (now - session.loginTime > 28800000) {
        sessionStorage.removeItem('volunteerSession');
        setSessionValid(false);
        setLoading(false);
        window.toast?.warning('Session expired. Please log in again.');
        return;
      }

      // Load volunteer data
      const vol = storage.getVolunteerById?.(session.volunteerId);
      if (!vol) {
        setSessionValid(false);
        setLoading(false);
        return;
      }

      setVolunteer(vol);
      setEditedProfile(vol);
      setLoading(false);

      // Idle timeout warning (30 minutes)
      let idleTimer;
      const resetIdle = () => {
        clearTimeout(idleTimer);
        idleTimer = setTimeout(() => {
          setSessionWarning(true);
          // Auto-logout after 5 more minutes
          setTimeout(() => {
            if (sessionStorage.getItem('volunteerSession')) {
              handleLogout();
              window.toast?.info('Logged out due to inactivity.');
            }
          }, 300000);
        }, 1800000);
      };

      window.addEventListener('mousemove', resetIdle);
      window.addEventListener('keypress', resetIdle);
      resetIdle();

      return () => {
        clearTimeout(idleTimer);
        window.removeEventListener('mousemove', resetIdle);
        window.removeEventListener('keypress', resetIdle);
      };
    } catch(e) {
      console.error('Session error:', e);
      setSessionValid(false);
      setLoading(false);
    }
  }, []);

  // Load shifts and opportunities
  useEffect(() => {
    if (!volunteer) return;
    try {
      const allShifts = storage.getVolunteerShifts?.() || [];
      const allOpps = storage.getVolunteerOpportunities?.() || [];
      const assignments = allShifts.flatMap(s => 
        (s.assignments || []).filter(a => a.volunteerId === volunteer.id)
      );
      setShifts(allShifts);
      setOpportunities(allOpps);
      setMyAssignments(assignments);
    } catch(e) {
      console.error('Data load error:', e);
    }
  }, [volunteer]);

  // Handle invalid session - use effect to notify parent
  // Only run this after initial loading is complete and component should actually be visible
  useEffect(() => {
    // Don't trigger logout during initial mount or loading
    if (loading) return;
    
    if (!sessionValid || !volunteer) {
      sessionStorage.removeItem('volunteerSession');
      // Navigate back to home within the SPA
      window.location.hash = '/';
    }
  }, [sessionValid, volunteer, loading]);

  // Calculate stats
  const stats = useMemo(() => {
    if (!volunteer) return { totalHours: 0, upcomingCount: 0, lastShift: null, thisMonth: 0, thisYear: 0 };

    const now = Date.now();
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
    const yearStart = new Date(new Date().getFullYear(), 0, 1).getTime();

    // Calculate hours from completed shifts with check-in/out
    let totalHours = 0;
    let thisMonthHours = 0;
    let thisYearHours = 0;
    let lastShiftDate = null;

    shifts.forEach(shift => {
      const assignment = (shift.assignments || []).find(a => a.volunteerId === volunteer.id);
      if (!assignment || assignment.status !== 'completed' || !assignment.checkInTime || !assignment.checkOutTime) return;

      const hours = (assignment.checkOutTime - assignment.checkInTime) / 3600000;
      totalHours += hours;

      const shiftDate = new Date(shift.date).getTime();
      if (shiftDate >= monthStart) thisMonthHours += hours;
      if (shiftDate >= yearStart) thisYearHours += hours;

      if (!lastShiftDate || shiftDate > lastShiftDate) {
        lastShiftDate = shiftDate;
      }
    });

    const upcomingShifts = shifts.filter(s => {
      const shiftDate = new Date(s.date).getTime();
      return shiftDate > now && (s.assignments || []).some(a => a.volunteerId === volunteer.id && a.status === 'confirmed');
    });

    return {
      totalHours: Math.round(totalHours * 10) / 10,
      upcomingCount: upcomingShifts.length,
      lastShift: lastShiftDate ? new Date(lastShiftDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : null,
      thisMonth: Math.round(thisMonthHours * 10) / 10,
      thisYear: Math.round(thisYearHours * 10) / 10
    };
  }, [volunteer, shifts]);

  // Milestones
  const milestones = useMemo(() => {
    const levels = [
      { hours: 25, name: 'Bronze', icon: '🥉' },
      { hours: 50, name: 'Silver', icon: '🥈' },
      { hours: 100, name: 'Gold', icon: '🥇' },
      { hours: 250, name: 'Platinum', icon: '💎' },
      { hours: 500, name: 'Diamond', icon: '💠' },
      { hours: 1000, name: 'Legend', icon: '🏆' }
    ];

    const earned = levels.filter(m => stats.totalHours >= m.hours);
    const next = levels.find(m => stats.totalHours < m.hours);

    return { all: levels, earned, next };
  }, [stats.totalHours]);

  // Upcoming shifts
  const upcomingShifts = useMemo(() => {
    if (!volunteer) return [];
    const now = Date.now();
    return shifts
      .filter(s => {
        const shiftDate = new Date(s.date).getTime();
        return shiftDate > now && (s.assignments || []).some(a => a.volunteerId === volunteer.id && ['confirmed','pending'].includes(a.status));
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 5);
  }, [volunteer, shifts]);

  // Available shifts
  const availableShifts = useMemo(() => {
    if (!volunteer) return [];
    const now = Date.now();
    
    // Date filter
    let startDate = now;
    let endDate = now + (7 * 86400000); // 7 days default
    
    if (dateFilter === '30days') {
      endDate = now + (30 * 86400000);
    } else if (dateFilter === 'custom' && customStart && customEnd) {
      startDate = new Date(customStart).getTime();
      endDate = new Date(customEnd).getTime();
    }

    // Category filter
    const volunteerInterests = volunteer.categories || [];

    return shifts
      .filter(s => {
        const shiftDate = new Date(s.date).getTime();
        if (shiftDate < now || shiftDate > endDate) return false;

        // Must have open slots
        const slotsFilled = (s.assignments || []).filter(a => a.status !== 'cancelled').length;
        if (slotsFilled >= s.slotsNeeded) return false;

        // Already signed up?
        if ((s.assignments || []).some(a => a.volunteerId === volunteer.id && a.status !== 'cancelled')) return false;

        // Category filter
        if (categoryFilter === 'interests') {
          const opp = opportunities.find(o => o.id === s.opportunityId);
          if (opp && !volunteerInterests.includes(opp.category)) return false;
        } else if (categoryFilter !== 'all') {
          const opp = opportunities.find(o => o.id === s.opportunityId);
          if (!opp || opp.category !== categoryFilter) return false;
        }

        return true;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [volunteer, shifts, opportunities, dateFilter, customStart, customEnd, categoryFilter]);

  // Recent completed shifts
  const recentShifts = useMemo(() => {
    if (!volunteer) return [];
    return shifts
      .filter(s => {
        const assignment = (s.assignments || []).find(a => a.volunteerId === volunteer.id);
        return assignment && assignment.status === 'completed';
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);
  }, [volunteer, shifts]);

  // Handlers
  function handleLogout() {
    sessionStorage.removeItem('volunteerSession');
    setVolunteer(null);
    setSessionValid(false);
    setLogoutConfirm(false);
    
    // Navigate back to home within the SPA
    window.location.hash = '/';
  }

  function stayLoggedIn() {
    setSessionWarning(false);
    // Update session time
    const sessionData = sessionStorage.getItem('volunteerSession');
    if (sessionData) {
      const session = JSON.parse(sessionData);
      session.loginTime = Date.now();
      sessionStorage.setItem('volunteerSession', JSON.stringify(session));
    }
  }

  function viewShiftDetails(shift) {
    setSelectedShift(shift);
    setDetailsModal(true);
  }

  function requestCancellation(shift) {
    setSelectedShift(shift);
    setCancelReason('');
    setCancelModal(true);
  }

  function confirmCancellation() {
    if (!selectedShift || !volunteer) return;

    try {
      // Find assignment
      const assignment = (selectedShift.assignments || []).find(a => a.volunteerId === volunteer.id);
      if (!assignment) return;

      // Update assignment status
      storage.updateAssignmentStatus?.(selectedShift.id, assignment.id, 'cancelled');

      // Refresh data from storage
      const refreshedShifts = storage.getVolunteerShifts?.() || [];
      setShifts(refreshedShifts);

      window.toast?.success('Shift cancelled. Coordinator has been notified.');
      setCancelModal(false);
      setSelectedShift(null);
      setCancelReason('');
    } catch(e) {
      console.error('Cancellation error:', e);
      window.toast?.error('Failed to cancel shift. Please contact coordinator.');
    }
  }

  function saveProfile() {
    if (!editedProfile || !volunteer) return;

    try {
      storage.updateVolunteerProfile?.(volunteer.id, editedProfile);
      
      // Update local state
      setVolunteer({ ...volunteer, ...editedProfile });
      
      // Update session
      const sessionData = sessionStorage.getItem('volunteerSession');
      if (sessionData) {
        const session = JSON.parse(sessionData);
        sessionStorage.setItem('volunteerSession', JSON.stringify({ ...session, volunteer: { ...volunteer, ...editedProfile } }));
      }

      window.toast?.success('Profile updated!');
      setEditProfileModal(false);
    } catch(e) {
      console.error('Profile update error:', e);
      window.toast?.error('Failed to update profile.');
    }
  }

  function formatShiftTime(shift) {
    const start = new Date(shift.startTime || shift.date);
    const end = new Date(shift.endTime || shift.date + 3600000);
    return `${start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - ${end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  }

  function getOpportunityTitle(oppId) {
    return opportunities.find(o => o.id === oppId)?.title || 'Unknown Opportunity';
  }

  function getCategoryLabel(catId) {
    const labels = {
      events: 'Event Support',
      administrative: 'Administrative',
      outreach: 'Community Outreach',
      technical: 'Technical/IT',
      creative: 'Creative/Design',
      other: 'Other'
    };
    return labels[catId] || catId;
  }

  function canCancelShift(shift) {
    const shiftDate = new Date(shift.date).getTime();
    const now = Date.now();
    const hoursUntil = (shiftDate - now) / 3600000;
    return hoursUntil > 48;
  }

  function scrollToSection(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // Render guards
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto mb-4"></div>
          <div className="text-gray-600">Loading your dashboard...</div>
        </div>
      </div>
    );
  }

  if (!sessionValid || !volunteer) {
    // Return null - the useEffect above will handle the redirect
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg sticky top-0 z-40">
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">Welcome back, {volunteer.firstName}!</h1>
              <p className="text-violet-100 text-sm mt-1">Your volunteer dashboard</p>
            </div>
            <button
              onClick={() => setLogoutConfirm(true)}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Profile Summary Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Total Hours */}
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-violet-600">
            <div className="flex items-center justify-between mb-2">
              <div className="text-3xl">⏱️</div>
              <div className="text-right">
                <div className="text-3xl font-bold text-violet-600">{stats.totalHours}</div>
                <div className="text-sm text-gray-600">hours</div>
              </div>
            </div>
            <div className="text-sm text-gray-600 mt-2">All-time contribution</div>
          </div>

          {/* Upcoming Shifts */}
          <div
            className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-600 cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => scrollToSection('upcoming-shifts')}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-3xl">📅</div>
              <div className="text-right">
                <div className="text-3xl font-bold text-blue-600">{stats.upcomingCount}</div>
                <div className="text-sm text-gray-600">shifts</div>
              </div>
            </div>
            <div className="text-sm text-gray-600 mt-2">Upcoming commitments</div>
          </div>

          {/* Last Shift */}
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-600">
            <div className="flex items-center justify-between mb-2">
              <div className="text-3xl">✓</div>
              <div className="text-right">
                <div className="text-lg font-bold text-green-600">{stats.lastShift || 'No shifts yet'}</div>
              </div>
            </div>
            <div className="text-sm text-gray-600 mt-2">Last completed shift</div>
          </div>
        </div>

        {/* Status Indicator */}
        <div className="bg-white rounded-lg shadow-md p-4 flex items-center justify-between">
          <div className="text-sm text-gray-600">Volunteer Status:</div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            volunteer.status === 'active' ? 'bg-green-100 text-green-800' :
            volunteer.status === 'on-hold' ? 'bg-yellow-100 text-yellow-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {volunteer.status?.charAt(0).toUpperCase() + volunteer.status?.slice(1) || 'Active'}
          </span>
        </div>

        {/* Section 1: Upcoming Shifts */}
        <section id="upcoming-shifts" className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">My Upcoming Shifts</h2>
          
          {upcomingShifts.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📅</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">You don't have any upcoming shifts.</h3>
              <p className="text-gray-600 mb-6">Browse available shifts below to sign up!</p>
              <button
                onClick={() => scrollToSection('available-shifts')}
                className="px-6 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
              >
                Browse Shifts
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {upcomingShifts.map(shift => {
                  const assignment = (shift.assignments || []).find(a => a.volunteerId === volunteer.id);
                  const shiftDate = new Date(shift.date);
                  const canCancel = canCancelShift(shift);

                  return (
                    <div key={shift.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-gray-900">{getOpportunityTitle(shift.opportunityId)}</h3>
                          <div className="text-sm text-gray-600 mt-1 space-y-1">
                            <div>📅 {shiftDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</div>
                            <div>⏰ {formatShiftTime(shift)}</div>
                            {shift.location && <div>📍 {shift.location}</div>}
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          assignment?.status === 'confirmed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {assignment?.status === 'confirmed' ? 'Confirmed' : 'Pending Confirmation'}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => viewShiftDetails(shift)}
                          className="px-4 py-2 bg-violet-600 text-white rounded text-sm hover:bg-violet-700 transition-colors"
                        >
                          View Details
                        </button>
                        {canCancel ? (
                          <button
                            onClick={() => requestCancellation(shift)}
                            className="px-4 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
                          >
                            Request Cancellation
                          </button>
                        ) : (
                          <button
                            disabled
                            className="px-4 py-2 bg-gray-300 text-gray-600 rounded text-sm cursor-not-allowed"
                            title="Contact coordinator to cancel (less than 48 hours)"
                          >
                            Contact to Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {stats.upcomingCount > 5 && (
                <button
                  onClick={() => setAllShiftsModal(true)}
                  className="mt-4 text-violet-700 hover:underline text-sm"
                >
                  View All {stats.upcomingCount} Upcoming Shifts →
                </button>
              )}
            </>
          )}
        </section>

        {/* Section 2: Available Shifts */}
        <section id="available-shifts" className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Available Shifts You Can Sign Up For</h2>

          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6 pb-6 border-b">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date Range:</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setDateFilter('7days')}
                  className={`px-3 py-1 rounded text-sm ${dateFilter === '7days' ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  Next 7 Days
                </button>
                <button
                  onClick={() => setDateFilter('30days')}
                  className={`px-3 py-1 rounded text-sm ${dateFilter === '30days' ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  Next 30 Days
                </button>
                <button
                  onClick={() => setDateFilter('custom')}
                  className={`px-3 py-1 rounded text-sm ${dateFilter === 'custom' ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  Custom
                </button>
              </div>
              {dateFilter === 'custom' && (
                <div className="flex gap-2 mt-2">
                  <input
                    type="date"
                    value={customStart}
                    onChange={e => setCustomStart(e.target.value)}
                    className="border rounded px-2 py-1 text-sm"
                  />
                  <input
                    type="date"
                    value={customEnd}
                    onChange={e => setCustomEnd(e.target.value)}
                    className="border rounded px-2 py-1 text-sm"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category:</label>
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="border rounded px-3 py-1 text-sm bg-white"
              >
                <option value="all">All Categories</option>
                <option value="interests">My Interests</option>
                <option value="events">Event Support</option>
                <option value="administrative">Administrative</option>
                <option value="outreach">Community Outreach</option>
                <option value="technical">Technical/IT</option>
                <option value="creative">Creative/Design</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {/* Available Shifts Grid */}
          {availableShifts.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No available shifts match your interests right now.</h3>
              <p className="text-gray-600 mb-6">Check back soon or update your interests in your profile.</p>
              <button
                onClick={() => { setProfileExpanded(true); scrollToSection('my-profile'); }}
                className="px-6 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
              >
                Update Profile
              </button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableShifts.map(shift => {
                const opp = opportunities.find(o => o.id === shift.opportunityId);
                const slotsFilled = (shift.assignments || []).filter(a => a.status !== 'cancelled').length;
                const slotsAvailable = shift.slotsNeeded - slotsFilled;

                return (
                  <div key={shift.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <h3 className="font-bold text-gray-900 mb-2">{getOpportunityTitle(shift.opportunityId)}</h3>
                    <div className="text-sm text-gray-600 space-y-1 mb-3">
                      <div>📅 {new Date(shift.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                      <div>⏰ {formatShiftTime(shift)}</div>
                      {shift.location && <div>📍 {shift.location}</div>}
                      <div className="font-medium text-violet-700">{slotsAvailable} of {shift.slotsNeeded} spots available</div>
                    </div>
                    {opp && (
                      <span className="inline-block px-2 py-1 bg-violet-100 text-violet-700 rounded text-xs mb-3">
                        {getCategoryLabel(opp.category)}
                      </span>
                    )}
                    <button
                      onClick={() => {
                        window.toast?.info('Sign-up flow to be implemented');
                        // TODO: Open ShiftSignUpFlow modal
                      }}
                      className="w-full px-4 py-2 bg-violet-600 text-white rounded hover:bg-violet-700 transition-colors text-sm"
                    >
                      Sign Up
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Section 3: My Profile */}
        <section id="my-profile" className="bg-white rounded-lg shadow-md">
          <button
            onClick={() => setProfileExpanded(!profileExpanded)}
            className="w-full p-6 flex justify-between items-center hover:bg-gray-50 transition-colors"
          >
            <h2 className="text-2xl font-bold text-gray-900">My Profile</h2>
            <span className="text-2xl">{profileExpanded ? '▼' : '▶'}</span>
          </button>

          {profileExpanded && (
            <div className="p-6 pt-0 space-y-4 border-t">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium text-gray-700">Name</label>
                  <div className="text-gray-900">{volunteer.firstName} {volunteer.lastName}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Email</label>
                  <div className="text-gray-900">{volunteer.email}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Phone</label>
                  <div className="text-gray-900">{volunteer.phone || '—'}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Preferred Contact</label>
                  <div className="text-gray-900">{volunteer.preferredContact || 'Email'}</div>
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-700">Availability</label>
                  <div className="text-gray-900">
                    {volunteer.availability ? 
                      `Available ${Object.keys(volunteer.availability).filter(k => volunteer.availability[k]).join(', ')}` :
                      'Not specified'
                    }
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-700">Interests</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {(volunteer.categories || []).length > 0 ? (
                      (volunteer.categories || []).map(cat => (
                        <span key={cat} className="px-2 py-1 bg-violet-100 text-violet-700 rounded text-sm">
                          {getCategoryLabel(cat)}
                        </span>
                      ))
                    ) : (
                      <span className="text-gray-500">None specified</span>
                    )}
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-700">Skills</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {(volunteer.skills || []).length > 0 ? (
                      (volunteer.skills || []).map(skill => (
                        <span key={skill} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">
                          {skill}
                        </span>
                      ))
                    ) : (
                      <span className="text-gray-500">None specified</span>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setEditProfileModal(true)}
                className="mt-4 px-6 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
              >
                Update My Profile
              </button>
            </div>
          )}
        </section>

        {/* Section 4: Hours Tracker */}
        <section id="hours-tracker" className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">My Volunteer Hours</h2>

          {/* Stats Cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="text-center p-4 bg-gradient-to-br from-violet-50 to-purple-50 rounded-lg">
              <div className="text-4xl font-bold text-violet-600">{stats.totalHours}</div>
              <div className="text-sm text-gray-600 mt-1">Total Hours - All Time</div>
              <div className="text-xs text-gray-500 mt-1">Since {volunteer.createdAt ? new Date(volunteer.createdAt).toLocaleDateString() : 'joining'}</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg">
              <div className="text-4xl font-bold text-blue-600">{stats.thisMonth}</div>
              <div className="text-sm text-gray-600 mt-1">Hours This Month</div>
              <div className="text-xs text-gray-500 mt-1">{new Date().toLocaleString('en-US', { month: 'long' })}</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg">
              <div className="text-4xl font-bold text-green-600">{stats.thisYear}</div>
              <div className="text-sm text-gray-600 mt-1">Hours This Year</div>
              <div className="text-xs text-gray-500 mt-1">{new Date().getFullYear()}</div>
            </div>
          </div>

          {/* Milestone Badges */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Achievements</h3>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
              {milestones.all.map(milestone => {
                const earned = stats.totalHours >= milestone.hours;
                return (
                  <div
                    key={milestone.hours}
                    className={`text-center p-4 rounded-lg border-2 ${
                      earned ? 'border-violet-600 bg-violet-50' : 'border-gray-200 bg-gray-50 opacity-50'
                    }`}
                  >
                    <div className="text-4xl mb-2">{milestone.icon}</div>
                    <div className={`font-medium text-sm ${earned ? 'text-violet-700' : 'text-gray-500'}`}>
                      {milestone.name}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">{milestone.hours} hrs</div>
                  </div>
                );
              })}
            </div>

            {/* Next Milestone Progress */}
            {milestones.next ? (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Progress to {milestones.next.name} {milestones.next.icon}</span>
                  <span className="font-medium text-violet-700">{stats.totalHours} / {milestones.next.hours} hours</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-violet-600 h-3 rounded-full transition-all"
                    style={{ width: `${Math.min((stats.totalHours / milestones.next.hours) * 100, 100)}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-600 mt-2">
                  {milestones.next.hours - stats.totalHours} hours until your {milestones.next.hours}-hour {milestones.next.name} badge!
                </div>
              </div>
            ) : (
              <div className="mt-6 p-4 bg-gradient-to-r from-violet-50 to-purple-50 rounded-lg text-center">
                <div className="text-2xl mb-2">🎉</div>
                <div className="font-semibold text-violet-700">You've earned all milestones!</div>
                <div className="text-sm text-gray-600 mt-1">Keep up the amazing work!</div>
              </div>
            )}
          </div>

          {/* Recent Shifts Table */}
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Recent Shifts</h3>
            {recentShifts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No completed shifts yet</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left p-3">Date</th>
                      <th className="text-left p-3">Opportunity</th>
                      <th className="text-left p-3">Hours</th>
                      <th className="text-left p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentShifts.map(shift => {
                      const assignment = (shift.assignments || []).find(a => a.volunteerId === volunteer.id);
                      const hours = assignment?.checkInTime && assignment?.checkOutTime ?
                        Math.round(((assignment.checkOutTime - assignment.checkInTime) / 3600000) * 10) / 10 : 0;

                      return (
                        <tr key={shift.id} className="border-b hover:bg-gray-50">
                          <td className="p-3">{new Date(shift.date).toLocaleDateString()}</td>
                          <td className="p-3">{getOpportunityTitle(shift.opportunityId)}</td>
                          <td className="p-3 font-medium">{hours}</td>
                          <td className="p-3">
                            <span className="text-green-600">✓ Completed</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* Section 5: Impact Message */}
        <section className="bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-lg shadow-md p-8 text-center">
          <div className="text-5xl mb-4">❤️</div>
          <h2 className="text-2xl font-bold mb-4">Thank You for Your Service!</h2>
          <p className="text-lg mb-2">Thank you for contributing {stats.totalHours} hours to our organization!</p>
          <p className="text-violet-100">Your support makes a real difference in our community.</p>
        </section>

        {/* Dashboard Footer */}
        <footer className="bg-white rounded-lg shadow-md p-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-center md:text-left">
              <div className="text-sm font-medium text-gray-900 mb-1">Need help?</div>
              <div className="text-sm text-gray-600">
                Contact: <a href="mailto:volunteer@showsuite.org" className="text-violet-700 hover:underline">volunteer@showsuite.org</a>
              </div>
              <div className="text-sm text-gray-600">Phone: (555) 123-4567</div>
            </div>
            <button
              onClick={() => setLogoutConfirm(true)}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Logout
            </button>
          </div>
        </footer>

        {/* End of main content container */}
      </div>

      {/* Modals */}
      
      {/* Shift Details Modal */}
      {detailsModal && selectedShift && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setDetailsModal(false)}>
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-2xl font-bold text-gray-900">{getOpportunityTitle(selectedShift.opportunityId)}</h3>
                <button onClick={() => setDetailsModal(false)} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
              </div>
              
              <div className="space-y-4 text-sm">
                <div>
                  <label className="font-medium text-gray-700">Date:</label>
                  <div className="text-gray-900">{new Date(selectedShift.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</div>
                </div>
                <div>
                  <label className="font-medium text-gray-700">Time:</label>
                  <div className="text-gray-900">{formatShiftTime(selectedShift)}</div>
                </div>
                {selectedShift.location && (
                  <div>
                    <label className="font-medium text-gray-700">Location:</label>
                    <div className="text-gray-900">{selectedShift.location}</div>
                  </div>
                )}
                {selectedShift.instructions && (
                  <div>
                    <label className="font-medium text-gray-700">Instructions:</label>
                    <div className="text-gray-900">{selectedShift.instructions}</div>
                  </div>
                )}
                {selectedShift.contactPerson && (
                  <div>
                    <label className="font-medium text-gray-700">Contact Person:</label>
                    <div className="text-gray-900">{selectedShift.contactPerson}</div>
                    {selectedShift.contactEmail && (
                      <div className="text-gray-900">
                        <a href={`mailto:${selectedShift.contactEmail}`} className="text-violet-700 hover:underline">
                          {selectedShift.contactEmail}
                        </a>
                      </div>
                    )}
                  </div>
                )}
                {selectedShift.requirements && (
                  <div>
                    <label className="font-medium text-gray-700">Requirements:</label>
                    <div className="text-gray-900">{selectedShift.requirements}</div>
                  </div>
                )}
              </div>

              <button
                onClick={() => setDetailsModal(false)}
                className="mt-6 w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancellation Modal */}
      {cancelModal && selectedShift && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setCancelModal(false)}>
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Cancel Shift</h3>
              <p className="text-gray-700 mb-4">
                Are you sure you want to cancel this shift?
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4 text-sm text-yellow-800">
                ⚠️ Cancelling may affect your volunteer standing. Please only cancel if absolutely necessary.
              </div>
              
              <label className="block text-sm font-medium text-gray-700 mb-2">Reason (optional):</label>
              <textarea
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                placeholder="Let us know why you need to cancel..."
                className="w-full border rounded p-2 text-sm mb-4"
                rows="3"
              />

              <div className="flex gap-2">
                <button
                  onClick={confirmCancellation}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Confirm Cancellation
                </button>
                <button
                  onClick={() => setCancelModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Nevermind
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {editProfileModal && editedProfile && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setEditProfileModal(false)}>
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Edit Profile</h3>
              
              <div className="space-y-4">
                {/* Availability */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Availability (Days):</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => (
                      <label key={day} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={editedProfile.availability?.[day] || false}
                          onChange={e => setEditedProfile({
                            ...editedProfile,
                            availability: { ...editedProfile.availability, [day]: e.target.checked }
                          })}
                        />
                        <span className="text-sm capitalize">{day}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Interests */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Interests:</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['events', 'administrative', 'outreach', 'technical', 'creative', 'other'].map(cat => (
                      <label key={cat} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={(editedProfile.categories || []).includes(cat)}
                          onChange={e => {
                            const cats = editedProfile.categories || [];
                            setEditedProfile({
                              ...editedProfile,
                              categories: e.target.checked ? [...cats, cat] : cats.filter(c => c !== cat)
                            });
                          }}
                        />
                        <span className="text-sm">{getCategoryLabel(cat)}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Preferred Contact */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Contact Method:</label>
                  <select
                    value={editedProfile.preferredContact || 'email'}
                    onChange={e => setEditedProfile({ ...editedProfile, preferredContact: e.target.value })}
                    className="border rounded px-3 py-2 w-full"
                  >
                    <option value="email">Email</option>
                    <option value="phone">Phone</option>
                    <option value="text">Text Message</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  onClick={saveProfile}
                  className="flex-1 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => setEditProfileModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Logout Confirmation */}
      {logoutConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Confirm Logout</h3>
            <p className="text-gray-700 mb-6">Are you sure you want to log out?</p>
            <div className="flex gap-2">
              <button
                onClick={handleLogout}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Yes, Logout
              </button>
              <button
                onClick={() => setLogoutConfirm(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Session Warning */}
      {sessionWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Session Expiring Soon</h3>
            <p className="text-gray-700 mb-6">Your session will expire in 5 minutes due to inactivity. Would you like to stay logged in?</p>
            <div className="flex gap-2">
              <button
                onClick={stayLoggedIn}
                className="flex-1 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
              >
                Stay Logged In
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

window.VolunteerSelfDashboard = VolunteerSelfDashboard;
