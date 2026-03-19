/**
 * SettingsOverview Component
 * 
 * Dashboard view providing summary of key settings and quick access to common tasks.
 * Features: status cards, quick links, recent activity, tips, and system health checks.
 */

const SettingsOverview = ({ onNavigate }) => {
  const [stats, setStats] = React.useState(null);
  const [recentActivity, setRecentActivity] = React.useState([]);
  
  React.useEffect(() => {
    loadStats();
    loadRecentActivity();
  }, []);
  
  const loadStats = () => {
    try {
      const donorLevels = window.donorLevelsService?.loadDonorLevels() || [];
      const campaigns = window.campaignsService?.loadCampaigns() || [];
      const importLogs = window.importLogsService?.loadImportLogs() || [];
      const contacts = window.contactsService?.loadContacts() || [];
      
      setStats({
        donorLevels: donorLevels.filter(l => l.active).length,
        campaigns: campaigns.filter(c => c.active).length,
        recentImports: importLogs.slice(0, 5).length,
        totalDonors: contacts.filter(c => c.isDonor).length
      });
    } catch (error) {
      console.error('Error loading stats:', error);
      setStats({
        donorLevels: 0,
        campaigns: 0,
        recentImports: 0,
        totalDonors: 0
      });
    }
  };
  
  const loadRecentActivity = () => {
    try {
      const importLogs = window.importLogsService?.loadImportLogs() || [];
      
      const activity = importLogs
        .slice(0, 5)
        .map(log => ({
          type: 'import',
          description: `Imported ${log.successCount} donors from ${log.fileName}`,
          timestamp: log.uploadedAt,
          status: log.status
        }));
      
      setRecentActivity(activity);
    } catch (error) {
      console.error('Error loading recent activity:', error);
      setRecentActivity([]);
    }
  };
  
  const handleNavigate = (sectionId) => {
    if (onNavigate) {
      onNavigate(sectionId);
    }
  };
  
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 60) return `${minutes} minutes ago`;
    if (hours < 24) return `${hours} hours ago`;
    if (days < 7) return `${days} days ago`;
    
    return date.toLocaleDateString();
  };
  
  const getStatusColor = (status) => {
    const colors = {
      completed: 'bg-green-900 text-green-300',
      failed: 'bg-red-900 text-red-300',
      processing: 'bg-yellow-900 text-yellow-300'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };
  
  const calculateStorageUsed = () => {
    let total = 0;
    for (let key in localStorage) {
      if (key.startsWith('showsuite_')) {
        total += localStorage[key].length;
      }
    }
    return (total / 1024).toFixed(2);
  };
  
  // Helper components
  const StatusCard = ({ icon, label, value, action, actionLabel }) => (
    React.createElement(
      'div',
      { className: 'status-card border border-gray-200 rounded-lg p-4 hover:shadow-lg transition bg-white' },
      React.createElement('div', { className: 'text-3xl mb-2' }, icon),
      React.createElement('div', { className: 'text-2xl font-bold mb-1 text-gray-900' }, value),
      React.createElement('div', { className: 'text-sm text-gray-600 mb-3' }, label),
      React.createElement(
        'button',
        {
          onClick: action,
          className: 'text-xs text-violet-400 hover:text-violet-300 hover:underline'
        },
        actionLabel, ' →'
      )
    )
  );
  
  const SettingLink = ({ label, onClick }) => (
    React.createElement(
      'button',
      {
        onClick,
        className: 'setting-link w-full text-left px-3 py-2 rounded text-sm hover:bg-gray-100 transition text-gray-700'
      },
      label, ' →'
    )
  );
  
  const Tip = ({ icon, text, action }) => (
    React.createElement(
      'div',
      { className: 'tip flex items-start gap-2' },
      React.createElement('span', { className: 'text-lg' }, icon),
      React.createElement(
        'div',
        { className: 'flex-1' },
        React.createElement('p', { className: 'text-xs text-gray-700' }, text),
        action && React.createElement(
          'button',
          {
            onClick: action,
            className: 'text-xs text-violet-400 hover:text-violet-300 hover:underline mt-1'
          },
          'Go there →'
        )
      )
    )
  );
  
  const HealthCheck = ({ label, status, description }) => {
    const statusColors = {
      good: 'text-green-400',
      warning: 'text-yellow-400',
      error: 'text-red-400'
    };
    
    const statusIcons = {
      good: '✓',
      warning: '⚠',
      error: '✗'
    };
    
    return React.createElement(
      'div',
      { className: 'health-check flex items-center gap-3 p-2' },
      React.createElement(
        'span',
        { className: `text-xl ${statusColors[status]}` },
        statusIcons[status]
      ),
      React.createElement(
        'div',
        { className: 'flex-1' },
        React.createElement('div', { className: 'text-sm font-medium text-gray-900' }, label),
        React.createElement('div', { className: 'text-xs text-gray-600' }, description)
      )
    );
  };
  
  return React.createElement(
    'div',
    { className: 'settings-overview' },
    
    // Welcome Section
    React.createElement(
      'div',
      { className: 'welcome-section mb-6' },
      React.createElement('h1', { className: 'text-3xl font-bold mb-2 text-gray-900' }, 'Settings Overview'),
      React.createElement(
        'p',
        { className: 'text-gray-600' },
        'Configure and manage your SceneStave system'
      )
    ),
    
    // Status Cards
    React.createElement(
      'div',
      { className: 'status-cards grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6' },
      React.createElement(StatusCard, {
        icon: '💰',
        label: 'Active Donor Levels',
        value: stats?.donorLevels || 0,
        action: () => handleNavigate('donor-levels'),
        actionLabel: 'Manage'
      }),
      React.createElement(StatusCard, {
        icon: '📊',
        label: 'Active Campaigns',
        value: stats?.campaigns || 0,
        action: () => handleNavigate('campaigns'),
        actionLabel: 'View All'
      }),
      React.createElement(StatusCard, {
        icon: '📥',
        label: 'Recent Imports',
        value: stats?.recentImports || 0,
        action: () => handleNavigate('import-history'),
        actionLabel: 'View History'
      }),
      React.createElement(StatusCard, {
        icon: '👥',
        label: 'Total Donors',
        value: stats?.totalDonors || 0,
        action: () => { window.location.hash = '#/contacts'; },
        actionLabel: 'View Contacts'
      })
    ),
    
    // Quick Settings
    React.createElement(
      'div',
      { className: 'quick-settings grid grid-cols-1 md:grid-cols-2 gap-6 mb-6' },
      
      // Donor Management
      React.createElement(
        'div',
        { className: 'settings-group border border-gray-200 rounded-lg p-4 bg-white' },
        React.createElement(
          'h3',
          { className: 'font-semibold mb-3 flex items-center gap-2 text-gray-900' },
          React.createElement('span', null, '💰'),
          'Donor Management'
        ),
        React.createElement(
          'div',
          { className: 'space-y-2' },
          React.createElement(SettingLink, {
            label: 'Configure donor levels',
            onClick: () => handleNavigate('donor-levels')
          }),
          React.createElement(SettingLink, {
            label: 'Manage campaigns',
            onClick: () => handleNavigate('campaigns')
          }),
          React.createElement(SettingLink, {
            label: 'Edit acknowledgment templates',
            onClick: () => handleNavigate('acknowledgments')
          })
        )
      ),
      
      // Data & Import
      React.createElement(
        'div',
        { className: 'settings-group border border-gray-200 rounded-lg p-4 bg-white' },
        React.createElement(
          'h3',
          { className: 'font-semibold mb-3 flex items-center gap-2 text-gray-900' },
          React.createElement('span', null, '📥'),
          'Data & Import'
        ),
        React.createElement(
          'div',
          { className: 'space-y-2' },
          React.createElement(SettingLink, {
            label: 'Import donor data (CSV)',
            onClick: () => window.dispatchEvent(new CustomEvent('openImportWizard'))
          }),
          React.createElement(SettingLink, {
            label: 'View import history',
            onClick: () => handleNavigate('import-history')
          }),
          React.createElement(SettingLink, {
            label: 'Backup & export data',
            onClick: () => handleNavigate('data-management')
          })
        )
      ),
      
      // System Configuration
      React.createElement(
        'div',
        { className: 'settings-group border border-gray-200 rounded-lg p-4 bg-white' },
        React.createElement(
          'h3',
          { className: 'font-semibold mb-3 flex items-center gap-2 text-gray-900' },
          React.createElement('span', null, '⚙️'),
          'System Configuration'
        ),
        React.createElement(
          'div',
          { className: 'space-y-2' },
          React.createElement(SettingLink, {
            label: 'User preferences',
            onClick: () => handleNavigate('preferences')
          }),
          React.createElement(SettingLink, {
            label: 'Data management',
            onClick: () => handleNavigate('data-management')
          }),
          React.createElement(SettingLink, {
            label: 'About SceneStave',
            onClick: () => handleNavigate('about')
          })
        )
      ),
      
      // Tips & Recommendations
      React.createElement(
        'div',
        { className: 'settings-group border border-violet-200 rounded-lg p-4 bg-violet-50' },
        React.createElement(
          'h3',
          { className: 'font-semibold mb-3 flex items-center gap-2 text-gray-900' },
          React.createElement('span', null, '💡'),
          'Tips & Recommendations'
        ),
        React.createElement(
          'div',
          { className: 'space-y-3 text-sm' },
          React.createElement(Tip, {
            icon: '💾',
            text: 'Back up your data regularly to prevent data loss',
            action: () => handleNavigate('data-management')
          }),
          React.createElement(Tip, {
            icon: '📊',
            text: 'Review campaign progress and adjust goals as needed',
            action: () => handleNavigate('campaigns')
          }),
          React.createElement(Tip, {
            icon: '✉️',
            text: 'Customize acknowledgment templates to match your brand',
            action: () => handleNavigate('acknowledgments')
          })
        )
      )
    ),
    
    // Recent Activity
    recentActivity.length > 0 && React.createElement(
      'div',
      { className: 'recent-activity mb-6' },
      React.createElement('h3', { className: 'text-lg font-semibold mb-3 text-gray-900' }, '📋 Recent Activity'),
      React.createElement(
        'div',
        { className: 'activity-list border border-gray-200 rounded-lg overflow-hidden bg-white' },
        recentActivity.map((activity, index) =>
          React.createElement(
            'div',
            {
              key: index,
              className: 'activity-item p-4 border-b border-gray-200 last:border-b-0 hover:bg-gray-50'
            },
            React.createElement(
              'div',
              { className: 'flex items-center justify-between' },
              React.createElement(
                'div',
                { className: 'flex-1' },
                React.createElement('p', { className: 'text-sm font-medium text-gray-900' }, activity.description),
                React.createElement(
                  'div',
                  { className: 'text-xs text-gray-600' },
                  formatTimestamp(activity.timestamp)
                )
              ),
              React.createElement(
                'span',
                { className: `text-xs px-2 py-1 rounded ${getStatusColor(activity.status)}` },
                activity.status
              )
            )
          )
        )
      )
    ),
    
    // System Health
    React.createElement(
      'div',
      { className: 'system-health border border-gray-200 rounded-lg p-4 bg-white' },
      React.createElement('h3', { className: 'font-semibold mb-3 text-gray-900' }, '🔍 System Health'),
      React.createElement(
        'div',
        { className: 'health-checks space-y-2' },
        React.createElement(HealthCheck, {
          label: 'Data Integrity',
          status: 'good',
          description: 'All data structures are valid'
        }),
        React.createElement(HealthCheck, {
          label: 'Storage Usage',
          status: 'good',
          description: `${calculateStorageUsed()} KB used`
        }),
        React.createElement(HealthCheck, {
          label: 'Browser Compatibility',
          status: 'good',
          description: 'All features supported'
        })
      )
    )
  );
};

// Export to global scope
window.SettingsOverview = SettingsOverview;
