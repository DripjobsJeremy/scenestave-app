/*
  Donor Calculation Service
  Orchestrates donations, donor levels, and contacts to compute donor metrics.
  
  Exposes a global `DonorCalculationService` for browser environments.
*/

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.DonorCalculationService = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // -------- Service references --------
  function getService(name) {
    return (typeof window !== 'undefined' ? window[name] : undefined) || 
           (typeof global !== 'undefined' ? global[name] : undefined);
  }

  function getDonationsService() {
    const svc = getService('DonationsService');
    if (!svc) console.warn('[DonorCalculationService] DonationsService not found');
    return svc;
  }

  function getDonorLevelsService() {
    const svc = getService('DonorLevelsService');
    if (!svc) console.warn('[DonorCalculationService] DonorLevelsService not found');
    return svc;
  }

  function getContactsService() {
    const svc = getService('ContactsService');
    if (!svc) console.warn('[DonorCalculationService] ContactsService not found');
    return svc;
  }

  // -------- Utilities --------
  function isNonEmptyString(v) {
    return typeof v === 'string' && v.trim().length > 0;
  }

  function toISODateString(dateLike) {
    const d = new Date(dateLike);
    if (isNaN(d.getTime())) return null;
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const da = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${da}`;
  }

  // -------- Calculation logic --------

  /**
   * Calculate donor level ID for a given lifetime total.
   * Returns the highest-matching active level where lifetimeTotal fits in the min/max range.
   * If no level matches, returns null.
   * 
   * @param {number} lifetimeTotal
   * @returns {string|null}
   */
  function calculateDonorLevel(lifetimeTotal) {
    if (typeof lifetimeTotal !== 'number' || lifetimeTotal < 0) {
      console.warn('[DonorCalculationService] Invalid lifetimeTotal:', lifetimeTotal);
      return null;
    }

    const levelsService = getDonorLevelsService();
    if (!levelsService || typeof levelsService.getActiveDonorLevels !== 'function') {
      return null;
    }

    try {
      const levels = levelsService.getActiveDonorLevels();
      if (!Array.isArray(levels) || levels.length === 0) {
        console.warn('[DonorCalculationService] No active donor levels found');
        return null;
      }

      // Filter levels where lifetimeTotal fits in range
      const candidates = levels.filter(level => {
        const min = Number(level.minAmount || 0);
        const max = level.maxAmount === null ? Infinity : Number(level.maxAmount);
        return lifetimeTotal >= min && lifetimeTotal <= max;
      });

      if (candidates.length === 0) {
        console.warn('[DonorCalculationService] No matching donor level for amount:', lifetimeTotal);
        return null;
      }

      // Sort by minAmount descending to get the highest applicable level
      candidates.sort((a, b) => Number(b.minAmount || 0) - Number(a.minAmount || 0));
      return candidates[0].id;
    } catch (err) {
      console.error('[DonorCalculationService] Error calculating donor level:', err);
      return null;
    }
  }

  /**
   * Compute donor metrics from donations array.
   * @param {Array<any>} donations
   * @returns {{
   *   lifetimeTotal: number,
   *   inKindTotal: number,
   *   totalDonations: number,
   *   firstDonationDate: string|null,
   *   lastDonationDate: string|null,
   *   donorSince: number|null
   * }}
   */
  function computeMetricsFromDonations(donations) {
    const metrics = {
      lifetimeTotal: 0,
      inKindTotal: 0,
      totalDonations: 0,
      firstDonationDate: null,
      lastDonationDate: null,
      donorSince: null,
    };

    if (!Array.isArray(donations) || donations.length === 0) {
      return metrics;
    }

    let firstMs = null;
    let lastMs = null;

    for (const d of donations) {
      metrics.totalDonations += 1;

      // Sum amounts
      if (d.donationType === 'monetary') {
        metrics.lifetimeTotal += Number(d.amount || 0);
      } else if (d.donationType === 'in-kind') {
        metrics.inKindTotal += Number(d.estimatedValue || 0);
      }

      // Track dates
      const dateStr = d.date;
      if (isNonEmptyString(dateStr) && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const ms = new Date(dateStr + 'T12:00:00Z').getTime();
        if (!isNaN(ms)) {
          if (firstMs === null || ms < firstMs) firstMs = ms;
          if (lastMs === null || ms > lastMs) lastMs = ms;
        }
      }
    }

    // Round to 2 decimals
    metrics.lifetimeTotal = Number(metrics.lifetimeTotal.toFixed(2));
    metrics.inKindTotal = Number(metrics.inKindTotal.toFixed(2));

    // Convert ms to ISO dates
    if (firstMs !== null) {
      metrics.firstDonationDate = toISODateString(new Date(firstMs));
      metrics.donorSince = new Date(firstMs).getUTCFullYear();
    }
    if (lastMs !== null) {
      metrics.lastDonationDate = toISODateString(new Date(lastMs));
    }

    return metrics;
  }

  /**
   * Update donor profile for a specific contact by recalculating from donations.
   * 
   * @param {string} contactId
   * @returns {any|null} Updated contact object, or null if not found
   */
  function updateDonorProfileById(contactId) {
    if (!isNonEmptyString(contactId)) {
      console.error('[DonorCalculationService] Invalid contactId:', contactId);
      return null;
    }

    const donationsService = getDonationsService();
    const contactsService = getContactsService();

    if (!donationsService || !contactsService) {
      console.error('[DonorCalculationService] Required services not available');
      return null;
    }

    try {
      // Load contact
      const contact = contactsService.getContactById(contactId);
      if (!contact) {
        console.error('[DonorCalculationService] Contact not found:', contactId);
        return null;
      }

      // Load donations
      const donations = donationsService.getDonationsByContactId(contactId);
      
      // Compute metrics
      const metrics = computeMetricsFromDonations(donations);

      // Calculate donor level
      const donorLevelId = calculateDonorLevel(metrics.lifetimeTotal);

      // Build updated donorProfile
      const updatedProfile = {
        donorLevelId,
        lifetimeTotal: metrics.lifetimeTotal,
        inKindTotal: metrics.inKindTotal,
        firstDonationDate: metrics.firstDonationDate,
        lastDonationDate: metrics.lastDonationDate,
        donorSince: metrics.donorSince,
        totalDonations: metrics.totalDonations,
        notes: contact.donorProfile?.notes || '', // preserve existing notes
      };

      // Determine isDonor flag
      const isDonor = metrics.totalDonations > 0 || 
                      (Array.isArray(contact.tags) && contact.tags.some(t => String(t).toLowerCase() === 'donor'));

      // Update contact
      const contacts = contactsService.loadContacts();
      const idx = contacts.findIndex(c => c.id === contactId);
      if (idx === -1) {
        console.error('[DonorCalculationService] Contact not found in array:', contactId);
        return null;
      }

      contacts[idx] = {
        ...contacts[idx],
        isDonor,
        donorProfile: updatedProfile,
        updatedAt: new Date().toISOString(),
      };

      contactsService.saveContactsToLS(contacts);

      console.log('[DonorCalculationService] Updated donor profile for:', contactId, {
        lifetimeTotal: metrics.lifetimeTotal,
        totalDonations: metrics.totalDonations,
        donorLevelId,
      });

      return contacts[idx];
    } catch (err) {
      console.error('[DonorCalculationService] Error updating donor profile:', err);
      return null;
    }
  }

  /**
   * Recalculate donor profiles for all contacts that have donations.
   * Also recalculates contacts with isDonor = true to ensure consistency.
   * 
   * @returns {{ updated: number, errors: number }}
   */
  function recalculateAllDonorProfiles() {
    const contactsService = getContactsService();
    const donationsService = getDonationsService();

    if (!contactsService || !donationsService) {
      console.error('[DonorCalculationService] Required services not available');
      return { updated: 0, errors: 0 };
    }

    try {
      console.log('[DonorCalculationService] Starting bulk recalculation...');

      const contacts = contactsService.loadContacts();
      const donations = donationsService.loadDonations();

      // Build a map of contactId -> donations
      const donationsByContact = new Map();
      for (const d of donations) {
        if (!donationsByContact.has(d.contactId)) {
          donationsByContact.set(d.contactId, []);
        }
        donationsByContact.get(d.contactId).push(d);
      }

      // Identify contacts to update (those with donations or isDonor flag)
      const contactsToUpdate = contacts.filter(c => 
        donationsByContact.has(c.id) || c.isDonor === true
      );

      let updated = 0;
      let errors = 0;

      for (const contact of contactsToUpdate) {
        try {
          const result = updateDonorProfileById(contact.id);
          if (result) {
            updated += 1;
          } else {
            errors += 1;
          }
        } catch (err) {
          console.error('[DonorCalculationService] Error updating contact:', contact.id, err);
          errors += 1;
        }
      }

      console.log(`[DonorCalculationService] Recalculation complete: ${updated} updated, ${errors} errors`);
      return { updated, errors };
    } catch (err) {
      console.error('[DonorCalculationService] Error in bulk recalculation:', err);
      return { updated: 0, errors: 1 };
    }
  }

  /**
   * Get aggregate donor statistics across all donor contacts.
   * 
   * @returns {{
   *   totalDonors: number,
   *   totalLifetimeGiving: number,
   *   totalInKindGiving: number,
   *   averageLifetimeGift: number,
   *   donorsByLevel: { [levelId: string]: number }
   * }}
   */
  function getDonorStats() {
    const contactsService = getContactsService();
    if (!contactsService) {
      console.error('[DonorCalculationService] ContactsService not available');
      return {
        totalDonors: 0,
        totalLifetimeGiving: 0,
        totalInKindGiving: 0,
        averageLifetimeGift: 0,
        donorsByLevel: {},
      };
    }

    try {
      const donors = contactsService.getDonorContacts();
      
      let totalLifetimeGiving = 0;
      let totalInKindGiving = 0;
      const donorsByLevel = {};

      for (const donor of donors) {
        const profile = donor.donorProfile || {};
        totalLifetimeGiving += Number(profile.lifetimeTotal || 0);
        totalInKindGiving += Number(profile.inKindTotal || 0);

        const levelId = profile.donorLevelId || 'none';
        donorsByLevel[levelId] = (donorsByLevel[levelId] || 0) + 1;
      }

      const averageLifetimeGift = donors.length > 0 
        ? Number((totalLifetimeGiving / donors.length).toFixed(2))
        : 0;

      return {
        totalDonors: donors.length,
        totalLifetimeGiving: Number(totalLifetimeGiving.toFixed(2)),
        totalInKindGiving: Number(totalInKindGiving.toFixed(2)),
        averageLifetimeGift,
        donorsByLevel,
      };
    } catch (err) {
      console.error('[DonorCalculationService] Error computing donor stats:', err);
      return {
        totalDonors: 0,
        totalLifetimeGiving: 0,
        totalInKindGiving: 0,
        averageLifetimeGift: 0,
        donorsByLevel: {},
      };
    }
  }

  // -------- Public API --------
  return {
    updateDonorProfileById,
    // Back-compat alias for older callers
    updateDonorProfile: updateDonorProfileById,
    calculateDonorLevel,
    recalculateAllDonorProfiles,
    getDonorStats,
  };
});
