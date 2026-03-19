/*
  Contacts Service (localStorage)
  Extends contacts with donor-specific profile data and migration.

  Storage key: 'showsuite_contacts'

  Exposes a global `ContactsService` for browser environments.
*/

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    const api = factory();
    root.ContactsService = api;
    // camelCase alias for consistency with other services usage
    root.contactsService = api;
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /** @constant {string} */
  const LS_KEY = 'showsuite_contacts';

  // ---------- Utilities ----------
  function safeParseLS(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (_) {
      return null;
    }
  }

  function safeWriteLS(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

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

  function includesDonorTag(tags) {
    if (!Array.isArray(tags)) return false;
    return tags.some(t => String(t).toLowerCase() === 'donor');
  }

  // ---------- Default Donor Profile ----------
  /**
   * @returns {{
   *  donorLevelId: string|null,
   *  lifetimeTotal: number,
   *  inKindTotal: number,
   *  firstDonationDate: string|null,
   *  lastDonationDate: string|null,
   *  donorSince: number|null,
   *  totalDonations: number,
   *  notes: string
   * }}
   */
  function defaultDonorProfile() {
    return {
      donorLevelId: null,
      lifetimeTotal: 0,
      inKindTotal: 0,
      firstDonationDate: null,
      lastDonationDate: null,
      donorSince: null,
      totalDonations: 0,
      notes: '',
    };
  }

  // ---------- Core load/save ----------
  /**
   * Load contacts and apply migration.
   * @returns {Array<any>} contacts array
   */
  function loadContacts() {
    const data = safeParseLS(LS_KEY);
    const arr = Array.isArray(data) ? data : [];
    return migrateToDonorSchema(arr);
  }

  /**
   * Save contacts to localStorage.
   * @param {Array<any>} contacts
   */
  function saveContactsToLS(contacts) {
    if (!Array.isArray(contacts)) throw new Error('contacts must be an array');
    safeWriteLS(LS_KEY, contacts);
  }

  // ---------- Migration ----------
  /**
   * Ensure each contact contains donor schema fields; preserve existing data.
   * - If tags include "Donor", set isDonor = true (non-destructive).
   * - Initialize donorProfile if missing.
   * @param {Array<any>} contacts
   * @returns {Array<any>} migrated contacts
   */
  function migrateToDonorSchema(contacts) {
    let changed = false;
    const migrated = (contacts || []).map(c => {
      const contact = { ...c };

      if (typeof contact.isDonor !== 'boolean') {
        contact.isDonor = includesDonorTag(contact.tags) || false;
        changed = true;
      } else if (!contact.isDonor && includesDonorTag(contact.tags)) {
        contact.isDonor = true;
        changed = true;
      }

      if (!contact.donorProfile || typeof contact.donorProfile !== 'object') {
        contact.donorProfile = defaultDonorProfile();
        changed = true;
      } else {
        // patch missing donorProfile fields with defaults
        const def = defaultDonorProfile();
        for (const k in def) {
          if (!(k in contact.donorProfile)) {
            contact.donorProfile[k] = def[k];
            changed = true;
          }
        }
      }

      return contact;
    });

    if (changed) safeWriteLS(LS_KEY, migrated);
    return migrated;
  }

  // ---------- Queries ----------
  /**
   * Get a contact by id.
   * @param {string} id
   * @returns {any|null}
   */
  function getContactById(id) {
    if (!isNonEmptyString(id)) return null;
    const contacts = loadContacts();
    return contacts.find(c => c.id === id) || null;
  }

  /**
   * Get contacts where isDonor === true.
   * @returns {Array<any>}
   */
  function getDonorContacts() {
    return loadContacts().filter(c => c.isDonor === true);
  }

  // ---------- Donor Profile Update ----------
  /**
   * Aggregate donations for a contact if DonationsService is available.
   * @param {string} contactId
   * @returns {{ lifetimeTotal:number, inKindTotal:number, firstDonationDate:string|null, lastDonationDate:string|null, donorSince:number|null, totalDonations:number }}
   */
  function computeDonorAggregates(contactId) {
    const empty = { lifetimeTotal: 0, inKindTotal: 0, firstDonationDate: null, lastDonationDate: null, donorSince: null, totalDonations: 0 };
    try {
      const svc = (typeof window !== 'undefined' ? window.DonationsService : undefined) || (typeof global !== 'undefined' ? global.DonationsService : undefined);
      if (!svc || typeof svc.getDonationsByContactId !== 'function') return empty;
      const donations = svc.getDonationsByContactId(contactId) || [];
      if (donations.length === 0) return empty;

      let lifetimeTotal = 0;
      let inKindTotal = 0;
      let firstDate = null;
      let lastDate = null;
      for (const d of donations) {
        const dateStr = d.date || null;
        const ms = dateStr ? new Date(dateStr + 'T12:00:00Z').getTime() : NaN;
        if (!isNaN(ms)) {
          if (firstDate === null || ms < firstDate) firstDate = ms;
          if (lastDate === null || ms > lastDate) lastDate = ms;
        }
        if (d.donationType === 'monetary') {
          lifetimeTotal += Number(d.amount || 0);
        } else if (d.donationType === 'in-kind') {
          inKindTotal += Number(d.estimatedValue || 0);
        }
      }

      const donorSince = firstDate != null ? new Date(firstDate).getUTCFullYear() : null;
      const firstDonationDate = firstDate != null ? toISODateString(new Date(firstDate)) : null;
      const lastDonationDate = lastDate != null ? toISODateString(new Date(lastDate)) : null;

      return {
        lifetimeTotal: Number(lifetimeTotal.toFixed(2)),
        inKindTotal: Number(inKindTotal.toFixed(2)),
        firstDonationDate,
        lastDonationDate,
        donorSince,
        totalDonations: donations.length,
      };
    } catch (_) {
      return empty;
    }
  }

  /**
   * Derive donorLevelId using DonorLevelsService if available.
   * @param {number} lifetimeTotal
   * @returns {string|null}
   */
  function deriveDonorLevelId(lifetimeTotal) {
    try {
      const svc = (typeof window !== 'undefined' ? window.DonorLevelsService : undefined) || (typeof global !== 'undefined' ? global.DonorLevelsService : undefined);
      if (!svc || typeof svc.calculateDonorLevel !== 'function') return null;
      const level = svc.calculateDonorLevel(lifetimeTotal);
      return level ? level.id : null;
    } catch (_) {
      return null;
    }
  }

  /**
   * Update donor profile for a contact. Computes aggregates and optional donor level.
   * Accepts partial donor data to override fields like `notes` or force `isDonor`.
   *
   * @param {string} contactId
   * @param {{ isDonor?: boolean, notes?: string }|undefined} donorData
   * @returns {any} updated contact
   */
  function updateContactDonorProfile(contactId, donorData) {
    const contacts = loadContacts();
    const idx = contacts.findIndex(c => c.id === contactId);
    if (idx === -1) throw new Error('Contact not found');
    const contact = { ...contacts[idx] };

    // Ensure schema present
    if (!contact.donorProfile || typeof contact.donorProfile !== 'object') {
      contact.donorProfile = defaultDonorProfile();
    }

    // Compute aggregates
    const agg = computeDonorAggregates(contactId);
    const donorLevelId = deriveDonorLevelId(agg.lifetimeTotal);

    contact.donorProfile = {
      ...contact.donorProfile,
      donorLevelId,
      lifetimeTotal: agg.lifetimeTotal,
      inKindTotal: agg.inKindTotal,
      firstDonationDate: agg.firstDonationDate,
      lastDonationDate: agg.lastDonationDate,
      donorSince: agg.donorSince,
      totalDonations: agg.totalDonations,
      // Allow overriding notes only if provided
      notes: typeof donorData?.notes === 'string' ? donorData.notes : (contact.donorProfile.notes || ''),
    };

    // Update isDonor: true if any donations or explicit true or has Donor tag
    const autoIsDonor = agg.totalDonations > 0 || includesDonorTag(contact.tags);
    contact.isDonor = typeof donorData?.isDonor === 'boolean' ? donorData.isDonor : (contact.isDonor || autoIsDonor);

    // Touch updatedAt if present
    if (isNonEmptyString(contact.updatedAt)) {
      contact.updatedAt = new Date().toISOString();
    }

    contacts[idx] = contact;
    saveContactsToLS(contacts);
    return contact;
  }

  // Auto-migrate on module init
  (function autoMigrate() {
    const data = safeParseLS(LS_KEY);
    const arr = Array.isArray(data) ? data : [];
    migrateToDonorSchema(arr);
  })();

  /**
   * General-purpose contact update. Merges top-level fields and donorProfile
   * user-editable fields (bio, photoUrl, preferences) while preserving computed
   * donorProfile fields (lifetimeTotal, donorLevelId, etc.).
   *
   * @param {string} id - contact ID
   * @param {object} updates - fields to merge (may include donorProfile sub-object)
   * @returns {any} updated contact
   */
  function updateContact(id, updates) {
    const contacts = loadContacts();
    const idx = contacts.findIndex(c => c.id === id);
    if (idx === -1) throw new Error('Contact not found: ' + id);

    const existing = contacts[idx];
    const { donorProfile: newDonorProfile, ...restUpdates } = updates;

    const updated = {
      ...existing,
      ...restUpdates,
      updatedAt: new Date().toISOString()
    };

    if (newDonorProfile && typeof newDonorProfile === 'object') {
      // Merge user-editable subfields into existing donorProfile,
      // preserving computed fields already stored on the contact.
      updated.donorProfile = {
        ...existing.donorProfile,
        ...newDonorProfile
      };
    }

    contacts[idx] = updated;
    saveContactsToLS(contacts);
    return updated;
  }

  return {
    // Storage
    loadContacts,
    saveContactsToLS,

    // Migration
    migrateToDonorSchema,

    // Queries
    getContactById,
    getDonorContacts,

    // Mutations
    updateContact,
    updateContactDonorProfile,
  };
});
