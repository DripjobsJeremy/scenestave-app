/**
 * VolunteerOpportunitiesManager.jsx
 * Full implementation: list, filtering, sorting, create/edit, validation, deletion guard, quick stats.
 */

const { useState, useEffect, useMemo } = React;

const VolunteerOpportunitiesManager = ({ 
  userRole = 'Admin', 
  onNavigate = () => {}, 
  initialView = 'list', 
  onBack = null 
}) => {
  const allowedRoles = new Set(['Admin', 'Board Admin', 'Stage Manager']);
  if (!allowedRoles.has(userRole)) {
    return <div className="p-4 text-sm text-red-600">Access denied.</div>;
  }

  const [loading, setLoading] = useState(true);
  const [opportunities, setOpportunities] = useState([]);
  const [filters, setFilters] = useState({ category: '', status: 'all', search: '', sort: 'created-desc' });
  const [modalOpen, setModalOpen] = useState(initialView === 'create');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', category: '', isActive: true, slotsNeededDefault: 1 });
  const [errors, setErrors] = useState([]); // general (non-field) errors
  const [fieldErrors, setFieldErrors] = useState({}); // per-field inline errors
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const showListView = initialView !== 'create';

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      if (cancelled) return;
      try {
        setLoading(true);
        const storage = window.volunteerStorageService;
        if (!storage) { setTimeout(load, 50); return; }
        const list = storage.getVolunteerOpportunities();
        setOpportunities(Array.isArray(list) ? list : []);
      } finally { if (!cancelled) setLoading(false); }
    };
    load();
    return () => { cancelled = true; };
  }, [refreshToken]);

  // Handle back navigation
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (onNavigate) {
      onNavigate('dashboard');
    }
  };

  const statsMap = useMemo(() => {
    // derive quick stats from shifts (slots needed total, completed hours etc.)
    const storage = window.volunteerStorageService;
    const shifts = storage ? storage.getVolunteerShifts() : [];
    const map = {};
    shifts.forEach(s => {
      if (!s.opportunityId) return;
      if (!map[s.opportunityId]) map[s.opportunityId] = { shifts: 0, needed: 0, filled: 0 };
      map[s.opportunityId].shifts += 1;
      map[s.opportunityId].needed += (s.slotsNeeded || 0);
      map[s.opportunityId].filled += (s.slotsFilled || 0);
    });
    return map;
  }, [opportunities, refreshToken]);

  const filtered = useMemo(() => {
    let list = opportunities.slice();
    if (filters.category) list = list.filter(o => o.category === filters.category);
    if (filters.status === 'active') list = list.filter(o => o.isActive);
    if (filters.status === 'inactive') list = list.filter(o => !o.isActive);
    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(o => (o.title||'').toLowerCase().includes(q) || (o.description||'').toLowerCase().includes(q));
    }
    // Sorting
    const [sortKey, dir] = filters.sort.split('-');
    list.sort((a,b) => {
      let valA, valB;
      switch (sortKey) {
        case 'title': valA = (a.title||'').toLowerCase(); valB = (b.title||'').toLowerCase(); break;
        case 'category': valA = (a.category||'').toLowerCase(); valB = (b.category||'').toLowerCase(); break;
        case 'created': valA = a.createdAt||0; valB = b.createdAt||0; break;
        case 'shifts': valA = statsMap[a.id]?.shifts||0; valB = statsMap[b.id]?.shifts||0; break;
        default: valA = 0; valB = 0;
      }
      if (valA < valB) return dir === 'asc' ? -1 : 1;
      if (valA > valB) return dir === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [opportunities, filters, statsMap]);

  const openCreate = () => { setEditing(null); setForm({ title:'', description:'', category:'', isActive:true, slotsNeededDefault:1 }); setErrors([]); setFieldErrors({}); setModalOpen(true); };
  const openEdit = (opp) => {
    setEditing(opp);
    setForm({
      title: opp.title||'',
      description: opp.description||'',
      category: opp.category||'',
      isActive: !!opp.isActive,
      slotsNeededDefault: opp.slotsNeededDefault || 1
    });
    setErrors([]);
    setFieldErrors({});
    setModalOpen(true);
  };

  const validateForm = () => {
    const util = window.validationUtils;
    let finalValid = true;
    if (util?.validateOpportunity){
      const { valid, fieldErrors: fe } = util.validateOpportunity(form);
      setFieldErrors(fe);
      finalValid = valid;
      const summary = Object.entries(fe).map(([k,v])=>`${k}: ${v}`);
      setErrors(valid? [] : summary);
      return valid;
    }
    // Fallback basic validation if utility missing
    const fe = {};
    if (!form.title.trim()) fe.title = 'Title required';
    if (!form.category.trim()) fe.category = 'Category required';
    if (form.slotsNeededDefault < 1) fe.slotsNeededDefault = 'Must be ≥ 1';
    setFieldErrors(fe);
    setErrors(Object.values(fe));
    return Object.keys(fe).length === 0;
  };

  const save = () => {
    if (!validateForm()) return;
    const storage = window.volunteerStorageService;
    const payload = { ...editing, ...form };
    const saved = storage.saveVolunteerOpportunity(payload);
    if (!saved) { setErrors(['Save failed (validation)']); return; }
    setModalOpen(false);
    setEditing(null);
    setRefreshToken(t=>t+1);
  };

  const toggleActive = (opp) => {
    const storage = window.volunteerStorageService;
    storage.saveVolunteerOpportunity({ ...opp, isActive: !opp.isActive });
    setRefreshToken(t=>t+1);
  };

  const confirmDelete = (opp) => {
    setDeleteConfirm(opp);
  };

  const performDelete = () => {
    if (!deleteConfirm) return;
    const storage = window.volunteerStorageService;
    // Guard: ensure no shifts reference this opportunity
    const shifts = storage.getVolunteerShifts();
    const hasShifts = shifts.some(s => s.opportunityId === deleteConfirm.id);
    if (hasShifts) { setErrors([`Cannot delete: shifts exist for ${deleteConfirm.title}`]); setDeleteConfirm(null); return; }
    storage.deleteVolunteerOpportunity(deleteConfirm.id);
    setDeleteConfirm(null);
    setRefreshToken(t=>t+1);
  };

  const duplicate = (opp) => {
    const storage = window.volunteerStorageService;
    const copy = { ...opp, id: undefined, title: opp.title + ' (Copy)', createdAt: undefined, updatedAt: undefined };
    storage.saveVolunteerOpportunity(copy);
    setRefreshToken(t=>t+1);
  };

  return (
    <div className={showListView ? "p-4 space-y-4" : ""} aria-label="Volunteer Opportunities Manager">
      {showListView && (
        <>
          <header className="vol-page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h1 className="text-xl font-bold text-white vol-page-title">Volunteer Opportunities</h1>
            <button onClick={openCreate} className="bg-blue-600 text-white px-4 py-2 rounded text-sm">+ Create New Opportunity</button>
          </header>

          {/* Filters Stub */}
          <div className="bg-white p-3 rounded shadow flex flex-wrap gap-2 items-center text-sm text-gray-900" aria-label="Opportunity Filters">
        <label className="flex items-center gap-1 text-xs text-gray-600" aria-label="Filter by Category">
          <span>Category:</span>
          <select title="Filter by Category" value={filters.category} onChange={e=>setFilters(f=>({...f,category:e.target.value}))} className="border rounded px-2 py-1 bg-white text-gray-900">
          <option value="">All Categories</option>
          <option>Front of House</option>
          <option>Backstage Crew</option>
          <option>Administrative</option>
          <option>Event Support</option>
          </select>
        </label>
        <label className="flex items-center gap-1 text-xs text-gray-600" aria-label="Filter by Status">
          <span>Status:</span>
          <select title="Filter by Status" value={filters.status} onChange={e=>setFilters(f=>({...f,status:e.target.value}))} className="border rounded px-2 py-1 bg-white text-gray-900">
          <option value="all">All Status</option>
          <option value="active">Active Only</option>
          <option value="inactive">Inactive Only</option>
          </select>
        </label>
        <label className="flex items-center gap-1 text-xs text-gray-600" aria-label="Sort Opportunities">
          <span>Sort:</span>
          <select title="Sort Opportunities" value={filters.sort} onChange={e=>setFilters(f=>({...f,sort:e.target.value}))} className="border rounded px-2 py-1 bg-white text-gray-900">
          <option value="created-desc">Created (Newest)</option>
          <option value="created-asc">Created (Oldest)</option>
          <option value="title-asc">Title (A-Z)</option>
          <option value="title-desc">Title (Z-A)</option>
          <option value="category-asc">Category (A-Z)</option>
          <option value="category-desc">Category (Z-A)</option>
          <option value="shifts-desc">Shift Count (High)</option>
          <option value="shifts-asc">Shift Count (Low)</option>
          </select>
        </label>
        <input value={filters.search} onChange={e=>setFilters(f=>({...f,search:e.target.value}))} placeholder="Search title/description" className="border rounded px-2 py-1 flex-1 min-w-[160px] bg-white text-gray-900" />
      </div>

      {/* List/Table Stub */}
      <div className="bg-white rounded shadow overflow-hidden" aria-label="Opportunities List">
        {loading ? (
          <div className="p-6 animate-pulse text-sm text-gray-500">Loading opportunities...</div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-sm text-gray-500">No opportunities match filters.</div>
        ) : (
          <table className="min-w-full text-sm text-gray-900">
            <thead className="bg-gray-50 text-gray-900">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Title</th>
                <th className="text-left px-3 py-2 font-medium">Category</th>
                <th className="text-left px-3 py-2 font-medium">Active</th>
                <th className="text-left px-3 py-2 font-medium">Shifts</th>
                <th className="text-left px-3 py-2 font-medium">Coverage</th>
                <th className="text-left px-3 py-2 font-medium">Created</th>
                <th className="text-left px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(o => (
                <tr key={o.id} className="border-t">
                  <td className="px-3 py-2">{o.title}</td>
                  <td className="px-3 py-2">{o.category}</td>
                  <td className="px-3 py-2">
                    <button onClick={()=>toggleActive(o)} className={`px-2 py-1 rounded text-xs ${o.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'}`}>{o.isActive ? 'Active' : 'Inactive'}</button>
                  </td>
                  <td className="px-3 py-2 text-xs">{statsMap[o.id]?.shifts || 0}</td>
                  <td className="px-3 py-2 text-xs">
                    {(() => {
                      const s = statsMap[o.id];
                      if (!s) return '—';
                      if (s.needed === 0) return '—';
                      const pct = Math.round((s.filled / s.needed) * 100);
                      return pct + '%';
                    })()}
                  </td>
                  <td className="px-3 py-2">{o.createdAt ? new Date(o.createdAt).toLocaleDateString() : '—'}</td>
                  <td className="px-2 py-1 space-x-1 text-xs">
                    <button className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors" onClick={()=>openEdit(o)}>Edit</button>
                    <button className="px-2 py-1 bg-gray-600 text-white rounded text-xs hover:bg-gray-700 transition-colors" onClick={()=>duplicate(o)}>Duplicate</button>
                    <button className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition-colors" onClick={()=>confirmDelete(o)}>Delete</button>
                    <button className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 transition-colors" onClick={()=>onNavigate('shifts',{ fromOpportunity:o.id })}>Create Shift</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      </>
      )}

      {/* Create/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-label="Opportunity Modal">
          <div className="bg-white rounded-lg shadow p-6 w-full max-w-xl relative">
            <h2 className="text-lg font-semibold mb-4 text-gray-900">{editing ? 'Edit Opportunity' : 'Create Opportunity'}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-700">Title<span className="text-red-600">*</span></label>
                <input
                  autoFocus
                  value={form.title}
                  onChange={e=>{ const val=e.target.value; setForm(f=>({...f,title:val})); if(fieldErrors.title){ validateForm(); } }}
                  className={`w-full border rounded px-3 py-2 text-sm bg-white text-gray-900 ${fieldErrors.title? 'border-red-500':''}`}
                  aria-describedby={fieldErrors.title? 'err-title': undefined}
                  placeholder="e.g. Front of House Ushers"
                  onBlur={()=>{ if(!fieldErrors.title){ validateForm(); } }}
                />
                {fieldErrors.title && <div id="err-title" className="mt-1 text-xs text-red-600" role="alert">{fieldErrors.title}</div>}
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-700">Category<span className="text-red-600">*</span></label>
                <select
                  title="Opportunity Category"
                  value={form.category}
                  onChange={e=>{ const val=e.target.value; setForm(f=>({...f,category:val})); if(fieldErrors.category){ validateForm(); } }}
                  onBlur={()=>{ if(!fieldErrors.category){ validateForm(); } }}
                  className={`w-full border rounded px-3 py-2 text-sm bg-white text-gray-900 ${fieldErrors.category? 'border-red-500':''}`}
                  aria-describedby={fieldErrors.category? 'err-category': undefined}
                >
                  <option value="">Select Category</option>
                  <option>Front of House</option>
                  <option>Backstage Crew</option>
                  <option>Administrative</option>
                  <option>Event Support</option>
                </select>
                {fieldErrors.category && <div id="err-category" className="mt-1 text-xs text-red-600" role="alert">{fieldErrors.category}</div>}
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-700">Description</label>
                <textarea
                  value={form.description}
                  onChange={e=>setForm(f=>({...f,description:e.target.value}))}
                  rows={4}
                  className="w-full border rounded px-3 py-2 text-sm bg-white text-gray-900"
                  placeholder="Responsibilities, requirements, notes"
                />
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-gray-800">
                  <input type="checkbox" checked={form.isActive} onChange={e=>setForm(f=>({...f,isActive:e.target.checked}))} /> Active
                </label>
                <div className="flex-1">
                  <label className="block text-xs font-medium mb-1 text-gray-700">Default Slots Needed per Shift</label>
                  <input
                    type="number"
                    min={1}
                    value={form.slotsNeededDefault}
                    onChange={e=>{ const num=parseInt(e.target.value)||1; setForm(f=>({...f,slotsNeededDefault:num})); if(fieldErrors.slotsNeededDefault){ validateForm(); } }}
                    onBlur={()=>{ if(!fieldErrors.slotsNeededDefault){ validateForm(); } }}
                    className={`border rounded px-2 py-1 w-32 text-sm bg-white text-gray-900 ${fieldErrors.slotsNeededDefault? 'border-red-500':''}`}
                    title="Default Slots Needed per Shift"
                    aria-describedby={fieldErrors.slotsNeededDefault? 'err-slots': undefined}
                    placeholder="1"
                  />
                  {fieldErrors.slotsNeededDefault && <div id="err-slots" className="mt-1 text-xs text-red-600" role="alert">{fieldErrors.slotsNeededDefault}</div>}
                </div>
              </div>
              {errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-xs space-y-1" aria-live="assertive">
                  {errors.map((er,i)=><div key={i}>• {er}</div>)}
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={()=>{ if(onBack) { handleBack(); } else { setModalOpen(false); setEditing(null); } }} className="px-3 py-1 rounded border text-sm text-gray-900">Cancel</button>
                <button onClick={save} className="px-4 py-1 rounded bg-blue-600 text-white text-sm">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" role="alertdialog" aria-modal="true" aria-label="Confirm Delete Opportunity">
          <div className="bg-white rounded-lg shadow p-6 w-full max-w-sm space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Delete Opportunity</h2>
            <p className="text-sm text-gray-800">Are you sure you want to delete <span className="font-medium">{deleteConfirm.title}</span>? This action cannot be undone.</p>
            {errors.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded p-2 text-xs">
                {errors.map((er,i)=><div key={i}>• {er}</div>)}
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2 text-sm">
              <button onClick={()=>{setDeleteConfirm(null); setErrors([]);}} className="px-3 py-1 rounded border text-gray-900">Cancel</button>
              <button onClick={performDelete} className="px-3 py-1 rounded bg-red-600 text-white">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Expose to window for navigation rendering if needed
window.VolunteerOpportunitiesManager = VolunteerOpportunitiesManager;
