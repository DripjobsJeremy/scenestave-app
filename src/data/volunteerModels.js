/**
 * Volunteer Management Data Models
 * 
 * Defines data structures and schemas for the volunteer management system.
 * All data is stored in localStorage with proper validation and defaults.
 * 
 * @module volunteerModels
 */

/**
 * @typedef {Object} VolunteerOpportunity
 * @property {string} id - Unique identifier (UUID)
 * @property {string} title - Opportunity title (e.g., "Usher", "Box Office Assistant")
 * @property {string} description - Detailed description of the role
 * @property {string} category - Category: "Front of House", "Backstage Crew", "Administrative", "Event Support"
 * @property {string[]} requirements - Array of requirements (e.g., ["18+", "Lift 25lbs"])
 * @property {string} timeCommitment - Expected time commitment description
 * @property {boolean} isActive - Whether the opportunity is currently active
 * @property {string} createdBy - User ID who created the opportunity
 * @property {number} createdAt - Timestamp when created
 * @property {number} updatedAt - Timestamp when last updated
 */

/**
 * @typedef {Object} ShiftAssignment
 * @property {string} volunteerId - Contact ID of assigned volunteer
 * @property {string} status - "confirmed", "pending", "completed", "no-show", "cancelled"
 * @property {number} assignedAt - Timestamp when assigned
 * @property {number|null} confirmedAt - Timestamp when volunteer confirmed
 * @property {number|null} checkInTime - Timestamp when volunteer checked in
 * @property {number|null} checkOutTime - Timestamp when volunteer checked out
 * @property {string} notes - Assignment notes
 */

/**
 * @typedef {Object} VolunteerShift
 * @property {string} id - Unique identifier (UUID)
 * @property {string} opportunityId - Links to VolunteerOpportunity
 * @property {string|null} productionId - Links to production if show-specific
 * @property {string|null} eventId - Links to calendar event
 * @property {string} eventType - "performance", "rehearsal", "special_event", "general"
 * @property {string} title - Shift title (e.g., "Usher - Opening Night")
 * @property {string} date - ISO date string
 * @property {string} startTime - Time in HH:MM format (24-hour)
 * @property {string} endTime - Time in HH:MM format (24-hour)
 * @property {string} location - Location description
 * @property {number} slotsNeeded - Total volunteer slots needed
 * @property {number} slotsFilled - Current number of filled slots
 * @property {ShiftAssignment[]} assignments - Array of volunteer assignments
 * @property {string[]} requirements - Specific requirements for this shift
 * @property {string} instructions - What to bring, where to meet, etc.
 * @property {string} contactPerson - Name of contact person
 * @property {string} contactEmail - Email of contact person
 * @property {boolean} isPublic - Show on public volunteer portal
 * @property {string} status - "open", "filled", "in-progress", "completed", "cancelled"
 * @property {number} createdAt - Timestamp when created
 * @property {number} updatedAt - Timestamp when last updated
 */

/**
 * @typedef {Object} Availability
 * @property {string[]} days - Array of available days: ["monday", "wednesday", "friday"]
 * @property {string[]} times - Array of available times: ["morning", "afternoon", "evening"]
 * @property {string} frequency - "weekly", "monthly", "occasional", "one-time"
 */

/**
 * @typedef {Object} EmergencyContact
 * @property {string} name - Emergency contact name
 * @property {string} phone - Emergency contact phone
 * @property {string} relationship - Relationship to volunteer
 */

/**
 * @typedef {Object} Reference
 * @property {string} name - Reference name
 * @property {string} relationship - Relationship description
 * @property {string} phone - Reference phone number
 * @property {string} email - Reference email address
 */

