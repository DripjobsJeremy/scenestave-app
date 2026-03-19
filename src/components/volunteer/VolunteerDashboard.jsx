/**
 * VolunteerDashboard.jsx
 * Sprint 2 - Admin Interface: Main landing dashboard for volunteer management.
 * Provides overview stats, quick actions, recent activity feed, and alert panels.
 * Uses global volunteer services (attached on window by volunteerGlobals.js) to access data.
 */

const { useState, useEffect, useMemo, useRef } = React;
// Import modal components
const VolunteerShiftScheduler = window.VolunteerShiftScheduler;

const VolunteerDashboard = ({ userRole = 'Admin', onNavigate = () => {} }) => {
  // Permission check
  const allowedRoles = new Set(['Admin', 'Board Admin', 'Stage Manager']);
  const authorized = allowedRoles.has(userRole);

  // Loading & data state
  const [loading, setLoading] = useState(true);
  const [opportunities, setOpportunities] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [applications, setApplications] = useState([]);
  const [volunteers, setVolunteers] = useState([]);

  // Calculated values
  const upcomingShiftsLength = shifts.length;
  const [showShiftScheduler, setShowShiftScheduler] = useState(false);

  // Helper components

  // Quick Action Card for dashboard shortcuts
  const ActionCard = ({ label, icon, onClick }) => {
    return (
      <button
        onClick={onClick}
        className="rounded-lg border border-gray-200 bg-white p-4 shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400"
        aria-label={label}
      >
        <div className="text-3xl mb-2" aria-hidden="true">{icon}</div>
        <div className="text-xs font-medium uppercase tracking-wide text-gray-600">{label}</div>
      </button>
    );
  };

  // Alerts dismiss state (persisted)
  const [dismissedAlerts, setDismissedAlerts] = useState(() => {
    try { return JSON.parse(localStorage.getItem('volunteer_dashboard_dismissed_alerts')) || {}; } catch { return {}; }
  });

  const dismissAlert = (key) => {
    setDismissedAlerts(prev => {
      const updated = { ...prev, [key]: true };
      localStorage.setItem('volunteer_dashboard_dismissed_alerts', JSON.stringify(updated));
      return updated;
    });
  };

  // Fetch all required data
  useEffect(() => {
    if (!authorized) return;
    let cancelled = false;
    const load = () => {
      if (cancelled) return;
      try {
        setLoading(true);
        const storage = window.volunteerStorageService;
        if (!storage) {
          // Poll until services ready (module scripts may load asynchronously)
          setTimeout(load, 50);
          return;
        }
        setOpportunities(storage.getVolunteerOpportunities());
        setShifts(storage.getVolunteerShifts());
        setApplications(storage.getVolunteerApplications());
        setVolunteers(storage.getVolunteerProfiles());
      } catch (e) {
        console.warn('Volunteer services not ready or errored:', e);
        setTimeout(load, 100);
        return;
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [authorized]);

  // Stat calculations
  const activeVolunteersCount = useMemo(() => volunteers.filter(v => v.volunteerInfo?.status === 'active').length, [volunteers]);

  const upcomingShifts = useMemo(() => {
    const now = Date.now();
    const sevenDays = now + 7 * 24 * 60 * 60 * 1000;
    return shifts.filter(s => {
      const d = new Date(s.date).getTime();
      return d >= now && d <= sevenDays;
    });
  }, [shifts]);

  const pendingApplicationsCount = useMemo(() => applications.filter(a => a.status === 'pending').length, [applications]);

  const averageCoverage = useMemo(() => {
    if (!upcomingShifts.length) return 0;
    let total = 0;
    upcomingShifts.forEach(s => {
      if (s.slotsNeeded > 0) total += (s.slotsFilled || 0) / s.slotsNeeded;
    });
    return Math.round((total / upcomingShifts.length) * 100);
  }, [upcomingShifts]);

  const coverageColor = averageCoverage >= 80 ? 'text-green-600' : averageCoverage >= 60 ? 'text-yellow-600' : 'text-red-600';

  // Coverage trend (next 30 days) aggregated by date
  const coverageTrend = useMemo(() => {
    if (!shifts.length) return { labels: [], data: [] };
    const now = Date.now();
    const horizon = now + 30*24*60*60*1000;
    const byDate = new Map();
    shifts.forEach(s => {
      const dt = new Date(s.date);
      const time = dt.getTime();
      if (isNaN(time) || time < now || time > horizon) return;
      const key = dt.toISOString().slice(0,10); // YYYY-MM-DD
      let entry = byDate.get(key);
      if (!entry) {
        entry = { total:0, count:0 };
        byDate.set(key, entry);
      }
      if (s.slotsNeeded > 0) {
        entry.total += (s.slotsFilled || 0) / s.slotsNeeded;
        entry.count += 1;
      }
    });
    const labels = Array.from(byDate.keys()).sort();
    const data = labels.map(l => {
      const e = byDate.get(l);
      return Math.round((e.total / (e.count || 1)) * 100);
    });
    return { labels, data };
  }, [shifts]);

  // Volunteer hours distribution (top 10 by total hours)
  const hoursDistribution = useMemo(() => {
    if (!volunteers.length) return { labels: [], data: [] };
    const sorted = [...volunteers]
      .map(v => ({
        name: `${v.firstName || ''} ${v.lastName || ''}`.trim() || 'Volunteer',
        hours: v.volunteerInfo?.totalHours || 0
      }))
      .sort((a,b) => b.hours - a.hours)
      .slice(0,10);
    return { labels: sorted.map(s => s.name), data: sorted.map(s => s.hours) };
  }, [volunteers]);

  // Chart refs
  const coverageCanvasRef = useRef(null);
  const hoursCanvasRef = useRef(null);
  const coverageChartRef = useRef(null);
  const hoursChartRef = useRef(null);

  // Instantiate / update charts
  useEffect(() => {
    // Guard: Chart.js may not be loaded yet
    if (typeof Chart === 'undefined') return;

    // Coverage Trend Chart
    if (coverageCanvasRef.current) {
      if (coverageChartRef.current) {
        coverageChartRef.current.destroy();
      }
      if (coverageTrend.labels.length) {
        coverageChartRef.current = new Chart(coverageCanvasRef.current.getContext('2d'), {
          type: 'line',
          data: {
            labels: coverageTrend.labels,
            datasets: [{
              label: 'Daily Coverage %',
              data: coverageTrend.data,
              tension: 0.3,
              borderColor: 'rgba(99,102,241,0.9)',
              backgroundColor: 'rgba(99,102,241,0.2)',
              fill: true,
              pointRadius: 3,
              pointBackgroundColor: 'rgba(99,102,241,1)'
            }]
          },
          options: {
            responsive: true,
            scales: {
              y: { beginAtZero: true, max: 100, ticks: { callback: v => v + '%' } }
            },
            plugins: {
              legend: { display: false },
              tooltip: { callbacks: { label: ctx => ctx.parsed.y + '%' } }
            }
          }
        });
      }
    }

    // Hours Distribution Chart
    if (hoursCanvasRef.current) {
      if (hoursChartRef.current) {
        hoursChartRef.current.destroy();
      }
      if (hoursDistribution.labels.length) {
        hoursChartRef.current = new Chart(hoursCanvasRef.current.getContext('2d'), {
          type: 'bar',
          data: {
            labels: hoursDistribution.labels,
            datasets: [{
              label: 'Total Hours',
              data: hoursDistribution.data,
              backgroundColor: 'rgba(16,185,129,0.7)',
              borderColor: 'rgba(16,185,129,1)',
              borderWidth: 1
            }]
          },
          options: {
            responsive: true,
            scales: {
              y: { beginAtZero: true }
            },
            plugins: {
              legend: { display: false }
            }
          }
        });
      }
    }

    return () => {
      if (coverageChartRef.current) coverageChartRef.current.destroy();
      if (hoursChartRef.current) hoursChartRef.current.destroy();
    };
  }, [coverageTrend, hoursDistribution]);

  // Recent activity feed (simplified MVP): applications + completed shifts + milestones
  const recentActivity = useMemo(() => {
    const events = [];
    applications.slice(-20).forEach(app => {
      events.push({
        type: 'application',
        message: `New application from ${app.firstName} ${app.lastName}`,
        timestamp: app.submittedAt || app.createdAt || Date.now()
      });
    });
    shifts.forEach(shift => {
      if (Array.isArray(shift.assignments)) {
        shift.assignments.forEach(asg => {
          if (asg.status === 'completed') {
            events.push({
              type: 'completion',
              message: `${asg.volunteerName || 'Volunteer'} completed ${shift.title || 'Shift'}`,
              timestamp: asg.checkOutTime || asg.checkInTime || shift.updatedAt || Date.now()
            });
          }
        });
      }
    });
    volunteers.forEach(v => {
      const hours = v.volunteerInfo?.totalHours || 0;
      const milestone = hours >= 1000 ? '1000 hours!' : hours >= 500 ? '500 hours!' : hours >= 250 ? '250 hours!' : hours >= 100 ? '100 hours!' : hours >= 50 ? '50 hours!' : hours >= 25 ? '25 hours!' : null;
      if (milestone) {
        events.push({
          type: 'milestone',
          message: `${v.firstName} ${v.lastName} reached ${milestone}`,
          timestamp: v.volunteerInfo?.updatedAt || Date.now()
        });
      }
    });
    return events
      .sort((a,b) => b.timestamp - a.timestamp)
      .slice(0, 10);
  }, [applications, shifts, volunteers]);

  const relativeTime = (ts) => {
    const d = new Date(ts);
    const diffMs = Date.now() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay === 1) return 'Yesterday';
    return `${diffDay}d ago`;
  };

  // Alerts
  const unfilledUpcomingShifts = useMemo(() => upcomingShifts.filter(s => (s.slotsFilled || 0) < s.slotsNeeded), [upcomingShifts]);

  const expiringBackgroundChecks = useMemo(() => {
    const soon = Date.now() + 30*24*60*60*1000;
    return volunteers.filter(v => {
      const date = v.volunteerInfo?.backgroundCheckDate;
      if (!date) return false;
      const expiry = new Date(date).getTime() + 365*24*60*60*1000;
      return expiry <= soon;
    });
  }, [volunteers]);

  const inactiveVolunteers = useMemo(() => {
    const cutoff = Date.now() - 90*24*60*60*1000;
    return volunteers.filter(v => {
      const last = v.volunteerInfo?.lastShiftDate ? new Date(v.volunteerInfo.lastShiftDate).getTime() : null;
      return (!last || last < cutoff);
    });
  }, [volunteers]);

  if (!authorized) {
    return (
      <div className="p-6 text-center">
        <div className="text-4xl mb-4">⛔</div>
        <h1 className="text-xl font-semibold mb-2 text-gray-900">Access Restricted</h1>
        <p className="text-gray-500">You do not have permission to view the Volunteer Dashboard.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto text-gray-900" aria-label="Volunteer Dashboard">
      <header className="vol-page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 vol-page-title">Volunteer Management Dashboard</h1>
        <div className="text-sm vol-page-subtitle">Sprint 2 • Admin Interface</div>
      </header>

      {/* Overview Stats */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" aria-label="Overview Stats">
        {loading ? (
          <>
            {window.SkeletonLoaders ? (
              <>
                <window.SkeletonLoaders.Card />
                <window.SkeletonLoaders.Card />
                <window.SkeletonLoaders.Card />
                <window.SkeletonLoaders.Card />
              </>
            ) : (
              <div className="col-span-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse" aria-busy="true">
                {[1,2,3,4].map(i => <div key={i} className="h-28 bg-gray-100 rounded" />)}
              </div>
            )}
          </>
        ) : (
          <>
            <StatCard label="Active Volunteers" value={activeVolunteersCount} accent="green" onClick={() => onNavigate('roster',{ filter:'active' })} />
            <StatCard label="Upcoming Shifts" value={upcomingShiftsLength} accent="blue" onClick={() => setShowShiftScheduler(true)} />       
            <StatCard label="Pending Applications" value={pendingApplicationsCount} accent="yellow" onClick={() => onNavigate('applications',{ status:'pending' })} />
            <CoverageCard percentage={averageCoverage} onClick={() => onNavigate('shifts',{ view:'coverage' })} />
          </>
        )}
      </section>

      {/* Analytics Charts */}
      <section aria-label="Volunteer Analytics" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Coverage Trend */}
        <div className="bg-white rounded-lg shadow p-4 flex flex-col">
          <h2 className="text-lg font-semibold mb-3 text-gray-900">Coverage Trend (30 Days)</h2>
          {!coverageTrend.labels.length && (
            <div className="text-sm text-gray-500">No upcoming shift coverage data</div>
          )}
          {coverageTrend.labels.length > 0 && (
            <canvas ref={coverageCanvasRef} height="140" aria-label="Coverage Trend Line Chart" />
          )}
        </div>
        {/* Hours Distribution */}
        <div className="bg-white rounded-lg shadow p-4 flex flex-col">
          <h2 className="text-lg font-semibold mb-3 text-gray-900">Top Volunteer Hours</h2>
          {!hoursDistribution.labels.length && (
            <div className="text-sm text-gray-500">No volunteer hour data</div>
          )}
          {hoursDistribution.labels.length > 0 && (
            <canvas ref={hoursCanvasRef} height="140" aria-label="Volunteer Hours Bar Chart" />
          )}
        </div>
      </section>

      {/* Quick Actions */}
      <section aria-label="Quick Actions" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ActionCard label="Create New Opportunity" icon="➕" onClick={() => onNavigate('opportunities',{ mode:'create' })} />
        <ActionCard label="Schedule Shift" icon="📅" onClick={() => onNavigate('schedule-shift')} />
        <ActionCard label="Review Applications" icon="📋" onClick={() => onNavigate('review-applications')} />
        <ActionCard label="Volunteer Roster" icon="👥" onClick={() => onNavigate('roster')} />
      </section>

      {/* Volunteer Portal Preview Card */}
      <section aria-label="Volunteer Portal Access" className="mt-6">
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border-2 border-purple-200 p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl" aria-hidden="true">🎭</span>
                <h3 className="text-lg font-bold text-gray-900">Volunteer Portal Preview</h3>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Test the volunteer self-service portal where individual volunteers can check in, 
                view their hours, manage availability, and see their assigned shifts.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    // Create demo volunteer contact record
                    const contacts = JSON.parse(localStorage.getItem('contacts') || '[]');
                    
                    // Check if demo volunteer already exists
                    const existingDemo = contacts.find(c => c.id === 'demo-volunteer');
                    
                    if (!existingDemo) {
                      // Add demo volunteer to contacts
                      contacts.push({
                        id: 'demo-volunteer',
                        firstName: 'Demo',
                        lastName: 'Volunteer',
                        email: 'demo@showsuite.local',
                        phone: '555-0100',
                        type: 'Volunteer',
                        roles: ['Volunteer'],
                        isVolunteer: true,
                        volunteerInfo: {
                          status: 'active',
                          totalHours: 42.5,
                          skills: ['Customer Service', 'Cash Handling', 'Front of House'],
                          interests: ['Front of House', 'Box Office'],
                          lastShiftDate: Date.now() - (7 * 24 * 60 * 60 * 1000),
                          availability: {
                            monday: true,
                            tuesday: true,
                            wednesday: true,
                            thursday: true,
                            friday: true,
                            saturday: true,
                            sunday: false
                          },
                          emergencyContact: {
                            name: 'Emergency Contact',
                            phone: '555-0199',
                            relationship: 'Family'
                          },
                          backgroundCheck: {
                            completed: true,
                            date: '2024-01-15',
                            expirationDate: '2025-01-15'
                          },
                          notes: 'Demo volunteer account for testing'
                        },
                        createdAt: new Date().toISOString()
                      });
                      localStorage.setItem('contacts', JSON.stringify(contacts));
                    }
                    
                    // Create demo shift records for the volunteer
                    const shifts = JSON.parse(localStorage.getItem('volunteerShifts') || '[]');
                    
                    // Check if demo shifts already exist
                    const existingDemoShifts = shifts.filter(s => s.volunteerId === 'demo-volunteer');
                    
                    if (existingDemoShifts.length === 0) {
                      // Add 3 completed shifts (totaling 12.5 hours)
                      const now = Date.now();
                      const oneDayMs = 24 * 60 * 60 * 1000;
                      
                      shifts.push({
                        id: 'demo-shift-1',
                        volunteerId: 'demo-volunteer',
                        opportunityId: 'opp-1',
                        opportunityTitle: 'Front of House Usher',
                        date: now - (14 * oneDayMs),
                        startTime: '18:00',
                        endTime: '22:00',
                        duration: 4,
                        status: 'completed',
                        checkInTime: now - (14 * oneDayMs),
                        checkOutTime: now - (14 * oneDayMs) + (4 * 60 * 60 * 1000),
                        notes: 'Completed shift'
                      });
                      
                      shifts.push({
                        id: 'demo-shift-2',
                        volunteerId: 'demo-volunteer',
                        opportunityId: 'opp-2',
                        opportunityTitle: 'Box Office Assistant',
                        date: now - (10 * oneDayMs),
                        startTime: '17:30',
                        endTime: '22:00',
                        duration: 4.5,
                        status: 'completed',
                        checkInTime: now - (10 * oneDayMs),
                        checkOutTime: now - (10 * oneDayMs) + (4.5 * 60 * 60 * 1000),
                        notes: 'Completed shift'
                      });
                      
                      shifts.push({
                        id: 'demo-shift-3',
                        volunteerId: 'demo-volunteer',
                        opportunityId: 'opp-1',
                        opportunityTitle: 'Front of House Usher',
                        date: now - (7 * oneDayMs),
                        startTime: '18:00',
                        endTime: '22:00',
                        duration: 4,
                        status: 'completed',
                        checkInTime: now - (7 * oneDayMs),
                        checkOutTime: now - (7 * oneDayMs) + (4 * 60 * 60 * 1000),
                        notes: 'Completed shift'
                      });
                      
                      // Add 5 upcoming shifts
                      for (let i = 0; i < 5; i++) {
                        shifts.push({
                          id: `demo-shift-upcoming-${i + 1}`,
                          volunteerId: 'demo-volunteer',
                          opportunityId: 'opp-1',
                          opportunityTitle: 'Front of House Usher',
                          date: now + ((i * 6 + 3) * oneDayMs),
                          startTime: '18:00',
                          endTime: '22:00',
                          duration: 4,
                          status: 'scheduled',
                          notes: 'Upcoming shift'
                        });
                      }
                      
                      localStorage.setItem('volunteerShifts', JSON.stringify(shifts));
                    }

                    // Create demo volunteer applications
                    const applications = JSON.parse(localStorage.getItem('volunteerApplications') || '[]');
                    
                    if (applications.length === 0) {
                      const now = Date.now();
                      
                      applications.push({
                        id: 'app-demo-1',
                        firstName: 'Amanda',
                        lastName: 'Rodriguez',
                        email: 'arodriguez@email.com',
                        phone: '555-0301',
                        status: 'pending',
                        submittedAt: now - (5 * 24 * 60 * 60 * 1000),
                        categories: ['events'],
                        interests: ['Front of House'],
                        availability: { friday: true, saturday: true },
                        experience: 'Event coordination experience'
                      });
                      
                      applications.push({
                        id: 'app-demo-2',
                        firstName: 'Robert',
                        lastName: 'Chen',
                        email: 'rchen@email.com',
                        phone: '555-0302',
                        status: 'pending',
                        submittedAt: now - (3 * 24 * 60 * 60 * 1000),
                        categories: ['technical'],
                        interests: ['Stage Crew'],
                        availability: { thursday: true, friday: true, saturday: true },
                        experience: 'Theatre tech background'
                      });
                      
                      applications.push({
                        id: 'app-demo-3',
                        firstName: 'Jennifer',
                        lastName: 'Martinez',
                        email: 'jmartinez@email.com',
                        phone: '555-0303',
                        status: 'pending',
                        submittedAt: now - (1 * 24 * 60 * 60 * 1000),
                        categories: ['administrative'],
                        interests: ['Box Office'],
                        availability: { monday: true, wednesday: true, friday: true },
                        experience: 'Customer service experience'
                      });
                      
                      localStorage.setItem('volunteerApplications', JSON.stringify(applications));
                    }
                    
                    // Create demo volunteer session
                    const demoSession = {
                      volunteerId: 'demo-volunteer',  // ✅ FIX #3: Use volunteerId not contactId
                      email: 'demo@showsuite.local',
                      name: 'Demo Volunteer',
                      isDemo: true,
                      loginTime: Date.now()  // ✅ FIX #3: Use loginTime not startTime
                    };
                    sessionStorage.setItem('volunteerSession', JSON.stringify(demoSession));  // ✅ FIX #1: Use sessionStorage not localStorage
                    
                    // Navigate to portal
                    onNavigate('volunteer-portal');
                  }}
                  className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                >
                  🧪 Demo Mode
                </button>
                <button
                  onClick={() => onNavigate('volunteer-portal')}
                  className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors"
                >
                  Launch Portal
                  <span className="ml-2" aria-hidden="true">→</span>
                </button>
              </div>
            </div>
            <div className="ml-4 px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full">
              PREVIEW
            </div>
          </div>
        </div>
      </section>

      {/* Main content layout: Activity + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" aria-label="Activity and Alerts">
        {/* Recent Activity */}
        <section className="lg:col-span-2" aria-label="Recent Activity">
          <div className="bg-white rounded-lg shadow p-4 h-full flex flex-col text-gray-900">
            <h2 className="text-lg font-semibold mb-3 text-gray-900">Recent Activity</h2>
            {recentActivity.length === 0 && !loading && (
              <div className="text-sm text-gray-500">No recent activity</div>
            )}
            <ul className="space-y-3 overflow-y-auto max-h-64 text-gray-900">
              {recentActivity.map((evt, idx) => (
                <li key={idx} className="flex items-start gap-3 text-sm">
                  <span className="text-gray-400">•</span>
                  <div className="flex-1">
                    <div>{evt.message}</div>
                    <div className="text-xs text-gray-400">{relativeTime(evt.timestamp)}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Alerts */}
        <section aria-label="Alerts" className="space-y-4">
          {/* Unfilled Shifts */}
          {!dismissedAlerts.unfilled && unfilledUpcomingShifts.length > 0 && (
            <AlertCard title="Unfilled Shifts (Next 7 Days)" onDismiss={() => dismissAlert('unfilled')} accent="yellow">
              <ul className="text-xs space-y-1 max-h-32 overflow-y-auto">
                {unfilledUpcomingShifts.slice(0,8).map(s => (
                  <li key={s.id} className="flex justify-between items-center gap-2">
                    <span>{s.title || 'Shift'} – {s.date}</span>
                    <button className="px-2 py-1 bg-purple-600 text-white rounded text-xs hover:bg-purple-700 transition-colors" onClick={() => onNavigate('assign',{ shiftId:s.id })}>Assign</button>
                  </li>
                ))}
              </ul>
            </AlertCard>
          )}
          {/* Expiring Background Checks */}
          {!dismissedAlerts.background && expiringBackgroundChecks.length > 0 && (
            <AlertCard title="Background Checks Expiring <30 Days" onDismiss={() => dismissAlert('background')} accent="red">
              <ul className="text-xs space-y-1 max-h-32 overflow-y-auto">
                {expiringBackgroundChecks.slice(0,8).map(v => (
                  <li key={v.id} className="flex justify-between items-center gap-2">
                    <span>{v.firstName} {v.lastName}</span>
                    <button className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors" onClick={() => {/* placeholder email template */}}>Send Reminder</button>
                  </li>
                ))}
              </ul>
            </AlertCard>
          )}
          {/* Inactive Volunteers */}
            {!dismissedAlerts.inactive && inactiveVolunteers.length > 0 && (
              <AlertCard title="Volunteers Inactive >90 Days" onDismiss={() => dismissAlert('inactive')} accent="blue">
                <ul className="text-xs space-y-1 max-h-32 overflow-y-auto">
                  {inactiveVolunteers.slice(0,8).map(v => (
                    <li key={v.id} className="flex justify-between items-center gap-2">
                      <span>{v.firstName} {v.lastName}</span>
                      <button className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 transition-colors" onClick={() => {/* placeholder reactivation email */}}>Reactivate</button>
                    </li>
                  ))}
                </ul>
              </AlertCard>
            )}
        </section>
      </div>

      {/* Modal Overlays */}
      {showShiftScheduler && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
          }}
          onClick={() => setShowShiftScheduler(false)}
        >
          <div 
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              maxWidth: '1200px',
              width: '95%',
              maxHeight: '90vh',
              overflow: 'hidden',
              margin: '16px',
              display: 'flex',
              flexDirection: 'column'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '20px',
              borderBottom: '1px solid #e5e7eb',
              backgroundColor: '#f9fafb'
            }}>
              <h2 style={{fontSize: '24px', fontWeight: 'bold', margin: 0}}>Shift Scheduler</h2>
              <button
                onClick={() => setShowShiftScheduler(false)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  fontSize: '28px',
                  cursor: 'pointer',
                  padding: '0 8px'
                }}
              >×</button>
            </div>
            <div style={{flex: 1, overflow: 'auto'}}>
              <VolunteerShiftScheduler onClose={() => setShowShiftScheduler(false)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Reusable stat card
const StatCard = ({ label, value, accent = 'gray', onClick }) => {
  const colorMap = {
    green: 'bg-green-50 border-green-200 text-green-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    gray: 'bg-gray-50 border-gray-200 text-gray-700'
  };
  return (
    <button onClick={onClick} className={`text-left rounded-lg border p-4 shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${accent}-400 ${colorMap[accent]} text-gray-900`} aria-label={label}>
      <div className="text-3xl font-bold leading-tight">{value}</div>
      <div className="text-xs uppercase tracking-wide font-medium mt-1">{label}</div>
    </button>
  );
};

// Coverage card specialized visualization
const CoverageCard = ({ percentage, onClick }) => {
  let ringColor = percentage >= 80 ? 'text-green-600' : percentage >= 60 ? 'text-yellow-600' : 'text-red-600';
  return (
    <button onClick={onClick} className="bg-white border border-gray-200 rounded-lg p-4 shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400 text-gray-900" aria-label="Average Coverage">
      <div className="flex items-center justify-between">
        <div>
          <div className={`text-3xl font-bold ${ringColor}`}>{percentage}%</div>
          <div className="text-xs uppercase tracking-wide font-medium mt-1">Average Coverage</div>
        </div>
        <div className="w-16 h-16 relative" aria-hidden="true">
          <svg viewBox="0 0 36 36" className="w-16 h-16">
            <path className="text-gray-200" strokeWidth="4" stroke="currentColor" fill="none" d="M18 2.0845
              a 15.9155 15.9155 0 0 1 0 31.831
              a 15.9155 15.9155 0 0 1 0 -31.831"/>
            <path className={ringColor} strokeWidth="4" stroke="currentColor" strokeDasharray={`${percentage},100`} strokeLinecap="round" fill="none" d="M18 2.0845
              a 15.9155 15.9155 0 0 1 0 31.831
              a 15.9155 15.9155 0 0 1 0 -31.831"/>
          </svg>
        </div>
      </div>
    </button>
  );
};

// Generic alert card
const AlertCard = ({ title, children, onDismiss, accent = 'yellow' }) => {
  const accentClasses = {
    yellow: 'border-yellow-300 bg-yellow-50',
    red: 'border-red-300 bg-red-50',
    blue: 'border-blue-300 bg-blue-50'
  };
  return (
    <div className={`rounded-lg border p-4 shadow relative ${accentClasses[accent]} text-gray-900`} role="alert" aria-label={title}>
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        <button onClick={onDismiss} aria-label="Dismiss alert" className="text-xs text-gray-500 hover:text-gray-700">✕</button>
      </div>
      {children}
    </div>
  );
};

// Auto-mount dashboard for quick testing if root is empty
// Expose on window for router usage (router will mount explicitly)
window.VolunteerDashboard = VolunteerDashboard;
