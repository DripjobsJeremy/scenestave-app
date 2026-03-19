/**
 * ContactCard.jsx
 * Base contact card with volunteer-specific enhancements (badge, quick stats, history modal).
 * If contact.isVolunteer === true, shows volunteer info integrated with Sprint 1 data layer.
 */

const { useState, useEffect, useMemo } = React;

const ContactCard = ({ contact, onClose = () => {}, onOpenVolunteerProfile = () => {} }) => {
  if (!contact) return null;
  const isVolunteer = !!contact.isVolunteer;
  const info = contact.volunteerInfo || {};

  // Collapsible volunteer quick stats
  const [showVolunteerStats, setShowVolunteerStats] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [shifts, setShifts] = useState([]);

  // Load shifts only when volunteer stats section expanded OR history modal opened
  useEffect(() => {
    if (!isVolunteer) return;
    if (showVolunteerStats || historyModalOpen) {
      const storage = window.volunteerStorageService;
      setShifts(storage.getVolunteerShifts());
    }
  }, [showVolunteerStats, historyModalOpen, isVolunteer]);

  // Derive upcoming & past shifts for this volunteer
  const volunteerShiftAssignments = useMemo(() => {
    if (!isVolunteer) return { upcoming: [], past: [] };
    const now = Date.now();
    const upcoming = [];
    const past = [];
    shifts.forEach(shift => {
      if (!Array.isArray(shift.assignments)) return;
      shift.assignments.forEach(asg => {
        if (asg.volunteerId === contact.id) {
          const start = new Date(shift.date).getTime();
          const record = { shift, assignment: asg };
          if (start >= now) upcoming.push(record); else past.push(record);
        }
      });
    });
    // Sort upcoming ascending, past descending
    upcoming.sort((a,b)=> new Date(a.shift.date) - new Date(b.shift.date));
    past.sort((a,b)=> new Date(b.shift.date) - new Date(a.shift.date));
    return { upcoming, past };
  }, [shifts, contact.id, isVolunteer]);

  // Completion rate
  const completionRate = useMemo(() => {
    const completed = info.shiftsCompleted || 0;
    const total = completed + (info.shiftsNoShow || 0);
    if (total === 0) return 100; // default optimism when no shifts yet
    return Math.round((completed / total) * 100);
  }, [info.shiftsCompleted, info.shiftsNoShow]);

  const completionColor = completionRate >= 90 ? 'text-green-600' : completionRate >= 70 ? 'text-yellow-600' : 'text-red-600';

  // Hours by category (simple aggregation using calculation service if available)
  const hoursByCategory = useMemo(() => {
    if (!isVolunteer || !window.volunteerCalculationService) return [];
    // Calculation service expects all shifts; we can reuse internal aggregator if exists
    try {
      const calc = window.volunteerCalculationService;
      const byCat = calc.getHoursByCategory ? calc.getHoursByCategory() : [];
      // Filter only categories where this volunteer contributed (approx: check assignments)
      const contribMap = new Map();
      volunteerShiftAssignments.past.forEach(({ shift, assignment }) => {
        if (assignment.status === 'completed' && shift.category) {
          const hours = assignment.hoursWorked || 0;
          contribMap.set(shift.category, (contribMap.get(shift.category) || 0) + hours);
        }
      });
      if (contribMap.size > 0) {
        return Array.from(contribMap.entries()).map(([cat, hrs]) => ({ category: cat, hours: hrs }));
      }
      return byCat; // fallback global
    } catch { return []; }
  }, [isVolunteer, volunteerShiftAssignments.past]);

  // Badge color by status
  const statusColor = info.status === 'active' ? 'bg-green-100 text-green-700 border-green-300' : info.status === 'on-hold' ? 'bg-yellow-100 text-yellow-700 border-yellow-300' : 'bg-gray-100 text-gray-600 border-gray-300';

  return (
    <div className="bg-white rounded-lg shadow p-4 text-sm relative" aria-label="Contact Card">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            {contact.firstName} {contact.lastName}
            {isVolunteer && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-600 text-white" aria-label="Volunteer Badge">Volunteer</span>
            )}
          </h2>
          {contact.email && <div className="text-xs text-gray-500">{contact.email}</div>}
          {contact.phone && <div className="text-xs text-gray-500">{contact.phone}</div>}
        </div>
        <button onClick={onClose} className="text-xs text-gray-400 hover:text-gray-600" aria-label="Close Contact">✕</button>
      </div>

      {/* Volunteer Quick Stats */}
      {isVolunteer && (
        <div className="mt-3 border rounded-lg p-3 bg-gray-50" aria-label="Volunteer Quick Stats">
          <button
            onClick={() => setShowVolunteerStats(s => !s)}
            className="flex justify-between items-center w-full text-left"
            aria-expanded={!!showVolunteerStats}
            aria-controls="volunteer-stats-panel"
            type="button"
          >
            <span className="font-medium text-xs tracking-wide uppercase">Volunteer Info</span>
            <span className="text-xs text-gray-500">{showVolunteerStats ? '▲' : '▼'}</span>
          </button>
          {showVolunteerStats && (
            <div id="volunteer-stats-panel" className="mt-3 space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatMini label="Total Hours" value={(info.totalHours || 0).toFixed(1)} />
                <StatMini label="Last Shift" value={info.lastShiftDate ? new Date(info.lastShiftDate).toLocaleDateString() : 'None'} />
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase tracking-wide text-gray-500">Status</span>
                  <span className={`px-2 py-1 mt-1 rounded border text-xs font-medium inline-block ${statusColor}`}>{info.status || '—'}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase tracking-wide text-gray-500">Completion</span>
                  <span className={`mt-1 text-sm font-semibold ${completionColor}`}>{completionRate}%</span>
                </div>
              </div>
              {hoursByCategory.length > 0 && (
                <div className="mt-2">
                  <span className="text-[10px] uppercase tracking-wide text-gray-500">Hours by Category</span>
                  <ul className="mt-1 text-xs space-y-1">
                    {hoursByCategory.slice(0,5).map(h => (
                      <li key={h.category} className="flex justify-between">
                        <span>{h.category}</span>
                        <span className="font-medium">{h.hours.toFixed(1)}h</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => setHistoryModalOpen(true)}
                  className="px-3 py-1 rounded bg-blue-600 text-white text-xs"
                  aria-label="View Volunteer History"
                >
                  View Volunteer History
                </button>
                <button
                  onClick={() => onOpenVolunteerProfile(contact.id)}
                  className="px-3 py-1 rounded border text-xs"
                  aria-label="Open Profile Editor"
                >
                  Profile Editor
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Mini stat component
const StatMini = ({ label, value }) => (
  <div className="flex flex-col" aria-label={label}>
    <span className="text-[10px] uppercase tracking-wide text-gray-500">{label}</span>
    <span className="mt-1 text-sm font-semibold">{value}</span>
  </div>
);

// Volunteer History Modal (simplified)
const VolunteerHistoryModal = ({ contact, assignments, onClose }) => {
  const upcoming = assignments.upcoming.slice(0,5);
  const past = assignments.past.slice(0,10);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" aria-label="Volunteer History Modal">
      <div className="bg-white rounded-lg shadow p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-lg font-semibold">{contact.firstName} {contact.lastName} – Volunteer History</h2>
          <button onClick={onClose} className="text-xs text-gray-400 hover:text-gray-600" aria-label="Close History Modal">✕</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-semibold mb-2">Upcoming Shifts</h3>
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-2 py-1">Date</th>
                  <th className="text-left px-2 py-1">Title</th>
                  <th className="text-left px-2 py-1">Slots</th>
                </tr>
              </thead>
              <tbody>
                {upcoming.map(r => (
                  <tr key={r.shift.id} className="border-t">
                    <td className="px-2 py-1">{r.shift.date}</td>
                    <td className="px-2 py-1">{r.shift.title || 'Shift'}</td>
                    <td className="px-2 py-1">{(r.shift.slotsFilled||0)}/{r.shift.slotsNeeded}</td>
                  </tr>
                ))}
                {upcoming.length === 0 && <tr><td colSpan={3} className="px-2 py-2 text-center text-gray-500">No upcoming shifts</td></tr>}
              </tbody>
            </table>
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-2">Recent Shifts</h3>
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-2 py-1">Date</th>
                  <th className="text-left px-2 py-1">Title</th>
                  <th className="text-left px-2 py-1">Hours</th>
                  <th className="text-left px-2 py-1">Status</th>
                </tr>
              </thead>
              <tbody>
                {past.map(r => (
                  <tr key={r.shift.id + r.assignment.volunteerId} className="border-t">
                    <td className="px-2 py-1">{r.shift.date}</td>
                    <td className="px-2 py-1">{r.shift.title || 'Shift'}</td>
                    <td className="px-2 py-1">{(r.assignment.hoursWorked||0).toFixed(1)}</td>
                    <td className="px-2 py-1">{r.assignment.status}</td>
                  </tr>
                ))}
                {past.length === 0 && <tr><td colSpan={4} className="px-2 py-2 text-center text-gray-500">No past shifts</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <button onClick={onClose} className="px-3 py-1 rounded border text-xs" aria-label="Close History">Close</button>
        </div>
      </div>
    </div>
  );
};

// Auto-attach for simple usage
window.ContactCard = ContactCard;
