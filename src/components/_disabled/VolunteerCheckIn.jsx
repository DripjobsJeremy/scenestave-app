import React, { useState, useEffect } from 'react';

// Utility functions for localStorage operations
const volunteerStorageService = {
  getVolunteer: (emailOrId) => {
    // Simulate lookup by email or ID
    const volunteers = JSON.parse(localStorage.getItem('volunteers') || '[]');
    return volunteers.find(v => v.email === emailOrId || v.id === emailOrId);
  },
  getShiftsForVolunteerToday: (volunteerId) => {
    const shifts = JSON.parse(localStorage.getItem('shifts') || '[]');
    const today = new Date().toISOString().slice(0, 10);
    return shifts.filter(s => s.volunteerId === volunteerId && s.date === today);
  },
  updateShiftAssignment: (shiftId, data) => {
    const shifts = JSON.parse(localStorage.getItem('shifts') || '[]');
    const idx = shifts.findIndex(s => s.id === shiftId);
    if (idx !== -1) {
      shifts[idx] = { ...shifts[idx], ...data };
      localStorage.setItem('shifts', JSON.stringify(shifts));
    }
  },
  updateVolunteerHours: (volunteerId, hours) => {
    const volunteers = JSON.parse(localStorage.getItem('volunteers') || '[]');
    const idx = volunteers.findIndex(v => v.id === volunteerId);
    if (idx !== -1) {
      volunteers[idx].totalHours = (volunteers[idx].totalHours || 0) + hours;
      localStorage.setItem('volunteers', JSON.stringify(volunteers));
    }
  },
  updateVolunteerShiftCount: (volunteerId, count = 1) => {
    const volunteers = JSON.parse(localStorage.getItem('volunteers') || '[]');
    const idx = volunteers.findIndex(v => v.id === volunteerId);
    if (idx !== -1) {
      volunteers[idx].shiftsCompleted = (volunteers[idx].shiftsCompleted || 0) + count;
      localStorage.setItem('volunteers', JSON.stringify(volunteers));
    }
  }
};

