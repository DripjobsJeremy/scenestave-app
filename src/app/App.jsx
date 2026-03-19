const { useState, useEffect } = React;

function ActorPortalView() {
  const [portalView, setPortalView] = useState('dashboard');
  const [refreshKey, setRefreshKey] = useState(0);

  const session = window.actorAuthService?.loadSession();
  const currentActor = session ? window.actorAuthService?.getCurrentActor() : null;

  if (!currentActor) {
    return window.ActorLogin ? React.createElement(window.ActorLogin, {
      onLoginSuccess: (actor) => {
        console.log('Actor logged in:', actor);
        window.location.reload();
      }
    }) : null;
  }

  // Set global navigation handler for calendar
  window.onNavigateToCalendar = () => setPortalView('calendar');

  if (portalView === 'calendar' && window.ActorPersonalCalendar) {
    return React.createElement(window.ActorPersonalCalendar, {
      actor: currentActor,
      onBack: () => setPortalView('dashboard')
    });
  }

  if (portalView === 'edit-profile' && window.ActorSelfProfileEditor) {
    return React.createElement(window.ActorSelfProfileEditor, {
      actor: currentActor,
      onSave: (updatedActor) => {
        console.log('Profile saved:', updatedActor);
        window.actorAuthService.updateSession(updatedActor);
        setRefreshKey(k => k + 1);
        setPortalView('dashboard');
      },
      onCancel: () => {
        setPortalView('dashboard');
      }
    });
  }

  return window.ActorSelfDashboard ? React.createElement(window.ActorSelfDashboard, {
    key: refreshKey,
    actor: currentActor,
    onEditProfile: () => {
      setPortalView('edit-profile');
    },
    onLogout: () => {
      window.actorAuthService.logout();
      window.location.reload();
    }
  }) : null;
}

function VolunteerPortalView() {
  console.log('📍 Rendering VolunteerPortalView');
  console.log('   - window.VolunteerPortalHome:', typeof window.VolunteerPortalHome);
  console.log('   - window.VolunteerSelfDashboard:', typeof window.VolunteerSelfDashboard);

  const hasSession = (() => {
    try {
      const session = JSON.parse(sessionStorage.getItem('volunteerSession'));
      const valid = session && (Date.now() - session.loginTime < 28800000);
      console.log('   - volunteerSession:', valid ? 'valid' : 'none/expired');
      return valid;
    } catch (_) {
      console.log('   - volunteerSession: parse error');
      return false;
    }
  })();

  if (!hasSession) {
    console.log('   → No session: rendering VolunteerPortalHome');
    return window.VolunteerPortalHome ? React.createElement(window.VolunteerPortalHome) : (
      <div className="text-center py-20 text-gray-400">
        <div className="text-5xl mb-4">🤝</div>
        <h2 className="text-xl font-semibold text-gray-600 mb-2">Volunteer Portal</h2>
        <p className="text-sm">Please log in to access your volunteer dashboard.</p>
      </div>
    );
  }

  console.log('   → Session valid: rendering VolunteerSelfDashboard');
  return window.VolunteerSelfDashboard ? (
    React.createElement(window.VolunteerSelfDashboard)
  ) : null;
}

