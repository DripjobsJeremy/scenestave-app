const { useState, useEffect } = React;

function CharacterCastList({ production, onUpdate }) {
  const [characters, setCharacters] = useState(production?.characters || []);
  const [actors, setActors] = useState([]);
  const [showActorModal, setShowActorModal] = useState(false);
  const [newActor, setNewActor] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  });
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('showsuite_cast_list_collapsed');
    return saved === 'true';
  });

  // Load actors directly from actorsService instead of contacts
  // to avoid localStorage quota issues with large file uploads
  const loadActors = () => {
    const actorsList = window.actorsService?.loadActors() || [];
    setActors(actorsList);
  };

  useEffect(() => {
    loadActors();
  }, []);

  // Sync with production prop changes
  useEffect(() => {
    setCharacters(production?.characters || []);
  }, [production?.characters]);

  useEffect(() => {
    localStorage.setItem('showsuite_cast_list_collapsed', isCollapsed);
  }, [isCollapsed]);

  const handleAddCharacter = () => {
    const newCharacter = {
      id: 'char_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      name: '',
      actorId: null,
      notes: ''
    };

    const updated = [...characters, newCharacter];
    setCharacters(updated);

    console.log('🎭 Adding new character');

    if (onUpdate) {
      onUpdate({ ...production, characters: updated });
      console.log('✓ Production saved with new character');
    }
  };

  const handleAddActor = () => {
    if (!newActor.firstName || !newActor.lastName) {
      alert('Please enter first and last name');
      return;
    }

    const actorContact = {
      id: 'actor_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      firstName: newActor.firstName,
      lastName: newActor.lastName,
      email: newActor.email || '',
      phone: newActor.phone || '',
      groups: ['Actor'],
      type: 'Actor',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const contacts = JSON.parse(localStorage.getItem('showsuite_contacts') || '[]');
    contacts.push(actorContact);
    localStorage.setItem('showsuite_contacts', JSON.stringify(contacts));

    loadActors();

    setNewActor({ firstName: '', lastName: '', email: '', phone: '' });
    setShowActorModal(false);

    alert(`✓ Added ${actorContact.firstName} ${actorContact.lastName} to Actor Database`);
  };

  const handleAssignActor = (characterId, actorId) => {
    const updated = characters.map(char =>
      char.id === characterId
        ? { ...char, actorId: actorId || null }
        : char
    );
    setCharacters(updated);

    const targetChar = updated.find(c => c.id === characterId);
    console.log('🎭 Assigning actor to character:', {
      character: targetChar?.name,
      actorId: actorId || null,
      production: production.title
    });

    if (onUpdate) {
      onUpdate({ ...production, characters: updated });
      console.log('✓ Production saved with updated cast');
    } else {
      console.error('⚠️ onUpdate callback not provided to CharacterCastList');
    }
  };

  const handleUpdateCharacter = (characterId, field, value) => {
    const updated = characters.map(char =>
      char.id === characterId
        ? { ...char, [field]: value }
        : char
    );
    setCharacters(updated);

    console.log('🎭 Updating character:', { characterId, field, value });

    if (onUpdate) {
      onUpdate({ ...production, characters: updated });
      console.log('✓ Production saved with updated character');
    }
  };

  const handleDeleteCharacter = (characterId) => {
    if (!confirm('Delete this character?')) return;

    const deletedChar = characters.find(c => c.id === characterId);
    const updated = characters.filter(char => char.id !== characterId);
    setCharacters(updated);

    console.log('🎭 Deleting character:', deletedChar?.name);

    if (onUpdate) {
      onUpdate({ ...production, characters: updated });
      console.log('✓ Production saved after character deletion');
    }
  };

  const castCount = characters.filter(c => c.actorId).length;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4 transition-all duration-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-gray-500 hover:text-gray-700 transition-colors"
            title={isCollapsed ? 'Expand Cast List' : 'Collapse Cast List'}
          >
            {isCollapsed ? '▶' : '▼'}
          </button>
          <h3 className="text-lg font-semibold text-gray-900">🎭 Cast List</h3>
          {isCollapsed && (
            <span className="text-sm text-gray-600">
              ({castCount} of {characters.length} roles cast)
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowActorModal(true)}
            className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
            title="Add new actor to contact database"
          >
            + Add Actor
          </button>
          <button
            onClick={handleAddCharacter}
            className="px-4 py-2 bg-violet-600 text-white text-sm rounded-lg hover:bg-violet-700 transition-colors"
          >
            + Add Character
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <>
          {characters.length > 0 && (
            <div className="flex items-center gap-3 mb-2 px-3 pb-2 border-b border-gray-200">
              <div className="flex-1">
                <span className="text-xs font-semibold text-violet-600 uppercase tracking-wide">ROLE</span>
              </div>
              <div className="w-56">
                <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">ACTOR</span>
              </div>
              <div className="w-20"></div>
            </div>
          )}

          {characters.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <p className="text-gray-500 font-medium">No characters defined yet</p>
              <p className="text-gray-400 text-sm mt-1">Click "+ Add Character" to start building your cast</p>
            </div>
          ) : (
            <div className="space-y-2">
              {characters.map((char) => (
                <div
                  key={char.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                >
                  <div className="flex-1 flex items-center">
                    <div className="w-1 h-8 bg-violet-400 rounded-full mr-3"></div>
                    <input
                      type="text"
                      value={char.name}
                      onChange={(e) => handleUpdateCharacter(char.id, 'name', e.target.value)}
                      placeholder="Character name"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                    />
                  </div>

                  <div className="flex items-center">
                    <div className="w-1 h-8 bg-emerald-400 rounded-full mr-3"></div>
                    <select
                      value={char.actorId || ''}
                      onChange={(e) => handleAssignActor(char.id, e.target.value)}
                      className="w-52 px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    >
                      <option value="">-- Select Actor --</option>
                      {actors.map(actor => {
                        const actorName = actor.firstName && actor.lastName
                          ? `${actor.firstName} ${actor.lastName}`
                          : actor.name || actor.displayName || 'Unknown';
                        return (
                          <option key={actor.id} value={actor.id}>
                            {actorName}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {char.actorId ? (
                    <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full whitespace-nowrap">
                      ✓ Cast
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-gray-100 text-gray-500 text-xs font-medium rounded-full whitespace-nowrap">
                      Uncast
                    </span>
                  )}

                  <button
                    onClick={() => handleDeleteCharacter(char.id)}
                    title="Delete character"
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  >
                    🗑
                  </button>
                </div>
              ))}
            </div>
          )}

          {characters.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center text-sm">
              <span className="text-gray-600 font-medium">
                {castCount} of {characters.length} role{characters.length !== 1 ? 's' : ''} cast
              </span>
              {castCount < characters.length && (
                <span className="text-amber-600 font-medium">
                  {characters.length - castCount} role{characters.length - castCount !== 1 ? 's' : ''} uncast
                </span>
              )}
            </div>
          )}
        </>
      )}

      {showActorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowActorModal(false)}>
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-semibold mb-4 text-gray-900">Add New Actor</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                <input
                  type="text"
                  value={newActor.firstName}
                  onChange={(e) => setNewActor({ ...newActor, firstName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="John"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                <input
                  type="text"
                  value={newActor.lastName}
                  onChange={(e) => setNewActor({ ...newActor, lastName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={newActor.email}
                  onChange={(e) => setNewActor({ ...newActor, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={newActor.phone}
                  onChange={(e) => setNewActor({ ...newActor, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowActorModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddActor}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Add Actor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

window.CharacterCastList = CharacterCastList;
