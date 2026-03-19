/*
  Donor Levels Service (localStorage)
  Exposes a global `DonorLevelsService` for use in browser environments.

  Storage key: 'showsuite_donor_levels'
*/

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    const api = factory();
    root.DonorLevelsService = api;
    root.donorLevelsService = api;
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /** @constant {string} */
  const LS_KEY = 'showsuite_donor_levels';

  /** @type {Array<{id:string,name:string,minAmount:number,maxAmount:number|null,benefits:string,displayOrder:number,active:boolean}>} */
  const DEFAULT_LEVELS = [
    { id: 'level_friend',     name: 'Friend',            minAmount: 0,     maxAmount: 249,   benefits: 'Newsletter subscription',            displayOrder: 1, active: true },
    { id: 'level_supporter',  name: 'Supporter',         minAmount: 250,   maxAmount: 499,   benefits: 'Name listed in programs',            displayOrder: 2, active: true },
    { id: 'level_patron',     name: 'Patron',            minAmount: 500,   maxAmount: 999,   benefits: '2 complimentary tickets per show',   displayOrder: 3, active: true },
    { id: 'level_benefactor', name: 'Benefactor',        minAmount: 1000,  maxAmount: 2499,  benefits: 'VIP access to events',               displayOrder: 4, active: true },
    { id: 'level_sponsor',    name: 'Sponsor',           minAmount: 2500,  maxAmount: 4999,  benefits: 'Logo in program',                     displayOrder: 5, active: true },
    { id: 'level_angel',      name: 'Angel',             minAmount: 5000,  maxAmount: 9999,  benefits: 'Named seat recognition',              displayOrder: 6, active: true },
    { id: 'level_founders',   name: "Founder's Circle", minAmount: 10000, maxAmount: null,  benefits: 'Board recognition',                  displayOrder: 7, active: true },
  ];

  /**
   * @typedef {Object} DonorLevel
   * @property {string} id
   * @property {string} name
   * @property {number} minAmount
   * @property {number|null} maxAmount
   * @property {string} benefits
   * @property {number} displayOrder
   * @property {boolean} active
   */

  // --------- utils ---------
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

  function toPositiveInt(v, fallback) {
    const n = Number(v);
    return Number.isInteger(n) && n > 0 ? n : fallback;
  }

  function slugify(str) {
    return String(str || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '')
      .slice(0, 40);
  }

  function generateId(name) {
    const slug = slugify(name) || 'level';
    const rand = Math.random().toString(36).slice(2, 6);
    return `level_${slug}_${rand}`;
  }

  /**
   * Return a sanitized copy of level with only known fields.
   * @param {Partial<DonorLevel>} input
   * @param {DonorLevel|undefined} existing
   * @returns {DonorLevel}
   */
  function sanitizeLevel(input, existing) {
    const base = existing || /** @type {DonorLevel} */({
      id: generateId(input?.name || 'level'),
      name: '',
      minAmount: 0,
      maxAmount: null,
      benefits: '',
      displayOrder: 1,
      active: true,
    });

    const out = /** @type {DonorLevel} */({
      ...base,
      name: input.name ?? base.name,
      minAmount: input.minAmount ?? base.minAmount,
      maxAmount: input.maxAmount ?? base.maxAmount,
      benefits: input.benefits ?? base.benefits,
      displayOrder: input.displayOrder ?? base.displayOrder,
      active: typeof input.active === 'boolean' ? input.active : base.active,
      id: base.id, // never allow id change in sanitize
    });

    // normalize numbers
    out.minAmount = Number(out.minAmount);
    if (out.maxAmount !== null && out.maxAmount !== undefined) {
      out.maxAmount = Number(out.maxAmount);
    } else {
      out.maxAmount = null;
    }
    out.displayOrder = toPositiveInt(out.displayOrder, 1);

    return out;
  }

  /**
   * Validate a donor level. Throws on invalid input.
   * @param {DonorLevel} level
   */
  function validateLevel(level) {
    if (!isNonEmptyString(level.name)) throw new Error('name is required');
    if (!isNumber(level.minAmount) || level.minAmount < 0) throw new Error('minAmount must be a non-negative number');
    if (level.maxAmount !== null) {
      if (!isNumber(level.maxAmount)) throw new Error('maxAmount must be a number or null');
      if (!(level.minAmount < level.maxAmount)) throw new Error('minAmount must be less than maxAmount');
    }
    if (!Number.isInteger(level.displayOrder) || level.displayOrder <= 0) throw new Error('displayOrder must be a positive integer');
    if (typeof level.active !== 'boolean') throw new Error('active must be a boolean');
  }

  /**
   * Ensure array is sorted by displayOrder asc without mutating original.
   * @param {DonorLevel[]} levels
   * @returns {DonorLevel[]}
   */
  function sortByDisplayOrder(levels) {
    return levels.slice().sort((a, b) => a.displayOrder - b.displayOrder);
  }

  // --------- core API ---------

  /**
   * Load donor levels; seeds defaults if missing/empty.
   * @returns {DonorLevel[]}
   */
  function loadDonorLevels() {
    const data = safeParseLS(LS_KEY);
    if (!Array.isArray(data) || data.length === 0) {
      return seedDefaultLevels();
    }
    return sortByDisplayOrder(data);
  }

  /**
   * Save donor levels to localStorage (sorted).
   * @param {DonorLevel[]} levels
   */
  function saveDonorLevelsToLS(levels) {
    if (!Array.isArray(levels)) throw new Error('levels must be an array');
    levels.forEach(validateLevel);
    safeWriteLS(LS_KEY, sortByDisplayOrder(levels));
  }

  /**
   * Get donor level by id.
   * @param {string} id
   * @returns {DonorLevel|null}
   */
  function getDonorLevelById(id) {
    const levels = loadDonorLevels();
    return levels.find(l => l.id === id) || null;
  }

  /**
   * Get active donor levels sorted by displayOrder.
   * @returns {DonorLevel[]}
   */
  function getActiveDonorLevels() {
    return loadDonorLevels().filter(l => l.active).sort((a, b) => a.displayOrder - b.displayOrder);
  }

  /**
   * Add a donor level; auto-generates id and default displayOrder.
   * @param {Partial<DonorLevel>} levelData
   * @returns {DonorLevel}
   */
  function addDonorLevel(levelData) {
    const levels = loadDonorLevels();
    const nextOrder = levels.length > 0 ? Math.max(...levels.map(l => l.displayOrder)) + 1 : 1;
    const prepared = sanitizeLevel({ ...levelData, displayOrder: levelData?.displayOrder ?? nextOrder });
    prepared.id = generateId(prepared.name);
    validateLevel(prepared);
    levels.push(prepared);
    saveDonorLevelsToLS(levels);
    return prepared;
  }

  /**
   * Update an existing donor level by id.
   * @param {string} id
   * @param {Partial<DonorLevel>} levelData
   * @returns {DonorLevel}
   */
  function updateDonorLevel(id, levelData) {
    const levels = loadDonorLevels();
    const idx = levels.findIndex(l => l.id === id);
    if (idx === -1) throw new Error('Donor level not found');
    const existing = levels[idx];
    const merged = sanitizeLevel({ ...existing, ...levelData, id: existing.id }, existing);
    validateLevel(merged);
    levels[idx] = merged;
    saveDonorLevelsToLS(levels);
    return merged;
  }

  /**
   * Soft delete a donor level (sets active=false).
   * @param {string} id
   * @returns {boolean}
   */
  function deleteDonorLevel(id) {
    const levels = loadDonorLevels();
    const idx = levels.findIndex(l => l.id === id);
    if (idx === -1) return false;
    levels[idx] = { ...levels[idx], active: false };
    saveDonorLevelsToLS(levels);
    return true;
  }

  /**
   * Reorder donor levels by array order (drag/drop style).
   * Accepts an array of ids OR an array of level objects with `id`.
   * Requires the array to contain all existing level ids exactly once.
   * @param {string[]|DonorLevel[]} levelsArray
   * @returns {DonorLevel[]}
   */
  function reorderDonorLevels(levelsArray) {
    const levels = loadDonorLevels();
    const ids = Array.isArray(levelsArray) && levelsArray.length > 0 && typeof levelsArray[0] === 'object'
      ? /** @type {DonorLevel[]} */(levelsArray).map(l => l.id)
      : /** @type {string[]} */(levelsArray);

    if (!Array.isArray(ids)) throw new Error('levelsArray must be an array of ids or level objects');
    if (ids.length !== levels.length) throw new Error('levelsArray must include all donor level ids exactly once');
    const unique = new Set(ids);
    if (unique.size !== ids.length) throw new Error('Duplicate ids in levelsArray');

    // Validate that all ids exist
    const existingIds = new Set(levels.map(l => l.id));
    for (const id of ids) {
      if (!existingIds.has(id)) throw new Error(`Unknown donor level id: ${id}`);
    }

    const idToOrder = new Map(ids.map((id, i) => [id, i + 1]));
    const reordered = levels.map(l => ({ ...l, displayOrder: /** @type {number} */(idToOrder.get(l.id)) }));
    saveDonorLevelsToLS(reordered);
    return sortByDisplayOrder(reordered);
  }

  /**
   * Determine donor level for a given lifetime total. Considers ACTIVE levels only.
   * Picks the level with the highest minAmount that still matches the total.
   * @param {number} lifetimeTotal
   * @returns {DonorLevel|null}
   */
  function calculateDonorLevel(lifetimeTotal) {
    if (!isNumber(lifetimeTotal) || lifetimeTotal < 0) throw new Error('lifetimeTotal must be a non-negative number');
    const levels = getActiveDonorLevels();
    const candidates = levels.filter(l => lifetimeTotal >= l.minAmount && (l.maxAmount === null || lifetimeTotal <= l.maxAmount));
    if (candidates.length === 0) return null;
    candidates.sort((a, b) => a.minAmount - b.minAmount);
    return candidates[candidates.length - 1];
  }

  /**
   * Seed default levels if localStorage is empty or invalid.
   * @returns {DonorLevel[]}
   */
  function seedDefaultLevels() {
    const data = safeParseLS(LS_KEY);
    if (Array.isArray(data) && data.length > 0) return sortByDisplayOrder(data);
    const seeded = DEFAULT_LEVELS.map(l => ({ ...l }));
    // Validate defaults defensively
    seeded.forEach(validateLevel);
    safeWriteLS(LS_KEY, seeded);
    return sortByDisplayOrder(seeded);
  }

  // Auto-seed on module init (first load in app)
  (function autoSeed() {
    const data = safeParseLS(LS_KEY);
    if (!Array.isArray(data) || data.length === 0) {
      seedDefaultLevels();
    }
  })();

  return {
    // Storage
    loadDonorLevels,
    saveDonorLevelsToLS,

    // Queries
    getDonorLevelById,
    getActiveDonorLevels,
    calculateDonorLevel,

    // Mutations
    addDonorLevel,
    updateDonorLevel,
    deleteDonorLevel,
    reorderDonorLevels,

    // Init
    seedDefaultLevels,
  };
});
