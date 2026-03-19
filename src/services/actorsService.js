(function(global) {
  'use strict';

  const LS_KEY = 'showsuite_actors';

  // ---------- Helpers ----------
  function safeParseLS(key) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error(`Failed to parse localStorage key: ${key}`, e);
      return null;
    }
  }

  function safeWriteLS(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error(`Failed to write localStorage key: ${key}`, e);
    }
  }

  // ---------- Default Actor Profile ----------
  function defaultActorProfile() {
    return {
      resume: null,
      headshots: [],
      auditionVideos: [],
      sizeCard: {
        height: '',
        weight: '',
        shirtSize: '',
        pantsSize: '',
        shoeSize: '',
        jacketSize: '',
        dressSize: '',
        chest: '',
        waist: '',
        inseam: '',
        updatedAt: null
      },
      vocalRange: '',
      specialSkills: [],
      experienceLevel: '',
      unionAffiliation: [],
      contractPreference: '',
      conflicts: [],
      joinedDate: new Date().toISOString(),
      lastLogin: null,
      totalProductions: 0,
      credentials: {
        hashedPassword: null,
        passwordResetToken: null,
        emailVerified: false
      }
    };
  }

  // ---------- Core CRUD ----------
  function loadActors() {
    const data = safeParseLS(LS_KEY);
    return Array.isArray(data) ? data : [];
  }

  function saveActors(actors) {
    if (!Array.isArray(actors)) throw new Error('actors must be an array');
    safeWriteLS(LS_KEY, actors);
  }

  function getActorById(id) {
    const actors = loadActors();
    return actors.find(a => a.id === id) || null;
  }

  function createActor(actorData) {
    const actors = loadActors();

    const newActor = {
      id: actorData.id || 'actor_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      firstName: actorData.firstName || '',
      lastName: actorData.lastName || '',
      email: actorData.email || '',
      phone: actorData.phone || '',
      groups: ['Actor'],
      isDonor: false,
      actorProfile: { ...defaultActorProfile(), ...(actorData.actorProfile || {}) },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    actors.push(newActor);
    saveActors(actors);

    // Also sync to contacts if contactsService exists
    // syncActorToContacts(newActor); // DISABLED: Causes quota issues with large files

    return newActor;
  }

  function updateActor(id, updates) {
    const actors = loadActors();
    const index = actors.findIndex(a => a.id === id);

    if (index === -1) {
      throw new Error(`Actor not found: ${id}`);
    }

    actors[index] = {
      ...actors[index],
      ...updates,
      id, // Preserve ID
      updatedAt: new Date().toISOString()
    };

    saveActors(actors);

    // Sync to contacts
    // syncActorToContacts(actors[index]); // DISABLED: Causes quota issues with large files

    return actors[index];
  }

  function deleteActor(id) {
    const actors = loadActors();
    const filtered = actors.filter(a => a.id !== id);
    saveActors(filtered);

    // Remove from contacts too
    if (global.contactsService) {
      const contacts = global.contactsService.loadContacts();
      const updated = contacts.filter(c => c.id !== id);
      global.contactsService.saveContactsToLS(updated);
    }

    return true;
  }

  // ---------- File Upload Helpers ----------
  function uploadFile(file) {
    return new Promise((resolve, reject) => {
      if (!file) {
        reject(new Error('No file provided'));
        return;
      }

      // File size limits (in bytes)
      var limits = {
        'image': 2 * 1024 * 1024,      // 2MB for images
        'video': 50 * 1024 * 1024,     // 50MB for videos
        'application': 1 * 1024 * 1024  // 1MB for PDFs/docs
      };

      var fileType = file.type.split('/')[0];
      var limit = limits[fileType] || 1 * 1024 * 1024;

      if (file.size > limit) {
        var limitMB = (limit / 1024 / 1024).toFixed(1);
        reject(new Error('File too large. Maximum size for ' + fileType + ' files is ' + limitMB + 'MB. Your file is ' + (file.size / 1024 / 1024).toFixed(1) + 'MB.'));
        return;
      }

      var reader = new FileReader();
      reader.onload = (e) => {
        resolve({
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          data: e.target.result, // Base64
          uploadedAt: new Date().toISOString()
        });
      };
      reader.onerror = () => reject(new Error('File read failed'));
      reader.readAsDataURL(file);
    });
  }

  async function addHeadshot(actorId, file, isPrimary) {
    if (isPrimary === undefined) isPrimary = false;
    const fileData = await uploadFile(file);
    const actor = getActorById(actorId);

    if (!actor) throw new Error('Actor not found');

    // If setting as primary, unset others
    if (isPrimary) {
      actor.actorProfile.headshots.forEach(h => h.isPrimary = false);
    }

    actor.actorProfile.headshots.push({
      ...fileData,
      isPrimary,
      id: 'headshot_' + Date.now()
    });

    updateActor(actorId, { actorProfile: actor.actorProfile });
    return actor;
  }

  async function addAuditionVideo(actorId, file, role) {
    if (role === undefined) role = '';
    const fileData = await uploadFile(file);
    const actor = getActorById(actorId);

    if (!actor) throw new Error('Actor not found');

    actor.actorProfile.auditionVideos.push({
      ...fileData,
      role,
      id: 'video_' + Date.now()
    });

    updateActor(actorId, { actorProfile: actor.actorProfile });
    return actor;
  }

  async function uploadResume(actorId, file) {
    const fileData = await uploadFile(file);
    const actor = getActorById(actorId);

    if (!actor) throw new Error('Actor not found');

    actor.actorProfile.resume = {
      ...fileData,
      url: fileData.data
    };

    updateActor(actorId, { actorProfile: actor.actorProfile });
    return actor;
  }

  function deleteHeadshot(actorId, headshotId) {
    const actor = getActorById(actorId);
    if (!actor) throw new Error('Actor not found');

    actor.actorProfile.headshots = actor.actorProfile.headshots.filter(h => h.id !== headshotId);
    updateActor(actorId, { actorProfile: actor.actorProfile });
    return actor;
  }

  function deleteAuditionVideo(actorId, videoId) {
    const actor = getActorById(actorId);
    if (!actor) throw new Error('Actor not found');

    actor.actorProfile.auditionVideos = actor.actorProfile.auditionVideos.filter(v => v.id !== videoId);
    updateActor(actorId, { actorProfile: actor.actorProfile });
    return actor;
  }

  // ---------- Integration with Contacts ----------
  function syncActorToContacts(actor) {
    if (!global.contactsService) return;

    const contacts = global.contactsService.loadContacts();
    const existing = contacts.find(c => c.id === actor.id);

    const contactData = {
      id: actor.id,
      firstName: actor.firstName,
      lastName: actor.lastName,
      email: actor.email,
      phone: actor.phone,
      groups: ['Actor'],
      isDonor: false,
      actorProfile: actor.actorProfile,
      createdAt: actor.createdAt,
      updatedAt: actor.updatedAt
    };

    if (existing) {
      // Update existing
      const updated = contacts.map(c => c.id === actor.id ? { ...c, ...contactData } : c);
      global.contactsService.saveContactsToLS(updated);
    } else {
      // Add new
      contacts.push(contactData);
      global.contactsService.saveContactsToLS(contacts);
    }
  }

  function syncAllActorsToContacts() {
    const actors = loadActors();
    actors.forEach(actor => syncActorToContacts(actor));
    return actors.length;
  }

  // ---------- Statistics ----------
  function getActorStats(actorId) {
    const actor = getActorById(actorId);
    if (!actor) return null;

    // Get productions this actor is in
    const productions = safeParseLS('showsuite_productions') || [];
    const actorProductions = productions.filter(p =>
      p.characters?.some(char => char.actorId === actorId)
    );

    return {
      totalProductions: actorProductions.length,
      activeProductions: actorProductions.filter(p => p.status !== 'Completed').length,
      hasResume: !!actor.actorProfile?.resume,
      hasHeadshot: actor.actorProfile?.headshots?.length > 0,
      hasAuditionVideo: actor.actorProfile?.auditionVideos?.length > 0,
      hasSizeCard: !!(actor.actorProfile?.sizeCard?.height && actor.actorProfile?.sizeCard?.weight),
      lastActive: actor.actorProfile?.lastLogin || actor.updatedAt
    };
  }

  // ---------- Bulk Import ----------
  function importActorsFromCSV(csvData, mapping) {
    var imported = [];
    var errors = [];

    csvData.forEach(function(row, index) {
      try {
        var actorData = {
          firstName: row[mapping.firstName] || '',
          lastName: row[mapping.lastName] || '',
          email: row[mapping.email] || '',
          phone: row[mapping.phone] || '',
          actorProfile: {
            ...defaultActorProfile(),
            vocalRange: row[mapping.vocalRange] || '',
            specialSkills: row[mapping.specialSkills] ? row[mapping.specialSkills].split(',').map(s => s.trim()) : [],
            experienceLevel: row[mapping.experienceLevel] || '',
            sizeCard: {
              height: row[mapping.height] || '',
              weight: row[mapping.weight] || '',
              shirtSize: row[mapping.shirtSize] || '',
              pantsSize: row[mapping.pantsSize] || '',
              shoeSize: row[mapping.shoeSize] || '',
              updatedAt: new Date().toISOString()
            }
          }
        };

        var newActor = createActor(actorData);
        imported.push(newActor);
      } catch (e) {
        errors.push({ row: index + 1, error: e.message });
      }
    });

    return { imported: imported, errors: errors };
  }

  // ---------- Export ----------
  var ActorsService = {
    loadActors: loadActors,
    saveActors: saveActors,
    getActorById: getActorById,
    createActor: createActor,
    updateActor: updateActor,
    deleteActor: deleteActor,
    uploadFile: uploadFile,
    addHeadshot: addHeadshot,
    addAuditionVideo: addAuditionVideo,
    uploadResume: uploadResume,
    deleteHeadshot: deleteHeadshot,
    deleteAuditionVideo: deleteAuditionVideo,
    syncActorToContacts: syncActorToContacts,
    syncAllActorsToContacts: syncAllActorsToContacts,
    getActorStats: getActorStats,
    importActorsFromCSV: importActorsFromCSV
  };

  global.ActorsService = ActorsService;
  global.actorsService = ActorsService;

  console.log('✓ Actors Service loaded');

})(typeof window !== 'undefined' ? window : global);
