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
  const [form, setForm] = React.useState({ firstName: '', lastName: '', email: '', phone: '' });
  const [saving, setSaving] = React.useState(false);
  const [localContacts, setLocalContacts] = React.useState(contacts);

  React.useEffect(() => { setLocalContacts(contacts); }, [contacts]);

  const setView = (mode) => {
    setViewMode(mode);
    try { localStorage.setItem('scenestave_all_contacts_view', mode); } catch {}
  };

  const getContactTypes = (c) => {
    const types = [];
    if (c.isDonor) types.push({ label: 'Donor', color: 'amber' });
    if (c.isStaff) types.push({ label: 'Staff', color: 'violet' });
    if (c.type === 'Actor') types.push({ label: 'Actor', color: 'pink' });
    if (c.volunteerInfo || c.isVolunteer) types.push({ label: 'Volunteer', color: 'green' });
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
    return localContacts.filter(c => {
      const name  = `${c.firstName || ''} ${c.lastName || ''} ${c.name || ''}`.toLowerCase();
      const email = (c.email || '').toLowerCase();
      const phone = (c.phone || '').toLowerCase();
      const matchesSearch = !search || name.includes(q) || email.includes(q) || phone.includes(q);
      const matchesType = typeFilter === 'all'
        || (typeFilter === 'donor'     && c.isDonor)
        || (typeFilter === 'staff'     && c.isStaff)
        || (typeFilter === 'actor'     && c.type === 'Actor')
        || (typeFilter === 'volunteer' && (c.volunteerInfo || c.isVolunteer))
        || (typeFilter === 'board'     && Array.isArray(c.tags) && c.tags.some(t => BOARD_TAGS.includes(String(t).toLowerCase())));
      return matchesSearch && matchesType;
    });
  }, [localContacts, search, typeFilter]);

  const donationCountFor = (id) => (donations || []).filter(d => d.contactId === id).length;

  const handleCreate = () => {
    if (!form.firstName || !form.email) {
      window.showToast?.('First name and email are required', 'warning');
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
      const newContact = {
        id: `contact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone,
        isDonor: false,
        isStaff: false,
        status: 'active',
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      all.push(newContact);
      window.contactsService.saveContactsToLS(all);
      setLocalContacts(window.contactsService.loadContacts());
      setForm({ firstName: '', lastName: '', email: '', phone: '' });
      setShowAddForm(false);
      window.showToast?.('Contact created', 'success');
    } catch (e) {
      window.showToast?.('Error creating contact', 'error');
    } finally {
      setSaving(false);
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
          {filtered.length !== localContacts.length && ` of ${localContacts.length}`}
        </span>
        <span className="text-xs text-muted-color">
          {localContacts.filter(c => c.isDonor).length} donors · {localContacts.filter(c => c.isStaff).length} staff
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
                    <td><TypeBadges contact={c} /></td>
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
                <TypeBadges contact={c} />
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
  const volunteers = React.useMemo(() => (contacts || []).filter(c =>
    c.volunteerInfo || c.isVolunteer ||
    (Array.isArray(c.tags) && c.tags.some(t => String(t).toLowerCase().includes('volunteer')))
  ), [contacts]);

  const [search, setSearch] = React.useState('');
  const [viewMode, setViewMode] = React.useState(() => {
    try { return localStorage.getItem('scenestave_volunteer_view') || 'cards'; } catch { return 'cards'; }
  });
  const [showFull, setShowFull] = React.useState(false);

  const setView = (mode) => {
    setViewMode(mode);
    try { localStorage.setItem('scenestave_volunteer_view', mode); } catch {}
  };

  if (showFull && window.VolunteerDashboard) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setShowFull(false)}
          className="mb-4 text-sm text-violet-600 hover:text-violet-800 font-medium flex items-center gap-1"
        >
          ← Back to Directory
        </button>
        {React.createElement(window.VolunteerDashboard, { userRole: 'admin', onNavigate: () => {} })}
      </div>
    );
  }

  const filtered = React.useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return volunteers;
    return volunteers.filter(c => {
      const name = `${c.firstName || ''} ${c.lastName || ''}`.toLowerCase();
      return name.includes(q) || (c.email || '').toLowerCase().includes(q);
    });
  }, [volunteers, search]);

  const statusBadgeClass = (status) => ({
    active:   'bg-green-100 text-green-700',
    inactive: 'bg-gray-100 text-gray-500',
    pending:  'bg-amber-100 text-amber-700',
  }[String(status || 'pending').toLowerCase()] || 'bg-gray-100 text-gray-500');

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-2xl font-bold text-primary-color">Volunteers</h2>
          <p className="text-sm text-muted-color mt-0.5">{volunteers.length} volunteer{volunteers.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="view-toggle">
            <button type="button" onClick={() => setView('cards')} className={`view-toggle-btn${viewMode === 'cards' ? ' active' : ''}`}>⊞ Cards</button>
            <button type="button" onClick={() => setView('table')} className={`view-toggle-btn${viewMode === 'table' ? ' active' : ''}`}>≡ Table</button>
          </div>
          {window.VolunteerDashboard && (
            <button
              type="button"
              onClick={() => setShowFull(true)}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              ⚙️ Full Dashboard →
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="mb-5">
        <input
          type="text"
          placeholder="Search volunteers…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="hub-input w-full max-w-sm"
        />
      </div>

      {/* Empty state */}
      {volunteers.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">🤝</div>
          <p className="font-medium mb-1 text-primary-color">No volunteers yet</p>
          <p className="text-sm text-muted-color">Add volunteer info to contacts, or manage from the Volunteers section</p>
          {window.VolunteerDashboard && (
            <button
              type="button"
              onClick={() => setShowFull(true)}
              className="mt-4 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              ⚙️ Full Dashboard →
            </button>
          )}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">🔍</div>
          <p className="font-medium mb-1 text-primary-color">No results</p>
          <p className="text-sm text-muted-color">Try a different search</p>
        </div>
      ) : viewMode === 'table' ? (
        <div className="hub-table-wrap">
          <table className="hub-table">
            <thead>
              <tr>
                <th>Name</th>
                <th className="hidden md:table-cell">Email</th>
                <th>Status</th>
                <th className="hidden md:table-cell right">Hours</th>
                <th className="hidden lg:table-cell">Skills</th>
                <th><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => {
                const name = `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Unnamed';
                const initial = name[0]?.toUpperCase() || '?';
                const vi = c.volunteerInfo || {};
                const hours = vi.hoursLogged ?? vi.hours ?? '—';
                const status = vi.status || 'pending';
                const skills = Array.isArray(vi.skills) ? vi.skills.join(', ') : (vi.skills || '—');
                return (
                  <tr key={c.id}>
                    <td className="font-medium">
                      <div className="flex items-center gap-2">
                        {c.donorProfile?.photoUrl
                          ? <img src={c.donorProfile.photoUrl} alt={name} className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                          : <div className="w-7 h-7 rounded-full bg-green-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">{initial}</div>
                        }
                        <span className="text-primary-color">{name}</span>
                      </div>
                    </td>
                    <td className="secondary hidden md:table-cell">{c.email || '—'}</td>
                    <td>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusBadgeClass(status)}`}>
                        {status}
                      </span>
                    </td>
                    <td className="secondary right hidden md:table-cell">{hours}</td>
                    <td className="secondary hidden lg:table-cell">{skills}</td>
                    <td className="right">
                      {window.VolunteerDashboard && (
                        <button
                          type="button"
                          onClick={() => setShowFull(true)}
                          className="text-xs text-violet-600 hover:text-violet-800 font-medium"
                        >
                          Full View
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(c => {
            const name = `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Unnamed';
            const initial = name[0]?.toUpperCase() || '?';
            const vi = c.volunteerInfo || {};
            const hours = vi.hoursLogged ?? vi.hours;
            const status = vi.status || 'pending';
            const skills = Array.isArray(vi.skills) ? vi.skills : (vi.skills ? [vi.skills] : []);
            return (
              <div key={c.id} className="hub-card">
                <div className="flex items-center gap-3 mb-2">
                  {c.donorProfile?.photoUrl
                    ? <img src={c.donorProfile.photoUrl} alt={name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                    : <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">{initial}</div>
                  }
                  <div className="min-w-0">
                    <div className="font-semibold truncate text-primary-color">{name}</div>
                    {c.email && <div className="text-xs truncate text-secondary-color">{c.email}</div>}
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusBadgeClass(status)}`}>{status}</span>
                  {hours != null && <span className="text-xs text-muted-color">{hours} hrs</span>}
                </div>
                {skills.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {skills.slice(0, 3).map((s, i) => (
                      <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{s}</span>
                    ))}
                    {skills.length > 3 && <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-xs">+{skills.length - 3}</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
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
