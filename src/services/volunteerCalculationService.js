/**
 * Volunteer Calculation Service
 * 
 * Provides metrics calculations and analytics for volunteer management.
 * All calculations work from localStorage data only.
 * 
 * @module volunteerCalculationService
 */

/**
 * Calculate total hours worked by a volunteer
 * @param {string} volunteerId - Volunteer contact ID
 * @returns {number} Total hours (formatted to 1 decimal)
 */
function calculateVolunteerHours(volunteerId) {
  try {
    const shifts = window.volunteerStorageService.getVolunteerShifts();
    
    // Handle both shift structures:
    // 1. New structure: shift.assignments array
    // 2. Legacy structure: direct volunteerId property
    const relevantShifts = shifts.filter(shift => {
      // Check if shift has assignments array (new structure)
      if (shift.assignments && Array.isArray(shift.assignments)) {
        return shift.assignments.some(
          a => a.volunteerId === volunteerId && a.status === 'completed'
        );
      }
      // Check if shift has direct volunteerId property (legacy structure)
      if (shift.volunteerId === volunteerId && shift.status === 'completed') {
        return true;
      }
      return false;
    });

    // Calculate total hours
    let totalHours = 0;
    relevantShifts.forEach(shift => {
      // New structure: find assignment and calculate from check-in/out times
      if (shift.assignments && Array.isArray(shift.assignments)) {
        const assignment = shift.assignments.find(
          a => a.volunteerId === volunteerId && a.status === 'completed'
        );
        if (assignment && assignment.checkInTime && assignment.checkOutTime) {
          const hours = (assignment.checkOutTime - assignment.checkInTime) / (1000 * 60 * 60);
          totalHours += hours;
        }
      }
      // Legacy structure: use duration property directly
      else if (shift.duration) {
        totalHours += shift.duration;
      }
    });
    
    return Math.round(totalHours * 10) / 10;
  } catch (error) {
    console.error('Error calculating volunteer hours:', error);
    return 0;
  }
}

/**
 * Calculate total hours worked by a volunteer in a date range
 * @param {string} volunteerId
 * @param {string} [startDate] ISO start (inclusive)
 * @param {string} [endDate] ISO end (inclusive)
 * @returns {number}
 */
function calculateVolunteerHoursInRange(volunteerId, startDate, endDate) {
  try {
    const shifts = window.volunteerStorageService.getVolunteerShifts();
    let totalHours = 0;

    shifts.forEach(shift => {
      if (startDate && shift.date < startDate) return;
      if (endDate && shift.date > endDate) return;
      const assignment = shift.assignments?.find(
        a => a.volunteerId === volunteerId && a.status === 'completed'
      );
      if (assignment && assignment.checkInTime && assignment.checkOutTime) {
        totalHours += (assignment.checkOutTime - assignment.checkInTime) / (1000 * 60 * 60);
      }
    });

    return Math.round(totalHours * 10) / 10;
  } catch (error) {
    console.error('Error calculating volunteer hours in range:', error);
    return 0;
  }
}

/**
 * Count completed shifts for a volunteer, optionally within a date range
 * @param {string} volunteerId - Volunteer contact ID
 * @param {string} [startDate] - Optional ISO start date (inclusive)
 * @param {string} [endDate] - Optional ISO end date (inclusive)
 * @returns {number} Count of completed shifts
 */
function countCompletedShifts(volunteerId, startDate, endDate) {
  try {
    const shifts = window.volunteerStorageService.getVolunteerShifts();
    return shifts.reduce((count, shift) => {
      if (startDate && shift.date < startDate) return count;
      if (endDate && shift.date > endDate) return count;
      const hasCompleted = (shift.assignments || []).some(a =>
        a.volunteerId === volunteerId && a.status === 'completed' && a.checkInTime && a.checkOutTime
      );
      return count + (hasCompleted ? 1 : 0);
    }, 0);
  } catch (error) {
    console.error('Error counting completed shifts:', error);
    return 0;
  }
}

/**
 * Calculate completion rate for a volunteer
 * @param {string} volunteerId - Volunteer contact ID
 * @returns {number} Completion percentage (0-100)
 */
function calculateCompletionRate(volunteerId) {
  try {
    const volunteers = window.volunteerStorageService.getVolunteerProfiles();
    const volunteer = volunteers.find(v => v.id === volunteerId);
    
    if (!volunteer || !volunteer.volunteerInfo) {
      return 100; // Default to 100% if no data
    }
    
    const { shiftsCompleted = 0, shiftsNoShow = 0 } = volunteer.volunteerInfo;
    const total = shiftsCompleted + shiftsNoShow;
    
    if (total === 0) {
      return 100; // No shifts yet, return 100%
    }
    
    return Math.round((shiftsCompleted / total) * 100);
  } catch (error) {
    console.error('Error calculating completion rate:', error);
    return 0;
  }
}

