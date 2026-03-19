/**
 * CSV Template Generator Utility
 * Generates downloadable CSV templates with sample data for donor imports
 */

(function (global) {
  'use strict';

  /**
   * Generates CSV template content with sample data
   * @returns {string} CSV content with BOM for Excel compatibility
   */
  const generateCSVTemplate = () => {
    const headers = [
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

    // Instruction row (first data row to guide users)
    const instructionRow = {
      'First Name': '← Required',
      'Last Name': '← Required',
      'Email': '← Optional but recommended',
      'Phone': '← Optional',
      'Street': '← Optional',
      'City': '← Optional',
      'State': '← Optional (2-letter code)',
      'ZIP': '← Optional',
      'Donation Amount': '← Required (numbers only, no $ symbol)',
      'Donation Date': '← Required (YYYY-MM-DD format)',
      'Donation Type': '← Optional (One-Time, Monthly, Quarterly, Annual)',
      'Campaign/Fund': '← Optional (Production name or fund name)',
      'Payment Method': '← Optional',
      'Transaction Number': '← Optional',
      'Notes': '← Optional'
    };

    // Sample data rows with realistic examples
    const sampleRows = [
      {
        'First Name': 'Jane',
        'Last Name': 'Smith',
        'Email': 'jane.smith@example.com',
        'Phone': '(555) 123-4567',
        'Street': '123 Main Street',
        'City': 'Springfield',
        'State': 'IL',
        'ZIP': '62701',
        'Donation Amount': '1000.00',
        'Donation Date': '2025-10-15',
        'Donation Type': 'One-Time',
        'Campaign/Fund': 'General Operating Fund',
        'Payment Method': 'Check',
        'Transaction Number': '1234',
        'Notes': 'Matching gift from employer'
      },
      {
        'First Name': 'John',
        'Last Name': 'Doe',
        'Email': 'john.doe@example.com',
        'Phone': '(555) 234-5678',
        'Street': '456 Oak Avenue',
        'City': 'Springfield',
        'State': 'IL',
        'ZIP': '62702',
        'Donation Amount': '500.00',
        'Donation Date': '2025-09-20',
        'Donation Type': 'Annual',
        'Campaign/Fund': 'Fall Musical 2025',
        'Payment Method': 'Credit Card',
        'Transaction Number': 'CC-5678',
        'Notes': 'Recurring annual donor'
      },
      {
        'First Name': 'Mary',
        'Last Name': 'Johnson',
        'Email': 'mary.j@example.com',
        'Phone': '(555) 345-6789',
        'Street': '789 Elm Street',
        'City': 'Springfield',
        'State': 'IL',
        'ZIP': '62703',
        'Donation Amount': '2500.00',
        'Donation Date': '2025-11-01',
        'Donation Type': 'One-Time',
        'Campaign/Fund': 'Building Renovation Fund',
        'Payment Method': 'Wire Transfer',
        'Transaction Number': 'WT-9012',
        'Notes': 'Capital campaign contribution'
      }
    ];

    // Combine instruction row with sample rows
    const allRows = [instructionRow, ...sampleRows];

    // Convert to CSV using PapaParse
    const Papa = global.Papa || window.Papa;
    if (!Papa) {
      console.error('PapaParse library not loaded');
      // Fallback: simple CSV generation
      const escapeCsvValue = (val) => {
        const str = (val || '').toString();
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
      };
      
      const csvLines = [
        headers.map(escapeCsvValue).join(','),
        ...allRows.map(row => headers.map(h => escapeCsvValue(row[h] || '')).join(','))
      ];
      
      return csvLines.join('\n');
    }

    const csv = Papa.unparse({
      fields: headers,
      data: allRows.map(row => headers.map(h => row[h] || ''))
    });

    return csv;
  };

  /**
   * Triggers browser download of CSV template
   * @param {string} filename - Optional custom filename (defaults to SceneStave_Donor_Import_Template.csv)
   */
  const downloadSampleTemplate = (filename = 'SceneStave_Donor_Import_Template.csv') => {
    try {
      const csvContent = generateCSVTemplate();
      
      // Add BOM (Byte Order Mark) for Excel compatibility with UTF-8
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the URL object
      URL.revokeObjectURL(url);
      
      console.log('✓ CSV template downloaded successfully:', filename);
    } catch (error) {
      console.error('Failed to download CSV template:', error);
      alert('Error downloading template. Please check the console for details.');
    }
  };

  /**
   * Returns field definitions for import mapping
   * Used by the import wizard to map CSV columns to SceneStave fields
   * @returns {Object} Field definitions organized by category
   */
  const getImportFieldDefinitions = () => {
    return {
      contact: [
        { key: 'firstName', label: 'First Name', required: true, type: 'text' },
        { key: 'lastName', label: 'Last Name', required: true, type: 'text' },
        { key: 'email', label: 'Email', required: false, type: 'email' },
        { key: 'phone', label: 'Phone', required: false, type: 'phone' },
        { key: 'street', label: 'Address - Street', required: false, type: 'text' },
        { key: 'city', label: 'Address - City', required: false, type: 'text' },
        { key: 'state', label: 'Address - State', required: false, type: 'text' },
        { key: 'zip', label: 'Address - ZIP', required: false, type: 'text' }
      ],
      donation: [
        { key: 'amount', label: 'Donation - Amount', required: true, type: 'currency' },
        { key: 'date', label: 'Donation - Date', required: true, type: 'date' },
        { 
          key: 'recurringType', 
          label: 'Donation - Type', 
          required: false, 
          type: 'select', 
          options: ['One-Time', 'Monthly', 'Quarterly', 'Annual'] 
        },
        { key: 'campaignName', label: 'Campaign Name', required: false, type: 'text' },
        { 
          key: 'paymentMethod', 
          label: 'Payment Method', 
          required: false, 
          type: 'select', 
          options: ['Check', 'Cash', 'Credit Card', 'Wire Transfer', 'Online Platform'] 
        },
        { key: 'transactionNumber', label: 'Transaction Number', required: false, type: 'text' },
        { key: 'notes', label: 'Donation Notes', required: false, type: 'text' }
      ],
      skip: [
        { key: 'skip', label: '[Skip This Column]', required: false, type: 'skip' }
      ]
    };
  };

  /**
   * Gets all available field options in a flat array
   * Useful for dropdown population in the import wizard
   * @returns {Array} Flat array of all field definitions
   */
  const getAllFieldOptions = () => {
    const definitions = getImportFieldDefinitions();
    return [
      ...definitions.skip,
      ...definitions.contact,
      ...definitions.donation
    ];
  };

  /**
   * Validates a row of data against field definitions
   * @param {Object} row - Single row of CSV data
   * @param {Object} mapping - Column mapping from CSV headers to field keys
   * @returns {Object} { valid: boolean, errors: Array }
   */
  const validateRow = (row, mapping) => {
    const errors = [];
    const definitions = getImportFieldDefinitions();
    const allFields = [...definitions.contact, ...definitions.donation];

    // Check required fields
    allFields.forEach(field => {
      if (field.required) {
        const csvColumn = Object.keys(mapping).find(col => mapping[col] === field.key);
        const value = row[csvColumn];
        
        if (!value || value.trim() === '') {
          errors.push(`Missing required field: ${field.label}`);
        }
      }
    });

    // Validate email format if provided
    const emailColumn = Object.keys(mapping).find(col => mapping[col] === 'email');
    if (emailColumn && row[emailColumn]) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(row[emailColumn])) {
        errors.push(`Invalid email format: ${row[emailColumn]}`);
      }
    }

    // Validate donation amount if provided
    const amountColumn = Object.keys(mapping).find(col => mapping[col] === 'amount');
    if (amountColumn && row[amountColumn]) {
      const amount = parseFloat(row[amountColumn]);
      if (isNaN(amount) || amount < 0) {
        errors.push(`Invalid donation amount: ${row[amountColumn]}`);
      }
    }

    // Validate date format if provided
    const dateColumn = Object.keys(mapping).find(col => mapping[col] === 'date');
    if (dateColumn && row[dateColumn]) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(row[dateColumn])) {
        errors.push(`Invalid date format (use YYYY-MM-DD): ${row[dateColumn]}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors
    };
  };

  // Export to global scope
  global.csvTemplateGenerator = {
    generateCSVTemplate,
    downloadSampleTemplate,
    getImportFieldDefinitions,
    getAllFieldOptions,
    validateRow
  };

  console.log('✓ CSV Template Generator utility loaded');

})(window);
