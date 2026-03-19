(function (global) {
  'use strict';

  const { React } = global;

  const FinancialFilters = ({ onFilterChange, initialFilters }) => {
    const [filters, setFilters] = React.useState(initialFilters || {
      dateRange: 'fiscal-year',
      customStartDate: '',
      customEndDate: '',
      donationType: 'all',
      recurringType: 'all',
      campaigns: [],
      donorLevels: [],
      amountMin: '',
      amountMax: '',
      acknowledgmentStatus: 'all',
      paymentMethods: []
    });

    const [isExpanded, setIsExpanded] = React.useState(false);
    const [campaigns, setCampaigns] = React.useState([]);
    const [donorLevels, setDonorLevels] = React.useState([]);

    React.useEffect(() => {
      loadFilterOptions();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    React.useEffect(() => {
      if (typeof onFilterChange === 'function') onFilterChange(filters);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters]);

    const loadFilterOptions = () => {
      try {
        const allCampaigns = (global.campaignsService?.loadCampaigns?.() || []).filter(Boolean);
        const allDonorLevels = (global.donorLevelsService?.loadDonorLevels?.() || []).filter(Boolean);
        setCampaigns(allCampaigns);
        setDonorLevels(allDonorLevels);
      } catch (e) {
        console.warn('Failed to load filter options', e);
        setCampaigns([]);
        setDonorLevels([]);
      }
    };

    const handleFilterChange = (key, value) => {
      setFilters({ ...filters, [key]: value });
    };

    const handleMultiSelectChange = (key, value, checked) => {
      const current = filters[key] || [];
      const updated = checked ? Array.from(new Set([...current, value])) : current.filter(v => v !== value);
      setFilters({ ...filters, [key]: updated });
    };

    const handleReset = () => {
      const resetFilters = {
        dateRange: 'fiscal-year',
        customStartDate: '',
        customEndDate: '',
        donationType: 'all',
        recurringType: 'all',
        campaigns: [],
        donorLevels: [],
        amountMin: '',
        amountMax: '',
        acknowledgmentStatus: 'all',
        paymentMethods: []
      };
      setFilters(resetFilters);
    };

    const handleClearAdvanced = () => {
      setFilters({
        ...filters,
        campaigns: [],
        donorLevels: [],
        amountMin: '',
        amountMax: '',
        acknowledgmentStatus: 'all',
        paymentMethods: []
      });
    };

    const getActiveFiltersCount = () => {
      let count = 0;
      if ((filters.campaigns || []).length > 0) count++;
      if ((filters.donorLevels || []).length > 0) count++;
      if (filters.amountMin || filters.amountMax) count++;
      if ((filters.paymentMethods || []).length > 0) count++;
      if ((filters.acknowledgmentStatus || 'all') !== 'all') count++;
      if ((filters.donationType || 'all') !== 'all') count++;
      if ((filters.recurringType || 'all') !== 'all') count++;
      if (filters.dateRange === 'custom' && (filters.customStartDate || filters.customEndDate)) count++;
      return count;
    };

    const FilterTag = ({ label, onRemove }) => (
      React.createElement('span', { className: 'inline-flex items-center gap-1 px-2 py-1 bg-violet-900/20 text-violet-300 border border-violet-700 rounded text-xs' },
        label,
        React.createElement('button', { onClick: onRemove, className: 'hover:text-violet-200 ml-1' }, '✕')
      )
    );

    const renderActiveFilterTags = () => {
      const tags = [];
      if (filters.amountMin || filters.amountMax) {
        tags.push(React.createElement(FilterTag, {
          key: 'amount',
          label: `Amount: ${filters.amountMin || '0'} - ${filters.amountMax || '∞'}`,
          onRemove: () => setFilters({ ...filters, amountMin: '', amountMax: '' })
        }));
      }
      (filters.campaigns || []).forEach(campaignId => {
        const campaign = campaigns.find(c => c.id === campaignId);
        if (campaign) {
          tags.push(React.createElement(FilterTag, {
            key: `campaign-${campaignId}`,
            label: `Campaign: ${campaign.name}`,
            onRemove: () => handleMultiSelectChange('campaigns', campaignId, false)
          }));
        }
      });
      (filters.donorLevels || []).forEach(levelId => {
        const level = donorLevels.find(l => l.id === levelId);
        if (level) {
          tags.push(React.createElement(FilterTag, {
            key: `level-${levelId}`,
            label: `Level: ${level.name}`,
            onRemove: () => handleMultiSelectChange('donorLevels', levelId, false)
          }));
        }
      });
      (filters.paymentMethods || []).forEach(method => {
        tags.push(React.createElement(FilterTag, {
          key: `payment-${method}`,
          label: `Payment: ${method}`,
          onRemove: () => handleMultiSelectChange('paymentMethods', method, false)
        }));
      });
      if ((filters.acknowledgmentStatus || 'all') !== 'all') {
        tags.push(React.createElement(FilterTag, {
          key: 'acknowledgment',
          label: `Acknowledgment: ${filters.acknowledgmentStatus}`,
          onRemove: () => handleFilterChange('acknowledgmentStatus', 'all')
        }));
      }
      if ((filters.donationType || 'all') !== 'all') {
        tags.push(React.createElement(FilterTag, {
          key: 'donationType',
          label: `Type: ${filters.donationType}`,
          onRemove: () => handleFilterChange('donationType', 'all')
        }));
      }
      if ((filters.recurringType || 'all') !== 'all') {
        tags.push(React.createElement(FilterTag, {
          key: 'recurringType',
          label: `Frequency: ${filters.recurringType}`,
          onRemove: () => handleFilterChange('recurringType', 'all')
        }));
      }
      if (filters.dateRange === 'custom' && (filters.customStartDate || filters.customEndDate)) {
        tags.push(React.createElement(FilterTag, {
          key: 'dateRangeCustom',
          label: `Dates: ${filters.customStartDate || '—'} → ${filters.customEndDate || '—'}`,
          onRemove: () => setFilters({ ...filters, customStartDate: '', customEndDate: '', dateRange: 'fiscal-year' })
        }));
      }
      return tags;
    };

    // UI
    return React.createElement(
      'div',
      { className: 'financial-filters border border-gray-200 rounded-lg p-4 bg-gray-50 text-gray-900' },
      React.createElement(
        'div',
        { className: 'filters-header flex items-center justify-between mb-4' },
        React.createElement('h3', { className: 'font-semibold text-gray-900' }, 'Filters'),
        React.createElement(
          'div',
          { className: 'flex gap-2' },
          React.createElement('button', { onClick: handleReset, className: 'text-sm text-violet-400 hover:underline' }, 'Reset All'),
          React.createElement('button', { onClick: () => setIsExpanded(!isExpanded), className: 'text-sm text-gray-600 hover:text-gray-900' }, isExpanded ? 'Show Less ▲' : 'Show More ▼')
        )
      ),

      // Quick Filters
      React.createElement(
        'div',
        { className: 'quick-filters grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-3' },
        React.createElement(
          'div',
          null,
          React.createElement('label', { className: 'block text-xs font-medium mb-1 text-gray-700' }, 'Date Range'),
          React.createElement(
            'select',
            {
              value: filters.dateRange,
              onChange: (e) => handleFilterChange('dateRange', e.target.value),
              className: 'w-full border border-gray-300 rounded px-2 py-1.5 text-sm bg-white text-gray-900'
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
        filters.dateRange === 'custom' && React.createElement(React.Fragment, null,
          React.createElement(
            'div',
            null,
            React.createElement('label', { className: 'block text-xs font-medium mb-1 text-gray-700' }, 'Start Date'),
            React.createElement('input', {
              type: 'date',
              value: filters.customStartDate,
              onChange: (e) => handleFilterChange('customStartDate', e.target.value),
              className: 'w-full border border-gray-300 rounded px-2 py-1.5 text-sm bg-white text-gray-900'
            })
          ),
          React.createElement(
            'div',
            null,
            React.createElement('label', { className: 'block text-xs font-medium mb-1 text-gray-700' }, 'End Date'),
            React.createElement('input', {
              type: 'date',
              value: filters.customEndDate,
              onChange: (e) => handleFilterChange('customEndDate', e.target.value),
              className: 'w-full border border-gray-300 rounded px-2 py-1.5 text-sm bg-white text-gray-900'
            })
          )
        ),
        React.createElement(
          'div',
          null,
          React.createElement('label', { className: 'block text-xs font-medium mb-1 text-gray-700' }, 'Donation Type'),
          React.createElement(
            'select',
            {
              value: filters.donationType,
              onChange: (e) => handleFilterChange('donationType', e.target.value),
              className: 'w-full border border-gray-300 rounded px-2 py-1.5 text-sm bg-white text-gray-900'
            },
            React.createElement('option', { value: 'all' }, 'All Types'),
            React.createElement('option', { value: 'monetary' }, 'Monetary'),
            React.createElement('option', { value: 'in-kind' }, 'In-Kind')
          )
        ),
        React.createElement(
          'div',
          null,
          React.createElement('label', { className: 'block text-xs font-medium mb-1 text-gray-700' }, 'Gift Frequency'),
          React.createElement(
            'select',
            {
              value: filters.recurringType,
              onChange: (e) => handleFilterChange('recurringType', e.target.value),
              className: 'w-full border border-gray-300 rounded px-2 py-1.5 text-sm bg-white text-gray-900'
            },
            React.createElement('option', { value: 'all' }, 'All Frequencies'),
            React.createElement('option', { value: 'One-Time' }, 'One-Time'),
            React.createElement('option', { value: 'Monthly' }, 'Monthly'),
            React.createElement('option', { value: 'Quarterly' }, 'Quarterly'),
            React.createElement('option', { value: 'Annual' }, 'Annual')
          )
        )
      ),

      // Advanced Filters
      isExpanded && React.createElement(
        'div',
        { className: 'advanced-filters space-y-3 pt-3 border-t border-gray-200' },
        React.createElement(
          'div',
          { className: 'filter-group' },
          React.createElement('label', { className: 'block text-xs font-medium mb-2 text-gray-700' }, 'Amount Range'),
          React.createElement(
            'div',
            { className: 'grid grid-cols-2 gap-2' },
            React.createElement('input', {
              type: 'number',
              value: filters.amountMin,
              onChange: (e) => handleFilterChange('amountMin', e.target.value),
              placeholder: 'Min amount',
              className: 'w-full border border-gray-300 rounded px-2 py-1.5 text-sm bg-white text-gray-900'
            }),
            React.createElement('input', {
              type: 'number',
              value: filters.amountMax,
              onChange: (e) => handleFilterChange('amountMax', e.target.value),
              placeholder: 'Max amount',
              className: 'w-full border border-gray-300 rounded px-2 py-1.5 text-sm bg-white text-gray-900'
            })
          )
        ),
        React.createElement(
          'div',
          { className: 'filter-group' },
          React.createElement('label', { className: 'block text-xs font-medium mb-2 text-gray-700' }, `Campaigns (${(filters.campaigns || []).length} selected)`),
          React.createElement(
            'div',
            { className: 'max-h-40 overflow-y-auto border border-gray-300 rounded p-2 bg-white' },
            campaigns.map(campaign => (
              React.createElement('label', { key: campaign.id, className: 'flex items-center py-1 px-1 rounded hover:bg-gray-100' },
                React.createElement('input', {
                  type: 'checkbox',
                  checked: (filters.campaigns || []).includes(campaign.id),
                  onChange: (e) => handleMultiSelectChange('campaigns', campaign.id, e.target.checked),
                  className: 'mr-2'
                }),
                React.createElement('span', { className: 'text-sm' }, campaign.name)
              )
            ))
          )
        ),
        React.createElement(
          'div',
          { className: 'filter-group' },
          React.createElement('label', { className: 'block text-xs font-medium mb-2 text-gray-700' }, `Donor Levels (${(filters.donorLevels || []).length} selected)`),
          React.createElement(
            'div',
            { className: 'max-h-40 overflow-y-auto border border-gray-300 rounded p-2 bg-white' },
            donorLevels.map(level => (
              React.createElement('label', { key: level.id, className: 'flex items-center py-1 px-1 rounded hover:bg-gray-100' },
                React.createElement('input', {
                  type: 'checkbox',
                  checked: (filters.donorLevels || []).includes(level.id),
                  onChange: (e) => handleMultiSelectChange('donorLevels', level.id, e.target.checked),
                  className: 'mr-2'
                }),
                React.createElement('span', { className: 'text-sm' }, level.name)
              )
            ))
          )
        ),
        React.createElement(
          'div',
          { className: 'filter-group' },
          React.createElement('label', { className: 'block text-xs font-medium mb-2 text-gray-700' }, `Payment Methods (${(filters.paymentMethods || []).length} selected)`),
          React.createElement(
            'div',
            { className: 'flex flex-wrap gap-3' },
            ['Cash','Check','Credit Card','Bank Transfer','PayPal','Venmo','Other'].map(method => (
              React.createElement('label', { key: method, className: 'flex items-center' },
                React.createElement('input', {
                  type: 'checkbox',
                  checked: (filters.paymentMethods || []).includes(method),
                  onChange: (e) => handleMultiSelectChange('paymentMethods', method, e.target.checked),
                  className: 'mr-1'
                }),
                React.createElement('span', { className: 'text-xs' }, method)
              )
            ))
          )
        ),
        React.createElement(
          'div',
          { className: 'filter-group' },
          React.createElement('label', { className: 'block text-xs font-medium mb-2 text-gray-700' }, 'Acknowledgment Status'),
          React.createElement(
            'select',
            {
              value: filters.acknowledgmentStatus,
              onChange: (e) => handleFilterChange('acknowledgmentStatus', e.target.value),
              className: 'w-full border border-gray-300 rounded px-2 py-1.5 text-sm bg-white text-gray-900'
            },
            React.createElement('option', { value: 'all' }, 'All Status'),
            React.createElement('option', { value: 'sent' }, 'Sent'),
            React.createElement('option', { value: 'not-sent' }, 'Not Sent')
          )
        )
      ),

      // Active Filters
      getActiveFiltersCount() > 0 && React.createElement(
        'div',
        { className: 'active-filters mt-3 pt-3 border-t border-gray-200' },
        React.createElement(
          'div',
          { className: 'flex items-center justify-between mb-2' },
          React.createElement('span', { className: 'text-xs font-medium text-gray-700' }, 'Active Filters (' + getActiveFiltersCount() + ')'),
          React.createElement('button', { onClick: handleClearAdvanced, className: 'text-xs text-violet-400 hover:underline' }, 'Clear Advanced Filters')
        ),
        React.createElement('div', { className: 'flex flex-wrap gap-2' }, renderActiveFilterTags())
      )
    );
  };

  // Export globally
  global.FinancialFilters = FinancialFilters;

})(window);
