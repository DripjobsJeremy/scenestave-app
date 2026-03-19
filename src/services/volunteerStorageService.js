/**
 * Volunteer Storage Service
 * 
 * Handles all localStorage operations for volunteer management system.
 * Provides CRUD operations and filtering for opportunities, shifts, applications, and profiles.
 * 
 * @module volunteerStorageService
 */

// localStorage keys
const STORAGE_KEYS = {
  OPPORTUNITIES: 'volunteerOpportunities',
  SHIFTS: 'volunteerShifts',
  APPLICATIONS: 'volunteerApplications',
  CONTACTS: 'contacts'
};

// ============================================================================
// VOLUNTEER OPPORTUNITIES
// ============================================================================

/**
 * Get all volunteer opportunities
 * @returns {VolunteerOpportunity[]} Array of opportunities
 */
function getVolunteerOpportunities() {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.OPPORTUNITIES);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error loading volunteer opportunities:', error);
    return [];
  }
}

/**
 * Get single volunteer opportunity by ID
 * @param {string} id - Opportunity ID
 * @returns {VolunteerOpportunity|null} Opportunity or null
 */
function getVolunteerOpportunityById(id) {
  try {
    const opportunities = getVolunteerOpportunities();
    return opportunities.find(opp => opp.id === id) || null;
  } catch (error) {
    console.error('Error loading volunteer opportunity:', error);
    return null;
  }
}

/**
 * Save volunteer opportunity (create or update)
 * @param {Partial<VolunteerOpportunity>} opportunity - Opportunity data
 * @returns {VolunteerOpportunity|null} Saved opportunity or null on error
 */
function saveVolunteerOpportunity(opportunity) {
  try {
    const opportunities = getVolunteerOpportunities();
    const existing = opportunities.find(opp => opp.id === opportunity.id);
    
    let saved;
    if (existing) {
      // Update existing
      saved = {
        ...existing,
        ...opportunity,
        updatedAt: Date.now()
      };
      const index = opportunities.findIndex(opp => opp.id === opportunity.id);
      opportunities[index] = saved;
    } else {
      // Create new
      saved = window.volunteerModels.createVolunteerOpportunity(opportunity);
      opportunities.push(saved);
    }
    
    // Validate before saving
    const validation = window.volunteerModels.validateVolunteerOpportunity(saved);
    if (!validation.valid) {
      console.error('Validation errors:', validation.errors);
      return null;
    }
    
    localStorage.setItem(STORAGE_KEYS.OPPORTUNITIES, JSON.stringify(opportunities));
    return saved;
  } catch (error) {
    console.error('Error saving volunteer opportunity:', error);
    return null;
  }
}

/**
 * Delete volunteer opportunity
 * @param {string} id - Opportunity ID
 * @returns {boolean} Success status
 */
function deleteVolunteerOpportunity(id) {
  try {
    // Check for shifts using this opportunity
    const shifts = getVolunteerShifts();
    const hasShifts = shifts.some(shift => shift.opportunityId === id);
    
    if (hasShifts) {
      console.warn('Cannot delete opportunity with existing shifts');
      return false;
    }
    
    const opportunities = getVolunteerOpportunities();
    const filtered = opportunities.filter(opp => opp.id !== id);
    localStorage.setItem(STORAGE_KEYS.OPPORTUNITIES, JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.error('Error deleting volunteer opportunity:', error);
    return false;
  }
}

/**
 * Filter opportunities by category
 * @param {string} category - Category name
 * @returns {VolunteerOpportunity[]} Filtered opportunities
 */
function filterOpportunitiesByCategory(category) {
  try {
    const opportunities = getVolunteerOpportunities();
    return opportunities.filter(opp => opp.category === category);
  } catch (error) {
    console.error('Error filtering opportunities by category:', error);
    return [];
  }
}

/**
 * Filter opportunities by active status
 * @param {boolean} isActive - Active status
 * @returns {VolunteerOpportunity[]} Filtered opportunities
 */
function filterOpportunitiesByStatus(isActive) {
  try {
    const opportunities = getVolunteerOpportunities();
    return opportunities.filter(opp => opp.isActive === isActive);
  } catch (error) {
    console.error('Error filtering opportunities by status:', error);
    return [];
  }
}

// ============================================================================
// VOLUNTEER SHIFTS
// ============================================================================

/**
 * Get all volunteer shifts
 * @returns {VolunteerShift[]} Array of shifts
 */
function getVolunteerShifts() {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SHIFTS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error loading volunteer shifts:', error);
    return [];
  }
}

