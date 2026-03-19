/**
 * Error Report Generator Utility
 * Generates downloadable CSV files containing rows that failed validation or import.
 * Helps users identify and correct issues in their import data.
 */
(function (global) {
  'use strict';

  /**
   * Get user-friendly error message
   * @param {string} technicalError
   * @returns {string}
   */
  const getUserFriendlyError = (technicalError) => {
    const errorMap = {
      'First name is required (min 2 characters)': 'Missing or too short first name',
      'Last name is required (min 2 characters)': 'Missing or too short last name',
      'Invalid email format': 'Email address is not valid',
      'Donation amount is required and must be positive': 'Missing or invalid donation amount',
      'Amount must be positive': 'Donation amount must be greater than zero',
      'Donation date cannot be in the future': 'Donation date is in the future',
      'Donation date is required': 'Missing donation date',
      'Invalid date format': 'Date format is not recognized'
    };

    return errorMap[technicalError] || technicalError;
  };

  /**
   * Generate report for validation errors (before import)
   * @param {Array} errors - Array of validation error objects
   * @returns {string} CSV content
   */
  const generateValidationErrorReport = (errors) => {
    const headers = [
      'Row Number',
      'Error Reasons',
      'First Name',
      'Last Name',
      'Email',
      'Phone',
      'Street',
      'City',
      'State',
      'ZIP',
      'Donation Amount',
      'Donation Date',
      'Donation Type',
      'Campaign/Fund',
      'Payment Method',
      'Transaction Number',
      'Notes'
    ];

    const rows = errors.map(error => {
      const rawData = error.rawData || {};
      const contact = error.contact || {};
      const donation = error.donation || {};

      // Try to get values from raw data first (original column names), then transformed data
      return {
        'Row Number': error.rowNumber || '—',
        'Error Reasons': (error.errors || []).map(getUserFriendlyError).join('; '),
        'First Name': rawData['First Name'] || rawData['first name'] || rawData['firstName'] || contact.firstName || '',
        'Last Name': rawData['Last Name'] || rawData['last name'] || rawData['lastName'] || contact.lastName || '',
        'Email': rawData['Email'] || rawData['email'] || contact.email || '',
        'Phone': rawData['Phone'] || rawData['phone'] || contact.phone || '',
        'Street': rawData['Street'] || rawData['street'] || rawData['Address'] || contact.street || '',
        'City': rawData['City'] || rawData['city'] || contact.city || '',
        'State': rawData['State'] || rawData['state'] || contact.state || '',
        'ZIP': rawData['ZIP'] || rawData['zip'] || rawData['Zip Code'] || contact.zip || '',
        'Donation Amount': rawData['Donation Amount'] || rawData['Amount'] || rawData['amount'] || donation.amount || '',
        'Donation Date': rawData['Donation Date'] || rawData['Date'] || rawData['date'] || donation.date || '',
        'Donation Type': rawData['Donation Type'] || rawData['Type'] || rawData['Recurring Type'] || donation.recurringType || '',
        'Campaign/Fund': rawData['Campaign/Fund'] || rawData['Campaign'] || rawData['Fund'] || donation.campaignName || '',
        'Payment Method': rawData['Payment Method'] || rawData['Payment'] || donation.paymentMethod || '',
        'Transaction Number': rawData['Transaction Number'] || rawData['Check Number'] || donation.transactionNumber || '',
        'Notes': rawData['Notes'] || rawData['notes'] || donation.notes || ''
      };
    });

    const Papa = global.Papa || window.Papa;
    if (!Papa) {
      console.error('PapaParse not available');
      return '';
    }

    return Papa.unparse({
      fields: headers,
      data: rows.map(row => headers.map(h => row[h]))
    });
  };

  /**
   * Generate report for import errors (during/after import)
   * @param {Array} errors - Array of import error objects
   * @returns {string} CSV content
   */
  const generateImportErrorReport = (errors) => {
    const headers = [
      'Row Number',
      'Error Message',
      'Contact Name',
      'Email',
      'Donation Amount',
      'Donation Date',
      'Campaign/Fund',
      'Raw Data'
    ];

    const rows = errors.map(error => ({
      'Row Number': error.row || error.rowNumber || '—',
      'Error Message': getUserFriendlyError(error.error || 'Unknown error'),
      'Contact Name': error.data?.contact
        ? `${error.data.contact.firstName || ''} ${error.data.contact.lastName || ''}`.trim()
        : '',
      'Email': error.data?.contact?.email || '',
      'Donation Amount': error.data?.donation?.amount || '',
      'Donation Date': error.data?.donation?.date || '',
      'Campaign/Fund': error.data?.donation?.campaignName || '',
      'Raw Data': JSON.stringify(error.data?.rawData || {})
    }));

    const Papa = global.Papa || window.Papa;
    if (!Papa) {
      console.error('PapaParse not available');
      return '';
    }

    return Papa.unparse({
      fields: headers,
      data: rows.map(row => headers.map(h => row[h]))
    });
  };

  /**
   * Generates error report CSV content
   * @param {Array} errorData - Array of error objects
   * @returns {string} CSV content
   */
  const generateErrorReportCSV = (errorData) => {
    if (!errorData || errorData.length === 0) {
      return '';
    }

    // Determine structure based on error data type
    // Validation errors have 'errors' array, import errors have 'error' string
    const isValidationErrors = errorData[0].hasOwnProperty('errors') && Array.isArray(errorData[0].errors);

    if (isValidationErrors) {
      return generateValidationErrorReport(errorData);
    } else {
      return generateImportErrorReport(errorData);
    }
  };

  /**
   * Download error report as CSV file
   * @param {Array} errorData - Array of error objects
   */
  const downloadErrorReport = (errorData) => {
    if (!errorData || errorData.length === 0) {
      alert('No errors to export');
      return;
    }

    const csvContent = generateErrorReportCSV(errorData);

    if (!csvContent) {
      alert('Unable to generate error report');
      return;
    }

    // Add BOM for Excel UTF-8 compatibility
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().split('T')[0];

    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Import_Errors_${timestamp}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    console.log(`✓ Error report downloaded: ${errorData.length} errors`);
  };

  /**
   * Format errors for display in UI
   * @param {Array} errors - Array of error strings
   * @returns {string} Formatted error message
   */
  const formatErrorsForDisplay = (errors) => {
    if (!errors || errors.length === 0) return '';

    if (errors.length === 1) {
      return getUserFriendlyError(errors[0]);
    }

    return errors.map((err, i) => `${i + 1}. ${getUserFriendlyError(err)}`).join('\n');
  };

  /**
   * Generate user-friendly error summary
   * @param {Array} errorData - Array of error objects
   * @returns {Object} Error summary with categorized counts
   */
  const generateErrorSummary = (errorData) => {
    const summary = {
      total: errorData.length,
      byType: {},
      topErrors: []
    };

    if (!errorData || errorData.length === 0) {
      return summary;
    }

    // Categorize errors
    const errorCounts = {};

    errorData.forEach(error => {
      // Handle both validation errors (errors array) and import errors (error string)
      let errors = [];
      if (error.errors && Array.isArray(error.errors)) {
        errors = error.errors;
      } else if (error.error) {
        errors = [error.error];
      }

      errors.forEach(err => {
        const friendlyError = getUserFriendlyError(err);
        errorCounts[friendlyError] = (errorCounts[friendlyError] || 0) + 1;
      });
    });

    // Sort by frequency and take top 5
    summary.topErrors = Object.entries(errorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([error, count]) => ({ error, count }));

    // Create summary message
    summary.message = summary.topErrors.length > 0
      ? `${summary.total} rows failed. Top issues: ${summary.topErrors.map(e => `${e.error} (${e.count})`).join(', ')}`
      : `${summary.total} rows failed`;

    return summary;
  };

  /**
   * Generate inline error message for a single row
   * @param {Object} error - Single error object
   * @returns {string} Formatted inline error message
   */
  const getInlineErrorMessage = (error) => {
    if (!error) return '';

    if (error.errors && Array.isArray(error.errors)) {
      return error.errors.map(getUserFriendlyError).join(', ');
    }

    if (error.error) {
      return getUserFriendlyError(error.error);
    }

    return 'Unknown error';
  };

  /**
   * Check if errors contain specific type
   * @param {Array} errorData - Array of error objects
   * @param {string} errorType - Type to check for (e.g., 'email', 'amount', 'date')
   * @returns {boolean}
   */
  const hasErrorType = (errorData, errorType) => {
    if (!errorData || errorData.length === 0) return false;

    const typeMap = {
      'email': ['email', 'e-mail'],
      'amount': ['amount', 'donation'],
      'date': ['date'],
      'name': ['first name', 'last name', 'name'],
      'address': ['street', 'city', 'state', 'zip']
    };

    const keywords = typeMap[errorType.toLowerCase()] || [errorType.toLowerCase()];

    return errorData.some(error => {
      const errors = error.errors || [error.error];
      return errors.some(err => 
        keywords.some(keyword => (err || '').toLowerCase().includes(keyword))
      );
    });
  };

  // Export to global scope
  global.errorReportGenerator = {
    generateErrorReportCSV,
    downloadErrorReport,
    formatErrorsForDisplay,
    generateErrorSummary,
    getInlineErrorMessage,
    hasErrorType,
    getUserFriendlyError
  };

  console.log('✓ Error Report Generator utility loaded');
})(window);
