/**
 * VolunteerShiftScheduler.jsx
 * Implements month/week/list views, single shift creation, bulk recurring creation, filtering and basic coverage stats.
 */

const { useState, useEffect, useMemo, useRef } = React;

const VolunteerShiftScheduler = ({ userRole = 'Admin', onNavigate = () => {}, defaultView='month', initialAssignShiftId = null }) => {
  const allowedRoles = new Set(['Admin', 'Board Admin', 'Stage Manager']);
  if (!allowedRoles.has(userRole)) return <div className="p-4 text-sm text-red-600">Access denied.</div>;

  // Helper to format time based on user preference
  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    return window.preferencesService?.formatTime(timeStr) || timeStr;
  };

  // Ref for search input to support keyboard shortcuts
  const searchInputRef = useRef(null);

  // Load saved filters from localStorage
  const loadSavedFilters = () => {
    try {
      const saved = localStorage.getItem('shiftScheduler.filters');
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...{ production:'', status:'all', category:'', search:'', start:null, end:null }, ...parsed };
      }
    } catch (e) {
      console.warn('Failed to load saved filters:', e);
    }
    return { production:'', status:'all', category:'', search:'', start:null, end:null };
  };

  const [view, setView] = useState(defaultView); // month|week|list
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(loadSavedFilters());
  const [showConflictsOnly, setShowConflictsOnly] = useState(() => {
    try {
      const saved = localStorage.getItem('shiftScheduler.showConflictsOnly');
      return saved === 'true';
    } catch (e) {
      return false;
    }
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const [form, setForm] = useState({ opportunityId:'', title:'', date:'', startTime:'18:00', endTime:'21:00', slotsNeeded:1, notes:'' });
  const [errors, setErrors] = useState([]); // summary errors (optional)
  const [fieldErrors, setFieldErrors] = useState({}); // inline field errors
  const [editId, setEditId] = useState(null);
  const [bulk, setBulk] = useState({ opportunityId:'', startDate:'', endDate:'', daysOfWeek:{mon:true,tue:true,wed:true,thu:true,fri:true,sat:false,sun:false}, startTime:'18:00', endTime:'21:00', slotsNeeded:1 });
  const [bulkPreview, setBulkPreview] = useState([]);
  const [showConflictsPanel, setShowConflictsPanel] = useState(false);
  const [assignShiftId, setAssignShiftId] = useState(initialAssignShiftId);

  // Save filters to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('shiftScheduler.filters', JSON.stringify(filters));
    } catch (e) {
      console.warn('Failed to save filters:', e);
    }
  }, [filters]);

  // Save showConflictsOnly to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('shiftScheduler.showConflictsOnly', String(showConflictsOnly));
    } catch (e) {
      console.warn('Failed to save showConflictsOnly:', e);
    }
  }, [showConflictsOnly]);

  // Open Assignment Manager modal if initialAssignShiftId is provided
  useEffect(() => {
    if (initialAssignShiftId) {
      setAssignShiftId(initialAssignShiftId);
    }
  }, [initialAssignShiftId]);

  useEffect(()=>{
    let cancelled = false;
    const load = () => {
      if (cancelled) return;
      try {
        setLoading(true);
        const storage = window.volunteerStorageService;
        if (!storage) { setTimeout(load, 50); return; }
        // Load shifts from storage
        const allShifts = storage.getVolunteerShifts() || [];
        setShifts(allShifts);
      } finally { if (!cancelled) setLoading(false); }
    };
    load();
    return () => { cancelled = true; };
  }, [refreshToken]);

  const opportunities = useMemo(()=>{
    const storage = window.volunteerStorageService;
    return storage ? storage.getVolunteerOpportunities() : [];
  }, [refreshToken]);

  // Enhanced conflicts: overlap, travel, preference violations
  const conflictData = useMemo(() => {
    const utils = window.volunteerConflictUtils;
    if (!utils?.computeConflicts) return { list: [], countsByShift: {}, grouped: [] };
    const volunteers = window.volunteerStorageService?.getVolunteerProfiles?.() || [];
    const opportunities = window.volunteerStorageService?.getVolunteerOpportunities?.() || [];
    return utils.computeConflicts(shifts, volunteers, opportunities);
  }, [shifts]);

  const conflicts = conflictData.list;
  const conflictCounts = useMemo(() => {
    // Convert plain object to Map for existing code compatibility
    const map = new Map();
    Object.entries(conflictData.countsByShift || {}).forEach(([k,v]) => map.set(k, v));
    return map;
  }, [conflictData]);

  const groupedConflicts = conflictData.grouped;

  // Map of shiftId -> array of conflict type labels
  const conflictTypesByShift = useMemo(() => {
    const map = new Map();
    conflicts.forEach(c => {
      const add = (id) => {
        if (!id) return;
        const set = map.get(id) || new Set();
        set.add(c.type);
        map.set(id, set);
      };
      add(c.aShiftId || c.shiftId);
      if (c.bShiftId) add(c.bShiftId);
    });
    // convert sets to arrays for easier use in JSX
    const out = new Map();
    map.forEach((set, id) => out.set(id, Array.from(set)));
    return out;
  }, [conflicts]);

  const unassignVolunteerFromShift = (shiftId, volunteerKey) => {
    const storage = window.volunteerStorageService;
    if (!storage) return;
    const all = storage.getVolunteerShifts();
    const shift = all.find(s => s.id === shiftId);
    if (!shift || !Array.isArray(shift.assignments)) return;
    shift.assignments = shift.assignments.filter(a => (a.volunteerId || a.volunteerName) !== volunteerKey);
    shift.slotsFilled = shift.assignments.filter(a => ['confirmed','completed'].includes(a.status)).length;
    if (shift.status === 'filled' && shift.slotsFilled < shift.slotsNeeded) shift.status = 'open';
    storage.saveVolunteerShift(shift);
    setRefreshToken(t => t + 1);
  };

  const filtered = useMemo(()=>{
    let list = shifts.slice();
    if (filters.opportunityId) list = list.filter(s => s.opportunityId === filters.opportunityId);
    if (filters.category) {
      list = list.filter(s => {
        const opp = opportunities.find(o => o.id === s.opportunityId);
        return opp && opp.category === filters.category;
      });
    }
    if (filters.status !== 'all') list = list.filter(s => s.status === filters.status);
    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(s => (s.title||'').toLowerCase().includes(q));
    }
    if (filters.start && filters.end) list = list.filter(s => s.date >= filters.start && s.date <= filters.end);
    if (showConflictsOnly) list = list.filter(s => (conflictCounts.get(s.id)||0) > 0);
    return list.sort((a,b)=> {
      const dateA = typeof a.date === 'number' ? a.date : new Date(a.date).getTime();
      const dateB = typeof b.date === 'number' ? b.date : new Date(b.date).getTime();
      return dateA - dateB;
    });
  }, [shifts, filters, opportunities, showConflictsOnly, conflictCounts]);

  const openCreate = () => {
    setEditId(null);
    setForm({ opportunityId:'', title:'', date:new Date().toISOString().split('T')[0], startTime:'18:00', endTime:'21:00', slotsNeeded:1, notes:'' });
    setErrors([]);
    setCreateOpen(true);
  };

  const openEdit = (shift) => {
    setEditId(shift.id);
    setForm({ opportunityId:shift.opportunityId||'', title:shift.title||'', date:shift.date, startTime:shift.startTime, endTime:shift.endTime, slotsNeeded:shift.slotsNeeded, notes:shift.notes||'' });
    setErrors([]);
    setCreateOpen(true);
  };

  const validateShift = () => {
    const util = window.validationUtils;
    if (util?.validateShift){
      const { valid, fieldErrors: fe } = util.validateShift(form);
      setFieldErrors(fe);
      setErrors(valid ? [] : Object.entries(fe).map(([k,v])=>`${k}: ${v}`));
      return valid;
    }
    // Fallback
    const fe = {};
    if (!form.opportunityId) fe.opportunityId = 'Required';
    if (!form.title || !form.title.trim()) fe.title = 'Required';
    if (!form.date) fe.date = 'Required';
    if (!form.startTime) fe.startTime = 'Start time required';
    if (!form.endTime) fe.endTime = 'End time required';
    if (form.startTime && form.endTime && form.endTime <= form.startTime) fe.endTime = 'End must be after start';
    if (!form.slotsNeeded || form.slotsNeeded < 1) fe.slotsNeeded = 'Must be ≥ 1';
    setFieldErrors(fe);
    setErrors(Object.values(fe));
    return Object.keys(fe).length === 0;
  };

  const saveShift = () => {
    if (!validateShift()) return;
    const storage = window.volunteerStorageService;
    const payload = { id:editId, opportunityId: form.opportunityId, title: form.title, date: form.date, startTime: form.startTime, endTime: form.endTime, slotsNeeded: form.slotsNeeded, slotsFilled:0, status:'open', assignments: [], notes: form.notes };
    storage.saveVolunteerShift(payload);
    
    // Show success notification
    const isNew = !editId;
    window.toast?.success(isNew ? 'Shift created successfully!' : 'Shift updated successfully!');
    
    setCreateOpen(false);
    setRefreshToken(t=>t+1);
  };

  const deleteShift = (shiftId) => {
    const storage = window.volunteerStorageService;
    storage.deleteVolunteerShift(shiftId);
    setRefreshToken(t=>t+1);
  };

  // Bulk Creation
  const generateBulkPreview = () => {
    const dates = [];
    if (!bulk.startDate || !bulk.endDate || !bulk.opportunityId) { setBulkPreview([]); return; }
    const start = new Date(bulk.startDate);
    const end = new Date(bulk.endDate);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate()+1)) {
      const dayName = ['sun','mon','tue','wed','thu','fri','sat'][d.getDay()];
      if (bulk.daysOfWeek[dayName]) {
        dates.push(d.toISOString().split('T')[0]);
      }
    }
    setBulkPreview(dates);
  };

  useEffect(generateBulkPreview, [bulk.startDate, bulk.endDate, bulk.daysOfWeek, bulk.opportunityId]);

  const createBulkShifts = () => {
    const storage = window.volunteerStorageService;
    const opp = opportunities.find(o=>o.id===bulk.opportunityId);
    bulkPreview.forEach(date => {
      storage.saveVolunteerShift({ opportunityId: bulk.opportunityId, title: (opp?.title||'Shift') + ' ' + date, date, startTime: bulk.startTime, endTime: bulk.endTime, slotsNeeded: bulk.slotsNeeded, slotsFilled:0, status:'open', assignments: [] });
    });
    window.toast?.success(`${bulkPreview.length} recurring shifts created!`);
    setWizardOpen(false);
    setBulkPreview([]);
    setRefreshToken(t=>t+1);
  };

  // Reschedule handler (date only)
  const rescheduleShift = (shiftId, newDate) => {
    const storage = window.volunteerStorageService;
    if (!storage) return;
    const all = storage.getVolunteerShifts();
    const target = all.find(s => s.id === shiftId);
    if (!target) return;
    if (target.date === newDate) return; // no change
    target.date = newDate;
    storage.saveVolunteerShift(target);
    setRefreshToken(t=>t+1);
  };

  const KeyboardShortcutsWrapper = window.KeyboardShortcuts || (({ children }) => children);

  return (
    <KeyboardShortcutsWrapper
      onNewShift={() => setCreateOpen(true)}
      onFocusSearch={() => searchInputRef.current?.focus()}
      onCloseModal={() => {
        if (createOpen) setCreateOpen(false);
        else if (wizardOpen) setWizardOpen(false);
        else if (assignShiftId) setAssignShiftId(null);
      }}
      onToday={() => {
        // Go to current month/week in calendar
        setRefreshToken(t => t + 1);
      }}
    >
      <div className="p-4 space-y-4" aria-label="Volunteer Shift Scheduler">
      <header className="vol-page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-xl font-bold text-gray-900 vol-page-title">Shift Scheduler</h1>
        <div className="flex gap-2" aria-label="Shift Views">
          <button className={`px-3 py-1 rounded text-sm border font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 ${view==='month'?'bg-blue-600 text-white border-blue-600 shadow':'bg-white text-gray-900 border-gray-300 hover:bg-gray-50'}`} onClick={()=>setView('month')} title="Month View">Month View</button>
          <button className={`px-3 py-1 rounded text-sm border font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 ${view==='week'?'bg-blue-600 text-white border-blue-600 shadow':'bg-white text-gray-900 border-gray-300 hover:bg-gray-50'}`} onClick={()=>setView('week')} title="Week View">Week View</button>
          <button className={`px-3 py-1 rounded text-sm border font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 ${view==='list'?'bg-blue-600 text-white border-blue-600 shadow':'bg-white text-gray-900 border-gray-300 hover:bg-gray-50'}`} onClick={()=>setView('list')} title="List View">List View</button>
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        <button onClick={openCreate} className="bg-green-600 text-white px-4 py-2 rounded text-sm">+ Create Shift</button>
        <button onClick={()=>setWizardOpen(true)} className="bg-purple-600 text-white px-4 py-2 rounded text-sm">+ Recurring Shifts</button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded shadow p-3 flex flex-wrap gap-3 items-end text-xs text-gray-900" aria-label="Shift Filters">
        <label className="flex flex-col">
          <span className="mb-1 font-medium">Opportunity</span>
          <select value={filters.opportunityId||''} onChange={e=>setFilters(f=>({...f,opportunityId:e.target.value||''}))} className="border rounded px-2 py-1 min-w-[160px] bg-white text-gray-900" title="Filter by Opportunity">
            <option value="">All</option>
            {opportunities.map(o=> <option key={o.id} value={o.id}>{o.title}</option>)}
          </select>
        </label>
        <label className="flex flex-col">
          <span className="mb-1 font-medium">Category</span>
          <select value={filters.category} onChange={e=>setFilters(f=>({...f,category:e.target.value}))} className="border rounded px-2 py-1 min-w-[140px] bg-white text-gray-900" title="Filter by Category">
            <option value="">All</option>
            <option>Front of House</option>
            <option>Backstage Crew</option>
            <option>Administrative</option>
            <option>Event Support</option>
          </select>
        </label>
        <label className="flex flex-col">
          <span className="mb-1 font-medium">Status</span>
          <select value={filters.status} onChange={e=>setFilters(f=>({...f,status:e.target.value}))} className="border rounded px-2 py-1 min-w-[120px] bg-white text-gray-900" title="Filter by Status">
            <option value="all">All</option>
            <option value="open">Open</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>
        <label className="flex flex-col">
          <span className="mb-1 font-medium">Search</span>
          <input 
            ref={searchInputRef}
            value={filters.search} 
            onChange={e=>setFilters(f=>({...f,search:e.target.value}))} 
            className="border rounded px-2 py-1 min-w-[160px] bg-white text-gray-900" 
            placeholder="Title contains..." 
          />
        </label>
        <label className="flex flex-col">
          <span className="mb-1 font-medium">Start Date</span>
          <input type="date" value={filters.start||''} onChange={e=>setFilters(f=>({...f,start:e.target.value||null}))} className="border rounded px-2 py-1 bg-white text-gray-900" />
        </label>
        <label className="flex flex-col">
          <span className="mb-1 font-medium">End Date</span>
          <input type="date" value={filters.end||''} onChange={e=>setFilters(f=>({...f,end:e.target.value||null}))} className="border rounded px-2 py-1 bg-white text-gray-900" />
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={showConflictsOnly} onChange={e=>setShowConflictsOnly(e.target.checked)} />
          <span className="font-medium">Only conflicts</span>
        </label>
        <button
          onClick={() => {
            setFilters({ production:'', status:'all', category:'', search:'', start:null, end:null });
            setShowConflictsOnly(false);
            window.toast?.success('Filters cleared');
          }}
          className="px-3 py-1 rounded border text-xs bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
          title="Clear all filters"
        >Clear Filters</button>
        <button
          onClick={()=>setShowConflictsPanel(p=>!p)}
          className={`px-2 py-1 rounded border text-[11px] ${showConflictsPanel? 'bg-red-600 text-white border-red-600':'bg-white text-gray-900 border-gray-300 hover:bg-gray-50'}`}
          aria-label={showConflictsPanel? 'Hide conflicts panel':'Show conflicts panel'}
        >{showConflictsPanel? 'Hide Conflicts':'Show Conflicts'}</button>
      </div>

      {/* View + Conflicts Panel */}
      <div className={`flex ${showConflictsPanel ? 'flex-col lg:flex-row gap-4' : 'flex-col'}`}>
        <div className={`${showConflictsPanel ? 'lg:w-3/4' : 'w-full'} transition-all`}> 
          {loading ? (
            window.SkeletonLoaders ? (
              view === 'month' ? <window.SkeletonLoaders.Calendar /> :
              view === 'list' ? <window.SkeletonLoaders.Table rows={10} columns={8} /> :
              <window.SkeletonLoaders.List items={7} />
            ) : (
              <div className="p-6 text-sm text-gray-500">Loading shifts...</div>
            )
          ) : 
           shifts.length === 0 ? (
            window.EmptyStates ? (
              <window.EmptyStates.Shifts
                onCreateShift={() => setCreateOpen(true)}
                onLoadTestData={() => {
                  if (window.seedMinimalVolunteerData) {
                    const result = window.seedMinimalVolunteerData(true);
                    setRefreshToken(t => t + 1);
                    window.toast?.success(`Test data loaded! ${result.opportunities} opportunities, ${result.shifts} shifts, ${result.volunteers} volunteers`);
                  }
                }}
              />
            ) : (
              <div className="bg-white rounded shadow p-6 text-center">
                <p className="text-gray-900 mb-4">No shifts have been created yet.</p>
                <p className="text-sm text-gray-600 mb-4">Click "Create Shift" above to schedule a new shift.</p>
                <button
                  onClick={() => {
                    if (window.seedMinimalVolunteerData) {
                      const result = window.seedMinimalVolunteerData(true);
                      setRefreshToken(t => t + 1);
                      window.toast?.success(`Test data loaded! ${result.opportunities} opportunities, ${result.shifts} shifts, ${result.volunteers} volunteers`);
                    } else {
                      window.toast?.error('Test data function not available. Check console for errors.');
                    }
                  }}
                  className="px-4 py-2 rounded bg-violet-600 text-white hover:bg-violet-700 text-sm"
                >
                  Load Test Data (for development)
                </button>
              </div>
            )
          ) : filtered.length === 0 ? (
            window.EmptyStates ? (
              <window.EmptyStates.NoResults
                onClearFilters={() => {
                  setFilters({ production:'', status:'all', category:'', search:'', start:null, end:null });
                  setShowConflictsOnly(false);
                }}
                searchTerm={filters.search}
              />
            ) : (
              <div className="bg-white rounded shadow p-6 text-center">
                <p className="text-gray-900">No shifts match your filters.</p>
              </div>
            )
          ) : (
            view === 'month' ? <MonthView shifts={filtered} conflictCounts={conflictCounts} conflictTypesByShift={conflictTypesByShift} onReschedule={rescheduleShift} onAssign={setAssignShiftId} formatTime={formatTime} /> : view === 'week' ? <WeekView shifts={filtered} conflictCounts={conflictCounts} conflictTypesByShift={conflictTypesByShift} onReschedule={rescheduleShift} onAssign={setAssignShiftId} formatTime={formatTime} /> : <ListView shifts={filtered} onEdit={openEdit} onDelete={deleteShift} onAssign={setAssignShiftId} opportunities={opportunities} conflictCounts={conflictCounts} conflictTypesByShift={conflictTypesByShift} formatTime={formatTime} />
          )}
        </div>
        {showConflictsPanel && (
          <aside className="bg-white rounded shadow p-4 text-xs lg:w-1/4 max-h-[560px] overflow-auto" aria-label="Conflicts Panel">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-red-700">Conflicts ({conflicts.length})</h2>
              <button onClick={()=>setShowConflictsPanel(false)} aria-label="Close conflicts panel" className="text-gray-500 hover:text-gray-700 text-xs">✕</button>
            </div>
            {conflicts.length === 0 && <div className="text-gray-500">No conflicts detected</div>}
            {groupedConflicts.map(v => (
              <div key={v.volunteerId || v.volunteerKey} className="mb-3 border rounded">
                <div className="px-2 py-1 bg-red-50 border-b text-red-700 font-medium flex items-center justify-between">
                  <span>{v.volunteerName || v.volunteerId}</span>
                  <span className="text-[10px]">{v.dates.reduce((sum,d)=>sum+d.conflicts.length,0)} total</span>
                </div>
                <div className="p-2 space-y-2">
                  {v.dates.map(d => (
                    <div key={d.date} className="space-y-1">
                      <div className="text-[10px] font-semibold text-gray-700">{d.date}</div>
                      {d.conflicts.map((c, idx) => {
                        const a = shifts.find(s=>s.id === (c.aShiftId || c.shiftId));
                        const b = c.bShiftId ? shifts.find(s=>s.id === c.bShiftId) : null;
                        const titleA = a?.title || 'Shift';
                        const titleB = b?.title || (c.type === 'preference' ? 'Preference' : '—');
                        const badges = [];
                        if (c.type === 'overlap') badges.push({label:'Overlap', title:`${a?.startTime||''}-${a?.endTime||''} vs ${b?.startTime||''}-${b?.endTime||''}`});
                        if (c.type === 'travel') badges.push({label:'Travel', title:`${c.details?.distanceKm||'?'} km, need ${c.details?.travelMinutesNeeded||'?'}m, have ${c.details?.travelMinutesAvailable||'?'}m`});
                        if (c.type === 'preference') badges.push({label:'Preference', title:`Unavailable ${c.details?.missingDay?'day':''} ${c.details?.missingTime?c.details?.bucket:''}`.trim()});
                        return (
                          <div key={idx} className="border rounded p-1 flex flex-col gap-1 bg-red-50">
                            <div className="flex justify-between items-center gap-1">
                              <span className="font-medium text-red-800 truncate" title={titleA}>{titleA}</span>
                              {b && <span className="text-[10px] text-gray-600">vs</span>}
                              {b && <span className="font-medium text-red-800 truncate" title={titleB}>{titleB}</span>}
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {badges.map((bdg,i)=>(
                                <span key={i} className="px-1.5 py-0.5 rounded bg-white border text-[10px] text-red-700" title={bdg.title}>{bdg.label}</span>
                              ))}
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {b && (
                                <>
                                  <button onClick={()=>unassignVolunteerFromShift(c.bShiftId, c.volunteerId||c.volunteerKey)} className="px-2 py-0.5 rounded bg-red-600 text-white text-[10px] hover:bg-red-700" aria-label="Unassign volunteer from second shift">Unassign 2nd</button>
                                  <button onClick={()=>unassignVolunteerFromShift(c.aShiftId, c.volunteerId||c.volunteerKey)} className="px-2 py-0.5 rounded bg-red-600 text-white text-[10px] hover:bg-red-700" aria-label="Unassign volunteer from first shift">Unassign 1st</button>
                                  <button onClick={()=>openEdit(shifts.find(s=>s.id===c.aShiftId))} className="px-2 py-0.5 rounded bg-blue-600 text-white text-[10px] hover:bg-blue-700" aria-label="Edit first shift">Edit 1st</button>
                                  <button onClick={()=>openEdit(shifts.find(s=>s.id===c.bShiftId))} className="px-2 py-0.5 rounded bg-blue-600 text-white text-[10px] hover:bg-blue-700" aria-label="Edit second shift">Edit 2nd</button>
                                </>
                              )}
                              {!b && (
                                <button onClick={()=>openEdit(a)} className="px-2 py-0.5 rounded bg-blue-600 text-white text-[10px] hover:bg-blue-700" aria-label="Edit shift">Edit</button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </aside>
        )}
      </div>

      {/* Create/Edit Shift Modal */}
      {createOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-label="Shift Modal">
          <div className="bg-white rounded shadow p-6 w-full max-w-lg">
            <h2 className="text-lg font-semibold mb-4 text-gray-900">{editId ? 'Edit Shift' : 'Create Shift'}</h2>
            <div className="space-y-4 text-sm text-gray-900">
              <label className="block">
                <span className="block text-xs font-medium mb-1 text-gray-700">Opportunity *</span>
                <select value={form.opportunityId} onChange={e=>{
                  const opp = opportunities.find(o=>o.id===e.target.value);
                  setForm(f=>({...f,opportunityId:e.target.value, slotsNeeded: opp?.slotsNeededDefault || f.slotsNeeded }));
                  if (fieldErrors.opportunityId) validateShift();
                }}
                onBlur={()=>{ if(!fieldErrors.opportunityId) validateShift(); }}
                className={`w-full border rounded px-2 py-2 bg-white text-gray-900 ${fieldErrors.opportunityId? 'border-red-500':''}`}
                title="Select Opportunity"
                
                aria-describedby={fieldErrors.opportunityId? 'err-shift-opp': undefined}
                >
                  <option value="">Select...</option>
                  {opportunities.map(o=> <option key={o.id} value={o.id}>{o.title}</option>)}
                </select>
                {fieldErrors.opportunityId && <div id="err-shift-opp" className="mt-1 text-xs text-red-600" role="alert">{fieldErrors.opportunityId}</div>}
              </label>
              <label className="block">
                <span className="block text-xs font-medium mb-1 text-gray-700">Title *</span>
                <input
                  value={form.title}
                  onChange={e=>{ const val=e.target.value; setForm(f=>({...f,title:val})); if(fieldErrors.title) validateShift(); }}
                  onBlur={()=>{ if(!fieldErrors.title) validateShift(); }}
                  className={`w-full border rounded px-2 py-2 bg-white text-gray-900 ${fieldErrors.title? 'border-red-500':''}`}
                  placeholder="Shift title"
                  
                  aria-describedby={fieldErrors.title? 'err-shift-title': undefined}
                />
                {fieldErrors.title && <div id="err-shift-title" className="mt-1 text-xs text-red-600" role="alert">{fieldErrors.title}</div>}
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  <span className="block text-xs font-medium mb-1 text-gray-700">Date *</span>
                  <input
                    type="date"
                    value={form.date}
                    onChange={e=>{ const val=e.target.value; setForm(f=>({...f,date:val})); if(fieldErrors.date) validateShift(); }}
                    onBlur={()=>{ if(!fieldErrors.date) validateShift(); }}
                    className={`w-full border rounded px-2 py-2 bg-white text-gray-900 ${fieldErrors.date? 'border-red-500':''}`}
                    
                    aria-describedby={fieldErrors.date? 'err-shift-date': undefined}
                  />
                  {fieldErrors.date && <div id="err-shift-date" className="mt-1 text-xs text-red-600" role="alert">{fieldErrors.date}</div>}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="block text-xs font-medium mb-1 text-gray-700">Start *</span>
                    <input
                      type="time"
                      value={form.startTime}
                      onChange={e=>{ const val=e.target.value; setForm(f=>({...f,startTime:val})); if(fieldErrors.startTime || fieldErrors.endTime) validateShift(); }}
                      onBlur={()=>{ if(!fieldErrors.startTime) validateShift(); }}
                      className={`w-full border rounded px-2 py-2 bg-white text-gray-900 ${fieldErrors.startTime? 'border-red-500':''}`}
                      
                      aria-describedby={fieldErrors.startTime? 'err-shift-start': undefined}
                    />
                    {fieldErrors.startTime && <div id="err-shift-start" className="mt-1 text-xs text-red-600" role="alert">{fieldErrors.startTime}</div>}
                  </label>
                  <label className="block">
                    <span className="block text-xs font-medium mb-1 text-gray-700">End *</span>
                    <input
                      type="time"
                      value={form.endTime}
                      onChange={e=>{ const val=e.target.value; setForm(f=>({...f,endTime:val})); if(fieldErrors.endTime) validateShift(); }}
                      onBlur={()=>{ if(!fieldErrors.endTime) validateShift(); }}
                      className={`w-full border rounded px-2 py-2 bg-white text-gray-900 ${fieldErrors.endTime? 'border-red-500':''}`}
                      
                      aria-describedby={fieldErrors.endTime? 'err-shift-end': undefined}
                    />
                    {fieldErrors.endTime && <div id="err-shift-end" className="mt-1 text-xs text-red-600" role="alert">{fieldErrors.endTime}</div>}
                  </label>
                </div>
              </div>
              <label className="block">
                <span className="block text-xs font-medium mb-1 text-gray-700">Slots Needed *</span>
                <input
                  type="number"
                  min={1}
                  value={form.slotsNeeded}
                  onChange={e=>{ const num=parseInt(e.target.value)||1; setForm(f=>({...f,slotsNeeded:num})); if(fieldErrors.slotsNeeded) validateShift(); }}
                  onBlur={()=>{ if(!fieldErrors.slotsNeeded) validateShift(); }}
                  className={`w-32 border rounded px-2 py-2 bg-white text-gray-900 ${fieldErrors.slotsNeeded? 'border-red-500':''}`}
                  
                  aria-describedby={fieldErrors.slotsNeeded? 'err-shift-slots': undefined}
                />
                {fieldErrors.slotsNeeded && <div id="err-shift-slots" className="mt-1 text-xs text-red-600" role="alert">{fieldErrors.slotsNeeded}</div>}
              </label>
              <label className="block">
                <span className="block text-xs font-medium mb-1 text-gray-700">Notes</span>
                <textarea rows={3} value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} className="w-full border rounded px-2 py-2 bg-white text-gray-900" placeholder="Optional notes" />
              </label>
              {errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded p-2 text-xs space-y-1" aria-live="assertive">
                  {errors.map((er,i)=><div key={i}>• {er}</div>)}
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={()=>{setCreateOpen(false); setEditId(null);}} className="px-3 py-1 rounded border text-gray-900">Cancel</button>
                <button onClick={saveShift} className="px-4 py-1 rounded bg-blue-600 text-white">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Wizard */}
      {wizardOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-label="Bulk Shift Wizard">
          <div className="bg-white rounded shadow p-6 w-full max-w-2xl">
            <h2 className="text-lg font-semibold mb-4 text-gray-900">Bulk Shift Creation</h2>
            <div className="grid md:grid-cols-2 gap-6 text-xs text-gray-900">
              <div className="space-y-3">
                <label className="block">
                  <span className="block mb-1 font-medium text-gray-700">Opportunity *</span>
                  <select value={bulk.opportunityId} onChange={e=>setBulk(b=>({...b,opportunityId:e.target.value}))} className="w-full border rounded px-2 py-2 bg-white text-gray-900" title="Bulk Opportunity">
                    <option value="">Select...</option>
                    {opportunities.map(o=> <option key={o.id} value={o.id}>{o.title}</option>)}
                  </select>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="block mb-1 font-medium text-gray-700">Start Date *</span>
                    <input type="date" value={bulk.startDate} onChange={e=>setBulk(b=>({...b,startDate:e.target.value}))} className="w-full border rounded px-2 py-2 bg-white text-gray-900" />
                  </label>
                  <label className="block">
                    <span className="block mb-1 font-medium text-gray-700">End Date *</span>
                    <input type="date" value={bulk.endDate} onChange={e=>setBulk(b=>({...b,endDate:e.target.value}))} className="w-full border rounded px-2 py-2 bg-white text-gray-900" />
                  </label>
                </div>
                <fieldset className="border rounded p-2">
                  <legend className="px-1 text-xs font-medium text-gray-700">Days of Week</legend>
                  <div className="grid grid-cols-4 gap-2 text-[11px]">
                    {Object.entries({mon:'Mon',tue:'Tue',wed:'Wed',thu:'Thu',fri:'Fri',sat:'Sat',sun:'Sun'}).map(([k,label]) => (
                      <label key={k} className="flex items-center gap-1 text-gray-800">
                        <input type="checkbox" checked={bulk.daysOfWeek[k]} onChange={e=>setBulk(b=>({...b,daysOfWeek:{...b.daysOfWeek,[k]:e.target.checked}}))} /> {label}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="block mb-1 font-medium text-gray-700">Start Time *</span>
                    <input type="time" value={bulk.startTime} onChange={e=>setBulk(b=>({...b,startTime:e.target.value}))} className="w-full border rounded px-2 py-2 bg-white text-gray-900" />
                  </label>
                  <label className="block">
                    <span className="block mb-1 font-medium text-gray-700">End Time *</span>
                    <input type="time" value={bulk.endTime} onChange={e=>setBulk(b=>({...b,endTime:e.target.value}))} className="w-full border rounded px-2 py-2 bg-white text-gray-900" />
                  </label>
                </div>
                <label className="block">
                  <span className="block mb-1 font-medium text-gray-700">Slots Needed *</span>
                  <input type="number" min={1} value={bulk.slotsNeeded} onChange={e=>setBulk(b=>({...b,slotsNeeded:parseInt(e.target.value)||1}))} className="w-24 border rounded px-2 py-2 bg-white text-gray-900" />
                </label>
              </div>
              <div className="space-y-3">
                <div className="bg-gray-50 rounded p-3 h-64 overflow-y-auto text-gray-900" aria-label="Bulk Preview">
                  {bulkPreview.length === 0 ? (
                    <div className="text-gray-500 text-xs">Select parameters to preview generated shift dates.</div>
                  ) : (
                    <ul className="space-y-1 text-xs">
                      {bulkPreview.map(d=> <li key={d} className="flex justify-between text-gray-800"><span>{d}</span><span>{bulk.startTime}-{bulk.endTime}</span></li>)}
                    </ul>
                  )}
                </div>
                <div className="text-xs text-gray-600">Total shifts to create: {bulkPreview.length}</div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6 text-sm">
              <button onClick={()=>{setWizardOpen(false); setBulkPreview([]);}} className="px-3 py-1 rounded border text-gray-900">Cancel</button>
              <button disabled={bulkPreview.length===0} onClick={createBulkShifts} className={`px-4 py-1 rounded ${bulkPreview.length===0?'bg-gray-300 text-gray-600':'bg-purple-600 text-white'}`}>Create {bulkPreview.length||''}</button>
            </div>
          </div>
        </div>
      )}

      {/* Assignment Manager Modal */}
      {assignShiftId && (
        <window.VolunteerAssignmentManager
          shiftId={assignShiftId}
          userRole={userRole}
          onClose={()=>setAssignShiftId(null)}
          onUpdated={()=>setRefreshToken(t=>t+1)}
        />
      )}
    </div>
    </KeyboardShortcutsWrapper>
  );
};

// Month View Implementation
const MonthView = ({ shifts, conflictCounts, conflictTypesByShift, onReschedule, onAssign, formatTime }) => {
  const today = new Date();
  const [month, setMonth] = React.useState(today.getMonth());
  const [year, setYear] = React.useState(today.getFullYear());
  const firstOfMonth = new Date(year, month, 1);
  const startDay = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const weeks = [];
  let currentWeek = new Array(7).fill(null);
  // Fill leading blanks
  for (let i=0;i<startDay;i++) currentWeek[i] = { blank: true };
  for (let day=1; day<=daysInMonth; day++) {
    const dateObj = new Date(year, month, day);
    const idx = dateObj.getDay();
    const dateStr = dateObj.toISOString().split('T')[0];
    const dayShifts = shifts.filter(s => {
      const shiftDateStr = typeof s.date === 'number' 
        ? new Date(s.date).toISOString().split('T')[0]
        : s.date;
      return shiftDateStr === dateStr;
    });
    currentWeek[idx] = { day, dateStr, shifts: dayShifts };
    if (idx === 6 || day === daysInMonth) {
      weeks.push(currentWeek);
      currentWeek = new Array(7).fill(null);
    }
  }
  return (
    <div className="bg-white rounded shadow p-4" aria-label="Month View">
      <div className="flex justify-between items-center mb-3 text-sm text-gray-900">
        <button onClick={()=>{ if (month===0){setMonth(11); setYear(y=>y-1);} else setMonth(m=>m-1); }} className="px-2 py-1 border rounded text-gray-900">◀</button>
        <div className="font-medium text-gray-900">{new Date(year,month).toLocaleString('default',{month:'long'})} {year}</div>
        <button onClick={()=>{ if (month===11){setMonth(0); setYear(y=>y+1);} else setMonth(m=>m+1); }} className="px-2 py-1 border rounded text-gray-900">▶</button>
      </div>
      <div className="grid grid-cols-7 gap-px bg-gray-200 text-[11px]">
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=> <div key={d} className="bg-gray-50 py-1 text-center font-medium text-gray-900">{d}</div>)}
        {weeks.flat().map((cell,i) => (
          <div
            key={i}
            className={`min-h-24 bg-white p-1 flex flex-col ${cell?.blank?'opacity-0':''}`}
            onDragOver={e=>{ if(!cell?.blank){ e.preventDefault(); e.dataTransfer.dropEffect='move'; }} }
            onDrop={e=>{ const sid = e.dataTransfer.getData('text/shift-id'); if(sid && cell?.dateStr) onReschedule(sid, cell.dateStr); }}
          > 
            {cell?.day && (
              <div className="text-xs font-semibold mb-1 text-gray-900">{cell.day}</div>
            )}
            <div className="flex flex-col gap-1 overflow-auto">
              {cell?.shifts?.slice(0,3).map(s => {
                const hasConflict = (conflictCounts?.get(s.id)||0) > 0;
                const typeLabels = (conflictTypesByShift?.get(s.id) || []).map(t => t === 'overlap' ? 'Overlap' : t === 'travel' ? 'Travel' : t === 'preference' ? 'Preference' : t).join('/');
                return (
                  <div key={s.id} className="flex flex-col gap-0.5">
                    <div
                      draggable
                      onDragStart={e=>{ e.dataTransfer.setData('text/shift-id', s.id); }}
                      className={`text-[10px] rounded px-1 py-0.5 truncate cursor-move ${hasConflict? 'bg-red-100 text-red-700 border border-red-300':'bg-blue-100 text-blue-700'}`}
                      title={`${s.title} ${formatTime(s.startTime)}-${formatTime(s.endTime)}${hasConflict? ' • ' + typeLabels : ''}`}
                      aria-label={`Shift ${s.title} draggable. Drag to another day to reschedule.`}
                    >
                      {formatTime(s.startTime)} {s.title} {hasConflict && '⚠️'}
                    </div>
                    <button onClick={()=>onAssign(s.id)} className="text-[9px] px-1 rounded bg-green-600 text-white hover:bg-green-700">Assign</button>
                  </div>
                );
              })}
              {cell?.shifts && cell.shifts.length > 3 && <div className="text-[10px] text-gray-500">+{cell.shifts.length-3} more</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const WeekView = ({ shifts, conflictCounts, conflictTypesByShift, onReschedule, onAssign, formatTime }) => {
  const today = new Date();
  const [weekStart, setWeekStart] = React.useState(()=>{
    const d = new Date();
    const day = d.getDay();
    d.setDate(d.getDate()-day+1); // Monday start
    return d;
  });
  const days = []; for (let i=0;i<7;i++){ const d=new Date(weekStart); d.setDate(weekStart.getDate()+i); days.push(d);} 
  const nextWeek = () => { const d=new Date(weekStart); d.setDate(d.getDate()+7); setWeekStart(d); };
  const prevWeek = () => { const d=new Date(weekStart); d.setDate(d.getDate()-7); setWeekStart(d); };
  return (
    <div className="bg-white rounded shadow p-4" aria-label="Week View">
      <div className="flex justify-between items-center mb-3 text-sm text-gray-900">
        <button onClick={prevWeek} className="px-2 py-1 border rounded text-gray-900">◀</button>
        <div className="font-medium text-gray-900">Week of {weekStart.toISOString().split('T')[0]}</div>
        <button onClick={nextWeek} className="px-2 py-1 border rounded text-gray-900">▶</button>
      </div>
      <div className="grid md:grid-cols-7 gap-2 text-[11px]">
        {days.map(d => {
          const dateStr = d.toISOString().split('T')[0];
          const dayShifts = shifts.filter(s => {
            const shiftDateStr = typeof s.date === 'number' 
              ? new Date(s.date).toISOString().split('T')[0]
              : s.date;
            return shiftDateStr === dateStr;
          });
          return (
            <div
              key={dateStr}
              className="border rounded p-2 flex flex-col bg-white"
              onDragOver={e=>{ e.preventDefault(); e.dataTransfer.dropEffect='move'; }}
              onDrop={e=>{ const sid = e.dataTransfer.getData('text/shift-id'); if(sid) onReschedule(sid, dateStr); }}
            >
              <div className="text-xs font-semibold mb-1 text-gray-900">{d.toLocaleDateString(undefined,{weekday:'short', month:'numeric', day:'numeric'})}</div>
              <div className="flex flex-col gap-1 overflow-auto">
                {dayShifts.map(s => {
                  const hasConflict = (conflictCounts?.get(s.id)||0) > 0;
                  const typeLabels = (conflictTypesByShift?.get(s.id) || []).map(t => t === 'overlap' ? 'Overlap' : t === 'travel' ? 'Travel' : t === 'preference' ? 'Preference' : t).join('/');
                  return (
                    <div key={s.id} className="flex flex-col gap-0.5">
                      <div
                        draggable
                        onDragStart={e=>{ e.dataTransfer.setData('text/shift-id', s.id); }}
                        className={`text-[10px] rounded px-1 py-0.5 truncate cursor-move ${hasConflict? 'bg-red-100 text-red-700 border border-red-300':'bg-green-100 text-green-700'}`}
                        title={`${s.title} ${formatTime(s.startTime)}-${formatTime(s.endTime)}${hasConflict? ' • ' + typeLabels : ''}`}
                        aria-label={`Shift ${s.title} draggable. Drag to another day to reschedule.`}
                      >
                        {formatTime(s.startTime)} {s.title} {hasConflict && '⚠️'}
                      </div>
                      <button onClick={()=>onAssign(s.id)} className="text-[9px] px-1 rounded bg-green-600 text-white hover:bg-green-700">Assign</button>
                    </div>
                  );
                })}
                {dayShifts.length===0 && <div className="text-[10px] text-gray-400">No shifts</div>}
              </div>
              {dayShifts.length>0 && (
                <button
                  onClick={()=>{
                    const first = dayShifts[0];
                    const nextDate = new Date(dateStr);
                    nextDate.setDate(nextDate.getDate()+1);
                    const iso = nextDate.toISOString().split('T')[0];
                    onReschedule(first.id, iso);
                  }}
                  className="mt-2 text-[10px] px-2 py-0.5 rounded border bg-white hover:bg-blue-50"
                  aria-label="Move first shift to next day"
                >Move 1st → Next Day</button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ListView = ({ shifts, onEdit, onDelete, onAssign, opportunities, conflictCounts, conflictTypesByShift, formatTime }) => (
  <div className="bg-white rounded shadow p-4" aria-label="List View">
    <table className="w-full text-xs text-gray-900">
      <thead>
        <tr className="bg-gray-50 text-gray-900">
          <th className="text-left px-2 py-1">Date</th>
          <th className="text-left px-2 py-1">Start</th>
          <th className="text-left px-2 py-1">End</th>
          <th className="text-left px-2 py-1">Title</th>
          <th className="text-left px-2 py-1">Opportunity</th>
          <th className="text-left px-2 py-1">Coverage</th>
          <th className="text-left px-2 py-1">Conflicts</th>
          <th className="text-left px-2 py-1">Actions</th>
        </tr>
      </thead>
      <tbody className="text-gray-900">
        {shifts.map(s => {
          const opp = opportunities.find(o=>o.id===s.opportunityId);
          const coverage = s.slotsNeeded ? Math.round((s.slotsFilled||0)/s.slotsNeeded*100) : 0;
          const conflictCount = (conflictCounts?.get(s.id)||0);
          const typeLabels = (conflictTypesByShift?.get(s.id) || []).map(t => t === 'overlap' ? 'Overlap' : t === 'travel' ? 'Travel' : t === 'preference' ? 'Preference' : t).join('/');
          return (
            <tr key={s.id} className="border-t">
              <td className="px-2 py-1 text-gray-900">{s.date}</td>
              <td className="px-2 py-1 text-gray-900">{formatTime(s.startTime)}</td>
              <td className="px-2 py-1 text-gray-900">{formatTime(s.endTime)}</td>
              <td className="px-2 py-1 text-gray-900">{s.title||'Shift'}</td>
              <td className="px-2 py-1 text-gray-900">{opp?opp.title:'—'}</td>
              <td className="px-2 py-1 text-gray-900">{coverage}%</td>
              <td className="px-2 py-1">
                {conflictCount > 0 ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-100 text-red-700 border border-red-300" title={`${conflictCount} conflict(s)${typeLabels ? ' • ' + typeLabels : ''}`}>
                    ⚠️ {conflictCount}
                  </span>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </td>
              <td className="px-2 py-1 space-x-1">
                <button className="px-2 py-1 bg-purple-600 text-white rounded text-xs hover:bg-purple-700 transition-colors" onClick={()=>onAssign(s.id)}>Assign</button>
                <button className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors" onClick={()=>onEdit(s)}>Edit</button>
                <button className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition-colors" onClick={()=>onDelete(s.id)}>Delete</button>
              </td>
            </tr>
          );
        })}
        {shifts.length === 0 && <tr><td colSpan={8} className="px-2 py-3 text-center text-gray-500">No shifts match filters</td></tr>}
      </tbody>
    </table>
  </div>
);

window.VolunteerShiftScheduler = VolunteerShiftScheduler;