/**
 * Get single volunteer shift by ID
 * @param {string} id - Shift ID
 * @returns {VolunteerShift|null} Shift or null
 */
function getVolunteerShiftById(id) {
  try {
    const shifts = getVolunteerShifts();
    return shifts.find(shift => shift.id === id) || null;
  } catch (error) {
    console.error('Error loading volunteer shift:', error);
    return null;
  }
}

/**
 * Save volunteer shift (create or update)
 * @param {Partial<VolunteerShift>} shift - Shift data
 * @returns {VolunteerShift|null} Saved shift or null on error
 */
function saveVolunteerShift(shift) {
  try {
    const shifts = getVolunteerShifts();
    const existing = shifts.find(s => s.id === shift.id);
    
    let saved;
    if (existing) {
      // Update existing
      saved = {
        ...existing,
        ...shift,
        updatedAt: Date.now()
      };
      const index = shifts.findIndex(s => s.id === shift.id);
      shifts[index] = saved;
    } else {
      // Create new
      saved = window.volunteerModels.createVolunteerShift(shift);
      shifts.push(saved);
    }
    
    // Validate before saving
    const validation = window.volunteerModels.validateVolunteerShift(saved);
    if (!validation.valid) {
      console.error('Validation errors:', validation.errors);
      return null;
    }
    
    localStorage.setItem(STORAGE_KEYS.SHIFTS, JSON.stringify(shifts));
    return saved;
  } catch (error) {
    console.error('Error saving volunteer shift:', error);
    return null;
  }
}

/**
 * Delete volunteer shift
 * @param {string} id - Shift ID
 * @returns {boolean} Success status
 */
