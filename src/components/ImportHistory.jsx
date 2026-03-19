/**
 * ImportHistory Component
 * Displays all past import operations with filtering, statistics, and detailed logs.
 */
(function (global) {
  'use strict';

  const { React } = global;
  const { useState, useEffect } = React;

  /**
   * ImportLogDetails - Expanded details for a single import log
   */
  const ImportLogDetails = ({ log, onDelete, onReload }) => {
    const formatCurrency = (amount) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(amount || 0);
    };

    const handleDeleteLog = () => {
      if (confirm('Delete this import log? This cannot be undone.')) {
        const importLogsService = global.importLogsService;
        if (importLogsService) {
          importLogsService.deleteImportLog(log.id);
          onReload();
        }
      }
    };

    const handleDownloadErrors = () => {
      const errorReportGenerator = global.errorReportGenerator;
      if (errorReportGenerator && log.errorDetails && log.errorDetails.length > 0) {
        errorReportGenerator.downloadErrorReport(log.errorDetails);
      } else {
        alert('No errors to download');
      }
    };

    return React.createElement(
      'div',
      { className: 'log-details' },
      React.createElement('h4', { className: 'font-semibold mb-3' }, 'Import Details'),

      // Summary grid
      React.createElement(
        'div',
        { className: 'grid grid-cols-2 gap-4 mb-4' },
        React.createElement(
          'div',
          null,
          React.createElement('p', { className: 'text-sm font-medium text-gray-600 mb-2' }, 'Summary'),
          React.createElement(
            'ul',
            { className: 'text-sm space-y-1' },
            React.createElement('li', null, `• Contacts Created: ${log.summary?.contactsCreated || 0}`),
            React.createElement('li', null, `• Contacts Updated: ${log.summary?.contactsUpdated || 0}`),
            React.createElement('li', null, `• Donations Created: ${log.summary?.donationsCreated || 0}`),
            React.createElement('li', null, `• Total Amount: ${formatCurrency(log.summary?.totalAmount)}`)
          )
        ),

        React.createElement(
          'div',
          null,
          React.createElement('p', { className: 'text-sm font-medium text-gray-600 mb-2' }, 'Options Used'),
          React.createElement(
            'ul',
            { className: 'text-sm space-y-1' },
            React.createElement('li', null, `• Skip Invalid: ${log.options?.skipInvalid ? 'Yes' : 'No'}`),
            React.createElement('li', null, `• Update Existing: ${log.options?.updateExisting ? 'Yes' : 'No'}`),
            React.createElement('li', null, `• User: ${log.userId || 'Unknown'}`)
          )
        )
      ),

      // Error details
      log.errorDetails && log.errorDetails.length > 0 && React.createElement(
        'div',
        { className: 'errors-section mb-4' },
        React.createElement('p', { className: 'text-sm font-medium text-gray-600 mb-2' }, `Errors (${log.errorDetails.length})`),
        React.createElement(
          'div',
          { className: 'max-h-48 overflow-auto bg-red-50 border border-red-200 rounded p-3' },
          log.errorDetails.slice(0, 5).map((error, index) => (
            React.createElement(
              'div',
              { key: index, className: 'text-sm text-red-800 mb-2' },
              error.row ? `Row ${error.row}: ${error.reason || error.error || 'Unknown error'}` : error.error || 'Unknown error'
            )
          )),
          log.errorDetails.length > 5 && React.createElement(
            'p',
            { className: 'text-xs text-red-600 mt-2' },
            `... and ${log.errorDetails.length - 5} more errors`
          )
        ),

        React.createElement(
          'button',
          {
            onClick: handleDownloadErrors,
            className: 'text-sm bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded mt-2'
          },
          '📥 Download Error Report'
        )
      ),

      // Actions
      React.createElement(
        'div',
        { className: 'actions mt-4 flex gap-2' },
        React.createElement(
          'button',
          {
            onClick: handleDeleteLog,
            className: 'text-sm bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded'
          },
          '🗑 Delete Log'
        )
      )
    );
  };

  /**
   * Main ImportHistory Component
   */
  const ImportHistory = () => {
    const [logs, setLogs] = useState([]);
    const [filteredLogs, setFilteredLogs] = useState([]);
    const [filter, setFilter] = useState({
      status: 'all',
      dateRange: 'all'
    });
    const [expandedLogId, setExpandedLogId] = useState(null);
    const [stats, setStats] = useState(null);

    // Load data on mount
    useEffect(() => {
      loadLogs();
      loadStats();
    }, []);

    // Apply filters when logs or filter changes
    useEffect(() => {
      applyFilters();
    }, [logs, filter]);

    const loadLogs = () => {
      const importLogsService = global.importLogsService;
      if (importLogsService) {
        const allLogs = importLogsService.loadImportLogs();
        setLogs(allLogs);
      }
    };

    const loadStats = () => {
      const importLogsService = global.importLogsService;
      if (importLogsService) {
        const statistics = importLogsService.getImportStatistics();
        setStats(statistics);
      }
    };

    const applyFilters = () => {
      let filtered = [...logs];

      // Status filter
      if (filter.status !== 'all') {
        filtered = filtered.filter(log => log.status === filter.status);
      }

      // Date range filter
      if (filter.dateRange !== 'all') {
        const importLogsService = global.importLogsService;
        if (importLogsService) {
          let dateFilteredLogs = [];
          switch (filter.dateRange) {
            case 'today':
              dateFilteredLogs = importLogsService.getTodaysImports();
              break;
            case 'week':
              dateFilteredLogs = importLogsService.getThisWeeksImports();
              break;
            case 'month':
              dateFilteredLogs = importLogsService.getThisMonthsImports();
              break;
          }
          
          // Filter current filtered logs to only include those in date range
          const dateFilteredIds = dateFilteredLogs.map(l => l.id);
          filtered = filtered.filter(log => dateFilteredIds.includes(log.id));
        }
      }

      setFilteredLogs(filtered);
    };

    const toggleExpand = (logId) => {
      setExpandedLogId(expandedLogId === logId ? null : logId);
    };

    const getStatusBadge = (status) => {
      const badges = {
        completed: React.createElement('span', { className: 'px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-semibold' }, '✓ Completed'),
        failed: React.createElement('span', { className: 'px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-semibold' }, '✗ Failed'),
        processing: React.createElement('span', { className: 'px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-semibold' }, '⏳ Processing'),
        uploading: React.createElement('span', { className: 'px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold' }, '📤 Uploading')
      };

      return badges[status] || React.createElement('span', { className: 'text-gray-500' }, status);
    };

    const handleCleanupOldLogs = () => {
      const confirmed = confirm('Delete import logs older than 90 days? This cannot be undone.');

      if (confirmed) {
        const importLogsService = global.importLogsService;
        if (importLogsService) {
          const deletedCount = importLogsService.cleanupOldLogs(90);
          alert(`Deleted ${deletedCount} old import logs`);
          loadLogs();
          loadStats();
        }
      }
    };

    const formatDate = (dateString) => {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    };

    const formatTime = (dateString) => {
      return new Date(dateString).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit'
      });
    };

    const calculateDuration = (start, end) => {
      const duration = new Date(end) - new Date(start);
      const seconds = Math.floor(duration / 1000);

      if (seconds < 60) return `${seconds}s`;

      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;

      return `${minutes}m ${remainingSeconds}s`;
    };

    const formatCurrency = (amount) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(amount || 0);
    };

    const handleReloadData = () => {
      loadLogs();
      loadStats();
      setExpandedLogId(null);
    };

    return React.createElement(
      'div',
      { className: 'import-history bg-white text-gray-800 rounded-lg p-4' },

      // Header
      React.createElement(
        'div',
        { className: 'header mb-4 flex items-center justify-between' },
        React.createElement('h2', { className: 'text-2xl font-bold text-gray-900' }, 'Import History'),
        React.createElement(
          'button',
          {
            onClick: handleCleanupOldLogs,
            className: 'bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-2 rounded text-sm'
          },
          '🗑 Cleanup Old Logs'
        )
      ),

      // Statistics summary
      stats && React.createElement(
        'div',
        { className: 'stats-grid grid grid-cols-2 md:grid-cols-4 gap-4 mb-6' },
        React.createElement(
          'div',
          { className: 'stat-card bg-blue-50 border border-blue-200 rounded p-4' },
          React.createElement('div', { className: 'text-2xl font-bold text-blue-600' }, stats.totalImports),
          React.createElement('div', { className: 'text-sm text-blue-700' }, 'Total Imports'),
          React.createElement('div', { className: 'text-xs text-blue-600 mt-1' }, `${stats.completedImports} completed, ${stats.failedImports} failed`)
        ),
        React.createElement(
          'div',
          { className: 'stat-card bg-green-50 border border-green-200 rounded p-4' },
          React.createElement('div', { className: 'text-2xl font-bold text-green-600' }, stats.totalContactsCreated),
          React.createElement('div', { className: 'text-sm text-green-700' }, 'Contacts Created'),
          React.createElement('div', { className: 'text-xs text-green-600 mt-1' }, `${stats.totalContactsUpdated} updated`)
        ),
        React.createElement(
          'div',
          { className: 'stat-card bg-purple-50 border border-purple-200 rounded p-4' },
          React.createElement('div', { className: 'text-2xl font-bold text-purple-600' }, stats.totalDonationsCreated),
          React.createElement('div', { className: 'text-sm text-purple-700' }, 'Donations Imported'),
          React.createElement('div', { className: 'text-xs text-purple-600 mt-1' }, `${stats.totalRowsProcessed} rows processed`)
        ),
        React.createElement(
          'div',
          { className: 'stat-card bg-indigo-50 border border-indigo-200 rounded p-4' },
          React.createElement('div', { className: 'text-2xl font-bold text-indigo-600' }, formatCurrency(stats.totalAmountImported)),
          React.createElement('div', { className: 'text-sm text-indigo-700' }, 'Total Amount'),
          React.createElement('div', { className: 'text-xs text-indigo-600 mt-1' }, `${stats.averageSuccessRate}% success rate`)
        )
      ),

      // Filters
      React.createElement(
        'div',
        { className: 'filters mb-4 flex flex-wrap gap-3 items-center' },
        React.createElement(
          'select',
          {
            value: filter.status,
            onChange: (e) => setFilter({ ...filter, status: e.target.value }),
            className: 'border rounded px-3 py-2'
          },
          React.createElement('option', { value: 'all' }, 'All Status'),
          React.createElement('option', { value: 'completed' }, 'Completed'),
          React.createElement('option', { value: 'failed' }, 'Failed'),
          React.createElement('option', { value: 'processing' }, 'In Progress')
        ),

        React.createElement(
          'select',
          {
            value: filter.dateRange,
            onChange: (e) => setFilter({ ...filter, dateRange: e.target.value }),
            className: 'border rounded px-3 py-2'
          },
          React.createElement('option', { value: 'all' }, 'All Time'),
          React.createElement('option', { value: 'today' }, 'Today'),
          React.createElement('option', { value: 'week' }, 'This Week'),
          React.createElement('option', { value: 'month' }, 'This Month')
        ),

        React.createElement(
          'div',
          { className: 'ml-auto text-sm text-gray-600' },
          `Showing ${filteredLogs.length} of ${logs.length} imports`
        )
      ),

      // Import logs table
      filteredLogs.length === 0 ? React.createElement(
        'div',
        { className: 'empty-state text-center py-12 border rounded bg-gray-50' },
        React.createElement('div', { className: 'text-4xl mb-2' }, '📋'),
        React.createElement('p', { className: 'text-gray-600' }, 'No import history found'),
        React.createElement('p', { className: 'text-sm text-gray-500 mt-1' }, 'Import logs will appear here once you complete an import')
      ) : React.createElement(
        'div',
        { className: 'logs-table border rounded overflow-hidden' },
        React.createElement(
          'div',
          { className: 'overflow-x-auto' },
          React.createElement(
            'table',
            { className: 'w-full' },
            React.createElement(
              'thead',
              { className: 'bg-gray-50' },
              React.createElement(
                'tr',
                null,
                React.createElement('th', { className: 'text-left p-3 border-b' }, 'Date/Time'),
                React.createElement('th', { className: 'text-left p-3 border-b' }, 'File Name'),
                React.createElement('th', { className: 'text-center p-3 border-b' }, 'Total Rows'),
                React.createElement('th', { className: 'text-center p-3 border-b' }, 'Success'),
                React.createElement('th', { className: 'text-center p-3 border-b' }, 'Failed'),
                React.createElement('th', { className: 'text-center p-3 border-b' }, 'Status'),
                React.createElement('th', { className: 'text-center p-3 border-b' }, 'Actions')
              )
            ),
            React.createElement(
              'tbody',
              null,
              filteredLogs.map(log => (
                React.createElement(
                  React.Fragment,
                  { key: log.id },
                  // Main row
                  React.createElement(
                    'tr',
                    {
                      className: `border-b hover:bg-gray-50 cursor-pointer ${expandedLogId === log.id ? 'bg-blue-50' : ''}`,
                      onClick: () => toggleExpand(log.id)
                    },
                    React.createElement(
                      'td',
                      { className: 'p-3' },
                      React.createElement('div', { className: 'text-sm font-medium' }, formatDate(log.uploadedAt)),
                      React.createElement('div', { className: 'text-xs text-gray-500' }, formatTime(log.uploadedAt))
                    ),
                    React.createElement(
                      'td',
                      { className: 'p-3' },
                      React.createElement('div', { className: 'font-medium' }, log.fileName),
                      log.completedAt && React.createElement(
                        'div',
                        { className: 'text-xs text-gray-500' },
                        `Took ${calculateDuration(log.uploadedAt, log.completedAt)}`
                      )
                    ),
                    React.createElement('td', { className: 'p-3 text-center' }, log.totalRows),
                    React.createElement('td', { className: 'p-3 text-center text-green-600 font-semibold' }, log.successCount),
                    React.createElement('td', { className: 'p-3 text-center text-red-600 font-semibold' }, log.failureCount),
                    React.createElement('td', { className: 'p-3 text-center' }, getStatusBadge(log.status)),
                    React.createElement(
                      'td',
                      { className: 'p-3 text-center' },
                      React.createElement(
                        'button',
                        {
                          onClick: (e) => {
                            e.stopPropagation();
                            toggleExpand(log.id);
                          },
                          className: 'text-blue-600 hover:underline'
                        },
                        expandedLogId === log.id ? '▼ Details' : '▶ Details'
                      )
                    )
                  ),

                  // Expanded details row
                  expandedLogId === log.id && React.createElement(
                    'tr',
                    null,
                    React.createElement(
                      'td',
                      { colSpan: 7, className: 'p-4 bg-gray-50' },
                      React.createElement(ImportLogDetails, {
                        log: log,
                        onReload: handleReloadData
                      })
                    )
                  )
                )
              ))
            )
          )
        )
      )
    );
  };

  // Export globally
  global.ImportHistory = ImportHistory;
})(window);
