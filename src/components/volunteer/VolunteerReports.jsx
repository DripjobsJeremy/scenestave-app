/**
 * VolunteerReports.jsx
 * Full reports: Hours by Volunteer, Hours by Category, Shift Coverage, Retention, No-Shows, Top Volunteers.
 * Date range filtering, calculations, CSV export, print view.
 */

const { useState, useEffect, useMemo } = React;

const VolunteerReports = ({ userRole='Admin' }) => {
  const allowedRoles = new Set(['Admin','Board Admin','Stage Manager']);
  if (!allowedRoles.has(userRole)) return <div className="p-4 text-sm text-red-600">Access denied.</div>;

  const storage = window.volunteerStorageService;
  const calc = window.volunteerCalculationService;

  const reportTabs = ['Hours by Volunteer','Hours by Category','Shift Coverage','Retention','No-Shows','Top Volunteers'];
  const [tab, setTab] = useState(reportTabs[0]);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [reportData, setReportData] = useState(null);
  const [calculating, setCalculating] = useState(false);

  // Universal number formatter: round to 1 decimal, trim trailing zeros
  const fmt = (n, digits = 1) => {
    if (n == null || Number.isNaN(n)) return '0';
    const pow = Math.pow(10, digits);
    const rounded = Math.round((Number(n) + Number.EPSILON) * pow) / pow;
    return rounded.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: digits });
  };

  useEffect(()=>{
    generateReport();
  }, [tab, start, end]);

  function setPreset(days) {
    const today = new Date();
    const past = new Date(today.getTime() - days * 24 * 60 * 60 * 1000);
    setStart(past.toISOString().split('T')[0]);
    setEnd(today.toISOString().split('T')[0]);
  }

  function setThisYear() {
    const today = new Date();
    setStart(`${today.getFullYear()}-01-01`);
    setEnd(today.toISOString().split('T')[0]);
  }

  function setAllTime() {
    setStart('');
    setEnd('');
  }

  function generateReport() {
    setCalculating(true);
    const volunteers = storage.getVolunteerProfiles();
    const shifts = storage.getVolunteerShifts();
    const opportunities = storage.getVolunteerOpportunities();

    // Apply date filter
    let filteredShifts = shifts;
    if (start || end) {
      filteredShifts = shifts.filter(s => {
        if (start && s.date < start) return false;
        if (end && s.date > end) return false;
        return true;
      });
    }

    let data = {};
    switch(tab) {
      case 'Hours by Volunteer': {
        data.rows = volunteers.map(v => {
          const hours = (start || end)
            ? (calc.calculateVolunteerHoursInRange ? calc.calculateVolunteerHoursInRange(v.id, start||undefined, end||undefined) : (v.volunteerInfo?.totalHours||0))
            : (calc.calculateVolunteerHours ? calc.calculateVolunteerHours(v.id) : (v.volunteerInfo?.totalHours||0));
          const shiftsCompleted = calc.countCompletedShifts? calc.countCompletedShifts(v.id, start||undefined, end||undefined) : (v.volunteerInfo?.shiftsCompleted||0);
          return {
            name: `${v.firstName} ${v.lastName}`,
            hours,
            shifts: shiftsCompleted,
            status: v.volunteerInfo?.status||'—'
          };
        }).filter(r=>r.hours>0).sort((a,b)=>b.hours-a.hours);
        data.totalHours = Math.round((data.rows.reduce((sum,r)=>sum+r.hours, 0) + Number.EPSILON)*10)/10;
        break;
      }
      case 'Hours by Category': {
        const categoryHours = {};
        volunteers.forEach(v => {
          const byCategory = (start || end)
            ? (calc.getHoursByCategoryInRange ? calc.getHoursByCategoryInRange(v.id, start||undefined, end||undefined) : {})
            : (calc.getHoursByCategory ? calc.getHoursByCategory(v.id) : {});
          Object.keys(byCategory).forEach(cat => {
            categoryHours[cat] = (categoryHours[cat]||0) + byCategory[cat];
          });
        });
        data.rows = Object.keys(categoryHours)
          .map(cat => ({ category: cat, hours: Math.round((categoryHours[cat] + Number.EPSILON)*10)/10 }))
          .sort((a,b)=>b.hours-a.hours);
        data.totalHours = Math.round((data.rows.reduce((sum,r)=>sum+r.hours, 0) + Number.EPSILON)*10)/10;
        break;
      }
      case 'Shift Coverage': {
        data.rows = filteredShifts.map(s => {
          const coverage = calc.calculateShiftCoverage? calc.calculateShiftCoverage(s.id): Math.round((s.slotsFilled/s.slotsNeeded)*100);
          return {
            date: s.date,
            title: s.title,
            slotsFilled: s.slotsFilled,
            slotsNeeded: s.slotsNeeded,
            coverage: coverage,
            status: s.status
          };
        }).sort((a,b)=>a.date.localeCompare(b.date));
        const fullyStaffed = data.rows.filter(r=>r.coverage===100).length;
        const partial = data.rows.filter(r=>r.coverage>0 && r.coverage<100).length;
        const unstaffed = data.rows.filter(r=>r.coverage===0).length;
        data.summary = { total: data.rows.length, fullyStaffed, partial, unstaffed };
        break;
      }
      case 'Retention': {
        const retention = calc.calculateVolunteerRetention? calc.calculateVolunteerRetention(): { total:0, active:0, inactive:0, retentionRate:0 };
        data.summary = retention;
        data.rows = volunteers.map(v => {
          const info = v.volunteerInfo||{};
          return {
            name: `${v.firstName} ${v.lastName}`,
            status: info.status||'—',
            startDate: info.startDate? new Date(info.startDate).toLocaleDateString(): '—',
            lastShift: info.lastShiftDate? new Date(info.lastShiftDate).toLocaleDateString(): '—',
            totalHours: calc.calculateVolunteerHours? calc.calculateVolunteerHours(v.id): (info.totalHours||0)
          };
        });
        break;
      }
      case 'No-Shows': {
        data.rows = volunteers.filter(v=>(v.volunteerInfo?.shiftsNoShow||0)>0).map(v => {
          const info = v.volunteerInfo||{};
          const completion = calc.calculateCompletionRate? calc.calculateCompletionRate(v.id): 100;
          return {
            name: `${v.firstName} ${v.lastName}`,
            noShows: info.shiftsNoShow||0,
            completed: info.shiftsCompleted||0,
            completionRate: completion,
            status: info.status||'—'
          };
        }).sort((a,b)=>b.noShows-a.noShows);
        data.totalNoShows = data.rows.reduce((sum,r)=>sum+r.noShows, 0);
        break;
      }
      case 'Top Volunteers': {
        const top = (start || end)
          ? (calc.getTopVolunteersInRange ? calc.getTopVolunteersInRange(50, start||undefined, end||undefined) : [])
          : (calc.getTopVolunteers ? calc.getTopVolunteers(50) : []);
        data.rows = top.map((t,idx) => {
          const v = volunteers.find(vol=>vol.id===t.id);
          const info = v?.volunteerInfo||{};
          return {
            rank: idx+1,
            name: t.name,
            hours: t.hours,
            shifts: calc.countCompletedShifts? calc.countCompletedShifts(t.id, start||undefined, end||undefined) : (info.shiftsCompleted||0),
            status: info.status||'—'
          };
        });
        break;
      }
      default:
        data.rows = [];
    }

    setReportData(data);
    setCalculating(false);
  }

  function exportCSV() {
    if (!reportData || !reportData.rows) return;
    let csv = '';
    const rows = reportData.rows;
    if (rows.length === 0) { window.toast?.warning('No data to export'); return; }

    const headers = Object.keys(rows[0]);
    csv = headers.join(',') + '\n';
    rows.forEach(row => {
      csv += headers.map(h => {
        const val = row[h];
        let out = val;
        if (typeof val === 'number') out = fmt(val);
        return `"${(out||'').toString().replace(/"/g,'""')}"`;
      }).join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `volunteer-report-${tab.replace(/\s+/g,'-').toLowerCase()}.csv`;
    link.click();
  }

  function printReport() {
    window.print();
  }

  return (
    <div className="p-4 space-y-4 print:p-0" aria-label="Volunteer Reports">
      <header className="vol-page-header flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-xl font-bold text-white vol-page-title">Volunteer Reports</h1>
          <div className="text-xs vol-page-subtitle mt-1">Generate insights and export data</div>
        </div>
        <div className="flex flex-wrap gap-2 text-[11px]">
          {reportTabs.map(t => (
            <button key={t} title={`Show ${t} report`} onClick={()=>setTab(t)} className={`px-2 py-1 rounded border ${tab===t?'bg-violet-600 text-white border-violet-600':'bg-white text-gray-900'}`}>{t}</button>
          ))}
        </div>
      </header>

      <div className="bg-white p-3 rounded shadow flex flex-wrap gap-2 items-center text-xs print:hidden text-gray-900" aria-label="Date Range Filters">
        <label className="font-medium" htmlFor="startDate">From:</label>
        <input id="startDate" title="Start date" type="date" value={start} onChange={e=>setStart(e.target.value)} className="border rounded px-2 py-1 bg-white text-gray-900" />
        <label className="font-medium" htmlFor="endDate">To:</label>
        <input id="endDate" title="End date" type="date" value={end} onChange={e=>setEnd(e.target.value)} className="border rounded px-2 py-1 bg-white text-gray-900" />
        <button onClick={()=>setPreset(30)} title="Last 30 days" className="px-2 py-1 rounded border bg-white text-gray-900">Last 30</button>
        <button onClick={()=>setPreset(90)} title="Last 90 days" className="px-2 py-1 rounded border bg-white text-gray-900">Last 90</button>
        <button onClick={setThisYear} title="This year" className="px-2 py-1 rounded border bg-white text-gray-900">This Year</button>
        <button onClick={setAllTime} title="All time" className="px-2 py-1 rounded border bg-white text-gray-900">All Time</button>
        <div className="ml-auto flex gap-2">
          <button onClick={printReport} title="Print report" className="px-3 py-1 rounded bg-gray-700 text-white">Print</button>
          <button onClick={exportCSV} title="Export to CSV" className="px-3 py-1 rounded bg-green-600 text-white">Export CSV</button>
        </div>
      </div>

      <div className="bg-white rounded shadow p-4 min-h-[320px] print:shadow-none" aria-label="Report Content">
        <div className="print:block hidden mb-4">
          <h1 className="text-2xl font-bold text-white">Volunteer Report: {tab}</h1>
          <div className="text-sm text-gray-600">Date Range: {start||'All'} to {end||'All'}</div>
          <div className="text-xs text-gray-500 mt-1">Generated: {new Date().toLocaleString()}</div>
        </div>
        <h2 className="vol-report-tab-title mb-3 print:hidden">{tab}</h2>
        {calculating && <div className="text-xs text-gray-500">Calculating...</div>}
        {!calculating && reportData && (
          <div className="space-y-4">
            {tab==='Hours by Volunteer' && reportData.rows && (
              <div>
                <div className="text-xs mb-2 text-gray-900">Total Hours: <span className="font-semibold">{fmt(reportData.totalHours)}</span></div>
                <div className="overflow-auto max-h-[500px] border rounded">
                  <table className="w-full text-xs text-gray-900">
                    <thead className="bg-gray-50 sticky top-0 text-gray-900"><tr><th className="text-left px-2 py-1">Name</th><th className="text-left px-2 py-1">Hours</th><th className="text-left px-2 py-1">Shifts</th><th className="text-left px-2 py-1">Status</th></tr></thead>
                    <tbody className="text-gray-900">
                      {reportData.rows.map((r,i)=> <tr key={i} className="border-t"><td className="px-2 py-1 text-gray-900">{r.name}</td><td className="px-2 py-1 text-gray-900">{fmt(r.hours)}</td><td className="px-2 py-1 text-gray-900">{r.shifts}</td><td className="px-2 py-1 text-gray-900">{r.status}</td></tr>)}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {tab==='Hours by Category' && reportData.rows && (
              <div>
                <div className="text-xs mb-2 text-gray-900">Total Hours: <span className="font-semibold">{fmt(reportData.totalHours)}</span></div>
                <div className="overflow-auto max-h-[500px] border rounded">
                  <table className="w-full text-xs text-gray-900">
                    <thead className="bg-gray-50 sticky top-0 text-gray-900"><tr><th className="text-left px-2 py-1">Category</th><th className="text-left px-2 py-1">Hours</th></tr></thead>
                    <tbody className="text-gray-900">
                      {reportData.rows.map((r,i)=> <tr key={i} className="border-t"><td className="px-2 py-1 text-gray-900">{r.category}</td><td className="px-2 py-1 text-gray-900">{fmt(r.hours)}</td></tr>)}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {tab==='Shift Coverage' && reportData.rows && reportData.summary && (
              <div>
                <div className="grid sm:grid-cols-4 gap-3 mb-3 text-xs">
                  <div className="border rounded p-2 bg-gray-50 text-gray-900"><div className="text-[10px] text-gray-600">Total Shifts</div><div className="font-semibold text-gray-900">{reportData.summary.total}</div></div>
                  <div className="border rounded p-2 bg-green-50"><div className="text-[10px] text-gray-600">Fully Staffed</div><div className="font-semibold text-green-700">{reportData.summary.fullyStaffed}</div></div>
                  <div className="border rounded p-2 bg-yellow-50"><div className="text-[10px] text-gray-600">Partial</div><div className="font-semibold text-yellow-700">{reportData.summary.partial}</div></div>
                  <div className="border rounded p-2 bg-red-50"><div className="text-[10px] text-gray-600">Unstaffed</div><div className="font-semibold text-red-700">{reportData.summary.unstaffed}</div></div>
                </div>
                <div className="overflow-auto max-h-[400px] border rounded">
                  <table className="w-full text-xs text-gray-900">
                    <thead className="bg-gray-50 sticky top-0 text-gray-900"><tr><th className="text-left px-2 py-1">Date</th><th className="text-left px-2 py-1">Shift</th><th className="text-left px-2 py-1">Filled</th><th className="text-left px-2 py-1">Needed</th><th className="text-left px-2 py-1">Coverage</th><th className="text-left px-2 py-1">Status</th></tr></thead>
                    <tbody className="text-gray-900">
                      {reportData.rows.map((r,i)=> <tr key={i} className="border-t"><td className="px-2 py-1 whitespace-nowrap text-gray-900">{r.date}</td><td className="px-2 py-1 text-gray-900">{r.title}</td><td className="px-2 py-1 text-gray-900">{r.slotsFilled}</td><td className="px-2 py-1 text-gray-900">{r.slotsNeeded}</td><td className="px-2 py-1 text-gray-900">{fmt(r.coverage, 0)}%</td><td className="px-2 py-1 text-gray-900">{r.status}</td></tr>)}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {tab==='Retention' && reportData.summary && reportData.rows && (
              <div>
                <div className="grid sm:grid-cols-4 gap-3 mb-3 text-xs">
                  <div className="border rounded p-2 bg-gray-50 text-gray-900"><div className="text-[10px] text-gray-600">Total</div><div className="font-semibold text-gray-900">{reportData.summary.total}</div></div>
                  <div className="border rounded p-2 bg-green-50"><div className="text-[10px] text-gray-600">Active</div><div className="font-semibold text-green-700">{reportData.summary.active}</div></div>
                  <div className="border rounded p-2 bg-gray-50 text-gray-900"><div className="text-[10px] text-gray-600">Inactive</div><div className="font-semibold text-gray-900">{reportData.summary.inactive}</div></div>
                  <div className="border rounded p-2 bg-blue-50"><div className="text-[10px] text-gray-600">Retention Rate</div><div className="font-semibold text-blue-700">{reportData.summary.retentionRate}%</div></div>
                </div>
                <div className="overflow-auto max-h-[400px] border rounded">
                  <table className="w-full text-xs text-gray-900">
                    <thead className="bg-gray-50 sticky top-0 text-gray-900"><tr><th className="text-left px-2 py-1">Name</th><th className="text-left px-2 py-1">Status</th><th className="text-left px-2 py-1">Start Date</th><th className="text-left px-2 py-1">Last Shift</th><th className="text-left px-2 py-1">Hours</th></tr></thead>
                    <tbody className="text-gray-900">
                      {reportData.rows.map((r,i)=> <tr key={i} className="border-t"><td className="px-2 py-1 text-gray-900">{r.name}</td><td className="px-2 py-1 text-gray-900">{r.status}</td><td className="px-2 py-1 whitespace-nowrap text-gray-900">{r.startDate}</td><td className="px-2 py-1 whitespace-nowrap text-gray-900">{r.lastShift}</td><td className="px-2 py-1 text-gray-900">{fmt(r.totalHours)}</td></tr>)}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {tab==='No-Shows' && reportData.rows && (
              <div>
                <div className="text-xs mb-2 text-gray-900">Total No-Shows: <span className="font-semibold">{reportData.totalNoShows}</span></div>
                <div className="overflow-auto max-h-[500px] border rounded">
                  <table className="w-full text-xs text-gray-900">
                    <thead className="bg-gray-50 sticky top-0 text-gray-900"><tr><th className="text-left px-2 py-1">Name</th><th className="text-left px-2 py-1">No-Shows</th><th className="text-left px-2 py-1">Completed</th><th className="text-left px-2 py-1">Rate</th><th className="text-left px-2 py-1">Status</th></tr></thead>
                    <tbody className="text-gray-900">
                      {reportData.rows.map((r,i)=> <tr key={i} className="border-t"><td className="px-2 py-1 text-gray-900">{r.name}</td><td className="px-2 py-1 text-gray-900">{r.noShows}</td><td className="px-2 py-1 text-gray-900">{r.completed}</td><td className="px-2 py-1 text-gray-900">{fmt(r.completionRate, 0)}%</td><td className="px-2 py-1 text-gray-900">{r.status}</td></tr>)}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {tab==='Top Volunteers' && reportData.rows && (
              <div>
                <div className="overflow-auto max-h-[500px] border rounded">
                  <table className="w-full text-xs text-gray-900">
                    <thead className="bg-gray-50 sticky top-0 text-gray-900"><tr><th className="text-left px-2 py-1">Rank</th><th className="text-left px-2 py-1">Name</th><th className="text-left px-2 py-1">Hours</th><th className="text-left px-2 py-1">Shifts</th><th className="text-left px-2 py-1">Status</th></tr></thead>
                    <tbody className="text-gray-900">
                      {reportData.rows.map((r,i)=> <tr key={i} className="border-t"><td className="px-2 py-1 text-gray-900">{r.rank}</td><td className="px-2 py-1 text-gray-900">{r.name}</td><td className="px-2 py-1 text-gray-900">{fmt(r.hours)}</td><td className="px-2 py-1 text-gray-900">{r.shifts}</td><td className="px-2 py-1 text-gray-900">{r.status}</td></tr>)}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
        <div className="mt-6 text-xs text-gray-400 print:hidden">Report generated: {new Date().toLocaleString()}</div>
      </div>
    </div>
  );
};

window.VolunteerReports = VolunteerReports;