/**
 * @typedef {Object} VolunteerApplication
 * @property {string} id - Unique identifier (UUID)
 * @property {string} firstName - Applicant first name
 * @property {string} lastName - Applicant last name
 * @property {string} email - Applicant email
 * @property {string} phone - Applicant phone
 * @property {string} preferredContactMethod - "email", "phone", "text"
 * @property {Availability} availability - Availability information
 * @property {string[]} interests - Array of opportunity IDs they're interested in
 * @property {string} experience - Description of relevant experience
 * @property {string[]} skills - Array of skills
 * @property {EmergencyContact} emergencyContact - Emergency contact information
 * @property {Reference[]} references - Array of references
 * @property {boolean} agreeToBackground - Whether they agree to background check
 * @property {string} status - "pending", "approved", "contacted", "rejected", "inactive"
 * @property {string|null} reviewedBy - User ID who reviewed the application
 * @property {number|null} reviewedAt - Timestamp when reviewed
 * @property {string} notes - Admin notes about the application
 * @property {string|null} contactId - Linked contact record if approved
 * @property {number} submittedAt - Timestamp when submitted
 * @property {number} updatedAt - Timestamp when last updated
 */

/**
 * @typedef {Object} WaiverSignature
 * @property {string} type - Type of waiver signed
 * @property {number} signedDate - Timestamp when signed
 */

/**
 * @typedef {Object} VolunteerInfo
 * @property {string} applicationId - Link to original application
 * @property {number} startDate - Timestamp when volunteer started
 * @property {string} status - "active", "inactive", "on-hold"
 * @property {string[]} interests - Array of opportunity IDs
 * @property {string[]} skills - Array of skills
 * @property {Availability} availability - Availability information
 * @property {number} totalHours - Total hours volunteered (calculated)
 * @property {number} shiftsCompleted - Number of completed shifts
 * @property {number} shiftsNoShow - Number of no-shows
 * @property {number|null} lastShiftDate - Timestamp of last shift
 * @property {EmergencyContact} emergencyContact - Emergency contact information
 * @property {string} notes - Admin notes about the volunteer
 * @property {number|null} backgroundCheckDate - Timestamp of background check
 * @property {string} backgroundCheckStatus - "pending", "approved", "expired"
 * @property {boolean} orientationCompleted - Whether orientation was completed
 * @property {number|null} orientationDate - Timestamp of orientation completion
 * @property {WaiverSignature[]} waiversSigned - Array of signed waivers
 */

/**
 * Creates a new volunteer opportunity with default values
 * @param {Partial<VolunteerOpportunity>} data - Opportunity data
 * @returns {VolunteerOpportunity} Complete opportunity object
 */
function createVolunteerOpportunity(data = {}) {
  const now = Date.now();
  return {
    id: data.id || generateId(),
    title: data.title || '',
    description: data.description || '',
    category: data.category || 'General',
    requirements: data.requirements || [],
    timeCommitment: data.timeCommitment || 'Flexible',
    isActive: data.isActive !== undefined ? data.isActive : true,
    createdBy: data.createdBy || 'system',
    createdAt: data.createdAt || now,
    updatedAt: data.updatedAt || now
  };
}

/**
 * Creates a new volunteer shift with default values
 * @param {Partial<VolunteerShift>} data - Shift data
 * @returns {VolunteerShift} Complete shift object
 */
function createVolunteerShift(data = {}) {
  const now = Date.now();
  return {
    id: data.id || generateId(),
    opportunityId: data.opportunityId || '',
    productionId: data.productionId || null,
    eventId: data.eventId || null,
    eventType: data.eventType || 'general',
    title: data.title || '',
    date: data.date || new Date().toISOString().split('T')[0],
    startTime: data.startTime || '09:00',
    endTime: data.endTime || '17:00',
    location: data.location || '',
    slotsNeeded: data.slotsNeeded || 1,
    slotsFilled: data.slotsFilled || 0,
    assignments: data.assignments || [],
    requirements: data.requirements || [],
    instructions: data.instructions || '',
    contactPerson: data.contactPerson || '',
    contactEmail: data.contactEmail || '',
    isPublic: data.isPublic !== undefined ? data.isPublic : true,
    status: data.status || 'open',
    createdAt: data.createdAt || now,
    updatedAt: data.updatedAt || now
  };
}

/**
 * Creates a new shift assignment with default values
 * @param {Partial<ShiftAssignment>} data - Assignment data
 * @returns {ShiftAssignment} Complete assignment object
 */
