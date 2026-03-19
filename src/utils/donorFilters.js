/**
 * Donor Filtering & Search Utilities
 * 
 * Client-side filtering and analysis functions for donor data.
 * All functions are pure - they don't modify input arrays.
 * 
 * @module donorFilters
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.DonorFilters = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // -------- Utilities --------

  /**
   * Safely get a nested property from an object.
   */
  function getNestedValue(obj, path) {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
  }

  /**
   * Parse date string to Date object.
   */
  function parseDate(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  }

  /**
   * Check if date falls within range (inclusive).
   */
  function dateInRange(dateStr, startDate, endDate) {
    const date = parseDate(dateStr);
    if (!date) return false;
    
    const start = startDate ? parseDate(startDate) : null;
    const end = endDate ? parseDate(endDate) : null;
    
    if (start && date < start) return false;
    if (end && date > end) return false;
    
    return true;
  }

  /**
   * Get months difference between two dates.
   */
  function monthsDiff(dateStr1, dateStr2) {
    const d1 = parseDate(dateStr1);
    const d2 = parseDate(dateStr2);
    if (!d1 || !d2) return null;
    
    const yearDiff = d2.getFullYear() - d1.getFullYear();
    const monthDiff = d2.getMonth() - d1.getMonth();
    return yearDiff * 12 + monthDiff;
  }

  // -------- Filter Functions --------

  /**
   * Filter donors by donor level.
   * 
   * @param {Array} contacts - Array of contact objects
   * @param {string} levelId - Donor level ID to filter by
   * @returns {Array} Filtered contacts
   * 
   * @example
   * const patrons = filterDonorsByLevel(donors, 'level_patron');
   */
  function filterDonorsByLevel(contacts, levelId) {
    if (!Array.isArray(contacts) || !levelId) return [];
    return contacts.filter(c => 
      c.isDonor && 
      c.donorProfile?.donorLevelId === levelId
    );
  }

  /**
   * Filter donors whose last donation falls within date range.
   * 
   * @param {Array} contacts - Array of contact objects
   * @param {string} startDate - Start date (ISO format YYYY-MM-DD)
   * @param {string} endDate - End date (ISO format YYYY-MM-DD)
   * @returns {Array} Filtered contacts
   * 
   * @example
   * // Q4 2024 donors
   * const q4Donors = filterDonorsByDateRange(donors, '2024-10-01', '2024-12-31');
   */
  function filterDonorsByDateRange(contacts, startDate, endDate) {
    if (!Array.isArray(contacts)) return [];
    return contacts.filter(c => 
      c.isDonor && 
      dateInRange(c.donorProfile?.lastDonationDate, startDate, endDate)
    );
  }

  /**
   * Search donors by text query.
   * Searches firstName, lastName, email, and donor notes.
   * 
   * @param {Array} contacts - Array of contact objects
   * @param {string} searchTerm - Search query (case-insensitive)
   * @returns {Array} Matching contacts
   * 
   * @example
   * const results = searchDonors(donors, 'smith');
   */
  function searchDonors(contacts, searchTerm) {
    if (!Array.isArray(contacts) || !searchTerm) return contacts;
    
    const term = String(searchTerm).toLowerCase().trim();
    if (!term) return contacts;
    
    return contacts.filter(c => {
      if (!c.isDonor) return false;
      
      const fields = [
        c.firstName,
        c.lastName,
        c.email,
        c.donorProfile?.notes,
        c.notes,
      ];
      
      return fields.some(field => 
        field && String(field).toLowerCase().includes(term)
      );
    });
  }

  /**
   * Sort donors by lifetime giving amount.
   * 
   * @param {Array} contacts - Array of contact objects
   * @param {string} order - Sort order: 'asc' or 'desc' (default: 'desc')
   * @returns {Array} Sorted contacts (new array)
   * 
   * @example
   * const topGivers = sortDonorsByLifetimeGiving(donors, 'desc');
   * const smallestGivers = sortDonorsByLifetimeGiving(donors, 'asc');
   */
  function sortDonorsByLifetimeGiving(contacts, order = 'desc') {
    if (!Array.isArray(contacts)) return [];
    
    const sorted = contacts.slice().sort((a, b) => {
      const amountA = a.donorProfile?.lifetimeTotal || 0;
      const amountB = b.donorProfile?.lifetimeTotal || 0;
      return order === 'asc' ? amountA - amountB : amountB - amountA;
    });
    
    return sorted;
  }

  /**
   * Get top N donors by lifetime giving.
   * 
   * @param {Array} contacts - Array of contact objects
   * @param {number} limit - Number of top donors to return (default: 10)
   * @returns {Array} Top donors
   * 
   * @example
   * const topTen = getTopDonors(donors, 10);
   */
  function getTopDonors(contacts, limit = 10) {
    const sorted = sortDonorsByLifetimeGiving(contacts, 'desc');
    return sorted.slice(0, limit);
  }

  /**
   * Filter donors who have a specific tag.
   * 
   * @param {Array} contacts - Array of contact objects
   * @param {string} tag - Tag to filter by (case-insensitive)
   * @returns {Array} Filtered contacts
   * 
   * @example
   * // Find donors who are also board members
   * const boardDonors = filterDonorsByTag(donors, 'Board Member');
   */
  function filterDonorsByTag(contacts, tag) {
    if (!Array.isArray(contacts) || !tag) return [];
    
    const searchTag = String(tag).toLowerCase().trim();
    
    return contacts.filter(c => 
      c.isDonor && 
      Array.isArray(c.tags) && 
      c.tags.some(t => String(t).toLowerCase() === searchTag)
    );
  }

  /**
   * Get unique donor contact IDs who contributed to a specific production.
   * Returns contactIds that can be used to look up full contact records.
   * 
   * @param {Array} donations - Array of donation objects
   * @param {string} productionId - Production ID to filter by
   * @returns {Array<string>} Array of unique contact IDs
   * 
   * @example
   * const donorIds = getDonorsByProduction(donations, 'production_123');
   * const donors = donorIds.map(id => getContactById(id));
   */
  function getDonorsByProduction(donations, productionId) {
    if (!Array.isArray(donations) || !productionId) return [];
    
    const contactIds = new Set();
    
    for (const donation of donations) {
      // Production campaigns have campaignType === 'production' and campaignId matches
      if (donation.campaignType === 'production' && donation.campaignId === productionId) {
        contactIds.add(donation.contactId);
      }
    }
    
    return Array.from(contactIds);
  }

  /**
   * Get donor statistics grouped by level.
   * Requires access to donor levels data.
   * 
   * @param {Array} contacts - Array of contact objects (optional, will load from service if not provided)
   * @returns {Object} Stats by level name: { "Friend": 15, "Patron": 8, ... }
   * 
   * @example
   * const stats = getDonorStatsByLevel();
   * // { "Friend": 15, "Supporter": 12, "Patron": 8, ... }
   */
  function getDonorStatsByLevel(contacts) {
    // Load contacts if not provided
    let donors = contacts;
    if (!Array.isArray(donors)) {
      const svc = (typeof window !== 'undefined' ? window.ContactsService : undefined);
      if (!svc) return {};
      donors = svc.getDonorContacts();
    }
    
    // Load donor levels to get names
    const levelsSvc = (typeof window !== 'undefined' ? window.DonorLevelsService : undefined);
    const levels = levelsSvc ? levelsSvc.loadDonorLevels() : [];
    const levelMap = levels.reduce((map, level) => {
      map[level.id] = level.name;
      return map;
    }, {});
    
    // Count by level
    const stats = {};
    for (const donor of donors) {
      if (!donor.isDonor) continue;
      const levelId = donor.donorProfile?.donorLevelId || 'none';
      const levelName = levelMap[levelId] || 'Unassigned';
      stats[levelName] = (stats[levelName] || 0) + 1;
    }
    
    return stats;
  }

  /**
   * Calculate donor retention rate (year-over-year).
   * Compares donors who gave in both current and previous year.
   * 
   * @param {Array} donations - Array of donation objects
   * @returns {Object} Retention stats: { rate, retained, currentYear, previousYear, total }
   * 
   * @example
   * const retention = calculateRetentionRate(donations);
   * // { rate: 65.5, retained: 42, currentYear: 58, previousYear: 64, total: 80 }
   */
  function calculateRetentionRate(donations) {
    if (!Array.isArray(donations) || donations.length === 0) {
      return { rate: 0, retained: 0, currentYear: 0, previousYear: 0, total: 0 };
    }
    
    const now = new Date();
    const currentYear = now.getFullYear();
    const previousYear = currentYear - 1;
    
    const currentYearDonors = new Set();
    const previousYearDonors = new Set();
    
    for (const donation of donations) {
      if (!donation.date) continue;
      const year = new Date(donation.date).getFullYear();
      
      if (year === currentYear) {
        currentYearDonors.add(donation.contactId);
      } else if (year === previousYear) {
        previousYearDonors.add(donation.contactId);
      }
    }
    
    // Find donors who gave in both years
    const retained = Array.from(previousYearDonors).filter(id => 
      currentYearDonors.has(id)
    ).length;
    
    // Calculate rate based on previous year donors
    const rate = previousYearDonors.size > 0 
      ? Number(((retained / previousYearDonors.size) * 100).toFixed(1))
      : 0;
    
    // Total unique donors across both years
    const allDonors = new Set([...currentYearDonors, ...previousYearDonors]);
    
    return {
      rate,
      retained,
      currentYear: currentYearDonors.size,
      previousYear: previousYearDonors.size,
      total: allDonors.size,
    };
  }

  /**
   * Find donors who haven't given in X months (inactive/lapsed donors).
   * Useful for re-engagement campaigns.
   * 
   * @param {Array} contacts - Array of contact objects
   * @param {number} monthsThreshold - Months since last donation (default: 12)
   * @returns {Array} Inactive donors
   * 
   * @example
   * // Find donors who haven't given in 18 months
   * const lapsed = getInactiveDonors(donors, 18);
   */
  function getInactiveDonors(contacts, monthsThreshold = 12) {
    if (!Array.isArray(contacts)) return [];
    
    const now = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    return contacts.filter(c => {
      if (!c.isDonor) return false;
      
      const lastDate = c.donorProfile?.lastDonationDate;
      if (!lastDate) return true; // No donation date = inactive
      
      const months = monthsDiff(lastDate, now);
      return months !== null && months >= monthsThreshold;
    });
  }

  /**
   * Get donors who made their first donation within a date range.
   * Useful for tracking new donor acquisition.
   * 
   * @param {Array} contacts - Array of contact objects
   * @param {string} startDate - Start date (ISO format)
   * @param {string} endDate - End date (ISO format)
   * @returns {Array} New donors in range
   * 
   * @example
   * const newDonors2024 = getNewDonorsByDateRange(donors, '2024-01-01', '2024-12-31');
   */
  function getNewDonorsByDateRange(contacts, startDate, endDate) {
    if (!Array.isArray(contacts)) return [];
    return contacts.filter(c => 
      c.isDonor && 
      dateInRange(c.donorProfile?.firstDonationDate, startDate, endDate)
    );
  }

  /**
   * Filter donors by minimum lifetime giving amount.
   * 
   * @param {Array} contacts - Array of contact objects
   * @param {number} minAmount - Minimum lifetime total
   * @returns {Array} Filtered contacts
   * 
   * @example
   * const majorDonors = filterDonorsByMinAmount(donors, 5000);
   */
  function filterDonorsByMinAmount(contacts, minAmount) {
    if (!Array.isArray(contacts) || typeof minAmount !== 'number') return [];
    return contacts.filter(c => 
      c.isDonor && 
      (c.donorProfile?.lifetimeTotal || 0) >= minAmount
    );
  }

  /**
   * Group donors by a custom field.
   * 
   * @param {Array} contacts - Array of contact objects
   * @param {string} fieldPath - Dot-notation path to field (e.g., 'address.state')
   * @returns {Object} Grouped contacts: { [fieldValue]: [contacts...] }
   * 
   * @example
   * const byState = groupDonorsBy(donors, 'address.state');
   * // { 'CA': [...], 'NY': [...], ... }
   */
  function groupDonorsBy(contacts, fieldPath) {
    if (!Array.isArray(contacts) || !fieldPath) return {};
    
    const grouped = {};
    
    for (const contact of contacts) {
      if (!contact.isDonor) continue;
      
      const value = getNestedValue(contact, fieldPath);
      const key = value !== undefined && value !== null ? String(value) : 'Unknown';
      
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(contact);
    }
    
    return grouped;
  }

  /**
   * Calculate average gift size for a group of donors.
   * 
   * @param {Array} contacts - Array of contact objects
   * @returns {number} Average lifetime gift amount
   * 
   * @example
   * const avgGift = calculateAverageGift(donors);
   */
  function calculateAverageGift(contacts) {
    if (!Array.isArray(contacts) || contacts.length === 0) return 0;
    
    const donors = contacts.filter(c => c.isDonor);
    if (donors.length === 0) return 0;
    
    const total = donors.reduce((sum, c) => 
      sum + (c.donorProfile?.lifetimeTotal || 0), 0
    );
    
    return Number((total / donors.length).toFixed(2));
  }

  // -------- Public API --------
  return {
    // Filtering
    filterDonorsByLevel,
    filterDonorsByDateRange,
    filterDonorsByTag,
    filterDonorsByMinAmount,
    
    // Searching
    searchDonors,
    
    // Sorting
    sortDonorsByLifetimeGiving,
    getTopDonors,
    
    // Queries
    getDonorsByProduction,
    getInactiveDonors,
    getNewDonorsByDateRange,
    
    // Statistics
    getDonorStatsByLevel,
    calculateRetentionRate,
    calculateAverageGift,
    
    // Grouping
    groupDonorsBy,
  };
});