// Returns role-specific nav items (Settings always rendered separately at bottom)
function getNavigationTabs(userRole) {
  // venue_manager = Super Admin (full access, same as admin/super_admin)
  if (userRole === 'admin' || userRole === 'super_admin' || userRole === 'venue_manager') {
    return [
      { id: 'dashboard',     label: 'Dashboard',     icon: '🏠', path: '/' },
      { id: 'calendar',      label: 'Calendar',      icon: '📅', path: '/calendar' },
      { id: 'financial',     label: 'Financial',     icon: '💰', path: '/financial' },
      { id: 'productions',   label: 'Productions',   icon: '🎬', path: '/productions' },
      { id: 'actors',        label: 'Actors',        icon: '🎭', path: '/actors' },
      { id: 'volunteers',    label: 'Volunteers',    icon: '🤝', path: '/volunteers' },
      { id: 'donors',        label: 'Donors',        icon: '👥', path: '/donors' },
      { id: 'donor-portal',  label: 'Donor Portal',  icon: '💎', path: '/donor-portal' },
    ];
  }

  // board_member = Admin without Settings/Import access
  if (userRole === 'board_member') {
    return [
      { id: 'dashboard',    label: 'Dashboard',    icon: '🏠', path: '/' },
      { id: 'calendar',     label: 'Calendar',     icon: '📅', path: '/calendar' },
      { id: 'financial',    label: 'Financial',    icon: '💰', path: '/financial' },
      { id: 'productions',  label: 'Productions',  icon: '🎬', path: '/productions' },
      { id: 'actors',       label: 'Actors',       icon: '🎭', path: '/actors' },
      { id: 'volunteers',   label: 'Volunteers',   icon: '🤝', path: '/volunteers' },
      { id: 'donors',       label: 'Donors',       icon: '👥', path: '/donors' },
    ];
  }

  // accounting_manager = Financial and Donors read-only
  if (userRole === 'accounting_manager') {
    return [
      { id: 'dashboard',    label: 'Dashboard',    icon: '🏠', path: '/' },
      { id: 'financial',    label: 'Financial',    icon: '💰', path: '/financial' },
      { id: 'donors',       label: 'Donors',       icon: '👥', path: '/donors' },
    ];
  }

  const deptRoles = ['lighting', 'sound', 'wardrobe', 'props', 'set', 'stage_manager'];
  if (deptRoles.includes(userRole)) {
    const deptLabels = {
      lighting:      'Lighting Designer',
      sound:         'Sound Designer',
      wardrobe:      'Wardrobe Designer',
      props:         'Props Manager',
      set:           'Set Designer',
      stage_manager: 'Stage Manager'
    };
    return [
      { id: 'department-portal', label: `${deptLabels[userRole]} Portal`, icon: '🎨', path: '/department-portal' },
      { id: 'productions',       label: 'Productions',                    icon: '🎬', path: '/productions' },
      { id: 'calendar',          label: 'Calendar',                       icon: '📅', path: '/calendar' },
    ];
  }

  if (userRole === 'actor') {
    return [
      { id: 'actor-portal', label: 'Actor Portal',  icon: '🎭', path: '/actor-portal' },
      { id: 'productions',  label: 'Productions',   icon: '🎬', path: '/productions' },
      { id: 'calendar',     label: 'Calendar',      icon: '📅', path: '/calendar' },
    ];
  }

  if (userRole === 'volunteer') {
    return [
      { id: 'volunteer-portal', label: 'Volunteer Portal', icon: '🤝', path: '/volunteer-portal' },
      { id: 'calendar',         label: 'Calendar',         icon: '📅', path: '/calendar' },
    ];
  }

  // Default fallback — same as admin
  return [
    { id: 'dashboard',    label: 'Dashboard',    icon: '🏠', path: '/' },
    { id: 'calendar',     label: 'Calendar',     icon: '📅', path: '/calendar' },
    { id: 'financial',    label: 'Financial',    icon: '💰', path: '/financial' },
    { id: 'productions',  label: 'Productions',  icon: '🎬', path: '/productions' },
    { id: 'actors',       label: 'Actors',       icon: '🎭', path: '/actors' },
    { id: 'volunteers',   label: 'Volunteers',   icon: '🤝', path: '/volunteers' },
    { id: 'donors',       label: 'Donors',       icon: '👥', path: '/donors' },
  ];
}