function createShiftAssignment(data = {}) {
  const now = Date.now();
  return {
    volunteerId: data.volunteerId || '',
    status: data.status || 'pending',
    assignedAt: data.assignedAt || now,
    confirmedAt: data.confirmedAt || null,
    checkInTime: data.checkInTime || null,
    checkOutTime: data.checkOutTime || null,
    notes: data.notes || ''
  };
}

/**
 * Creates a new volunteer application with default values
 * @param {Partial<VolunteerApplication>} data - Application data
 * @returns {VolunteerApplication} Complete application object
 */
function createVolunteerApplication(data = {}) {
  const now = Date.now();
  return {
    id: data.id || generateId(),
    firstName: data.firstName || '',
    lastName: data.lastName || '',
    email: data.email || '',
    phone: data.phone || '',
    preferredContactMethod: data.preferredContactMethod || 'email',
    availability: {
      days: data.availability?.days || [],
      times: data.availability?.times || [],
      frequency: data.availability?.frequency || 'occasional'
    },
    interests: data.interests || [],
    experience: data.experience || '',
    skills: data.skills || [],
    emergencyContact: {
      name: data.emergencyContact?.name || '',
      phone: data.emergencyContact?.phone || '',
      relationship: data.emergencyContact?.relationship || ''
    },
    references: data.references || [],
    agreeToBackground: data.agreeToBackground || false,
    status: data.status || 'pending',
    reviewedBy: data.reviewedBy || null,
    reviewedAt: data.reviewedAt || null,
    notes: data.notes || '',
    contactId: data.contactId || null,
    submittedAt: data.submittedAt || now,
    updatedAt: data.updatedAt || now
  };
}

/**
 * Creates volunteer info object for contact records
 * @param {Partial<VolunteerInfo>} data - Volunteer info data
 * @returns {VolunteerInfo} Complete volunteer info object
 */
function createVolunteerInfo(data = {}) {
  const now = Date.now();
  return {
    applicationId: data.applicationId || '',
    startDate: data.startDate || now,
    status: data.status || 'active',
    interests: data.interests || [],
    skills: data.skills || [],
    availability: {
      days: data.availability?.days || [],
      times: data.availability?.times || [],
      frequency: data.availability?.frequency || 'occasional'
    },
    totalHours: data.totalHours || 0,
    shiftsCompleted: data.shiftsCompleted || 0,
    shiftsNoShow: data.shiftsNoShow || 0,
    lastShiftDate: data.lastShiftDate || null,
    emergencyContact: {
      name: data.emergencyContact?.name || '',
      phone: data.emergencyContact?.phone || '',
      relationship: data.emergencyContact?.relationship || ''
    },
    notes: data.notes || '',
    backgroundCheckDate: data.backgroundCheckDate || null,
    backgroundCheckStatus: data.backgroundCheckStatus || 'pending',
    orientationCompleted: data.orientationCompleted || false,
    orientationDate: data.orientationDate || null,
    waiversSigned: data.waiversSigned || []
  };
}

/**
 * Validates a volunteer opportunity object
 * @param {VolunteerOpportunity} opportunity - Opportunity to validate
 * @returns {{valid: boolean, errors: string[]}} Validation result
 */
