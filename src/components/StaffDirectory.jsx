// StaffDirectory — Staff & Crew management panel
// Contacts with isStaff === true + staffProfile

const STAFF_ROLES = [
  'Director', 'Stage Manager', 'Lighting Designer', 'Sound Designer',
  'Wardrobe Designer', 'Props Master', 'Scenic Designer',
  'Musical Director', 'Choreographer', 'Volunteer Coordinator',
];

// ─── Staff Profile Modal ──────────────────────────────────────────────────────

function StaffProfileModal({ contact, productions, onClose, onSave }) {
  const [activeTab, setActiveTab] = React.useState('profile');
  const [profile, setProfile] = React.useState({
    roles:           contact.staffProfile?.roles || [],
    skills:          contact.staffProfile?.skills || '',
    availability:    contact.staffProfile?.availability || '',
    notes:           contact.staffProfile?.notes || '',
    productions:     contact.staffProfile?.productions || [],
    portalAccess:    contact.staffProfile?.portalAccess || false,
    portalInvitedAt: contact.staffProfile?.portalInvitedAt || null,
    lastActiveAt:    contact.staffProfile?.lastActiveAt || null,
  });
  const [saving, setSaving] = React.useState(false);
  const [showAssignForm, setShowAssignForm] = React.useState(false);
  const [newAssign, setNewAssign] = React.useState({ productionId: '', role: '', status: 'invited' });
  const [removeConfirm, setRemoveConfirm] = React.useState(null);

  const toggleRole = (role) =>
    setProfile(p => ({
      ...p,
      roles: p.roles.includes(role) ? p.roles.filter(r => r !== role) : [...p.roles, role],
    }));

  const handleSave = () => {
    setSaving(true);
    try {
      const updated = window.contactsService.updateContactStaffProfile(contact.id, profile);
      onSave(updated);
      window.showToast?.('Staff profile saved', 'success');
    } catch (e) {
      window.showToast?.('Error saving profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAssign = () => {
    if (!newAssign.productionId || !newAssign.role) {
      window.showToast?.('Select a production and role', 'warning');
      return;
    }
    if (profile.productions.some(p => p.productionId === newAssign.productionId)) {
      window.showToast?.('Already assigned to this production', 'warning');
      return;
    }
    const assignment = { ...newAssign, invitedAt: new Date().toISOString(), acceptedAt: null };
    setProfile(p => ({ ...p, productions: [...p.productions, assignment] }));
    setShowAssignForm(false);
    setNewAssign({ productionId: '', role: '', status: 'invited' });
  };

  const handleRemove = (productionId) => {
    setProfile(p => ({ ...p, productions: p.productions.filter(a => a.productionId !== productionId) }));
    setRemoveConfirm(null);
  };

  const getProdTitle = (id) => {
    const p = productions.find(p => p.id === id);
    return p?.title || p?.name || id;
  };

  const statusBadge = (status) => ({
    active:   'bg-green-100 text-green-700',
    'on-hold':'bg-gray-100 text-gray-600',
    invited:  'bg-amber-100 text-amber-700',
  }[status] || 'bg-amber-100 text-amber-700');

  const name = `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'Unnamed';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{name}</h2>
            {contact.email && <p className="text-sm text-gray-500">{contact.email}</p>}
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">✕</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 flex-shrink-0">
          {[
            { id: 'profile',     label: 'Profile' },
            { id: 'productions', label: 'Productions' },
            { id: 'portal',      label: 'Portal Access' },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab.id
                  ? 'border-violet-600 text-violet-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
              {tab.id === 'productions' && profile.productions.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 bg-violet-100 text-violet-700 rounded-full text-xs">
                  {profile.productions.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* ── Profile tab ── */}
          {activeTab === 'profile' && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Roles</label>
                <div className="grid grid-cols-2 gap-2">
                  {STAFF_ROLES.map(role => (
                    <label key={role} className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={profile.roles.includes(role)}
                        onChange={() => toggleRole(role)}
                        className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                      />
                      <span className="text-sm text-gray-700">{role}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Skills / Bio</label>
                <textarea
                  rows={3}
                  value={profile.skills}
                  onChange={e => setProfile(p => ({ ...p, skills: e.target.value }))}
                  placeholder="Describe experience, skills, and background..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-400 focus:border-violet-400 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Availability</label>
                <textarea
                  rows={2}
                  value={profile.availability}
                  onChange={e => setProfile(p => ({ ...p, availability: e.target.value }))}
                  placeholder="e.g. Evenings and weekends, available from March..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-400 focus:border-violet-400 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={profile.notes}
                  onChange={e => setProfile(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Internal notes..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-400 focus:border-violet-400 resize-none"
                />
              </div>
            </div>
          )}

          {/* ── Productions tab ── */}
          {activeTab === 'productions' && (
            <div className="space-y-3">
              {profile.productions.length === 0 && !showAssignForm && (
                <div className="text-center py-8 text-gray-400">
                  <div className="text-3xl mb-2">🎬</div>
                  <p className="text-sm">No production assignments yet</p>
                </div>
              )}

              {profile.productions.map((a, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{getProdTitle(a.productionId)}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-500">{a.role}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusBadge(a.status)}`}>
                        {a.status}
                      </span>
                    </div>
                    {a.invitedAt && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        Assigned {new Date(a.invitedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  {removeConfirm === idx ? (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-gray-600">Remove?</span>
                      <button type="button" onClick={() => handleRemove(a.productionId)} className="text-red-600 font-medium hover:text-red-800">Yes</button>
                      <button type="button" onClick={() => setRemoveConfirm(null)} className="text-gray-500">No</button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setRemoveConfirm(idx)} className="text-xs text-red-400 hover:text-red-600">Remove</button>
                  )}
                </div>
              ))}

              {showAssignForm && (
                <div className="p-4 border border-violet-200 rounded-lg bg-violet-50 space-y-3">
                  <h4 className="text-sm font-medium text-violet-900">Assign to Production</h4>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Production</label>
                    <select
                      value={newAssign.productionId}
                      onChange={e => setNewAssign(a => ({ ...a, productionId: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="">Select production...</option>
                      {productions.map(p => (
                        <option key={p.id} value={p.id}>{p.title || p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Role on this production</label>
                    <select
                      value={newAssign.role}
                      onChange={e => setNewAssign(a => ({ ...a, role: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="">Select role...</option>
                      {STAFF_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Status</label>
                    <select
                      value={newAssign.status}
                      onChange={e => setNewAssign(a => ({ ...a, status: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="invited">Invited</option>
                      <option value="active">Active</option>
                      <option value="on-hold">On Hold</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={handleAssign} className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium">
                      Assign
                    </button>
                    <button type="button" onClick={() => setShowAssignForm(false)} className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50">
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {!showAssignForm && (
                <button
                  type="button"
                  onClick={() => setShowAssignForm(true)}
                  className="w-full py-2.5 border-2 border-dashed border-gray-300 text-gray-500 text-sm rounded-lg hover:border-violet-400 hover:text-violet-600 transition-colors"
                >
                  + Assign to Production
                </button>
              )}
            </div>
          )}

          {/* ── Portal Access tab ── */}
          {activeTab === 'portal' && (
            <div className="text-center py-8 text-gray-500">
              <div className="text-3xl mb-2">🔐</div>
              <p>Portal access and invitation management coming soon</p>
              <p className="text-sm mt-1 text-gray-400">Staff will receive a magic link to set up their account</p>
            </div>
          )}
        </div>

        {/* Footer */}
        {activeTab !== 'portal' && (
          <div className="px-6 py-4 border-t border-gray-200 flex-shrink-0 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium disabled:opacity-60 transition-colors"
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Add Staff Member Modal ───────────────────────────────────────────────────

function AddStaffModal({ allContacts, onClose, onAdded }) {
  const [mode, setMode] = React.useState(null); // null | 'find' | 'create'
  const [search, setSearch] = React.useState('');
  const [form, setForm] = React.useState({ firstName: '', lastName: '', email: '', phone: '' });
  const [saving, setSaving] = React.useState(false);

  // Only show contacts that aren't already staff
  const candidates = allContacts.filter(c => !c.isStaff);
  const searched = React.useMemo(() => {
    const q = search.toLowerCase();
    const pool = q ? candidates.filter(c =>
      `${c.firstName || ''} ${c.lastName || ''}`.toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q)
    ) : candidates.slice(0, 10);
    return pool;
  }, [candidates, search]);

  const handlePickExisting = (contact) => {
    try {
      // updateContactStaffProfile sets isStaff=true and initializes staffProfile
      const updated = window.contactsService.updateContactStaffProfile(contact.id, {});
      window.showToast?.('Added as staff member', 'success');
      onAdded(updated);
    } catch (e) {
      window.showToast?.('Error adding staff member', 'error');
    }
  };

  const handleCreateNew = () => {
    if (!form.firstName || !form.email) {
      window.showToast?.('First name and email are required', 'warning');
      return;
    }
    setSaving(true);
    try {
      const contacts = window.contactsService.loadContacts();
      if (contacts.some(c => c.email?.toLowerCase() === form.email.toLowerCase())) {
        window.showToast?.('A contact with this email already exists', 'error');
        setSaving(false);
        return;
      }
      const newContact = {
        id: `contact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone,
        isDonor: false,
        isStaff: true,
        status: 'invited',
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      contacts.push(newContact);
      window.contactsService.saveContactsToLS(contacts);
      // Reload so migrations add donorProfile + staffProfile
      const saved = window.contactsService.loadContacts().find(c => c.id === newContact.id) || newContact;
      window.showToast?.('Staff member created', 'success');
      onAdded(saved);
    } catch (e) {
      window.showToast?.('Error creating contact', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Add Staff Member</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">✕</button>
        </div>

        {/* Mode picker */}
        {!mode && (
          <div className="p-6 space-y-3">
            <button
              type="button"
              onClick={() => setMode('find')}
              className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-violet-400 hover:bg-violet-50 text-left transition-colors"
            >
              <div className="font-medium text-gray-900 mb-0.5">🔍 Find existing contact</div>
              <div className="text-sm text-gray-500">Mark an existing contact as a staff member</div>
            </button>
            <button
              type="button"
              onClick={() => setMode('create')}
              className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-violet-400 hover:bg-violet-50 text-left transition-colors"
            >
              <div className="font-medium text-gray-900 mb-0.5">➕ Create new contact</div>
              <div className="text-sm text-gray-500">Add a brand new person to the system</div>
            </button>
          </div>
        )}

        {/* Find existing */}
        {mode === 'find' && (
          <div className="p-6 space-y-4">
            <input
              autoFocus
              type="text"
              placeholder="Search by name or email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-400"
            />
            <div className="space-y-1.5 max-h-56 overflow-y-auto">
              {searched.length === 0 && (
                <p className="text-center text-sm text-gray-400 py-4">
                  {candidates.length === 0 ? 'All contacts are already staff members' : 'No contacts found'}
                </p>
              )}
              {searched.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handlePickExisting(c)}
                  className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-violet-50 border border-gray-100 hover:border-violet-200 transition-colors"
                >
                  <div className="text-sm font-medium text-gray-900">
                    {`${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Unnamed'}
                  </div>
                  {c.email && <div className="text-xs text-gray-500">{c.email}</div>}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setMode(null)} className="text-sm text-gray-500 hover:text-gray-700">
              ← Back
            </button>
          </div>
        )}

        {/* Create new */}
        {mode === 'create' && (
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">First Name *</label>
                <input
                  type="text"
                  value={form.firstName}
                  onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Last Name</label>
                <input
                  type="text"
                  value={form.lastName}
                  onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-400"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-400"
              />
            </div>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setMode(null)} className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50">
                ← Back
              </button>
              <button
                type="button"
                onClick={handleCreateNew}
                disabled={saving}
                className="flex-1 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium disabled:opacity-60 transition-colors"
              >
                {saving ? 'Creating…' : 'Create Staff Member'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Staff Directory ──────────────────────────────────────────────────────────

function StaffDirectory() {
  const loadStaff = () => window.contactsService?.getStaffContacts?.() || [];
  const loadAll   = () => window.contactsService?.loadContacts?.() || [];
  const loadProds = () => window.productionsService?.getAll?.() || [];

  const [staffList,   setStaffList]   = React.useState(loadStaff);
  const [allContacts, setAllContacts] = React.useState(loadAll);
  const [productions, setProductions] = React.useState(loadProds);

  const [search,       setSearch]       = React.useState('');
  const [roleFilter,   setRoleFilter]   = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');

  const [editingContact, setEditingContact] = React.useState(null);
  const [showAddModal,   setShowAddModal]   = React.useState(false);

  const refresh = () => {
    setStaffList(loadStaff());
    setAllContacts(loadAll());
    setProductions(loadProds());
  };

  const filteredStaff = React.useMemo(() => {
    const q = search.toLowerCase();
    return staffList.filter(c => {
      const name  = `${c.firstName || ''} ${c.lastName || ''}`.toLowerCase();
      const email = (c.email || '').toLowerCase();
      const roles = (c.staffProfile?.roles || []).map(r => r.toLowerCase());

      if (q && !name.includes(q) && !email.includes(q) && !roles.some(r => r.includes(q))) return false;
      if (roleFilter && !roles.includes(roleFilter.toLowerCase())) return false;
      if (statusFilter) {
        const s = c.status || 'unassigned';
        if (statusFilter === 'active'     && s !== 'active')     return false;
        if (statusFilter === 'invited'    && s !== 'invited')    return false;
        if (statusFilter === 'unassigned' && s !== 'unassigned' && s !== '') return false;
      }
      return true;
    });
  }, [staffList, search, roleFilter, statusFilter]);

  const statusDot = (status) => ({
    active:     'bg-green-500',
    invited:    'bg-amber-500',
  }[status] || 'bg-gray-400');

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-gray-900">Staff & Crew</h2>
          <span className="px-2.5 py-0.5 rounded-full bg-violet-100 text-violet-700 text-sm font-medium">
            {staffList.length}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          + Add Staff Member
        </button>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          placeholder="Search by name, email, or role…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-400 focus:border-violet-400"
        />
        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-400"
        >
          <option value="">All Roles</option>
          {STAFF_ROLES.map(r => <option key={r} value={r.toLowerCase()}>{r}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-400"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="invited">Invited</option>
          <option value="unassigned">Unassigned</option>
        </select>
      </div>

      {/* Empty state */}
      {filteredStaff.length === 0 && (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">🎭</div>
          <p className="font-medium mb-1 text-gray-700">No staff members yet</p>
          <p className="text-sm text-gray-400">Add staff from any contact record, or create a new contact</p>
        </div>
      )}

      {/* Cards grid */}
      {filteredStaff.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStaff.map(contact => {
            const name      = `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'Unnamed';
            const roles     = contact.staffProfile?.roles || [];
            const prodCount = (contact.staffProfile?.productions || []).length;
            const status    = contact.status || 'unassigned';

            return (
              <div key={contact.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:border-violet-300 hover:shadow-sm transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-2 min-w-0">
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1 ${statusDot(status)}`} />
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900 text-sm truncate">{name}</h3>
                      {contact.email && (
                        <p className="text-xs text-gray-500 truncate">{contact.email}</p>
                      )}
                      {contact.phone && (
                        <p className="text-xs text-gray-400">{contact.phone}</p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingContact(contact)}
                    className="flex-shrink-0 text-xs text-violet-600 hover:text-violet-800 font-medium px-2 py-1 rounded hover:bg-violet-50 transition-colors ml-2"
                  >
                    Edit
                  </button>
                </div>

                {/* Role badges */}
                {roles.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {roles.slice(0, 3).map(role => (
                      <span key={role} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{role}</span>
                    ))}
                    {roles.length > 3 && (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-xs">+{roles.length - 3}</span>
                    )}
                  </div>
                )}

                {/* Productions badge */}
                <div className="mt-2">
                  {prodCount > 0 ? (
                    <span className="px-2 py-0.5 bg-violet-100 text-violet-700 rounded text-xs font-medium">
                      {prodCount} production{prodCount !== 1 ? 's' : ''}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">No productions assigned</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Staff Profile Modal */}
      {editingContact && (
        <StaffProfileModal
          contact={editingContact}
          productions={productions}
          onClose={() => setEditingContact(null)}
          onSave={(updated) => {
            setEditingContact(updated);
            refresh();
          }}
        />
      )}

      {/* Add Staff Member Modal */}
      {showAddModal && (
        <AddStaffModal
          allContacts={allContacts}
          onClose={() => setShowAddModal(false)}
          onAdded={(newContact) => {
            setShowAddModal(false);
            refresh();
            setEditingContact(newContact);
          }}
        />
      )}
    </div>
  );
}

window.StaffDirectory = StaffDirectory;
console.log('✅ StaffDirectory loaded');