const VolunteerCheckIn = () => {
  // Step state
  const [step, setStep] = useState(1);
  const [lookupType, setLookupType] = useState('email');
  const [inputValue, setInputValue] = useState('');
  const [volunteer, setVolunteer] = useState(null);
  const [shiftsToday, setShiftsToday] = useState([]);
  const [selectedShift, setSelectedShift] = useState(null);
  const [error, setError] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [feedback, setFeedback] = useState({ rating: 0, comments: '' });
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    window.addEventListener('offline', () => setOffline(true));
    window.addEventListener('online', () => setOffline(false));
    return () => {
      clearInterval(timer);
      window.removeEventListener('offline', () => setOffline(true));
      window.removeEventListener('online', () => setOffline(false));
    };
  }, []);

  // Step 1: Volunteer Identification
  const handleFindShift = () => {
    setError('');
    const v = volunteerStorageService.getVolunteer(inputValue.trim());
    if (!v) {
      setError('Volunteer not found. Check your email/ID and try again');
      return;
    }
    setVolunteer(v);
    const shifts = volunteerStorageService.getShiftsForVolunteerToday(v.id);
    if (shifts.length === 0) {
      setError("You don't have any shifts scheduled for today");
      setShiftsToday([]);
      return;
    }
    setShiftsToday(shifts);
    setStep(shifts.length > 1 ? 2 : 3);
    if (shifts.length === 1) setSelectedShift(shifts[0]);
  };

  // Step 2: Select Today's Shift
  const handleSelectShift = (shift) => {
    setSelectedShift(shift);
    setStep(3);
  };

  // Step 3: Check-In/Check-Out
  const handleCheckIn = () => {
    const now = Date.now();
    volunteerStorageService.updateShiftAssignment(selectedShift.id, {
      checkInTime: now,
      status: 'in-progress'
    });
    setSelectedShift({ ...selectedShift, checkInTime: now, status: 'in-progress' });
  };
  const handleCheckOut = () => {
    const now = Date.now();
    const hours = selectedShift.checkInTime ? ((now - selectedShift.checkInTime) / 3600000) : 0;
    volunteerStorageService.updateShiftAssignment(selectedShift.id, {
      checkOutTime: now,
      status: 'completed',
      hours: Math.round(hours * 10) / 10
    });
    volunteerStorageService.updateVolunteerHours(volunteer.id, Math.round(hours * 10) / 10);
    volunteerStorageService.updateVolunteerShiftCount(volunteer.id, 1);
    setSelectedShift({ ...selectedShift, checkOutTime: now, status: 'completed', hours: Math.round(hours * 10) / 10 });
    setStep(4);
  };

  // Step 4: Feedback
  const handleFeedbackSubmit = () => {
    volunteerStorageService.updateShiftAssignment(selectedShift.id, {
      rating: feedback.rating,
      feedback: feedback.comments
    });
    setFeedback({ rating: 0, comments: '' });
  };

  // UI rendering for each step
  // ... UI code omitted for brevity ...
  return (
    <div className="volunteer-checkin-mobile">
      {/* Step 1: Volunteer Identification */}
      {step === 1 && (
        <div className="checkin-step">
          <h1>📱 Volunteer Check-In</h1>
          <h2>Quick check-in for your shift today</h2>
          <div className="lookup-tabs">
            <button onClick={() => setLookupType('email')} className={lookupType === 'email' ? 'active' : ''}>Email</button>
            <button onClick={() => setLookupType('id')} className={lookupType === 'id' ? 'active' : ''}>Volunteer ID</button>
          </div>
          <form onSubmit={e => { e.preventDefault(); handleFindShift(); }}>
            {lookupType === 'email' ? (
              <div>
                <label htmlFor="email">Enter your email</label>
                <input
                  id="email"
                  type="email"
                  autoFocus
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  placeholder="you@example.com"
                  style={{ fontSize: 20, padding: 16, width: '100%' }}
                />
              </div>
            ) : (
              <div>
                <label htmlFor="volunteerId">Enter your Volunteer ID</label>
                <input
                  id="volunteerId"
                  type="text"
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  placeholder="VOL12345"
                  style={{ fontSize: 20, padding: 16, width: '100%' }}
                />
              </div>
            )}
            <button type="submit" style={{ fontSize: 22, padding: '18px 0', width: '100%', background: '#6d28d9', color: '#fff', borderRadius: 8, marginTop: 16 }}>Find My Shift</button>
          </form>
          {error && <div className="error-message">{error}</div>}
          <div className="help-links">
            <a href="#dashboard">Check your schedule</a>
            <a href="tel:1234567890">Need help?</a>
          </div>
          {offline && <div className="offline-indicator">Working offline ✓</div>}
        </div>
      )}
      {/* Step 2: Select Today's Shift */}
      {step === 2 && (
        <div className="checkin-step">
          <h2>Select Your Shift</h2>
          {shiftsToday.map(shift => (
            <div key={shift.id} className="shift-card" style={{ fontSize: 18, padding: 16, marginBottom: 12, borderRadius: 8, background: '#f3f4f6' }}>
              <div><b>{shift.opportunityTitle}</b></div>
              <div>{shift.time} @ {shift.location}</div>
              <div>Status: <span className={`badge badge-${shift.status}`}>{shift.status}</span></div>
              <button onClick={() => handleSelectShift(shift)} style={{ fontSize: 20, padding: '14px 0', width: '100%', background: '#6d28d9', color: '#fff', borderRadius: 8, marginTop: 10 }}>Select</button>
            </div>
          ))}
        </div>
      )}
      {/* Step 3: Check-In Interface */}
      {step === 3 && selectedShift && (
        <div className="checkin-step">
          <div className="shift-info">
            <h2>{selectedShift.opportunityTitle}</h2>
            <div>{selectedShift.time} @ {selectedShift.location}</div>
            <div>Status: <span className={`badge badge-${selectedShift.status}`}>{selectedShift.status}</span></div>
            <div className="current-time" style={{ fontSize: 32, margin: '16px 0' }}>{currentTime.toLocaleTimeString()}</div>
          </div>
          {!selectedShift.checkInTime && (
            <div>
              <div>Instructions: Tap the button below when you arrive</div>
              <button onClick={handleCheckIn} style={{ fontSize: 24, padding: '22px 0', width: '100%', background: 'green', color: '#fff', borderRadius: 8, marginTop: 16 }}>Check In Now ✓</button>
            </div>
          )}
          {selectedShift.checkInTime && !selectedShift.checkOutTime && (
            <div>
              <div>✓ Checked In at {new Date(selectedShift.checkInTime).toLocaleTimeString()}</div>
              <button onClick={handleCheckOut} style={{ fontSize: 24, padding: '22px 0', width: '100%', background: 'blue', color: '#fff', borderRadius: 8, marginTop: 16 }}>Check Out Now →</button>
              <div style={{ marginTop: 12 }}>
                You've worked approximately {((Date.now() - selectedShift.checkInTime) / 3600000).toFixed(1)} hours so far
              </div>
            </div>
          )}
        </div>
      )}
      {/* Step 4: Check-Out Success & Feedback */}
      {step === 4 && selectedShift && (
        <div className="checkin-step">
          <div style={{ fontSize: 40, textAlign: 'center' }}>🎉</div>
          <h2>Thank You!</h2>
          <div>You've completed your shift</div>
          <div><b>{selectedShift.opportunityTitle}</b></div>
          <div>Date: {selectedShift.date}</div>
          <div>Check-in: {new Date(selectedShift.checkInTime).toLocaleTimeString()}</div>
          <div>Check-out: {new Date(selectedShift.checkOutTime).toLocaleTimeString()}</div>
          <div style={{ fontSize: 24, fontWeight: 'bold' }}>Total Hours: {selectedShift.hours}</div>
          <div>Your new total: {volunteer.totalHours}</div>
          <div style={{ margin: '18px 0' }}>
            <h3>How was your experience?</h3>
            <div className="star-rating">
              {[1,2,3,4,5].map(star => (
                <span key={star} style={{ fontSize: 32, cursor: 'pointer', color: feedback.rating >= star ? '#f59e42' : '#ddd' }} onClick={() => setFeedback(f => ({ ...f, rating: star }))}>★</span>
              ))}
            </div>
            <textarea
              value={feedback.comments}
              onChange={e => setFeedback(f => ({ ...f, comments: e.target.value }))}
              placeholder="Any comments or feedback?"
              maxLength={500}
              style={{ width: '100%', fontSize: 18, marginTop: 8, padding: 8, borderRadius: 6 }}
            />
            <button onClick={handleFeedbackSubmit} style={{ fontSize: 20, padding: '14px 0', width: '100%', background: '#6d28d9', color: '#fff', borderRadius: 8, marginTop: 10 }}>Submit Feedback</button>
          </div>
          <div className="action-buttons">
            <button onClick={() => window.location.href = '#dashboard'} style={{ fontSize: 20, padding: '14px 0', width: '100%', background: '#6d28d9', color: '#fff', borderRadius: 8, marginTop: 10 }}>View My Dashboard</button>
            <button onClick={() => setStep(2)} style={{ fontSize: 20, padding: '14px 0', width: '100%', background: '#6d28d9', color: '#fff', borderRadius: 8, marginTop: 10 }}>Check In to Another Shift</button>
            <button onClick={() => window.location.href = '/'} style={{ fontSize: 20, padding: '14px 0', width: '100%', background: '#e5e7eb', color: '#333', borderRadius: 8, marginTop: 10 }}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
};

window.VolunteerCheckIn = VolunteerCheckIn;
