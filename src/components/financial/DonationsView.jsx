/**
 * DonationsView Component
 * Comprehensive donation list with filtering, sorting, and export functionality.
 */
(function (global) {
  'use strict';

  const { React } = global;

  const DonationsView = ({ data, dateRange }) => {
    const [sortBy, setSortBy] = React.useState('date'); // date, amount, donor
    const [sortOrder, setSortOrder] = React.useState('desc'); // asc, desc
    const [searchTerm, setSearchTerm] = React.useState('');
    const [filterType, setFilterType] = React.useState('all'); // all, monetary, in-kind
    const [selectedDonation, setSelectedDonation] = React.useState(null);

    const donations = data.donations || [];
    const contacts = data.contacts || [];

    // Filter and sort donations
    const getFilteredDonations = () => {
      let filtered = [...donations];

      // Filter by type
      if (filterType !== 'all') {
        filtered = filtered.filter((d) => d.donationType === filterType);
      }

      // Filter by search term
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        filtered = filtered.filter((d) => {
          const contact = contacts.find((c) => c.id === d.contactId);
          const donorName = contact ? `${contact.firstName} ${contact.lastName}`.toLowerCase() : '';
          return (
            donorName.includes(search) ||
            d.campaignName?.toLowerCase().includes(search) ||
            d.notes?.toLowerCase().includes(search) ||
            d.checkNumber?.toLowerCase().includes(search)
          );
        });
      }

      // Sort
      filtered.sort((a, b) => {
        let compareResult = 0;
        switch (sortBy) {
          case 'date':
            compareResult = new Date(a.date) - new Date(b.date);
            break;
          case 'amount':
            compareResult = (a.amount || a.estimatedValue || 0) - (b.amount || b.estimatedValue || 0);
            break;
          case 'donor': {
            const contactA = contacts.find((c) => c.id === a.contactId);
            const contactB = contacts.find((c) => c.id === b.contactId);
            const nameA = contactA ? `${contactA.firstName} ${contactA.lastName}` : '';
            const nameB = contactB ? `${contactB.firstName} ${contactB.lastName}` : '';
            compareResult = nameA.localeCompare(nameB);
            break;
          }
          default:
            compareResult = 0;
        }
        return sortOrder === 'asc' ? compareResult : -compareResult;
      });

      return filtered;
    };

    const filteredDonations = getFilteredDonations();

    // Calculate summary stats
    const totalAmount = filteredDonations.reduce((sum, d) => sum + (d.amount || d.estimatedValue || 0), 0);
    const avgDonation = filteredDonations.length > 0 ? totalAmount / filteredDonations.length : 0;
    const uniqueDonors = new Set(filteredDonations.map((d) => d.contactId)).size;

    // Export to CSV
    const handleExport = () => {
      if (!global.Papa) {
        alert('Export library not available');
        return;
      }
      const csvData = filteredDonations.map((donation) => {
        const contact = contacts.find((c) => c.id === donation.contactId);
        return {
          Date: donation.date,
          Donor: contact ? `${contact.firstName} ${contact.lastName}` : 'Unknown',
          Email: contact?.email || '',
          Amount: donation.amount || donation.estimatedValue || 0,
          Type: donation.donationType === 'monetary' ? 'Monetary' : 'In-Kind',
          Frequency: donation.recurringType || 'One-Time',
          Campaign: donation.campaignName || 'General Fund',
          PaymentMethod: donation.paymentMethod || '',
          CheckNumber: donation.checkNumber || '',
          Acknowledged: donation.acknowledgmentSent ? 'Yes' : 'No',
          Notes: donation.notes || ''
        };
      });
      const csv = global.Papa.unparse(csvData);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `donations_${dateRange}_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    // Toggle sort order or change sort field
    const handleSort = (field) => {
      if (sortBy === field) {
        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
      } else {
        setSortBy(field);
        setSortOrder('desc');
      }
    };

    // Render
    return React.createElement(
      'div',
      { className: 'donations-view' },

      // Header & Summary
      React.createElement(
        'div',
        { className: 'mb-6' },
        React.createElement('h2', { className: 'text-2xl font-bold mb-4 text-gray-900' }, 'Donations'),
        React.createElement(
          'div',
          { className: 'grid grid-cols-1 md:grid-cols-3 gap-4' },
          React.createElement(StatCard, { icon: '💵', label: 'Total Amount', value: formatCurrency(totalAmount), color: 'green' }),
          React.createElement(StatCard, { icon: '📊', label: 'Average Donation', value: formatCurrency(avgDonation), color: 'blue' }),
          React.createElement(StatCard, { icon: '👥', label: 'Unique Donors', value: uniqueDonors, color: 'purple' })
        )
      ),

      // Filters & Search
      React.createElement(
        'div',
        { className: 'mb-4 border border-gray-200 rounded-lg p-4 bg-gray-50' },
        React.createElement(
          'div',
          { className: 'flex flex-wrap gap-4 items-center' },
          React.createElement('input', {
            type: 'text',
            placeholder: 'Search donations...',
            value: searchTerm,
            onChange: (e) => setSearchTerm(e.target.value),
            className: 'flex-1 min-w-[200px] border border-gray-300 rounded px-3 py-2 text-sm bg-white text-gray-900'
          }),
          React.createElement(
            'select',
            { value: filterType, onChange: (e) => setFilterType(e.target.value), className: 'border border-gray-300 rounded px-3 py-2 text-sm bg-white text-gray-900' },
            React.createElement('option', { value: 'all' }, 'All Types'),
            React.createElement('option', { value: 'monetary' }, 'Monetary'),
            React.createElement('option', { value: 'in-kind' }, 'In-Kind')
          ),
          React.createElement('button', {
            onClick: handleExport,
            className: 'px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded text-sm font-medium transition'
          }, '📥 Export CSV')
        )
      ),

      // Donations Table
      React.createElement(
        'div',
        { className: 'overflow-x-auto border border-gray-200 rounded-lg bg-white' },
        React.createElement(
          'table',
          { className: 'w-full' },
          React.createElement(
            'thead',
            { className: 'bg-gray-100 border-b border-gray-200' },
            React.createElement(
              'tr',
              null,
              React.createElement(
                'th',
                { className: 'text-left px-6 py-3 text-xs font-semibold text-gray-900 cursor-pointer hover:bg-gray-200 uppercase tracking-wider', onClick: () => handleSort('date') },
                'Date ',
                sortBy === 'date' && (sortOrder === 'asc' ? '↑' : '↓')
              ),
              React.createElement(
                'th',
                { className: 'text-left px-6 py-3 text-xs font-semibold text-gray-900 cursor-pointer hover:bg-gray-200 uppercase tracking-wider', onClick: () => handleSort('donor') },
                'Donor ',
                sortBy === 'donor' && (sortOrder === 'asc' ? '↑' : '↓')
              ),
              React.createElement(
                'th',
                { className: 'text-left px-6 py-3 text-xs font-semibold text-gray-900 cursor-pointer hover:bg-gray-200 uppercase tracking-wider', onClick: () => handleSort('amount') },
                'Amount ',
                sortBy === 'amount' && (sortOrder === 'asc' ? '↑' : '↓')
              ),
              React.createElement('th', { className: 'text-left px-6 py-3 text-xs font-semibold text-gray-900 uppercase tracking-wider' }, 'Type'),
              React.createElement('th', { className: 'text-left px-6 py-3 text-xs font-semibold text-gray-900 uppercase tracking-wider' }, 'Campaign'),
              React.createElement('th', { className: 'text-left px-6 py-3 text-xs font-semibold text-gray-900 uppercase tracking-wider' }, 'Payment'),
              React.createElement('th', { className: 'text-left px-6 py-3 text-xs font-semibold text-gray-900 uppercase tracking-wider' }, 'Status'),
              React.createElement('th', { className: 'text-left px-6 py-3 text-xs font-semibold text-gray-900 uppercase tracking-wider' }, 'Actions')
            )
          ),
          React.createElement(
            'tbody',
            null,
            filteredDonations.map((donation) => {
              const contact = contacts.find((c) => c.id === donation.contactId);
              return React.createElement(
                'tr',
                { key: donation.id, className: 'border-b border-gray-200 hover:bg-gray-50 transition' },
                React.createElement('td', { className: 'px-6 py-4 text-sm text-gray-900' }, formatDate(donation.date)),
                React.createElement(
                  'td',
                  { className: 'px-6 py-4 text-sm font-medium text-gray-900' },
                  contact ? `${contact.firstName} ${contact.lastName}` : 'Unknown'
                ),
                React.createElement('td', { className: 'px-6 py-4 text-sm font-semibold text-green-700' }, formatCurrency(donation.amount || donation.estimatedValue)),
                React.createElement(
                  'td',
                  { className: 'px-6 py-4 text-sm' },
                  React.createElement(
                    'span',
                    {
                      className: `px-3 py-1 rounded-full text-xs font-medium ${
                        donation.donationType === 'monetary'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-blue-100 text-blue-800'
                      }`
                    },
                    donation.donationType === 'monetary' ? 'Monetary' : 'In-Kind'
                  )
                ),
                React.createElement('td', { className: 'px-6 py-4 text-sm text-gray-700' }, donation.campaignName || 'General Fund'),
                React.createElement('td', { className: 'px-6 py-4 text-sm text-gray-700' }, donation.paymentMethod || '—'),
                React.createElement(
                  'td',
                  { className: 'px-6 py-4 text-sm' },
                  React.createElement(
                    'span',
                    {
                      className: `px-3 py-1 rounded-full text-xs font-medium ${
                        donation.acknowledgmentSent
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`
                    },
                    donation.acknowledgmentSent ? '✓ Sent' : 'Pending'
                  )
                ),
                React.createElement(
                  'td',
                  { className: 'px-6 py-4 text-sm' },
                  React.createElement('button', {
                    onClick: () => setSelectedDonation(donation),
                    className: 'text-violet-600 hover:text-violet-800 hover:underline font-medium'
                  }, 'View')
                )
              );
            })
          )
        )
      ),

      // Donation Detail Modal
      selectedDonation && React.createElement(DonationDetailModal, {
        donation: selectedDonation,
        contact: contacts.find((c) => c.id === selectedDonation.contactId),
        onClose: () => setSelectedDonation(null)
      })
    );
  };

  // Helper Components
  const StatCard = ({ icon, label, value, color }) => {
    const colorClasses = {
      green: 'border-green-200 bg-green-50',
      blue: 'border-blue-200 bg-blue-50',
      purple: 'border-purple-200 bg-purple-50'
    };
    const textColors = {
      green: 'text-green-700',
      blue: 'text-blue-700',
      purple: 'text-purple-700'
    };
    return React.createElement(
      'div',
      { className: `stat-card border rounded-lg p-4 ${colorClasses[color]}` },
      React.createElement('div', { className: 'text-3xl mb-2' }, icon),
      React.createElement('div', { className: `text-2xl font-bold mb-1 ${textColors[color]}` }, value),
      React.createElement('div', { className: 'text-sm text-gray-600' }, label)
    );
  };

  const DonationDetailModal = ({ donation, contact, onClose }) => {
    return React.createElement(
      'div',
      { className: 'fixed inset-0 bg-black/50 flex items-center justify-center z-50', onClick: onClose },
      React.createElement(
        'div',
        { className: 'bg-white border border-gray-300 rounded-lg p-6 max-w-2xl w-full mx-4 shadow-lg', onClick: (e) => e.stopPropagation() },
        React.createElement(
          'div',
          { className: 'flex items-center justify-between mb-4' },
          React.createElement('h3', { className: 'text-xl font-bold text-gray-900' }, 'Donation Details'),
          React.createElement('button', { onClick: onClose, className: 'text-gray-500 hover:text-gray-700 text-2xl' }, '×')
        ),
        React.createElement(
          'div',
          { className: 'space-y-4' },
          React.createElement(DetailRow, { label: 'Donor', value: contact ? `${contact.firstName} ${contact.lastName}` : 'Unknown' }),
          React.createElement(DetailRow, { label: 'Email', value: contact?.email || '—' }),
          React.createElement(DetailRow, { label: 'Date', value: formatDate(donation.date) }),
          React.createElement(DetailRow, { label: 'Amount', value: formatCurrency(donation.amount || donation.estimatedValue) }),
          React.createElement(DetailRow, { label: 'Type', value: donation.donationType === 'monetary' ? 'Monetary' : 'In-Kind' }),
          React.createElement(DetailRow, { label: 'Frequency', value: donation.recurringType || 'One-Time' }),
          React.createElement(DetailRow, { label: 'Campaign', value: donation.campaignName || 'General Fund' }),
          React.createElement(DetailRow, { label: 'Payment Method', value: donation.paymentMethod || '—' }),
          donation.checkNumber && React.createElement(DetailRow, { label: 'Check Number', value: donation.checkNumber }),
          React.createElement(DetailRow, { label: 'Acknowledgment', value: donation.acknowledgmentSent ? 'Sent' : 'Not Sent' }),
          donation.notes && React.createElement(DetailRow, { label: 'Notes', value: donation.notes }),
          donation.donationType === 'in-kind' && donation.description && React.createElement(DetailRow, { label: 'Description', value: donation.description })
        )
      )
    );
  };

  const DetailRow = ({ label, value }) => (
    React.createElement(
      'div',
      { className: 'flex justify-between py-2 border-b border-gray-200' },
      React.createElement('span', { className: 'font-medium text-gray-700' }, label + ':'),
      React.createElement('span', { className: 'text-gray-900' }, value)
    )
  );

  // Utility functions
  const formatCurrency = (amount) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount || 0);
  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  // Export to global scope
  global.DonationsView = DonationsView;
})(window);
