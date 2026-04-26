/**
 * DonorsView Component
 * Displays donor segmentation and analytics with multiple views and metrics.
 */
(function (global) {
  'use strict';

  const { React } = global;

  const DonorsView = ({ data, dateRange }) => {
    const [segmentBy, setSegmentBy] = React.useState('level'); // level, recency, frequency, amount
    const [viewMode, setViewMode] = React.useState('directory'); // directory, table
    const [searchTerm, setSearchTerm] = React.useState('');
    const [sortBy, setSortBy] = React.useState('name'); // name, totalGiven, lastGift, frequency
    const [showSegmentInfo, setShowSegmentInfo] = React.useState(false);
    const [showAddDonationModal, setShowAddDonationModal] = React.useState(false);

    const donorsAll = React.useMemo(() => (data?.contacts || []).filter((c) => c.isDonor), [data]);

    React.useEffect(() => {
      // Refresh segmentation when data or segmentBy changes
    }, [data, segmentBy]);

    // Segment donors by selected criteria
    const getSegmentedDonors = () => {
      const donors = donorsAll;
      const donations = data.donations || [];
      const donorLevels = data.donorLevels || [];

      // Calculate donor metrics
      const donorMetrics = donors.map((donor) => {
        const donorDonations = donations.filter((d) => d.contactId === donor.id);
        const totalGiven = donorDonations.reduce((sum, d) => sum + (d.amount || d.estimatedValue || 0), 0);
        const frequency = donorDonations.length;
        const lastGift = donorDonations.length > 0 ? new Date(Math.max(...donorDonations.map((d) => new Date(d.date)))) : null;
        const firstGift = donorDonations.length > 0 ? new Date(Math.min(...donorDonations.map((d) => new Date(d.date)))) : null;
        const recencyDays = lastGift ? Math.floor((new Date() - lastGift) / (1000 * 60 * 60 * 24)) : null;
        const avgGift = frequency > 0 ? totalGiven / frequency : 0;

        return {
          ...donor,
          totalGiven,
          frequency,
          lastGift,
          firstGift,
          recencyDays,
          avgGift,
          level: donorLevels.find((l) => l.id === donor.donorProfile?.donorLevelId)
        };
      });

      // Filter by search term
      let filtered = donorMetrics.filter((donor) => {
        if (!searchTerm) return true;
        const search = searchTerm.toLowerCase();
        return (
          donor.firstName?.toLowerCase().includes(search) ||
          donor.lastName?.toLowerCase().includes(search) ||
          donor.email?.toLowerCase().includes(search) ||
          donor.organization?.toLowerCase().includes(search)
        );
      });

      // Sort
      filtered = filtered.sort((a, b) => {
        switch (sortBy) {
          case 'totalGiven':
            return b.totalGiven - a.totalGiven;
          case 'lastGift':
            return (b.lastGift || 0) - (a.lastGift || 0);
          case 'frequency':
            return b.frequency - a.frequency;
          case 'name':
          default:
            return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
        }
      });

      // Segment
      const segments = {};
      filtered.forEach((donor) => {
        let segmentKey;
        switch (segmentBy) {
          case 'level':
            segmentKey = donor.level?.name || 'No Level';
            break;
          case 'recency':
            if (donor.recencyDays === null) segmentKey = 'Never Donated';
            else if (donor.recencyDays <= 90) segmentKey = 'Recent (0-90 days)';
            else if (donor.recencyDays <= 365) segmentKey = 'Within Year (91-365 days)';
            else segmentKey = 'Lapsed (>365 days)';
            break;
          case 'frequency':
            if (donor.frequency === 0) segmentKey = 'No Donations';
            else if (donor.frequency === 1) segmentKey = '1 Donation';
            else if (donor.frequency <= 5) segmentKey = '2-5 Donations';
            else if (donor.frequency <= 10) segmentKey = '6-10 Donations';
            else segmentKey = '10+ Donations';
            break;
          case 'amount':
            if (donor.totalGiven === 0) segmentKey = '$0';
            else if (donor.totalGiven < 100) segmentKey = '$1-$99';
            else if (donor.totalGiven < 500) segmentKey = '$100-$499';
            else if (donor.totalGiven < 1000) segmentKey = '$500-$999';
            else if (donor.totalGiven < 5000) segmentKey = '$1,000-$4,999';
            else segmentKey = '$5,000+';
            break;
          default:
            segmentKey = 'Unknown';
        }
        if (!segments[segmentKey]) segments[segmentKey] = [];
        segments[segmentKey].push(donor);
      });


      return segments;
    };

    const segments = getSegmentedDonors();

    // Calculate top-level stats
    const totalDonors = donorsAll.length;
    const activeDonors = Object.values(segments).flat().filter((d) => d.frequency > 0).length;
    const topDonor = Object.values(segments)
      .flat()
      .sort((a, b) => b.totalGiven - a.totalGiven)[0];
    const avgLifetimeValue = activeDonors > 0 ? Object.values(segments).flat().reduce((sum, d) => sum + d.totalGiven, 0) / activeDonors : 0;

    // RFM Analysis
    const rfmScore = (donor) => {
      let r = 0,
        f = 0,
        m = 0;
      if (donor.recencyDays !== null) {
        if (donor.recencyDays <= 90) r = 5;
        else if (donor.recencyDays <= 180) r = 4;
        else if (donor.recencyDays <= 365) r = 3;
        else if (donor.recencyDays <= 730) r = 2;
        else r = 1;
      }
      if (donor.frequency >= 10) f = 5;
      else if (donor.frequency >= 6) f = 4;
      else if (donor.frequency >= 3) f = 3;
      else if (donor.frequency >= 2) f = 2;
      else if (donor.frequency >= 1) f = 1;
      if (donor.totalGiven >= 5000) m = 5;
      else if (donor.totalGiven >= 1000) m = 4;
      else if (donor.totalGiven >= 500) m = 3;
      else if (donor.totalGiven >= 100) m = 2;
      else if (donor.totalGiven > 0) m = 1;
      return { r, f, m, total: r + f + m };
    };

    const getRFMSegment = (score) => {
      if (score.total >= 13) return 'Champions';
      if (score.r >= 4 && score.m >= 4) return 'Loyal Donors';
      if (score.r >= 3 && score.f >= 3) return 'Potential Loyalists';
      if (score.r >= 4) return 'Recent Donors';
      if (score.f >= 4) return 'Frequent Donors';
      if (score.m >= 4) return 'Big Spenders';
      if (score.r <= 2 && score.f >= 3) return 'At Risk';
      if (score.r <= 2) return 'Lost';
      return 'Needs Attention';
    };

    // Tooltip descriptions keyed to getRFMSegment output — criteria match rfmScore() thresholds above
    const SEGMENT_TOOLTIPS = {
      'Champions':           'RFM score ≥ 13 — top donors across recency, frequency, and amount',
      'Loyal Donors':        'Donated within 6 months (R≥4) and given $1,000+ (M≥4)',
      'Potential Loyalists': 'Donated within a year (R≥3) and donated 3+ times (F≥3)',
      'Recent Donors':       'Donated within the last 6 months (R≥4)',
      'Frequent Donors':     'Donated 6 or more times (F≥4)',
      'Big Spenders':        'Lifetime giving of $1,000+ (M≥4)',
      'At Risk':             'No gift in 1–2 years but previously donated 3+ times',
      'Lost':                'No gift in over 2 years',
      'Needs Attention':     'Low activity across recency, frequency, and amount',
    };

    // Retention rate
    const calculateRetentionRate = () => {
      const currentYear = new Date().getFullYear();
      const previousYear = currentYear - 1;
      const donorsPrevYear = new Set((data.donations || []).filter((d) => new Date(d.date).getFullYear() === previousYear).map((d) => d.contactId));
      const donorsCurrYear = new Set((data.donations || []).filter((d) => new Date(d.date).getFullYear() === currentYear).map((d) => d.contactId));
      const retained = [...donorsPrevYear].filter((id) => donorsCurrYear.has(id)).length;
      return donorsPrevYear.size > 0 ? (retained / donorsPrevYear.size) * 100 : 0;
    };

    const retentionRate = calculateRetentionRate();

    // Render
    return React.createElement(
      'div',
      { className: 'donors-view' },

      // Header & Stats
      React.createElement(
        'div',
        { className: 'mb-8' },
        React.createElement(
          'div',
          { className: 'flex items-center justify-between mb-4' },
          React.createElement('h2', { className: 'text-2xl font-bold text-gray-900' }, 'Donor Analytics'),
          React.createElement(
            'div',
            { className: 'flex gap-3 mt-4' },
            React.createElement('button', {
              onClick: () => { window.location.hash = '/donor-login'; },
              className: 'px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium'
            }, '💎 Donor Portal'),
            React.createElement('button', {
              onClick: () => setShowAddDonationModal(true),
              className: 'px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium'
            }, '+ Add Donation')
          )
        ),
        React.createElement(
          'div',
          { className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4' },
          React.createElement(StatCard, { icon: '👥', label: 'Total Donors', value: totalDonors, color: 'blue' }),
          React.createElement(StatCard, { icon: '✅', label: 'Active Donors', value: activeDonors, color: 'green' }),
          React.createElement(StatCard, { icon: '🏆', label: 'Top Donor', value: topDonor ? formatCurrency(topDonor.totalGiven) : '$0', color: 'purple' }),
          React.createElement(StatCard, {
            icon: '💰',
            label: 'Avg Lifetime Value',
            value: formatCurrency(avgLifetimeValue),
            subtext: `${retentionRate.toFixed(1)}% retention rate`,
            color: 'indigo'
          })
        )
      ),

      // Segmentation Controls
      React.createElement(
        'div',
        { className: 'mb-6 border border-gray-300 rounded-lg p-4 bg-gray-50' },
        React.createElement(
          'div',
          { className: 'flex flex-wrap items-center justify-between gap-4 mb-4' },
          React.createElement(
            'div',
            { className: 'relative flex gap-2 items-center' },
            React.createElement('label', { className: 'text-sm font-medium text-gray-700' }, 'Segment By:'),
            React.createElement(
              'select',
              { value: segmentBy, onChange: (e) => setSegmentBy(e.target.value), className: 'border border-gray-300 rounded px-3 py-1.5 text-sm bg-white text-gray-900' },
              React.createElement('option', { value: 'level' }, 'Donor Level'),
              React.createElement('option', { value: 'recency' }, 'Recency'),
              React.createElement('option', { value: 'frequency' }, 'Frequency'),
              React.createElement('option', { value: 'amount' }, 'Total Given')
            ),
            React.createElement('button', {
              onClick: () => setShowSegmentInfo(s => !s),
              title: 'What do these segments mean?',
              className: 'ml-1 text-gray-400 hover:text-violet-600 text-sm leading-none'
            }, 'ⓘ'),
            showSegmentInfo && React.createElement(
              'div',
              { className: 'absolute top-full left-0 mt-1 z-20 w-80 p-3 bg-white border border-gray-200 rounded-lg shadow-lg text-xs text-gray-700 space-y-1.5' },
              React.createElement('p', { className: 'font-semibold text-gray-900 mb-2' }, 'RFM Segment Criteria'),
              ...Object.entries(SEGMENT_TOOLTIPS).map(([label, desc]) =>
                React.createElement('div', { key: label },
                  React.createElement('span', { className: 'font-medium text-gray-900' }, label + ': '),
                  desc
                )
              )
            )
          ),
          React.createElement(
            'div',
            { className: 'flex gap-2 items-center' },
            React.createElement('label', { className: 'text-sm font-medium text-gray-700' }, 'View:'),
            React.createElement(
              'div',
              { className: 'view-toggle' },
              React.createElement('button', {
                type: 'button',
                onClick: () => setViewMode('directory'),
                className: `view-toggle-btn${viewMode === 'directory' ? ' active' : ''}`
              }, '⊞ Cards'),
              React.createElement('button', {
                type: 'button',
                onClick: () => setViewMode('table'),
                className: `view-toggle-btn${viewMode === 'table' ? ' active' : ''}`
              }, '≡ Table')
            )
          )
        ),
        React.createElement(
          'div',
          { className: 'flex gap-4' },
          React.createElement('input', {
            type: 'text',
            placeholder: 'Search donors...',
            value: searchTerm,
            onChange: (e) => setSearchTerm(e.target.value),
            className: 'flex-1 border border-gray-300 rounded px-3 py-2 text-sm bg-white text-gray-900'
          }),
          React.createElement(
            'select',
            { value: sortBy, onChange: (e) => setSortBy(e.target.value), className: 'border border-gray-300 rounded px-3 py-2 text-sm bg-white text-gray-900' },
            React.createElement('option', { value: 'name' }, 'Sort: Name'),
            React.createElement('option', { value: 'totalGiven' }, 'Sort: Total Given'),
            React.createElement('option', { value: 'lastGift' }, 'Sort: Last Gift'),
            React.createElement('option', { value: 'frequency' }, 'Sort: Frequency')
          )
        )
      ),

      // Segments Display
      React.createElement(
        'div',
        { className: 'segments-container' },
        Object.entries(segments).map(([segmentName, donors]) =>
          React.createElement(
            'div',
            { key: segmentName, className: 'segment-group mb-6' },
            React.createElement(
              'div',
              { className: 'flex items-center justify-between mb-3' },
              React.createElement('h3', { className: 'text-lg font-semibold text-gray-900' }, segmentName),
              React.createElement(SegmentBar, { count: donors.length, total: Object.values(segments).flat().length })
            ),
            viewMode === 'directory'
              ? React.createElement(
                  'div',
                  { className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' },
                  donors.map((donor) => {
                    const rfmLabel = getRFMSegment(rfmScore(donor));
                    return React.createElement(DonorCard, { key: donor.id, donor: donor, rfm: rfmLabel, rfmTooltip: SEGMENT_TOOLTIPS[rfmLabel] || rfmLabel });
                  })
                )
              : React.createElement(DonorTable, { donors: donors })
          )
        )
      ),

      // Add Donation Modal — at DonorsView scope where state is accessible
      showAddDonationModal && global.AddDonationModal && React.createElement(global.AddDonationModal, {
        onClose: () => {
          setShowAddDonationModal(false);
          window.dispatchEvent(new Event('focus'));
        },
        onSave: () => {
          window.dispatchEvent(new Event('focus'));
        }
      })
    );
  };

  // Helper Components
  const StatCard = ({ icon, label, value, subtext, color }) => {
    const colorClasses = {
      blue: 'border-blue-200 bg-blue-50',
      green: 'border-green-200 bg-green-50',
      purple: 'border-purple-200 bg-purple-50',
      indigo: 'border-indigo-200 bg-indigo-50'
    };
    const textColors = {
      blue: 'text-blue-700',
      green: 'text-green-700',
      purple: 'text-purple-700',
      indigo: 'text-indigo-700'
    };
    return React.createElement(
      'div',
      { className: `stat-card border rounded-lg p-4 ${colorClasses[color]}` },
      React.createElement('div', { className: 'text-3xl mb-2' }, icon),
      React.createElement('div', { className: `text-2xl font-bold mb-1 ${textColors[color]}` }, value),
      React.createElement('div', { className: 'text-sm text-gray-700' }, label),
      subtext && React.createElement('div', { className: 'text-xs text-gray-600 mt-1' }, subtext)
    );
  };

      const SegmentBar = ({ count, total }) => {
    const percentage = total > 0 ? (count / total) * 100 : 0;
    return React.createElement(
      'div',
      { className: 'flex items-center gap-2' },
      React.createElement('span', { className: 'text-sm font-medium text-gray-700' }, `${count} donor${count !== 1 ? 's' : ''}`),
      React.createElement('div', { className: 'w-32 bg-gray-200 rounded-full h-2 overflow-hidden' },
        React.createElement('div', { className: 'h-full bg-violet-500 transition-all duration-500', style: { width: `${Math.min(percentage, 100)}%` } })
      ),
      React.createElement('span', { className: 'text-xs text-gray-500' }, `${percentage.toFixed(1)}%`)
    );
  };

  const DonorCard = ({ donor, rfm, rfmTooltip }) => {
    return React.createElement(
      'div',
      { className: 'donor-card border border-gray-300 rounded-lg p-4 hover:shadow-lg transition cursor-pointer bg-white' },
      React.createElement(
        'div',
        { className: 'flex items-start justify-between mb-3' },
        React.createElement('div', { className: 'flex items-center gap-3 flex-1 min-w-0' },
          donor.donorProfile?.photoUrl
            ? React.createElement('img', {
                src: donor.donorProfile.photoUrl,
                alt: `${donor.firstName} ${donor.lastName}`,
                className: 'w-10 h-10 rounded-full object-cover flex-shrink-0'
              })
            : React.createElement('div', {
                className: 'w-10 h-10 rounded-full bg-violet-700 flex items-center justify-center text-white text-sm font-bold flex-shrink-0'
              }, (donor.firstName || donor.lastName || '?')[0].toUpperCase()),
          React.createElement('div', { className: 'min-w-0' },
            React.createElement('h4', { className: 'font-semibold truncate text-gray-900' }, `${donor.firstName} ${donor.lastName}`),
            donor.organization && React.createElement('p', { className: 'text-xs text-gray-600 truncate' }, donor.organization)
          )
        ),
        React.createElement('span', {
          className: 'px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-900 border border-purple-300 cursor-help',
          title: rfmTooltip || rfm
        }, rfm)
      ),
      React.createElement(
        'div',
        { className: 'space-y-2 text-sm' },
        React.createElement(
          'div',
          { className: 'flex justify-between' },
          React.createElement('span', { className: 'text-gray-600' }, 'Total Given:'),
          React.createElement('span', { className: 'font-semibold text-green-600' }, formatCurrency(donor.totalGiven))
        ),
        React.createElement(
          'div',
          { className: 'flex justify-between' },
          React.createElement('span', { className: 'text-gray-600' }, 'Donations:'),
          React.createElement('span', { className: 'text-gray-900' }, donor.frequency)
        ),
        donor.lastGift && React.createElement(
          'div',
          { className: 'flex justify-between' },
          React.createElement('span', { className: 'text-gray-600' }, 'Last Gift:'),
          React.createElement('span', { className: 'text-gray-900' }, formatDate(donor.lastGift))
        ),
        donor.level && React.createElement(
          'div',
          { className: 'flex justify-between' },
          React.createElement('span', { className: 'text-gray-600' }, 'Level:'),
          React.createElement('span', { className: 'text-gray-900' }, donor.level.name)
        )
      ),
      React.createElement(
        'div',
        { className: 'mt-3 pt-3 border-t border-gray-100 flex justify-end' },
        React.createElement('button', {
          onClick: (e) => {
            e.stopPropagation();
            window.donorAuthService?.createSession(donor.id);
            window.location.hash = '/donor-portal';
          },
          className: 'text-purple-600 hover:text-purple-700 text-xs font-medium'
        }, '💎 View Portal')
      )
    );
  };

  const DonorTable = ({ donors }) => {
    return React.createElement(
      'div',
      { className: 'hub-table-wrap' },
      React.createElement(
        'table',
        { className: 'hub-table' },
        React.createElement(
          'thead',
          null,
          React.createElement(
            'tr',
            null,
            React.createElement('th', null, 'Name'),
            React.createElement('th', { className: 'muted hidden md:table-cell' }, 'Email'),
            React.createElement('th', { className: 'right' }, 'Total Given'),
            React.createElement('th', { className: 'right' }, 'Donations'),
            React.createElement('th', { className: 'hidden md:table-cell' }, 'Last Gift'),
            React.createElement('th', null, 'Level'),
            React.createElement('th', { className: 'right' }, React.createElement('span', { className: 'sr-only' }, 'Actions'))
          )
        ),
        React.createElement(
          'tbody',
          null,
          donors.map((donor) => {
            const name = `${donor.firstName || ''} ${donor.lastName || ''}`.trim() || 'Unnamed';
            const initial = (donor.firstName || donor.lastName || '?')[0].toUpperCase();
            return React.createElement(
              'tr',
              { key: donor.id },
              React.createElement('td', { className: 'font-medium' },
                React.createElement('div', { className: 'flex items-center gap-2' },
                  donor.donorProfile?.photoUrl
                    ? React.createElement('img', { src: donor.donorProfile.photoUrl, alt: name, className: 'w-7 h-7 rounded-full object-cover flex-shrink-0' })
                    : React.createElement('div', { className: 'w-7 h-7 rounded-full bg-violet-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0' }, initial),
                  name
                )
              ),
              React.createElement('td', { className: 'muted hidden md:table-cell' }, donor.email || '—'),
              React.createElement('td', { className: 'right font-semibold text-green-600' }, formatCurrency(donor.totalGiven)),
              React.createElement('td', { className: 'right' }, donor.frequency),
              React.createElement('td', { className: 'hidden md:table-cell' }, donor.lastGift ? formatDate(donor.lastGift) : '—'),
              React.createElement('td', null, donor.level?.name || '—'),
              React.createElement('td', { className: 'right' },
                React.createElement('button', {
                  type: 'button',
                  onClick: () => {
                    window.donorAuthService?.createSession(donor.id);
                    window.location.hash = '/donor-portal';
                  },
                  className: 'text-xs text-violet-600 hover:text-violet-800 font-medium'
                }, '💎 Portal')
              )
            );
          })
        )
      )
    );
  };

  // Utility functions
  const formatCurrency = (amount) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount || 0);
  const formatDate = (date) => new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  // Export to global scope
  global.DonorsView = DonorsView;
})(window);
