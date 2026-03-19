/**
 * Import Logs Service
 * Manages import history and tracks all bulk import operations.
 * Provides comprehensive logging, filtering, and statistics for import activities.
 */
(function (global) {
  'use strict';

  const STORAGE_KEY = 'showsuite_import_logs';

  /**
   * Load all import logs from localStorage
   * @returns {Array} Array of import log objects
   */
  const loadImportLogs = () => {
    try {
      const logs = localStorage.getItem(STORAGE_KEY);
      return logs ? JSON.parse(logs) : [];
    } catch (error) {
      console.error('Error loading import logs:', error);
      return [];
    }
  };

  /**
   * Save import logs to localStorage
   * @param {Array} logs - Array of import log objects
   */
  const saveImportLogsToLS = (logs) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
    } catch (error) {
      console.error('Error saving import logs:', error);
      throw error;
    }
  };

  /**
   * Create a new import log entry
   * @param {Object} logData - Import log data
   * @returns {Object} Created log entry
   */
  const createImportLog = (logData) => {
    const logs = loadImportLogs();

    const newLog = {
      id: `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: logData.userId || 'system',
      fileName: logData.fileName || 'unknown.csv',
      uploadedAt: new Date().toISOString(),
      completedAt: null,
      status: 'uploading', // uploading, processing, completed, failed
      totalRows: logData.totalRows || 0,
      successCount: 0,
      failureCount: 0,
      summary: {
        contactsCreated: 0,
        contactsUpdated: 0,
        donationsCreated: 0,
        totalAmount: 0
      },
      errorDetails: [],
      options: logData.options || {
        skipInvalid: true,
        updateExisting: true,
        sendAcknowledgments: false
      }
    };

    logs.unshift(newLog); // Add to beginning for chronological order
    saveImportLogsToLS(logs);

    console.log(`✓ Import log created: ${newLog.id}`);
    return newLog;
  };

  /**
   * Update an existing import log
   * @param {string} logId - Import log ID
   * @param {Object} updates - Fields to update
   * @returns {Object} Updated log entry
   */
  const updateImportLog = (logId, updates) => {
    const logs = loadImportLogs();
    const index = logs.findIndex(log => log.id === logId);

    if (index === -1) {
      console.error(`Import log not found: ${logId}`);
      throw new Error(`Import log not found: ${logId}`);
    }

    logs[index] = {
      ...logs[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    saveImportLogsToLS(logs);
    return logs[index];
  };

  /**
   * Mark import as complete
   * @param {string} logId - Import log ID
   * @param {Object} results - Import results
   * @returns {Object} Updated log entry
   */
  const completeImportLog = (logId, results) => {
    const totalSuccess = (results.contactsCreated || 0) + (results.contactsUpdated || 0);

    return updateImportLog(logId, {
      status: 'completed',
      completedAt: new Date().toISOString(),
      successCount: totalSuccess,
      failureCount: (results.errors || []).length,
      summary: {
        contactsCreated: results.contactsCreated || 0,
        contactsUpdated: results.contactsUpdated || 0,
        donationsCreated: results.donationsCreated || 0,
        totalAmount: results.totalAmount || 0
      },
      errorDetails: (results.errors || []).slice(0, 100) // Limit to first 100 errors for storage
    });
  };

  /**
   * Mark import as failed
   * @param {string} logId - Import log ID
   * @param {string} errorMessage - Error message
   * @returns {Object} Updated log entry
   */
  const failImportLog = (logId, errorMessage) => {
    return updateImportLog(logId, {
      status: 'failed',
      completedAt: new Date().toISOString(),
      errorDetails: [{ 
        error: errorMessage,
        timestamp: new Date().toISOString()
      }]
    });
  };

  /**
   * Get import log by ID
   * @param {string} logId - Import log ID
   * @returns {Object|null} Import log or null
   */
  const getImportLogById = (logId) => {
    const logs = loadImportLogs();
    return logs.find(log => log.id === logId) || null;
  };

  /**
   * Get recent import logs
   * @param {number} limit - Number of logs to return
   * @returns {Array} Array of recent import logs
   */
  const getRecentImportLogs = (limit = 10) => {
    const logs = loadImportLogs();
    return logs.slice(0, limit);
  };

  /**
   * Get import logs by date range
   * @param {string} startDate - Start date (ISO format or Date object)
   * @param {string} endDate - End date (ISO format or Date object)
   * @returns {Array} Filtered import logs
   */
  const getImportLogsByDateRange = (startDate, endDate) => {
    const logs = loadImportLogs();
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Set end date to end of day
    end.setHours(23, 59, 59, 999);

    return logs.filter(log => {
      const logDate = new Date(log.uploadedAt);
      return logDate >= start && logDate <= end;
    });
  };

  /**
   * Get import logs by status
   * @param {string} status - Status to filter by (uploading, processing, completed, failed)
   * @returns {Array} Filtered import logs
   */
  const getImportLogsByStatus = (status) => {
    const logs = loadImportLogs();
    return logs.filter(log => log.status === status);
  };

  /**
   * Get import logs by user
   * @param {string} userId - User ID
   * @returns {Array} Filtered import logs
   */
  const getImportLogsByUser = (userId) => {
    const logs = loadImportLogs();
    return logs.filter(log => log.userId === userId);
  };

  /**
   * Delete old import logs (retention policy)
   * @param {number} daysToKeep - Number of days to keep logs (default: 90)
   * @returns {number} Number of logs deleted
   */
  const cleanupOldLogs = (daysToKeep = 90) => {
    const logs = loadImportLogs();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const filteredLogs = logs.filter(log => {
      const logDate = new Date(log.uploadedAt);
      return logDate >= cutoffDate;
    });

    const deletedCount = logs.length - filteredLogs.length;

    if (deletedCount > 0) {
      saveImportLogsToLS(filteredLogs);
      console.log(`✓ Cleaned up ${deletedCount} old import logs (older than ${daysToKeep} days)`);
    }

    return deletedCount;
  };

  /**
   * Get import statistics
   * @returns {Object} Aggregate statistics
   */
  const getImportStatistics = () => {
    const logs = loadImportLogs();

    const stats = {
      totalImports: logs.length,
      completedImports: logs.filter(l => l.status === 'completed').length,
      failedImports: logs.filter(l => l.status === 'failed').length,
      inProgressImports: logs.filter(l => ['uploading', 'processing'].includes(l.status)).length,
      totalContactsCreated: logs.reduce((sum, l) => sum + (l.summary?.contactsCreated || 0), 0),
      totalContactsUpdated: logs.reduce((sum, l) => sum + (l.summary?.contactsUpdated || 0), 0),
      totalDonationsCreated: logs.reduce((sum, l) => sum + (l.summary?.donationsCreated || 0), 0),
      totalAmountImported: logs.reduce((sum, l) => sum + (l.summary?.totalAmount || 0), 0),
      totalRowsProcessed: logs.reduce((sum, l) => sum + (l.totalRows || 0), 0),
      totalSuccessfulRows: logs.reduce((sum, l) => sum + (l.successCount || 0), 0),
      totalFailedRows: logs.reduce((sum, l) => sum + (l.failureCount || 0), 0),
      lastImportDate: logs.length > 0 ? logs[0].uploadedAt : null,
      averageSuccessRate: logs.length > 0 
        ? (logs.reduce((sum, l) => {
            const total = l.totalRows || 0;
            return sum + (total > 0 ? ((l.successCount || 0) / total) * 100 : 0);
          }, 0) / logs.length).toFixed(2)
        : 0
    };

    return stats;
  };

  /**
   * Delete a specific import log
   * @param {string} logId - Import log ID
   * @returns {boolean} True if deleted, false if not found
   */
  const deleteImportLog = (logId) => {
    const logs = loadImportLogs();
    const initialLength = logs.length;
    const filtered = logs.filter(log => log.id !== logId);
    
    if (filtered.length === initialLength) {
      console.warn(`Import log not found for deletion: ${logId}`);
      return false;
    }
    
    saveImportLogsToLS(filtered);
    console.log(`✓ Import log deleted: ${logId}`);
    return true;
  };

  /**
   * Search import logs by filename
   * @param {string} searchTerm - Search term for filename
   * @returns {Array} Matching import logs
   */
  const searchImportLogsByFileName = (searchTerm) => {
    const logs = loadImportLogs();
    const term = (searchTerm || '').toLowerCase();
    
    return logs.filter(log => 
      (log.fileName || '').toLowerCase().includes(term)
    );
  };

  /**
   * Get import logs with pagination
   * @param {number} page - Page number (1-indexed)
   * @param {number} pageSize - Number of items per page
   * @returns {Object} Paginated results with metadata
   */
  const getImportLogsPaginated = (page = 1, pageSize = 10) => {
    const logs = loadImportLogs();
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    
    return {
      data: logs.slice(startIndex, endIndex),
      pagination: {
        currentPage: page,
        pageSize: pageSize,
        totalItems: logs.length,
        totalPages: Math.ceil(logs.length / pageSize),
        hasNextPage: endIndex < logs.length,
        hasPreviousPage: page > 1
      }
    };
  };

  /**
   * Get successful imports only
   * @returns {Array} Successful import logs
   */
  const getSuccessfulImports = () => {
    return getImportLogsByStatus('completed');
  };

  /**
   * Get failed imports only
   * @returns {Array} Failed import logs
   */
  const getFailedImports = () => {
    return getImportLogsByStatus('failed');
  };

  /**
   * Get import duration (for completed imports)
   * @param {string} logId - Import log ID
   * @returns {number|null} Duration in seconds, or null if not applicable
   */
  const getImportDuration = (logId) => {
    const log = getImportLogById(logId);
    
    if (!log || !log.completedAt || !log.uploadedAt) {
      return null;
    }
    
    const start = new Date(log.uploadedAt);
    const end = new Date(log.completedAt);
    return Math.round((end - start) / 1000); // Return seconds
  };

  /**
   * Get logs from today
   * @returns {Array} Today's import logs
   */
  const getTodaysImports = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return getImportLogsByDateRange(today, tomorrow);
  };

  /**
   * Get logs from this week
   * @returns {Array} This week's import logs
   */
  const getThisWeeksImports = () => {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
    weekStart.setHours(0, 0, 0, 0);
    
    return getImportLogsByDateRange(weekStart, today);
  };

  /**
   * Get logs from this month
   * @returns {Array} This month's import logs
   */
  const getThisMonthsImports = () => {
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    
    return getImportLogsByDateRange(monthStart, today);
  };

  /**
   * Clear all import logs (use with caution!)
   * @returns {number} Number of logs cleared
   */
  const clearAllLogs = () => {
    const logs = loadImportLogs();
    const count = logs.length;
    
    if (count > 0) {
      saveImportLogsToLS([]);
      console.log(`✓ Cleared all ${count} import logs`);
    }
    
    return count;
  };

  /**
   * Export import logs as JSON
   * @returns {string} JSON string of all logs
   */
  const exportLogsAsJSON = () => {
    const logs = loadImportLogs();
    return JSON.stringify(logs, null, 2);
  };

  /**
   * Import logs from JSON (use for backup/restore)
   * @param {string} jsonString - JSON string of logs
   * @returns {number} Number of logs imported
   */
  const importLogsFromJSON = (jsonString) => {
    try {
      const importedLogs = JSON.parse(jsonString);
      
      if (!Array.isArray(importedLogs)) {
        throw new Error('Invalid format: expected array');
      }
      
      const existingLogs = loadImportLogs();
      const mergedLogs = [...importedLogs, ...existingLogs];
      
      // Remove duplicates by ID
      const uniqueLogs = mergedLogs.filter((log, index, self) =>
        index === self.findIndex(l => l.id === log.id)
      );
      
      saveImportLogsToLS(uniqueLogs);
      console.log(`✓ Imported ${importedLogs.length} logs (${uniqueLogs.length} total after merge)`);
      
      return importedLogs.length;
    } catch (error) {
      console.error('Error importing logs:', error);
      throw error;
    }
  };

  // Auto-cleanup on service load (remove logs older than 90 days)
  try {
    cleanupOldLogs(90);
  } catch (error) {
    console.warn('Auto-cleanup failed:', error);
  }

  // Export service
  global.importLogsService = {
    loadImportLogs,
    createImportLog,
    updateImportLog,
    completeImportLog,
    failImportLog,
    getImportLogById,
    getRecentImportLogs,
    getImportLogsByDateRange,
    getImportLogsByStatus,
    getImportLogsByUser,
    cleanupOldLogs,
    getImportStatistics,
    deleteImportLog,
    searchImportLogsByFileName,
    getImportLogsPaginated,
    getSuccessfulImports,
    getFailedImports,
    getImportDuration,
    getTodaysImports,
    getThisWeeksImports,
    getThisMonthsImports,
    clearAllLogs,
    exportLogsAsJSON,
    importLogsFromJSON
  };

  console.log('✓ Import Logs Service loaded');
})(window);
