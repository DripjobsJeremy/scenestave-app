/**
 * VenuesSettings Component
 * CRUD management for venues/locations used across the app.
 */

const VENUE_TYPES = [
  { value: 'performance', label: 'Performance Space' },
  { value: 'rehearsal', label: 'Rehearsal Space' },
  { value: 'workshop', label: 'Workshop / Shop' },
  { value: 'classroom', label: 'Classroom' },
  { value: 'office', label: 'Office' },
  { value: 'storage', label: 'Storage' },
  { value: 'other', label: 'Other' }
];

function VenueModal({ venue, onSave, onClose }) {
  const [formData, setFormData] = React.useState({
    name: venue?.name || '',
    capacity: venue?.capacity || '',
    type: venue?.type || 'performance',
    address: venue?.address || '',
    notes: venue?.notes || ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Venue name is required');
      return;
    }
    onSave({ ...formData, capacity: parseInt(formData.capacity) || 0 });
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl font-bold text-gray-900 mb-4">
          {venue ? 'Edit Venue' : 'Add New Venue'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Venue Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
              placeholder="e.g., Main Stage"
              autoFocus
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
              >
                {VENUE_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
              <input
                type="number"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                placeholder="0"
                min="0"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
              placeholder="Building name or street address"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 resize-none"
              rows={3}
              placeholder="Equipment, parking, accessibility notes..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors font-medium"
            >
              {venue ? 'Save Changes' : 'Add Venue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function VenuesSettings() {
  const [venues, setVenues] = React.useState([]);
  const [showModal, setShowModal] = React.useState(false);
  const [editingVenue, setEditingVenue] = React.useState(null);

  React.useEffect(() => {
    refresh();
  }, []);

  const refresh = () => {
    setVenues(window.venuesService?.loadVenues() || []);
  };

  const handleSave = (venueData) => {
    try {
      if (editingVenue) {
        window.venuesService.updateVenue(editingVenue.id, venueData);
      } else {
        window.venuesService.createVenue(venueData);
      }
      refresh();
      setShowModal(false);
      setEditingVenue(null);
    } catch (err) {
      alert('Error saving venue: ' + err.message);
    }
  };

  const handleDelete = (venueId) => {
    if (!confirm('Delete this venue? This cannot be undone.')) return;
    try {
      window.venuesService.deleteVenue(venueId);
      refresh();
    } catch (err) {
      alert('Error deleting venue: ' + err.message);
    }
  };

  const openAdd = () => {
    setEditingVenue(null);
    setShowModal(true);
  };

  const openEdit = (venue) => {
    setEditingVenue(venue);
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Venues &amp; Locations</h2>
          <p className="text-gray-500 mt-1 text-sm">
            Manage performance spaces, rehearsal rooms, and other locations. These appear as options when creating calendar events.
          </p>
        </div>
        <button
          onClick={openAdd}
          className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors font-medium whitespace-nowrap"
        >
          + Add Venue
        </button>
      </div>

      {venues.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-lg border border-dashed border-gray-300">
          <div className="text-5xl mb-3">📍</div>
          <p className="text-gray-500 font-medium">No venues yet</p>
          <p className="text-gray-400 text-sm mt-1">Click "+ Add Venue" to get started</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {venues.map(venue => {
            const typeLabel = VENUE_TYPES.find(t => t.value === venue.type)?.label || venue.type;
            return (
              <div
                key={venue.id}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-semibold text-gray-900">{venue.name}</h3>
                      <span className="px-2 py-0.5 bg-violet-100 text-violet-700 text-xs rounded-full">
                        {typeLabel}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500 space-y-0.5">
                      {venue.capacity > 0 && (
                        <div>👥 Capacity: {venue.capacity.toLocaleString()}</div>
                      )}
                      {venue.address && <div>📍 {venue.address}</div>}
                      {venue.notes && <div className="text-gray-400">📝 {venue.notes}</div>}
                    </div>
                  </div>

                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => openEdit(venue)}
                      className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(venue.id)}
                      className="px-3 py-1.5 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <VenueModal
          venue={editingVenue}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditingVenue(null); }}
        />
      )}
    </div>
  );
}

window.VenuesSettings = VenuesSettings;
