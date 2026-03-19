/**
 * CSV Mapper Utility
 * Provides intelligent auto-mapping of CSV headers to SceneStave fields using fuzzy matching,
 * data transformation helpers, and validation utilities for import.
 */
(function (global) {
  'use strict';

  // Alias validations utility
  const validations = global.ValidationService || {};

  /**
   * Normalize string for comparison
   * @param {string} str
   * @returns {string}
   */
  const normalizeString = (str) => {
    return String(str || '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .trim();
  };

  /**
   * Field definitions with common variations
   * @returns {Array<{key:string, variations:string[]}>}
   */
  const getFieldDefinitions = () => {
    return [
      { key: 'firstName', variations: ['firstname', 'first', 'fname', 'givenname', 'forename'] },
      { key: 'lastName', variations: ['lastname', 'last', 'lname', 'surname', 'familyname'] },
      { key: 'email', variations: ['email', 'emailaddress', 'mail', 'e-mail'] },
      { key: 'phone', variations: ['phone', 'phonenumber', 'telephone', 'tel', 'mobile', 'cell'] },
      { key: 'street', variations: ['street', 'address', 'streetaddress', 'address1', 'addressline1'] },
      { key: 'city', variations: ['city', 'town', 'municipality'] },
      { key: 'state', variations: ['state', 'province', 'region', 'st'] },
      { key: 'zip', variations: ['zip', 'zipcode', 'postalcode', 'postcode', 'postal'] },
      { key: 'amount', variations: ['amount', 'donationamount', 'giftamount', 'donation', 'gift', 'value', 'total'] },
      { key: 'date', variations: ['date', 'donationdate', 'giftdate', 'dateofgift', 'transactiondate'] },
      { key: 'recurringType', variations: ['recurring', 'type', 'donationtype', 'gifttype', 'frequency', 'recurrence'] },
      { key: 'campaignName', variations: ['campaign', 'fund', 'campaignname', 'fundname', 'designation', 'purpose'] },
      { key: 'paymentMethod', variations: ['paymentmethod', 'payment', 'method', 'paymenttype', 'howpaid'] },
      { key: 'transactionNumber', variations: ['transactionnumber', 'transaction', 'checknumber', 'check', 'reference', 'refnumber'] },
      { key: 'notes', variations: ['notes', 'note', 'comments', 'comment', 'memo', 'remarks'] }
    ];
  };

  /**
   * Calculate Levenshtein distance between two strings
   * @param {string} str1
   * @param {string} str2
   * @returns {number}
   */
  const levenshteinDistance = (str1, str2) => {
    const a = String(str1 || '');
    const b = String(str2 || '');

    const matrix = [];
    const n = b.length;
    const m = a.length;

    for (let i = 0; i <= n; i++) matrix[i] = [i];
    for (let j = 0; j <= m; j++) matrix[0][j] = j;

    for (let i = 1; i <= n; i++) {
      for (let j = 1; j <= m; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }

    return matrix[n][m];
  };

  /**
   * Calculate string similarity using Levenshtein distance
   * Returns score between 0 and 1
   * @param {string} str1
   * @param {string} str2
   * @returns {number}
   */
  const calculateSimilarity = (str1, str2) => {
    const longer = (str1 || '').length >= (str2 || '').length ? (str1 || '') : (str2 || '');
    const shorter = longer === (str1 || '') ? (str2 || '') : (str1 || '');
    if (longer.length === 0) return 1.0;
    const distance = levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  };

  /**
   * Find exact match
   * @param {string} normalizedHeader
   * @param {Array} fieldDefs
   * @returns {string|null}
   */
  const findExactMatch = (normalizedHeader, fieldDefs) => {
    for (const field of fieldDefs) {
      const normalizedVariations = field.variations.map(v => normalizeString(v));
      if (normalizedVariations.includes(normalizedHeader)) return field.key;
    }
    return null;
  };

  /**
   * Find fuzzy match using similarity
   * @param {string} normalizedHeader
   * @param {Array} fieldDefs
   * @returns {string|null}
   */
  const findFuzzyMatch = (normalizedHeader, fieldDefs) => {
    let bestMatch = null;
    let bestScore = 0;
    const threshold = 0.7;
    for (const field of fieldDefs) {
      for (const variation of field.variations) {
        const normalizedVariation = normalizeString(variation);
        const score = calculateSimilarity(normalizedHeader, normalizedVariation);
        if (score > bestScore && score >= threshold) {
          bestScore = score;
          bestMatch = field.key;
        }
      }
    }
    return bestMatch;
  };

  /**
   * Automatically maps CSV headers to target fields using fuzzy matching
   * @param {Array<string>} csvHeaders
   * @returns {Object<string,string>} mapping
   */
  const autoMapFields = (csvHeaders) => {
    const mapping = {};
    const fieldDefs = getFieldDefinitions();

    (csvHeaders || []).forEach(csvHeader => {
      const normalizedHeader = normalizeString(csvHeader);
      let matchedField = findExactMatch(normalizedHeader, fieldDefs);
      if (!matchedField) matchedField = findFuzzyMatch(normalizedHeader, fieldDefs);
      mapping[csvHeader] = matchedField || 'skip';
    });

    return mapping;
  };

  /**
   * Parse flexible date formats to ISO (YYYY-MM-DD) or null
   * @param {string} dateString
   * @returns {string|null}
   */
  const parseFlexibleDate = (dateString) => {
    if (!dateString) return null;
    const str = String(dateString).trim();

    // ISO
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

    // US MM/DD/YYYY
    let m;
    m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) {
      const month = m[1].padStart(2, '0');
      const day = m[2].padStart(2, '0');
      const year = m[3];
      return `${year}-${month}-${day}`;
    }

    // Common text formats
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0];

    return null;
  };

  /**
   * Normalize recurring type variations
   * @param {string} value
   * @returns {string}
   */
  const normalizeRecurringType = (value) => {
    if (!value) return 'One-Time';
    const normalized = String(value).toLowerCase().trim();
    const mappings = {
      'onetime': 'One-Time', 'one-time': 'One-Time', 'once': 'One-Time', 'single': 'One-Time',
      'monthly': 'Monthly', 'month': 'Monthly',
      'quarterly': 'Quarterly', 'quarter': 'Quarterly',
      'annual': 'Annual', 'annually': 'Annual', 'yearly': 'Annual', 'year': 'Annual'
    };
    return mappings[normalized] || 'One-Time';
  };

  /**
   * Transform raw CSV data to SceneStave format using field mapping
   * @param {Array<Object>} csvData
   * @param {Object<string,string>} fieldMapping
   * @returns {Array}
   */
  const transformData = (csvData, fieldMapping) => {
    const result = (csvData || []).map((row, index) => {
      const transformed = { rowNumber: index + 1, contact: {}, donation: {}, rawData: row };

      Object.entries(fieldMapping || {}).forEach(([csvColumn, targetField]) => {
        if (!targetField || targetField === 'skip') return;
        const rawVal = row[csvColumn];
        if (rawVal === undefined || rawVal === null || String(rawVal).trim() === '') return;
        const value = String(rawVal);

        const contactKeys = ['firstName', 'lastName', 'email', 'phone', 'street', 'city', 'state', 'zip'];
        const donationKeys = ['amount', 'date', 'recurringType', 'campaignName', 'paymentMethod', 'transactionNumber', 'notes'];

        if (contactKeys.includes(targetField)) {
          switch (targetField) {
            case 'email':
              transformed.contact.email = value.trim().toLowerCase();
              break;
            case 'phone':
              transformed.contact.phone = (validations.sanitizePhone ? validations.sanitizePhone(value) : value);
              break;
            case 'state':
              transformed.contact.state = value.trim().toUpperCase();
              break;
            default:
              transformed.contact[targetField] = value.trim();
          }
        } else if (donationKeys.includes(targetField)) {
          switch (targetField) {
            case 'amount':
              transformed.donation.amount = (validations.parseCurrency ? validations.parseCurrency(value) : parseFloat(value.replace(/[$,\s]/g, '')) || 0);
              break;
            case 'date':
              transformed.donation.date = parseFlexibleDate(value);
              break;
            case 'recurringType':
              transformed.donation.recurringType = normalizeRecurringType(value);
              break;
            default:
              transformed.donation[targetField] = value.trim();
          }
        }
      });

      return transformed;
    });

    return result;
  };

  /**
   * Validate transformed data rows
   * @param {Array} transformedData
   * @returns {{ valid: Array, invalid: Array }}
   */
  const validateTransformedData = (transformedData) => {
    const valid = [];
    const invalid = [];

    (transformedData || []).forEach(row => {
      const errors = [];

      // Required contact fields
      if (!row.contact.firstName || row.contact.firstName.trim().length < 2) errors.push('First name is required (min 2 characters)');
      if (!row.contact.lastName || row.contact.lastName.trim().length < 2) errors.push('Last name is required (min 2 characters)');

      // Donation checks
      if (row.donation.amount === undefined || row.donation.amount === null || Number(row.donation.amount) <= 0) errors.push('Donation amount is required and must be positive');
      if (!row.donation.date) {
        errors.push('Donation date is required');
      } else {
        const donationDate = new Date(row.donation.date);
        const today = new Date();
        if (donationDate > today) errors.push('Donation date cannot be in the future');
      }

      // Email format if present
      if (row.contact.email && typeof validations.isValidEmail === 'function' && !validations.isValidEmail(row.contact.email)) {
        errors.push('Invalid email format');
      }

      if (errors.length === 0) valid.push(row); else invalid.push({ ...row, errors });
    });

    return { valid, invalid };
  };

  // Export
  global.csvMapper = {
    autoMapFields,
    transformData,
    validateTransformedData,
    parseFlexibleDate,
    normalizeRecurringType,
    // expose internals for testing/debugging
    _utils: {
      normalizeString,
      getFieldDefinitions,
      findExactMatch,
      findFuzzyMatch,
      calculateSimilarity,
      levenshteinDistance
    }
  };

  console.log('✓ CSV Mapper utility loaded');
})(window);