function App() {
  const [appData, setAppData] = useState({
    contacts: [],
    donations: [],
    campaigns: [],
    donorLevels: []
  });

  const [userRole, setUserRole] = useState(() => {
    return localStorage.getItem('showsuite_user_role') || 'admin';
  });

  // React Router v5 hooks
  const history = useHistory();
  const location = useLocation();

  // Derive currentView from URL path
  const getViewFromPath = (pathname) => {
    const path = pathname.split('/')[1] || 'dashboard';
    const validViews = [
      'dashboard', 'financial', 'donors', 'actors', 'productions',
      'volunteers', 'settings', 'actor-portal', 'calendar',
      'department-portal', 'volunteer-portal', 'donor-portal', 'donor-login'
    ];
    return validViews.includes(path) ? path : 'dashboard';
  };

  const currentView = getViewFromPath(location.pathname);

  useEffect(() => {
    const loadData = () => {
      const contacts = JSON.parse(localStorage.getItem('showsuite_contacts') || '[]');
      const donations = JSON.parse(localStorage.getItem('showsuite_donations') || '[]');
      const campaigns = JSON.parse(localStorage.getItem('showsuite_campaigns') || '[]');
      const donorLevels = JSON.parse(localStorage.getItem('showsuite_donorLevels') || '[]');

      setAppData({ contacts, donations, campaigns, donorLevels });
      console.log('📊 Loaded app data:', {
        contacts: contacts.length,
        donations: donations.length,
        campaigns: campaigns.length,
        donorLevels: donorLevels.length
      });
    };

    loadData();
    window.addEventListener('focus', loadData);
    return () => window.removeEventListener('focus', loadData);
  }, []);

  // On initial mount: apply saved branding, then redirect based on role
  useEffect(() => {
    // Apply organization branding (CSS custom properties) immediately
    if (window.organizationService) {
      const org = window.organizationService.loadOrganization();
      if (org?.branding) {
        console.log('🎨 App mounted: applying saved organization branding');
        window.organizationService.applyBrandingToDOM(org.branding);
      }
    }

    const role = localStorage.getItem('showsuite_user_role') || 'admin';
    console.log('🚀 App mounted | role:', role, '| path:', location.pathname);
    if (location.pathname === '/' || location.pathname === '') {
      if (role === 'volunteer') {
        console.log('   → Redirecting to /volunteer-portal');
        window.location.hash = '/volunteer-portal';
      } else if (role === 'actor') {
        console.log('   → Redirecting to /actor-portal');
        window.location.hash = '/actor-portal';
      } else if (['lighting', 'sound', 'wardrobe', 'props', 'set', 'stage_manager'].includes(role)) {
        console.log('   → Redirecting to /department-portal');
        window.location.hash = '/department-portal';
      }
    }
  }, []); // mount only

  const [volunteerView, setVolunteerView] = useState('dashboard');
  const [volunteerModal, setVolunteerModal] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Organization info — loaded once on mount for sidebar display
  const [orgInfo] = useState(() =>
    window.organizationService?.loadOrganization() || { name: 'SceneStave', branding: {} }
  );

  const handleRoleChange = (newRole) => {
    console.log('🔄 Role changing from', userRole, 'to', newRole);
    setUserRole(newRole);
    localStorage.setItem('showsuite_user_role', newRole);

    let newPath = '/';
    if (newRole === 'actor') newPath = '/actor-portal';
    else if (newRole === 'volunteer') newPath = '/volunteer-portal';
    else if (['lighting', 'sound', 'wardrobe', 'props', 'set', 'stage_manager'].includes(newRole)) newPath = '/department-portal';

    console.log('📍 Navigating to:', newPath);
    // Use window.location.hash directly — more reliable than history.push
    // when called in the same tick as a React state update
    window.location.hash = newPath;
  };

  const handleVolunteerNavigate = (view) => {
    console.log('🎯 Volunteer Navigation:', view);

    if (view === 'opportunities') {
      setVolunteerModal('create-opportunity');
      return;
    }

    if (view === 'schedule-shift' || view === 'review-applications' || view === 'roster' || view === 'volunteer-portal') {
      setVolunteerView(view);
      setVolunteerModal(null);
    }
  };

  const navTabs = getNavigationTabs(userRole);
  const settingsItem = { id: 'settings', label: 'Settings', icon: '⚙️', path: '/settings' };

  const NavLink = ({ item }) => (
    <Link
      key={item.id}
      to={item.path}
      onClick={() => {
        if (item.id === 'volunteers') setVolunteerView('dashboard');
        setMobileMenuOpen(false);
      }}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
        currentView === item.id
          ? 'bg-white font-semibold'
          : 'text-white hover:bg-white hover:bg-opacity-20'
      }`}
      style={currentView === item.id ? { color: 'var(--brand-primary)' } : {}}
      title={sidebarCollapsed ? item.label : ''}
    >
      <span className="text-xl flex-shrink-0">{item.icon}</span>
      {!sidebarCollapsed && (
        <span className="text-sm">{item.label}</span>
      )}
    </Link>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Left Sidebar */}
      <aside className={`
        flex flex-col flex-shrink-0
        sidebar-gradient text-white
        transition-all duration-300
        fixed inset-y-0 left-0 z-50
        lg:relative lg:translate-x-0
        ${sidebarCollapsed ? 'w-20' : 'w-64'}
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>

        {/* Logo / Header */}
        <div className="p-4 border-b border-white border-opacity-20 flex-shrink-0">
          <div className="flex items-center justify-between">
            {!sidebarCollapsed && (
              <div className="flex items-center gap-2 min-w-0">
                {orgInfo.branding?.logoUrl && (
                  <img
                    src={orgInfo.branding.logoUrl}
                    alt="Logo"
                    className="h-8 w-8 object-contain flex-shrink-0 rounded"
                  />
                )}
                <h1 className="text-xl font-bold truncate">
                  {orgInfo.name || 'SceneStave'}
                </h1>
              </div>
            )}
            <button
              type="button"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors flex-shrink-0 ml-auto"
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed
                ? (orgInfo.branding?.logoUrl
                    ? <img src={orgInfo.branding.logoUrl} alt="Logo" className="h-6 w-6 object-contain" />
                    : '☰')
                : '←'}
            </button>
          </div>
        </div>

        {/* Main Navigation Items */}
        <nav className="flex-1 overflow-y-auto py-4">
          <div className="space-y-1 px-2">
            {navTabs.map(item => (
              <NavLink key={item.id} item={item} />
            ))}
          </div>
        </nav>

        {/* Settings — always at bottom */}
        <div className="px-2 pb-2 flex-shrink-0">
          <NavLink item={settingsItem} />
        </div>

        {/* Footer */}
        {!sidebarCollapsed && (
          <div className="p-4 border-t border-white border-opacity-20 flex-shrink-0">
            <div className="text-xs text-white opacity-75">
              <div className="font-semibold mb-1">SceneStave v1.0</div>
              <div className="opacity-75">Theatre Management CRM</div>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Mobile Header */}
        <div className="lg:hidden bg-white border-b border-gray-200 p-4 flex items-center justify-between flex-shrink-0 shadow-sm">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            ☰
          </button>
          <h1 className="text-xl font-bold text-purple-900">SceneStave</h1>
          <div className="w-10"></div>
        </div>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto">
          {/* Debug: log active route and role on every render */}
          {console.log('🔍 Route:', location.pathname, '| currentView:', currentView, '| userRole:', userRole) && null}
          <Switch>
            <Route exact path="/">
              <div className="p-6 max-w-7xl mx-auto">
                {console.log('📍 Rendering / route | userRole:', userRole) && null}
                {/* Only show SuperAdminDashboard for admin roles — non-admin roles are
                    redirected by the mount useEffect, but guard here as a safety net */}
                {(userRole === 'admin' || userRole === 'super_admin' || userRole === 'venue_manager') && window.SuperAdminDashboard && (
                  <window.SuperAdminDashboard />
                )}
                {userRole === 'volunteer' && <VolunteerPortalView />}
                {userRole === 'actor' && <ActorPortalView />}
                {['lighting', 'sound', 'wardrobe', 'props', 'set', 'stage_manager'].includes(userRole) && (
                  <div className="text-center py-12 text-gray-400">
                    <div className="text-4xl mb-3">🎨</div>
                    <p className="text-sm">Loading department portal...</p>
                  </div>
                )}
              </div>
            </Route>

            <Route path="/calendar">
              <div className="p-6 max-w-7xl mx-auto">
                {window.GlobalCalendarView ? (
                  <window.GlobalCalendarView userRole={userRole} />
                ) : (
                  <div className="text-center py-20 text-gray-400">
                    <div className="text-5xl mb-4">📅</div>
                    <h2 className="text-xl font-semibold text-gray-600 mb-2">Global Calendar</h2>
                    <p className="text-sm">Coming soon — view all productions and events in one place.</p>
                  </div>
                )}
              </div>
            </Route>

            <Route path="/financial">
              <div className="p-6 max-w-7xl mx-auto">
                {window.FinancialDashboard && <window.FinancialDashboard />}
              </div>
            </Route>

            <Route path="/donors">
              <div className="p-6 max-w-7xl mx-auto">
                {window.DonorsView && (
                  <window.DonorsView
                    data={{
                      contacts: appData.contacts,
                      donations: appData.donations,
                      donorLevels: appData.donorLevels
                    }}
                  />
                )}
              </div>
            </Route>

            <Route path="/actors">
              <div className="p-6 max-w-7xl mx-auto">
                {window.ActorAdminRouter && (
                  <window.ActorAdminRouter userRole="Admin" />
                )}
              </div>
            </Route>

            <Route exact path="/productions">
              <div className="p-6 max-w-7xl mx-auto">
                {window.ProductionsView && <window.ProductionsView />}
              </div>
            </Route>

            <Route path="/productions/:id">
              {window.SceneBuilder && <window.SceneBuilder />}
            </Route>

            <Route path="/volunteers">
              <div className="p-6 max-w-7xl mx-auto">
                <>
                  {volunteerView === 'dashboard' && window.VolunteerDashboard && (
                    <window.VolunteerDashboard
                      userRole="Admin"
                      onNavigate={handleVolunteerNavigate}
                    />
                  )}

                  {volunteerView === 'schedule-shift' && window.VolunteerShiftScheduler && (
                    <window.VolunteerShiftScheduler
                      onBack={() => setVolunteerView('dashboard')}
                    />
                  )}

                  {volunteerView === 'review-applications' && window.VolunteerApplicationReview && (
                    <window.VolunteerApplicationReview
                      onBack={() => setVolunteerView('dashboard')}
                    />
                  )}

                  {volunteerView === 'roster' && window.VolunteerRosterView && (
                    <window.VolunteerRosterView
                      onBack={() => setVolunteerView('dashboard')}
                    />
                  )}

                  {volunteerView === 'volunteer-portal' && window.VolunteerSelfDashboard && (
                    <window.VolunteerSelfDashboard />
                  )}

                  {volunteerModal === 'create-opportunity' && window.VolunteerOpportunitiesManager && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-auto">
                        <window.VolunteerOpportunitiesManager
                          onBack={() => setVolunteerModal(null)}
                          initialView="create"
                        />
                      </div>
                    </div>
                  )}
                </>
              </div>
            </Route>

            <Route path="/department-portal">
              <div className="p-6 max-w-7xl mx-auto">
                {userRole === 'lighting' && window.LightingDesigner && <window.LightingDesigner userRole={userRole} />}
                {userRole === 'sound' && window.SoundDesigner && <window.SoundDesigner userRole={userRole} />}
                {userRole === 'wardrobe' && window.WardrobeDesigner && <window.WardrobeDesigner userRole={userRole} />}
                {userRole === 'props' && window.PropsManager && <window.PropsManager userRole={userRole} />}
                {userRole === 'set' && window.SetDesigner && <window.SetDesigner userRole={userRole} />}
                {userRole === 'stage_manager' && window.StageManager && <window.StageManager userRole={userRole} />}
                {!['lighting', 'sound', 'wardrobe', 'props', 'set', 'stage_manager'].includes(userRole) && (
                  <div className="text-center py-20 text-gray-400">
                    <div className="text-5xl mb-4">🎨</div>
                    <p>Department portal not available for this role.</p>
                  </div>
                )}
              </div>
            </Route>

            <Route path="/volunteer-portal">
              <div className="p-6 max-w-7xl mx-auto">
                {console.log('📍 Rendering /volunteer-portal route, userRole:', userRole) && null}
                <VolunteerPortalView />
              </div>
            </Route>

            <Route path="/settings">
              <div className="p-6 max-w-7xl mx-auto space-y-6">
                {/* Role switcher card — for testing role-based navigation */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-amber-900 mb-3">User Role (Testing)</h3>
                  <select
                    value={userRole}
                    onChange={e => handleRoleChange(e.target.value)}
                    title="User Role"
                    aria-label="User Role"
                    className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                  >
                    <option value="admin">Super Admin (admin)</option>
                    <option value="venue_manager">Venue Manager (Super Admin)</option>
                    <option value="board_member">Board Member</option>
                    <option value="accounting_manager">Accounting Manager</option>
                    <option value="lighting">Lighting Designer</option>
                    <option value="sound">Sound Designer</option>
                    <option value="wardrobe">Wardrobe Designer</option>
                    <option value="props">Props Manager</option>
                    <option value="set">Set Designer</option>
                    <option value="stage_manager">Stage Manager</option>
                    <option value="actor">Actor</option>
                    <option value="volunteer">Volunteer</option>
                  </select>
                  <p className="text-xs text-amber-700 mt-2">Switch roles to preview different navigation menus. Selection persists on reload.</p>
                </div>

                {window.Settings && <window.Settings />}
              </div>
            </Route>

            <Route path="/actor-portal">
              <div className="p-6 max-w-7xl mx-auto">
                <ActorPortalView />
              </div>
            </Route>

            <Route path="/donor-login">
              {window.DonorLogin ? (
                React.createElement(window.DonorLogin, {
                  onLoginSuccess: () => { window.location.hash = '/donor-portal'; }
                })
              ) : null}
            </Route>

            <Route path="/donor-portal">
              {window.donorAuthService?.isAuthenticated() ? (
                window.DonorPortal ? React.createElement(window.DonorPortal) : null
              ) : (
                <div className="p-6 max-w-7xl mx-auto">
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">💎</div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Donor Portal</h2>
                    <p className="text-gray-600 mb-8 max-w-md mx-auto">
                      The donor portal gives donors access to their giving history, upcoming show invitations, profile management, and tax receipts.
                    </p>
                    <div className="flex gap-4 justify-center">
                      <button
                        type="button"
                        onClick={() => { window.location.hash = '/donor-login'; }}
                        className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors"
                      >
                        💎 Open Donor Login
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-4">
                      Share the donor login link with your donors so they can access their personal portal.
                    </p>
                  </div>
                </div>
              )}
            </Route>
          </Switch>
        </main>
      </div>
    </div>
  );
}

// Wrap App in HashRouter for static file server compatibility
function AppWithRouter() {
  return (
    <HashRouter>
      <App />
    </HashRouter>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<AppWithRouter />);
