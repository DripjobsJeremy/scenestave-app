/*
  Donations Service (localStorage)
  Exposes a global `DonationsService` for use in browser environments.

  Storage key: 'showsuite_donations'
*/

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    const api = factory();
    root.DonationsService = api;
    // Provide camelCase alias for compatibility with newer callers
    root.donationsService = api;
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /** @constant {string} */
  const LS_KEY = 'showsuite_donations';

  const DONATION_TYPES = new Set(['monetary', 'in-kind']);
  const RECURRING_TYPES = new Set(['One-Time', 'Monthly', 'Quarterly', 'Annual']);
  const CAMPAIGN_TYPES = new Set(['production', 'general', 'building', 'scholarship', 'custom']);
  const PAYMENT_METHODS = new Set(['Check', 'Cash', 'Credit Card', 'Wire Transfer', 'Online Platform', 'Debit Card', 'PayPal', 'Venmo', 'Bank Transfer']);
  const IN_KIND_CATEGORIES = new Set(['Equipment', 'Services', 'Materials', 'Other']);
  const ACK_METHODS = new Set(['Email', 'Letter', 'Phone Call']);

  // --- Normalizers (defensive) ---
  function normalizeRecurringType(v) {
    if (v == null) return null;
    if (RECURRING_TYPES.has(v)) return v;
    const s = String(v).toLowerCase().replace(/[^a-z]/g, '');
    if (s === 'onetime') return 'One-Time';
    if (s === 'monthly') return 'Monthly';
    if (s === 'quarterly') return 'Quarterly';
    if (s === 'annual' || s === 'annually') return 'Annual';
    return null;
  }

  /**
   * @typedef {Object} Donation
   * @property {string} id
   * @property {string} contactId
   * @property {('monetary'|'in-kind')} donationType
   * @property {number|null} amount
   * @property {string} date - ISO date string YYYY-MM-DD
   * @property {('One-Time'|'Monthly'|'Quarterly'|'Annual')|null} recurringType
   * @property {('production'|'general'|'building'|'scholarship'|'custom')|null} campaignType
   * @property {string|null} campaignId
   * @property {string|null} campaignName
   * @property {('Check'|'Cash'|'Credit Card'|'Wire Transfer'|'Online Platform')|null} paymentMethod
   * @property {string|null} transactionNumber
   * @property {boolean|null} taxDeductible
   * @property {string|null} inKindDescription
   * @property {('Equipment'|'Services'|'Materials'|'Other')|null} inKindCategory
   * @property {number|null} estimatedValue
   * @property {boolean|null} acknowledgmentSent
   * @property {string|null} acknowledgmentDate - ISO date string YYYY-MM-DD
   * @property {('Email'|'Letter'|'Phone Call')|null} acknowledgmentMethod
   * @property {string|null} addedBy
   * @property {string|null} notes
   * @property {string} createdAt - ISO datetime
   * @property {string} updatedAt - ISO datetime
   */

  /**
   * Safely parse JSON from localStorage.
   * @param {string} key
   * @returns {any}
   */
  function safeParseLS(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (_) {
      return null;
    }
  }

  /**
   * Safely stringify JSON to localStorage.
   * @param {string} key
   * @param {any} value
   */
  function safeWriteLS(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  /**
   * Generate a unique donation id.
   * @returns {string}
   */
  function generateId() {
    const rand = Math.random().toString(36).slice(2, 8);
    const now = (typeof performance !== 'undefined' ? performance.now() : Date.now()).toString(36);
    return `donation_${Date.now()}_${now}_${rand}`;
  }

  /**
   * Check if a value is a non-empty string.
   * @param {any} v
   * @returns {boolean}
   */
  function isNonEmptyString(v) {
    return typeof v === 'string' && v.trim().length > 0;
  }

  /**
   * Check if a value is a finite number.
   * @param {any} v
   * @returns {boolean}
   */
  function isNumber(v) {
    return typeof v === 'number' && Number.isFinite(v);
  }

  /**
   * Validate an ISO date (YYYY-MM-DD). Returns true if valid.
   * @param {any} v
   * @returns {boolean}
   */
  function isISODate(v) {
    if (typeof v !== 'string') return false;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
    const d = new Date(v + 'T00:00:00Z');
    return !isNaN(d.getTime());
  }

  /**
   * Validate an ISO datetime string.
   * @param {any} v
   * @returns {boolean}
   */
  function isISODatetime(v) {
    if (typeof v !== 'string') return false;
    const d = new Date(v);
    return !isNaN(d.getTime());
  }

  /**
   * Parse input into Date or null.
   * @param {string|Date|undefined|null} v
   * @returns {Date|null}
   */
  function toDate(v) {
    if (!v) return null;
    if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }

  /**
   * Compute sum amount for a donation (monetary amount or in-kind estimatedValue).
   * @param {Donation} d
   * @returns {number}
   */
  function donationAmount(d) {
    if (d.donationType === 'monetary') return Number(d.amount || 0);
    return Number(d.estimatedValue || 0);
  }

  /**
   * Build a sanitized donation object with only known fields.
   * @param {Partial<Donation>} input
   * @param {Donation|undefined} existing
   * @returns {Donation}
   */
  function sanitizeDonation(input, existing) {
    const base = existing || /** @type {Donation} */({
      id: generateId(),
      contactId: '',
      donationType: 'monetary',

      amount: null,
      date: '',
      recurringType: null,
      campaignType: null,
      campaignId: null,
      campaignName: null,
      paymentMethod: null,
      transactionNumber: null,
      taxDeductible: null,

      inKindDescription: null,
      inKindCategory: null,
      estimatedValue: null,

      acknowledgmentSent: null,
      acknowledgmentDate: null,
      acknowledgmentMethod: null,

      addedBy: null,
      notes: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),

      // Restriction / allocation fields
      restrictionType: null,
      designatedProductionId: null,
      designatedProductionTitle: null,
      restrictionPurpose: null,
      allocations: [],
    });

    const out = /** @type {Donation} */({
      ...base,
      // core
      contactId: input.contactId ?? base.contactId,
      donationType: input.donationType ?? base.donationType,

      // monetary
      amount: input.amount ?? base.amount,
      date: input.date ?? base.date,
      recurringType: input.recurringType ?? base.recurringType,
      campaignType: input.campaignType ?? base.campaignType,
      campaignId: input.campaignId ?? base.campaignId,
      campaignName: input.campaignName ?? base.campaignName,
      paymentMethod: input.paymentMethod ?? base.paymentMethod,
      transactionNumber: input.transactionNumber ?? base.transactionNumber,
      taxDeductible: input.taxDeductible ?? base.taxDeductible,

      // in-kind
      inKindDescription: input.inKindDescription ?? base.inKindDescription,
      inKindCategory: input.inKindCategory ?? base.inKindCategory,
      estimatedValue: input.estimatedValue ?? base.estimatedValue,

      // acknowledgment
      acknowledgmentSent: input.acknowledgmentSent ?? base.acknowledgmentSent,
      acknowledgmentDate: input.acknowledgmentDate ?? base.acknowledgmentDate,
      acknowledgmentMethod: input.acknowledgmentMethod ?? base.acknowledgmentMethod,

      // meta
      addedBy: input.addedBy ?? base.addedBy,
      notes: input.notes ?? base.notes,
      createdAt: existing ? base.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),

      // restriction / allocation
      restrictionType: input.restrictionType ?? base.restrictionType,
      designatedProductionId: input.designatedProductionId ?? base.designatedProductionId,
      designatedProductionTitle: input.designatedProductionTitle ?? base.designatedProductionTitle,
      restrictionPurpose: input.restrictionPurpose ?? base.restrictionPurpose,
      allocations: input.allocations ?? base.allocations ?? [],
    });

    if (out.campaignType === 'production' && !out.campaignName && out.designatedProductionTitle) {
      out.campaignName = out.designatedProductionTitle;
    }

    // Normalize types
    if (out.amount != null) out.amount = Number(out.amount);
    if (out.estimatedValue != null) out.estimatedValue = Number(out.estimatedValue);
    if (typeof out.taxDeductible === 'string') out.taxDeductible = out.taxDeductible === 'true';
    if (typeof out.acknowledgmentSent === 'string') out.acknowledgmentSent = out.acknowledgmentSent === 'true';

    // Defensive normalization for enums
    out.recurringType = normalizeRecurringType(out.recurringType);

    return out;
  }

  /**
   * Validate a donation object. Throws on invalid input.
   * @param {Donation} d
   */
  function validateDonation(d) {
    if (!isNonEmptyString(d.contactId)) throw new Error('contactId is required');
    if (!DONATION_TYPES.has(d.donationType)) throw new Error('donationType must be "monetary" or "in-kind"');
    if (!isISODate(d.date)) throw new Error('date must be an ISO date string (YYYY-MM-DD)');

    if (d.donationType === 'monetary') {
      if (!isNumber(d.amount) || d.amount <= 0) throw new Error('amount must be a positive number for monetary donations');
      if (d.recurringType != null && !RECURRING_TYPES.has(d.recurringType)) throw new Error('recurringType is invalid');
      if (d.campaignType != null && !CAMPAIGN_TYPES.has(d.campaignType)) throw new Error('campaignType is invalid');
      if (d.paymentMethod != null && !PAYMENT_METHODS.has(d.paymentMethod)) throw new Error('paymentMethod is invalid');
      if (d.campaignType === 'production') {
        if (!isNonEmptyString(d.campaignId)) throw new Error('campaignId is required when campaignType is "production"');
      } else if (d.campaignType && d.campaignType !== 'production') {
        if (!isNonEmptyString(d.campaignName)) throw new Error('campaignName is required when campaignType is not "production"');
      }
    } else if (d.donationType === 'in-kind') {
      if (!isNonEmptyString(d.inKindDescription)) throw new Error('inKindDescription is required for in-kind donations');
      if (d.inKindCategory != null && !IN_KIND_CATEGORIES.has(d.inKindCategory)) throw new Error('inKindCategory is invalid');
      if (d.estimatedValue != null && (!isNumber(d.estimatedValue) || d.estimatedValue < 0)) throw new Error('estimatedValue must be a non-negative number');
    }

    if (d.acknowledgmentDate != null && !isISODate(d.acknowledgmentDate)) throw new Error('acknowledgmentDate must be an ISO date string (YYYY-MM-DD)');
    if (d.acknowledgmentMethod != null && !ACK_METHODS.has(d.acknowledgmentMethod)) throw new Error('acknowledgmentMethod is invalid');

    if (!isISODatetime(d.createdAt)) throw new Error('createdAt must be an ISO datetime string');
    if (!isISODatetime(d.updatedAt)) throw new Error('updatedAt must be an ISO datetime string');

    // Restriction type validation
    const RESTRICTION_TYPES = new Set(['unrestricted', 'production-specific', 'restricted']);
    if (d.restrictionType != null && !RESTRICTION_TYPES.has(d.restrictionType)) {
      throw new Error('Invalid restriction type. Must be unrestricted, production-specific, or restricted');
    }
    if (d.restrictionType === 'production-specific' && !isNonEmptyString(d.designatedProductionId)) {
      throw new Error('Production-specific donations require a designatedProductionId');
    }
    if (d.restrictionType === 'restricted' && !isNonEmptyString(d.restrictionPurpose)) {
      throw new Error('Restricted donations require a restrictionPurpose description');
    }
  }

  /**
   * Load all donations from localStorage.
   * @returns {Donation[]}
   */
  function loadDonations() {
    const data = safeParseLS(LS_KEY);
    if (!Array.isArray(data)) return [];
    return data;
  }

  /**
   * Save donations array to localStorage.
   * @param {Donation[]} donations
   */
  function saveDonationsToLS(donations) {
    if (!Array.isArray(donations)) throw new Error('donations must be an array');
    safeWriteLS(LS_KEY, donations);
  }

  /**
   * Get a donation by id.
   * @param {string} id
   * @returns {Donation|null}
   */
  function getDonationById(id) {
    const donations = loadDonations();
    return donations.find(d => d.id === id) || null;
  }

  /**
   * Get donations for a specific contact.
   * @param {string} contactId
   * @returns {Donation[]}
   */
  function getDonationsByContactId(contactId) {
    const donations = loadDonations();
    return donations.filter(d => d.contactId === contactId);
  }

  /**
   * Add a new donation. Generates id and timestamps.
   * @param {Partial<Donation>} donationData
   * @returns {Donation}
   */
  function addDonation(donationData) {
    console.log('💰 donationsService.addDonation called:', donationData);
    const donations = loadDonations();
    const prepared = sanitizeDonation(donationData || {});
    prepared.id = generateId();
    prepared.createdAt = new Date().toISOString();
    prepared.updatedAt = prepared.createdAt;
    validateDonation(prepared);
    donations.push(prepared);
    saveDonationsToLS(donations);
    console.log('   - Total donations after add:', donations.length);
    console.log('   ✅ Saved to localStorage successfully');
    return prepared;
  }

  /**
   * Update an existing donation by id.
   * @param {string} id
   * @param {Partial<Donation>} donationData
   * @returns {Donation}
   */
  function updateDonation(id, donationData) {
    const donations = loadDonations();
    const idx = donations.findIndex(d => d.id === id);
    if (idx === -1) throw new Error('Donation not found');
    const existing = donations[idx];
    const merged = sanitizeDonation({ ...existing, ...donationData, id: existing.id, createdAt: existing.createdAt }, existing);
    merged.updatedAt = new Date().toISOString();
    validateDonation(merged);
    donations[idx] = merged;
    saveDonationsToLS(donations);
    return merged;
  }

  /**
   * Delete a donation by id.
   * @param {string} id
   * @returns {boolean} true if deleted
   */
  function deleteDonation(id) {
    const donations = loadDonations();
    const before = donations.length;
    const next = donations.filter(d => d.id !== id);
    if (next.length === before) return false;
    saveDonationsToLS(next);
    return true;
  }

  /**
   * Get most recent donations sorted by donation date (desc).
   * @param {number} [limit=10]
   * @returns {Donation[]}
   */
  function getRecentDonations(limit = 10) {
    const donations = loadDonations();
    const sorted = donations.slice().sort((a, b) => {
      const da = toDate(a.date) || toDate(a.createdAt) || new Date(0);
      const db = toDate(b.date) || toDate(b.createdAt) || new Date(0);
      return db.getTime() - da.getTime();
    });
    return sorted.slice(0, limit);
  }

  /**
   * Filter donations by inclusive date range on donation date.
   * @param {string|Date} startDate - inclusive
   * @param {string|Date} endDate - inclusive
   * @returns {Donation[]}
   */
  function getDonationsByDateRange(startDate, endDate) {
    const s = toDate(startDate);
    const e = toDate(endDate);
    if (!s || !e) throw new Error('startDate and endDate must be valid dates');
    const startMs = new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate(), 0, 0, 0)).getTime();
    const endMs = new Date(Date.UTC(e.getUTCFullYear(), e.getUTCMonth(), e.getUTCDate(), 23, 59, 59, 999)).getTime();
    const donations = loadDonations();
    return donations.filter(d => {
      if (!isISODate(d.date)) return false;
      const ms = new Date(d.date + 'T12:00:00Z').getTime(); // noon UTC to avoid TZ edge cases
      return ms >= startMs && ms <= endMs;
    });
  }

  /**
   * Compute donation statistics. Amount combines monetary amounts and in-kind estimated values.
   * Fiscal year defaults to calendar year (Jan 1). Returns counts and amounts.
   * @returns {{ last30Days: {count:number, amount:number}, thisQuarter: {count:number, amount:number}, fiscalYear: {count:number, amount:number}, totalDonations: {count:number, amount:number} }}
   */
  function getDonationStats() {
    const donations = loadDonations();
    const now = new Date();

    const last30Start = new Date(now);
    last30Start.setDate(last30Start.getDate() - 30);

    const month = now.getMonth(); // 0-11
    const quarterStartMonth = Math.floor(month / 3) * 3; // 0,3,6,9
    const quarterStart = new Date(Date.UTC(now.getUTCFullYear(), quarterStartMonth, 1, 0, 0, 0));

    // Fiscal year start: Jan 1 (calendar year)
    const fyStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1, 0, 0, 0));

    const inRange = (d, start, end) => {
      if (!isISODate(d.date)) return false;
      const ms = new Date(d.date + 'T12:00:00Z').getTime();
      return ms >= start.getTime() && ms <= end.getTime();
    };

    const total = donations.reduce((acc, d) => {
      acc.count += 1;
      acc.amount += donationAmount(d);
      return acc;
    }, { count: 0, amount: 0 });

    const last30 = donations.reduce((acc, d) => {
      if (inRange(d, last30Start, now)) {
        acc.count += 1;
        acc.amount += donationAmount(d);
      }
      return acc;
    }, { count: 0, amount: 0 });

    const qtr = donations.reduce((acc, d) => {
      if (inRange(d, quarterStart, now)) {
        acc.count += 1;
        acc.amount += donationAmount(d);
      }
      return acc;
    }, { count: 0, amount: 0 });

    const fy = donations.reduce((acc, d) => {
      if (inRange(d, fyStart, now)) {
        acc.count += 1;
        acc.amount += donationAmount(d);
      }
      return acc;
    }, { count: 0, amount: 0 });

    return {
      last30Days: last30,
      thisQuarter: qtr,
      fiscalYear: fy,
      totalDonations: total,
    };
  }

  // -------------------------------------------------------------------------
  // Allocation functions
  // -------------------------------------------------------------------------

  function allocateDonationToProduction(donationId, productionId, amount) {
    const donations = loadDonations();
    const idx = donations.findIndex(d => d.id === donationId);
    if (idx === -1) throw new Error('Donation not found');
    const donation = donations[idx];

    if (donation.restrictionType === 'restricted') {
      throw new Error('Restricted donations cannot be allocated to productions. They must be used for: ' + donation.restrictionPurpose);
    }
    if (donation.restrictionType === 'production-specific' && donation.designatedProductionId !== productionId) {
      throw new Error('This donation is designated for a different production');
    }

    const alreadyAllocated = (donation.allocations || []).reduce((sum, a) => sum + a.amount, 0);
    const available = parseFloat(donation.amount) - alreadyAllocated;
    if (amount > available) {
      throw new Error('Only $' + available.toFixed(2) + ' available. Already allocated: $' + alreadyAllocated.toFixed(2));
    }

    if (!donation.allocations) donation.allocations = [];
    const allocation = {
      id: 'alloc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      productionId: productionId,
      amount: parseFloat(amount),
      allocatedAt: new Date().toISOString(),
      allocatedBy: 'admin'
    };
    donation.allocations.push(allocation);
    saveDonationsToLS(donations);

    if (window.budgetService) {
      const budget = window.budgetService.getProductionBudget(productionId);
      const currentDonations = budget.revenue.donations || 0;
      window.budgetService.updateProductionBudget(productionId, {
        revenue: { ...budget.revenue, donations: currentDonations + parseFloat(amount) }
      });
    }

    return donations[idx];
  }

  function removeAllocation(donationId, allocationId) {
    const donations = loadDonations();
    const idx = donations.findIndex(d => d.id === donationId);
    if (idx === -1 || !donations[idx].allocations) throw new Error('Donation or allocation not found');

    const allocation = donations[idx].allocations.find(a => a.id === allocationId);
    if (!allocation) throw new Error('Allocation not found');

    if (window.budgetService) {
      const budget = window.budgetService.getProductionBudget(allocation.productionId);
      const currentDonations = budget.revenue.donations || 0;
      window.budgetService.updateProductionBudget(allocation.productionId, {
        revenue: { ...budget.revenue, donations: Math.max(0, currentDonations - allocation.amount) }
      });
    }

    donations[idx].allocations = donations[idx].allocations.filter(a => a.id !== allocationId);
    saveDonationsToLS(donations);
    return donations[idx];
  }

  function getDonationAvailableAmount(donationId) {
    const donations = loadDonations();
    const donation = donations.find(d => d.id === donationId);
    if (!donation) return 0;
    const alreadyAllocated = (donation.allocations || []).reduce((sum, a) => sum + a.amount, 0);
    return parseFloat(donation.amount) - alreadyAllocated;
  }

  function getUnallocatedDonations() {
    const donations = loadDonations();

    console.log('🔍 getUnallocatedDonations: total donations:', donations.length);

    return donations
      .filter(d => {
        // Exclude restricted donations - they can never be allocated to productions
        if (d.restrictionType === 'restricted') {
          console.log('❌ Excluding restricted:', d.id, d.restrictionPurpose);
          return false;
        }

        const alreadyAllocated = (d.allocations || []).reduce((sum, a) => sum + a.amount, 0);
        const available = parseFloat(d.amount) - alreadyAllocated;

        console.log('💰 Donation:', d.id, 'Type:', d.restrictionType || 'unrestricted', 'Available:', available);

        return available > 0;
      })
      .map(d => {
        const alreadyAllocated = (d.allocations || []).reduce((sum, a) => sum + a.amount, 0);
        return { ...d, availableAmount: parseFloat(d.amount) - alreadyAllocated, allocatedAmount: alreadyAllocated };
      });
  }

  function getProductionAllocations(productionId) {
    const donations = loadDonations();
    const result = [];
    donations.forEach(donation => {
      if (donation.allocations) {
        donation.allocations
          .filter(a => a.productionId === productionId)
          .forEach(allocation => {
            result.push({
              ...allocation,
              donationId: donation.id,
              donorId: donation.contactId,
              donationDate: donation.date,
              donationAmount: donation.amount,
              restrictionType: donation.restrictionType
            });
          });
      }
    });
    return result;
  }

  function getRestrictedFundsSummary() {
    const donations = loadDonations();
    const summary = {};
    donations
      .filter(d => d.restrictionType === 'restricted')
      .forEach(donation => {
        const purpose = donation.restrictionPurpose || 'Unspecified';
        if (!summary[purpose]) {
          summary[purpose] = { purpose, totalAmount: 0, donationCount: 0, donations: [] };
        }
        summary[purpose].totalAmount += parseFloat(donation.amount);
        summary[purpose].donationCount += 1;
        summary[purpose].donations.push({
          id: donation.id, amount: donation.amount, date: donation.date, donorId: donation.contactId
        });
      });
    return Object.values(summary);
  }

  // createDonation alias for backward compat
  const createDonation = addDonation;

  return {
    // Storage
    loadDonations,
    saveDonationsToLS,

    // Queries
    getDonationById,
    getDonationsByContactId,
    getRecentDonations,
    getDonationsByDateRange,
    getDonationStats,

    // Mutations
    addDonation,
    createDonation,
    updateDonation,
    deleteDonation,

    // Allocation
    allocateDonationToProduction,
    removeAllocation,
    getDonationAvailableAmount,
    getUnallocatedDonations,
    getProductionAllocations,
    getRestrictedFundsSummary,
  };
});