function deleteVolunteerShift(id) {
  try {
    const shifts = getVolunteerShifts();
    const filtered = shifts.filter(shift => shift.id !== id);
    localStorage.setItem(STORAGE_KEYS.SHIFTS, JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.error('Error deleting volunteer shift:', error);
    return false;
  }
}

/**
 * Update or add shift assignment
 * @param {string} shiftId - Shift ID
 * @param {Partial<ShiftAssignment>} assignment - Assignment data
 * @returns {VolunteerShift|null} Updated shift or null on error
 */
function updateShiftAssignment(shiftId, assignment) {
  try {
    const shift = getVolunteerShiftById(shiftId);
    if (!shift) {
      console.error('Shift not found:', shiftId);
      return null;
    }
    
    const existingIndex = shift.assignments.findIndex(
      a => a.volunteerId === assignment.volunteerId
    );
    
    if (existingIndex >= 0) {
      // Update existing assignment
      shift.assignments[existingIndex] = {
        ...shift.assignments[existingIndex],
        ...assignment
      };
    } else {
      // Add new assignment
      const newAssignment = window.volunteerModels.createShiftAssignment(assignment);
      shift.assignments.push(newAssignment);
    }
    
    // Auto-update slotsFilled
    autoUpdateSlotsFilled(shiftId);
    
    return saveVolunteerShift(shift);
  } catch (error) {
    console.error('Error updating shift assignment:', error);
    return null;
  }
}

/**
 * Remove volunteer from shift
 * @param {string} shiftId - Shift ID
 * @param {string} volunteerId - Volunteer ID
 * @returns {VolunteerShift|null} Updated shift or null on error
 */
function removeShiftAssignment(shiftId, volunteerId) {
  try {
    const shift = getVolunteerShiftById(shiftId);
    if (!shift) {
      console.error('Shift not found:', shiftId);
      return null;
    }
    
    shift.assignments = shift.assignments.filter(
      a => a.volunteerId !== volunteerId
    );
    
    // Auto-update slotsFilled
    autoUpdateSlotsFilled(shiftId);
    
    return saveVolunteerShift(shift);
  } catch (error) {
    console.error('Error removing shift assignment:', error);
    return null;
  }
}

/**
 * Automatically recalculate slotsFilled from assignments
 * @param {string} shiftId - Shift ID
 * @returns {number} Updated slotsFilled count
 */
function autoUpdateSlotsFilled(shiftId) {
  try {
    const shift = getVolunteerShiftById(shiftId);
    if (!shift) return 0;
    
    // Count confirmed and completed assignments
    const filledCount = shift.assignments.filter(
      a => ['confirmed', 'completed'].includes(a.status)
    ).length;
    
    shift.slotsFilled = filledCount;
    saveVolunteerShift(shift);
    
    return filledCount;
  } catch (error) {
    console.error('Error updating slots filled:', error);
    return 0;
  }
}

/**
 * Filter shifts by date range
 * @param {string} startDate - Start date (ISO format)
 * @param {string} endDate - End date (ISO format)
 * @returns {VolunteerShift[]} Filtered shifts
 */
function filterShiftsByDateRange(startDate, endDate) {
  try {
    const shifts = getVolunteerShifts();
    return shifts.filter(shift => {
      return shift.date >= startDate && shift.date <= endDate;
    });
  } catch (error) {
    console.error('Error filtering shifts by date range:', error);
    return [];
  }
}

/**
 * Filter shifts by production
 * @param {string} productionId - Production ID
 * @returns {VolunteerShift[]} Filtered shifts
 */
function filterShiftsByProduction(productionId) {
  try {
    const shifts = getVolunteerShifts();
    return shifts.filter(shift => shift.productionId === productionId);
  } catch (error) {
    console.error('Error filtering shifts by production:', error);
    return [];
  }
}

/**
 * Filter shifts by status
 * @param {string} status - Shift status
 * @returns {VolunteerShift[]} Filtered shifts
 */
function filterShiftsByStatus(status) {
  try {
    const shifts = getVolunteerShifts();
    return shifts.filter(shift => shift.status === status);
  } catch (error) {
    console.error('Error filtering shifts by status:', error);
    return [];
  }
}

/**
 * Get all shifts for a specific volunteer
 * @param {string} volunteerId - Volunteer ID
 * @returns {VolunteerShift[]} Volunteer's shifts
 */
function getShiftsByVolunteer(volunteerId) {
  try {
    const shifts = getVolunteerShifts();
    return shifts.filter(shift => 
      shift.assignments.some(a => a.volunteerId === volunteerId)
    );
  } catch (error) {
    console.error('Error getting shifts by volunteer:', error);
    return [];
  }
}

/**
 * Get upcoming shifts for a volunteer
 * @param {string} volunteerId - Volunteer ID
 * @returns {VolunteerShift[]} Upcoming shifts
 */
function getUpcomingShifts(volunteerId) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const shifts = getShiftsByVolunteer(volunteerId);
    return shifts
      .filter(shift => shift.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch (error) {
    console.error('Error getting upcoming shifts:', error);
    return [];
  }
}

// ============================================================================
// VOLUNTEER APPLICATIONS
// ============================================================================

/**
 * Get all volunteer applications
 * @returns {VolunteerApplication[]} Array of applications
 */
function getVolunteerApplications() {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.APPLICATIONS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error loading volunteer applications:', error);
    return [];
  }
}

/**
 * Get single volunteer application by ID
 * @param {string} id - Application ID
 * @returns {VolunteerApplication|null} Application or null
 */
function getVolunteerApplicationById(id) {
  try {
    const applications = getVolunteerApplications();
    return applications.find(app => app.id === id) || null;
  } catch (error) {
    console.error('Error loading volunteer application:', error);
    return null;
  }
}

/**
 * Save volunteer application (create or update)
 * @param {Partial<VolunteerApplication>} application - Application data
 * @returns {VolunteerApplication|null} Saved application or null on error
 */
function saveVolunteerApplication(application) {
  try {
    const applications = getVolunteerApplications();
    const existing = applications.find(app => app.id === application.id);
    
    let saved;
    if (existing) {
      // Update existing
      saved = {
        ...existing,
        ...application,
        updatedAt: Date.now()
      };
      const index = applications.findIndex(app => app.id === application.id);
      applications[index] = saved;
    } else {
      // Create new
      saved = window.volunteerModels.createVolunteerApplication(application);
      applications.push(saved);
    }
    
    // Validate before saving
    const validation = window.volunteerModels.validateVolunteerApplication(saved);
    if (!validation.valid) {
      console.error('Validation errors:', validation.errors);
      return null;
    }
    
    localStorage.setItem(STORAGE_KEYS.APPLICATIONS, JSON.stringify(applications));
    return saved;
  } catch (error) {
    console.error('Error saving volunteer application:', error);
    return null;
  }
}

/**
 * Update application status
 * @param {string} id - Application ID
 * @param {string} status - New status
 * @param {string} reviewedBy - User ID who reviewed
 * @param {string} notes - Review notes
 * @returns {VolunteerApplication|null} Updated application or null on error
 */
