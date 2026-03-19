/**
 * FinancialOverview Component
 * High-level financial summary with key metrics and visualizations.
 */
(function (global) {
  'use strict';

  const { React } = global;

  const FinancialOverview = ({ data, dateRange }) => {
    const [comparisonPeriod, setComparisonPeriod] = React.useState('previous-period');
    const [comparisonData, setComparisonData] = React.useState(null);

    React.useEffect(() => {
      calculateComparison();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data, comparisonPeriod]);

    const calculateComparison = () => {
      if (!data) return;
      const previousData = getPreviousPeriodData(data.allDonations || [], dateRange);
      setComparisonData(previousData);
    };

    const getChartPeriodFromRange = (range) => {
      switch (range) {
        case 'today':
          return 'day';
        case 'week':
          return 'day';
        case 'month':
          return 'day';
        case 'quarter':
          return 'month';
        case 'fiscal-year':
          return 'quarter';
        case 'calendar-year':
          return 'month';
        case 'all-time':
        default:
          return 'year';
      }
    };

    // Render
    return React.createElement(
      'div',
      { className: 'financial-overview' },

      // Key Metrics Cards
      React.createElement(
        'div',
        { className: 'metrics-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6' },
        React.createElement(MetricCard, {
          icon: '💰',
          label: 'Total Revenue',
          value: formatCurrency(data.metrics.totalRevenue),
          change: calculateChange(data.metrics.totalRevenue, comparisonData?.totalRevenue),
          changeLabel: `vs ${comparisonPeriod}`,
          color: 'green'
        }),
        React.createElement(MetricCard, {
          icon: '👥',
          label: 'Unique Donors',
          value: data.metrics.donorCount,
          change: calculateChange(data.metrics.donorCount, comparisonData?.donorCount),
          changeLabel: `vs ${comparisonPeriod}`,
          color: 'blue'
        }),
        React.createElement(MetricCard, {
          icon: '📊',
          label: 'Average Gift',
          value: formatCurrency(data.metrics.avgGift),
          change: calculateChange(data.metrics.avgGift, comparisonData?.avgGift),
          changeLabel: `vs ${comparisonPeriod}`,
          color: 'purple'
        }),
        React.createElement(MetricCard, {
          icon: '🎯',
          label: 'Total Donations',
          value: data.metrics.totalDonations,
          change: calculateChange(data.metrics.totalDonations, comparisonData?.totalDonations),
          changeLabel: `vs ${comparisonPeriod}`,
          color: 'indigo'
        })
      ),

      // Insights Charts
      React.createElement(
        'div',
        { className: 'charts-section grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6' },
        React.createElement(
          'div',
          { className: 'border border-gray-200 rounded-lg p-4 bg-white' },
          React.createElement('div', { className: 'flex items-center justify-between mb-3' },
            React.createElement('h3', { className: 'text-lg font-semibold text-gray-900' }, '📈 Donation Trend'),
            React.createElement('span', { className: 'text-xs text-gray-600' }, getChartPeriodFromRange(dateRange))
          ),
          React.createElement(global.DonationTrendChart || 'div', { donations: data.donations || [], period: getChartPeriodFromRange(dateRange) })
        ),
        React.createElement(
          'div',
          { className: 'border border-gray-200 rounded-lg p-4 bg-white' },
          React.createElement('h3', { className: 'text-lg font-semibold mb-3 text-gray-900' }, '👥 Donor Segmentation'),
          React.createElement(global.DonorSegmentationChart || 'div', { donors: data.contacts || [], donorLevels: data.donorLevels || [] })
        )
      ),

      // Revenue Breakdown
      React.createElement(
        'div',
        { className: 'grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6' },
        // Revenue by Type
        React.createElement(
          'div',
          { className: 'revenue-type-card border border-gray-200 rounded-lg p-6 bg-white' },
          React.createElement('h3', { className: 'text-lg font-semibold mb-4 text-gray-900' }, 'Revenue by Type'),
          React.createElement(
            'div',
            { className: 'space-y-4' },
            React.createElement(RevenueBar, {
              label: 'Monetary Donations',
              amount: data.metrics.byType.monetary,
              percentage: pct(data.metrics.byType.monetary, data.metrics.totalRevenue),
              color: 'bg-green-500'
            }),
            React.createElement(RevenueBar, {
              label: 'In-Kind Contributions',
              amount: data.metrics.byType.inKind,
              percentage: pct(data.metrics.byType.inKind, data.metrics.totalRevenue),
              color: 'bg-blue-500'
            })
          ),
          React.createElement(
            'div',
            { className: 'mt-4 pt-4 border-t border-gray-200' },
            React.createElement(
              'div',
              { className: 'flex justify-between font-semibold text-gray-900' },
              React.createElement('span', null, 'Total Impact'),
              React.createElement('span', null, formatCurrency(data.metrics.totalRevenue))
            )
          )
        ),
        // Revenue by Recurring Type
        React.createElement(
          'div',
          { className: 'recurring-card border border-gray-200 rounded-lg p-6 bg-white' },
          React.createElement('h3', { className: 'text-lg font-semibold mb-4 text-gray-900' }, 'Revenue by Gift Type'),
          React.createElement(
            'div',
            { className: 'space-y-4' },
            Object.entries(data.metrics.byRecurring).map(([type, amount]) => (
              React.createElement(RevenueBar, {
                key: type,
                label: type,
                amount: amount,
                percentage: pct(amount, data.metrics.totalRevenue),
                color: getRecurringColor(type)
              })
            ))
          )
        )
      ),

      // Top Donors
      React.createElement(
        'div',
        { className: 'top-donors-section mb-6' },
        React.createElement(
          'div',
          { className: 'flex items-center justify-between mb-4' },
          React.createElement('h3', { className: 'text-lg font-semibold text-gray-900' }, `🏆 Top Donors (${dateRange})`),
          React.createElement(
            'button',
            {
              onClick: () => (window.location.hash = '#/financial?view=donors'),
              className: 'text-sm text-violet-400 hover:underline'
            },
            'View All Donors →'
          )
        ),
        React.createElement(
          'div',
          { className: 'grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4' },
          getTopDonors(data, 5).map((donor, index) => (
            React.createElement(TopDonorCard, { key: donor.contactId, rank: index + 1, donor: donor })
          ))
        )
      ),

      // Recent Donations
      React.createElement(
        'div',
        { className: 'recent-donations-section mb-6' },
        React.createElement(
          'div',
          { className: 'flex items-center justify-between mb-4' },
          React.createElement('h3', { className: 'text-lg font-semibold text-gray-900' }, '💵 Recent Donations'),
          React.createElement(
            'button',
            {
              onClick: () => (window.location.hash = '#/financial?view=donations'),
              className: 'text-sm text-violet-400 hover:underline'
            },
            'View All Donations →'
          )
        ),
        React.createElement(
          'div',
          { className: 'donations-table border border-gray-200 rounded-lg overflow-hidden bg-white' },
          React.createElement(
            'table',
            { className: 'w-full' },
            React.createElement(
              'thead',
              { className: 'bg-gray-50' },
              React.createElement(
                'tr',
                null,
                React.createElement('th', { className: 'text-left p-3 text-gray-700' }, 'Date'),
                React.createElement('th', { className: 'text-left p-3 text-gray-700' }, 'Donor'),
                React.createElement('th', { className: 'text-left p-3 text-gray-700' }, 'Amount'),
                React.createElement('th', { className: 'text-left p-3 text-gray-700' }, 'Type'),
                React.createElement('th', { className: 'text-left p-3 text-gray-700' }, 'Campaign')
              )
            ),
            React.createElement(
              'tbody',
              null,
              (data.donations || []).slice(0, 10).map((donation) => {
                const contact = (data.contacts || []).find((c) => c.id === donation.contactId);
                return React.createElement(
                  'tr',
                  { key: donation.id, className: 'border-b border-gray-200 hover:bg-gray-50' },
                  React.createElement('td', { className: 'p-3 text-sm text-gray-600' }, formatDate(donation.date)),
                  React.createElement(
                    'td',
                    { className: 'p-3 text-sm font-medium text-gray-900' },
                    contact ? `${contact.firstName} ${contact.lastName}` : 'Unknown'
                  ),
                  React.createElement('td', { className: 'p-3 text-sm font-semibold text-green-600' }, formatCurrency(donation.amount || donation.estimatedValue)),
                  React.createElement(
                    'td',
                    { className: 'p-3 text-sm' },
                    React.createElement(
                      'span',
                      {
                        className: `px-2 py-1 rounded text-xs ${
                          donation.donationType === 'monetary'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-blue-100 text-blue-800'
                        }`
                      },
                      donation.donationType === 'monetary' ? 'Monetary' : 'In-Kind'
                    )
                  ),
                  React.createElement('td', { className: 'p-3 text-sm text-gray-700' }, donation.campaignName || 'General Fund')
                );
              })
            )
          )
        )
      ),

      // Campaign Progress
      React.createElement(
        'div',
        { className: 'campaign-progress-section' },
        React.createElement(
          'div',
          { className: 'flex items-center justify-between mb-4' },
          React.createElement('h3', { className: 'text-lg font-semibold text-gray-900' }, '📈 Campaign Progress'),
          React.createElement(
            'button',
            { onClick: () => (window.location.hash = '#/financial?view=campaigns'), className: 'text-sm text-violet-400 hover:underline' },
            'View All Campaigns →'
          )
        ),
        React.createElement(
          'div',
          { className: 'campaigns-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' },
          getActiveCampaigns(data.campaigns).slice(0, 3).map((campaign) =>
            React.createElement(CampaignProgressCard, { key: campaign.id, campaign: campaign, donations: data.donations })
          )
        )
      )
    );
  };

  // Helper components
  const MetricCard = ({ icon, label, value, change, changeLabel, color }) => {
    const colorClasses = {
      green: 'border-green-200 bg-green-50',
      blue: 'border-blue-200 bg-blue-50',
      purple: 'border-purple-200 bg-purple-50',
      indigo: 'border-indigo-200 bg-indigo-50'
    };
    const textColors = {
      green: 'text-green-700',
      blue: 'text-blue-700',
      purple: 'text-purple-700',
      indigo: 'text-indigo-700'
    };
    const isPositive = (change ?? 0) >= 0;
    return React.createElement(
      'div',
      { className: `metric-card border rounded-lg p-6 ${colorClasses[color]}` },
      React.createElement(
        'div',
        { className: 'flex items-center justify-between mb-2' },
        React.createElement('span', { className: 'text-3xl' }, icon),
        (change !== null && change !== undefined) && React.createElement(
          'span',
          { className: `text-sm font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}` },
          `${isPositive ? '↑' : '↓'} ${Math.abs(change).toFixed(1)}%`
        )
      ),
      React.createElement('div', { className: `text-3xl font-bold mb-1 ${textColors[color]}` }, value),
      React.createElement('div', { className: 'text-sm text-gray-600' }, label),
      changeLabel && React.createElement('div', { className: 'text-xs text-gray-500 mt-1' }, changeLabel)
    );
  };

  const RevenueBar = ({ label, amount, percentage, color }) => (
    React.createElement(
      'div',
      { className: 'revenue-bar' },
      React.createElement(
        'div',
        { className: 'flex justify-between text-sm mb-2' },
        React.createElement('span', { className: 'font-medium text-gray-900' }, label),
        React.createElement('span', { className: 'text-gray-700' }, formatCurrency(amount))
      ),
      React.createElement('div', { className: 'w-full bg-gray-200 rounded-full h-3 overflow-hidden' },
        React.createElement('div', { className: `h-full ${color} transition-all duration-500`, style: { width: `${Math.min(percentage, 100)}%` } })
      ),
      React.createElement('div', { className: 'text-xs text-gray-600 mt-1' }, `${percentage.toFixed(1)}% of total`)
    )
  );

  const TopDonorCard = ({ rank, donor }) => {
    const medals = { 1: '🥇', 2: '🥈', 3: '🥉' };
    return React.createElement(
      'div',
      { className: 'top-donor-card border border-gray-200 rounded-lg p-4 text-center hover:shadow transition bg-white' },
      React.createElement('div', { className: 'text-4xl mb-2' }, medals[rank] || '🏅'),
      React.createElement('div', { className: 'text-sm font-semibold mb-1 truncate text-gray-900' }, donor.name),
      React.createElement('div', { className: 'text-lg font-bold text-green-600' }, formatCurrency(donor.total)),
      React.createElement('div', { className: 'text-xs text-gray-600' }, `${donor.count} donation${donor.count !== 1 ? 's' : ''}`)
    );
  };

  const CampaignProgressCard = ({ campaign, donations }) => {
    const campaignDonations = (donations || []).filter((d) =>
      (d.campaignType === 'custom' && d.campaignName === campaign.name) || d.campaignId === campaign.id
    );
    const raised = campaignDonations.reduce((sum, d) => sum + (d.amount || 0), 0);
    const progress = campaign.goalAmount ? (raised / campaign.goalAmount) * 100 : 0;

    return React.createElement(
      'div',
      { className: 'campaign-card border border-gray-200 rounded-lg p-4 bg-white' },
      React.createElement('h4', { className: 'font-semibold mb-2 truncate text-gray-900' }, campaign.name),
      React.createElement(
        'div',
        { className: 'mb-3' },
        React.createElement(
          'div',
          { className: 'flex justify-between text-sm mb-1' },
          React.createElement('span', { className: 'text-gray-600' }, 'Raised'),
          React.createElement('span', { className: 'font-semibold text-gray-900' }, formatCurrency(raised))
        ),
        campaign.goalAmount && React.createElement(
          React.Fragment,
          null,
          React.createElement('div', { className: 'w-full bg-gray-200 rounded-full h-2 overflow-hidden mb-1' },
            React.createElement('div', {
              className: `h-full transition-all duration-500 ${progress >= 100 ? 'bg-green-500' : 'bg-blue-500'}`,
              style: { width: `${Math.min(progress, 100)}%` }
            })
          ),
          React.createElement(
            'div',
            { className: 'flex justify-between text-xs text-gray-600' },
            React.createElement('span', null, `${progress.toFixed(1)}% of goal`),
            React.createElement('span', null, formatCurrency(campaign.goalAmount))
          )
        )
      ),
      React.createElement('div', { className: 'text-xs text-gray-600' }, `${campaignDonations.length} donation${campaignDonations.length !== 1 ? 's' : ''}`)
    );
  };

  // Helper functions
  const pct = (part, totalValue) => {
    const t = totalValue || 0;
    if (t <= 0) return 0;
    return (part / t) * 100;
  };

  const getPreviousPeriodData = (allDonations, range) => {
    const now = new Date();
    let previousStart, previousEnd;

    switch (range) {
      case 'today': {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        previousStart = new Date(start);
        previousStart.setDate(previousStart.getDate() - 1);
        previousEnd = new Date(start);
        previousEnd.setMilliseconds(-1);
        break;
      }
      case 'week': {
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - 7);
        previousEnd = new Date(start);
        previousStart = new Date(start);
        previousStart.setDate(start.getDate() - 7);
        break;
      }
      case 'month': {
        const currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
        previousStart = new Date(currentStart.getFullYear(), currentStart.getMonth() - 1, 1);
        previousEnd = new Date(currentStart.getFullYear(), currentStart.getMonth(), 0);
        break;
      }
      case 'quarter': {
        const currentStart = new Date(now);
        currentStart.setMonth(now.getMonth() - 3);
        previousEnd = new Date(currentStart);
        previousStart = new Date(currentStart);
        previousStart.setMonth(previousStart.getMonth() - 3);
        break;
      }
      case 'fiscal-year': {
        const fyStartYear = now.getMonth() >= 6 ? now.getFullYear() - 1 : now.getFullYear() - 2;
        previousStart = new Date(fyStartYear, 6, 1);
        previousEnd = new Date(fyStartYear + 1, 5, 30, 23, 59, 59, 999);
        break;
      }
      case 'calendar-year': {
        previousStart = new Date(now.getFullYear() - 1, 0, 1);
        previousEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
        break;
      }
      case 'all-time':
      default:
        return null;
    }

    const prev = (allDonations || []).filter((d) => {
      const date = new Date(d.date);
      return date >= previousStart && date <= previousEnd;
    });

    const totalRevenue = prev.reduce((sum, d) => sum + (d.amount || 0), 0);
    const donorCount = new Set(prev.map((d) => d.contactId)).size;
    return {
      totalRevenue,
      donorCount,
      avgGift: donorCount > 0 ? totalRevenue / donorCount : 0,
      totalDonations: prev.length
    };
  };

  const calculateChange = (current, previous) => {
    if (previous === null || previous === undefined || previous === 0) return null;
    return ((current - previous) / previous) * 100;
  };

  const getTopDonors = (data, limit) => {
    const donorTotals = {};
    (data.donations || []).forEach((donation) => {
      if (!donorTotals[donation.contactId]) {
        donorTotals[donation.contactId] = { contactId: donation.contactId, total: 0, count: 0 };
      }
      donorTotals[donation.contactId].total += (donation.amount || donation.estimatedValue || 0);
      donorTotals[donation.contactId].count++;
    });
    const sorted = Object.values(donorTotals).sort((a, b) => b.total - a.total);
    return sorted.slice(0, limit).map((donor) => {
      const contact = (data.contacts || []).find((c) => c.id === donor.contactId);
      return { ...donor, name: contact ? `${contact.firstName} ${contact.lastName}` : 'Unknown' };
    });
  };

  const getActiveCampaigns = (campaigns) => (campaigns || []).filter((c) => c.active);

  const getRecurringColor = (type) => {
    const colors = { 'One-Time': 'bg-blue-500', 'Monthly': 'bg-purple-500', 'Quarterly': 'bg-indigo-500', 'Annual': 'bg-green-500' };
    return colors[type] || 'bg-gray-500';
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount || 0);
  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  // Export to global scope
  global.FinancialOverview = FinancialOverview;
})(window);
