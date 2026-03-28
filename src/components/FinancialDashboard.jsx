/**
 * FinancialDashboard Page (permission-based)
 * Provides board members and financial officers with comprehensive financial oversight.
 */
(function (global) {
  'use strict';

  const { React } = global;
  const { useState, useEffect } = React;

  // Error Boundary for Financial Dashboard
  class FinancialDashboardErrorBoundary extends React.Component {
    constructor(props) {
      super(props);
      this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
      return { hasError: true, error };
    }
    componentDidCatch(error, info) {
      console.error('[FinancialDashboard] Render error:', error, info);
    }
    render() {
      if (this.state.hasError) {
        return React.createElement(
          'div',
          { className: 'max-w-2xl mx-auto mt-16 p-8 bg-gray-800 rounded-lg border border-red-700 text-center' },
          React.createElement('div', { className: 'text-5xl mb-4' }, '⚠️'),
          React.createElement('h2', { className: 'text-xl font-bold text-white mb-2' }, 'Something went wrong in the Financial Dashboard'),
          React.createElement('p', { className: 'text-gray-400 mb-6' }, 'An unexpected error occurred while loading this section. Your data is safe.'),
          React.createElement('p', { className: 'text-red-400 text-sm font-mono mb-6 bg-gray-900 p-3 rounded text-left' }, this.state.error?.message || 'Unknown error'),
          React.createElement(
            'div',
            { className: 'flex gap-3 justify-center' },
            React.createElement(
              'button',
              {
                onClick: () => this.setState({ hasError: false, error: null }),
                className: 'px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded font-medium'
              },
              '↺ Try Again'
            ),
            React.createElement(
              'button',
              {
                onClick: () => { window.location.hash = '#/dashboard'; },
                className: 'px-5 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded font-medium'
              },
              '← Go to Dashboard'
            )
          )
        );
      }
      return this.props.children;
    }
  }

  // TabButton component
  const TabButton = ({ active, onClick, icon, label }) => (
    React.createElement(
      'button',
      {
        onClick,
        className: `px-6 py-3 font-medium border-b-2 transition-colors ${
          active
            ? 'border-violet-600 text-violet-400'
            : 'border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-400'
        }`
      },
      React.createElement('span', { className: 'mr-2' }, icon),
      label
    )
  );

  // Use global FinancialOverview if available
  const FinancialOverviewView = global.FinancialOverview;
  const DonationsViewComponent = global.DonationsView;
  const DonorsViewComponent = global.DonorsView;
  const CampaignsViewComponent = global.CampaignsView;
  const ReportsViewComponent = global.ReportsView;

  // DonorsView provided globally via js/components/financial/DonorsView.jsx

  // CampaignsView provided globally via js/components/financial/CampaignsView.jsx

  // ReportsView provided globally via js/components/financial/ReportsView.jsx

  // Utility formatters
  const formatCurrency = (amount) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount || 0);

  // Main FinancialDashboard component
  const FinancialDashboard = () => {
    const [currentUser, setCurrentUser] = useState(null);
    const [activeView, setActiveView] = useState('overview'); // overview, donations, donors, reports
    const [dateRange, setDateRange] = useState('fiscal-year');
    const [financialData, setFinancialData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [appliedFilters, _setAppliedFilters] = useState(null);
    const [filteredData, setFilteredData] = useState(null);
    const filterDebounceRef = React.useRef(null);

    useEffect(() => {
      checkPermissions();
      syncFromHash();
      loadFinancialData();
      window.addEventListener('hashchange', syncFromHash);
      window.addEventListener('contactsUpdated', loadFinancialData);
      return () => {
        window.removeEventListener('hashchange', syncFromHash);
        window.removeEventListener('contactsUpdated', loadFinancialData);
      };
    }, []);

    useEffect(() => {
      loadFinancialData();
    }, [dateRange]);

    useEffect(() => {
      writeHashFromState();
    }, [activeView, dateRange]);

    // Keep dashboard dateRange in sync with filters panel
    useEffect(() => {
      if (appliedFilters && appliedFilters.dateRange && appliedFilters.dateRange !== dateRange) {
        setDateRange(appliedFilters.dateRange);
      }
    }, [appliedFilters]);

    // Recompute filtered dataset whenever base data or filters change
    useEffect(() => {
      if (!financialData) return;
      if (!appliedFilters) { setFilteredData(financialData); return; }
      setFilteredData(applyFilters(financialData, appliedFilters));
    }, [financialData, appliedFilters]);

    const checkPermissions = () => {
      const auth = global.authService;
      try {
        const user = auth?.getCurrentUser() ?? { id: 'user_admin', name: 'Admin User', role: 'admin' };
        if (!hasFinancialAccess(user)) {
          window.location.hash = '#/dashboard';
          alert('You do not have permission to access the Financial Dashboard.');
          return;
        }
        setCurrentUser(user);
      } catch (e) {
        console.error('Permission check failed:', e);
        alert('An error occurred while checking permissions.');
        window.location.hash = '#/dashboard';
      }
    };

    const hasFinancialAccess = (user) => {
      const allowedRoles = [
        'admin', 'super_admin', 'venue_manager',   // full admin roles
        'board_member',                             // org admins
        'financial_officer', 'accounting_manager'  // finance roles
      ];
      return !!user && allowedRoles.includes(user.role);
    };

    // Expose permission helper globally for tests
    global.hasFinancialAccess = hasFinancialAccess;

    const loadFinancialData = () => {
      setIsLoading(true);
      try {
        const donations = global.donationsService?.loadDonations() || [];
        const contacts = global.contactsService?.loadContacts() || [];
        const campaigns = global.campaignsService?.loadCampaigns() || [];
        const donorLevels = global.donorLevelsService?.loadDonorLevels() || [];

        const filteredDonations = filterByDateRange(donations, dateRange);

        const data = {
          donations: filteredDonations,
          allDonations: donations,
          contacts,
          campaigns,
          donorLevels,
          metrics: calculateMetrics(filteredDonations, contacts, campaigns),
          dateRange: {
            label: getDateRangeLabel(dateRange),
            start: getDateRangeStart(dateRange),
            end: new Date()
          }
        };

        setFinancialData(data);
      } catch (error) {
        console.error('Error loading financial data:', error);
        alert('Failed to load financial data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    const parseHash = () => {
      const hash = window.location.hash || '';
      const out = { route: '', params: {} };
      const [route, query] = hash.split('?');
      out.route = route;
      if (query) {
        query.split('&').forEach(kv => {
          const [k, v] = kv.split('=');
          if (k) out.params[decodeURIComponent(k)] = decodeURIComponent(v || '');
        });
      }
      return out;
    };

    const syncFromHash = () => {
      const { route, params } = parseHash();
      if (!route.startsWith('#/financial')) return;
      const viewParam = params.view;
      const rangeParam = params.range;
      if (viewParam && ['overview', 'donations', 'donors', 'campaigns', 'reports'].includes(viewParam) && viewParam !== activeView) {
        setActiveView(viewParam);
      }
      if (rangeParam && ['today','week','month','quarter','fiscal-year','calendar-year','all-time','custom'].includes(rangeParam) && rangeParam !== dateRange) {
        setDateRange(rangeParam);
      }
    };

    const writeHashFromState = () => {
      const { route, params } = parseHash();
      if (!route.startsWith('#/financial')) return; // don't overwrite other routes
      const nextParams = new URLSearchParams(params);
      nextParams.set('view', activeView);
      nextParams.set('range', dateRange);
      const next = `#/financial?${nextParams.toString()}`;
      if (window.location.hash !== next) {
        window.location.hash = next;
      }
    };

    const filterByDateRange = (donations, range) => {
      const now = new Date();
      let startDate;
      switch (range) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate = new Date(now);
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'quarter':
          startDate = new Date(now);
          startDate.setMonth(now.getMonth() - 3);
          break;
        case 'fiscal-year': {
          const year = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
          startDate = new Date(year, 6, 1); // July 1
          break;
        }
        case 'calendar-year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        case 'all-time':
          return donations;
        default:
          startDate = new Date(0);
      }
      return donations.filter(d => new Date(d.date) >= startDate);
    };

    const calculateMetrics = (donations, contacts, campaigns) => {
      const totalRevenue = donations.reduce((sum, d) => sum + (d.amount || 0), 0);
      const donorCount = new Set(donations.map(d => d.contactId)).size;
      const avgGift = donorCount > 0 ? totalRevenue / donorCount : 0;
      const totalDonations = donations.length;

      const byType = {
        monetary: donations.filter(d => d.donationType === 'monetary').reduce((sum, d) => sum + (d.amount || 0), 0),
        inKind: donations.filter(d => d.donationType === 'in-kind').reduce((sum, d) => sum + (d.estimatedValue || 0), 0)
      };

      const byRecurring = { 'One-Time': 0, 'Monthly': 0, 'Quarterly': 0, 'Annual': 0 };
      donations.forEach(d => {
        if (d.donationType === 'monetary') {
          const key = d.recurringType || 'One-Time';
          byRecurring[key] = (byRecurring[key] || 0) + (d.amount || 0);
        }
      });

      return { totalRevenue, donorCount, avgGift, totalDonations, byType, byRecurring };
    };

    // Expose core helpers globally for tests
    global.filterByDateRange = (donations, range) => filterByDateRange(donations, range);
    global.calculateMetrics = (donations, contacts, campaigns) => calculateMetrics(donations, contacts, campaigns);

    const getDateRangeLabel = (range) => {
      const labels = {
        'today': 'Today',
        'week': 'This Week',
        'month': 'This Month',
        'quarter': 'This Quarter',
        'fiscal-year': 'Fiscal Year',
        'calendar-year': 'Calendar Year',
        'all-time': 'All Time',
        'custom': 'Custom Range'
      };
      return labels[range] || range;
    };

    const getDateRangeStart = (range) => {
      const now = new Date();
      switch (range) {
        case 'fiscal-year': {
          const year = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
          return new Date(year, 6, 1);
        }
        case 'calendar-year':
          return new Date(now.getFullYear(), 0, 1);
        case 'quarter': {
          const d = new Date(now);
          d.setMonth(now.getMonth() - 3);
          return d;
        }
        case 'month': {
          const d = new Date(now);
          d.setMonth(now.getMonth() - 1);
          return d;
        }
        case 'week': {
          const d = new Date(now);
          d.setDate(now.getDate() - 7);
          return d;
        }
        case 'today':
          return new Date(now.getFullYear(), now.getMonth(), now.getDate());
        default:
          return new Date(0);
      }
    };

    // Apply advanced filters to base dataset
    const applyFilters = (baseData, filters) => {
      const allDonations = baseData.allDonations || [];
      // Start from date-range filtered donations unless custom range provided
      let workingDonations;
      if (filters.dateRange === 'custom' && (filters.customStartDate || filters.customEndDate)) {
        const start = filters.customStartDate ? new Date(filters.customStartDate) : new Date(0);
        const end = filters.customEndDate ? new Date(filters.customEndDate) : new Date();
        workingDonations = allDonations.filter(d => {
          const dt = new Date(d.date);
          return dt >= start && dt <= end;
        });
      } else {
        workingDonations = baseData.donations.slice();
      }

      // Donation type
      if (filters.donationType && filters.donationType !== 'all') {
        workingDonations = workingDonations.filter(d => d.donationType === filters.donationType);
      }
      // Recurring type
      if (filters.recurringType && filters.recurringType !== 'all') {
        workingDonations = workingDonations.filter(d => (d.recurringType || 'One-Time') === filters.recurringType);
      }
      // Amount range
      if (filters.amountMin) {
        const min = parseFloat(filters.amountMin);
        workingDonations = workingDonations.filter(d => (d.amount || d.estimatedValue || 0) >= min);
      }
      if (filters.amountMax) {
        const max = parseFloat(filters.amountMax);
        workingDonations = workingDonations.filter(d => (d.amount || d.estimatedValue || 0) <= max);
      }
      // Campaigns (by id or by matching name)
      if (filters.campaigns && filters.campaigns.length > 0) {
        workingDonations = workingDonations.filter(d => {
          return filters.campaigns.includes(d.campaignId) || filters.campaigns.some(cid => {
            const campaign = (baseData.campaigns || []).find(c => c.id === cid);
            return campaign && d.campaignName === campaign.name;
          });
        });
      }
      // Payment methods
      if (filters.paymentMethods && filters.paymentMethods.length > 0) {
        workingDonations = workingDonations.filter(d => filters.paymentMethods.includes(d.paymentMethod));
      }
      // Acknowledgment status
      if (filters.acknowledgmentStatus && filters.acknowledgmentStatus !== 'all') {
        const wantSent = filters.acknowledgmentStatus === 'sent';
        workingDonations = workingDonations.filter(d => !!d.acknowledgmentSent === wantSent);
      }

      // Contacts (by donor level)
      let workingContacts = baseData.contacts.slice();
      if (filters.donorLevels && filters.donorLevels.length > 0) {
        workingContacts = workingContacts.filter(c => filters.donorLevels.includes(c?.donorProfile?.donorLevelId));
      }

      const metrics = calculateMetrics(workingDonations, workingContacts, baseData.campaigns);
      return { ...baseData, donations: workingDonations, contacts: workingContacts, metrics };
    };

    // Debounced setter for applied filters (performance)
    const setAppliedFilters = (next) => {
      if (filterDebounceRef.current) clearTimeout(filterDebounceRef.current);
      filterDebounceRef.current = setTimeout(() => {
        _setAppliedFilters(next);
      }, 250);
    };

    // Memoize metrics for rendering path
    const dataForRender = filteredData || financialData;
    const memoizedMetrics = React.useMemo(() => {
      if (!dataForRender) return null;
      return calculateMetrics(dataForRender.donations || [], dataForRender.contacts || [], dataForRender.campaigns || []);
    }, [dataForRender && dataForRender.donations, dataForRender && dataForRender.contacts, dataForRender && dataForRender.campaigns]);
    const renderData = React.useMemo(() => {
      if (!dataForRender) return null;
      return { ...dataForRender, metrics: memoizedMetrics || dataForRender.metrics };
    }, [dataForRender, memoizedMetrics]);

    // Render
    return React.createElement(
      'div',
      { className: 'financial-dashboard max-w-[1400px] mx-auto p-6 min-h-[calc(100vh-100px)]' },

      // Header
      React.createElement(
        'div',
        { className: 'dashboard-header mb-6' },
        React.createElement(
          'div',
          { className: 'flex items-center justify-between' },
          React.createElement(
            'div',
            null,
            React.createElement('h1', { className: 'text-3xl font-bold mb-2 text-gray-900' }, 'Financial Dashboard'),
            React.createElement('p', { className: 'text-gray-400' }, 'Comprehensive financial oversight and donor analytics')
          ),
          React.createElement(
            'div',
            { className: 'flex items-end gap-3' },
            React.createElement(
              'div',
              { className: 'date-range-selector' },
              React.createElement('label', { className: 'block text-sm font-medium mb-2 text-gray-300' }, 'Date Range:'),
              React.createElement(
                'select',
                {
                  value: dateRange,
                  onChange: (e) => setDateRange(e.target.value),
                  className: 'border border-gray-300 rounded px-4 py-2 bg-white text-gray-900'
                },
                React.createElement('option', { value: 'today' }, 'Today'),
                React.createElement('option', { value: 'week' }, 'This Week'),
                React.createElement('option', { value: 'month' }, 'This Month'),
                React.createElement('option', { value: 'quarter' }, 'This Quarter'),
                React.createElement('option', { value: 'fiscal-year' }, 'Fiscal Year'),
                React.createElement('option', { value: 'calendar-year' }, 'Calendar Year'),
                React.createElement('option', { value: 'all-time' }, 'All Time'),
                React.createElement('option', { value: 'custom' }, 'Custom Range')
              )
            ),
            React.createElement(
              'div',
              { className: 'dashboard-actions flex gap-2 pb-0.5' },
              React.createElement(
                'button',
                {
                  onClick: () => global.financialExportService?.exportDashboardToCSV(financialData, dateRange),
                  className: 'px-3 py-2 border border-gray-300 rounded bg-white text-gray-900 hover:bg-gray-50',
                  title: 'Export CSV'
                },
                '📊 Export CSV'
              ),
              React.createElement(
                'button',
                {
                  onClick: () => global.financialExportService?.exportToExcel(financialData, dateRange),
                  className: 'px-3 py-2 border border-gray-300 rounded bg-white text-gray-900 hover:bg-gray-50',
                  title: 'Export Excel'
                },
                '📗 Export Excel'
              ),
              React.createElement(
                'button',
                {
                  onClick: () => global.financialExportService?.printDashboard(financialData, dateRange),
                  className: 'px-3 py-2 border border-gray-300 rounded bg-white text-gray-900 hover:bg-gray-50',
                  title: 'Print Report'
                },
                '🖨️ Print Report'
              )
            )
          )
        )
      ),

      // Navigation Tabs
      React.createElement(
        'div',
        { className: 'dashboard-nav mb-6 border-b border-gray-700' },
        React.createElement(
          'div',
          { className: 'flex gap-1' },
          React.createElement(TabButton, { active: activeView === 'overview', onClick: () => setActiveView('overview'), icon: '📊', label: 'Overview' }),
          React.createElement(TabButton, { active: activeView === 'donations', onClick: () => setActiveView('donations'), icon: '💰', label: 'Donations' }),
          React.createElement(TabButton, { active: activeView === 'donors', onClick: () => setActiveView('donors'), icon: '👥', label: 'Donors' }),
          React.createElement(TabButton, { active: activeView === 'campaigns', onClick: () => setActiveView('campaigns'), icon: '📈', label: 'Campaigns' }),
          React.createElement(TabButton, { active: activeView === 'reports', onClick: () => setActiveView('reports'), icon: '📄', label: 'Reports' }),
          React.createElement(TabButton, { active: activeView === 'budgets', onClick: () => setActiveView('budgets'), icon: '💰', label: 'Production Budgets' })
        )
      ),

      // Filters panel (always visible beneath tabs)
      React.createElement(global.FinancialFilters || 'div', {
        onFilterChange: setAppliedFilters,
        initialFilters: appliedFilters,
        activeView: activeView
      }),

      // Loading State or Views
      isLoading
        ? React.createElement(
            'div',
            { className: 'loading-state text-center py-12' },
            React.createElement('div', { className: 'text-6xl mb-4' }, '⏳'),
            React.createElement('p', { className: 'text-gray-400' }, 'Loading financial data...')
          )
        : React.createElement(
            React.Fragment,
            null,
            activeView === 'overview' && FinancialOverviewView && React.createElement(FinancialOverviewView, { data: renderData || dataForRender, dateRange: dateRange }),
            activeView === 'donations' && DonationsViewComponent && React.createElement(DonationsViewComponent, { data: renderData || dataForRender, dateRange: dateRange }),
            activeView === 'donors' && DonorsViewComponent && React.createElement(DonorsViewComponent, { data: renderData || dataForRender, dateRange: dateRange }),
            activeView === 'campaigns' && CampaignsViewComponent && React.createElement(CampaignsViewComponent, { data: renderData || dataForRender, dateRange: dateRange }),
            activeView === 'reports' && ReportsViewComponent && React.createElement(ReportsViewComponent, { data: renderData || dataForRender, dateRange: dateRange }),
            activeView === 'budgets' && React.createElement(
              'div', { className: 'grid grid-cols-1 lg:grid-cols-3 gap-6' },
              React.createElement('div', { className: 'lg:col-span-2' },
                global.ProductionBudgetsFinancialView && React.createElement(global.ProductionBudgetsFinancialView, { userRole: currentUser?.role })
              ),
              React.createElement('div', { className: 'lg:col-span-1' },
                global.RestrictedFundsWidget && React.createElement(global.RestrictedFundsWidget)
              )
            )
          )
    );
  };

  // Wrap FinancialDashboard in the error boundary before exporting
  const FinancialDashboardWithBoundary = () =>
    React.createElement(FinancialDashboardErrorBoundary, null,
      React.createElement(FinancialDashboard)
    );

  global.FinancialDashboard = FinancialDashboardWithBoundary;
})(window);
