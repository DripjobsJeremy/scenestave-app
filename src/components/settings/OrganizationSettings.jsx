/**
 * OrganizationSettings Component
 * Super Admin section for managing organization profile, contact info, branding, and account.
 */

function OrganizationSettings(props) {
  const { useState, useEffect } = React;

  const [organization, setOrganization] = useState(null);
  const [activeSection, setActiveSection] = useState('general');
  const [showClientOrgModal, setShowClientOrgModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [btnTheme, setBtnTheme] = useState(null);

  useEffect(() => {
    loadOrganization();
    const stored = window.organizationService?.loadButtonTheme();
    setBtnTheme(stored || window.organizationService?.DEFAULT_BTN_THEME);
  }, []);

  const saveBtnTheme = (updated) => {
    setBtnTheme(updated);
    window.organizationService?.saveButtonTheme(updated);
  };

  const resetBtnTheme = () => {
    const def = window.organizationService?.DEFAULT_BTN_THEME;
    setBtnTheme({ ...def });
    window.organizationService?.saveButtonTheme({ ...def });
    if (window.showToast) window.showToast('Button theme reset to defaults', 'info');
  };

  const loadOrganization = () => {
    const org = window.organizationService?.loadOrganization();
    if (org) setOrganization(org);
  };

  // Auto-saves to localStorage immediately (silent — no toast per keystroke)
  const handleUpdate = (field, value) => {
    if (!organization) return;
    let updates = {};
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      updates[parent] = { ...(organization[parent] || {}), [child]: value };
    } else {
      updates[field] = value;
    }
    const updated = window.organizationService?.updateOrganization(updates);
    if (updated) setOrganization(updated);
    if (props.onUpdate) props.onUpdate();
  };

  // Phone management
  const handleAddPhone = () => {
    window.organizationService?.addPhone({ label: 'Phone', number: '', countryCode: '+1' });
    loadOrganization();
    if (window.showToast) window.showToast('Phone number added', 'success');
  };
  const handleUpdatePhone = (phoneId, updates) => {
    window.organizationService?.updatePhone(phoneId, updates);
    loadOrganization();
  };
  const handleRemovePhone = (phoneId) => {
    if (!organization || organization.phones.length <= 1) {
      alert('At least one phone number is required');
      return;
    }
    window.organizationService?.removePhone(phoneId);
    loadOrganization();
  };

  // Email management
  const handleAddEmail = () => {
    window.organizationService?.addEmail({ label: 'Email', address: '' });
    loadOrganization();
    if (window.showToast) window.showToast('Email address added', 'success');
  };
  const handleUpdateEmail = (emailId, updates) => {
    window.organizationService?.updateEmail(emailId, updates);
    loadOrganization();
  };
  const handleRemoveEmail = (emailId) => {
    if (!organization || organization.emails.length <= 1) {
      alert('At least one email address is required');
      return;
    }
    window.organizationService?.removeEmail(emailId);
    loadOrganization();
  };

  // Logo upload
  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('Logo file must be under 2MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      window.organizationService?.updateBranding({
        ...(organization?.branding || {}),
        logoUrl: event.target.result
      });
      loadOrganization();
      if (props.onUpdate) props.onUpdate();
      if (window.showToast) window.showToast('✅ Logo updated', 'success');
    };
    reader.readAsDataURL(file);
  };

  // Branding — saves immediately on each color change
  const handleColorChange = (colorField, value) => {
    const branding = { ...(organization?.branding || {}), [colorField]: value };
    window.organizationService?.updateBranding(branding);
    loadOrganization();
    if (props.onUpdate) props.onUpdate();
  };

  if (!organization) {
    return (
      <div className="flex items-center justify-center h-48">
        <p className="text-gray-500">Loading organization settings...</p>
      </div>
    );
  }

  // ─── Constants ─────────────────────────────────────────────────────────────

  const ORGANIZATION_TYPES = [
    { value: 'community',    label: 'Community Theatre' },
    { value: 'professional', label: 'Professional Theatre' },
    { value: 'university',   label: 'University Theatre Department' },
    { value: 'children',     label: "Children's Theatre" },
    { value: 'dance',        label: 'Dance Studio' },
    { value: 'opera',        label: 'Opera Company' },
    { value: 'high_school',  label: 'High School Theatre' },
    { value: 'regional',     label: 'Regional Theatre' },
    { value: 'touring',      label: 'Touring Company' },
    { value: 'improv',       label: 'Improv / Comedy Theatre' },
    { value: 'other',        label: 'Other' }
  ];

  const TIMEZONES = (() => {
    try { return Intl.supportedValuesOf('timeZone'); } catch (e) {
      return [
        'America/New_York','America/Chicago','America/Denver','America/Los_Angeles',
        'America/Phoenix','America/Anchorage','Pacific/Honolulu',
        'America/Toronto','America/Vancouver','America/Winnipeg',
        'Europe/London','Europe/Paris','Europe/Berlin','Europe/Rome','Europe/Madrid',
        'Australia/Sydney','Australia/Melbourne','Australia/Brisbane',
        'Pacific/Auckland','Asia/Tokyo','Asia/Singapore','Asia/Dubai'
      ];
    }
  })();

  const COUNTRIES = [
    { code: 'US', name: 'United States' },
    { code: 'CA', name: 'Canada' },
    { code: 'GB', name: 'United Kingdom' },
    { code: 'AU', name: 'Australia' },
    { code: 'NZ', name: 'New Zealand' },
    { code: 'IE', name: 'Ireland' },
    { code: 'DE', name: 'Germany' },
    { code: 'FR', name: 'France' },
    { code: 'ES', name: 'Spain' },
    { code: 'IT', name: 'Italy' },
    { code: 'JP', name: 'Japan' },
    { code: 'SG', name: 'Singapore' },
    { code: 'ZA', name: 'South Africa' },
    { code: 'MX', name: 'Mexico' },
    { code: 'BR', name: 'Brazil' },
    { code: 'IN', name: 'India' },
    { code: 'OTHER', name: 'Other' }
  ];

  const SUBSCRIPTION_PLANS = {
    free:         { name: 'Free',         price: '$0/month',   features: 'Up to 2 productions, 100 contacts' },
    starter:      { name: 'Starter',      price: '$29/month',  features: 'Up to 5 productions, 500 contacts' },
    professional: { name: 'Professional', price: '$79/month',  features: 'Unlimited productions, 2,000 contacts' },
    enterprise:   { name: 'Enterprise',   price: 'Custom',     features: 'Unlimited everything, priority support' }
  };

  const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500';
  const labelCls = 'block text-sm font-medium text-gray-700 mb-1';
  const cardCls  = 'bg-white rounded-lg shadow-sm border border-gray-200 p-6';

  const tabs = [
    { id: 'general',  label: 'General',  icon: '🏢' },
    { id: 'contact',  label: 'Contact',  icon: '📞' },
    { id: 'clients',  label: 'Clients',  icon: '🎭' },
    { id: 'branding', label: 'Branding', icon: '🎨' },
    { id: 'account',  label: 'Account',  icon: '💳' }
  ];

  // ─── Address Fields helper ─────────────────────────────────────────────────
  const AddressFields = ({ value, onChange }) => {
    const set = (field, val) => onChange({ ...value, [field]: val });
    return (
      <div className="space-y-3">
        <input type="text" value={value.street1 || ''} onChange={e => set('street1', e.target.value)}
          className={inputCls} placeholder="Street Address" />
        <input type="text" value={value.street2 || ''} onChange={e => set('street2', e.target.value)}
          className={inputCls} placeholder="Apt, Suite, Building (optional)" />
        <div className="grid grid-cols-2 gap-3">
          <input type="text" value={value.city || ''} onChange={e => set('city', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500" placeholder="City" />
          <input type="text" value={value.state || ''} onChange={e => set('state', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500" placeholder="State / Province" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <input type="text" value={value.postalCode || ''} onChange={e => set('postalCode', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500" placeholder="Postal Code" />
          <select value={value.country || 'US'} onChange={e => set('country', e.target.value)}
            title="Country"
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500">
            {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
          </select>
        </div>
      </div>
    );
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Organization Settings</h2>
        <p className="text-gray-600 mt-1">Manage your organization's information and branding</p>
      </div>

      {/* Section Navigation */}
      <div className="flex gap-2 border-b border-gray-200">
        {tabs.map(tab => (
          <button
            type="button"
            key={tab.id}
            onClick={() => setActiveSection(tab.id)}
            className={`px-4 py-2 border-b-2 transition-colors ${
              activeSection === tab.id
                ? 'border-purple-600 text-purple-600 font-semibold'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <span className="mr-2">{tab.icon}</span>{tab.label}
          </button>
        ))}
      </div>

      {/* ── General Info ──────────────────────────────────────────────────── */}
      {activeSection === 'general' && (
        <div className={`${cardCls} space-y-5`}>
          <h3 className="text-lg font-semibold text-gray-900">General Information</h3>

          {/* Organization Name */}
          <div>
            <label className={labelCls}>Organization Name *</label>
            <input
              type="text"
              value={organization.name || ''}
              onChange={e => handleUpdate('name', e.target.value)}
              className={inputCls}
              placeholder="e.g., The Valerie Players"
            />
          </div>

          {/* Type */}
          <div>
            <label className={labelCls}>Organization Type</label>
            <select
              value={organization.type || 'community'}
              onChange={e => handleUpdate('type', e.target.value)}
              title="Organization Type"
              className={inputCls}
            >
              {ORGANIZATION_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Timezone */}
          <div>
            <label className={labelCls}>Timezone</label>
            <select
              value={organization.timezone || 'America/New_York'}
              onChange={e => handleUpdate('timezone', e.target.value)}
              title="Timezone"
              className={inputCls}
            >
              {TIMEZONES.map(tz => (
                <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>

          {/* Website + Tax ID */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Website</label>
              <input
                type="url"
                value={organization.website || ''}
                onChange={e => handleUpdate('website', e.target.value)}
                className={inputCls}
                placeholder="https://www.yourtheatre.org"
              />
            </div>
            <div>
              <label className={labelCls}>Tax ID / EIN</label>
              <input
                type="text"
                value={organization.taxId || ''}
                onChange={e => handleUpdate('taxId', e.target.value)}
                className={inputCls}
                placeholder="12-3456789"
              />
              <p className="text-xs text-gray-500 mt-1">Used on donation acknowledgment letters</p>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className={labelCls}>Organization Description</label>
            <textarea
              value={organization.description || ''}
              onChange={e => handleUpdate('description', e.target.value)}
              className={`${inputCls} h-20 resize-none`}
              placeholder="Brief description of your organization..."
            />
          </div>

          {/* Organization Address */}
          <div className="pt-4 border-t border-gray-100">
            <h4 className="font-medium text-gray-900 mb-3">Organization Address</h4>
            <AddressFields
              value={organization.address || {}}
              onChange={val => handleUpdate('address', val)}
            />
          </div>

          {/* Billing Address */}
          <div className="pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-900">Billing Address</h4>
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={organization.billingAddress?.sameAsOrg !== false}
                  onChange={e => handleUpdate('billingAddress', {
                    ...(organization.billingAddress || {}),
                    sameAsOrg: e.target.checked
                  })}
                  className="w-4 h-4 text-purple-600 rounded"
                />
                Same as organization address
              </label>
            </div>
            {organization.billingAddress?.sameAsOrg === false ? (
              <AddressFields
                value={organization.billingAddress || {}}
                onChange={val => handleUpdate('billingAddress', { ...val, sameAsOrg: false })}
              />
            ) : (
              <p className="text-sm text-gray-500 italic">Using organization address for billing</p>
            )}
          </div>
        </div>
      )}

      {/* ── Contact Info ──────────────────────────────────────────────────── */}
      {activeSection === 'contact' && (
        <div className={`${cardCls} space-y-6`}>
          <h3 className="text-lg font-semibold text-gray-900">Contact Information</h3>

          {/* Phone Numbers */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-900">Phone Numbers</h4>
              <button
                type="button"
                onClick={handleAddPhone}
                className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors"
              >
                + Add Phone
              </button>
            </div>
            <div className="space-y-3">
              {(organization.phones || []).map(phone => (
                <div key={phone.id} className="flex gap-3 items-center">
                  <input
                    type="text"
                    value={phone.label || ''}
                    onChange={e => handleUpdatePhone(phone.id, { label: e.target.value })}
                    className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                    placeholder="Label"
                  />
                  <input
                    type="text"
                    value={phone.countryCode || '+1'}
                    onChange={e => handleUpdatePhone(phone.id, { countryCode: e.target.value })}
                    className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 font-mono"
                    placeholder="+1"
                    maxLength={6}
                  />
                  <input
                    type="tel"
                    value={phone.number || ''}
                    onChange={e => handleUpdatePhone(phone.id, { number: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                    placeholder="Phone number"
                  />
                  <label className="flex items-center gap-1 text-xs text-gray-600 flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={phone.isPrimary || false}
                      onChange={e => handleUpdatePhone(phone.id, { isPrimary: e.target.checked })}
                      className="w-3.5 h-3.5 text-purple-600"
                    />
                    Primary
                  </label>
                  <button
                    type="button"
                    onClick={() => handleRemovePhone(phone.id)}
                    className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    aria-label="Remove phone"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Email Addresses */}
          <div className="pt-5 border-t border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-900">Email Addresses</h4>
              <button
                type="button"
                onClick={handleAddEmail}
                className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors"
              >
                + Add Email
              </button>
            </div>
            <div className="space-y-3">
              {(organization.emails || []).map(email => (
                <div key={email.id} className="flex gap-3 items-center">
                  <input
                    type="text"
                    value={email.label || ''}
                    onChange={e => handleUpdateEmail(email.id, { label: e.target.value })}
                    className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                    placeholder="Label"
                  />
                  <input
                    type="email"
                    value={email.address || ''}
                    onChange={e => handleUpdateEmail(email.id, { address: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                    placeholder="email@example.com"
                  />
                  <label className="flex items-center gap-1 text-xs text-gray-600 flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={email.isPrimary || false}
                      onChange={e => handleUpdateEmail(email.id, { isPrimary: e.target.checked })}
                      className="w-3.5 h-3.5 text-purple-600"
                    />
                    Primary
                  </label>
                  <button
                    type="button"
                    onClick={() => handleRemoveEmail(email.id)}
                    className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    aria-label="Remove email"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Client Organizations ──────────────────────────────────────────── */}
      {activeSection === 'clients' && (
        <div className={`${cardCls} space-y-6`}>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Client Organizations</h3>
            <p className="text-gray-600 mt-1">Manage troupes and organizations that rent or use your space</p>
          </div>

          {/* Venue Operator Mode toggle */}
          <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🏛️</span>
              <div>
                <h4 className="font-medium text-blue-900">Venue Operator Mode</h4>
                <p className="text-sm text-blue-700">Enable if you rent space to multiple theatre companies</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                const newState = !organization.managesClientOrgs;
                const updated = window.organizationService?.toggleClientOrgManagement(newState);
                if (updated) setOrganization(updated);
                if (window.showToast) window.showToast(
                  newState ? '✅ Venue operator mode enabled' : '✅ Venue operator mode disabled',
                  'success'
                );
              }}
              className={`px-6 py-2 rounded-lg font-medium transition-all min-w-[100px] ${
                organization.managesClientOrgs
                  ? 'bg-brand-primary text-white hover:opacity-90'
                  : 'bg-white text-gray-800 border-2 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {organization.managesClientOrgs ? 'Disable' : 'Enable'}
            </button>
          </div>

          {organization.managesClientOrgs ? (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  {organization.clientOrganizations?.length || 0} client organization(s)
                </p>
                <button
                  type="button"
                  onClick={() => { setEditingClient(null); setShowClientOrgModal(true); }}
                  className="px-4 py-2 bg-brand-primary text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-medium"
                >
                  + Add Client Organization
                </button>
              </div>

              <div className="space-y-3">
                {(organization.clientOrganizations?.length > 0) ? (
                  organization.clientOrganizations.map(client => (
                    <div key={client.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="text-base font-semibold text-gray-900">{client.name}</h4>
                            <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                              client.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                            }`}>
                              {client.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <div className="space-y-1 text-sm text-gray-600">
                            {client.contactName && <p>👤 {client.contactName}</p>}
                            {client.email      && <p>📧 {client.email}</p>}
                            {client.phone      && <p>📞 {client.phone}</p>}
                            {client.website    && <p>🌐 {client.website}</p>}
                            {client.notes      && (
                              <p className="mt-2 p-2 bg-gray-50 rounded text-gray-500">📝 {client.notes}</p>
                            )}
                          </div>
                          {/* Client Admin info */}
                          {(() => {
                            const clientAdmins = window.usersService?.getUsersByClientOrg(client.id) || [];
                            if (clientAdmins.length === 0) return null;
                            const admin = clientAdmins[0];
                            return (
                              <div className="mt-3 pt-3 border-t border-gray-200">
                                <div className="flex items-center gap-2 text-sm flex-wrap">
                                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded font-medium">
                                    Client Admin
                                  </span>
                                  <span className="text-gray-600">{admin.firstName} {admin.lastName}</span>
                                  {admin.status === 'invited' && admin.tempPassword && (
                                    <span className="text-xs text-orange-600 font-mono">
                                      Temp password: {admin.tempPassword}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => { setEditingClient(client); setShowClientOrgModal(true); }}
                            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Remove "${client.name}"?`)) {
                                const updated = window.organizationService?.removeClientOrganization(client.id);
                                if (updated) setOrganization(updated);
                                if (window.showToast) window.showToast('✅ Client organization removed', 'success');
                              }
                            }}
                            className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <div className="text-5xl mb-3">🎭</div>
                    <p className="text-gray-500 font-medium">No client organizations yet</p>
                    <p className="text-gray-400 text-sm mt-1">Add troupes that rent or use your space</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <div className="text-5xl mb-3">🏛️</div>
              <p className="text-gray-500 font-medium">Venue Operator Mode is disabled</p>
              <p className="text-gray-400 text-sm mt-1">Enable above to manage client organizations</p>
            </div>
          )}
        </div>
      )}

      {/* ── Branding ──────────────────────────────────────────────────────── */}
      {activeSection === 'branding' && (
        <div className={`${cardCls} space-y-6`}>
          <h3 className="text-lg font-semibold text-gray-900">Branding &amp; Theme</h3>

          {/* Logo Upload */}
          <div>
            <label className={labelCls}>Organization Logo</label>
            <div className="flex items-center gap-4">
              {organization.branding?.logoUrl ? (
                <div className="relative">
                  <img
                    src={organization.branding.logoUrl}
                    alt="Organization Logo"
                    className="w-32 h-32 object-contain border border-gray-200 rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      window.organizationService?.updateBranding({ ...organization.branding, logoUrl: '' });
                      loadOrganization();
                      if (window.showToast) window.showToast('Logo removed', 'info');
                    }}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full text-xs flex items-center justify-center transition-colors"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                  <span className="text-gray-400 text-sm">No logo</span>
                </div>
              )}

              <div>
                <input
                  type="file"
                  id="logo-upload"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <label
                  htmlFor="logo-upload"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg cursor-pointer inline-block transition-colors text-sm font-medium"
                >
                  Upload Logo
                </label>
                <p className="text-xs text-gray-500 mt-2">PNG, JPG, or SVG. Max 2MB. Square images work best.</p>
              </div>
            </div>
          </div>

          {/* Color Theme */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-gray-900">Color Palette</h4>
              {(() => {
                const b = organization.branding || {};
                const isDefault =
                  b.primaryColor   === '#7C3AED' &&
                  b.secondaryColor === '#4F46E5' &&
                  b.accentColor    === '#10B981';
                return isDefault ? (
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                    ✓ SceneStave Default Theme
                  </span>
                ) : (
                  <span className="badge-brand-custom px-3 py-1 text-xs rounded-full font-medium">
                    ★ Custom Theme Active
                  </span>
                );
              })()}
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Choose colors that represent your organization. Changes are saved automatically.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { key: 'primaryColor',    label: 'Primary Color',    placeholder: '#7C3AED' },
                { key: 'secondaryColor',  label: 'Secondary Color',  placeholder: '#4F46E5' },
                { key: 'accentColor',     label: 'Accent Color',     placeholder: '#10B981' },
                { key: 'backgroundColor', label: 'Background Color', placeholder: '#F9FAFB' },
                { key: 'textColor',       label: 'Text Color',       placeholder: '#111827' }
              ].map(({ key, label, placeholder }) => {
                const value = organization.branding?.[key] || placeholder;
                const swatchClass = {
                  primaryColor:    'bg-brand-primary',
                  secondaryColor:  'bg-brand-secondary',
                  accentColor:     'bg-brand-accent',
                  backgroundColor: 'bg-brand-background',
                  textColor:       'bg-brand-text'
                }[key] || '';
                return (
                  <div key={key}>
                    <label className={labelCls}>{label}</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={value.length === 7 ? value : placeholder}
                        onChange={e => handleColorChange(key, e.target.value)}
                        title={label}
                        aria-label={label}
                        className="w-16 h-10 rounded border border-gray-300 cursor-pointer p-0.5"
                      />
                      <input
                        type="text"
                        value={value}
                        onChange={e => {
                          if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value)) {
                            handleColorChange(key, e.target.value);
                          }
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 font-mono text-sm"
                        placeholder={placeholder}
                        maxLength={7}
                      />
                    </div>
                    <div className={`mt-2 h-8 rounded border border-gray-200 ${swatchClass}`} />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Color Preview */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Preview</h4>
            <div className="bg-brand-background p-6 rounded-lg border border-gray-200">
              <div className="flex items-center gap-4 mb-4">
                {organization.branding?.logoUrl && (
                  <img
                    src={organization.branding.logoUrl}
                    alt="Logo"
                    className="h-12 object-contain"
                  />
                )}
                <h3 className="text-2xl font-bold text-brand-primary">
                  {organization.name || 'Your Organization'}
                </h3>
              </div>

              <div className="flex flex-wrap gap-3">
                <button type="button" className="bg-brand-primary px-4 py-2 rounded-lg text-white text-sm font-medium">
                  Primary Button
                </button>
                <button type="button" className="bg-brand-secondary px-4 py-2 rounded-lg text-white text-sm font-medium">
                  Secondary Button
                </button>
                <button type="button" className="bg-brand-accent px-4 py-2 rounded-lg text-white text-sm font-medium">
                  Accent Button
                </button>
              </div>

              <p className="text-brand-text mt-4 text-sm">
                Sample text using your selected text color. This is how content will appear throughout SceneStave.
              </p>
            </div>
          </div>

          {/* Theme Actions */}
          <div className="space-y-4 pt-2 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Apply Custom Theme */}
              <div className="flex flex-col p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="mb-3">
                  <h4 className="font-medium text-blue-900 mb-1">Apply Custom Theme</h4>
                  <p className="text-sm text-blue-700">Apply your custom colors to SceneStave</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    window.organizationService?.applyBrandingToDOM(organization.branding);
                    if (window.showToast) window.showToast('✅ Theme applied to SceneStave', 'success');
                  }}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium text-sm mt-auto"
                >
                  Apply Theme
                </button>
              </div>

              {/* Reset to Default */}
              <div className="flex flex-col p-4 bg-gray-50 border border-gray-300 rounded-lg">
                <div className="mb-3">
                  <h4 className="font-medium text-gray-900 mb-1">Reset to Default</h4>
                  <p className="text-sm text-gray-600">Restore SceneStave's original purple theme</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Reset to default SceneStave theme?\n\nYour custom theme will be saved and can be restored later.')) {
                      const updated = window.organizationService?.resetBrandingToDefault();
                      if (updated) setOrganization(updated);
                      if (window.showToast) window.showToast('💾 Custom theme saved. Reset to defaults.', 'success');
                    }
                  }}
                  className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors font-medium text-sm mt-auto"
                >
                  Reset to Default Theme
                </button>
              </div>
            </div>

            {/* Restore Saved Custom Theme — only shown when one exists */}
            {organization.savedCustomTheme && (
              <div className="flex flex-col p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-medium text-purple-900 mb-1">Restore Your Custom Theme</h4>
                    <p className="text-sm text-purple-700">
                      Saved {new Date(organization.savedCustomTheme.savedAt).toLocaleDateString()} at{' '}
                      {new Date(organization.savedCustomTheme.savedAt).toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <ColorSwatch color={organization.savedCustomTheme.primaryColor} title="Primary" />
                    <ColorSwatch color={organization.savedCustomTheme.secondaryColor} title="Secondary" />
                    <ColorSwatch color={organization.savedCustomTheme.accentColor} title="Accent" />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Restore your saved custom theme?')) {
                      const updated = window.organizationService?.restoreSavedCustomTheme();
                      if (updated) setOrganization(updated);
                      if (window.showToast) window.showToast('✅ Custom theme restored', 'success');
                    }
                  }}
                  className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium text-sm"
                >
                  Restore Custom Theme
                </button>
              </div>
            )}
          </div>

          {/* ── Button Styles ──────────────────────────────────────────────── */}
          {btnTheme && (
          <div className="border-t border-gray-200 pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900">Button Styles</h4>
              <button
                type="button"
                onClick={resetBtnTheme}
                className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs font-medium transition-colors"
              >
                Reset to Defaults
              </button>
            </div>
            <p className="text-sm text-gray-600">
              Customize the colors for each button type used throughout SceneStave.
            </p>

            {/* Live preview */}
            <div className="flex flex-wrap gap-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <span className="text-xs text-gray-500 self-center mr-1">Preview:</span>
              <button type="button" className="btn-primary px-4 py-2 rounded-lg text-sm font-medium">Primary</button>
              <button type="button" className="btn-secondary px-4 py-2 rounded-lg text-sm font-medium">Secondary</button>
              <button type="button" className="btn-success px-4 py-2 rounded-lg text-sm font-medium">Success</button>
            </div>

            {/* Color inputs per button type */}
            {[
              { type: 'primary',   label: 'Primary Button',   fields: [{ field: 'bg', fieldLabel: 'Background' }, { field: 'hover', fieldLabel: 'Hover' }, { field: 'active', fieldLabel: 'Active' }, { field: 'text', fieldLabel: 'Text' }] },
              { type: 'secondary', label: 'Secondary Button', fields: [{ field: 'bg', fieldLabel: 'Background' }, { field: 'hover', fieldLabel: 'Hover' }, { field: 'border', fieldLabel: 'Border' }, { field: 'text', fieldLabel: 'Text' }] },
              { type: 'success',   label: 'Success Button',   fields: [{ field: 'bg', fieldLabel: 'Background' }, { field: 'hover', fieldLabel: 'Hover' }, { field: 'active', fieldLabel: 'Active' }, { field: 'text', fieldLabel: 'Text' }] },
            ].map(({ type, label, fields }) => (
              <div key={type} className="p-4 border border-gray-200 rounded-lg space-y-3">
                <div className="font-medium text-gray-800 text-sm">{label}</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {fields.map(({ field, fieldLabel }) => (
                    <div key={field}>
                      <label className="block text-xs text-gray-500 mb-1">{fieldLabel}</label>
                      <div className="flex gap-1">
                        <input
                          type="color"
                          value={btnTheme[type]?.[field] || '#000000'}
                          onChange={e => {
                            const updated = {
                              ...btnTheme,
                              [type]: { ...btnTheme[type], [field]: e.target.value }
                            };
                            saveBtnTheme(updated);
                          }}
                          title={`${label} ${fieldLabel}`}
                          aria-label={`${label} ${fieldLabel}`}
                          className="w-10 h-8 rounded border border-gray-300 cursor-pointer p-0.5"
                        />
                        <input
                          type="text"
                          value={btnTheme[type]?.[field] || ''}
                          onChange={e => {
                            if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value)) {
                              const updated = {
                                ...btnTheme,
                                [type]: { ...btnTheme[type], [field]: e.target.value }
                              };
                              saveBtnTheme(updated);
                            }
                          }}
                          className="flex-1 min-w-0 px-2 py-1 border border-gray-300 rounded font-mono text-xs"
                          placeholder="#000000"
                          maxLength={7}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          )}
        </div>
      )}

      {/* ── Account ───────────────────────────────────────────────────────── */}
      {activeSection === 'account' && (
        <div className={`${cardCls} space-y-6`}>
          <h3 className="text-lg font-semibold text-gray-900">Account Information</h3>

          {/* Account Number */}
          <div>
            <label className={labelCls}>Account Number</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={organization.accountNumber || '—'}
                readOnly
                aria-label="Account Number"
                className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg font-mono text-sm text-gray-600 cursor-default"
              />
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(organization.accountNumber || '');
                  if (window.showToast) window.showToast('✅ Account number copied', 'success');
                }}
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition-colors"
              >
                Copy
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">Your unique account identifier</p>
          </div>

          {/* Current Plan */}
          <div>
            <label className={labelCls}>Current Plan</label>
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-gray-900">
                      {SUBSCRIPTION_PLANS[organization.subscriptionPlan]?.name || 'Free'}
                    </h4>
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                      Active
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {SUBSCRIPTION_PLANS[organization.subscriptionPlan]?.features}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-gray-900">
                    {SUBSCRIPTION_PLANS[organization.subscriptionPlan]?.price}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Available Plans */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Available Plans</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(SUBSCRIPTION_PLANS).map(([key, plan]) => {
                const isCurrent = organization.subscriptionPlan === key;
                return (
                  <div
                    key={key}
                    className={`border-2 rounded-lg p-4 transition-colors ${
                      isCurrent
                        ? 'border-purple-600 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h5 className="font-semibold text-gray-900">{plan.name}</h5>
                      {isCurrent && (
                        <span className="px-2 py-0.5 bg-purple-600 text-white text-xs rounded-full font-medium">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{plan.features}</p>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-900">{plan.price}</span>
                      {!isCurrent && (
                        <button
                          type="button"
                          onClick={() => {
                            const action = key === 'free' ? 'downgrade to' : 'upgrade to';
                            if (confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} ${plan.name} plan?`)) {
                              handleUpdate('subscriptionPlan', key);
                              if (window.showToast) {
                                window.showToast(`✅ Switched to ${plan.name} plan`, 'success');
                              }
                            }
                          }}
                          className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors"
                        >
                          {key === 'free' ? 'Downgrade' : 'Upgrade'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-gray-500 mt-3">
              Need a custom enterprise plan? Contact us at sales@showsuite.com
            </p>
          </div>

          {/* Account Metadata */}
          <div className="pt-4 border-t border-gray-200">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Created:</span>
                <span className="ml-2 text-gray-900">
                  {organization.createdAt
                    ? new Date(organization.createdAt).toLocaleDateString()
                    : '—'}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Last Updated:</span>
                <span className="ml-2 text-gray-900">
                  {organization.updatedAt
                    ? new Date(organization.updatedAt).toLocaleDateString()
                    : '—'}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-500">Organization ID:</span>
                <span className="ml-2 text-gray-400 font-mono text-xs">{organization.id || '—'}</span>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Client Organization Modal */}
      {showClientOrgModal && (
        <ClientOrganizationModal
          client={editingClient}
          onSave={data => {
            if (editingClient) {
              window.organizationService?.updateClientOrganization(editingClient.id, data);
              const updated = window.organizationService?.loadOrganization();
              if (updated) setOrganization(updated);
              setShowClientOrgModal(false);
              setEditingClient(null);
              if (window.showToast) window.showToast('✅ Client organization updated', 'success');
            } else {
              const newClient = window.organizationService?.addClientOrganization(data);
              const updated = window.organizationService?.loadOrganization();
              if (updated) setOrganization(updated);
              setShowClientOrgModal(false);
              setEditingClient(null);
              if (window.showToast) {
                const clientAdmins = newClient && window.usersService?.getUsersByClientOrg(newClient.id) || [];
                const toastMsg = (clientAdmins.length > 0 && clientAdmins[0].tempPassword)
                  ? `✅ Client org added. Admin password: ${clientAdmins[0].tempPassword}`
                  : '✅ Client organization added';
                window.showToast(toastMsg, 'success');
              }
            }
          }}
          onClose={() => { setShowClientOrgModal(false); setEditingClient(null); }}
        />
      )}
    </div>
  );
}

// ─── ColorSwatch ───────────────────────────────────────────────────────────
// Applies a dynamic hex color via DOM ref to avoid inline style={} warnings.
function ColorSwatch({ color, title }) {
  const { useRef, useEffect } = React;
  const ref = useRef(null);
  useEffect(() => { if (ref.current) ref.current.style.backgroundColor = color; }, [color]);
  return <div ref={ref} className="w-6 h-6 rounded border border-gray-300" title={title} />;
}

// ─── Client Organization Modal ─────────────────────────────────────────────
function ClientOrganizationModal({ client, onSave, onClose }) {
  const { useState } = React;
  const [formData, setFormData] = useState({
    name:        client?.name        || '',
    contactName: client?.contactName || '',
    email:       client?.email       || '',
    phone:       client?.phone       || '',
    website:     client?.website     || '',
    notes:       client?.notes       || '',
    isActive:    client?.isActive !== undefined ? client.isActive : true
  });

  const set = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500';

  const handleSubmit = e => {
    e.preventDefault();
    if (!formData.name.trim()) { alert('Organization name is required'); return; }
    onSave(formData);
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg max-w-lg w-full p-6 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-xl font-bold text-gray-900 mb-5">
          {client ? 'Edit Client Organization' : 'Add Client Organization'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Organization Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={e => set('name', e.target.value)}
              className={inputCls}
              placeholder="e.g., The Valerie Players"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Primary Contact Name</label>
            <input
              type="text"
              value={formData.contactName}
              onChange={e => set('contactName', e.target.value)}
              className={inputCls}
              placeholder="Jane Smith"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={e => set('email', e.target.value)}
                className={inputCls}
                placeholder="contact@troupe.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={e => set('phone', e.target.value)}
                className={inputCls}
                placeholder="(555) 123-4567"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
            <input
              type="url"
              value={formData.website}
              onChange={e => set('website', e.target.value)}
              className={inputCls}
              placeholder="https://troupe.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={e => set('notes', e.target.value)}
              className={`${inputCls} h-20 resize-none`}
              placeholder="Rental terms, contact preferences, special requirements..."
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={e => set('isActive', e.target.checked)}
              className="w-4 h-4 text-purple-600 rounded"
            />
            <span className="text-sm font-medium text-gray-700">Active (currently renting / using space)</span>
          </label>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
            >
              {client ? 'Save Changes' : 'Add Organization'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

window.OrganizationSettings = OrganizationSettings;