/**
 * Get top volunteers by hours worked
 * @param {number} limit - Number of volunteers to return (default 10)
 * @returns {Array<{id: string, name: string, hours: number}>} Leaderboard array
 */
function getTopVolunteers(limit = 10) {
  try {
    const volunteers = window.volunteerStorageService.getVolunteerProfiles();
    const shifts = window.volunteerStorageService.getVolunteerShifts();
    const leaderboard = volunteers
      .map(volunteer => {
        // Derive hours from completed assignments with check-in/out to match other reports
        let totalHours = 0;
        shifts.forEach(shift => {
          const a = shift.assignments?.find(x => x.volunteerId === volunteer.id && x.status === 'completed');
          if (a && a.checkInTime && a.checkOutTime) {
            totalHours += (a.checkOutTime - a.checkInTime) / (1000 * 60 * 60);
          }
        });
        totalHours = Math.round(totalHours * 10) / 10;
        return {
          id: volunteer.id,
          name: `${volunteer.firstName || ''} ${volunteer.lastName || ''}`.trim(),
          hours: totalHours
        };
      })
      .filter(v => v.hours > 0)
      .sort((a, b) => b.hours - a.hours)
      .slice(0, limit);
    
    return leaderboard;
  } catch (error) {
    console.error('Error getting top volunteers:', error);
    return [];
  }
}

/**
 * Get top volunteers by hours within a date range
 * @param {number} [limit]
 * @param {string} [startDate]
 * @param {string} [endDate]
 * @returns {Array<{id:string,name:string,hours:number}>}
 */
function getTopVolunteersInRange(limit = 10, startDate, endDate) {
  try {
    const volunteers = window.volunteerStorageService.getVolunteerProfiles();
    const shifts = window.volunteerStorageService.getVolunteerShifts();
    const leaderboard = volunteers
      .map(volunteer => {
        let totalHours = 0;
        shifts.forEach(shift => {
          if (startDate && shift.date < startDate) return;
          if (endDate && shift.date > endDate) return;
          const a = shift.assignments?.find(x => x.volunteerId === volunteer.id && x.status === 'completed');
          if (a && a.checkInTime && a.checkOutTime) {
            totalHours += (a.checkOutTime - a.checkInTime) / (1000 * 60 * 60);
          }
        });
        totalHours = Math.round(totalHours * 10) / 10;
        return {
          id: volunteer.id,
          name: `${volunteer.firstName || ''} ${volunteer.lastName || ''}`.trim(),
          hours: totalHours
        };
      })
      .filter(v => v.hours > 0)
      .sort((a, b) => b.hours - a.hours)
      .slice(0, limit);
    return leaderboard;
  } catch (error) {
    console.error('Error getting top volunteers in range:', error);
    return [];
  }
}

/**
 * Calculate shift coverage percentage
 * @param {string} shiftId - Shift ID
 * @returns {number} Coverage percentage (0-100)
 */
function calculateShiftCoverage(shiftId) {
  try {
    const shifts = window.volunteerStorageService.getVolunteerShifts();
    const shift = shifts.find(s => s.id === shiftId);
    
    if (!shift || shift.slotsNeeded === 0) {
      return 0;
    }
    
    return Math.round((shift.slotsFilled / shift.slotsNeeded) * 100);
  } catch (error) {
    console.error('Error calculating shift coverage:', error);
    return 0;
  }
}

/**
 * Calculate volunteer retention statistics
 * @returns {{total: number, active: number, inactive: number, retentionRate: number}} Retention stats
 */
function calculateVolunteerRetention() {
  try {
    const volunteers = window.volunteerStorageService.getVolunteerProfiles();
    const total = volunteers.length;
    const active = volunteers.filter(
      v => v.volunteerInfo?.status === 'active'
    ).length;
    const inactive = total - active;
    const retentionRate = total > 0 ? Math.round((active / total) * 100) : 0;
    
    return {
      total,
      active,
      inactive,
      retentionRate
    };
  } catch (error) {
    console.error('Error calculating retention:', error);
    return { total: 0, active: 0, inactive: 0, retentionRate: 0 };
  }
}

