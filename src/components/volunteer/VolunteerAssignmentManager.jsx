/**
 * VolunteerAssignmentManager.jsx
 * Full modal for assigning volunteers to a shift: search, conflict detection, bulk assignment, status updates.
 */

const { useState, useEffect } = React;

const VolunteerAssignmentManager = ({ shiftId, onClose = () => {}, userRole='Admin', onUpdated=()=>{} }) => {
  const allowedRoles = new Set(['Admin','Board Admin','Stage Manager']);
  if (!allowedRoles.has(userRole)) return null;

  const storage = window.volunteerStorageService;
  const calc = window.volunteerCalculationService;

  const [shift, setShift] = useState(null);
  const [volunteers, setVolunteers] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [bulkMode, setBulkMode] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [assigning, setAssigning] = useState(false);
  const [conflicts, setConflicts] = useState({}); // volunteerId -> {conflicts: [...], assigned: boolean}
  const [view, setView] = useState('assign');
  const availUtil = window.availabilityUtils;
  const [profileVolunteerId, setProfileVolunteerId] = useState(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(()=>{
    const s = storage.getVolunteerShiftById(shiftId);
    setShift(s);
    setVolunteers(storage.getVolunteerProfiles());
  }, [shiftId, refreshToken]);

  // Enhanced conflict detection: overlap, travel, preference
  useEffect(()=>{
    if (!shift) return;
    const utils = window.volunteerConflictUtils;
    if (!utils?.computeConflicts) return;
    const allShifts = storage.getVolunteerShifts();
    const opportunities = storage.getVolunteerOpportunities();
    const conflictData = utils.computeConflicts(allShifts, volunteers, opportunities);
    // Build map per volunteer
    const map = {};
    volunteers.forEach(v => {
      const assigned = shift.assignments.some(a => a.volunteerId === v.id);
      const volConflicts = conflictData.list.filter(c => 
        c.volunteerId === v.id && 
        (c.aShiftId === shift.id || c.bShiftId === shift.id)
      );
      if (assigned || volConflicts.length > 0) {
        map[v.id] = { assigned, conflicts: volConflicts };
      }
    });
    setConflicts(map);
  }, [shift, volunteers]);

  const filteredVols = volunteers.filter(v => {
    if (statusFilter !== 'all' && (v.volunteerInfo?.status||'unknown') !== statusFilter) return false;
    if (search) {
      const name = `${v.firstName||''} ${v.lastName||''}`.toLowerCase();
      if (!name.includes(search.toLowerCase())) return false;
    }
    return true;
  }).sort((a,b)=> (b.volunteerInfo?.totalHours||0) - (a.volunteerInfo?.totalHours||0));

  function toggleSelect(id) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  }

  function assignSingle(volunteer) {
    if (!shift) return;
    const conflictInfo = conflicts[volunteer.id];
    const availStatus = shift && availUtil?.availabilityStatus ? availUtil.availabilityStatus(volunteer.volunteerInfo, shift) : { status:'unknown' };
    if (availStatus.status === 'unavailable') {
      const ok = window.confirm(`This volunteer is marked unavailable.\n\nReason: ${availStatus.reason}\n\nAssign anyway?`);
      if (!ok) return;
    }
    if (conflictInfo?.assigned || (conflictInfo?.conflicts?.length > 0)) return;
    setAssigning(true);
    storage.updateShiftAssignment(shift.id, { volunteerId: volunteer.id, role: 'volunteer', status: 'confirmed' });
    // Increment volunteer stats
    storage.incrementShiftCount(volunteer.id, true);
    const updated = storage.getVolunteerShiftById(shift.id);
    setShift(updated);
    setAssigning(false);
    onUpdated(updated);
  }

  function bulkAssign() {
    if (!shift || selected.size===0) return;
    setAssigning(true);
    selected.forEach(id => {
      const conflictInfo = conflicts[id];
      const vol = volunteers.find(v=>v.id===id);
      const availStatus = shift && availUtil?.availabilityStatus ? availUtil.availabilityStatus(vol?.volunteerInfo, shift) : { status:'unknown' };
      if (availStatus.status === 'unavailable') return; // skip in bulk if unavailable
      if (conflictInfo?.assigned || (conflictInfo?.conflicts?.length > 0)) return; // skip conflicts
      storage.updateShiftAssignment(shift.id, { volunteerId: id, role: 'volunteer', status: 'confirmed' });
      storage.incrementShiftCount(id, true);
    });
    const updated = storage.getVolunteerShiftById(shift.id);
    setShift(updated);
    setSelected(new Set());
    setAssigning(false);
    onUpdated(updated);
  }

  function removeAssignment(volunteerId) {
    if (!shift) return;
    storage.removeShiftAssignment(shift.id, volunteerId);
    const updated = storage.getVolunteerShiftById(shift.id);
    setShift(updated);
    onUpdated(updated);
  }

  const remainingSlots = shift ? Math.max(shift.slotsNeeded - shift.slotsFilled, 0) : 0;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" aria-label="Assignment Manager Modal">
      <div className="bg-white rounded-lg shadow p-6 w-full max-w-5xl max-h-[92vh] overflow-y-auto text-gray-900">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">Assign Volunteers <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded">Shift</span></h2>
            {shift && <div className="text-xs text-gray-600 mt-1">{shift.title || 'Untitled'} • {shift.date} • {shift.startTime}-{shift.endTime} • {shift.slotsFilled}/{shift.slotsNeeded} filled ({remainingSlots} open)</div>}
          </div>
          <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700">✕</button>
        </div>

        <div className="flex gap-2 mb-4">
          <button onClick={()=>setView('assign')} className={`px-3 py-1 text-sm rounded border ${view==='assign'?'bg-violet-600 text-white border-violet-600':'bg-gray-50 text-gray-900'}`}>Assignments</button>
          <button onClick={()=>setView('coverage')} className={`px-3 py-1 text-sm rounded border ${view==='coverage'?'bg-violet-600 text-white border-violet-600':'bg-gray-50 text-gray-900'}`}>Coverage</button>
          <button onClick={()=>setView('stats')} className={`px-3 py-1 text-sm rounded border ${view==='stats'?'bg-violet-600 text-white border-violet-600':'bg-gray-50 text-gray-900'}`}>Volunteer Stats</button>
        </div>

        {view==='assign' && (
          <div>
            <div className="mb-3 flex flex-col gap-3">
              {/* Autocomplete Search */}
              {window.VolunteerAutocomplete && (
                <window.VolunteerAutocomplete
                  volunteers={volunteers}
                  onSelect={(volunteer) => {
                    // Auto-scroll to the volunteer in the table
                    const volunteerRow = document.querySelector(`tr[data-volunteer-id="${volunteer.id}"]`);
                    if (volunteerRow) {
                      volunteerRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      volunteerRow.classList.add('bg-yellow-100');
                      setTimeout(() => volunteerRow.classList.remove('bg-yellow-100'), 2000);
                    }
                  }}
                  placeholder="Quick search: name, email, or skills..."
                  className="w-full"
                />
              )}
              
              {/* Filters */}
              <div className="flex flex-wrap gap-2 items-center">
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Filter table" className="border rounded px-2 py-1 text-sm flex-1 min-w-[200px] bg-white text-gray-900" />
                <select value={statusFilter} title="Filter by volunteer status" onChange={e=>setStatusFilter(e.target.value)} className="border rounded px-2 py-1 text-sm bg-white text-gray-900">
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
                <button className={`px-3 py-1 rounded text-sm border ${bulkMode?'bg-violet-600 text-white':'bg-gray-50 text-gray-900'}`} onClick={()=>setBulkMode(b=>!b)}>{bulkMode?'Bulk Mode On':'Bulk Mode'}</button>
                {bulkMode && <button disabled={assigning || selected.size===0} onClick={bulkAssign} className={`px-3 py-1 rounded text-sm ${selected.size>0 && !assigning? 'bg-green-600 text-white':'bg-gray-200 text-gray-500'}`}>Assign Selected ({selected.size})</button>}
              </div>
            </div>
            <div className="border rounded overflow-hidden">
              <table className="w-full text-xs text-gray-900">
                <thead className="bg-gray-100 text-gray-900">
                  <tr>
                    {bulkMode && <th className="px-2 py-1">Sel</th>}
                    <th className="text-left px-2 py-1">Name</th>
                    <th className="text-left px-2 py-1">Status</th>
                    <th className="text-left px-2 py-1">Hours</th>
                    <th className="text-left px-2 py-1">Completion</th>
                    <th className="text-left px-2 py-1">Skills</th>
                    <th className="text-left px-2 py-1">Availability</th>
                    <th className="text-left px-2 py-1">Conflict</th>
                    <th className="text-left px-2 py-1">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVols.slice(0,100).map(v => {
                    const completion = calc.calculateCompletionRate? calc.calculateCompletionRate(v.id): (v.volunteerInfo?.shiftsCompleted||0);
                    const conflictInfo = conflicts[v.id];
                    const alreadyAssigned = conflictInfo?.assigned || (shift && shift.assignments.some(a=>a.volunteerId===v.id));
                    const volConflicts = conflictInfo?.conflicts || [];
                    const hasConflict = volConflicts.length > 0;
                    const availStatus = shift && availUtil?.availabilityStatus ? availUtil.availabilityStatus(v.volunteerInfo, shift) : { status:'unknown' };
                    const availBadge = (()=>{
                      if (!availStatus) return null;
                      if (availStatus.status==='available') return <span className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-green-100 text-green-700 border border-green-300" title={availStatus.reason}>Avail</span>;
                      if (availStatus.status==='unavailable') return <span className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-red-100 text-red-700 border border-red-300" title={availStatus.reason}>Unavail</span>;
                      return <span className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-gray-100 text-gray-700 border border-gray-300" title={availStatus.reason||'No data'}>Unknown</span>;
                    })();
                    const typeLabels = volConflicts.map(c => {
                      if (c.type === 'overlap') return 'Overlap';
                      if (c.type === 'travel') return `Travel (${c.details?.distanceKm||'?'}km)`;
                      if (c.type === 'preference') return 'Preference';
                      return c.type;
                    }).join(', ');
                    return (
                      <tr key={v.id} data-volunteer-id={v.id} className={`border-t transition-colors ${alreadyAssigned? 'bg-green-50':'bg-white'}`}>
                        {bulkMode && <td className="px-2 py-1"><input type="checkbox" title="Select volunteer for bulk assignment" disabled={hasConflict||alreadyAssigned} checked={selected.has(v.id)} onChange={()=>toggleSelect(v.id)} /></td>}
                        <td className="px-2 py-1 whitespace-nowrap">
                          {v.firstName} {v.lastName}
                          <button className="ml-2 px-1.5 py-0.5 rounded border text-[10px] bg-white hover:bg-gray-50" title="Edit availability" onClick={()=>setProfileVolunteerId(v.id)}>Edit Availability</button>
                        </td>
                        <td className="px-2 py-1">{v.volunteerInfo?.status||'unknown'}</td>
                        <td className="px-2 py-1">{v.volunteerInfo?.totalHours||0}</td>
                        <td className="px-2 py-1">{completion}%</td>
                        <td className="px-2 py-1">{(v.volunteerInfo?.skills||[]).slice(0,3).join(', ')}</td>
                        <td className="px-2 py-1">{availBadge}</td>
                        <td className="px-2 py-1">
                          {hasConflict && (
                            <div className="flex flex-wrap gap-1">
                              {volConflicts.map((c,i) => {
                                let badge = '';
                                let tooltip = '';
                                if (c.type === 'overlap') {
                                  badge = 'Overlap';
                                  tooltip = `Times overlap: ${c.details?.startA||''}-${c.details?.endA||''} vs ${c.details?.startB||''}-${c.details?.endB||''}`;
                                } else if (c.type === 'travel') {
                                  badge = 'Travel';
                                  tooltip = `${c.details?.distanceKm||'?'} km travel, need ${c.details?.travelMinutesNeeded||'?'}m, have ${c.details?.travelMinutesAvailable||'?'}m`;
                                } else if (c.type === 'preference') {
                                  badge = 'Pref';
                                  const issues = [];
                                  if (c.details?.missingDay) issues.push(`unavailable ${c.details.day||''}`);
                                  if (c.details?.missingTime) issues.push(`unavailable ${c.details.bucket||''}`);
                                  tooltip = issues.join(', ');
                                } else if (c.type === 'time-window') {
                                  badge = 'Window';
                                  tooltip = `Shift ${c.details?.shiftTime||''} outside available window ${c.details?.window||''} for ${c.details?.bucket||''}`;
                                }
                                return (
                                  <span key={i} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-red-100 text-red-700 border border-red-300" title={tooltip}>
                                    {badge}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                          {!hasConflict && alreadyAssigned && <span className="text-green-600">✅</span>}
                          {!hasConflict && !alreadyAssigned && <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-2 py-1 space-x-1">
                          {!alreadyAssigned && <button disabled={hasConflict||assigning} className={`px-2 py-1 bg-purple-600 text-white rounded text-xs hover:bg-purple-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed`} onClick={()=>assignSingle(v)}>Assign</button>}
                          {alreadyAssigned && <button className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition-colors" onClick={()=>removeAssignment(v.id)}>Remove</button>}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredVols.length===0 && <tr><td colSpan={bulkMode?8:7} className="px-2 py-3 text-center text-gray-500">No volunteers</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {view==='coverage' && shift && (
          <div className="text-sm text-gray-900">
            <div className="mb-3 font-medium">Current Assignments</div>
            <div className="border rounded overflow-hidden mb-4">
              <table className="w-full text-xs text-gray-900">
                <thead className="bg-gray-100 text-gray-900"><tr><th className="text-left px-2 py-1">Volunteer</th><th className="text-left px-2 py-1">Status</th><th className="text-left px-2 py-1">Check-In</th><th className="text-left px-2 py-1">Check-Out</th><th className="text-left px-2 py-1">Action</th></tr></thead>
                <tbody>
                  {shift.assignments.map(a => {
                    const vol = volunteers.find(v=>v.id===a.volunteerId);
                    return (
                      <tr key={a.id} className="border-t">
                        <td className="px-2 py-1">{vol? `${vol.firstName} ${vol.lastName}`: a.volunteerId}</td>
                        <td className="px-2 py-1">{a.status}</td>
                        <td className="px-2 py-1">{a.checkInTime? new Date(a.checkInTime).toLocaleTimeString(): '-'}</td>
                        <td className="px-2 py-1">{a.checkOutTime? new Date(a.checkOutTime).toLocaleTimeString(): '-'}</td>
                        <td className="px-2 py-1">{a.assignedAt? new Date(a.assignedAt).toLocaleDateString():'—'}</td>
                        <td className="px-2 py-1"><button className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition-colors" onClick={()=>removeAssignment(a.volunteerId)}>Remove</button></td>
                      </tr>
                    );
                  })}
                  {shift.assignments.length===0 && <tr><td colSpan={5} className="px-2 py-3 text-center text-gray-500">No assignments yet</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="text-xs text-gray-600">Coverage: {shift.slotsFilled}/{shift.slotsNeeded} ({calc.calculateShiftCoverage? calc.calculateShiftCoverage(shift.id): Math.round((shift.slotsFilled/shift.slotsNeeded)*100)}%)</div>
          </div>
        )}

        {view==='stats' && (
          <div className="text-sm text-gray-900">
            <div className="mb-2 font-medium text-gray-900">Recent Top Volunteers</div>
            <div className="grid md:grid-cols-2 gap-3">
              {volunteers.slice(0,10).sort((a,b)=> (b.volunteerInfo?.totalHours||0)-(a.volunteerInfo?.totalHours||0)).map(v => (
                <div key={v.id} className="border rounded p-2 bg-gray-50 text-gray-900">
                  <div className="font-medium text-xs text-gray-900">{v.firstName} {v.lastName}</div>
                  <div className="text-[11px] text-gray-600">Hours: {v.volunteerInfo?.totalHours||0} • Completion: {calc.calculateCompletionRate? calc.calculateCompletionRate(v.id): '—'}%</div>
                  <div className="text-[11px] text-gray-500">Skills: {(v.volunteerInfo?.skills||[]).slice(0,4).join(', ')||'—'}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button className="px-3 py-1 rounded border" onClick={onClose}>Close</button>
        </div>
        {/* Inline Profile Editor modal when editing availability */}
        {profileVolunteerId && window.VolunteerProfileEditor && (
          <window.VolunteerProfileEditor
            contactId={profileVolunteerId}
            userRole={userRole}
            onClose={()=>setProfileVolunteerId(null)}
            onUpdated={()=>{ setProfileVolunteerId(null); setRefreshToken(t=>t+1); }}
          />
        )}
      </div>
    </div>
  );
};

window.VolunteerAssignmentManager = VolunteerAssignmentManager;

