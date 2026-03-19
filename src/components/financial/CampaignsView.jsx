/**
 * CampaignsView Component
 * Campaign performance dashboard with progress tracking and detailed analytics.
 */
(function (global) {
  'use strict';

  const { React } = global;

  const CampaignsView = ({ data, dateRange }) => {
    const [selectedCampaign, setSelectedCampaign] = React.useState(null);
    const [filterStatus, setFilterStatus] = React.useState('all'); // all, active, completed

    const campaigns = data.campaigns || [];
    const donations = data.donations || [];
    const contacts = data.contacts || [];

    // Calculate campaign metrics
    const getCampaignMetrics = (campaign) => {
      const campaignDonations = donations.filter((d) =>
        (d.campaignType === 'custom' && d.campaignName === campaign.name) || d.campaignId === campaign.id
      );
      const raised = campaignDonations.reduce((sum, d) => sum + (d.amount || 0), 0);
      const donorCount = new Set(campaignDonations.map((d) => d.contactId)).size;
      const avgDonation = donorCount > 0 ? raised / donorCount : 0;
      const progress = campaign.goalAmount ? (raised / campaign.goalAmount) * 100 : 0;

      return {
        ...campaign,
        raised,
        donorCount,
        avgDonation,
        progress,
        donationsCount: campaignDonations.length
      };
    };

    // Filter campaigns
    const getFilteredCampaigns = () => {
      let filtered = campaigns.map(getCampaignMetrics);
      if (filterStatus === 'active') {
        filtered = filtered.filter((c) => c.active);
      } else if (filterStatus === 'completed') {
        filtered = filtered.filter((c) => !c.active);
      }
      return filtered.sort((a, b) => b.raised - a.raised);
    };

    const filteredCampaigns = getFilteredCampaigns();

    // Summary stats
    const totalRaised = filteredCampaigns.reduce((sum, c) => sum + c.raised, 0);
    const activeCampaigns = campaigns.filter((c) => c.active).length;
    const totalGoal = filteredCampaigns.reduce((sum, c) => sum + (c.goalAmount || 0), 0);
    const overallProgress = totalGoal > 0 ? (totalRaised / totalGoal) * 100 : 0;

    // Render
    return React.createElement(
      'div',
      { className: 'campaigns-view' },

      // Header & Summary
      React.createElement(
        'div',
        { className: 'mb-6' },
        React.createElement('h2', { className: 'text-2xl font-bold mb-4 text-gray-900' }, 'Campaigns'),
        React.createElement(
          'div',
          { className: 'grid grid-cols-1 md:grid-cols-4 gap-4' },
          React.createElement(StatCard, { icon: '💰', label: 'Total Raised', value: formatCurrency(totalRaised), color: 'green' }),
          React.createElement(StatCard, { icon: '🎯', label: 'Total Goal', value: formatCurrency(totalGoal), color: 'blue' }),
          React.createElement(StatCard, { icon: '📊', label: 'Overall Progress', value: `${overallProgress.toFixed(1)}%`, color: 'purple' }),
          React.createElement(StatCard, { icon: '✅', label: 'Active Campaigns', value: activeCampaigns, color: 'indigo' })
        )
      ),

      // Filters
      React.createElement(
        'div',
        { className: 'mb-4 border border-gray-200 rounded-lg p-4 bg-gray-50' },
        React.createElement(
          'div',
          { className: 'flex gap-2' },
          React.createElement(
            'button',
            {
              onClick: () => setFilterStatus('all'),
              className: `px-4 py-2 rounded text-sm font-medium transition ${
                filterStatus === 'all' ? 'bg-violet-600 text-white' : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
              }`
            },
            'All Campaigns'
          ),
          React.createElement(
            'button',
            {
              onClick: () => setFilterStatus('active'),
              className: `px-4 py-2 rounded text-sm font-medium transition ${
                filterStatus === 'active' ? 'bg-violet-600 text-white' : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
              }`
            },
            'Active'
          ),
          React.createElement(
            'button',
            {
              onClick: () => setFilterStatus('completed'),
              className: `px-4 py-2 rounded text-sm font-medium transition ${
                filterStatus === 'completed' ? 'bg-violet-600 text-white' : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
              }`
            },
            'Completed'
          )
        )
      ),

      // Campaign Cards
      React.createElement(
        'div',
        { className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' },
        filteredCampaigns.map((campaign) =>
          React.createElement(CampaignCard, { key: campaign.id, campaign: campaign, onClick: () => setSelectedCampaign(campaign) })
        )
      ),

      // Campaign Detail Modal
      selectedCampaign && React.createElement(CampaignDetailsModal, {
        campaign: selectedCampaign,
        donations: donations.filter((d) =>
          (d.campaignType === 'custom' && d.campaignName === selectedCampaign.name) || d.campaignId === selectedCampaign.id
        ),
        contacts: contacts,
        onClose: () => setSelectedCampaign(null)
      })
    );
  };

  // Helper Components
  const StatCard = ({ icon, label, value, color }) => {
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
    return React.createElement(
      'div',
      { className: `stat-card border rounded-lg p-4 ${colorClasses[color]}` },
      React.createElement('div', { className: 'text-3xl mb-2' }, icon),
      React.createElement('div', { className: `text-2xl font-bold mb-1 ${textColors[color]}` }, value),
      React.createElement('div', { className: 'text-sm text-gray-600' }, label)
    );
  };

  const CampaignCard = ({ campaign, onClick }) => {
    const statusColor = campaign.active ? 'bg-green-500' : 'bg-gray-500';
    const progressColor = campaign.progress >= 100 ? 'bg-green-500' : campaign.progress >= 75 ? 'bg-blue-500' : 'bg-violet-500';

    return React.createElement(
      'div',
      { className: 'campaign-card border border-gray-200 rounded-lg p-6 cursor-pointer hover:shadow-lg transition bg-white', onClick: onClick },
      React.createElement(
        'div',
        { className: 'flex items-start justify-between mb-4' },
        React.createElement('h3', { className: 'text-lg font-semibold text-gray-900 flex-1 pr-2' }, campaign.name),
        React.createElement('span', { className: `w-3 h-3 rounded-full ${statusColor}` })
      ),
      campaign.description && React.createElement('p', { className: 'text-sm text-gray-600 mb-4 line-clamp-2' }, campaign.description),
      React.createElement(
        'div',
        { className: 'space-y-3' },
        React.createElement(
          'div',
          { className: 'flex justify-between text-sm' },
          React.createElement('span', { className: 'text-gray-600' }, 'Raised'),
          React.createElement('span', { className: 'font-semibold text-green-600' }, formatCurrency(campaign.raised))
        ),
        campaign.goalAmount && React.createElement(
          React.Fragment,
          null,
          React.createElement('div', { className: 'w-full bg-gray-200 rounded-full h-3 overflow-hidden' },
            React.createElement('div', {
              className: `h-full ${progressColor} transition-all duration-500`,
              style: { width: `${Math.min(campaign.progress, 100)}%` }
            })
          ),
          React.createElement(
            'div',
            { className: 'flex justify-between text-xs text-gray-600' },
            React.createElement('span', null, `${campaign.progress.toFixed(1)}% of goal`),
            React.createElement('span', null, formatCurrency(campaign.goalAmount))
          )
        ),
        React.createElement(
          'div',
          { className: 'pt-3 border-t border-gray-200 flex justify-between text-xs text-gray-600' },
          React.createElement('span', null, `${campaign.donorCount} donor${campaign.donorCount !== 1 ? 's' : ''}`),
          React.createElement('span', null, `${campaign.donationsCount} donation${campaign.donationsCount !== 1 ? 's' : ''}`)
        )
      )
    );
  };

  const CampaignDetailsModal = ({ campaign, donations, contacts, onClose }) => {
    const [activeTab, setActiveTab] = React.useState('overview'); // overview, donors, donations, timeline

    return React.createElement(
      'div',
      { className: 'fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4', onClick: onClose },
      React.createElement(
        'div',
        { className: 'bg-white border border-gray-200 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col', onClick: (e) => e.stopPropagation() },
        // Header
        React.createElement(
          'div',
          { className: 'flex items-center justify-between p-6 border-b border-gray-200' },
          React.createElement(
            'div',
            null,
            React.createElement('h3', { className: 'text-xl font-bold text-gray-900' }, campaign.name),
            React.createElement('p', { className: 'text-sm text-gray-600 mt-1' }, campaign.description || 'No description')
          ),
          React.createElement('button', { onClick: onClose, className: 'text-gray-500 hover:text-gray-700 text-2xl' }, '×')
        ),

        // Tabs
        React.createElement(
          'div',
          { className: 'flex border-b border-gray-200 px-6 bg-gray-50' },
          ['overview', 'donors', 'donations', 'timeline'].map((tab) =>
            React.createElement(
              'button',
              {
                key: tab,
                onClick: () => setActiveTab(tab),
                className: `px-4 py-3 text-sm font-medium capitalize ${
                  activeTab === tab ? 'text-violet-600 border-b-2 border-violet-600' : 'text-gray-600 hover:text-gray-900'
                }`
              },
              tab
            )
          )
        ),

        // Content
        React.createElement(
          'div',
          { className: 'flex-1 overflow-y-auto p-6' },
          activeTab === 'overview' && React.createElement(CampaignOverviewTab, { campaign: campaign }),
          activeTab === 'donors' && React.createElement(CampaignDonorsTab, { donations: donations, contacts: contacts }),
          activeTab === 'donations' && React.createElement(CampaignDonationsTab, { donations: donations, contacts: contacts }),
          activeTab === 'timeline' && React.createElement(CampaignTimelineTab, { donations: donations })
        )
      )
    );
  };

  const CampaignOverviewTab = ({ campaign }) => (
    React.createElement(
      'div',
      { className: 'space-y-4' },
      React.createElement(
        'div',
        { className: 'grid grid-cols-2 gap-4' },
        React.createElement(MetricBox, { label: 'Total Raised', value: formatCurrency(campaign.raised) }),
        React.createElement(MetricBox, { label: 'Goal Amount', value: campaign.goalAmount ? formatCurrency(campaign.goalAmount) : 'No goal set' }),
        React.createElement(MetricBox, { label: 'Donors', value: campaign.donorCount }),
        React.createElement(MetricBox, { label: 'Donations', value: campaign.donationsCount }),
        React.createElement(MetricBox, { label: 'Average Gift', value: formatCurrency(campaign.avgDonation) }),
        React.createElement(MetricBox, { label: 'Status', value: campaign.active ? 'Active' : 'Completed' })
      ),
      campaign.startDate && React.createElement(
        'div',
        { className: 'mt-4 pt-4 border-t border-gray-200' },
        React.createElement('h4', { className: 'font-semibold mb-2 text-gray-900' }, 'Campaign Dates'),
        React.createElement('div', { className: 'text-sm text-gray-600' },
          `Start: ${formatDate(campaign.startDate)}`,
          campaign.endDate && ` • End: ${formatDate(campaign.endDate)}`
        )
      )
    )
  );

  const CampaignDonorsTab = ({ donations, contacts }) => {
    const donorStats = {};
    donations.forEach((donation) => {
      if (!donorStats[donation.contactId]) {
        donorStats[donation.contactId] = { contactId: donation.contactId, total: 0, count: 0 };
      }
      donorStats[donation.contactId].total += donation.amount || 0;
      donorStats[donation.contactId].count++;
    });
    const sortedDonors = Object.values(donorStats).sort((a, b) => b.total - a.total);

    return React.createElement(
      'div',
      { className: 'space-y-3' },
      sortedDonors.map((donor) => {
        const contact = contacts.find((c) => c.id === donor.contactId);
        return React.createElement(
          'div',
          { key: donor.contactId, className: 'flex justify-between items-center p-3 border border-gray-200 rounded bg-gray-50' },
          React.createElement(
            'div',
            null,
            React.createElement('div', { className: 'font-medium text-gray-900' }, contact ? `${contact.firstName} ${contact.lastName}` : 'Unknown'),
            React.createElement('div', { className: 'text-xs text-gray-600' }, `${donor.count} donation${donor.count !== 1 ? 's' : ''}`)
          ),
          React.createElement('div', { className: 'font-semibold text-green-600' }, formatCurrency(donor.total))
        );
      })
    );
  };

  const CampaignDonationsTab = ({ donations, contacts }) => {
    const sorted = [...donations].sort((a, b) => new Date(b.date) - new Date(a.date));
    return React.createElement(
      'div',
      { className: 'space-y-2' },
      sorted.map((donation) => {
        const contact = contacts.find((c) => c.id === donation.contactId);
        return React.createElement(
          'div',
          { key: donation.id, className: 'flex justify-between items-center p-3 border border-gray-200 rounded bg-gray-50' },
          React.createElement(
            'div',
            null,
            React.createElement('div', { className: 'font-medium text-gray-900' }, contact ? `${contact.firstName} ${contact.lastName}` : 'Unknown'),
            React.createElement('div', { className: 'text-xs text-gray-600' }, formatDate(donation.date))
          ),
          React.createElement('div', { className: 'font-semibold text-green-700' }, formatCurrency(donation.amount))
        );
      })
    );
  };

  const CampaignTimelineTab = ({ donations }) => {
    const byMonth = {};
    donations.forEach((d) => {
      const date = new Date(d.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!byMonth[key]) byMonth[key] = { amount: 0, count: 0 };
      byMonth[key].amount += d.amount || 0;
      byMonth[key].count++;
    });
    const sorted = Object.entries(byMonth).sort((a, b) => a[0].localeCompare(b[0]));
    const maxAmount = Math.max(...sorted.map(([_, data]) => data.amount));

    return React.createElement(
      'div',
      { className: 'space-y-4' },
      sorted.map(([month, data]) => {
        const percentage = maxAmount > 0 ? (data.amount / maxAmount) * 100 : 0;
        return React.createElement(
          'div',
          { key: month, className: 'space-y-1' },
          React.createElement(
            'div',
            { className: 'flex justify-between text-sm' },
            React.createElement('span', { className: 'text-gray-600' }, formatMonthLabel(month)),
            React.createElement('span', { className: 'font-semibold text-gray-900' }, formatCurrency(data.amount))
          ),
          React.createElement('div', { className: 'w-full bg-gray-200 rounded-full h-2 overflow-hidden' },
            React.createElement('div', { className: 'h-full bg-violet-500 transition-all duration-500', style: { width: `${percentage}%` } })
          ),
          React.createElement('div', { className: 'text-xs text-gray-600' }, `${data.count} donation${data.count !== 1 ? 's' : ''}`)
        );
      })
    );
  };

  const MetricBox = ({ label, value }) => (
    React.createElement(
      'div',
      { className: 'p-4 border border-gray-200 rounded bg-gray-50' },
      React.createElement('div', { className: 'text-sm text-gray-600 mb-1' }, label),
      React.createElement('div', { className: 'text-lg font-semibold text-gray-900' }, value)
    )
  );

  // Utility functions
  const formatCurrency = (amount) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount || 0);
  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  const formatMonthLabel = (monthKey) => {
    const [year, month] = monthKey.split('-');
    return new Date(year, month - 1).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
  };

  // Export to global scope
  global.CampaignsView = CampaignsView;
})(window);