/**
 * Get volunteer hours broken down by opportunity category
 * @param {string} volunteerId - Volunteer contact ID
 * @returns {Object} Hours by category (e.g., { "Front of House": 45, "Backstage Crew": 30 })
 */
function getHoursByCategory(volunteerId) {
  try {
    const shifts = window.volunteerStorageService.getVolunteerShifts();
    const opportunities = window.volunteerStorageService.getVolunteerOpportunities();
    const categoryHours = {};
    
    shifts.forEach(shift => {
      const assignment = shift.assignments.find(
        a => a.volunteerId === volunteerId && a.status === 'completed'
      );
      
      if (assignment && assignment.checkInTime && assignment.checkOutTime) {
        const hours = (assignment.checkOutTime - assignment.checkInTime) / (1000 * 60 * 60);
        const opportunity = opportunities.find(o => o.id === shift.opportunityId);
        const category = opportunity?.category || 'Other';
        
        categoryHours[category] = (categoryHours[category] || 0) + hours;
      }
    });
    
    // Round all values to 1 decimal
    Object.keys(categoryHours).forEach(key => {
      categoryHours[key] = Math.round(categoryHours[key] * 10) / 10;
    });
    
    return categoryHours;
  } catch (error) {
    console.error('Error getting hours by category:', error);
    return {};
  }
}

/**
 * Get volunteer hours by category within a date range
 * @param {string} volunteerId
 * @param {string} [startDate]
 * @param {string} [endDate]
 * @returns {Object}
 */
function getHoursByCategoryInRange(volunteerId, startDate, endDate) {
  try {
    const shifts = window.volunteerStorageService.getVolunteerShifts();
    const opportunities = window.volunteerStorageService.getVolunteerOpportunities();
    const categoryHours = {};

    shifts.forEach(shift => {
      if (startDate && shift.date < startDate) return;
      if (endDate && shift.date > endDate) return;
      const assignment = shift.assignments?.find(
        a => a.volunteerId === volunteerId && a.status === 'completed'
      );
      if (assignment && assignment.checkInTime && assignment.checkOutTime) {
        const hours = (assignment.checkOutTime - assignment.checkInTime) / (1000 * 60 * 60);
        const opportunity = opportunities.find(o => o.id === shift.opportunityId);
        const category = opportunity?.category || 'Other';
        categoryHours[category] = (categoryHours[category] || 0) + hours;
      }
    });

    Object.keys(categoryHours).forEach(key => {
      categoryHours[key] = Math.round(categoryHours[key] * 10) / 10;
    });
    return categoryHours;
  } catch (error) {
    console.error('Error getting hours by category in range:', error);
    return {};
  }
}

/**
 * Analyze peak volunteer activity times
 * @returns {{peakDay: string, peakTime: string, distribution: Object}} Activity analysis
 */
function getPeakVolunteerTimes() {
  try {
    const shifts = window.volunteerStorageService.getVolunteerShifts();
    const completedShifts = shifts.filter(s => s.status === 'completed');
    
    const dayCount = {};
    const timeCount = {};
    
    completedShifts.forEach(shift => {
      // Get day of week
      const date = new Date(shift.date);
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const day = dayNames[date.getDay()];
      dayCount[day] = (dayCount[day] || 0) + 1;
      
      // Get time of day
      const hour = parseInt(shift.startTime.split(':')[0]);
      let timeOfDay;
      if (hour < 12) timeOfDay = 'morning';
      else if (hour < 17) timeOfDay = 'afternoon';
      else timeOfDay = 'evening';
      
      timeCount[timeOfDay] = (timeCount[timeOfDay] || 0) + 1;
    });
    
    // Find peaks
    const peakDay = Object.keys(dayCount).reduce((a, b) => 
      dayCount[a] > dayCount[b] ? a : b, 'monday'
    );
    
    const peakTime = Object.keys(timeCount).reduce((a, b) => 
      timeCount[a] > timeCount[b] ? a : b, 'evening'
    );
    
    return {
      peakDay,
      peakTime,
      distribution: {
        byDay: dayCount,
        byTime: timeCount
      }
    };
  } catch (error) {
    console.error('Error analyzing peak times:', error);
    return {
      peakDay: 'unknown',
      peakTime: 'unknown',
      distribution: { byDay: {}, byTime: {} }
    };
  }
}

/**
 * Calculate total organization volunteer hours for a date range
 * @param {string} startDate - Start date (ISO format)
 * @param {string} endDate - End date (ISO format)
 * @returns {number} Total hours (formatted to 1 decimal)
 */
