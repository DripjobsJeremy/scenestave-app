/**
 * VolunteerRosterView.jsx
 * Full roster view: filters, sorting, bulk actions, export, profile editor integration.
 */

const { useState, useEffect, useMemo } = React;

const VolunteerRosterView = ({ userRole='Admin', onNavigate=()=>{} }) => {
  const allowedRoles = new Set([
    'Admin', 'admin', 'super_admin', 'venue_manager', 'client_admin',
    'Board Admin', 'board_member', 'Stage Manager', 'stage_manager', 'director',
  ]);
  if (!allowedRoles.has(userRole)) return <div className="p-4 text-sm text-red-600">Access denied.</div>;

  const storage = window.volunteerStorageService;
  const calc = window.volunteerCalculationService;
  const exporter = window.volunteerExportUtils || {};

  const [volunteers, setVolunteers] = useState([]);
  const [view, setView] = useState('table');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [editingProfile, setEditingProfile] = useState(null);
  const [bulkAction, setBulkAction] = useState('');
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(()=>{
    setVolunteers(storage.getVolunteerProfiles());
  }, [refreshToken]);

  const filtered = useMemo(()=>{
    let list = volunteers.slice();
    if (statusFilter !== 'all') list = list.filter(v => (v.volunteerInfo?.status||'unknown') === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(v => `${v.firstName} ${v.lastName}`.toLowerCase().includes(q) || (v.email||'').toLowerCase().includes(q));
    }
    // Sort
    list.sort((a,b)=>{
      let valA, valB;
      switch(sortBy) {
        case 'name':
          valA = `${a.firstName} ${a.lastName}`.toLowerCase();
          valB = `${b.firstName} ${b.lastName}`.toLowerCase();
          break;
        case 'hours':
          valA = calc.calculateVolunteerHours? calc.calculateVolunteerHours(a.id): (a.volunteerInfo?.totalHours||0);
          valB = calc.calculateVolunteerHours? calc.calculateVolunteerHours(b.id): (b.volunteerInfo?.totalHours||0);
          break;
        case 'status':
          valA = (a.volunteerInfo?.status||'').toLowerCase();
          valB = (b.volunteerInfo?.status||'').toLowerCase();
          break;
        case 'lastShift':
          valA = a.volunteerInfo?.lastShiftDate||0;
          valB = b.volunteerInfo?.lastShiftDate||0;
          break;
        default:
          valA = valB = 0;
      }
      if (valA < valB) return sortDir==='asc'? -1: 1;
      if (valA > valB) return sortDir==='asc'? 1: -1;
      return 0;
    });
    return list;
  }, [volunteers, search, statusFilter, sortBy, sortDir]);

  function toggleSelect(id) {
    setSelected(prev => {
      const copy = new Set(prev);
      if (copy.has(id)) copy.delete(id); else copy.add(id);
      return copy;
    });
  }

  function selectAll() {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(v=>v.id)));
  }

  function handleSort(column) {
    if (sortBy === column) setSortDir(d => d==='asc'? 'desc': 'asc');
    else { setSortBy(column); setSortDir('asc'); }
  }

  function bulkUpdateStatus(status) {
    if (selected.size===0) return;
    selected.forEach(id => storage.updateVolunteerProfile(id, { status }));
    setSelected(new Set());
    setRefreshToken(t=>t+1);
  }

  function exportRoster() {
    try {
      if (window.exportVolunteerRoster) {
        window.exportVolunteerRoster(filtered);
      } else if (exporter.exportVolunteerRoster) {
        exporter.exportVolunteerRoster(filtered);
      } else {
        // Inline CSV export fallback
        const header = ['name','email','phone','status','hours','skills','lastShift'];
        const rows = filtered.map(v => {
          const info = v.volunteerInfo||{};
          return [
            `${v.firstName} ${v.lastName}`,
            v.email||'',
            v.phone||'',
            info.status||'',
            calc.calculateVolunteerHours? calc.calculateVolunteerHours(v.id): (info.totalHours||0),
            (info.skills||[]).join(';'),
            info.lastShiftDate? new Date(info.lastShiftDate).toISOString(): ''
          ];
        });
        const csv = [header.join(','), ...rows.map(r=>r.map(x=>`"${(x||'').toString().replace(/"/g,'""')}"`).join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'volunteer-roster.csv';
        link.click();
      }
    } catch(e) { console.error('Export failed', e); }
  }

  function executeBulkAction() {
    if (!bulkAction || selected.size===0) return;
    if (bulkAction === 'export') {
      const selectedVols = volunteers.filter(v => selected.has(v.id));
      // inline export of selected
      const header = ['name','email','phone','status','hours'];
      const rows = selectedVols.map(v => [`${v.firstName} ${v.lastName}`, v.email||'', v.phone||'', v.volunteerInfo?.status||'', calc.calculateVolunteerHours? calc.calculateVolunteerHours(v.id): (v.volunteerInfo?.totalHours||0)]);
      const csv = [header.join(','), ...rows.map(r=>r.map(x=>`"${(x||'').toString().replace(/"/g,'""')}"`).join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'selected-volunteers.csv';
      link.click();
      setSelected(new Set());
    } else {
      // status updates
      bulkUpdateStatus(bulkAction);
    }
    setBulkAction('');
  }

  const SortButton = ({ column, label }) => (
    <button title={`Sort by ${label}`} onClick={()=>handleSort(column)} className="font-medium hover:underline flex items-center gap-1">
      {label} {sortBy===column && (sortDir==='asc'? '↑':'↓')}
    </button>
  );

  return (
    <div className="p-4 space-y-4 text-gray-900" aria-label="Volunteer Roster View">
      <header className="vol-page-header flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 vol-page-title">Volunteer Roster</h1>
          <div className="text-xs vol-page-subtitle mt-1">{filtered.length} volunteers</div>
        </div>
        <div className="flex gap-2">
          <button title="Table view" className={`px-3 py-1 rounded text-sm border ${view==='table'?'bg-violet-600 text-white border-violet-600':'bg-white text-gray-900'}`} onClick={()=>setView('table')}>Table</button>
          <button title="Card view" className={`px-3 py-1 rounded text-sm border ${view==='card'?'bg-violet-600 text-white border-violet-600':'bg-white text-gray-900'}`} onClick={()=>setView('card')}>Cards</button>
        </div>
      </header>

      <div className="flex flex-wrap gap-2 items-center text-sm">
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name or email" title="Search volunteers" className="border rounded px-2 py-1 flex-1 min-w-[160px] bg-white text-gray-900" />
        <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} title="Filter by status" className="border rounded px-2 py-1 text-xs bg-white text-gray-900">
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="paused">Paused</option>
          <option value="banned">Banned</option>
        </select>
        <button onClick={exportRoster} title="Export all filtered" className="border rounded px-3 py-1 text-xs bg-white text-gray-900">Export All</button>
        {selected.size>0 && (
          <div className="flex gap-2 items-center text-xs border-l pl-2">
            <span className="text-gray-600">{selected.size} selected</span>
            <select value={bulkAction} onChange={e=>setBulkAction(e.target.value)} title="Bulk action" className="border rounded px-2 py-1 bg-white text-gray-900">
              <option value="">Bulk Action...</option>
              <option value="active">Set Active</option>
              <option value="inactive">Set Inactive</option>
              <option value="paused">Set Paused</option>
              <option value="export">Export Selected</option>
            </select>
            <button disabled={!bulkAction} onClick={executeBulkAction} className={`px-2 py-1 rounded ${bulkAction?'bg-green-600 text-white':'bg-gray-200 text-gray-500'}`}>Go</button>
            <button onClick={()=>setSelected(new Set())} title="Clear selection" className="px-2 py-1 rounded border bg-white text-gray-900">Clear</button>
          </div>
        )}
      </div>

      {view==='table' ? (
        <div className="banquo-card bg-white rounded shadow overflow-auto" aria-label="Roster Table">
          <table className="min-w-full text-xs text-gray-900">
            <thead className="bg-gray-50 text-gray-900">
              <tr>
                <th className="text-left px-2 py-1"><input type="checkbox" title="Select all" checked={selected.size===filtered.length && filtered.length>0} onChange={selectAll} /></th>
                <th className="text-left px-2 py-1"><SortButton column="name" label="Name" /></th>
                <th className="text-left px-2 py-1">Email</th>
                <th className="text-left px-2 py-1">Skills</th>
                <th className="text-left px-2 py-1"><SortButton column="hours" label="Hours" /></th>
                <th className="text-left px-2 py-1"><SortButton column="lastShift" label="Last Shift" /></th>
                <th className="text-left px-2 py-1"><SortButton column="status" label="Status" /></th>
                <th className="text-left px-2 py-1">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0,200).map(v => {
                const info = v.volunteerInfo||{};
                const hours = calc.calculateVolunteerHours? calc.calculateVolunteerHours(v.id): (info.totalHours||0);
                return (
                  <tr key={v.id} className="border-t hover:bg-gray-50">
                    <td className="px-2 py-1"><input type="checkbox" title={`Select ${v.firstName} ${v.lastName}`} checked={selected.has(v.id)} onChange={()=>toggleSelect(v.id)} /></td>
                    <td className="px-2 py-1 whitespace-nowrap font-medium text-gray-900">{v.firstName} {v.lastName}</td>
                    <td className="px-2 py-1">{v.email||'—'}</td>
                    <td className="px-2 py-1">{(info.skills||[]).slice(0,3).join(', ')||'—'}</td>
                    <td className="px-2 py-1">{hours}</td>
                    <td className="px-2 py-1 whitespace-nowrap">{info.lastShiftDate? new Date(info.lastShiftDate).toLocaleDateString(): '—'}</td>
                    <td className="px-2 py-1"><span className={`px-1.5 py-0.5 rounded ${info.status==='active'?'bg-green-100 text-green-700': info.status==='inactive'?'bg-gray-100 text-gray-700':'bg-yellow-100 text-yellow-700'}`}>{info.status||'—'}</span></td>
                    <td className="px-2 py-1 space-x-1 text-xs">
                      <button className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors" onClick={()=>setEditingProfile(v.id)}>Profile</button>
                      <button className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 transition-colors" onClick={()=>onNavigate('shifts')}>Schedule</button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length===0 && <tr><td colSpan={8} className="px-2 py-3 text-center text-gray-500">No volunteers match filters.</td></tr>}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3" aria-label="Roster Card View">
          {filtered.slice(0,100).map(v => {
            const info = v.volunteerInfo||{};
            const hours = calc.calculateVolunteerHours? calc.calculateVolunteerHours(v.id): (info.totalHours||0);
            return (
              <div key={v.id} className="banquo-card--flat bg-white rounded border shadow-sm p-3 text-xs flex flex-col gap-2 text-gray-900">
                <div className="flex justify-between items-start">
                  <h3 className="font-semibold text-sm">{v.firstName} {v.lastName}</h3>
                  <input type="checkbox" title={`Select ${v.firstName} ${v.lastName}`} checked={selected.has(v.id)} onChange={()=>toggleSelect(v.id)} />
                </div>
                <div className="text-[11px] text-gray-600">{v.email||'—'}</div>
                <div className="flex justify-between text-[11px]">
                  <span>Hours: {hours}</span>
                  <span className={`px-1.5 py-0.5 rounded ${info.status==='active'?'bg-green-100 text-green-700': info.status==='inactive'?'bg-gray-100 text-gray-700':'bg-yellow-100 text-yellow-700'}`}>{info.status||'—'}</span>
                </div>
                <div className="text-[11px] text-gray-600">Skills: {(info.skills||[]).slice(0,3).join(', ') || '—'}</div>
                <div className="text-[11px] text-gray-600">Last: {info.lastShiftDate? new Date(info.lastShiftDate).toLocaleDateString(): '—'}</div>
                <div className="flex gap-2 mt-1 text-[11px] border-t pt-2">
                  <button className="text-blue-600 hover:underline" onClick={()=>setEditingProfile(v.id)}>Profile</button>
                  <button className="text-green-600 hover:underline" onClick={()=>onNavigate('shifts')}>Schedule</button>
                </div>
              </div>
            );
          })}
          {filtered.length===0 && <div className="text-sm text-gray-500 col-span-full">No volunteers match filters.</div>}
        </div>
      )}

      {editingProfile && window.VolunteerProfileEditor && (
        <window.VolunteerProfileEditor
          contactId={editingProfile}
          userRole={userRole}
          onClose={()=>setEditingProfile(null)}
          onUpdated={()=>setRefreshToken(t=>t+1)}
        />
      )}
    </div>
  );
};

window.VolunteerRosterView = VolunteerRosterView;
