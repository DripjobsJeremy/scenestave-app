// ContactsHub — unified people directory: All Contacts / Donors / Staff / Actors / Volunteers / Board

// ─── All Contacts List ────────────────────────────────────────────────────────

function AllContactsList({ contacts, donations }) {
  const [search, setSearch] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState('');
  const [showAddForm, setShowAddForm] = React.useState(false);
  const [form, setForm] = React.useState({ firstName: '', lastName: '', email: '', phone: '' });
  const [saving, setSaving] = React.useState(false);
  const [localContacts, setLocalContacts] = React.useState(contacts);

  React.useEffect(() => { setLocalContacts(contacts); }, [contacts]);

  const filtered = React.useMemo(() => {
    const q = search.toLowerCase();
    return localContacts.filter(c => {
      const name  = `${c.firstName || ''} ${c.lastName || ''}`.toLowerCase();
      const email = (c.email || '').toLowerCase();
      if (q && !name.includes(q) && !email.includes(q)) return false;
      if (typeFilter === 'donor'   && !c.isDonor)              return false;
      if (typeFilter === 'staff'   && !c.isStaff)              return false;
      if (typeFilter === 'neither' && (c.isDonor || c.isStaff)) return false;
      return true;
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
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <input
          type="text"
          placeholder="Search by name or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-400 focus:border-violet-400"
        />
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-400"
        >
          <option value="">All Types</option>
          <option value="donor">Donors only</option>
          <option value="staff">Staff only</option>
          <option value="neither">Neither</option>
        </select>
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
              <input type="text" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Last Name</label>
              <input type="text" value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email *</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
              <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-400" />
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <button type="button" onClick={handleCreate} disabled={saving} className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium disabled:opacity-60 transition-colors">
              {saving ? 'Saving…' : 'Create Contact'}
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-4 mb-4 text-sm text-gray-500">
        <span>{localContacts.length} total</span>
        <span>·</span>
        <span className="text-amber-600 font-medium">{localContacts.filter(c => c.isDonor).length} donors</span>
        <span>·</span>
        <span className="text-violet-600 font-medium">{localContacts.filter(c => c.isStaff).length} staff</span>
        {filtered.length !== localContacts.length && <><span>·</span><span>{filtered.length} shown</span></>}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-4xl mb-3">👤</div>
          <p className="font-medium text-gray-600 mb-1">No contacts found</p>
          <p className="text-sm">Try a different search or filter</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Phone</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Activity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(c => {
                const name = `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Unnamed';
                const dCount = donationCountFor(c.id);
                const prodCount = (c.staffProfile?.productions || []).length;
                return (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{name}</td>
                    <td className="px-4 py-3 text-gray-500">{c.email || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{c.phone || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap">
                        {c.isDonor && <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-medium">Donor</span>}
                        {c.isStaff && <span className="px-2 py-0.5 bg-violet-100 text-violet-700 rounded text-xs font-medium">Staff</span>}
                        {!c.isDonor && !c.isStaff && <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-xs">Contact</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs hidden lg:table-cell">
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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Board Members</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {boardMembers.length} board member{boardMembers.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.showToast?.('Board member invitations coming in Sprint 4', 'info')}
          className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          + Add Board Member
        </button>
      </div>

      {boardMembers.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">🏛</div>
          <p className="text-lg font-medium text-gray-800 mb-1">No board members yet</p>
          <p className="text-sm text-gray-400">Tag a contact with "Board Member" to add them here</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {boardMembers.map(member => {
            const name = member.name || `${member.firstName || ''} ${member.lastName || ''}`.trim() || 'Unnamed';
            const initial = name[0]?.toUpperCase() || '?';
            const boardTag = (member.tags || []).find(t => BOARD_TAGS.includes(String(t).toLowerCase()));
            return (
              <div key={member.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:border-violet-300 hover:shadow-sm transition-all">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-violet-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {initial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 truncate">{name}</div>
                    {member.email && <div className="text-sm text-gray-500 truncate">{member.email}</div>}
                    {member.phone && <div className="text-sm text-gray-400">{member.phone}</div>}
                    {boardTag && (
                      <span className="inline-block mt-2 text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">
                        {boardTag}
                      </span>
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

// ─── Contacts Hub ─────────────────────────────────────────────────────────────

function ContactsHub({ data, userRole }) {
  const contacts    = data?.contacts    || [];
  const donations   = data?.donations   || [];
  const donorLevels = data?.donorLevels || [];

  const [activeTab, setActiveTab] = React.useState(() => {
    return localStorage.getItem('scenestave_contacts_tab') || 'all';
  });

  const setTab = (tab) => {
    setActiveTab(tab);
    localStorage.setItem('scenestave_contacts_tab', tab);
  };

  const tabs = [
    { id: 'all',        label: '👥 All Contacts' },
    { id: 'donors',     label: '💛 Donors' },
    { id: 'staff',      label: '🎭 Staff & Crew' },
    { id: 'actors',     label: '🎬 Actors' },
    { id: 'volunteers', label: '🤝 Volunteers' },
    { id: 'board',      label: '🏛 Board' },
  ];

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
        window.VolunteerDashboard
          ? React.createElement(window.VolunteerDashboard, {
              userRole: userRole || 'admin',
              onNavigate: () => {},
            })
          : <div className="text-center py-16 text-gray-500">
              <div className="text-4xl mb-3">🤝</div>
              <p>Volunteer dashboard loading…</p>
            </div>
      )}

      {activeTab === 'board' && (
        <BoardMembersView contacts={contacts} userRole={userRole} />
      )}
    </div>
  );
}

window.ContactsHub = ContactsHub;
console.log('✅ ContactsHub loaded');