function updateApplicationStatus(id, status, reviewedBy, notes = '') {
  try {
    const application = getVolunteerApplicationById(id);
    if (!application) {
      console.error('Application not found:', id);
      return null;
    }
    
    application.status = status;
    application.reviewedBy = reviewedBy;
    application.reviewedAt = Date.now();
    if (notes) {
      application.notes = notes;
    }
    
    return saveVolunteerApplication(application);
  } catch (error) {
    console.error('Error updating application status:', error);
    return null;
  }
}

/**
 * Filter applications by status
 * @param {string} status - Application status
 * @returns {VolunteerApplication[]} Filtered applications
 */
function filterApplicationsByStatus(status) {
  try {
    const applications = getVolunteerApplications();
    return applications.filter(app => app.status === status);
  } catch (error) {
    console.error('Error filtering applications by status:', error);
    return [];
  }
}

/**
 * Filter applications by interests
 * @param {string[]} interests - Array of opportunity IDs
 * @returns {VolunteerApplication[]} Filtered applications
 */
function filterApplicationsByInterests(interests) {
  try {
    const applications = getVolunteerApplications();
    return applications.filter(app => 
      app.interests.some(interest => interests.includes(interest))
    );
  } catch (error) {
    console.error('Error filtering applications by interests:', error);
    return [];
  }
}

/**
 * Delete volunteer application
 * @param {string} id - Application ID
 * @returns {boolean} Success status
 */
function deleteVolunteerApplication(id) {
  try {
    const applications = getVolunteerApplications();
    const filtered = applications.filter(app => app.id !== id);
    localStorage.setItem(STORAGE_KEYS.APPLICATIONS, JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.error('Error deleting volunteer application:', error);
    return false;
  }
}

// ============================================================================
// VOLUNTEER PROFILES (Contact Integration)
// ============================================================================

/**
 * Get all contacts with volunteer profiles
 * @returns {Contact[]} Array of volunteer contacts
 */
function getVolunteerProfiles() {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.CONTACTS);
    const contacts = data ? JSON.parse(data) : [];
    return contacts.filter(contact => contact.isVolunteer === true);
  } catch (error) {
    console.error('Error loading volunteer profiles:', error);
    return [];
  }
}

/**
 * Get single volunteer by contact ID
 * @param {string} contactId - Contact ID
 * @returns {Contact|null} Volunteer contact or null
 */
function getVolunteerById(contactId) {
  if (!contactId) return null;
  try {
    const data = localStorage.getItem(STORAGE_KEYS.CONTACTS);
    const contacts = data ? JSON.parse(data) : [];
    const volunteer = contacts.find(c => c.id === contactId && c.isVolunteer === true);
    return volunteer || null;
  } catch (error) {
    console.error('Error loading volunteer by ID:', error);
    return null;
  }
}

/**
 * Update volunteer profile data
 * @param {string} contactId - Contact ID
 * @param {Partial<VolunteerInfo>} volunteerInfo - Volunteer info to update
 * @returns {Contact|null} Updated contact or null on error
 */
function updateVolunteerProfile(contactId, volunteerInfo) {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.CONTACTS);
    const contacts = data ? JSON.parse(data) : [];
    const contact = contacts.find(c => c.id === contactId);
    
    if (!contact) {
      console.error('Contact not found:', contactId);
      return null;
    }
    
    contact.volunteerInfo = {
      ...contact.volunteerInfo,
      ...volunteerInfo
    };
    
    localStorage.setItem(STORAGE_KEYS.CONTACTS, JSON.stringify(contacts));
    return contact;
  } catch (error) {
    console.error('Error updating volunteer profile:', error);
    return null;
  }
}

/**
 * Link application to existing contact
 * @param {string} applicationId - Application ID
 * @param {string} contactId - Contact ID
 * @returns {boolean} Success status
 */
function linkApplicationToContact(applicationId, contactId) {
  try {
    const application = getVolunteerApplicationById(applicationId);
    if (!application) return false;
    
    application.contactId = contactId;
    saveVolunteerApplication(application);
    
    return true;
  } catch (error) {
    console.error('Error linking application to contact:', error);
    return false;
  }
}

/**
 * Convert application to new contact record
 * @param {string} applicationId - Application ID
 * @returns {Contact|null} Created contact or null on error
 */
