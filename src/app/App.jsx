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

// Redirects legacy direct-URL routes to the Contacts hub on the correct tab
function TabRedirect({ tab }) {
  React.useEffect(() => {
    localStorage.setItem('scenestave_contacts_tab', tab);
    window.location.hash = '/contacts';
  }, []);
  return null;
}

// Redirects old /department-portal URL to the new /dept-dashboard
function PortalRedirect() {
  React.useEffect(() => { window.location.hash = '/dept-dashboard'; }, []);
  return null;
}

// Returns role-specific nav items (Settings always rendered separately at bottom)
function getNavigationTabs(userRole) {
  // venue_manager = Super Admin (full access, same as admin/super_admin)
  if (userRole === 'admin' || userRole === 'super_admin' || userRole === 'venue_manager') {
    return [
      { id: 'dashboard',    label: 'Dashboard',    icon: '🏠', path: '/' },
      { id: 'financial',    label: 'Financial',    icon: '💰', path: '/financial' },
      { id: 'productions',  label: 'Productions',  icon: '🎬', path: '/productions' },
      { id: 'calendar',     label: 'Calendar',     icon: '📅', path: '/calendar' },
      { id: 'contacts',     label: 'Contacts',     icon: '📋', path: '/contacts' },
      { id: 'donor-portal', label: 'Donor Portal', icon: '💎', path: '/donor-portal' },
    ];
  }

  // board_member = Admin without Settings/Import access
  if (userRole === 'board_member') {
    return [
      { id: 'dashboard',   label: 'Dashboard',   icon: '🏠', path: '/' },
      { id: 'financial',   label: 'Financial',   icon: '💰', path: '/financial' },
      { id: 'productions', label: 'Productions', icon: '🎬', path: '/productions' },
      { id: 'calendar',    label: 'Calendar',    icon: '📅', path: '/calendar' },
      { id: 'contacts',    label: 'Contacts',    icon: '📋', path: '/contacts' },
    ];
  }

  // accounting_manager = Financial and Donors read-only
  if (userRole === 'accounting_manager') {
    return [
      { id: 'dashboard', label: 'Dashboard', icon: '🏠', path: '/' },
      { id: 'financial',  label: 'Financial', icon: '💰', path: '/financial' },
      { id: 'contacts',   label: 'Contacts',  icon: '📋', path: '/contacts' },
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
      { id: 'dept-dashboard', label: 'Dashboard',   icon: '📊', path: '/dept-dashboard' },
      { id: 'productions',    label: 'Productions', icon: '🎬', path: '/productions' },
      { id: 'dept-calendar',  label: 'Calendar',    icon: '📅', path: '/dept-calendar' },
    ];
  }

  if (userRole === 'director') {
    return [
      { id: 'dept-dashboard', label: 'Dashboard',   icon: '📊', path: '/dept-dashboard' },
      { id: 'productions',    label: 'Productions', icon: '🎬', path: '/productions' },
      { id: 'calendar',       label: 'Calendar',    icon: '📅', path: '/calendar' },
      { id: 'contacts',       label: 'Contacts',    icon: '📋', path: '/contacts' },
    ];
  }

  if (userRole === 'actor') {
    return [
      { id: 'actor-portal', label: 'Actor Portal',  icon: '🎭', path: '/actor-portal' },
      { id: 'productions',  label: 'Productions',   icon: '🎬', path: '/productions' },
    ];
  }

  if (userRole === 'volunteer') {
    return [
      { id: 'volunteer-portal', label: 'Volunteer Portal', icon: '🤝', path: '/volunteer-portal' },
    ];
  }

  // Default fallback — same as admin
  return [
    { id: 'dashboard',   label: 'Dashboard',   icon: '🏠', path: '/' },
    { id: 'financial',   label: 'Financial',   icon: '💰', path: '/financial' },
    { id: 'productions', label: 'Productions', icon: '🎬', path: '/productions' },
    { id: 'calendar',    label: 'Calendar',    icon: '📅', path: '/calendar' },
    { id: 'contacts',    label: 'Contacts',    icon: '📋', path: '/contacts' },
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
      'dashboard', 'financial', 'contacts', 'donors', 'actors', 'productions', 'calendar',
      'volunteers', 'settings', 'actor-portal',
      'dept-dashboard', 'dept-calendar', 'volunteer-portal', 'donor-portal', 'donor-login'
    ];
    return validViews.includes(path) ? path : 'dashboard';
  };

  const currentView = getViewFromPath(location.pathname);

  useEffect(() => {
    if (window.initializeSampleData) {
      window.initializeSampleData();
    }
  }, []);

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
    window.addEventListener('contactsUpdated', loadData);
    return () => {
      window.removeEventListener('focus', loadData);
      window.removeEventListener('contactsUpdated', loadData);
    };
  }, []);

  // On initial mount: apply saved branding + theme mode, then redirect based on role
  useEffect(() => {
    // Apply organization branding (CSS custom properties) immediately
    if (window.organizationService) {
      const org = window.organizationService.loadOrganization();
      if (org?.branding) {
        console.log('🎨 App mounted: applying saved organization branding');
        window.organizationService.applyBrandingToDOM(org.branding);
      }
      // Apply persisted light/dark mode
      window.organizationService.applyThemeMode();
    }

    const role = localStorage.getItem('showsuite_user_role') || 'admin';
    const SUPER_ROLES = ['super_admin', 'venue_manager', 'admin', 'client_admin'];
    console.log('🚀 App mounted | role:', role, '| path:', location.pathname);
    if (location.pathname === '/' || location.pathname === '') {
      if (SUPER_ROLES.includes(role)) {
        // Super admin roles always land on the main dashboard — never redirect to portals
      } else if (role === 'volunteer') {
        console.log('   → Redirecting to /volunteer-portal');
        window.location.hash = '/volunteer-portal';
      } else if (role === 'actor') {
        console.log('   → Redirecting to /actor-portal');
        window.location.hash = '/actor-portal';
      } else if (['director', 'lighting', 'sound', 'wardrobe', 'props', 'set', 'stage_manager'].includes(role)) {
        console.log('   → Redirecting to /dept-dashboard');
        window.location.hash = '/dept-dashboard';
      }
    }
  }, []); // mount only

  const [staffContactId, setStaffContactId] = useState(() => localStorage.getItem('showsuite_staff_contact_id') || '');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [themeMode, setThemeMode] = useState(() => window.organizationService?.loadThemeMode?.() || 'dark');

  const handleThemeToggle = () => {
    const next = themeMode === 'dark' ? 'light' : 'dark';
    setThemeMode(next);
    window.organizationService?.saveThemeMode?.(next);
  };

  // Role badge — computed from userRole + optional staffContact name
  const ROLE_DISPLAY = {
    super_admin:        { label: 'Super Admin',   cls: 'bg-violet-900 text-violet-300' },
    venue_manager:      { label: 'Super Admin',   cls: 'bg-violet-900 text-violet-300' },
    admin:              { label: 'Admin',          cls: 'bg-violet-900 text-violet-300' },
    client_admin:       { label: 'Admin',          cls: 'bg-violet-900 text-violet-300' },
    board_member:       { label: 'Board Member',   cls: 'bg-blue-900 text-blue-300' },
    accounting_manager: { label: 'Accounting',     cls: 'bg-blue-900 text-blue-300' },
    director:           { label: 'Director',       cls: 'bg-green-900 text-green-300' },
    stage_manager:      { label: 'Stage Manager',  cls: 'bg-teal-900 text-teal-300' },
    wardrobe:           { label: 'Wardrobe',       cls: 'bg-pink-900 text-pink-300' },
    lighting:           { label: 'Lighting',       cls: 'bg-yellow-900 text-yellow-300' },
    sound:              { label: 'Sound',          cls: 'bg-blue-800 text-blue-200' },
    props:              { label: 'Props',          cls: 'bg-orange-900 text-orange-300' },
    set:                { label: 'Set & Scenic',   cls: 'bg-teal-800 text-teal-300' },
  };
  const roleInfo = ROLE_DISPLAY[userRole] || { label: userRole, cls: 'bg-gray-700 text-gray-300' };
  const staffContact = staffContactId ? window.contactsService?.getContactById?.(staffContactId) : null;
  const staffName = staffContact
    ? (`${staffContact.firstName || ''} ${staffContact.lastName || ''}`).trim() || staffContact.email
    : null;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Organization info — loaded once on mount for sidebar display
  const [orgInfo, setOrgInfo] = useState(() =>
    window.organizationService?.loadOrganization() || { name: 'SceneStave', branding: {} }
  );

  const handleOrgUpdate = () => {
    const updated = window.organizationService?.loadOrganization();
    if (updated) setOrgInfo(updated);
  };

  const handleRoleChange = (newRole) => {
    console.log('🔄 Role changing from', userRole, 'to', newRole);
    setUserRole(newRole);
    localStorage.setItem('showsuite_user_role', newRole);

    // Super admin roles clear any staff-scoped contact association
    const SUPER_ROLES = ['super_admin', 'venue_manager', 'admin', 'client_admin'];
    if (SUPER_ROLES.includes(newRole)) {
      setStaffContactId('');
      localStorage.removeItem('showsuite_staff_contact_id');
    }

    let newPath = '/';
    if (SUPER_ROLES.includes(newRole)) newPath = '/';
    else if (newRole === 'actor') newPath = '/actor-portal';
    else if (newRole === 'volunteer') newPath = '/volunteer-portal';
    else if (newRole === 'director') {
      // Only redirect if a staff contact is already selected — otherwise stay
      // on Settings so the user can pick one from the "Viewing as" picker
      const existingContactId = localStorage.getItem('showsuite_staff_contact_id');
      newPath = existingContactId ? '/dept-dashboard' : '/settings';
    }
    else if (['lighting', 'sound', 'wardrobe', 'props', 'set', 'stage_manager'].includes(newRole)) newPath = '/dept-dashboard';

    console.log('📍 Navigating to:', newPath);
    // Use window.location.hash directly — more reliable than history.push
    // when called in the same tick as a React state update
    window.location.hash = newPath;
  };

  const navTabs = getNavigationTabs(userRole);
  const settingsItem = { id: 'settings', label: 'Settings', icon: '⚙️', path: '/settings' };

  const NavLink = ({ item }) => {
    const isActive = currentView === item.id;
    if (sidebarCollapsed) {
      return (
        <Link
          key={item.id}
          to={item.path}
          onClick={() => setMobileMenuOpen(false)}
          title={item.label}
          className={`flex items-center justify-center w-10 h-10 mx-auto rounded-lg transition-colors ${
            isActive
              ? 'bg-violet-600 text-white'
              : 'text-gray-300 hover:bg-white hover:bg-opacity-20 hover:text-white'
          }`}
        >
          <span className="text-xl leading-none">{item.icon}</span>
        </Link>
      );
    }
    return (
      <Link
        key={item.id}
        to={item.path}
        onClick={() => setMobileMenuOpen(false)}
        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
          isActive
            ? 'font-semibold'
            : 'text-white hover:bg-white hover:bg-opacity-20'
        }`}
        style={isActive ? { backgroundColor: 'var(--color-primary)', color: '#FFFFFF' } : {}}
      >
        <span className="text-xl flex-shrink-0">{item.icon}</span>
        <span className="text-sm">{item.label}</span>
      </Link>
    );
  };

  return (
    <div className="flex h-screen overflow-hidden bg-base">

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

        {/* Footer — role indicator */}
        {!sidebarCollapsed && (
          <div className="p-4 border-t border-white border-opacity-20 flex-shrink-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${roleInfo.cls}`}>
                {roleInfo.label}
              </span>
            </div>
            {staffName && (
              <div className="text-xs text-gray-300 truncate mb-1.5">👤 {staffName}</div>
            )}
            <div className="flex items-center justify-between">
              <div className="text-xs text-white opacity-40">SceneStave v1.0</div>
              <button
                type="button"
                title={themeMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                onClick={handleThemeToggle}
                className="text-base opacity-50 hover:opacity-100 transition-opacity leading-none bg-transparent border-0 cursor-pointer px-1 py-0.5"
              >
                {themeMode === 'dark' ? '☀️' : '🌙'}
              </button>
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
          <h1 className="text-xl font-bold text-brand">SceneStave</h1>
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${roleInfo.cls}`}>
            {roleInfo.label}
          </span>
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
                {['board_member', 'accounting_manager'].includes(userRole) && window.BoardDashboard && (
                  React.createElement(window.BoardDashboard)
                )}
                {userRole === 'volunteer' && <VolunteerPortalView />}
                {userRole === 'actor' && <ActorPortalView />}
                {['director', 'lighting', 'sound', 'wardrobe', 'props', 'set', 'stage_manager'].includes(userRole) && (
                  <div className="text-center py-12 text-gray-400">
                    <div className="text-4xl mb-3">📊</div>
                    <p className="text-sm">Loading dashboard...</p>
                  </div>
                )}
              </div>
            </Route>

            <Route path="/calendar">
              <div className="bg-base min-h-screen">
                {window.GlobalCalendar && <window.GlobalCalendar />}
              </div>
            </Route>

            <Route path="/financial">
              <div className="p-6 max-w-7xl mx-auto">
                {window.FinancialDashboard && <window.FinancialDashboard />}
              </div>
            </Route>

            <Route path="/contacts">
              <div className="p-6 max-w-7xl mx-auto">
                {window.ContactsHub && (
                  <window.ContactsHub
                    userRole={userRole}
                    data={{
                      contacts: appData.contacts,
                      donations: appData.donations,
                      donorLevels: appData.donorLevels,
                    }}
                  />
                )}
              </div>
            </Route>

            {/* Legacy routes — redirect to Contacts hub on the right tab */}
            <Route path="/donors">
              <TabRedirect tab="donors" />
            </Route>

            <Route path="/actors">
              <TabRedirect tab="actors" />
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
              <TabRedirect tab="volunteers" />
            </Route>

            <Route path="/dept-dashboard">
              <div className="bg-base min-h-full">
                {window.DepartmentDashboard
                  ? React.createElement(window.DepartmentDashboard)
                  : React.createElement('div', { className: 'p-6 text-center py-20 text-gray-400' },
                      React.createElement('p', null, 'Dashboard loading...')
                    )
                }
              </div>
            </Route>

            <Route path="/department-portal">
              <PortalRedirect />
            </Route>

            <Route path="/dept-calendar">
              <div className="bg-base min-h-screen">
                {window.DepartmentCalendar ? <window.DepartmentCalendar /> : (
                  <div className="p-6 text-center py-20 text-gray-400">
                    <p>Calendar component not loaded.</p>
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
                    <option disabled value="">── Switch Role ──</option>
                    <option value="admin">Super Admin (admin)</option>
                    <option value="venue_manager">Venue Manager (Super Admin)</option>
                    <option value="board_member">Board Member</option>
                    <option value="accounting_manager">Accounting Manager</option>
                    <option value="director">Director</option>
                    <option value="lighting">Lighting Designer</option>
                    <option value="sound">Sound Designer</option>
                    <option value="wardrobe">Wardrobe Designer</option>
                    <option value="props">Props Manager</option>
                    <option value="set">Set Designer</option>
                    <option value="stage_manager">Stage Manager</option>
                    <option value="actor">Actor</option>
                    <option value="volunteer">Volunteer</option>
                  </select>

                  {/* Staff contact picker — only for director/dept roles */}
                  {['director','wardrobe','lighting','sound','props','set','stage_manager'].includes(userRole) && (() => {
                    const ROLE_LABEL_MAP = {
                      director: 'Director', wardrobe: 'Wardrobe Designer', lighting: 'Lighting Designer',
                      sound: 'Sound Designer', props: 'Props Master', set: 'Scenic Designer', stage_manager: 'Stage Manager',
                    };
                    const matchingStaff = (window.contactsService?.getStaffContacts?.() || [])
                      .filter(c => (c.staffProfile?.roles || []).includes(ROLE_LABEL_MAP[userRole]));
                    return (
                      <div className="mt-3">
                        <label className="block text-xs font-medium text-amber-800 mb-1">Viewing as (staff member)</label>
                        <select
                          title="Viewing as staff member"
                          value={staffContactId}
                          onChange={e => {
                            const id = e.target.value;
                            setStaffContactId(id);
                            if (id) localStorage.setItem('showsuite_staff_contact_id', id);
                            else localStorage.removeItem('showsuite_staff_contact_id');
                          }}
                          className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-amber-400"
                        >
                          <option value="">— All productions (admin view) —</option>
                          {matchingStaff.map(c => (
                            <option key={c.id} value={c.id}>
                              {`${c.firstName || ''} ${c.lastName || ''}`.trim() || c.email}
                            </option>
                          ))}
                        </select>
                        {matchingStaff.length === 0 && (
                          <p className="text-xs text-amber-600 mt-1">No staff with the {ROLE_LABEL_MAP[userRole]} role. Add them in Contacts → Staff & Crew.</p>
                        )}
                      </div>
                    );
                  })()}

                  <p className="text-xs text-amber-700 mt-2">Switch roles to preview different navigation menus. Selection persists on reload.</p>
                </div>

                {window.Settings && <window.Settings onOrgUpdate={handleOrgUpdate} />}
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
