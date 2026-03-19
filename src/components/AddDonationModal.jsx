const { useState, useEffect } = React;

function AddDonationModal({ onClose, onSave }) {
  const [contacts, setContacts] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [formData, setFormData] = useState({
    contactId: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'Check',
    campaignId: '',
    notes: '',
    restrictionType: 'unrestricted',
    restrictionPurpose: '',
    designatedProductionId: ''
  });
  const [productions, setProductions] = useState([]);
  const [showNewDonorForm, setShowNewDonorForm] = useState(false);
  const [newDonorData, setNewDonorData] = useState({ name: '', email: '', phone: '' });

  useEffect(() => {
    const allContacts = window.contactsService?.loadContacts() || [];
    setContacts(allContacts.filter(c => c.isDonor));

    const allCampaigns = window.campaignsService?.loadCampaigns() || [];
    setCampaigns(allCampaigns);

    const allProductions = JSON.parse(localStorage.getItem('showsuite_productions') || '[]');
    setProductions(allProductions);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('🎯 AddDonationModal handleSubmit called');
    console.log('   - showNewDonorForm:', showNewDonorForm);
    console.log('   - formData.contactId:', formData.contactId);
    console.log('   - formData.amount:', formData.amount);
    console.log('   - onSave type:', typeof onSave);
    console.log('   - onClose type:', typeof onClose);

    // Resolve contactId — either from dropdown or by creating new donor inline
    let contactId = formData.contactId;
    let donorDisplayName = '';

    if (showNewDonorForm) {
      if (!newDonorData.name.trim()) {
        alert('Please enter a donor name');
        return;
      }

      const nameParts = newDonorData.name.trim().split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ') || '';
      donorDisplayName = newDonorData.name.trim();

      const newContact = {
        id: `contact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        firstName,
        lastName,
        email: newDonorData.email.trim() || '',
        phone: newDonorData.phone.trim() || '',
        isDonor: true,
        tags: ['Donor'],
        createdAt: new Date().toISOString()
      };

      const allContacts = window.contactsService?.loadContacts() || [];
      allContacts.push(newContact);
      window.contactsService?.saveContactsToLS(allContacts);

      contactId = newContact.id;

      if (window.showToast) {
        window.showToast(`✅ New donor "${donorDisplayName}" created`, 'success');
      }
    } else {
      if (!contactId) {
        alert('Please select a donor');
        return;
      }
      const donor = contacts.find(c => c.id === contactId);
      donorDisplayName = donor ? `${donor.firstName} ${donor.lastName}`.trim() : 'Donor';
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    const selectedCampaign = campaigns.find(c => c.id === formData.campaignId);
    const donation = {
      contactId,
      donationType: 'monetary',
      amount: parseFloat(formData.amount),
      date: formData.date,
      paymentMethod: formData.paymentMethod,
      campaignId: formData.campaignId || null,
      campaignName: selectedCampaign?.name || null,
      notes: formData.notes || null,
      recurringType: 'One-Time',
      restrictionType: formData.restrictionType || 'unrestricted',
      restrictionPurpose: formData.restrictionType === 'restricted' ? formData.restrictionPurpose : null,
      designatedProductionId: formData.restrictionType === 'production-specific' ? formData.designatedProductionId : null,
      allocations: []
    };

    console.log('💾 Saving donation:', donation);
    try {
      const saved = window.donationsService?.addDonation(donation);
      console.log('✅ Donation saved successfully:', saved);
    } catch (err) {
      console.error('❌ donationsService.addDonation threw an error:', err.message);
      alert(`Failed to save donation: ${err.message}`);
      return;
    }

    if (window.showToast) {
      window.showToast(`✅ $${parseFloat(formData.amount).toLocaleString()} donation from ${donorDisplayName} recorded`, 'success');
    }

    console.log('💾 Calling onSave callback:', typeof onSave);
    if (onSave) {
      console.log('✅ Executing onSave...');
      onSave(donation);
    } else {
      console.log('⚠️ No onSave callback provided');
    }

    console.log('🚪 Closing modal...');
    onClose();
    console.log('✨ handleSubmit complete');
  };

  const field = (key, value) => setFormData(prev => ({ ...prev, [key]: value }));
  const newDonorField = (key, value) => setNewDonorData(prev => ({ ...prev, [key]: value }));

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-2xl font-bold text-gray-900">Add Donation</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Donor */}
          <div>
            <label htmlFor="donation-donor" className="block text-sm font-medium text-gray-700 mb-1">Donor *</label>
            <select
              id="donation-donor"
              value={formData.contactId}
              onChange={e => {
                if (e.target.value === '__new__') {
                  setShowNewDonorForm(true);
                  setFormData(prev => ({ ...prev, contactId: '' }));
                } else {
                  setShowNewDonorForm(false);
                  field('contactId', e.target.value);
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="">Select donor...</option>
              {contacts.map(c => (
                <option key={c.id} value={c.id}>
                  {`${c.firstName} ${c.lastName}`.trim()}
                  {c.organization ? ` (${c.organization})` : ''}
                </option>
              ))}
              <option value="__new__">+ Add New Donor</option>
            </select>
          </div>

          {/* Inline new donor form */}
          {showNewDonorForm && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-blue-900 text-sm">New Donor</h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowNewDonorForm(false);
                    setNewDonorData({ name: '', email: '', phone: '' });
                  }}
                  className="text-blue-600 hover:text-blue-800 text-xs underline"
                >
                  Cancel
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={newDonorData.name}
                  onChange={e => newDonorField('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Jane Smith"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={newDonorData.email}
                  onChange={e => newDonorField('email', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="jane@example.com"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={newDonorData.phone}
                  onChange={e => newDonorField('phone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="(555) 123-4567"
                />
              </div>

              <p className="text-xs text-blue-600 italic">
                This donor will be created when you click "Add Donation"
              </p>
            </div>
          )}

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-gray-500 font-medium">$</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={formData.amount}
                onChange={e => field('amount', e.target.value)}
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="0.00"
                required
              />
            </div>
          </div>

          {/* Date */}
          <div>
            <label htmlFor="donation-date" className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
            <input
              id="donation-date"
              type="date"
              value={formData.date}
              onChange={e => field('date', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              required
            />
          </div>

          {/* Payment Method */}
          <div>
            <label htmlFor="donation-payment" className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
            <select
              id="donation-payment"
              value={formData.paymentMethod}
              onChange={e => field('paymentMethod', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="Check">Check</option>
              <option value="Cash">Cash</option>
              <option value="Credit Card">Credit Card</option>
              <option value="Wire Transfer">Wire Transfer</option>
              <option value="Online Platform">Online Platform</option>
            </select>
          </div>

          {/* Campaign */}
          <div>
            <label htmlFor="donation-campaign" className="block text-sm font-medium text-gray-700 mb-1">Campaign (Optional)</label>
            <select
              id="donation-campaign"
              value={formData.campaignId}
              onChange={e => field('campaignId', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="">No campaign</option>
              {campaigns.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={e => field('notes', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 h-20 resize-none"
              placeholder="Additional notes about this donation..."
            />
          </div>

          {/* Restriction Type */}
          <div>
            <label htmlFor="donation-restriction-type" className="block text-sm font-medium text-gray-700 mb-1">Donation Type</label>
            <select
              id="donation-restriction-type"
              value={formData.restrictionType}
              onChange={e => {
                const val = e.target.value;
                field('restrictionType', val);
                if (val !== 'restricted') field('restrictionPurpose', '');
                if (val !== 'production-specific') field('designatedProductionId', '');
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="unrestricted">Unrestricted — Can be used for any purpose</option>
              <option value="production-specific">Production-Specific — Designated for a specific production</option>
              <option value="restricted">Restricted — Must be used for specific purpose only</option>
            </select>
          </div>

          {/* Production Selection (if production-specific) */}
          {formData.restrictionType === 'production-specific' && (
            <div>
              <label htmlFor="donation-production" className="block text-sm font-medium text-gray-700 mb-1">
                Designated Production <span className="text-red-500">*</span>
              </label>
              <select
                id="donation-production"
                value={formData.designatedProductionId}
                onChange={e => field('designatedProductionId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                required
              >
                <option value="">— Select Production —</option>
                {productions.map(prod => (
                  <option key={prod.id} value={prod.id}>{prod.title}</option>
                ))}
              </select>
            </div>
          )}

          {/* Restriction Purpose (if restricted) */}
          {formData.restrictionType === 'restricted' && (
            <div>
              <label htmlFor="donation-restriction-purpose" className="block text-sm font-medium text-gray-700 mb-1">
                Restriction Purpose <span className="text-red-500">*</span>
              </label>
              <input
                id="donation-restriction-purpose"
                type="text"
                value={formData.restrictionPurpose}
                onChange={e => field('restrictionPurpose', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="e.g., New Theatre Seating, Scholarship Fund"
                required
              />
              <p className="text-xs text-amber-600 mt-1">
                ⚠️ Restricted donations cannot be allocated to general production budgets
              </p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              Add Donation
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

window.AddDonationModal = AddDonationModal;
