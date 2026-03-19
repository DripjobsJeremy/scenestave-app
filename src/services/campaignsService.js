/*
  Campaigns/Funds Service (localStorage)
  Exposes a global `CampaignsService` for use in browser environments.

  Storage key: 'showsuite_campaigns'
*/

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    const api = factory();
    // Expose both PascalCase and camelCase for compatibility
    root.CampaignsService = api;
    root.campaignsService = api;
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /** @constant {string} */
  const LS_KEY = 'showsuite_campaigns';

  /** Allowed campaign types */
  const CAMPAIGN_TYPES = new Set(['general', 'building', 'scholarship', 'custom', 'production']);

  /** Default campaign seed */
  const DEFAULTS = () => {
    const now = new Date().toISOString();
    return [
      {
        id: 'campaign_general',
        type: 'general',
        name: 'General Operating Fund',
        description: 'Unrestricted support for daily operations',
        goalAmount: null,
        currentAmount: 0,
        active: true,
        startDate: null,
        endDate: null,
        createdAt: now,
      },
      {
        id: 'campaign_building',
        type: 'building',
        name: 'Building Renovation Fund',
        description: 'Capital campaign for facility upgrades',
        goalAmount: 50000,
        currentAmount: 0,
        active: true,
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        createdAt: now,
      },
      {
        id: 'campaign_scholarship',
        type: 'scholarship',
        name: 'Scholarship Fund',
        description: 'Support for student performers',
        goalAmount: 15000,
        currentAmount: 0,
        active: true,
        startDate: null,
        endDate: null,
        createdAt: now,
      },
    ];
  };

  /**
   * @typedef {Object} Campaign
   * @property {string} id
   * @property {('general'|'building'|'scholarship'|'custom'|'production')} type
   * @property {string} name
   * @property {string} description
   * @property {number|null} goalAmount
   * @property {number} currentAmount
   * @property {boolean} active
   * @property {string|null} startDate // YYYY-MM-DD
   * @property {string|null} endDate   // YYYY-MM-DD
   * @property {string} createdAt // ISO datetime
   */

  // -------- utils --------
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

  function isNumber(v) {
    return typeof v === 'number' && Number.isFinite(v);
  }

  function isISODate(v) {
    if (v == null) return true;
    if (typeof v !== 'string') return false;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
    const d = new Date(v + 'T00:00:00Z');
    return !isNaN(d.getTime());
  }

  function toDate(v) {
    if (!v) return null;
    const d = new Date(typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v + 'T12:00:00Z' : v);
    return isNaN(d.getTime()) ? null : d;
  }

  function generateId(name) {
    const slug = String(name || 'campaign').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 40) || 'campaign';
    const rand = Math.random().toString(36).slice(2, 6);
    return `campaign_${slug}_${rand}`;
  }

  /**
   * Sanitize & normalize a campaign object.
   * @param {Partial<Campaign>} input
   * @param {Campaign|undefined} existing
   * @returns {Campaign}
   */
  function sanitizeCampaign(input, existing) {
    const base = existing || /** @type {Campaign} */({
      id: generateId(input?.name),
      type: 'general',
      name: '',
      description: '',
      goalAmount: null,
      currentAmount: 0,
      active: true,
      startDate: null,
      endDate: null,
      createdAt: new Date().toISOString(),
    });

    const out = /** @type {Campaign} */({
      ...base,
      type: input.type ?? base.type,
      name: input.name ?? base.name,
      description: input.description ?? base.description,
      goalAmount: input.goalAmount ?? base.goalAmount,
      currentAmount: input.currentAmount ?? base.currentAmount,
      active: typeof input.active === 'boolean' ? input.active : base.active,
      startDate: input.startDate ?? base.startDate,
      endDate: input.endDate ?? base.endDate,
      createdAt: existing ? base.createdAt : new Date().toISOString(),
      id: base.id,
    });

    if (out.goalAmount != null) out.goalAmount = Number(out.goalAmount);
    out.currentAmount = Number(out.currentAmount || 0);

    return out;
  }

  /**
   * Validate a campaign.
   * @param {Campaign} c
   */
  function validateCampaign(c) {
    if (!isNonEmptyString(c.name)) throw new Error('name is required');
    if (!CAMPAIGN_TYPES.has(c.type)) throw new Error('type is invalid');
    if (c.goalAmount != null && (!isNumber(c.goalAmount) || c.goalAmount < 0)) throw new Error('goalAmount must be null or a non-negative number');
    if (!isNumber(c.currentAmount) || c.currentAmount < 0) throw new Error('currentAmount must be a non-negative number');
    if (!isISODate(c.startDate)) throw new Error('startDate must be YYYY-MM-DD or null');
    if (!isISODate(c.endDate)) throw new Error('endDate must be YYYY-MM-DD or null');
    if (c.startDate && c.endDate) {
      const s = toDate(c.startDate);
      const e = toDate(c.endDate);
      if (!s || !e || e.getTime() < s.getTime()) throw new Error('endDate must be after startDate');
    }
    if (!isNonEmptyString(c.createdAt)) throw new Error('createdAt is required');
  }

  // -------- storage API --------
  /**
   * Load campaigns; seed defaults if storage empty.
   * @returns {Campaign[]}
   */
  function loadCampaigns() {
    const data = safeParseLS(LS_KEY);
    if (!Array.isArray(data) || data.length === 0) return seedDefaultCampaigns();
    return data;
  }

  /**
   * Save campaigns to localStorage.
   * @param {Campaign[]} campaigns
   */
  function saveCampaignsToLS(campaigns) {
    if (!Array.isArray(campaigns)) throw new Error('campaigns must be an array');
    campaigns.forEach(validateCampaign);
    safeWriteLS(LS_KEY, campaigns);
  }

  /**
   * Get a campaign by id.
   * @param {string} id
   * @returns {Campaign|null}
   */
  function getCampaignById(id) {
    const list = loadCampaigns();
    return list.find(c => c.id === id) || null;
  }

  /**
   * Get active campaigns.
   * @returns {Campaign[]}
   */
  function getActiveCampaigns() {
    return loadCampaigns().filter(c => c.active);
  }

  /**
   * Add a new campaign; auto-generates id and createdAt.
   * @param {Partial<Campaign>} campaignData
   * @returns {Campaign}
   */
  function addCampaign(campaignData) {
    const list = loadCampaigns();
    const prepared = sanitizeCampaign(campaignData || {});
    prepared.id = generateId(prepared.name);
    prepared.createdAt = new Date().toISOString();
    validateCampaign(prepared);
    list.push(prepared);
    saveCampaignsToLS(list);
    return prepared;
  }

  /**
   * Update existing campaign by id.
   * @param {string} id
   * @param {Partial<Campaign>} campaignData
   * @returns {Campaign}
   */
  function updateCampaign(id, campaignData) {
    const list = loadCampaigns();
    const idx = list.findIndex(c => c.id === id);
    if (idx === -1) throw new Error('Campaign not found');
    const existing = list[idx];
    const merged = sanitizeCampaign({ ...existing, ...campaignData, id: existing.id, createdAt: existing.createdAt }, existing);
    validateCampaign(merged);
    list[idx] = merged;
    saveCampaignsToLS(list);
    return merged;
  }

  /**
   * Soft delete (active=false).
   * @param {string} id
   * @returns {boolean}
   */
  function deleteCampaign(id) {
    const list = loadCampaigns();
    const idx = list.findIndex(c => c.id === id);
    if (idx === -1) return false;
    list[idx] = { ...list[idx], active: false };
    saveCampaignsToLS(list);
    return true;
  }

  // -------- donations linking --------
  /**
   * Get donations linked to a campaign.
   * Linking rules:
   *  - If donation.campaignType === 'production': match by donation.campaignId === campaign.id when campaign.type === 'production'.
   *  - For types 'general'|'building'|'scholarship': match donation.campaignType === type AND donation.campaignName equals campaign.name (case-insensitive). Also match by id if present.
   *  - For type 'custom': match donation.campaignType === 'custom' AND donation.campaignName equals campaign.name.
   * Only monetary donations are included.
   * If campaign has a date range, donations outside the range are excluded.
   * @param {string} campaignId
   * @returns {Array<any>}
   */
  function getCampaignDonations(campaignId) {
    const campaign = getCampaignById(campaignId);
    if (!campaign) return [];
    try {
      const svc = (typeof window !== 'undefined' ? window.DonationsService : undefined) || (typeof global !== 'undefined' ? global.DonationsService : undefined);
      if (!svc || typeof svc.loadDonations !== 'function') return [];
      const all = svc.loadDonations();
      const nameLower = (campaign.name || '').toLowerCase();

      const inDateRange = (don) => {
        if (!don.date || !/^\d{4}-\d{2}-\d{2}$/.test(don.date)) return false;
        const ms = new Date(don.date + 'T12:00:00Z').getTime();
        if (campaign.startDate) {
          const s = new Date(campaign.startDate + 'T00:00:00Z').getTime();
          if (ms < s) return false;
        }
        if (campaign.endDate) {
          const e = new Date(campaign.endDate + 'T23:59:59Z').getTime();
          if (ms > e) return false;
        }
        return true;
      };

      return all.filter(d => {
        if (d.donationType !== 'monetary') return false;
        if (!inDateRange(d)) return false;
        const type = d.campaignType || null;
        const byId = d.campaignId && d.campaignId === campaign.id;
        const byName = typeof d.campaignName === 'string' && d.campaignName.toLowerCase() === nameLower;
        if (type === 'production') {
          return campaign.type === 'production' && (byId || false);
        }
        if (type === 'general' || type === 'building' || type === 'scholarship') {
          return campaign.type === type && (byName || byId);
        }
        if (type === 'custom') {
          return campaign.type === 'custom' && byName;
        }
        return false;
      });
    } catch (_) {
      return [];
    }
  }

  /**
   * Calculate and persist campaign progress by summing linked donations' amounts.
   * @param {string} campaignId
   * @returns {{ campaign: Campaign|null, total:number }}
   */
  function calculateCampaignProgress(campaignId) {
    const donations = getCampaignDonations(campaignId);
    const total = donations.reduce((acc, d) => acc + Number(d.amount || 0), 0);
    const list = loadCampaigns();
    const idx = list.findIndex(c => c.id === campaignId);
    if (idx === -1) return { campaign: null, total };
    const updated = { ...list[idx], currentAmount: Number(total.toFixed(2)) };
    validateCampaign(updated);
    list[idx] = updated;
    saveCampaignsToLS(list);
    return { campaign: updated, total: updated.currentAmount };
  }

  /**
   * Seed defaults if storage empty/invalid.
   * @returns {Campaign[]}
   */
  function seedDefaultCampaigns() {
    const data = safeParseLS(LS_KEY);
    if (Array.isArray(data) && data.length > 0) return data;
    const seeded = DEFAULTS();
    seeded.forEach(validateCampaign);
    safeWriteLS(LS_KEY, seeded);
    return seeded;
  }

  // Auto-seed on module init
  (function autoSeed() {
    const data = safeParseLS(LS_KEY);
    if (!Array.isArray(data) || data.length === 0) seedDefaultCampaigns();
  })();

  return {
    // Storage
    loadCampaigns,
    saveCampaignsToLS,
    // Alias for compatibility with older components expecting getAllCampaigns()
    getAllCampaigns: loadCampaigns,

    // Queries
    getCampaignById,
    getActiveCampaigns,
    getCampaignDonations,

    // Mutations
    addCampaign,
    updateCampaign,
    deleteCampaign,
    calculateCampaignProgress,

    // Init
    seedDefaultCampaigns,
  };
});
