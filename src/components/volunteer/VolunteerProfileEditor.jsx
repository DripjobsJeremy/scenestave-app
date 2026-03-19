/**
 * VolunteerProfileEditor.jsx
 * Full modal editor for volunteer profile with tabs: Profile | History | Statistics.
 */

const { useState, useEffect } = React;

const VolunteerProfileEditor = ({ contactId, onClose=()=>{}, userRole='Admin', onUpdated=()=>{} }) => {
  const allowedRoles = new Set(['Admin','Board Admin','Stage Manager']);
  if (!allowedRoles.has(userRole)) return null;

  const storage = window.volunteerStorageService;
  const calc = window.volunteerCalculationService;

  const [contact, setContact] = useState(null);
  const [tab, setTab] = useState('profile');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const [fieldErrors, setFieldErrors] = useState({});
  const [timeIncrement, setTimeIncrement] = useState(30); // 15 or 30

  // Availability times (per day per bucket start/end) separate from boolean matrix
  const dayKeys = ['mon','tue','wed','thu','fri','sat','sun'];
  const bucketKeys = ['morning','afternoon','evening'];
  const bucketWindows = {
    morning: { start: '00:00', end: '12:00' },
    afternoon: { start: '12:00', end: '17:00' },
    evening: { start: '17:00', end: '23:59' }
  };

  function buildDefaultAvailabilityTimes(){
    return Object.fromEntries(dayKeys.map(d => [d, Object.fromEntries(bucketKeys.map(b => [b, { start: bucketWindows[b].start, end: bucketWindows[b].end }]))]));
  }

  const [availabilityTimes, setAvailabilityTimes] = useState(buildDefaultAvailabilityTimes());

  useEffect(()=>{
    const raw = localStorage.getItem('contacts');
    const contacts = raw ? JSON.parse(raw) : [];
    setContact(contacts.find(c => c.id === contactId));
  }, [contactId, refreshToken]);

  // Safe volunteer info object (works before contact is loaded)
  const info = contact?.volunteerInfo || {};

  // Initialize availabilityTimes from info once contact loaded
  useEffect(() => {
    const stored = info.availabilityTimes;
    if (stored && typeof stored === 'object') {
      // Merge with defaults to ensure all keys present
      const defaults = buildDefaultAvailabilityTimes();
      const merged = JSON.parse(JSON.stringify(defaults));
      dayKeys.forEach(d => {
        if (stored[d]) {
          bucketKeys.forEach(b => {
            if (stored[d][b]) {
              merged[d][b].start = stored[d][b].start || bucketWindows[b].start;
              merged[d][b].end = stored[d][b].end || bucketWindows[b].end;
            }
          });
        }
      });
      setAvailabilityTimes(merged);
    } else {
      // Ensure defaults are present even if none stored yet
      setAvailabilityTimes(prev => prev || buildDefaultAvailabilityTimes());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contact ? contact.id : null]);

  if (!contact) return null;

  const dayLabels = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const buckets = bucketKeys;
  const matrix = (function(){
    const util = window.availabilityUtils;
    if (util?.normalize) {
      return util.normalize(info);
    }
    // Fallback: empty matrix
    return Object.fromEntries(dayKeys.map(d=>[d,{morning:false,afternoon:false,evening:false}]));
  })();

  function applyMatrixTransform(mutator){
    const next = JSON.parse(JSON.stringify(matrix));
    mutator(next);
    const util = window.availabilityUtils;
    if (util?.buildAvailabilityFromMatrix){
      const payload = util.buildAvailabilityFromMatrix(next);
      updateVolunteerInfo({ availability: payload });
    } else {
      updateVolunteerInfo({ availability: { matrix: next } });
    }
  }

  function copyRowToWeekdays(srcKey){
    // Copy both matrix and custom times
    applyMatrixTransform(next => {
      const src = next[srcKey] || { morning:false,afternoon:false,evening:false };
      ['mon','tue','wed','thu','fri'].forEach(d => { next[d] = { ...src }; });
    });
    setAvailabilityTimes(prev => {
      const copy = JSON.parse(JSON.stringify(prev));
      const srcTimes = prev[srcKey] || {};
      ['mon','tue','wed','thu','fri'].forEach(d => {
        bucketKeys.forEach(b => {
          if (srcTimes[b]) {
            copy[d][b] = { ...srcTimes[b] };
          }
        });
      });
      return copy;
    });
    // Persist to volunteer info
    updateVolunteerInfo({ availabilityTimes: { ...(info.availabilityTimes||{}), ...Object.fromEntries(['mon','tue','wed','thu','fri'].map(d => [d, JSON.parse(JSON.stringify(availabilityTimes[srcKey]||{}))])) } });
  }
  function copyRowToAllDays(srcKey){
    applyMatrixTransform(next => {
      const src = next[srcKey] || { morning:false,afternoon:false,evening:false };
      dayKeys.forEach(d => { next[d] = { ...src }; });
    });
    setAvailabilityTimes(prev => {
      const copy = JSON.parse(JSON.stringify(prev));
      const srcTimes = prev[srcKey] || {};
      dayKeys.forEach(d => {
        bucketKeys.forEach(b => {
          if (srcTimes[b]) {
            copy[d][b] = { ...srcTimes[b] };
          }
        });
      });
      return copy;
    });
    updateVolunteerInfo({ availabilityTimes: { ...(info.availabilityTimes||{}), ...Object.fromEntries(dayKeys.map(d => [d, JSON.parse(JSON.stringify(availabilityTimes[srcKey]||{}))])) } });
  }

  function validateProfile(infoDraft){
    const util = window.validationUtils;
    if (util?.validateProfile) {
      const { fieldErrors: fe } = util.validateProfile(infoDraft || (contact?.volunteerInfo||{}));
      setFieldErrors(fe);
      return Object.keys(fe).length === 0;
    }
    setFieldErrors({});
    return true;
  }

  function updateVolunteerInfo(patch) {
    setContact(prev => {
      if (!prev) return prev;
      const updatedInfo = { ...prev.volunteerInfo, ...patch };
      const updated = { ...prev, volunteerInfo: updatedInfo };
      setDirty(true);
      // run inline validation when fields change
      validateProfile(updatedInfo);
      return updated;
    });
  }

  function addSkill(skill) {
    if (!skill) return;
    if (String(skill).trim().length < 2) {
      window.toast?.error('Skill must be at least 2 characters');
      return;
    }
    const skills = Array.from(new Set([...(info.skills||[]), skill.trim()]));
    updateVolunteerInfo({ skills });
  }

  function removeSkill(skill) {
    const skills = (info.skills||[]).filter(s => s !== skill);
    updateVolunteerInfo({ skills });
  }

  function addInterest(interest) {
    if (!interest) return;
    if (String(interest).trim().length < 2) {
      window.toast?.error('Interest must be at least 2 characters');
      return;
    }
    const interests = Array.from(new Set([...(info.interests||[]), interest.trim()]));
    updateVolunteerInfo({ interests });
  }

  function removeInterest(interest) {
    const interests = (info.interests||[]).filter(i => i !== interest);
    updateVolunteerInfo({ interests });
  }

  function toggleAvailBucket(dayKey, bucket){
    applyMatrixTransform(next => { next[dayKey][bucket] = !next[dayKey][bucket]; });
    // If enabling, ensure availabilityTimes have defaults for that bucket
    setAvailabilityTimes(prev => {
      const copy = JSON.parse(JSON.stringify(prev));
      const entry = copy[dayKey][bucket];
      if (!entry || !entry.start || !entry.end) {
        copy[dayKey][bucket] = { start: bucketWindows[bucket].start, end: bucketWindows[bucket].end };
      }
      return copy;
    });
  }

  function updateAvailabilityTime(dayKey, bucket, field, value){
    setAvailabilityTimes(prev => {
      const copy = JSON.parse(JSON.stringify(prev));
      if (!copy[dayKey]) copy[dayKey] = {};
      if (!copy[dayKey][bucket]) copy[dayKey][bucket] = { start: bucketWindows[bucket].start, end: bucketWindows[bucket].end };
      copy[dayKey][bucket][field] = value;
      // Auto-adjust: ensure end > start; if not, bump end to next increment or window end
      const start = copy[dayKey][bucket].start;
      let end = copy[dayKey][bucket].end;
      if (end <= start){
        end = value; // use newly selected value as baseline
        // Advance one increment if possible within window
        const inc = timeIncrement;
        const toMinutes = t => { const [h,m]=t.split(':').map(Number); return h*60+m; }; const fromMinutes = m => (String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0'));
        const startM = toMinutes(start);
        const windowEndM = toMinutes(bucketWindows[bucket].end === '23:59' ? '23:59' : bucketWindows[bucket].end);
        const candidate = startM + inc;
        if (candidate <= windowEndM) end = fromMinutes(candidate);
        copy[dayKey][bucket].end = end;
      }
      return copy;
    });
    // Persist to volunteer info
    updateVolunteerInfo({ availabilityTimes: { ...(info.availabilityTimes||{}), [dayKey]: { ...(info.availabilityTimes?.[dayKey]||{}), [bucket]: { ...(info.availabilityTimes?.[dayKey]?.[bucket]||{}), [field]: value } } } });
  }

  function timeOptions(bucket){
    const win = bucketWindows[bucket];
    const startM = toMinutes(win.start);
    // Treat end for generation: if 23:59, use 24:00 minute value but keep 23:59 entry
    const endStr = win.end;
    const endMRaw = toMinutes(endStr === '23:59' ? '23:59' : win.end);
    const inc = timeIncrement;
    const opts = [];
    for (let m = startM; m <= endMRaw; m += inc){
      const h = Math.floor(m/60); const mm = m%60;
      const val = String(h).padStart(2,'0')+':'+String(mm).padStart(2,'0');
      opts.push(val);
    }
    // Ensure exact end included if not aligned to increment (e.g. 23:59)
    if (!opts.includes(endStr)) opts.push(endStr);
    return opts;
    function toMinutes(t){ const [h,m]=t.split(':').map(Number); return h*60+m; }
  }

  function formatDisplayTime(t){
    return window.preferencesService?.formatTime?.(t) || t;
  }

  function saveChanges() {
    if (!dirty || !contact) return;
    // block save if validation errors exist
    const ok = validateProfile(contact.volunteerInfo||{});
    if (!ok) { window.toast?.error('Please fix the highlighted errors'); return; }
    setSaving(true);
    const raw = localStorage.getItem('contacts');
    const contacts = raw ? JSON.parse(raw) : [];
    const idx = contacts.findIndex(c => c.id === contact.id);
    if (idx >= 0) {
      contacts[idx] = contact;
      contacts[idx].updatedAt = Date.now();
      localStorage.setItem('contacts', JSON.stringify(contacts));
    }
    setSaving(false);
    setDirty(false);
    setRefreshToken(t=>t+1);
    onUpdated(contact);
  }

  const statusOptions = ['active','inactive','paused','banned'];
  const daysOfWeek = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" aria-label="Volunteer Profile Editor">
      <div className="bg-white rounded-lg shadow p-6 w-full max-w-5xl max-h-[95vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xl font-semibold">{contact.firstName} {contact.lastName}</h2>
            <div className="text-xs text-gray-600">Status: <span className="font-medium">{info.status||'—'}</span> • Hours: {calc.calculateVolunteerHours? calc.calculateVolunteerHours(contact.id): info.totalHours||0}</div>
          </div>
          <button onClick={onClose} title="Close editor" className="text-sm text-gray-500 hover:text-gray-700">✕</button>
        </div>
        <div className="flex gap-2 mb-4 text-sm flex-wrap">
          {['profile','history','statistics'].map(t => (
            <button key={t} onClick={()=>setTab(t)} title={`Show ${t} tab`} className={`px-3 py-1 rounded border ${tab===t?'bg-violet-600 text-white border-violet-600':'bg-white text-gray-900'}`}>{t.charAt(0).toUpperCase()+t.slice(1)}</button>
          ))}
        </div>
        {tab==='profile' && (
          <div className="space-y-6 text-xs">
            {/* Status & Notes */}
            <section className="border rounded p-3 bg-gray-50 text-gray-900">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold text-sm text-gray-900">Status & Admin Notes</h3>
              </div>
              <div className="flex flex-wrap gap-3 items-start">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium text-gray-700" htmlFor="statusSelect">Status</label>
                  <select id="statusSelect" title="Volunteer status" value={info.status||''} onChange={e=>updateVolunteerInfo({ status: e.target.value })} className="border rounded px-2 py-1 text-xs min-w-[120px] bg-white text-gray-900">
                    <option value="">Select...</option>
                    {statusOptions.map(s=> <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="text-[11px] font-medium text-gray-700" htmlFor="notesArea">Admin Notes</label>
                  <textarea id="notesArea" title="Admin notes" value={info.notes||''} onChange={e=>updateVolunteerInfo({ notes: e.target.value })} className="border rounded p-2 w-full h-24 bg-white text-gray-900" />
                </div>
              </div>
            </section>
            {/* Skills */}
            <section className="border rounded p-3 bg-gray-50 text-gray-900">
              <h3 className="font-semibold text-sm mb-2 text-gray-900">Skills</h3>
              <div className="flex flex-wrap gap-1 mb-2">
                {(info.skills||[]).map(skill => (
                  <span key={skill} className="px-2 py-0.5 bg-violet-100 text-violet-700 rounded flex items-center gap-1">{skill}<button title="Remove skill" onClick={()=>removeSkill(skill)} className="text-[10px] text-violet-700 hover:text-violet-900">✕</button></span>
                ))}
                {(info.skills||[]).length===0 && <span className="text-gray-500">No skills</span>}
              </div>
              <div className="flex gap-2">
                <input title="New skill" placeholder="Add skill" className="border rounded px-2 py-1 text-xs flex-1 bg-white text-gray-900" onKeyDown={e=>{ if(e.key==='Enter'){ addSkill(e.target.value); e.target.value=''; } }} />
                <button title="Add skill" onClick={e=>{ const input = e.currentTarget.previousSibling; if(input && input.value){ addSkill(input.value); input.value=''; } }} className="px-3 py-1 rounded border text-xs bg-white text-gray-900">Add</button>
              </div>
            </section>
            {/* Interests */}
            <section className="border rounded p-3 bg-gray-50 text-gray-900">
              <h3 className="font-semibold text-sm mb-2 text-gray-900">Interests</h3>
              <div className="flex flex-wrap gap-1 mb-2">
                {(info.interests||[]).map(i => {
                  const label = typeof i === 'string' ? i : String(i || '');
                  return (
                    <span key={label} className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded flex items-center gap-1">{label.substring(0,18)}<button title="Remove interest" onClick={()=>removeInterest(i)} className="text-[10px] text-indigo-700 hover:text-indigo-900">✕</button></span>
                  );
                })}
                {(info.interests||[]).length===0 && <span className="text-gray-500">No interests</span>}
              </div>
              <div className="flex gap-2">
                <input title="New interest" placeholder="Add interest" className="border rounded px-2 py-1 text-xs flex-1 bg-white text-gray-900" onKeyDown={e=>{ if(e.key==='Enter'){ addInterest(e.target.value); e.target.value=''; } }} />
                <button title="Add interest" onClick={e=>{ const input = e.currentTarget.previousSibling; if(input && input.value){ addInterest(input.value); input.value=''; } }} className="px-3 py-1 rounded border text-xs bg-white text-gray-900">Add</button>
              </div>
            </section>
            {/* Weekly Availability */}
            <section className="border rounded p-3 bg-gray-50 text-gray-900">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold text-sm text-gray-900">Weekly Availability</h3>
                {(() => {
                  const fmt = (t) => (window.preferencesService?.formatTime?.(t) || t);
                  const morning = `${fmt('00:00')}-${fmt('11:59')}`;
                  const afternoon = `${fmt('12:00')}-${fmt('16:59')}`;
                  const evening = `${fmt('17:00')}-${fmt('23:59')}`;
                  return (
                    <span className="text-[11px] text-gray-600" aria-label="Availability time buckets helper">
                      Morning {morning} • Afternoon {afternoon} • Evening {evening}
                    </span>
                  );
                })()}
              </div>
              <div className="flex items-center gap-3 mb-2 text-[11px]">
                <span className="text-gray-700 font-medium">Time Increment:</span>
                {[15,30].map(inc => (
                  <label key={inc} className="flex items-center gap-1">
                    <input type="radio" name="timeIncrement" checked={timeIncrement===inc} onChange={()=>setTimeIncrement(inc)} />
                    <span>{inc} min</span>
                  </label>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 mb-2 text-[11px]">
                <button className="px-2 py-0.5 rounded border bg-white text-gray-900" title="Mark all days as available for all buckets" onClick={()=>applyMatrixTransform(next=>{ dayKeys.forEach(d=>{ buckets.forEach(b=> next[d][b]=true); }); })}>Select All</button>
                <button className="px-2 py-0.5 rounded border bg-white text-gray-900" title="Clear all availability" onClick={()=>applyMatrixTransform(next=>{ dayKeys.forEach(d=>{ buckets.forEach(b=> next[d][b]=false); }); })}>Clear All</button>
                <button className="px-2 py-0.5 rounded border bg-white text-gray-900" title="Weekdays only: set Mon–Fri available, weekends off" onClick={()=>applyMatrixTransform(next=>{ ['mon','tue','wed','thu','fri'].forEach(d=> buckets.forEach(b=> next[d][b]=true)); ['sat','sun'].forEach(d=> buckets.forEach(b=> next[d][b]=false)); })}>Weekdays Only</button>
                <button className="px-2 py-0.5 rounded border bg-white text-gray-900" title="Weekends only: set Sat–Sun available, weekdays off" onClick={()=>applyMatrixTransform(next=>{ ['sat','sun'].forEach(d=> buckets.forEach(b=> next[d][b]=true)); ['mon','tue','wed','thu','fri'].forEach(d=> buckets.forEach(b=> next[d][b]=false)); })}>Weekends Only</button>
              </div>
              <div className="overflow-auto">
                <table className="min-w-[760px] w-full text-[11px]">
                  <thead>
                    <tr className="text-left text-gray-700">
                      <th className="px-2 py-1">Day</th>
                      {buckets.map(b=> <th key={b} className="px-2 py-1 capitalize">{b} (Avail + Times)</th>)}
                      <th className="px-2 py-1">Copy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dayKeys.map((dk, i) => (
                      <tr key={dk} className="border-t">
                        <td className="px-2 py-1 font-medium text-gray-800">{dayLabels[i]}</td>
                        {buckets.map(b => {
                          const checked = !!matrix[dk]?.[b];
                          const times = availabilityTimes[dk][b];
                          const startVal = times?.start || bucketWindows[b].start;
                          const endVal = times?.end || bucketWindows[b].end;
                          const allOpts = timeOptions(b);
                          const endOpts = allOpts.filter(opt => opt > startVal);
                          return (
                            <td key={b} className="px-2 py-1 align-middle">
                              <div className="flex items-center gap-2">
                                <label className="flex items-center gap-2">
                                  <input type="checkbox" checked={checked} onChange={()=>toggleAvailBucket(dk,b)} />
                                  <span className={`px-2 py-0.5 rounded border text-[10px] mr-2 ${checked? 'bg-green-600 text-white border-green-600':'bg-white text-gray-700'}`}>{checked? 'Available':'—'}</span>
                                </label>
                                {checked && (
                                  <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-1">
                                      <span className="text-[10px] text-gray-600">Start</span>
                                      <select
                                        className="border rounded px-2 py-1 bg-white text-gray-900 text-[10px] ml-1"
                                        value={startVal}
                                        onChange={e=>{ updateAvailabilityTime(dk,b,'start', e.target.value); }}
                                        aria-label={`Start time for ${dayLabels[i]} ${b}`}
                                        title={`Start time for ${dayLabels[i]} ${b}`}
                                      >
                                        {allOpts.map(opt => <option key={opt} value={opt}>{formatDisplayTime(opt)}</option>)}
                                      </select>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <span className="text-[10px] text-gray-600">End</span>
                                      <select
                                        className="border rounded px-2 py-1 bg-white text-gray-900 text-[10px] ml-1"
                                        value={endVal}
                                        onChange={e=>{ updateAvailabilityTime(dk,b,'end', e.target.value); }}
                                        aria-label={`End time for ${dayLabels[i]} ${b}`}
                                        title={`End time for ${dayLabels[i]} ${b}`}
                                      >
                                        {endOpts.map(opt => <option key={opt} value={opt}>{formatDisplayTime(opt)}</option>)}
                                      </select>
                                    </div>
                                  </div>
                                )}
                              </div>
                              {checked && endVal <= startVal && (
                                <div className="text-[10px] text-red-600 mt-1" role="alert">End must be after Start</div>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-2 py-1 whitespace-nowrap">
                          {dk!=='sat' && dk!=='sun' && (
                            <button className="px-1.5 py-0.5 rounded border bg-white text-gray-900 text-[10px] mr-1" title="Copy this day's pattern to Weekdays" onClick={()=>copyRowToWeekdays(dk)}>→ Weekdays</button>
                          )}
                          <button className="px-1.5 py-0.5 rounded border bg-white text-gray-900 text-[10px]" title="Copy this day's pattern to All Days" onClick={()=>copyRowToAllDays(dk)}>→ All Days</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
            {/* Compliance */}
            <section className="border rounded p-3 bg-gray-50 text-gray-900">
              <h3 className="font-semibold text-sm mb-2 text-gray-900">Compliance & Milestones</h3>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" title="Orientation completed" checked={!!info.orientationCompleted} onChange={e=>updateVolunteerInfo({ orientationCompleted: e.target.checked, orientationDate: e.target.checked? Date.now(): null })} />
                    <span className="text-[11px] text-gray-800">Orientation Completed {info.orientationDate? '('+ new Date(info.orientationDate).toLocaleDateString()+')':''}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" title="Background check passed" checked={info.backgroundCheckStatus==='approved'} onChange={e=>updateVolunteerInfo({ backgroundCheckStatus: e.target.checked? 'approved':'pending', backgroundCheckDate: e.target.checked? Date.now(): null })} />
                    <span className="text-[11px] text-gray-800">Background Check {info.backgroundCheckDate? '('+ new Date(info.backgroundCheckDate).toLocaleDateString()+')':''}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" title="Waivers signed" checked={(info.waiversSigned||[]).length>0} onChange={e=>updateVolunteerInfo({ waiversSigned: e.target.checked? ['general-liability'] : [] })} />
                    <span className="text-[11px] text-gray-800">Waivers Signed {(info.waiversSigned||[]).length>0? '('+info.waiversSigned.length+')':''}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-[11px] text-gray-800">Total Hours: {calc.calculateVolunteerHours? calc.calculateVolunteerHours(contact.id): info.totalHours||0}</div>
                  <div className="text-[11px] text-gray-800">Completion Rate: {calc.calculateCompletionRate? calc.calculateCompletionRate(contact.id): '—'}%</div>
                  <div className="text-[11px] text-gray-800">Shifts Completed: {info.shiftsCompleted||0}</div>
                  <div className="text-[11px] text-gray-800">Last Shift: {info.lastShiftDate? new Date(info.lastShiftDate).toLocaleDateString(): '—'}</div>
                </div>
              </div>
            </section>
            {/* Emergency Contact */}
            <section className="border rounded p-3 bg-gray-50 text-gray-900">
              <h3 className="font-semibold text-sm mb-2 text-gray-900">Emergency Contact</h3>
              <div className="grid md:grid-cols-3 gap-2">
                <div>
                  <input
                    title="Emergency contact name"
                    placeholder="Name"
                    className={`border rounded px-2 py-1 text-xs bg-white text-gray-900 ${fieldErrors.emergencyContactName? 'border-red-500':''}`}
                    value={info.emergencyContact?.name||''}
                    onChange={e=>updateVolunteerInfo({ emergencyContact: { ...(info.emergencyContact||{}), name: e.target.value } })}
                    aria-describedby={fieldErrors.emergencyContactName? 'err-ec-name': undefined}
                  />
                  {fieldErrors.emergencyContactName && <div id="err-ec-name" className="mt-1 text-[11px] text-red-600" role="alert">{fieldErrors.emergencyContactName}</div>}
                </div>
                <div>
                  <input
                    title="Emergency contact phone"
                    placeholder="Phone"
                    className={`border rounded px-2 py-1 text-xs bg-white text-gray-900 ${fieldErrors.emergencyContactPhone? 'border-red-500':''}`}
                    value={info.emergencyContact?.phone||''}
                    onChange={e=>updateVolunteerInfo({ emergencyContact: { ...(info.emergencyContact||{}), phone: e.target.value } })}
                    aria-describedby={fieldErrors.emergencyContactPhone? 'err-ec-phone': undefined}
                  />
                  {fieldErrors.emergencyContactPhone && <div id="err-ec-phone" className="mt-1 text-[11px] text-red-600" role="alert">{fieldErrors.emergencyContactPhone}</div>}
                </div>
                <div>
                  <input
                    title="Emergency contact relationship"
                    placeholder="Relationship"
                    className="border rounded px-2 py-1 text-xs bg-white text-gray-900"
                    value={info.emergencyContact?.relationship||''}
                    onChange={e=>updateVolunteerInfo({ emergencyContact: { ...(info.emergencyContact||{}), relationship: e.target.value } })}
                  />
                </div>
              </div>
            </section>
          </div>
        )}
        {tab==='history' && <HistoryTab contactId={contact.id} storage={storage} />}
        {tab==='statistics' && <StatisticsTab contact={contact} calc={calc} />}
        <div className="mt-6 flex justify-end gap-2">
          <button className="px-3 py-1 rounded border" onClick={onClose}>Close</button>
          <button disabled={!dirty || saving} title="Save changes" className={`px-3 py-1 rounded text-sm ${dirty && !saving? 'bg-green-600 text-white':'bg-gray-300 text-gray-600'}`} onClick={saveChanges}>{saving? 'Saving...':'Save Changes'}</button>
        </div>
      </div>
    </div>
  );
};

const HistoryTab = ({ contactId, storage }) => {
  const [upcoming, setUpcoming] = useState([]);
  const [past, setPast] = useState([]);
  const [viewPast, setViewPast] = useState(false);

  useEffect(()=>{
    const shifts = storage.getShiftsByVolunteer(contactId);
    const today = new Date().toISOString().split('T')[0];
    setUpcoming(shifts.filter(s=> s.date >= today).sort((a,b)=> a.date.localeCompare(b.date)).slice(0,50));
    setPast(shifts.filter(s=> s.date < today).sort((a,b)=> b.date.localeCompare(a.date)).slice(0,100));
  }, [contactId]);

  return (
    <div className="text-xs space-y-4">
      <section className="border rounded p-3 bg-gray-50 text-gray-900">
        <h3 className="font-semibold text-sm mb-2 text-gray-900">Upcoming Shifts</h3>
        {upcoming.length===0 && <div className="text-gray-500">No upcoming shifts</div>}
        <ul className="space-y-1">
          {upcoming.map(s => <li key={s.id} className="flex justify-between text-gray-800"><span>{s.date} • {s.title}</span><span className="text-gray-600">{s.startTime}-{s.endTime}</span></li>)}
        </ul>
      </section>
      <section className="border rounded p-3 bg-gray-50 text-gray-900">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-semibold text-sm text-gray-900">Past Shifts</h3>
          <button title="Toggle past shifts" onClick={()=>setViewPast(v=>!v)} className="px-2 py-0.5 rounded border bg-white text-[11px] text-gray-900">{viewPast? 'Hide':'Show'}</button>
        </div>
        {viewPast && (
          <div className="overflow-auto max-h-64 border rounded">
            <table className="w-full text-[11px]">
              <thead className="bg-gray-100"><tr><th className="text-left px-2 py-1">Date</th><th className="text-left px-2 py-1">Title</th><th className="text-left px-2 py-1">Status</th><th className="text-left px-2 py-1">Slots</th></tr></thead>
              <tbody>
                {past.map(s => <tr key={s.id} className="border-t"><td className="px-2 py-1 whitespace-nowrap">{s.date}</td><td className="px-2 py-1">{s.title}</td><td className="px-2 py-1">{s.status}</td><td className="px-2 py-1">{s.slotsFilled}/{s.slotsNeeded}</td></tr>)}
                {past.length===0 && <tr><td colSpan={4} className="px-2 py-2 text-center text-gray-500">No past shifts</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

const StatisticsTab = ({ contact, calc }) => {
  const hours = calc.calculateVolunteerHours? calc.calculateVolunteerHours(contact.id): (contact.volunteerInfo?.totalHours||0);
  const completion = calc.calculateCompletionRate? calc.calculateCompletionRate(contact.id): 100;
  const avg = calc.calculateAverageHoursPerShift? calc.calculateAverageHoursPerShift(contact.id): 0;
  const hoursByCategory = calc.getHoursByCategory? calc.getHoursByCategory(contact.id): {};
  const peak = calc.getPeakVolunteerTimes? calc.getPeakVolunteerTimes(): { peakDay:'', peakTime:'', distribution:{}};

  return (
    <div className="text-xs space-y-4">
      <section className="border rounded p-3 bg-gray-50 text-gray-900">
        <h3 className="font-semibold text-sm mb-2 text-gray-900">Core Metrics</h3>
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard label="Total Hours" value={hours} />
          <MetricCard label="Completion Rate" value={completion+'%'} />
          <MetricCard label="Avg Hours/Shift" value={avg} />
          <MetricCard label="Shifts Completed" value={contact.volunteerInfo?.shiftsCompleted||0} />
        </div>
      </section>
      <section className="border rounded p-3 bg-gray-50 text-gray-900">
        <h3 className="font-semibold text-sm mb-2 text-gray-900">Hours by Category</h3>
        <div className="flex flex-wrap gap-2">
          {Object.keys(hoursByCategory).map(cat => <span key={cat} className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded">{cat}: {hoursByCategory[cat]}</span>)}
          {Object.keys(hoursByCategory).length===0 && <span className="text-gray-500">No category data</span>}
        </div>
      </section>
      <section className="border rounded p-3 bg-gray-50 text-gray-900">
        <h3 className="font-semibold text-sm mb-2 text-gray-900">Milestones</h3>
        <ul className="space-y-1">
          <li className="flex justify-between text-gray-800"><span>Orientation Completed</span><span>{contact.volunteerInfo?.orientationCompleted? '✅':'❌'}</span></li>
          <li className="flex justify-between text-gray-800"><span>Background Check Approved</span><span>{contact.volunteerInfo?.backgroundCheckStatus==='approved'? '✅':'❌'}</span></li>
          <li className="flex justify-between text-gray-800"><span>Reached 25 Hours</span><span>{hours>=25? '🏅':'—'}</span></li>
          <li className="flex justify-between text-gray-800"><span>Reached 100 Hours</span><span>{hours>=100? '🌟':'—'}</span></li>
        </ul>
      </section>
      <section className="border rounded p-3 bg-gray-50 text-gray-900">
        <h3 className="font-semibold text-sm mb-2 text-gray-900">Peak Engagement</h3>
        <div className="text-[11px] text-gray-800">Peak Day: {peak.peakDay||'—'} • Peak Time: {peak.peakTime||'—'}</div>
      </section>
    </div>
  );
};

const MetricCard = ({ label, value }) => (
  <div className="bg-white rounded border p-2 shadow-sm flex flex-col">
    <span className="text-[10px] uppercase tracking-wide text-gray-500">{label}</span>
    <span className="text-sm font-semibold mt-1 text-gray-900">{value}</span>
  </div>
);

window.VolunteerProfileEditor = VolunteerProfileEditor;
