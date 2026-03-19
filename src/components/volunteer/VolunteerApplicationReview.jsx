/**
 * VolunteerApplicationReview.jsx
 * Full review queue: filtering, bulk actions, status changes, email templating, conversion to contact, export.
 */

const { useState, useEffect, useMemo } = React;

const VolunteerApplicationReview = ({ userRole='Admin' }) => {
  const allowedRoles = new Set(['Admin','Board Admin','Stage Manager']);
  if (!allowedRoles.has(userRole)) return <div className="p-4 text-sm text-red-600">Access denied.</div>;

  const storage = window.volunteerStorageService;
  const exporter = window.volunteerExportUtils || {}; // fallback

  const [applications, setApplications] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [bulkMode, setBulkMode] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [expandedId, setExpandedId] = useState(null);
  const [template, setTemplate] = useState('welcome');
  const [emailPreview, setEmailPreview] = useState('');
  const [refreshToken, setRefreshToken] = useState(0);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loadingAction, setLoadingAction] = useState(false);
  const [bulkConfirm, setBulkConfirm] = useState(null); // {action: 'approve|reject|contact|hold', count: number}
  const [openMenuId, setOpenMenuId] = useState(null);
  const [profileVolunteerId, setProfileVolunteerId] = useState(null);

  // Close actions menu on outside click or Escape
  useEffect(() => {
    function onDocMouseDown(e) {
      if (openMenuId == null) return;
      const openContainer = document.querySelector('[data-actions-container-open="true"]');
      if (openContainer && openContainer.contains(e.target)) return;
      setOpenMenuId(null);
    }
    function onKeyDown(e) {
      if (openMenuId == null) return;
      if (e.key === 'Escape') setOpenMenuId(null);
    }
    document.addEventListener('mousedown', onDocMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [openMenuId]);

  const templates = {
    welcome: {
      subject: 'Welcome to SceneStave Volunteers',
      body: 'Hi {firstName},\n\nThank you for applying to volunteer with us. We will review your application and reach out shortly with next steps.\n\nBest,\nSceneStave Team'
    },
    approval: {
      subject: 'Your Volunteer Application is Approved',
      body: 'Hi {firstName},\n\nWe are excited to let you know your application has been approved! Please watch for upcoming shift opportunities and complete any required onboarding steps.\n\nThank you,\nSceneStave Team'
    },
    rejection: {
      subject: 'Volunteer Application Update',
      body: 'Hi {firstName},\n\nThank you for your interest in volunteering. At this time we are unable to approve your application. We appreciate your willingness to contribute and welcome you to apply again in the future.\n\nBest,\nSceneStave Team'
    },
    followup: {
      subject: 'Follow-up: Volunteer Application',
      body: 'Hi {firstName},\n\nJust checking in regarding your volunteer application. Let us know if you have any questions or need assistance completing onboarding steps.\n\nRegards,\nSceneStave Team'
    }
  };

  useEffect(()=>{
    setApplications(storage.getVolunteerApplications());
  }, [refreshToken]);

  // Load opportunities for mapping IDs -> titles
  useEffect(()=>{
    try {
      setOpportunities(storage.getVolunteerOpportunities?.() || []);
    } catch(e) { setOpportunities([]); }
  }, []);

  // Precompile email preview when template or expanded changes
  useEffect(()=>{
    const app = applications.find(a=>a.id===expandedId);
    if (!app) { setEmailPreview(''); return; }
    const tpl = templates[template];
    if (!tpl) { setEmailPreview(''); return; }
    const body = tpl.body.replace(/\{firstName\}/g, app.firstName||'');
    setEmailPreview(body);
  }, [template, expandedId, applications]);

  const counts = useMemo(()=>{
    const c = { all: applications.length };
    applications.forEach(a => { c[a.status] = (c[a.status]||0)+1; });
    return c;
  }, [applications]);

  const filtered = useMemo(()=>{
    let list = applications.slice();
    if (tab !== 'all') list = list.filter(a => a.status === tab);
    if (statusFilter !== 'all') list = list.filter(a => a.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(a => `${a.firstName} ${a.lastName}`.toLowerCase().includes(q) || (a.email||'').toLowerCase().includes(q));
    }
    // Sort by submittedAt desc
    list.sort((a,b)=> (b.submittedAt||0) - (a.submittedAt||0));
    return list;
  }, [applications, tab, search, statusFilter]);

  function toggleSelect(id) {
    setSelected(prev => {
      const copy = new Set(prev);
      if (copy.has(id)) copy.delete(id); else copy.add(id);
      return copy;
    });
  }

  function selectAll() {
    const ids = new Set(filtered.map(a => a.id));
    setSelected(ids);
    window.toast?.success(`Selected ${ids.size} application(s)`);
  }

  function clearSelection() {
    setSelected(new Set());
    window.toast?.info('Selection cleared');
  }

  function updateStatus(appId, status) {
    setLoadingAction(true);
    storage.updateApplicationStatus(appId, status, 'system');
    setLoadingAction(false);
    setRefreshToken(t=>t+1);
  }

  function approveAndConvert(appId) {
    try {
      setLoadingAction(true);
      const app = storage.getVolunteerApplicationById?.(appId);
      if (app && !app.contactId) {
        storage.convertApplicationToContact(appId);
      }
      storage.updateApplicationStatus(appId, 'approved', 'system');
    } finally {
      setLoadingAction(false);
      setRefreshToken(t=>t+1);
    }
  }

  function bulkUpdate(status) {
    if (selected.size===0) return;
    setLoadingAction(true);
    selected.forEach(id => {
      if (status === 'approved') {
        const app = storage.getVolunteerApplicationById?.(id);
        if (app && !app.contactId) {
          storage.convertApplicationToContact(id);
        }
      }
      storage.updateApplicationStatus(id, status, 'system-bulk');
    });
    setSelected(new Set());
    setBulkConfirm(null);
    setLoadingAction(false);
    setRefreshToken(t=>t+1);
    // Show success toast
    window.toast?.success(`${selected.size} application(s) ${status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : status === 'contacted' ? 'marked as contacted' : 'placed on hold'}`);
  }

  function confirmBulkAction(action) {
    if (selected.size === 0) return;
    setBulkConfirm({ action, count: selected.size });
  }

  function executeBulkAction() {
    if (!bulkConfirm) return;
    const statusMap = {
      'approve': 'approved',
      'reject': 'rejected',
      'contact': 'contacted',
      'hold': 'on-hold'
    };
    const status = statusMap[bulkConfirm.action];
    if (status) bulkUpdate(status);
  }

  function convertToContact(appId) {
    setLoadingAction(true);
    storage.convertApplicationToContact(appId);
    storage.updateApplicationStatus(appId, 'approved', 'system');
    setLoadingAction(false);
    setRefreshToken(t=>t+1);
  }

  function exportCSV() {
    try {
      if (window.exportApplicationQueue) {
        window.exportApplicationQueue(applications, tab==='all'? 'pending': tab);
      } else if (exporter.exportApplicationQueue) {
        exporter.exportApplicationQueue(applications, tab==='all'? 'pending': tab);
      } else {
        // Basic inline CSV fallback
        const header = ['id','name','email','status','submitted'];
        const rows = filtered.map(a => [a.id, `${a.firstName} ${a.lastName}`, a.email, a.status, new Date(a.submittedAt||Date.now()).toISOString()]);
        const csv = [header.join(','), ...rows.map(r=>r.map(x=>`"${(x||'').toString().replace(/"/g,'""')}"`).join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'applications.csv';
        link.click();
      }
    } catch(e) { console.error('Export failed', e); }
  }

  function mailtoLink(app) {
    const tpl = templates[template];
    if (!tpl) return '#';
    const subject = encodeURIComponent(tpl.subject.replace(/\{firstName\}/g, app.firstName||''));
    const body = encodeURIComponent(tpl.body.replace(/\{firstName\}/g, app.firstName||''));
    return `mailto:${app.email}?subject=${subject}&body=${body}`;
  }

  return (
    <div className="p-4 space-y-4 text-gray-900" aria-label="Volunteer Application Review">
      <header className="vol-page-header flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 vol-page-title">Application Review</h1>
          <div className="text-xs vol-page-subtitle mt-1">Manage volunteer applications lifecycle</div>
        </div>
        <div className="flex flex-wrap gap-2 text-[11px]">
          {['all','pending','contacted','approved','rejected','on-hold'].map(t => (
            <button key={t} title={`Filter ${t}`} className={`px-2 py-1 rounded border ${tab===t?'bg-violet-600 text-white border-violet-600':'bg-white text-gray-900'}`} onClick={()=>{setTab(t); setStatusFilter('all');}}>{t} ({counts[t]||0})</button>
          ))}
        </div>
      </header>

      <div className="flex flex-wrap gap-2 items-center text-sm">
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name/email" title="Search applications" className="border rounded px-2 py-1 flex-1 min-w-[160px] bg-white text-gray-900" />
        <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} title="Status filter" className="border rounded px-2 py-1 bg-white text-gray-900">
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="contacted">Contacted</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="on-hold">On Hold</option>
        </select>
        <button onClick={()=>setBulkMode(b=>!b)} title="Toggle bulk mode" className={`border rounded px-3 py-1 ${bulkMode?'bg-violet-600 text-white':'bg-gray-50 text-gray-900'}`}>{bulkMode?'Bulk On':'Bulk Mode'}</button>
        {bulkMode && (
          <>
            <button onClick={selectAll} disabled={filtered.length === 0} title="Select all visible applications" className="border rounded px-3 py-1 bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Select All ({filtered.length})</button>
            <button onClick={clearSelection} disabled={selected.size === 0} title="Clear selection" className="border rounded px-3 py-1 bg-gray-600 text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Clear</button>
          </>
        )}
        <button onClick={exportCSV} title="Export current view" className="border rounded px-3 py-1 bg-white text-gray-900">Export CSV</button>
        {bulkMode && selected.size>0 && (
          <div className="flex gap-2 items-center text-xs">
            <span className="text-gray-600 font-medium">{selected.size} selected</span>
            <button disabled={loadingAction} onClick={()=>confirmBulkAction('approve')} className="px-2 py-1 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Approve</button>
            <button disabled={loadingAction} onClick={()=>confirmBulkAction('contact')} className="px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Contact</button>
            <button disabled={loadingAction} onClick={()=>confirmBulkAction('reject')} className="px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Reject</button>
            <button disabled={loadingAction} onClick={()=>confirmBulkAction('hold')} className="px-2 py-1 rounded bg-yellow-600 text-white hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Hold</button>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-3" aria-label="Applications List">
        {filtered.length === 0 && <div className="text-sm text-gray-500 col-span-full">No applications match filters.</div>}
        {filtered.map(app => {
          const name = `${app.firstName} ${app.lastName}`;
          const expanded = expandedId === app.id;
          const oppTitle = id => opportunities.find(o=>o.id===id)?.title || id;
          const categoryLabel = id => ({
            events:'Event Support', administrative:'Administrative', outreach:'Community Outreach', technical:'Technical/IT', creative:'Creative/Design', other:'Other'
          }[id] || id);
          const summarizeAvailability = (a)=>{
            if (!a) return '—';
            // Support both old and new shapes
            if (Array.isArray(a.days) || Array.isArray(a.times)) {
              const parts = [];
              if (Array.isArray(a.days) && a.days.length) parts.push(a.days.map(d=>d[0].toUpperCase()+d.slice(1)).join(', '));
              if (Array.isArray(a.times) && a.times.length) parts.push(a.times.map(t=>t[0].toUpperCase()+t.slice(1)).join('/'));
              if (a.frequency) parts.push(a.frequency);
              return parts.join(' • ') || '—';
            }
            // New shape: object of day -> boolean
            const days = Object.keys(a).filter(k=>a[k]===true);
            return days.length? days.join(', '): '—';
          };
          return (
            <div key={app.id} className="bg-white rounded border shadow-sm p-3 text-xs flex flex-col gap-2 text-gray-900">
              <div className="flex justify-between items-start">
                <div className="space-y-0.5">
                  <button className="font-semibold text-sm text-violet-700 hover:underline text-left"
                    title="Open profile / full application"
                    onClick={() => {
                      if (app.contactId) {
                        setProfileVolunteerId(app.contactId);
                      } else {
                        setExpandedId(app.id);
                        setTimeout(()=>{
                          document.getElementById(`app-card-${app.id}`)?.scrollIntoView({ behavior:'smooth', block:'center' });
                        }, 0);
                      }
                    }}
                  >{name}</button>
                  <div className="text-[11px] text-gray-600">{app.email}</div>
                  <div className="text-[11px]">Status: <span className="font-medium">{app.status}</span></div>
                </div>
                <div className="flex flex-col gap-1 items-end">
                  <div className="flex gap-2 items-center">
                    {bulkMode && <input type="checkbox" title={`Select ${name}`} checked={selected.has(app.id)} onChange={()=>toggleSelect(app.id)} />}
                    <button
                      className="px-2 py-1 border border-violet-600 text-violet-700 rounded text-xs bg-white hover:bg-violet-50 focus:outline-none focus:ring-2 focus:ring-violet-500"
                      onClick={()=>setExpandedId(expanded? null: app.id)}
                    >{expanded? 'Hide':'Details'}</button>
                    <div className="relative" data-actions-container-open={(openMenuId === app.id) ? 'true' : 'false'}>
                      <button
                        className="px-2 py-1 bg-violet-600 text-white rounded text-xs hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500"
                        onClick={() => setOpenMenuId(openMenuId === app.id ? null : app.id)}
                        aria-haspopup="menu"
                        aria-expanded={!!(openMenuId === app.id)}
                        title="Actions"
                      >Actions ▾</button>
                      {openMenuId === app.id && (
                        <div role="menu" className="absolute right-0 mt-1 w-44 bg-white border border-violet-600 rounded shadow-lg z-10 text-xs">
                          <button role="menuitem" className="block w-full text-left px-3 py-2 text-violet-700 hover:bg-violet-700 hover:text-white transition-colors" onClick={()=>{ setOpenMenuId(null); approveAndConvert(app.id); }}>Approve</button>
                          <button role="menuitem" className="block w-full text-left px-3 py-2 text-violet-700 hover:bg-violet-700 hover:text-white transition-colors" onClick={()=>{ setOpenMenuId(null); updateStatus(app.id,'contacted'); }}>Mark Contacted</button>
                          <button role="menuitem" className="block w-full text-left px-3 py-2 text-red-600 hover:bg-red-600 hover:text-white transition-colors" onClick={()=>{ setOpenMenuId(null); updateStatus(app.id,'rejected'); }}>Reject</button>
                          <button role="menuitem" className="block w-full text-left px-3 py-2 text-violet-700 hover:bg-violet-700 hover:text-white transition-colors" onClick={()=>{ setOpenMenuId(null); updateStatus(app.id,'on-hold'); }}>Place on Hold</button>
                          <div className="border-t my-1 border-gray-200"></div>
                          <button role="menuitem" className="block w-full text-left px-3 py-2 text-violet-700 hover:bg-violet-700 hover:text-white transition-colors" onClick={()=>{ setOpenMenuId(null); convertToContact(app.id); }}>Convert to Volunteer</button>
                          <a role="menuitem" className="block w-full text-left px-3 py-2 text-violet-700 hover:bg-violet-700 hover:text-white transition-colors" href={mailtoLink(app)}>Send Email…</a>
                          <div className="border-t my-1 border-gray-200"></div>
                          <button role="menuitem" className="block w-full text-left px-3 py-2 text-violet-700 hover:bg-violet-700 hover:text-white transition-colors" onClick={()=> setOpenMenuId(null)}>Cancel</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              {expanded && (
                <div className="mt-1 space-y-3">
                  {/* Contact Info */}
                  <div className="border rounded p-2 bg-gray-50">
                    <div className="font-medium text-gray-900 mb-1">Contact Info</div>
                    <div className="grid sm:grid-cols-2 gap-1">
                      <div>Email: <a className="text-violet-700" href={`mailto:${app.email}`}>{app.email || '—'}</a></div>
                      <div>Phone: {app.phone || '—'}</div>
                      {app.address?.street && <div className="sm:col-span-2">Address: {app.address.street}, {app.address.city||''} {app.address.state||''} {app.address.zip||''}</div>}
                    </div>
                  </div>
                  {/* Availability */}
                  <div className="border rounded p-2 bg-gray-50">
                    <div className="font-medium text-gray-900 mb-1">Availability</div>
                    <div>Summary: {summarizeAvailability(app.availability)}</div>
                    {app.availabilityNotes && (<div className="mt-1">Notes: {app.availabilityNotes}</div>)}
                  </div>
                  {/* Interests & Skills */}
                  <div className="border rounded p-2 bg-gray-50">
                    <div className="font-medium text-gray-900 mb-1">Interests & Skills</div>
                    <div className="mb-1">Areas: {(app.categories||[]).length ? (app.categories||[]).map(categoryLabel).join(', ') : '—'}</div>
                    <div className="mb-1">Opportunities: {(app.specificOpportunities||app.interests||[]).length ? (app.specificOpportunities||app.interests||[]).map(oppTitle).join(', ') : '—'}</div>
                    <div className="">Experience/Skills: {app.experience || '—'}</div>
                  </div>
                  {/* Emergency & References */}
                  <div className="border rounded p-2 bg-gray-50">
                    <div className="font-medium text-gray-900 mb-1">Emergency Contact & References</div>
                    <div className="mb-1">Emergency: {app.emergencyContact?.name||'—'}{app.emergencyContact?.relationship? ` (${app.emergencyContact.relationship})`:''}{app.emergencyContact?.phone? ` — ${app.emergencyContact.phone}`:''}</div>
                    <div>
                      References:
                      <ul className="list-disc ml-5 mt-1">
                        {(app.references||[]).filter(r=>r && (r.name||r.email||r.phone)).length ?
                          (app.references||[]).filter(r=>r && (r.name||r.email||r.phone)).map((r,idx)=> (
                            <li key={idx}>{r.name||'—'}{r.email? ` — ${r.email}`:''}{r.phone? ` — ${r.phone}`:''}</li>
                          )) : <li>—</li>}
                      </ul>
                    </div>
                  </div>
                  {/* Reviewer Notes */}
                  <div className="space-y-1">
                    <div className="font-medium text-gray-900">Reviewer Notes</div>
                    <textarea placeholder="Reviewer notes" title="Reviewer notes" className="border rounded p-2 w-full h-28 text-[11px] bg-white text-gray-900" defaultValue={app.notes||''} onBlur={e=>{ if(e.target.value && e.target.value!==app.notes){ storage.updateApplicationStatus(app.id, app.status, 'reviewer', e.target.value); setRefreshToken(t=>t+1);} }} />
                    <div className="text-[10px] text-gray-500">Blur to save notes. Status unchanged.</div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bulk Action Confirmation Dialog */}
      {bulkConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-label="Bulk Action Confirmation">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md text-gray-900">
            <h2 className="text-lg font-semibold mb-3 text-gray-900">Confirm Bulk Action</h2>
            <div className="space-y-3 text-sm">
              <p className="text-gray-800">
                You are about to <span className="font-semibold">{bulkConfirm.action}</span> <span className="font-bold text-violet-600">{bulkConfirm.count}</span> application{bulkConfirm.count !== 1 ? 's' : ''}.
              </p>
              
              <div className="bg-gray-50 rounded p-3 border border-gray-200">
                <div className="font-medium text-gray-900 mb-2">Action Summary:</div>
                <ul className="text-xs space-y-1 text-gray-700">
                  {bulkConfirm.action === 'approve' && (
                    <>
                      <li>• Status will be changed to <strong>Approved</strong></li>
                      <li>• Applications will be ready for volunteer conversion</li>
                      <li>• You may want to send welcome emails after</li>
                    </>
                  )}
                  {bulkConfirm.action === 'reject' && (
                    <>
                      <li>• Status will be changed to <strong>Rejected</strong></li>
                      <li>• Consider sending notification emails</li>
                      <li>• Applications can be reviewed again later if needed</li>
                    </>
                  )}
                  {bulkConfirm.action === 'contact' && (
                    <>
                      <li>• Status will be changed to <strong>Contacted</strong></li>
                      <li>• Use this to track follow-up communications</li>
                      <li>• Applications remain pending final decision</li>
                    </>
                  )}
                  {bulkConfirm.action === 'hold' && (
                    <>
                      <li>• Status will be changed to <strong>On Hold</strong></li>
                      <li>• Applications will be paused for review</li>
                      <li>• No immediate action required</li>
                    </>
                  )}
                </ul>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-xs text-yellow-800">
                <strong>⚠️ Note:</strong> This action will affect {bulkConfirm.count} application{bulkConfirm.count !== 1 ? 's' : ''}. Make sure you've reviewed the selected applications before proceeding.
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button 
                onClick={() => setBulkConfirm(null)} 
                className="px-4 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={executeBulkAction}
                disabled={loadingAction}
                className={`px-4 py-2 rounded text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  bulkConfirm.action === 'approve' ? 'bg-green-600 hover:bg-green-700' :
                  bulkConfirm.action === 'reject' ? 'bg-red-600 hover:bg-red-700' :
                  bulkConfirm.action === 'contact' ? 'bg-blue-600 hover:bg-blue-700' :
                  'bg-yellow-600 hover:bg-yellow-700'
                }`}
              >
                {loadingAction ? 'Processing...' : `Confirm ${bulkConfirm.action.charAt(0).toUpperCase() + bulkConfirm.action.slice(1)}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

window.VolunteerApplicationReview = VolunteerApplicationReview;
