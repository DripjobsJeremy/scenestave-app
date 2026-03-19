/**
 * Settings Page
 * Central hub for all SceneStave configuration and admin settings.
 * Features sidebar navigation with URL syncing and unsaved changes protection.
 */
(function (global) {
  'use strict';

  const { React } = global;
  const { useState, useEffect } = React;

  /**
   * SettingsSidebar Component
   * Collapsible sidebar navigation with grouped sections
   */
  const SettingsSidebar = ({ activeSection, onSectionChange, hasUnsavedChanges }) => {
    const sections = [
      {
        id: 'general',
        label: 'General',
        icon: '🏠',
        items: [
          { id: 'overview', label: 'Overview', icon: '📊' },
          { id: 'organization', label: 'Organization Profile', icon: '🏢' }
        ]
      },
      {
        id: 'donor-management',
        label: 'Donor Management',
        icon: '💰',
        items: [
          { id: 'donor-levels', label: 'Donor Levels', icon: '💰' },
          { id: 'campaigns', label: 'Campaigns & Funds', icon: '📊' },
          { id: 'acknowledgments', label: 'Acknowledgment Templates', icon: '✉️' }
        ]
      },
      {
        id: 'data',
        label: 'Data & Import',
        icon: '📥',
        items: [
          { id: 'import-history', label: 'Import History', icon: '📥' },
          { id: 'mapping-presets', label: 'Mapping Presets', icon: '🧩' },
          { id: 'data-management', label: 'Data Management', icon: '🗄️' }
        ]
      },
      {
        id: 'production',
        label: 'Production',
        icon: '🎭',
        items: [
          { id: 'venues', label: 'Venues & Locations', icon: '📍' }
        ]
      },
      {
        id: 'system',
        label: 'System',
        icon: '⚙️',
        items: [
          { id: 'users', label: 'User Management', icon: '👥' },
          { id: 'preferences', label: 'User Preferences', icon: '👤' },
          { id: 'about', label: 'About SceneStave', icon: 'ℹ️' }
        ]
      }
    ];
    
    const [expandedGroups, setExpandedGroups] = useState(['general', 'donor-management', 'data', 'production', 'system']);
    
    const toggleGroup = (groupId) => {
      setExpandedGroups(prev =>
        prev.includes(groupId)
          ? prev.filter(id => id !== groupId)
          : [...prev, groupId]
      );
    };
    
    const handleNavClick = (sectionId) => {
      if (hasUnsavedChanges) {
        const confirmed = confirm('You have unsaved changes. Continue anyway?');
        if (!confirmed) return;
      }
      onSectionChange(sectionId);
    };
    
    return React.createElement(
      'div',
      { className: 'settings-sidebar w-64 flex-shrink-0' },
      
      // Sidebar Header
      React.createElement(
        'div',
        { className: 'sidebar-header mb-6' },
        React.createElement('h1', { className: 'text-2xl font-bold text-gray-900 mb-1' }, '⚙️ Settings'),
        React.createElement('p', { className: 'text-sm text-gray-600' }, 'Configure SceneStave')
      ),
      
      // Navigation Groups
      React.createElement(
        'nav',
        { className: 'sidebar-nav' },
        sections.map(group =>
          React.createElement(
            'div',
            { key: group.id, className: 'nav-group mb-4' },
            
            // Group Header
            React.createElement(
              'button',
              {
                onClick: () => toggleGroup(group.id),
                className: 'nav-group-header w-full flex items-center justify-between text-sm font-semibold text-gray-700 mb-2 hover:text-gray-900 transition-colors'
              },
              React.createElement(
                'span',
                null,
                React.createElement('span', { className: 'mr-2' }, group.icon),
                group.label
              ),
              React.createElement(
                'span',
                { className: 'text-gray-500 text-xs' },
                expandedGroups.includes(group.id) ? '▼' : '▶'
              )
            ),
            
            // Group Items
            expandedGroups.includes(group.id) && React.createElement(
              'div',
              { className: 'nav-items ml-4 space-y-1' },
              group.items.map(item =>
                React.createElement(
                  'button',
                  {
                    key: item.id,
                    onClick: () => handleNavClick(item.id),
                    className: `nav-item w-full text-left px-3 py-2 rounded-lg text-sm transition-colors relative ${
                      activeSection === item.id
                        ? 'bg-violet-600 text-white font-medium'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`
                  },
                  React.createElement('span', { className: 'mr-2' }, item.icon),
                  item.label
                )
              )
            )
          )
        )
      ),
      
      // Unsaved Changes Warning
      hasUnsavedChanges && React.createElement(
        'div',
        { className: 'unsaved-warning mt-6 p-3 bg-orange-900/30 border border-orange-600/50 rounded-lg' },
        React.createElement(
          'p',
          { className: 'text-xs text-orange-300' },
          React.createElement('strong', null, '⚠️ Unsaved Changes'),
          React.createElement('br'),
          "Don't forget to save your changes before leaving."
        )
      )
    );
  };

  // Load About Settings component from global scope
  const AboutSettingsComponent = global.AboutSettings;

  // Load components from global scope
  const OrganizationSettingsComponent = global.OrganizationSettings;
  const SettingsOverviewComponent = global.SettingsOverview;
  const DonorLevelsSettingsComponent = global.DonorLevelsSettings;
  const CampaignsSettingsComponent = global.CampaignsSettings;
  const AcknowledgmentSettingsComponent = global.AcknowledgmentSettings;
  const DataManagementSettingsComponent = global.DataManagementSettings;
  const UserPreferencesSettingsComponent = global.UserPreferencesSettings;
  const VenuesSettingsComponent = global.VenuesSettings;
  const UsersSettingsComponent = global.UsersSettings;
  const ImportHistoryComp = global.ImportHistory;
  const MappingPresetsManagerComp = global.MappingPresetsManager;

  /**
   * Main Settings Component
   */
  const Settings = () => {
    const [activeSection, setActiveSection] = useState('overview');
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [showQuickActions, setShowQuickActions] = useState(true);

    // Search function (scoped to component to access state setters)
    const performSearch = (query) => {
      const searchableItems = [
        { sectionId: 'organization', section: 'General', icon: '🏢', title: 'Organization Profile', description: 'Edit org name, address, type, and timezone', keywords: ['organization', 'name', 'address', 'type', 'timezone', 'theatre', 'logo', 'brand', 'tax', 'ein'] },
        { sectionId: 'organization', section: 'General', icon: '🎨', title: 'Branding & Colors', description: 'Upload logo, set color theme', keywords: ['branding', 'logo', 'color', 'theme', 'primary', 'accent'] },
        { sectionId: 'organization', section: 'General', icon: '📞', title: 'Contact Info', description: 'Manage organization phone and email', keywords: ['phone', 'email', 'contact', 'number'] },
        { sectionId: 'organization', section: 'General', icon: '💳', title: 'Account & Subscription', description: 'View plan, account number, billing', keywords: ['account', 'subscription', 'plan', 'billing', 'upgrade'] },
        { sectionId: 'donor-levels', section: 'Donor Management', icon: '💰', title: 'Donor Levels', description: 'Configure donor level tiers and benefits', keywords: ['donor', 'level', 'tier', 'patron', 'benefactor'] },
        { sectionId: 'donor-levels', section: 'Donor Management', icon: '💰', title: 'Add Donor Level', description: 'Create a new donor level tier', keywords: ['add', 'create', 'new', 'level'] },
        { sectionId: 'campaigns', section: 'Donor Management', icon: '📊', title: 'Campaigns & Funds', description: 'Manage fundraising campaigns', keywords: ['campaign', 'fund', 'fundraising', 'goal'] },
        { sectionId: 'campaigns', section: 'Donor Management', icon: '📊', title: 'Create Campaign', description: 'Start a new fundraising campaign', keywords: ['create', 'new', 'campaign'] },
        { sectionId: 'acknowledgments', section: 'Donor Management', icon: '✉️', title: 'Acknowledgment Templates', description: 'Edit thank-you letter templates', keywords: ['acknowledgment', 'thank', 'letter', 'email', 'receipt', 'template'] },
        { sectionId: 'acknowledgments', section: 'Donor Management', icon: '✉️', title: 'Organization Info', description: 'Update organization details for receipts', keywords: ['organization', 'org', 'ein', 'tax', 'address'] },
        { sectionId: 'import-history', section: 'Data & Import', icon: '📥', title: 'Import History', description: 'View past CSV imports', keywords: ['import', 'history', 'csv', 'upload'] },
        { sectionId: 'data-management', section: 'Data & Import', icon: '🗄️', title: 'Backup Data', description: 'Download full data backup', keywords: ['backup', 'export', 'download', 'save'] },
        { sectionId: 'data-management', section: 'Data & Import', icon: '🗄️', title: 'Import Donors', description: 'Upload CSV file of donors', keywords: ['import', 'csv', 'upload', 'bulk'] },
        { sectionId: 'data-management', section: 'Data & Import', icon: '🗄️', title: 'Export Data', description: 'Export contacts and donations', keywords: ['export', 'csv', 'download'] },
        { sectionId: 'data-management', section: 'Data & Import', icon: '🗄️', title: 'Reset Data', description: 'Delete all SceneStave data', keywords: ['reset', 'delete', 'clear', 'remove'] },
        { sectionId: 'preferences', section: 'System', icon: '👤', title: 'User Preferences', description: 'Customize display and defaults', keywords: ['preferences', 'settings', 'display', 'theme', 'format'] },
        { sectionId: 'preferences', section: 'System', icon: '👤', title: 'Date Format', description: 'Change date display format', keywords: ['date', 'format', 'time'] },
        { sectionId: 'preferences', section: 'System', icon: '👤', title: 'Currency Format', description: 'Change currency display', keywords: ['currency', 'money', 'dollar'] },
        { sectionId: 'about', section: 'System', icon: 'ℹ️', title: 'About SceneStave', description: 'Version and system information', keywords: ['about', 'version', 'info', 'help'] }
      ];

      const lowerQuery = (query || '').toLowerCase();
      const results = searchableItems.filter(item =>
        item.title.toLowerCase().includes(lowerQuery) ||
        item.description.toLowerCase().includes(lowerQuery) ||
        (item.keywords || []).some(keyword => keyword.includes(lowerQuery))
      );
      setSearchResults(results.slice(0, 8));
    };

    // Valid section names
    const validSections = [
      'overview', 'organization', 'donor-levels', 'campaigns', 'acknowledgments',
      'import-history', 'mapping-presets', 'data-management',
      'preferences', 'about', 'venues'
    ];

    // Warn before leaving with unsaved changes
    useEffect(() => {
      const handleBeforeUnload = (e) => {
        if (hasUnsavedChanges) {
          e.preventDefault();
          e.returnValue = '';
        }
      };

      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [hasUnsavedChanges]);

    // Load section from URL on mount
    useEffect(() => {
      const hash = window.location.hash;
      const sectionMatch = hash.match(/#\/settings\/(.+)/);

      if (sectionMatch && sectionMatch[1]) {
        if (validSections.includes(sectionMatch[1])) {
          setActiveSection(sectionMatch[1]);
        }
      }
    }, []);

    // Search effect
    useEffect(() => {
      if (searchQuery && searchQuery.length >= 2) {
        performSearch(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, [searchQuery]);

    // Keyboard shortcut for search (Ctrl+K or Cmd+K)
    useEffect(() => {
      const handleKeyPress = (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
          e.preventDefault();
          const el = document.querySelector('.search-bar input');
          if (el) el.focus();
        }
      };
      window.addEventListener('keydown', handleKeyPress);
      return () => window.removeEventListener('keydown', handleKeyPress);
    }, []);

    // Handle section change
    const handleSectionChange = (newSection) => {
      setActiveSection(newSection);
      setHasUnsavedChanges(false);

      // Update URL hash for direct linking
      window.location.hash = `#/settings/${newSection}`;
    };

    // Build header (search + quick actions)
    const header = React.createElement(
      'div',
      { className: 'settings-header mb-6' },
      React.createElement(
        'div',
        { className: 'search-bar relative' },
        React.createElement(
          'div',
          { className: 'relative' },
          React.createElement('span', { className: 'absolute left-3 top-2.5 text-gray-600' }, '🔍'),
          React.createElement('input', {
            type: 'text',
            value: searchQuery,
            onChange: (e) => setSearchQuery(e.target.value),
            placeholder: 'Search settings... (Ctrl+K)',
            className: 'w-full pl-10 pr-10 py-2 rounded-lg bg-white border border-gray-300 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-600 focus:border-violet-600'
          }),
          searchQuery && React.createElement(
            'button',
            {
              onClick: () => setSearchQuery(''),
              className: 'absolute right-3 top-2.5 text-gray-600 hover:text-gray-900'
            },
            '✕'
          )
        ),
        (searchResults && searchResults.length > 0) && React.createElement(
          'div',
          { className: 'search-results absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto' },
          searchResults.map((result, index) => (
            React.createElement(
              'button',
              {
                key: index,
                onClick: () => {
                  setActiveSection(result.sectionId);
                  setSearchQuery('');
                  setSearchResults([]);
                  setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 0);
                },
                className: 'w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-200 last:border-b-0'
              },
              React.createElement(
                'div',
                { className: 'flex items-center gap-3' },
                React.createElement('span', { className: 'text-xl' }, result.icon),
                React.createElement(
                  'div',
                  { className: 'flex-1' },
                  React.createElement('div', { className: 'font-medium text-sm text-gray-900' }, result.title),
                  React.createElement('div', { className: 'text-xs text-gray-600' }, result.description)
                ),
                React.createElement('div', { className: 'text-xs text-gray-500' }, result.section)
              )
            )
          ))
        )
      ),
      !searchQuery && (showQuickActions 
        ? React.createElement(
            'div',
            { className: 'quick-actions mt-4 p-4 border border-gray-200 rounded-lg bg-gray-50' },
            React.createElement(
              'div',
              { className: 'flex items-center justify-between mb-3' },
              React.createElement('h3', { className: 'font-semibold text-sm text-gray-900' }, '⚡ Quick Actions'),
              React.createElement('button', {
                onClick: () => setShowQuickActions(false),
                className: 'text-xs text-gray-600 hover:text-gray-900'
              }, 'Hide')
            ),
            React.createElement(
              'div',
              { className: 'grid grid-cols-2 md:grid-cols-4 gap-2' },
              React.createElement(QuickActionButton, {
                icon: '💰',
                label: 'Add Donor Level',
                onClick: () => {
                  setActiveSection('donor-levels');
                  setTimeout(() => {
                    document.querySelector('[data-action="add-donor-level"]')?.click();
                  }, 100);
                }
              }),
              React.createElement(QuickActionButton, {
                icon: '📊',
                label: 'Create Campaign',
                onClick: () => {
                  setActiveSection('campaigns');
                  setTimeout(() => {
                    document.querySelector('[data-action="create-campaign"]')?.click();
                  }, 100);
                }
              }),
              React.createElement(QuickActionButton, {
                icon: '📥',
                label: 'Import Donors',
                onClick: () => {
                  window.dispatchEvent(new CustomEvent('openImportWizard'));
                }
              }),
              React.createElement(QuickActionButton, {
                icon: '💾',
                label: 'Backup Data',
                onClick: () => {
                  setActiveSection('data-management');
                  setTimeout(() => {
                    document.querySelector('[data-action="full-backup"]')?.click();
                  }, 100);
                }
              })
            )
          )
        : React.createElement(
            'div',
            { className: 'mt-4 text-center' },
            React.createElement('button', {
              onClick: () => setShowQuickActions(true),
              className: 'text-sm text-violet-400 hover:text-violet-300 underline'
            }, '⚡ Show Quick Actions')
          )
      )
    );

    // Build main row (sidebar + content)
    const mainRow = React.createElement(
      'div',
      { className: 'flex gap-6' },
      React.createElement(
        'div',
        { className: 'sidebar-wrapper sticky top-6 self-start max-h-[calc(100vh-4rem)] overflow-y-auto' },
        React.createElement(SettingsSidebar, {
          activeSection: activeSection,
          onSectionChange: handleSectionChange,
          hasUnsavedChanges: hasUnsavedChanges
        })
      ),
      React.createElement(
        'div',
        { className: 'settings-content flex-1 min-w-0' },
        React.createElement(
          'div',
          { className: 'content-container bg-white rounded-lg p-6 min-h-[600px]' },
          activeSection === 'overview' && SettingsOverviewComponent &&
            React.createElement(SettingsOverviewComponent, {
              onNavigate: (section) => handleSectionChange(section)
            }),
          activeSection === 'organization' && OrganizationSettingsComponent &&
            React.createElement(OrganizationSettingsComponent),
          activeSection === 'donor-levels' && DonorLevelsSettingsComponent &&
            React.createElement(DonorLevelsSettingsComponent, {
              onHasChanges: (hasChanges) => setHasUnsavedChanges(hasChanges)
            }),
          activeSection === 'campaigns' && CampaignsSettingsComponent &&
            React.createElement(CampaignsSettingsComponent, {
              onHasChanges: (hasChanges) => setHasUnsavedChanges(hasChanges)
            }),
          activeSection === 'acknowledgments' && AcknowledgmentSettingsComponent &&
            React.createElement(AcknowledgmentSettingsComponent, {
              onHasChanges: (hasChanges) => setHasUnsavedChanges(hasChanges)
            }),
          activeSection === 'import-history' && ImportHistoryComp &&
            React.createElement(ImportHistoryComp),
          activeSection === 'mapping-presets' && MappingPresetsManagerComp &&
            React.createElement(MappingPresetsManagerComp),
          activeSection === 'data-management' && DataManagementSettingsComponent &&
            React.createElement(DataManagementSettingsComponent),
          activeSection === 'preferences' && UserPreferencesSettingsComponent &&
            React.createElement(UserPreferencesSettingsComponent, {
              onHasChanges: (hasChanges) => setHasUnsavedChanges(hasChanges)
            }),
          activeSection === 'about' && AboutSettingsComponent &&
            React.createElement(AboutSettingsComponent),
          activeSection === 'venues' && VenuesSettingsComponent &&
            React.createElement(VenuesSettingsComponent),
          activeSection === 'users' && UsersSettingsComponent &&
            React.createElement(UsersSettingsComponent)
        )
      )
    );

    return React.createElement(
      'div',
      { className: 'settings-page max-w-[1400px] mx-auto p-6 min-h-[calc(100vh-100px)]' },
      header,
      mainRow
    );
  };

  // QuickActionButton Component
  const QuickActionButton = ({ icon, label, onClick }) => (
    React.createElement(
      'button',
      {
        onClick,
        className: 'quick-action-btn flex flex-col items-center gap-2 p-3 border border-gray-200 rounded bg-white hover:bg-gray-50 hover:shadow transition'
      },
      React.createElement('span', { className: 'text-2xl' }, icon),
      React.createElement('span', { className: 'text-xs font-medium text-center text-gray-900' }, label)
    )
  );

  

  // Export globally
  global.Settings = Settings;
})(window);
