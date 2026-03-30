// ContactsHub — unified people directory: All Contacts / Donors / Staff / Actors / Volunteers / Board

// ─── All Contacts List ────────────────────────────────────────────────────────

function AllContactsList({ contacts, donations }) {
  const BOARD_TAGS = ['board', 'board member', 'board of directors', 'trustee', 'governor'];

  const [search, setSearch] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState('all');
  const [viewMode, setViewMode] = React.useState(() => {
    try { return localStorage.getItem('scenestave_all_contacts_view') || 'table'; } catch { return 'table'; }
  });
  const [showAddForm, setShowAddForm] = React.useState(false);
  const [form, setForm] = React.useState({ firstName: '', lastName: '', email: '', phone: '', type: '' });
  const [editingTypeId, setEditingTypeId] = React.useState(null);
  const [saving, setSaving] = React.useState(false);
  const [localContacts, setLocalContacts] = React.useState(contacts);
  const [refreshKey, setRefreshKey] = React.useState(0);

  React.useEffect(() => { setLocalContacts(contacts); }, [contacts]);

  React.useEffect(() => {
    const handleActorsUpdate = () => setRefreshKey(k => k + 1);
    window.addEventListener('actorsUpdated', handleActorsUpdate);
    window.addEventListener('storage', handleActorsUpdate);
    return () => {
      window.removeEventListener('actorsUpdated', handleActorsUpdate);
      window.removeEventListener('storage', handleActorsUpdate);
    };
  }, []);

  const getMergedContacts = () => {
    const mainContacts = window.contactsService?.loadContacts?.() ||
      JSON.parse(localStorage.getItem('showsuite_contacts') || '[]');
    const actorRecords = JSON.parse(localStorage.getItem('showsuite_actors') || '[]');
    const normalizedActors = actorRecords.map(a => ({
      id: a.id,
      firstName: a.firstName || a.name?.split(' ')[0] || '',
      lastName: a.lastName || a.name?.split(' ').slice(1).join(' ') || '',
      name: a.name || `${a.firstName || ''} ${a.lastName || ''}`.trim(),
      email: a.email || '',
      phone: a.phone || '',
      type: 'Actor',
      tags: a.tags || [],
      isDonor: false,
      isStaff: false,
      donorProfile: null,
      staffProfile: null,
      actorData: a,
      _source: 'actors',
    }));
    const mainEmails = new Set(mainContacts.map(c => (c.email || '').toLowerCase()).filter(Boolean));
    const uniqueActors = normalizedActors.filter(a =>
      !a.email || !mainEmails.has(a.email.toLowerCase())
    );
    return [...mainContacts, ...uniqueActors];
  };

  const allContacts = React.useMemo(() => getMergedContacts(), [localContacts, refreshKey]);

  const setView = (mode) => {
    setViewMode(mode);
    try { localStorage.setItem('scenestave_all_contacts_view', mode); } catch {}
  };

  const getContactTypes = (c) => {
    const types = [];
    if (c.isDonor) types.push({ label: 'Donor', color: 'amber' });
    if (c.isStaff) types.push({ label: 'Staff', color: 'violet' });
    if (c.type === 'Actor' || c._source === 'actors') types.push({ label: 'Actor', color: 'pink' });
    if (c.volunteerInfo || c.isVolunteer || (Array.isArray(c.tags) && c.tags.some(t => String(t).toLowerCase() === 'volunteer'))) types.push({ label: 'Volunteer', color: 'green' });
    if (Array.isArray(c.tags) && c.tags.some(t => BOARD_TAGS.includes(String(t).toLowerCase()))) types.push({ label: 'Board', color: 'blue' });
    if (types.length === 0) types.push({ label: 'Contact', color: 'gray' });
    return types;
  };

  const TYPE_BADGE_CLASSES = {
    amber:  'bg-amber-100 text-amber-700',
    violet: 'bg-violet-100 text-violet-700',
    pink:   'bg-pink-100 text-pink-700',
    green:  'bg-green-100 text-green-700',
    blue:   'bg-blue-100 text-blue-700',
    gray:   'bg-gray-100 text-gray-500',
  };

  const TypeBadges = ({ contact }) => (
    <div className="flex gap-1 flex-wrap">
      {getContactTypes(contact).map(({ label, color }) => (
        <span key={label} className={`px-2 py-0.5 rounded text-xs font-medium ${TYPE_BADGE_CLASSES[color]}`}>{label}</span>
      ))}
    </div>
  );

  const ContactAvatar = ({ contact, size }) => {
    const name = `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || '?';
    const cls = size === 'lg' ? 'w-10 h-10 text-sm' : 'w-7 h-7 text-xs';
    return contact.donorProfile?.photoUrl
      ? <img src={contact.donorProfile.photoUrl} alt={name} className={`${cls} rounded-full object-cover flex-shrink-0`} />
      : <div className={`${cls} rounded-full bg-violet-600 flex items-center justify-center text-white font-bold flex-shrink-0`}>{name[0].toUpperCase()}</div>;
  };

  const filtered = React.useMemo(() => {
    const q = search.toLowerCase();
    return allContacts.filter(c => {
      const name  = `${c.firstName || ''} ${c.lastName || ''} ${c.name || ''}`.toLowerCase();
      const email = (c.email || '').toLowerCase();
      const phone = (c.phone || '').toLowerCase();
      const matchesSearch = !search || name.includes(q) || email.includes(q) || phone.includes(q);
      const matchesType = typeFilter === 'all'
        || (typeFilter === 'donor'     && c.isDonor)
        || (typeFilter === 'staff'     && c.isStaff)
        || (typeFilter === 'actor'     && (c.type === 'Actor' || c._source === 'actors'))
        || (typeFilter === 'volunteer' && (c.volunteerInfo || c.isVolunteer || (Array.isArray(c.tags) && c.tags.some(t => String(t).toLowerCase() === 'volunteer'))))
        || (typeFilter === 'board'     && Array.isArray(c.tags) && c.tags.some(t => BOARD_TAGS.includes(String(t).toLowerCase())));
      return matchesSearch && matchesType;
    });
  }, [allContacts, search, typeFilter]);

  const donationCountFor = (id) => (donations || []).filter(d => d.contactId === id).length;

  const TYPE_OPTIONS = [
    { value: 'donor',     label: 'Donor' },
    { value: 'staff',     label: 'Staff & Crew' },
    { value: 'board',     label: 'Board Member' },
    { value: 'volunteer', label: 'Volunteer' },
    { value: 'general',   label: 'General Contact' },
  ];

  const applyTypeFlags = (contact, type) => {
    contact.isDonor    = type === 'donor';
    contact.isStaff    = type === 'staff';
    contact.isVolunteer = type === 'volunteer';
    if (type === 'board') {
      if (!Array.isArray(contact.tags)) contact.tags = [];
      if (!contact.tags.includes('board')) contact.tags.push('board');
    } else {
      // Remove board tag if switching away from board
      if (Array.isArray(contact.tags)) {
        contact.tags = contact.tags.filter(t => !['board', 'board member', 'board of directors'].includes(String(t).toLowerCase()));
      }
    }
    return contact;
  };

  const handleCreate = () => {
    if (!form.firstName || !form.email) {
      window.showToast?.('First name and email are required', 'warning');
      return;
    }
    if (!form.type) {
      window.showToast?.('Please select a contact type', 'warning');
      return;
    }
    setSaving(true);
    try {
      const all = window.contactsService.loadContacts();
      if (all.some(c => c.email?.toLowerCase() === form.email.toLowerCase())) {
        window.showToast?.('A contact with this email already exists', 'error');
        setSaving(false);
        return;
      }
      const newContact = applyTypeFlags({
        id: `contact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone,
        isDonor: false,
        isStaff: false,
        isVolunteer: false,
        status: 'active',
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }, form.type);
      all.push(newContact);
      window.contactsService.saveContactsToLS(all);
      setLocalContacts(window.contactsService.loadContacts());
      setRefreshKey(k => k + 1);
      setForm({ firstName: '', lastName: '', email: '', phone: '', type: '' });
      setShowAddForm(false);
      window.showToast?.('Contact created', 'success');
    } catch (e) {
      window.showToast?.('Error creating contact', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleChangeType = (contactId, newType) => {
    try {
      const all = window.contactsService.loadContacts();
      const idx = all.findIndex(c => c.id === contactId);
      if (idx === -1) return;
      applyTypeFlags(all[idx], newType);
      all[idx].updatedAt = new Date().toISOString();
      window.contactsService.saveContactsToLS(all);
      setLocalContacts(window.contactsService.loadContacts());
      setRefreshKey(k => k + 1);
      setEditingTypeId(null);
      window.showToast?.('Contact type updated', 'success');
    } catch (e) {
      window.showToast?.('Error updating contact type', 'error');
    }
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <input
          type="text"
          placeholder="Search by name, email or phone…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="hub-input flex-1 min-w-[200px]"
        />
        <select
          title="Filter by contact type"
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="hub-input"
        >
          <option value="all">All Types</option>
          <option value="donor">Donors</option>
          <option value="staff">Staff & Crew</option>
          <option value="actor">Actors</option>
          <option value="volunteer">Volunteers</option>
          <option value="board">Board</option>
        </select>
        <div className="view-toggle">
          <button type="button" onClick={() => setView('table')} className={`view-toggle-btn${viewMode === 'table' ? ' active' : ''}`}>≡ Table</button>
          <button type="button" onClick={() => setView('cards')} className={`view-toggle-btn${viewMode === 'cards' ? ' active' : ''}`}>⊞ Cards</button>
        </div>
        <button
          type="button"
          onClick={() => setShowAddForm(v => !v)}
          className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          {showAddForm ? 'Cancel' : '+ New Contact'}
        </button>
      </div>

      {showAddForm && (
        <div className="mb-5 p-4 bg-violet-50 border border-violet-200 rounded-xl">
          <h3 className="text-sm font-semibold text-violet-900 mb-3">New Contact</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">First Name *</label>
              <input title="First name" type="text" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Last Name</label>
              <input title="Last name" type="text" value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email *</label>
              <input title="Email address" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
              <input title="Phone number" type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Type *</label>
              <select
                title="Contact type"
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-violet-400 ${!form.type ? 'border-red-400' : 'border-gray-300'}`}
              >
                <option value="" disabled>— Select type —</option>
                {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <button type="button" onClick={handleCreate} disabled={saving} className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium disabled:opacity-60 transition-colors">
              {saving ? 'Saving…' : 'Create Contact'}
            </button>
          </div>
        </div>
      )}

      {/* Count bar */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-muted-color">
          {filtered.length} contact{filtered.length !== 1 ? 's' : ''}
          {filtered.length !== allContacts.length && ` of ${allContacts.length}`}
        </span>
        <span className="text-xs text-muted-color">
          {allContacts.filter(c => c.isDonor).length} donors · {allContacts.filter(c => c.isStaff).length} staff
        </span>
      </div>

      {/* Empty state */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">👤</div>
          <p className="font-medium mb-1 text-primary-color">No contacts found</p>
          <p className="text-sm text-muted-color">Try a different search or filter</p>
        </div>
      ) : viewMode === 'table' ? (
        /* ── Table view ── */
        <div className="hub-table-wrap">
          <table className="hub-table">
            <thead>
              <tr>
                <th>Name</th>
                <th className="hidden md:table-cell">Email</th>
                <th className="hidden md:table-cell">Phone</th>
                <th>Type</th>
                <th className="hidden lg:table-cell">Activity</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => {
                const name = `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Unnamed';
                const dCount = donationCountFor(c.id);
                const prodCount = (c.staffProfile?.productions || []).length;
                return (
                  <tr key={c.id}>
                    <td className="font-medium">
                      <div className="flex items-center gap-2">
                        <ContactAvatar contact={c} size="sm" />
                        <span className="text-primary-color">{name}</span>
                      </div>
                    </td>
                    <td className="secondary hidden md:table-cell">{c.email || '—'}</td>
                    <td className="secondary hidden md:table-cell">{c.phone || '—'}</td>
                    <td>
                      <div className="flex items-center gap-1">
                        <TypeBadges contact={c} />
                        {c._source !== 'actors' && (
                          editingTypeId === c.id ? (
                            <select
                              title="Change contact type"
                              autoFocus
                              className="ml-1 px-2 py-0.5 border border-violet-400 rounded text-xs"
                              defaultValue=""
                              onChange={e => { if (e.target.value) handleChangeType(c.id, e.target.value); }}
                              onBlur={() => setEditingTypeId(null)}
                            >
                              <option value="" disabled>— Change type —</option>
                              {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                          ) : (
                            <button
                              type="button"
                              title="Change type"
                              onClick={() => setEditingTypeId(c.id)}
                              className="text-gray-300 hover:text-violet-500 text-xs leading-none ml-1"
                            >
                              ✎
                            </button>
                          )
                        )}
                      </div>
                    </td>
                    <td className="muted text-xs hidden lg:table-cell">
                      {dCount > 0 && <span className="mr-2">{dCount} donation{dCount !== 1 ? 's' : ''}</span>}
                      {prodCount > 0 && <span>{prodCount} production{prodCount !== 1 ? 's' : ''}</span>}
                      {dCount === 0 && prodCount === 0 && '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* ── Card view ── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(c => {
            const name = `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Unnamed';
            const dCount = donationCountFor(c.id);
            return (
              <div key={c.id} className="hub-card">
                <div className="flex items-center gap-3 mb-2">
                  <ContactAvatar contact={c} size="lg" />
                  <div className="min-w-0">
                    <div className="font-semibold truncate text-primary-color">{name}</div>
                    {c.email && <div className="text-xs truncate text-secondary-color">{c.email}</div>}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-wrap">
                  <TypeBadges contact={c} />
                  {c._source !== 'actors' && (
                    editingTypeId === c.id ? (
                      <select
                        title="Change contact type"
                        autoFocus
                        className="px-2 py-0.5 border border-violet-400 rounded text-xs"
                        defaultValue=""
                        onChange={e => { if (e.target.value) handleChangeType(c.id, e.target.value); }}
                        onBlur={() => setEditingTypeId(null)}
                      >
                        <option value="" disabled>— Change type —</option>
                        {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    ) : (
                      <button
                        type="button"
                        title="Change type"
                        onClick={() => setEditingTypeId(c.id)}
                        className="text-gray-300 hover:text-violet-500 text-xs leading-none"
                      >
                        ✎
                      </button>
                    )
                  )}
                </div>
                {c.phone && <div className="text-xs mt-2 text-muted-color">{c.phone}</div>}
                {dCount > 0 && <div className="text-xs mt-1 text-muted-color">{dCount} donation{dCount !== 1 ? 's' : ''}</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Board Members View ───────────────────────────────────────────────────────

function BoardMembersView({ contacts }) {
  const BOARD_TAGS = ['board', 'board member', 'board of directors', 'trustee', 'governor'];
  const boardMembers = (contacts || []).filter(c =>
    Array.isArray(c.tags) &&
    c.tags.some(t => BOARD_TAGS.includes(String(t).toLowerCase()))
  );

  const [viewMode, setViewMode] = React.useState(() => {
    try { return localStorage.getItem('scenestave_board_view') || 'cards'; } catch { return 'cards'; }
  });
  const setView = (mode) => {
    setViewMode(mode);
    try { localStorage.setItem('scenestave_board_view', mode); } catch {}
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Board Members</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {boardMembers.length} board member{boardMembers.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="view-toggle">
            <button type="button" onClick={() => setView('cards')} className={`view-toggle-btn${viewMode === 'cards' ? ' active' : ''}`}>⊞ Cards</button>
            <button type="button" onClick={() => setView('table')} className={`view-toggle-btn${viewMode === 'table' ? ' active' : ''}`}>≡ Table</button>
          </div>
          <button
            type="button"
            onClick={() => window.showToast?.('Board member invitations coming in Sprint 4', 'info')}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            + Add Board Member
          </button>
        </div>
      </div>

      {boardMembers.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">🏛</div>
          <p className="text-lg font-medium text-gray-800 mb-1">No board members yet</p>
          <p className="text-sm text-gray-400">Tag a contact with "Board Member" to add them here</p>
        </div>
      ) : viewMode === 'table' ? (
        <div className="hub-table-wrap">
          <table className="hub-table">
            <thead>
              <tr>
                <th>Name</th>
                <th className="hidden md:table-cell">Email</th>
                <th>Role / Title</th>
                <th className="hidden md:table-cell">Phone</th>
                <th><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {boardMembers.map(member => {
                const name = member.name || `${member.firstName || ''} ${member.lastName || ''}`.trim() || 'Unnamed';
                const initial = name[0]?.toUpperCase() || '?';
                const boardTag = (member.tags || []).find(t => BOARD_TAGS.includes(String(t).toLowerCase()));
                return (
                  <tr key={member.id}>
                    <td className="font-medium">
                      <div className="flex items-center gap-2">
                        {member.donorProfile?.photoUrl
                          ? <img src={member.donorProfile.photoUrl} alt={name} className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                          : <div className="w-7 h-7 rounded-full bg-violet-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">{initial}</div>
                        }
                        <span className="text-primary-color">{name}</span>
                      </div>
                    </td>
                    <td className="secondary hidden md:table-cell">{member.email || '—'}</td>
                    <td>
                      {boardTag
                        ? <span className="px-2 py-0.5 bg-violet-100 text-violet-700 rounded text-xs font-medium">{boardTag}</span>
                        : <span className="muted">—</span>
                      }
                    </td>
                    <td className="secondary hidden md:table-cell">{member.phone || '—'}</td>
                    <td className="right">
                      <button
                        type="button"
                        onClick={() => window.showToast?.('Contact detail view coming soon', 'info')}
                        className="text-xs text-violet-600 hover:text-violet-800 font-medium"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {boardMembers.map(member => {
            const name = member.name || `${member.firstName || ''} ${member.lastName || ''}`.trim() || 'Unnamed';
            const initial = name[0]?.toUpperCase() || '?';
            const boardTag = (member.tags || []).find(t => BOARD_TAGS.includes(String(t).toLowerCase()));
            return (
              <div key={member.id} className="hub-card hover:border-violet-300 hover:shadow-sm transition-all">
                <div className="flex items-start gap-3">
                  {member.donorProfile?.photoUrl ? (
                    <img src={member.donorProfile.photoUrl} alt={name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-violet-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">{initial}</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-primary-color truncate">{name}</div>
                    {member.email && <div className="text-sm text-secondary-color truncate">{member.email}</div>}
                    {member.phone && <div className="text-sm text-muted-color">{member.phone}</div>}
                    {boardTag && (
                      <span className="inline-block mt-2 text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">{boardTag}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Volunteer Directory ──────────────────────────────────────────────────────

function VolunteerDirectory({ contacts }) {
  const [search, setSearch] = React.useState('');
  const [viewMode, setViewMode] = React.useState(() => {
    try { return localStorage.getItem('scenestave_volunteer_view') || 'table'; } catch { return 'table'; }
  });
  const [statusFilter, setStatusFilter] = React.useState('all');

  // Source 1: contacts tagged as volunteer
  const volunteerContacts = React.useMemo(() => (contacts || []).filter(c =>
    c.volunteerInfo || c.isVolunteer ||
    (Array.isArray(c.tags) && c.tags.some(t => String(t).toLowerCase().includes('volunteer')))
  ).map(c => ({
    id: c.id,
    firstName: c.firstName || '',
    lastName: c.lastName || '',
    email: c.email || '',
    phone: c.phone || '',
    status: 'active',
    source: 'contact',
    tags: c.tags || [],
    hours: c.volunteerInfo?.totalHours || 0,
    skills: c.volunteerInfo?.skills || [],
  })), [contacts]);

  // Source 2: pending applications not yet in contacts
  const applications = React.useMemo(() => {
    try {
      const apps = JSON.parse(localStorage.getItem('volunteerApplications') || '[]');
      const contactEmails = new Set((contacts || []).map(c => (c.email || '').toLowerCase()));
      return apps
        .filter(a => !a.email || !contactEmails.has(a.email.toLowerCase()))
        .map(a => ({
          id: a.id,
          firstName: a.firstName || '',
          lastName: a.lastName || '',
          email: a.email || '',
          phone: a.phone || '',
          status: a.status || 'pending',
          source: 'application',
          opportunityTitle: a.opportunityTitle || '',
          hours: 0,
          skills: [],
        }));
    } catch { return []; }
  }, [contacts]);

  const allVolunteers = React.useMemo(() => [...volunteerContacts, ...applications], [volunteerContacts, applications]);

  const filtered = React.useMemo(() => allVolunteers.filter(v => {
    const name = `${v.firstName} ${v.lastName}`.toLowerCase();
    const matchesSearch = !search || name.includes(search.toLowerCase()) || v.email.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || v.status === statusFilter;
    return matchesSearch && matchesStatus;
  }), [allVolunteers, search, statusFilter]);

  const statusBadgeClass = (status) => ({
    active:   'bg-green-100 text-green-700',
    approved: 'bg-blue-100 text-blue-700',
    pending:  'bg-amber-100 text-amber-700',
    rejected: 'bg-red-100 text-red-700',
    inactive: 'bg-gray-100 text-gray-500',
  }[String(status || 'pending').toLowerCase()] || 'bg-gray-100 text-gray-500');

  const setView = (mode) => {
    setViewMode(mode);
    try { localStorage.setItem('scenestave_volunteer_view', mode); } catch {}
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-2xl font-bold text-primary-color">Volunteers</h2>
          <p className="text-sm text-muted-color mt-0.5">
            {volunteerContacts.length} active · {applications.length} pending application{applications.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={() => { window.location.hash = '#/volunteers'; }}
          className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          ⚙️ Manage Volunteers →
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <input
          type="text"
          placeholder="Search volunteers…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="hub-input flex-1 min-w-[200px]"
        />
        <select
          title="Filter by status"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="hub-input"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
        </select>
        <div className="view-toggle">
          <button type="button" onClick={() => setView('table')} className={`view-toggle-btn${viewMode === 'table' ? ' active' : ''}`}>≡ Table</button>
          <button type="button" onClick={() => setView('cards')} className={`view-toggle-btn${viewMode === 'cards' ? ' active' : ''}`}>⊞ Cards</button>
        </div>
      </div>

      {/* Count */}
      <p className="text-sm text-muted-color mb-3">
        {filtered.length} of {allVolunteers.length} volunteer{allVolunteers.length !== 1 ? 's' : ''}
      </p>

      {/* Table view */}
      {viewMode === 'table' ? (
        <div className="hub-table-wrap">
          <table className="hub-table">
            <thead>
              <tr>
                <th>Name</th>
                <th className="hidden md:table-cell">Email</th>
                <th className="hidden md:table-cell">Phone</th>
                <th>Status</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-muted-color">No volunteers found</td>
                </tr>
              ) : filtered.map(v => (
                <tr key={v.id}>
                  <td className="font-medium">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-green-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                        {(v.firstName || '?')[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="text-primary-color">{`${v.firstName} ${v.lastName}`.trim() || 'Unnamed'}</div>
                        {v.opportunityTitle && <div className="text-xs text-muted-color">{v.opportunityTitle}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="secondary hidden md:table-cell">{v.email || '—'}</td>
                  <td className="secondary hidden md:table-cell">{v.phone || '—'}</td>
                  <td>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusBadgeClass(v.status)}`}>
                      {v.status}
                    </span>
                  </td>
                  <td className="secondary">{v.source === 'application' ? 'Application' : 'Contact'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* Card view */
        filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">🤝</div>
            <p className="font-medium mb-1 text-primary-color">No volunteers found</p>
            <p className="text-sm text-muted-color">Try a different search or filter</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map(v => (
              <div key={v.id} className="hub-card">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {(v.firstName || '?')[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold truncate text-primary-color">{`${v.firstName} ${v.lastName}`.trim() || 'Unnamed'}</div>
                    {v.email && <div className="text-xs truncate text-secondary-color">{v.email}</div>}
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusBadgeClass(v.status)}`}>{v.status}</span>
                  <span className="text-xs text-muted-color">{v.source === 'application' ? 'Application' : 'Contact'}</span>
                </div>
                {v.opportunityTitle && <div className="text-xs text-muted-color mt-1">📋 {v.opportunityTitle}</div>}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}

// ─── Contacts Hub ─────────────────────────────────────────────────────────────

function ContactsHub({ data, userRole }) {
  const contacts    = data?.contacts    || [];
  const donations   = data?.donations   || [];
  const donorLevels = data?.donorLevels || [];

  const isDirector = userRole === 'director';

  const [activeTab, setActiveTab] = React.useState(() => {
    const saved = localStorage.getItem('scenestave_contacts_tab') || 'all';
    if (isDirector && !['staff', 'actors'].includes(saved)) return 'staff';
    return saved;
  });

  const setTab = (tab) => {
    setActiveTab(tab);
    localStorage.setItem('scenestave_contacts_tab', tab);
  };

  const tabs = [
    { id: 'all',        label: '👥 All Contacts', show: !isDirector },
    { id: 'donors',     label: '💛 Donors',        show: !isDirector },
    { id: 'staff',      label: '🎭 Staff & Crew',  show: true },
    { id: 'actors',     label: '🎬 Actors',         show: true },
    { id: 'volunteers', label: '🤝 Volunteers',     show: !isDirector },
    { id: 'board',      label: '🏛 Board',           show: !isDirector },
  ].filter(t => t.show);

  return (
    <div className="max-w-[1400px] mx-auto">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
        <p className="text-sm text-gray-500 mt-0.5">All people associated with your organization</p>
      </div>

      {/* Tab bar */}
      <div className="flex flex-wrap gap-1 mb-6 bg-gray-800 rounded-xl p-1 w-fit">
        {tabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-violet-600 text-white'
                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'all' && (
        <AllContactsList contacts={contacts} donations={donations} />
      )}

      {activeTab === 'donors' && (
        window.DonorsView
          ? React.createElement(window.DonorsView, { data: { contacts, donations, donorLevels } })
          : <div className="text-center py-16 text-gray-400">Donors view loading…</div>
      )}

      {activeTab === 'staff' && (
        window.StaffDirectory
          ? React.createElement(window.StaffDirectory, {})
          : <div className="text-center py-16 text-gray-400">Staff Directory loading…</div>
      )}

      {activeTab === 'actors' && (
        window.ActorAdminRouter
          ? React.createElement(window.ActorAdminRouter, { userRole: 'Admin' })
          : <div className="text-center py-16 text-gray-500">
              <div className="text-4xl mb-3">🎬</div>
              <p>Actor roster loading…</p>
            </div>
      )}

      {activeTab === 'volunteers' && (
        <VolunteerDirectory contacts={contacts} />
      )}

      {activeTab === 'board' && (
        <BoardMembersView contacts={contacts} userRole={userRole} />
      )}

      {isDirector && (
        <div className="mt-6 px-4 py-3 bg-gray-800 border border-gray-700 rounded text-sm text-gray-500 flex items-center gap-2">
          <span>✉️</span>
          <span>Email communication and internal team messaging coming in a future update</span>
        </div>
      )}
    </div>
  );
}

window.ContactsHub = ContactsHub;
console.log('✅ ContactsHub loaded');
