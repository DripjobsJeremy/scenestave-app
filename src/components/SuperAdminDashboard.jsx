const { useState, useEffect, useMemo } = React;

function SuperAdminDashboard({ userRole = 'admin' }) {
  const [productions, setProductions] = useState([]);
  const [donations, setDonations] = useState([]);
  const [donors, setDonors] = useState([]);
  const [actors, setActors] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [showAddDonationModal, setShowAddDonationModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = () => {
    console.log('📊 Dashboard: loadDashboardData called');
    const allProductions = JSON.parse(localStorage.getItem('showsuite_productions') || '[]');
    const allDonations = window.donationsService?.loadDonations() || [];
    const allContacts = window.contactsService?.loadContacts() || [];
    const allActors = window.actorsService?.loadActors() || [];

    console.log('   - Loaded donations:', allDonations.length);
    console.log('   - Last donation:', allDonations[allDonations.length - 1]);

    setProductions([...allProductions]);
    setDonations([...allDonations]);
    setDonors([...allContacts.filter(c => c.isDonor)]);
    setActors([...allActors]);

    // Collect upcoming events using timezone-safe string comparison
    const todayStr = (() => {
      const d = new Date();
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    })();

    const events = [];
    allProductions.forEach(prod => {
      if (prod.calendar) {
        prod.calendar.forEach(event => {
          const dateStr = (event.start || event.date || '').split('T')[0];
          if (dateStr >= todayStr) {
            events.push({ ...event, productionTitle: prod.title, productionId: prod.id });
          }
        });
      }
    });

    events.sort((a, b) => {
      const da = (a.start || a.date || '').split('T')[0];
      const db = (b.start || b.date || '').split('T')[0];
      return da.localeCompare(db);
    });
    setUpcomingEvents(events.slice(0, 5));

    console.log('   ✅ Dashboard state updated');
    setRefreshKey(prev => prev + 1);
    console.log('   🔄 Triggered re-render');
  };

  const metrics = useMemo(() => {
    console.log('📊 Recalculating metrics...');

    const todayStr = (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    })();

    const activeProductions = productions.filter(p => {
      const s = (p.status || '').toLowerCase();
      return ['active', 'in rehearsal', 'in production', 'tech week', 'running', 'open'].includes(s);
    });

    const thisYear = new Date().getFullYear();
    const donationsThisYear = donations.filter(d => new Date(d.date).getFullYear() === thisYear);
    const totalThisYear = donationsThisYear.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
    const totalDonations = donations.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);

    const approvedActors = actors.filter(a => a.status === 'approved');
    const pendingActors = actors.filter(a => a.status === 'pending');

    const recentDonations = [...donations]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);

    console.log('   💰 Total this year:', totalThisYear);
    console.log('   📝 Recent donations:', recentDonations.length);

    return {
      activeProductions,
      todayStr,
      donationsThisYear,
      totalThisYear,
      totalDonations,
      approvedActors,
      pendingActors,
      recentDonations
    };
  }, [productions, donations, donors, actors, refreshKey]);

  const formatDate = (dateStr) => {
    const parts = String(dateStr).split('T')[0].split('-').map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    return {
      month: d.toLocaleDateString('en-US', { month: 'short' }),
      day: d.getDate()
    };
  };

  const eventTypeBadge = (type) => {
    const map = {
      show: 'bg-purple-100 text-purple-700',
      rehearsal: 'bg-blue-100 text-blue-700',
      audition: 'bg-pink-100 text-pink-700',
      tech: 'bg-orange-100 text-orange-700'
    };
    return map[type] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Welcome back! Here's what's happening with your theatre.</p>
      </div>

      {/* Key Metrics */}
      <div key={`metrics-${refreshKey}`} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div
          className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-lg shadow-lg p-6 text-white cursor-pointer hover:ring-2 hover:ring-violet-400 hover:shadow-xl transition-all duration-150"
          onClick={() => { window.location.hash = '#/productions'; }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium opacity-90">Active Productions</h3>
            <span className="text-3xl">🎭</span>
          </div>
          <div className="text-3xl font-bold mb-1">{metrics.activeProductions.length}</div>
          <p className="text-sm opacity-75">{productions.length} total productions</p>
        </div>

        <div
          className="bg-gradient-to-br from-green-500 to-green-700 rounded-lg shadow-lg p-6 text-white cursor-pointer hover:ring-2 hover:ring-green-300 hover:shadow-xl transition-all duration-150"
          onClick={() => { window.location.hash = '#/financial?view=donations'; }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium opacity-90">Donations (YTD)</h3>
            <span className="text-3xl">💰</span>
          </div>
          <div className="text-3xl font-bold mb-1">${metrics.totalThisYear.toLocaleString()}</div>
          <p className="text-sm opacity-75">{metrics.donationsThisYear.length} donations this year</p>
        </div>

        <div
          className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg shadow-lg p-6 text-white cursor-pointer hover:ring-2 hover:ring-blue-300 hover:shadow-xl transition-all duration-150"
          onClick={() => { window.location.hash = '#/financial?view=donors'; }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium opacity-90">Active Donors</h3>
            <span className="text-3xl">👥</span>
          </div>
          <div className="text-3xl font-bold mb-1">{donors.length}</div>
          <p className="text-sm opacity-75">Total lifetime: ${metrics.totalDonations.toLocaleString()}</p>
        </div>

        <div
          className="bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-lg shadow-lg p-6 text-white cursor-pointer hover:ring-2 hover:ring-indigo-300 hover:shadow-xl transition-all duration-150"
          onClick={() => { window.location.hash = '#/actors'; }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium opacity-90">Actor Roster</h3>
            <span className="text-3xl">🎬</span>
          </div>
          <div className="text-3xl font-bold mb-1">{metrics.approvedActors.length}</div>
          {metrics.pendingActors.length > 0 ? (
            <p className="text-sm font-semibold text-amber-300">{metrics.pendingActors.length} pending approval</p>
          ) : (
            <p className="text-sm opacity-75">0 pending approval</p>
          )}
        </div>
      </div>

      {/* Client Organizations — only when Venue Operator Mode is enabled */}
      {(() => {
        let org = {};
        try { org = JSON.parse(localStorage.getItem('showsuite_organization') || '{}'); } catch {}
        if (!org.managesClientOrgs) return null;
        const clientOrgs = org.clientOrganizations || [];
        if (clientOrgs.length === 0) return (
          <div className="rounded-lg border border-gray-200 bg-white p-6 text-center shadow-sm">
            <div className="text-3xl mb-2">🏛️</div>
            <p className="font-medium text-gray-900">No client organizations yet</p>
            <p className="text-sm mt-1 mb-3 text-gray-500">
              Add client organizations in Settings → Organization Profile → Clients
            </p>
            <button
              type="button"
              onClick={() => { window.location.hash = '#/settings'; }}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Add Client Organization
            </button>
          </div>
        );
        return (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">🏛️ Client Organizations</h2>
                <p className="text-sm text-gray-500">
                  {clientOrgs.length} client organization{clientOrgs.length !== 1 ? 's' : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => { window.location.hash = '#/settings'; }}
                className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Manage →
              </button>
            </div>
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
              {clientOrgs.map(org => {
                const clientProds = productions.filter(p => p.clientOrgId === org.id || p.clientOrg === org.name);
                return (
                  <div
                    key={org.id}
                    className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md hover:border-violet-300 transition-all cursor-pointer"
                    onClick={() => { window.location.hash = '#/settings'; }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 truncate">{org.name}</div>
                        {org.contactName && (
                          <div className="text-xs text-gray-500 mt-0.5">👤 {org.contactName}</div>
                        )}
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ml-2 flex-shrink-0 font-medium ${
                        org.isActive !== false
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {org.isActive !== false ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    {org.email && (
                      <div className="text-xs text-gray-500 mb-1">✉️ {org.email}</div>
                    )}
                    {org.phone && (
                      <div className="text-xs text-gray-500 mb-1">📞 {org.phone}</div>
                    )}
                    {clientProds.length > 0 && (
                      <div className="text-xs text-gray-400 mt-2 pt-2 border-t border-gray-100">
                        🎭 {clientProds.length} production{clientProds.length !== 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Upcoming Events + Recent Donations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Events */}
        <div key={`events-${refreshKey}`} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Upcoming Events</h2>
            <span className="text-2xl">📅</span>
          </div>
          {upcomingEvents.length > 0 ? (
            <div className="space-y-3">
              {upcomingEvents.map((event, idx) => {
                const { month, day } = formatDate(event.start || event.date);
                return (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                    onClick={() => { window.location.hash = `/productions/${event.productionId}?tab=calendar`; }}
                    title={`Open ${event.productionTitle} calendar`}
                  >
                    <div className="flex-shrink-0 w-12 text-center">
                      <div className="text-xs text-gray-500 font-medium">{month}</div>
                      <div className="text-xl font-bold text-gray-900">{day}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">{event.title}</div>
                      <div className="text-sm text-gray-600">{event.productionTitle}</div>
                      <div className="text-xs text-gray-500">
                        {event.startTime || 'All day'} &bull; {event.location || 'TBD'}
                      </div>
                    </div>
                    <span className={`flex-shrink-0 px-2 py-1 rounded text-xs font-medium ${eventTypeBadge(event.type)}`}>
                      {event.type}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <div className="text-4xl mb-2">📅</div>
              <p>No upcoming events scheduled</p>
            </div>
          )}
        </div>

        {/* Recent Donations */}
        <div key={`donations-${refreshKey}`} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Donations</h2>
            <span className="text-2xl">💵</span>
          </div>
          {metrics.recentDonations.length > 0 ? (
            <div className="space-y-3">
              {metrics.recentDonations.map((donation, idx) => {
                const donor = donors.find(d => d.id === donation.donorId || d.id === donation.contactId);
                return (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">
                        {donor ? `${donor.firstName || ''} ${donor.lastName || ''}`.trim() || donor.name || 'Anonymous' : 'Anonymous'}
                      </div>
                      <div className="text-sm text-gray-600">
                        {new Date(donation.date).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-lg font-bold text-green-600">
                      ${parseFloat(donation.amount || 0).toLocaleString()}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <div className="text-4xl mb-2">💵</div>
              <p>No donations recorded yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Budget Overview Widget */}
      {window.BudgetDashboardWidget && (
        <div className="lg:col-span-2">
          {React.createElement(window.BudgetDashboardWidget, { userRole })}
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => window.location.hash = '/productions'}
            className="flex flex-col items-center gap-2 p-5 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors border border-purple-200 cursor-pointer"
          >
            <span className="text-3xl">🎭</span>
            <span className="text-sm font-medium text-purple-900">Productions</span>
          </button>
          <button
            onClick={() => setShowAddDonationModal(true)}
            className="flex flex-col items-center gap-2 p-5 bg-green-50 hover:bg-green-100 rounded-lg transition-colors border border-green-200 cursor-pointer"
          >
            <span className="text-3xl">💰</span>
            <span className="text-sm font-medium text-green-900">Log Donation</span>
          </button>
          <button
            onClick={() => window.location.hash = '/actors'}
            className="flex flex-col items-center gap-2 p-5 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200 cursor-pointer"
          >
            <span className="text-3xl">🎬</span>
            <span className="text-sm font-medium text-blue-900">Actors</span>
          </button>
          <button
            onClick={() => window.location.hash = '/donors'}
            className="flex flex-col items-center gap-2 p-5 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-200 cursor-pointer"
          >
            <span className="text-3xl">👥</span>
            <span className="text-sm font-medium text-indigo-900">Donors</span>
          </button>
        </div>
      </div>

      {/* Active Productions */}
      {metrics.activeProductions.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Active Productions</h2>
          <div className="grid gap-4">
            {metrics.activeProductions.map(prod => {
              const nextShow = prod.calendar
                ?.filter(e => {
                  const dateStr = (e.start || e.date || '').split('T')[0];
                  return e.type === 'show' && dateStr >= metrics.todayStr;
                })
                .sort((a, b) => {
                  const da = (a.start || a.date || '').split('T')[0];
                  const db = (b.start || b.date || '').split('T')[0];
                  return da.localeCompare(db);
                })[0];

              const rehearsalCount = prod.calendar?.filter(e => e.type === 'rehearsal').length || 0;
              const nextShowDate = nextShow
                ? (() => {
                    const { month, day } = formatDate(nextShow.start || nextShow.date);
                    return `${month} ${day}`;
                  })()
                : null;

              return (
                <div key={prod.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{prod.title}</h3>
                    <div className="text-sm text-gray-600 mt-1">
                      {prod.author && `by ${prod.author} \u2022 `}
                      {rehearsalCount} rehearsals scheduled
                    </div>
                  </div>
                  {nextShowDate && (
                    <div className="text-right">
                      <div className="text-sm text-gray-500">Next Show</div>
                      <div className="font-semibold text-purple-600">{nextShowDate}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add Donation Modal */}
      {showAddDonationModal && (() => {
        const DonationModal = window.AddDonationModal;
        if (!DonationModal) {
          console.error('❌ AddDonationModal component not found on window!');
          return null;
        }
        return (
          <DonationModal
            onClose={() => {
              console.log('🚪 Dashboard: Modal onClose called');
              setShowAddDonationModal(false);
              console.log('📊 Dashboard: Reloading data after close...');
              loadDashboardData();
            }}
            onSave={(donation) => {
              console.log('💾 Dashboard: Modal onSave called with donation:', donation);
              console.log('📊 Dashboard: Reloading data immediately...');
              loadDashboardData();
            }}
          />
        );
      })()}
    </div>
  );
}

window.SuperAdminDashboard = SuperAdminDashboard;
