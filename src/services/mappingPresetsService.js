/**
 * Mapping Presets Service
 * Stores and retrieves reusable field-mapping configurations for CSV imports.
 */
(function (global) {
  'use strict';

  const STORAGE_KEY = 'showsuite_mapping_presets';

  const safeParse = (json, fallback) => {
    try {
      return JSON.parse(json);
    } catch (e) {
      return fallback;
    }
  };

  /**
   * Load all mapping presets
   */
  const loadMappingPresets = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? safeParse(raw, []) : [];
    } catch (error) {
      console.error('Error loading mapping presets:', error);
      return [];
    }
  };

  /**
   * Save mapping presets to localStorage
   */
  const saveMappingPresetsToLS = (presets) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(presets || []));
    } catch (error) {
      console.error('Error saving mapping presets:', error);
    }
  };

  /**
   * Create a new mapping preset
   */
  const createMappingPreset = (name, description, mapping) => {
    const presets = loadMappingPresets();

    const newPreset = {
      id: `preset_${Date.now()}`,
      name: String(name || '').trim(),
      description: String(description || '').trim(),
      mapping: mapping || {},
      createdAt: new Date().toISOString(),
      lastUsed: new Date().toISOString(),
      useCount: 0
    };

    presets.push(newPreset);
    saveMappingPresetsToLS(presets);

    return newPreset;
  };

  /**
   * Update an existing preset
   */
  const updateMappingPreset = (presetId, updates) => {
    const presets = loadMappingPresets();
    const index = presets.findIndex(p => p.id === presetId);

    if (index === -1) {
      throw new Error(`Preset not found: ${presetId}`);
    }

    presets[index] = {
      ...presets[index],
      ...(updates || {})
    };

    saveMappingPresetsToLS(presets);
    return presets[index];
  };

  /**
   * Delete a preset
   */
  const deleteMappingPreset = (presetId) => {
    const presets = loadMappingPresets();
    const filtered = presets.filter(p => p.id !== presetId);
    saveMappingPresetsToLS(filtered);
  };

  /**
   * Record preset usage
   */
  const recordPresetUsage = (presetId) => {
    const presets = loadMappingPresets();
    const preset = presets.find(p => p.id === presetId);

    if (preset) {
      preset.useCount = (preset.useCount || 0) + 1;
      preset.lastUsed = new Date().toISOString();
      saveMappingPresetsToLS(presets);
    }
  };

  /**
   * Find best matching preset for given CSV headers
   */
  const findMatchingPreset = (csvHeaders) => {
    try {
      const presets = loadMappingPresets();
      if (!Array.isArray(csvHeaders) || csvHeaders.length === 0 || presets.length === 0) return null;

      let bestMatch = null;
      let bestScore = 0;

      const norm = (s) => String(s || '').trim();
      const headers = csvHeaders.map(norm);

      presets.forEach(preset => {
        const presetHeaders = Object.keys(preset.mapping || {}).map(norm);
        const matchCount = headers.filter(h => presetHeaders.includes(h)).length;
        const score = matchCount / headers.length;

        if (score > bestScore && score > 0.5) {
          bestScore = score;
          bestMatch = preset;
        }
      });

      return bestMatch;
    } catch (e) {
      console.warn('findMatchingPreset failed:', e);
      return null;
    }
  };

  // Expose service globally
  const api = {
    loadMappingPresets,
    saveMappingPresetsToLS,
    createMappingPreset,
    updateMappingPreset,
    deleteMappingPreset,
    recordPresetUsage,
    findMatchingPreset
  };

  global.mappingPresetsService = api;
})(window);