function calculateTotalOrganizationHours(startDate, endDate) {
  try {
    const shifts = window.volunteerStorageService.getVolunteerShifts();
    let totalHours = 0;
    
    shifts.forEach(shift => {
      if (shift.date >= startDate && shift.date <= endDate) {
        shift.assignments.forEach(assignment => {
          if (assignment.status === 'completed' && 
              assignment.checkInTime && 
              assignment.checkOutTime) {
            const hours = (assignment.checkOutTime - assignment.checkInTime) / (1000 * 60 * 60);
            totalHours += hours;
          }
        });
      }
    });
    
    return Math.round(totalHours * 10) / 10;
  } catch (error) {
    console.error('Error calculating total organization hours:', error);
    return 0;
  }
}

/**
 * Get detailed volunteer statistics
 * @param {string} volunteerId - Volunteer contact ID
 * @returns {Object} Detailed stats object
 */
function getVolunteerStats(volunteerId) {
  try {
    const volunteers = window.volunteerStorageService.getVolunteerProfiles();
    const volunteer = volunteers.find(v => v.id === volunteerId);
    
    if (!volunteer) {
      return null;
    }
    
    return {
      id: volunteer.id,
      name: `${volunteer.firstName || ''} ${volunteer.lastName || ''}`.trim(),
      totalHours: calculateVolunteerHours(volunteerId),
      completionRate: calculateCompletionRate(volunteerId),
      shiftsCompleted: volunteer.volunteerInfo?.shiftsCompleted || 0,
      shiftsNoShow: volunteer.volunteerInfo?.shiftsNoShow || 0,
      lastShiftDate: volunteer.volunteerInfo?.lastShiftDate || null,
      hoursByCategory: getHoursByCategory(volunteerId),
      status: volunteer.volunteerInfo?.status || 'unknown'
    };
  } catch (error) {
    console.error('Error getting volunteer stats:', error);
    return null;
  }
}

/**
 * Calculate average hours per shift for a volunteer
 * @param {string} volunteerId - Volunteer contact ID
 * @returns {number} Average hours per shift
 */
function calculateAverageHoursPerShift(volunteerId) {
  try {
    const volunteers = window.volunteerStorageService.getVolunteerProfiles();
    const volunteer = volunteers.find(v => v.id === volunteerId);
    
    if (!volunteer || !volunteer.volunteerInfo) {
      return 0;
    }
    
    const totalHours = calculateVolunteerHours(volunteerId);
    const shiftsCompleted = volunteer.volunteerInfo.shiftsCompleted || 0;
    
    if (shiftsCompleted === 0) {
      return 0;
    }
    
    return Math.round((totalHours / shiftsCompleted) * 10) / 10;
  } catch (error) {
    console.error('Error calculating average hours per shift:', error);
    return 0;
  }
}

/**
 * Get shifts needing coverage (unfilled positions)
 * @param {number} daysAhead - Look ahead this many days (default 30)
 * @returns {Array<{shift: Object, slotsNeeded: number, coverage: number}>} Shifts needing volunteers
 */
function getShiftsNeedingCoverage(daysAhead = 30) {
  try {
    const shifts = window.volunteerStorageService.getVolunteerShifts();
    const today = new Date();
    const futureDate = new Date(today.getTime() + (daysAhead * 24 * 60 * 60 * 1000));
    const todayStr = today.toISOString().split('T')[0];
    const futureStr = futureDate.toISOString().split('T')[0];
    
    return shifts
      .filter(shift => 
        shift.date >= todayStr && 
        shift.date <= futureStr &&
        shift.status === 'open' &&
        shift.slotsFilled < shift.slotsNeeded
      )
      .map(shift => ({
        shift,
        slotsNeeded: shift.slotsNeeded - shift.slotsFilled,
        coverage: calculateShiftCoverage(shift.id)
      }))
      .sort((a, b) => new Date(a.shift.date) - new Date(b.shift.date));
  } catch (error) {
    console.error('Error getting shifts needing coverage:', error);
    return [];
  }
}

// Expose to window for browser use
if (typeof window !== 'undefined') {
  window.volunteerCalculationService = {
    calculateVolunteerHours,
    calculateVolunteerHoursInRange,
    countCompletedShifts,
    calculateCompletionRate,
    getTopVolunteers,
    getTopVolunteersInRange,
    calculateShiftCoverage,
    calculateVolunteerRetention,
    getHoursByCategory,
    getHoursByCategoryInRange,
    getPeakVolunteerTimes,
    calculateTotalOrganizationHours,
    getVolunteerStats,
    calculateAverageHoursPerShift,
    getShiftsNeedingCoverage
  };
}
