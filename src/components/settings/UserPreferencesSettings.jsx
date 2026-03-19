/**
 * UserPreferencesSettings Component
 * 
 * Allows users to customize their SceneStave experience with display options,
 * defaults, notifications, and privacy preferences.
 */

const UserPreferencesSettings = () => {
  const [preferences, setPreferences] = React.useState({
    display: {
      theme: 'dark',
      dateFormat: 'MM/DD/YYYY',
      timeFormat: '12h',
      currencyFormat: 'USD',
      itemsPerPage: 25,
      defaultView: 'grid'
    },
    defaults: {
      donationRecurringType: 'One-Time',
      donationCampaign: 'general',
      taxDeductible: true,
      contactTags: []
    },
    notifications: {
      showSuccessMessages: true,
      showWarnings: true,
      autoSaveReminders: true
    },
    privacy: {
      rememberFilters: true,
      saveFormDrafts: true
    }
  });
  
  const [hasChanges, setHasChanges] = React.useState(false);
  
  React.useEffect(() => {
    loadPreferences();
  }, []);
  
  /**
   * Load preferences from service
   */
  const loadPreferences = () => {
    try {
      const saved = window.preferencesService.loadPreferences();
      if (saved) {
        setPreferences(saved);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };
  
  /**
   * Handle display setting changes
   */
  const handleDisplayChange = (key, value) => {
    setPreferences({
      ...preferences,
      display: {
        ...preferences.display,
        [key]: value
      }
    });
    setHasChanges(true);
  };
  
  /**
   * Handle default value changes
   */
  const handleDefaultChange = (key, value) => {
    setPreferences({
      ...preferences,
      defaults: {
        ...preferences.defaults,
        [key]: value
      }
    });
    setHasChanges(true);
  };
  
  /**
   * Handle default tag toggle
   */
  const handleDefaultTagToggle = (tag, checked) => {
    const currentTags = preferences.defaults.contactTags || [];
    const newTags = checked
      ? [...currentTags, tag]
      : currentTags.filter(t => t !== tag);
    
    handleDefaultChange('contactTags', newTags);
  };
  
  /**
   * Handle notification setting changes
   */
  const handleNotificationChange = (key, value) => {
    setPreferences({
      ...preferences,
      notifications: {
        ...preferences.notifications,
        [key]: value
      }
    });
    setHasChanges(true);
  };
  
  /**
   * Handle privacy setting changes
   */
  const handlePrivacyChange = (key, value) => {
    setPreferences({
      ...preferences,
      privacy: {
        ...preferences.privacy,
        [key]: value
      }
    });
    setHasChanges(true);
  };
  
  /**
   * Save preferences
   */
  const handleSave = () => {
    try {
      window.preferencesService.savePreferences(preferences);
      setHasChanges(false);
      alert('✓ Preferences saved successfully!');
    } catch (error) {
      console.error('Error saving preferences:', error);
      alert('Failed to save preferences. Please try again.');
    }
  };
  
  /**
   * Reset to default preferences
   */
  const handleResetToDefaults = () => {
    if (confirm('Reset all preferences to default values?')) {
      const defaults = window.preferencesService.getDefaultPreferences();
      setPreferences(defaults);
      setHasChanges(true);
    }
  };
  
  /**
   * Format date preview
   */
  const formatDatePreview = (format) => {
    const date = new Date();
    
    switch (format) {
      case 'MM/DD/YYYY':
        return date.toLocaleDateString('en-US');
      case 'DD/MM/YYYY':
        return date.toLocaleDateString('en-GB');
      case 'YYYY-MM-DD':
        return date.toISOString().split('T')[0];
      default:
        return date.toLocaleDateString();
    }
  };
  
  /**
   * Format time preview
   */
  const formatTimePreview = (format) => {
    const now = new Date();
    
    if (format === '12h') {
      return now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    } else {
      return now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    }
  };
  
  /**
   * Format currency preview
   */
  const formatCurrencyPreview = (amount, currency) => {
    const currencyMap = {
      'USD': 'en-US',
      'EUR': 'de-DE',
      'GBP': 'en-GB',
      'CAD': 'en-CA'
    };
    
    return new Intl.NumberFormat(currencyMap[currency] || 'en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };
  
  /**
   * Get active campaigns for dropdown
   */
  const getCampaigns = () => {
    try {
      if (window.campaignsService) {
        return window.campaignsService.loadCampaigns().filter(c => c.active);
      }
      return [];
    } catch (error) {
      console.error('Error loading campaigns:', error);
      return [];
    }
  };
  
  // Render component
  return React.createElement(
    'div',
    { className: 'user-preferences-settings' },
    
    // Section Header
    React.createElement(
      'div',
      { className: 'section-header mb-6' },
      React.createElement('h2', { className: 'text-2xl font-bold mb-2 text-gray-900' }, 'User Preferences'),
      React.createElement('p', { className: 'text-sm text-gray-600' },
        'Customize your SceneStave experience'
      )
    ),
    
    // Display Settings
    React.createElement(
      'div',
      { className: 'section mb-6 p-4 bg-white border border-gray-200 rounded-lg' },
      React.createElement('h3', { className: 'text-lg font-semibold mb-4 text-gray-900' }, '🎨 Display Settings'),
      
      React.createElement(
        'div',
        { className: 'grid grid-cols-2 gap-4' },
        
        // Theme
        React.createElement(
          'div',
          null,
          React.createElement('label', { className: 'block text-sm font-medium mb-2 text-gray-900' }, 'Theme'),
          React.createElement(
            'select',
            {
              value: preferences.display.theme,
              onChange: (e) => handleDisplayChange('theme', e.target.value),
              className: 'w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900'
            },
            React.createElement('option', { value: 'dark' }, 'Dark'),
            React.createElement('option', { value: 'light' }, 'Light (Coming Soon)'),
            React.createElement('option', { value: 'auto' }, 'Auto (System)')
          )
        ),
        
        // Date Format
        React.createElement(
          'div',
          null,
          React.createElement('label', { className: 'block text-sm font-medium mb-2 text-gray-900' }, 'Date Format'),
          React.createElement(
            'select',
            {
              value: preferences.display.dateFormat,
              onChange: (e) => handleDisplayChange('dateFormat', e.target.value),
              className: 'w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900'
            },
            React.createElement('option', { value: 'MM/DD/YYYY' }, 'MM/DD/YYYY (US)'),
            React.createElement('option', { value: 'DD/MM/YYYY' }, 'DD/MM/YYYY (UK)'),
            React.createElement('option', { value: 'YYYY-MM-DD' }, 'YYYY-MM-DD (ISO)')
          ),
          React.createElement('p', { className: 'text-xs text-gray-600 mt-1' },
            `Preview: ${formatDatePreview(preferences.display.dateFormat)}`
          )
        ),
        
        // Time Format
        React.createElement(
          'div',
          null,
          React.createElement('label', { className: 'block text-sm font-medium mb-2 text-gray-900' }, 'Time Format'),
          React.createElement(
            'select',
            {
              value: preferences.display.timeFormat,
              onChange: (e) => handleDisplayChange('timeFormat', e.target.value),
              className: 'w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900'
            },
            React.createElement('option', { value: '12h' }, '12-hour (AM/PM)'),
            React.createElement('option', { value: '24h' }, '24-hour (Military)')
          ),
          React.createElement('p', { className: 'text-xs text-gray-600 mt-1' },
            `Preview: ${formatTimePreview(preferences.display.timeFormat)}`
          )
        ),
        
        // Currency Format
        React.createElement(
          'div',
          null,
          React.createElement('label', { className: 'block text-sm font-medium mb-2 text-gray-900' }, 'Currency Format'),
          React.createElement(
            'select',
            {
              value: preferences.display.currencyFormat,
              onChange: (e) => handleDisplayChange('currencyFormat', e.target.value),
              className: 'w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900'
            },
            React.createElement('option', { value: 'USD' }, 'USD ($)'),
            React.createElement('option', { value: 'EUR' }, 'EUR (€)'),
            React.createElement('option', { value: 'GBP' }, 'GBP (£)'),
            React.createElement('option', { value: 'CAD' }, 'CAD (C$)')
          ),
          React.createElement('p', { className: 'text-xs text-gray-600 mt-1' },
            `Preview: ${formatCurrencyPreview(1234.56, preferences.display.currencyFormat)}`
          )
        ),
        
        // Items Per Page
        React.createElement(
          'div',
          null,
          React.createElement('label', { className: 'block text-sm font-medium mb-2 text-gray-900' }, 'Items Per Page'),
          React.createElement(
            'select',
            {
              value: preferences.display.itemsPerPage,
              onChange: (e) => handleDisplayChange('itemsPerPage', parseInt(e.target.value)),
              className: 'w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900'
            },
            React.createElement('option', { value: '10' }, '10 items'),
            React.createElement('option', { value: '25' }, '25 items'),
            React.createElement('option', { value: '50' }, '50 items'),
            React.createElement('option', { value: '100' }, '100 items')
          )
        ),
        
        // Default View
        React.createElement(
          'div',
          { className: 'col-span-2' },
          React.createElement('label', { className: 'block text-sm font-medium mb-2 text-gray-900' }, 'Default View for Lists'),
          React.createElement(
            'div',
            { className: 'flex gap-4' },
            React.createElement(
              'label',
              { className: 'flex items-center cursor-pointer' },
              React.createElement('input', {
                type: 'radio',
                name: 'defaultView',
                value: 'grid',
                checked: preferences.display.defaultView === 'grid',
                onChange: (e) => handleDisplayChange('defaultView', e.target.value),
                className: 'mr-2'
              }),
              React.createElement('span', { className: 'text-sm text-gray-700' }, 'Grid View (Cards)')
            ),
            React.createElement(
              'label',
              { className: 'flex items-center cursor-pointer' },
              React.createElement('input', {
                type: 'radio',
                name: 'defaultView',
                value: 'list',
                checked: preferences.display.defaultView === 'list',
                onChange: (e) => handleDisplayChange('defaultView', e.target.value),
                className: 'mr-2'
              }),
              React.createElement('span', { className: 'text-sm text-gray-700' }, 'List View (Table)')
            )
          )
        )
      )
    ),
    
    // Default Values
    React.createElement(
      'div',
      { className: 'section mb-6 p-4 bg-white border border-gray-200 rounded-lg' },
      React.createElement('h3', { className: 'text-lg font-semibold mb-2 text-gray-900' }, '⚙️ Default Values'),
      React.createElement('p', { className: 'text-sm text-gray-600 mb-4' },
        'Set default values for new forms to save time'
      ),
      
      React.createElement(
        'div',
        { className: 'grid grid-cols-2 gap-4' },
        
        // Default Donation Type
        React.createElement(
          'div',
          null,
          React.createElement('label', { className: 'block text-sm font-medium mb-2 text-gray-900' }, 'Default Donation Type'),
          React.createElement(
            'select',
            {
              value: preferences.defaults.donationRecurringType,
              onChange: (e) => handleDefaultChange('donationRecurringType', e.target.value),
              className: 'w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900'
            },
            React.createElement('option', { value: 'One-Time' }, 'One-Time'),
            React.createElement('option', { value: 'Monthly' }, 'Monthly'),
            React.createElement('option', { value: 'Quarterly' }, 'Quarterly'),
            React.createElement('option', { value: 'Annual' }, 'Annual')
          )
        ),
        
        // Default Campaign
        React.createElement(
          'div',
          null,
          React.createElement('label', { className: 'block text-sm font-medium mb-2 text-gray-900' }, 'Default Campaign'),
          React.createElement(
            'select',
            {
              value: preferences.defaults.donationCampaign,
              onChange: (e) => handleDefaultChange('donationCampaign', e.target.value),
              className: 'w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900'
            },
            React.createElement('option', { value: 'general' }, 'General Operating Fund'),
            ...getCampaigns().map(campaign =>
              React.createElement('option', { key: campaign.id, value: campaign.id }, campaign.name)
            )
          )
        ),
        
        // Tax Deductible Default
        React.createElement(
          'div',
          { className: 'col-span-2' },
          React.createElement(
            'label',
            { className: 'flex items-center cursor-pointer' },
            React.createElement('input', {
              type: 'checkbox',
              checked: preferences.defaults.taxDeductible,
              onChange: (e) => handleDefaultChange('taxDeductible', e.target.checked),
              className: 'mr-2'
            }),
            React.createElement('span', { className: 'text-sm text-gray-700' }, 'Default donations as tax-deductible')
          )
        ),
        
        // Default Contact Tags
        React.createElement(
          'div',
          { className: 'col-span-2' },
          React.createElement('label', { className: 'block text-sm font-medium mb-2 text-gray-900' }, 'Default Contact Tags'),
          React.createElement('p', { className: 'text-xs text-gray-600 mb-2' },
            'These tags will be pre-selected when creating new contacts'
          ),
          React.createElement(
            'div',
            { className: 'flex flex-wrap gap-3' },
            ['Board', 'Actor', 'Crew', 'Director', 'Designer', 'Volunteer'].map(tag =>
              React.createElement(
                'label',
                { key: tag, className: 'flex items-center cursor-pointer' },
                React.createElement('input', {
                  type: 'checkbox',
                  checked: (preferences.defaults.contactTags || []).includes(tag),
                  onChange: (e) => handleDefaultTagToggle(tag, e.target.checked),
                  className: 'mr-2'
                }),
                React.createElement('span', { className: 'text-sm text-gray-700' }, tag)
              )
            )
          )
        )
      )
    ),
    
    // Notifications
    React.createElement(
      'div',
      { className: 'section mb-6 p-4 bg-white border border-gray-200 rounded-lg' },
      React.createElement('h3', { className: 'text-lg font-semibold mb-4 text-gray-900' }, '🔔 Notifications'),
      
      React.createElement(
        'div',
        { className: 'space-y-3' },
        
        // Success Messages
        React.createElement(
          'label',
          { className: 'flex items-start cursor-pointer' },
          React.createElement('input', {
            type: 'checkbox',
            checked: preferences.notifications.showSuccessMessages,
            onChange: (e) => handleNotificationChange('showSuccessMessages', e.target.checked),
            className: 'mr-3 mt-1'
          }),
          React.createElement(
            'div',
            null,
            React.createElement('div', { className: 'text-sm font-medium text-gray-900' }, 'Show success messages'),
            React.createElement('div', { className: 'text-xs text-gray-600' },
              'Display confirmation when actions complete successfully'
            )
          )
        ),
        
        // Warning Messages
        React.createElement(
          'label',
          { className: 'flex items-start cursor-pointer' },
          React.createElement('input', {
            type: 'checkbox',
            checked: preferences.notifications.showWarnings,
            onChange: (e) => handleNotificationChange('showWarnings', e.target.checked),
            className: 'mr-3 mt-1'
          }),
          React.createElement(
            'div',
            null,
            React.createElement('div', { className: 'text-sm font-medium text-gray-900' }, 'Show warning messages'),
            React.createElement('div', { className: 'text-xs text-gray-600' },
              'Display warnings for potential issues'
            )
          )
        ),
        
        // Auto-save Reminders
        React.createElement(
          'label',
          { className: 'flex items-start cursor-pointer' },
          React.createElement('input', {
            type: 'checkbox',
            checked: preferences.notifications.autoSaveReminders,
            onChange: (e) => handleNotificationChange('autoSaveReminders', e.target.checked),
            className: 'mr-3 mt-1'
          }),
          React.createElement(
            'div',
            null,
            React.createElement('div', { className: 'text-sm font-medium text-gray-900' }, 'Auto-save reminders'),
            React.createElement('div', { className: 'text-xs text-gray-600' },
              'Remind to save changes when leaving pages'
            )
          )
        )
      )
    ),
    
    // Privacy & Data
    React.createElement(
      'div',
      { className: 'section mb-6 p-4 bg-white border border-gray-200 rounded-lg' },
      React.createElement('h3', { className: 'text-lg font-semibold mb-4 text-gray-900' }, '🔒 Privacy & Data'),
      
      React.createElement(
        'div',
        { className: 'space-y-3' },
        
        // Remember Filters
        React.createElement(
          'label',
          { className: 'flex items-start cursor-pointer' },
          React.createElement('input', {
            type: 'checkbox',
            checked: preferences.privacy.rememberFilters,
            onChange: (e) => handlePrivacyChange('rememberFilters', e.target.checked),
            className: 'mr-3 mt-1'
          }),
          React.createElement(
            'div',
            null,
            React.createElement('div', { className: 'text-sm font-medium text-gray-900' }, 'Remember filters and search'),
            React.createElement('div', { className: 'text-xs text-gray-600' },
              'Keep your filter preferences between sessions'
            )
          )
        ),
        
        // Save Form Drafts
        React.createElement(
          'label',
          { className: 'flex items-start cursor-pointer' },
          React.createElement('input', {
            type: 'checkbox',
            checked: preferences.privacy.saveFormDrafts,
            onChange: (e) => handlePrivacyChange('saveFormDrafts', e.target.checked),
            className: 'mr-3 mt-1'
          }),
          React.createElement(
            'div',
            null,
            React.createElement('div', { className: 'text-sm font-medium text-gray-900' }, 'Save form drafts'),
            React.createElement('div', { className: 'text-xs text-gray-600' },
              'Auto-save form progress to prevent data loss'
            )
          )
        )
      )
    ),
    
    // Keyboard Shortcuts Reference
    React.createElement(
      'div',
      { className: 'section mb-6 p-4 bg-white border border-gray-200 rounded-lg' },
      React.createElement('h3', { className: 'text-lg font-semibold mb-4 text-gray-900' }, '⌨️ Keyboard Shortcuts'),
      React.createElement(
        'div',
        { className: 'grid grid-cols-2 gap-3 text-sm' },
        
        React.createElement(
          'div',
          { className: 'flex justify-between items-center' },
          React.createElement('span', { className: 'text-gray-600' }, 'Add new contact/donation'),
          React.createElement('kbd', { className: 'px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs text-gray-700' }, 'Ctrl+N')
        ),
        React.createElement(
          'div',
          { className: 'flex justify-between items-center' },
          React.createElement('span', { className: 'text-gray-600' }, 'Search'),
          React.createElement('kbd', { className: 'px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs text-gray-700' }, 'Ctrl+K')
        ),
        React.createElement(
          'div',
          { className: 'flex justify-between items-center' },
          React.createElement('span', { className: 'text-gray-600' }, 'Save form'),
          React.createElement('kbd', { className: 'px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs text-gray-700' }, 'Ctrl+S')
        ),
        React.createElement(
          'div',
          { className: 'flex justify-between items-center' },
          React.createElement('span', { className: 'text-gray-600' }, 'Cancel/Close modal'),
          React.createElement('kbd', { className: 'px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs text-gray-700' }, 'Esc')
        )
      )
    ),
    
    // Save Actions
    React.createElement(
      'div',
      { className: 'save-actions flex items-center justify-between pt-4 border-t border-gray-200' },
      hasChanges && React.createElement(
        'div',
        { className: 'text-sm text-orange-600' },
        '⚠️ You have unsaved changes'
      ),
      React.createElement(
        'div',
        { className: 'flex gap-3 ml-auto' },
        React.createElement(
          'button',
          {
            onClick: handleResetToDefaults,
            className: 'px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-medium transition-colors'
          },
          'Reset to Defaults'
        ),
        React.createElement(
          'button',
          {
            onClick: handleSave,
            disabled: !hasChanges,
            className: 'px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:bg-gray-200 disabled:text-gray-600 disabled:cursor-not-allowed text-gray-900 rounded-lg font-medium transition-colors'
          },
          'Save Preferences'
        )
      )
    )
  );
};

// Export to global scope
window.UserPreferencesSettings = UserPreferencesSettings;
