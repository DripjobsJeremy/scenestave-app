/**
 * Volunteer Calendar Integration Service
 * 
 * Bridges volunteer shifts with the existing calendar system.
 * Provides sync operations and conflict detection.
 * 
 * @module volunteerCalendarService
 */

// localStorage keys
const CALENDAR_KEY = 'calendarEvents';

/**
 * Sync volunteer shift to calendar
 * @param {string} shiftId - Shift ID
 * @returns {string|null} Calendar event ID or null on error
 */
function syncShiftToCalendar(shiftId) {
  try {
    const shift = window.volunteerStorageService.getVolunteerShiftById(shiftId);
    if (!shift) {
      console.error('Shift not found:', shiftId);
      return null;
    }
    
    // Get existing calendar events
    const calendarData = localStorage.getItem(CALENDAR_KEY);
    const events = calendarData ? JSON.parse(calendarData) : [];
    
    // Check if event already exists
    const existingEvent = events.find(e => e.volunteerShiftId === shiftId);
    if (existingEvent) {
      return existingEvent.id;
    }
    
    // Create calendar event
    const calendarEvent = {
      id: generateId(),
      title: shift.title,
      date: shift.date,
      startTime: shift.startTime,
      endTime: shift.endTime,
      location: shift.location,
      type: 'volunteer',
      volunteerShiftId: shiftId,
      description: shift.instructions || '',
      createdAt: Date.now()
    };
    
    events.push(calendarEvent);
    localStorage.setItem(CALENDAR_KEY, JSON.stringify(events));
    
    // Update shift with event ID
    shift.eventId = calendarEvent.id;
    window.volunteerStorageService.saveVolunteerShift(shift);
    
    return calendarEvent.id;
  } catch (error) {
    console.error('Error syncing shift to calendar:', error);
    return null;
  }
}

/**
 * Create volunteer shift from calendar event
 * @param {string} eventId - Calendar event ID
 * @returns {string|null} Shift ID or null on error
 */
function syncCalendarToShift(eventId) {
  try {
    // Get calendar event
    const calendarData = localStorage.getItem(CALENDAR_KEY);
    const events = calendarData ? JSON.parse(calendarData) : [];
    const event = events.find(e => e.id === eventId);
    
    if (!event) {
      console.error('Calendar event not found:', eventId);
      return null;
    }
    
    // Check if shift already exists for this event
    const shifts = window.volunteerStorageService.getVolunteerShifts();
    const existingShift = shifts.find(s => s.eventId === eventId);
    if (existingShift) {
      return existingShift.id;
    }
    
    // Create new shift
    const shift = {
      opportunityId: '', // Must be set by user
      eventId: eventId,
      eventType: event.type || 'general',
      title: event.title,
      date: event.date,
      startTime: event.startTime || '09:00',
      endTime: event.endTime || '17:00',
      location: event.location || '',
      slotsNeeded: 1,
      slotsFilled: 0,
      assignments: [],
      requirements: [],
      instructions: event.description || '',
      contactPerson: '',
      contactEmail: '',
      isPublic: false,
      status: 'open'
    };
    
    const savedShift = window.volunteerStorageService.saveVolunteerShift(shift);
    return savedShift ? savedShift.id : null;
  } catch (error) {
    console.error('Error syncing calendar to shift:', error);
    return null;
  }
}

/**
 * Get volunteer calendar events for a date range
 * @param {string} volunteerId - Volunteer contact ID
 * @param {string} startDate - Start date (ISO format)
 * @param {string} endDate - End date (ISO format)
 * @returns {Array<Object>} Array of calendar-compatible event objects
 */
function getVolunteerCalendarEvents(volunteerId, startDate, endDate) {
  try {
    const shifts = window.volunteerStorageService.getVolunteerShifts();
    
    const volunteerShifts = shifts.filter(shift => {
      // Check if volunteer is assigned
      const hasAssignment = shift.assignments.some(a => a.volunteerId === volunteerId);
      
      // Check if within date range
      const inRange = shift.date >= startDate && shift.date <= endDate;
      
      return hasAssignment && inRange;
    });
    
    // Convert to calendar event format
    return volunteerShifts.map(shift => {
      const assignment = shift.assignments.find(a => a.volunteerId === volunteerId);
      
      return {
        id: shift.id,
        title: shift.title,
        date: shift.date,
        startTime: shift.startTime,
        endTime: shift.endTime,
        location: shift.location,
        type: 'volunteer',
        status: assignment?.status || 'pending',
        description: shift.instructions,
        volunteerShiftId: shift.id,
        color: getStatusColor(assignment?.status)
      };
    });
  } catch (error) {
    console.error('Error getting volunteer calendar events:', error);
    return [];
  }
}

/**
 * Check for volunteer scheduling conflicts
 * @param {string} volunteerId - Volunteer contact ID
 * @param {string} date - Date (ISO format)
 * @param {string} startTime - Start time (HH:MM)
 * @param {string} endTime - End time (HH:MM)
 * @returns {Array<{type: string, id: string, title: string, time: string}>} Array of conflicts
 */
