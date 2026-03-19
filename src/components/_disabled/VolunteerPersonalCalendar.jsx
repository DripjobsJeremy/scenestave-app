import React, { useState, useEffect } from 'react';

const STATUS_COLORS = {
  confirmed: 'bg-blue-500',
  pending: 'bg-yellow-400',
  completed: 'bg-green-500',
  cancelled: 'bg-red-500',
};

function getVolunteerFromSession() {
  try {
    const session = JSON.parse(sessionStorage.getItem('volunteerSession'));
    return session?.volunteer || null;
  } catch {
    return null;
  }
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
}

function formatTime(start, end) {
  const s = new Date(start);
  const e = new Date(end);
  return `${s.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${e.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

const VolunteerPersonalCalendar = () => {
  const [volunteer, setVolunteer] = useState(null);
  const [shifts, setShifts] = useState([]);
  const [view, setView] = useState('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedShift, setSelectedShift] = useState(null);
  const [filters, setFilters] = useState({ status: 'all', upcoming: false, hideCancelled: false });
  const [exportModal, setExportModal] = useState(false);
  const [printMode, setPrintMode] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(Date.now());

  useEffect(() => {
    const v = getVolunteerFromSession();
    if (!v) {
      window.location.href = '/portal-demo.html?sessionExpired=1';
      return;
    }
    setVolunteer(v);
    // Load all shifts for this volunteer
    const storage = window.volunteerStorageService;
    const allShifts = storage?.getVolunteerShifts?.() || [];
    const myShifts = allShifts.filter(s => (s.assignments || []).some(a => a.volunteerId === v.id));
    setShifts(myShifts);
    setLastUpdated(Date.now());
  }, []);

  // Filtered shifts for list view
  const filteredShifts = shifts.filter(s => {
    const assignment = (s.assignments || []).find(a => a.volunteerId === volunteer?.id);
    if (!assignment) return false;
    if (filters.status !== 'all' && assignment.status !== filters.status) return false;
    if (filters.upcoming && new Date(s.date) < new Date()) return false;
    if (filters.hideCancelled && assignment.status === 'cancelled') return false;
    return true;
  });

  // Export .ics file (stub)
  function handleExport(type = 'all') {
    // TODO: Generate .ics file for selected shifts
    alert('ICS export not yet implemented.');
    setExportModal(false);
  }

  // Print view
  function handlePrint() {
    setPrintMode(true);
    setTimeout(() => window.print(), 100);
    setTimeout(() => setPrintMode(false), 1000);
  }

  // Calendar navigation
  function goToToday() {
    setCurrentDate(new Date());
  }
  function goPrev() {
    // Month view: go to previous month
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() - 1);
    setCurrentDate(d);
  }
  function goNext() {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() + 1);
    setCurrentDate(d);
  }

  // Month view grid (stub)
  function renderMonthView() {
    // TODO: Render calendar grid with shifts
    return <div className="bg-gray-50 rounded-lg p-6 text-center text-gray-500">Month view coming soon.</div>;
  }

  // Week view grid (stub)
  function renderWeekView() {
    // TODO: Render week timeline with shifts
    return <div className="bg-gray-50 rounded-lg p-6 text-center text-gray-500">Week view coming soon.</div>;
  }

  // List view
  function renderListView() {
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full border rounded-lg">
          <thead>
            <tr className="bg-violet-50">
              <th className="px-4 py-2 text-left">Date</th>
              <th className="px-4 py-2 text-left">Time</th>
              <th className="px-4 py-2 text-left">Opportunity</th>
              <th className="px-4 py-2 text-left">Location</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredShifts.map((s, i) => {
              const assignment = (s.assignments || []).find(a => a.volunteerId === volunteer?.id);
              return (
                <tr key={s.id} className="border-b">
                  <td className="px-4 py-2">{formatDate(s.date)}</td>
                  <td className="px-4 py-2">{formatTime(s.startTime, s.endTime)}</td>
                  <td className="px-4 py-2">{s.title}</td>
                  <td className="px-4 py-2">{s.location}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold text-white ${STATUS_COLORS[assignment.status]}`}>{assignment.status}</span>
                  </td>
                  <td className="px-4 py-2">
                    <button className="px-2 py-1 bg-violet-100 text-violet-700 rounded" onClick={() => setSelectedShift(s)}>Details</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  // Shift detail modal (stub)
  function renderShiftDetailModal() {
    if (!selectedShift) return null;
    const assignment = (selectedShift.assignments || []).find(a => a.volunteerId === volunteer?.id);
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">{selectedShift.title}</h2>
            <button className="text-gray-400 hover:text-gray-600 text-2xl" onClick={() => setSelectedShift(null)}>×</button>
          </div>
          <div className="mb-2">Date: <span className="font-semibold">{formatDate(selectedShift.date)}</span></div>
          <div className="mb-2">Time: <span className="font-semibold">{formatTime(selectedShift.startTime, selectedShift.endTime)}</span></div>
          <div className="mb-2">Location: <span className="font-semibold">{selectedShift.location}</span></div>
          <div className="mb-2">Status: <span className={`px-2 py-1 rounded-full text-xs font-bold text-white ${STATUS_COLORS[assignment.status]}`}>{assignment.status}</span></div>
          {/* ...more details/actions as needed... */}
          <div className="mt-4 flex gap-3 justify-end">
            <button className="px-4 py-2 bg-violet-600 text-white rounded" onClick={() => setExportModal(true)}>Add to Calendar</button>
            <button className="px-4 py-2 border rounded" onClick={() => setSelectedShift(null)}>Close</button>
          </div>
        </div>
      </div>
    );
  }

  // Toolbar
  function renderToolbar() {
    return (
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-2">
        <h1 className="text-2xl font-bold">My Volunteer Schedule</h1>
        <div className="flex gap-2">
          <button className={`px-3 py-2 rounded ${view === 'month' ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-700'}`} onClick={() => setView('month')}>📅 Month</button>
          <button className={`px-3 py-2 rounded ${view === 'week' ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-700'}`} onClick={() => setView('week')}>📊 Week</button>
          <button className={`px-3 py-2 rounded ${view === 'list' ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-700'}`} onClick={() => setView('list')}>📋 List</button>
        </div>
        <div className="flex gap-2 mt-2 md:mt-0">
          <button className="px-3 py-2 rounded bg-gray-100 text-gray-700" onClick={goPrev}>&lt;&lt;</button>
          <button className="px-3 py-2 rounded bg-gray-100 text-gray-700" onClick={goToToday}>Today</button>
          <button className="px-3 py-2 rounded bg-gray-100 text-gray-700" onClick={goNext}>&gt;&gt;</button>
        </div>
        <div className="flex gap-2 mt-2 md:mt-0">
          <button className="px-3 py-2 rounded bg-violet-100 text-violet-700" onClick={() => setExportModal(true)}>Export to Calendar</button>
          <button className="px-3 py-2 rounded bg-violet-100 text-violet-700" onClick={handlePrint}>Print Schedule</button>
        </div>
      </div>
    );
  }

  // Export modal (stub)
  function renderExportModal() {
    if (!exportModal) return null;
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <h2 className="text-xl font-bold mb-4">Export to Calendar</h2>
          <div className="mb-4">Select what to export:</div>
          <div className="mb-4 flex flex-col gap-2">
            <button className="px-4 py-2 bg-violet-600 text-white rounded" onClick={() => handleExport('this')}>This Shift Only</button>
            <button className="px-4 py-2 bg-violet-600 text-white rounded" onClick={() => handleExport('upcoming')}>All Upcoming Shifts</button>
            <button className="px-4 py-2 bg-violet-600 text-white rounded" onClick={() => handleExport('all')}>All Shifts</button>
          </div>
          <div className="mt-4 text-right">
            <button className="px-4 py-2 border rounded" onClick={() => setExportModal(false)}>Close</button>
          </div>
        </div>
      </div>
    );
  }

  // Print mode styles
  const printClass = printMode ? 'print:bg-white print:text-black print:p-0 print:m-0 print:shadow-none' : '';

  return (
    <div className={`max-w-5xl mx-auto px-4 py-8 text-gray-900 ${printClass}`}>
      {renderToolbar()}
      {view === 'month' && renderMonthView()}
      {view === 'week' && renderWeekView()}
      {view === 'list' && renderListView()}
      {renderShiftDetailModal()}
      {renderExportModal()}
      <div className="mt-6 text-sm text-gray-500">Last updated: {new Date(lastUpdated).toLocaleString()} <button className="ml-2 text-violet-600" onClick={() => window.location.reload()}>↻ Refresh</button></div>
    </div>
  );
};

window.VolunteerPersonalCalendar = VolunteerPersonalCalendar;