function validateVolunteerOpportunity(opportunity) {
  const errors = [];
  
  if (!opportunity.id) errors.push('ID is required');
  if (!opportunity.title || opportunity.title.trim() === '') errors.push('Title is required');
  if (!opportunity.category) errors.push('Category is required');
  if (!Array.isArray(opportunity.requirements)) errors.push('Requirements must be an array');
  if (typeof opportunity.isActive !== 'boolean') errors.push('isActive must be a boolean');
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates a volunteer shift object
 * @param {VolunteerShift} shift - Shift to validate
 * @returns {{valid: boolean, errors: string[]}} Validation result
 */
function validateVolunteerShift(shift) {
  const errors = [];
  
  if (!shift.id) errors.push('ID is required');
  if (!shift.opportunityId) errors.push('Opportunity ID is required');
  if (!shift.title || shift.title.trim() === '') errors.push('Title is required');
  if (!shift.date) errors.push('Date is required');
  if (!shift.startTime) errors.push('Start time is required');
  if (!shift.endTime) errors.push('End time is required');
  if (shift.slotsNeeded < 1) errors.push('Slots needed must be at least 1');
  if (shift.slotsFilled < 0) errors.push('Slots filled cannot be negative');
  if (shift.slotsFilled > shift.slotsNeeded) errors.push('Slots filled cannot exceed slots needed');
  if (!Array.isArray(shift.assignments)) errors.push('Assignments must be an array');
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates a volunteer application object
 * @param {VolunteerApplication} application - Application to validate
 * @returns {{valid: boolean, errors: string[]}} Validation result
 */
function validateVolunteerApplication(application) {
  const errors = [];
  
  if (!application.id) errors.push('ID is required');
  if (!application.firstName || application.firstName.trim() === '') errors.push('First name is required');
  if (!application.lastName || application.lastName.trim() === '') errors.push('Last name is required');
  if (!application.email || application.email.trim() === '') errors.push('Email is required');
  if (!application.email.includes('@')) errors.push('Email must be valid');
  if (!application.phone || application.phone.trim() === '') errors.push('Phone is required');
  if (!application.availability || !Array.isArray(application.availability.days)) {
    errors.push('Availability must include days array');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates volunteer info object
 * @param {VolunteerInfo} volunteerInfo - Volunteer info to validate
 * @returns {{valid: boolean, errors: string[]}} Validation result
 */
function validateVolunteerInfo(volunteerInfo) {
  const errors = [];
  
  if (volunteerInfo.totalHours < 0) errors.push('Total hours cannot be negative');
  if (volunteerInfo.shiftsCompleted < 0) errors.push('Shifts completed cannot be negative');
  if (volunteerInfo.shiftsNoShow < 0) errors.push('Shifts no-show cannot be negative');
  if (!['active', 'inactive', 'on-hold'].includes(volunteerInfo.status)) {
    errors.push('Status must be active, inactive, or on-hold');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
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

/**
 * Volunteer opportunity categories with descriptions
 */
const VOLUNTEER_CATEGORIES = [
  {
    name: 'Front of House',
    description: 'Customer-facing roles including ushers, box office, and greeters',
    defaultRequirements: ['Customer service skills', 'Professional appearance']
  },
  {
    name: 'Backstage Crew',
    description: 'Technical and stage support roles',
    defaultRequirements: ['Able to lift 25lbs', 'Follow safety protocols']
  },
  {
    name: 'Administrative',
    description: 'Office and organizational support',
    defaultRequirements: ['Computer skills', 'Attention to detail']
  },
  {
    name: 'Event Support',
    description: 'Setup, cleanup, and event logistics',
    defaultRequirements: ['Physical stamina', 'Team player']
  },
  {
    name: 'Special Events',
    description: 'One-time events and fundraisers',
    defaultRequirements: ['Flexible schedule']
  }
];

/**
 * Valid event types for volunteer shifts
 */
const EVENT_TYPES = [
  'performance',
  'rehearsal',
  'special_event',
  'general'
];

/**
 * Valid shift statuses
 */
const SHIFT_STATUSES = [
  'open',
  'filled',
  'in-progress',
  'completed',
  'cancelled'
];

/**
 * Valid assignment statuses
 */
const ASSIGNMENT_STATUSES = [
  'pending',
  'confirmed',
  'completed',
  'no-show',
  'cancelled'
];

/**
 * Valid application statuses
 */
const APPLICATION_STATUSES = [
  'pending',
  'approved',
  'contacted',
  'rejected',
  'inactive'
];

/**
 * Valid volunteer statuses
 */
const VOLUNTEER_STATUSES = [
  'active',
  'inactive',
  'on-hold'
];

// Expose to window for browser use
if (typeof window !== 'undefined') {
  window.volunteerModels = {
    createVolunteerOpportunity,
    createVolunteerShift,
    createShiftAssignment,
    createVolunteerApplication,
    createVolunteerInfo,
    validateVolunteerOpportunity,
    validateVolunteerShift,
    validateVolunteerApplication,
    validateVolunteerInfo,
    VOLUNTEER_CATEGORIES,
    EVENT_TYPES,
    SHIFT_STATUSES,
    ASSIGNMENT_STATUSES,
    APPLICATION_STATUSES,
    VOLUNTEER_STATUSES
  };
}