function checkVolunteerConflicts(volunteerId, date, startTime, endTime) {
  try {
    const conflicts = [];
    
    // Check volunteer shifts
    const shifts = window.volunteerStorageService.getVolunteerShifts();
    const volunteerShifts = shifts.filter(shift => 
      shift.date === date &&
      shift.assignments.some(a => 
        a.volunteerId === volunteerId && 
        ['confirmed', 'pending'].includes(a.status)
      )
    );
    
    volunteerShifts.forEach(shift => {
      if (hasTimeOverlap(startTime, endTime, shift.startTime, shift.endTime)) {
        conflicts.push({
          type: 'shift',
          id: shift.id,
          title: shift.title,
          time: `${shift.startTime} - ${shift.endTime}`
        });
      }
    });
    
    // Check calendar events (if calendar system exists)
    try {
      const calendarData = localStorage.getItem(CALENDAR_KEY);
      if (calendarData) {
        const events = JSON.parse(calendarData);
        const dateEvents = events.filter(e => e.date === date);
        
        dateEvents.forEach(event => {
          if (hasTimeOverlap(startTime, endTime, event.startTime, event.endTime)) {
            conflicts.push({
              type: 'calendar',
              id: event.id,
              title: event.title,
              time: `${event.startTime} - ${event.endTime}`
            });
          }
        });
      }
    } catch (calendarError) {
      // Calendar system may not exist, ignore
    }
    
    return conflicts;
  } catch (error) {
    console.error('Error checking volunteer conflicts:', error);
    return [];
  }
}

/**
 * Remove volunteer shift from calendar
 * @param {string} shiftId - Shift ID
 * @returns {boolean} Success status
 */
function removeVolunteerShiftFromCalendar(shiftId) {
  try {
    const shift = window.volunteerStorageService.getVolunteerShiftById(shiftId);
    if (!shift || !shift.eventId) {
      return false;
    }
    
    // Get calendar events
    const calendarData = localStorage.getItem(CALENDAR_KEY);
    if (!calendarData) {
      return false;
    }
    
    const events = JSON.parse(calendarData);
    const filtered = events.filter(e => e.id !== shift.eventId);
    
    localStorage.setItem(CALENDAR_KEY, JSON.stringify(filtered));
    
    // Clear eventId from shift
    shift.eventId = null;
    window.volunteerStorageService.saveVolunteerShift(shift);
    
    return true;
  } catch (error) {
    console.error('Error removing shift from calendar:', error);
    return false;
  }
}

/**
 * Sync all volunteer shifts to calendar
 * @returns {number} Number of shifts synced
 */
function syncAllShiftsToCalendar() {
  try {
    const shifts = window.volunteerStorageService.getVolunteerShifts();
    let synced = 0;
    
    shifts.forEach(shift => {
      if (!shift.eventId && shift.isPublic) {
        const eventId = syncShiftToCalendar(shift.id);
        if (eventId) synced++;
      }
    });
    
    return synced;
  } catch (error) {
    console.error('Error syncing all shifts:', error);
    return 0;
  }
}

/**
 * Get volunteer availability for a specific date
 * @param {string} volunteerId - Volunteer contact ID
 * @param {string} date - Date (ISO format)
 * @returns {boolean} True if available
 */
function isVolunteerAvailable(volunteerId, date) {
  try {
    const dateObj = new Date(date);
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dateObj.getDay()];
    
    // Get volunteer profile
    const contactsData = localStorage.getItem('contacts');
    const contacts = contactsData ? JSON.parse(contactsData) : [];
    const volunteer = contacts.find(c => c.id === volunteerId && c.isVolunteer);
    
    if (!volunteer || !volunteer.volunteerInfo) {
      return false;
    }
    
    // Check availability days
    const availableDays = volunteer.volunteerInfo.availability?.days || [];
    return availableDays.includes(dayName);
  } catch (error) {
    console.error('Error checking volunteer availability:', error);
    return false;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if two time ranges overlap
 * @param {string} start1 - First range start (HH:MM)
 * @param {string} end1 - First range end (HH:MM)
 * @param {string} start2 - Second range start (HH:MM)
 * @param {string} end2 - Second range end (HH:MM)
 * @returns {boolean} True if overlap exists
 */
function hasTimeOverlap(start1, end1, start2, end2) {
  const toMinutes = (time) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };
  
  const s1 = toMinutes(start1);
  const e1 = toMinutes(end1);
  const s2 = toMinutes(start2);
  const e2 = toMinutes(end2);
  
  return s1 < e2 && s2 < e1;
}

/**
 * Get color for assignment status
 * @param {string} status - Assignment status
 * @returns {string} Color code
 */
function getStatusColor(status) {
  const colors = {
    'pending': '#FFA500',
    'confirmed': '#4CAF50',
    'completed': '#2196F3',
    'no-show': '#F44336',
    'cancelled': '#9E9E9E'
  };
  return colors[status] || '#9E9E9E';
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
  window.volunteerCalendarService = {
    syncShiftToCalendar,
    syncCalendarToShift,
    getVolunteerCalendarEvents,
    checkVolunteerConflicts,
    removeVolunteerShiftFromCalendar,
    syncAllShiftsToCalendar,
    isVolunteerAvailable
  };
}