function convertApplicationToContact(applicationId) {
  try {
    const application = getVolunteerApplicationById(applicationId);
    if (!application) {
      console.error('Application not found:', applicationId);
      return null;
    }
    
    const data = localStorage.getItem(STORAGE_KEYS.CONTACTS);
    const contacts = data ? JSON.parse(data) : [];
    
    const newContact = {
      id: generateId(),
      firstName: application.firstName,
      lastName: application.lastName,
      email: application.email,
      phone: application.phone,
      isVolunteer: true,
      volunteerInfo: {
        applicationId: application.id,
        startDate: Date.now(),
        status: 'active',
        interests: application.interests,
        skills: application.skills,
        availability: application.availability,
        totalHours: 0,
        shiftsCompleted: 0,
        shiftsNoShow: 0,
        lastShiftDate: null,
        emergencyContact: application.emergencyContact,
        notes: '',
        backgroundCheckDate: null,
        backgroundCheckStatus: application.agreeToBackground ? 'pending' : 'not-required',
        orientationCompleted: false,
        orientationDate: null,
        waiversSigned: []
      },
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    contacts.push(newContact);
    localStorage.setItem(STORAGE_KEYS.CONTACTS, JSON.stringify(contacts));
    
    // Link application to contact
    linkApplicationToContact(applicationId, newContact.id);
    
    return newContact;
  } catch (error) {
    console.error('Error converting application to contact:', error);
    return null;
  }
}

/**
 * Add hours to volunteer's total
 * @param {string} contactId - Contact ID
 * @param {number} hoursToAdd - Hours to add
 * @returns {Contact|null} Updated contact or null on error
 */
function updateVolunteerHours(contactId, hoursToAdd) {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.CONTACTS);
    const contacts = data ? JSON.parse(data) : [];
    const contact = contacts.find(c => c.id === contactId);
    
    if (!contact || !contact.isVolunteer) {
      console.error('Volunteer contact not found:', contactId);
      return null;
    }
    
    contact.volunteerInfo.totalHours += hoursToAdd;
    localStorage.setItem(STORAGE_KEYS.CONTACTS, JSON.stringify(contacts));
    
    return contact;
  } catch (error) {
    console.error('Error updating volunteer hours:', error);
    return null;
  }
}

/**
 * Increment shift count for volunteer
 * @param {string} contactId - Contact ID
 * @param {boolean} completed - True if completed, false if no-show
 * @returns {Contact|null} Updated contact or null on error
 */
function incrementShiftCount(contactId, completed = true) {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.CONTACTS);
    const contacts = data ? JSON.parse(data) : [];
    const contact = contacts.find(c => c.id === contactId);
    
    if (!contact || !contact.isVolunteer) {
      console.error('Volunteer contact not found:', contactId);
      return null;
    }
    
    if (completed) {
      contact.volunteerInfo.shiftsCompleted += 1;
    } else {
      contact.volunteerInfo.shiftsNoShow += 1;
    }
    
    contact.volunteerInfo.lastShiftDate = Date.now();
    localStorage.setItem(STORAGE_KEYS.CONTACTS, JSON.stringify(contacts));
    
    return contact;
  } catch (error) {
    console.error('Error incrementing shift count:', error);
    return null;
  }
}

/**
 * Simple ID generator (UUID v4 alternative)
 * @returns {string} Unique ID
 */
function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Expose to window for browser use
if (typeof window !== 'undefined') {
  window.volunteerStorageService = {
    getVolunteerOpportunities,
    getVolunteerOpportunityById,
    saveVolunteerOpportunity,
    deleteVolunteerOpportunity,
    filterOpportunitiesByCategory,
    filterOpportunitiesByStatus,
    getVolunteerShifts,
    getVolunteerShiftById,
    saveVolunteerShift,
    deleteVolunteerShift,
    updateShiftAssignment,
    removeShiftAssignment,
    autoUpdateSlotsFilled,
    filterShiftsByDateRange,
    filterShiftsByProduction,
    filterShiftsByStatus,
    getShiftsByVolunteer,
    getUpcomingShifts,
    getVolunteerApplications,
    getVolunteerApplicationById,
    saveVolunteerApplication,
    updateApplicationStatus,
    filterApplicationsByStatus,
    filterApplicationsByInterests,
    deleteVolunteerApplication,
    getVolunteerProfiles,
    getVolunteerById,
    updateVolunteerProfile,
    linkApplicationToContact,
    convertApplicationToContact,
    updateVolunteerHours,
    incrementShiftCount
  };
}
