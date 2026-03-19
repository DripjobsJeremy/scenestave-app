/**
 * AboutSettings Component
 * 
 * Displays version information, features, system details, resources, credits, and license.
 */
(function (global) {
  'use strict';

  const { React } = global;

  // Helper components
  const FeatureCard = ({ icon, title, description }) => (
    React.createElement(
      'div',
        React.createElement('h3', { className: 'text-lg font-semibold mb-3 text-gray-900' }, '✨ Features'),
      React.createElement('div', { className: 'text-2xl mb-2' }, icon),
      React.createElement('h4', { className: 'font-semibold text-sm mb-1 text-gray-900' }, title),
      React.createElement('p', { className: 'text-xs text-gray-600' }, description)
    )
  );

  const InfoRow = ({ label, value }) => (
    React.createElement(
      'div',
      { className: 'info-row' },
      React.createElement('div', { className: 'text-xs text-gray-600' }, label),
      React.createElement('div', { className: 'text-sm font-medium text-gray-900' }, value)
    )
  );

  const ResourceLink = ({ icon, title, description, onClick }) => (
    React.createElement(
      'button',
      {
        onClick,
        className: 'flex items-center gap-3 w-full p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-left'
      },
      React.createElement('div', { className: 'text-2xl' }, icon),
      React.createElement(
        'div',
        { className: 'flex-1' },
        React.createElement('div', { className: 'font-semibold text-sm text-gray-900' }, title),
        React.createElement('div', { className: 'text-xs text-gray-600' }, description)
      ),
      React.createElement('div', { className: 'text-gray-600' }, '→')
    )
  );

  // Helper functions
  const getBrowserInfo = () => {
    const ua = navigator.userAgent;
    if (/Edg\//.test(ua)) return 'Microsoft Edge';
    if (/Chrome\//.test(ua)) return 'Chrome';
    if (/Firefox\//.test(ua)) return 'Firefox';
    if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) return 'Safari';
    return 'Unknown';
  };

  const checkStorageAvailable = () => {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  };

  const getDataVersion = () => {
    const version = localStorage.getItem('showsuite_data_version');
    return version || '1.0';
  };

  const AboutSettings = () => {
    const [systemInfo, setSystemInfo] = React.useState(null);

    React.useEffect(() => {
      loadSystemInfo();
    }, []);

    const loadSystemInfo = () => {
      setSystemInfo({
        version: '1.0.0',
        buildDate: '2025-11-16',
        browser: getBrowserInfo(),
        storageAvailable: checkStorageAvailable(),
        dataVersion: getDataVersion()
      });
    };

    const handleOpenUserGuide = () => {
      alert('User guide coming soon! For now, explore the interface and tooltips.');
    };

    const handleOpenSupport = () => {
      alert('Support resources are being developed. Check back soon!');
    };

    const handleReportIssue = () => {
      const message = `Please describe the issue you encountered:\n\nBrowser: ${getBrowserInfo()}\nVersion: ${systemInfo?.version || '1.0.0'}`;
      prompt(message);
    };

    const handleFeatureRequest = () => {
      const message = 'What feature would you like to see in SceneStave?';
      prompt(message);
    };

    // Render component
    return React.createElement(
      'div',
      { className: 'about-settings' },

      // Header
      React.createElement(
        'div',
        { className: 'section-header mb-6' },
        React.createElement('h2', { className: 'text-2xl font-bold mb-1 text-gray-900' }, 'About SceneStave'),
        React.createElement('p', { className: 'text-sm text-gray-600' }, 'Version information and system details')
      ),

      // SceneStave Info
      React.createElement(
        'div',
        { className: 'showsuite-info mb-6 p-6 border border-violet-600/30 rounded-lg bg-gradient-to-br from-violet-900/30 to-blue-900/30' },
        React.createElement(
          'div',
          { className: 'flex items-start gap-4' },
          React.createElement('div', { className: 'logo text-6xl' }, '🎭'),
          React.createElement(
            'div',
            { className: 'flex-1' },
            React.createElement('h1', { className: 'text-3xl font-bold mb-2 text-gray-900' }, 'SceneStave'),
            React.createElement('p', { className: 'text-lg text-gray-600 mb-3' }, 'Theatre Management CRM'),
            React.createElement(
              'div',
              { className: 'version-info text-sm space-y-1 text-gray-700' },
              React.createElement('div', null, React.createElement('strong', null, 'Version: '), systemInfo?.version || 'Loading...'),
              React.createElement('div', null, React.createElement('strong', null, 'Build Date: '), systemInfo?.buildDate || 'Loading...'),
              React.createElement('div', null, React.createElement('strong', null, 'Data Schema: '), `v${systemInfo?.dataVersion || '1.0'}`)
            )
          )
        )
      ),

      // Features Overview
      React.createElement(
        'div',
        { className: 'features-section mb-6' },
        React.createElement('h3', { className: 'text-lg font-semibold mb-3 text-gray-900' }, '✨ Features'),
        React.createElement(
          'div',
          { className: 'grid grid-cols-2 gap-3' },
          React.createElement(FeatureCard, { icon: '💰', title: 'Donor Management', description: 'Track donations, manage donor levels, and generate acknowledgments' }),
          React.createElement(FeatureCard, { icon: '📊', title: 'Campaign Tracking', description: 'Monitor fundraising campaigns with goals and progress reports' }),
          React.createElement(FeatureCard, { icon: '📥', title: 'CSV Import', description: 'Bulk import donor data with intelligent field mapping' }),
          React.createElement(FeatureCard, { icon: '📄', title: 'Reports & Export', description: 'Generate detailed reports and export data in multiple formats' }),
          React.createElement(FeatureCard, { icon: '🎨', title: 'Production Planning', description: 'Scene builder and department collaboration tools' }),
          React.createElement(FeatureCard, { icon: '📅', title: 'Calendar Management', description: 'Auditions, rehearsals, and show scheduling' })
        )
      ),

      // System Information
      React.createElement(
        'div',
        { className: 'system-info-section mb-6' },
        React.createElement('h3', { className: 'text-lg font-semibold mb-3 text-gray-900' }, '🖥️ System Information'),
        React.createElement(
          'div',
          { className: 'info-grid grid grid-cols-2 gap-4 p-4 border border-gray-200 rounded bg-white' },
          React.createElement(InfoRow, { label: 'Browser', value: systemInfo?.browser || 'Unknown' }),
          React.createElement(InfoRow, { label: 'Storage Available', value: systemInfo?.storageAvailable ? 'Yes (localStorage)' : 'Limited' }),
          React.createElement(InfoRow, { label: 'Data Location', value: 'Browser localStorage (client-side only)' }),
          React.createElement(InfoRow, { label: 'Architecture', value: 'Single-page application (no backend)' })
        )
      ),

      // Resources & Links
      React.createElement(
        'div',
        { className: 'resources-section mb-6' },
        React.createElement('h3', { className: 'text-lg font-semibold mb-3 text-gray-900' }, '📚 Resources'),
        React.createElement(
          'div',
          { className: 'resources-list space-y-2' },
          React.createElement(ResourceLink, { icon: '📖', title: 'User Guide', description: 'Learn how to use SceneStave effectively', onClick: () => handleOpenUserGuide() }),
          React.createElement(ResourceLink, { icon: '❓', title: 'Help & Support', description: 'Get help with common questions', onClick: () => handleOpenSupport() }),
          React.createElement(ResourceLink, { icon: '🐛', title: 'Report an Issue', description: 'Found a bug? Let us know', onClick: () => handleReportIssue() }),
          React.createElement(ResourceLink, { icon: '💡', title: 'Request a Feature', description: 'Suggest improvements to SceneStave', onClick: () => handleFeatureRequest() })
        )
      ),

      // Credits
      React.createElement(
        'div',
        { className: 'credits-section mb-6 p-4 border border-gray-200 rounded bg-white' },
        React.createElement('h3', { className: 'text-lg font-semibold mb-3 text-gray-900' }, '👏 Credits'),
        React.createElement(
          'div',
          { className: 'text-sm text-gray-700 space-y-2' },
          React.createElement('p', null, React.createElement('strong', null, 'Built with:'), ' React, Tailwind CSS, Babel Standalone'),
          React.createElement('p', null, React.createElement('strong', null, 'Libraries:'), ' PapaParse (CSV), SheetJS (Excel)'),
          React.createElement('p', { className: 'text-gray-600 mt-4' }, 'SceneStave is designed for theatre organizations of all sizes. All data is stored locally in your browser for privacy and security.')
        )
      ),

      // License & Legal
      React.createElement(
        'div',
        { className: 'legal-section text-center text-xs text-gray-600' },
        React.createElement('p', null, '© 2025 SceneStave. All rights reserved.'),
        React.createElement(
          'p',
          { className: 'mt-1' },
          React.createElement('a', { href: '#', className: 'hover:text-gray-800' }, 'Privacy Policy'),
          ' • ',
          React.createElement('a', { href: '#', className: 'hover:text-gray-800' }, 'Terms of Service')
        )
      )
    );
  };

  // Export to global scope
  global.AboutSettings = AboutSettings;
})(window);
