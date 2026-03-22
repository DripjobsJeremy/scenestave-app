const { useState, useEffect } = React;

const getExperienceLevelColor = (level) => {
  const colors = {
    'beginner': 'bg-green-100 text-green-700',
    'intermediate': 'bg-blue-100 text-blue-700',
    'advanced': 'bg-purple-100 text-purple-700',
    'professional': 'bg-orange-100 text-orange-700'
  };
  return colors[level?.toLowerCase()] || 'bg-gray-100 text-gray-700';
};

function ActorRoster({ onViewActor, onAddActor }) {
  const [actors, setActors] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('cards'); // cards, table
  const [filters, setFilters] = useState({
    experienceLevel: 'all',
    hasResume: 'all',
    hasHeadshot: 'all',
    hasVideo: 'all',
    unionAffiliation: 'all',
    contractPreference: 'all'
  });

  useEffect(() => {
    loadActors();
  }, []);

  const loadActors = () => {
    const loaded = window.actorsService?.loadActors() || [];
    setActors(loaded);
  };

  const handleDeleteActor = (actorId) => {
    if (!confirm('Delete this actor? This will remove them from all productions.')) return;

    window.actorsService.deleteActor(actorId);
    loadActors();
  };

  const getFilteredActors = () => {
    return actors.filter(actor => {
      // Search filter
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        actor.firstName?.toLowerCase().includes(searchLower) ||
        actor.lastName?.toLowerCase().includes(searchLower) ||
        actor.email?.toLowerCase().includes(searchLower);

      if (!matchesSearch) return false;

      // Experience level filter
      if (filters.experienceLevel !== 'all') {
        if (actor.actorProfile?.experienceLevel?.toLowerCase() !== filters.experienceLevel.toLowerCase()) return false;
      }

      // Has resume filter
      if (filters.hasResume === 'yes' && !actor.actorProfile?.resume) return false;
      if (filters.hasResume === 'no' && actor.actorProfile?.resume) return false;

      // Has headshot filter
      if (filters.hasHeadshot === 'yes' && (!actor.actorProfile?.headshots || actor.actorProfile.headshots.length === 0)) return false;
      if (filters.hasHeadshot === 'no' && actor.actorProfile?.headshots?.length > 0) return false;

      // Has video filter
      if (filters.hasVideo === 'yes' && (!actor.actorProfile?.auditionVideos || actor.actorProfile.auditionVideos.length === 0)) return false;
      if (filters.hasVideo === 'no' && actor.actorProfile?.auditionVideos?.length > 0) return false;

      // Union filter
      if (filters.unionAffiliation && filters.unionAffiliation !== 'all') {
        const unions = actor.actorProfile?.unionAffiliation || [];
        if (filters.unionAffiliation === 'non-union') {
          if (unions.length > 0 && !unions.includes('Non-Union')) return false;
        } else if (filters.unionAffiliation === 'union-any') {
          const hasActualUnion = unions.some(u => u !== 'Non-Union');
          if (!hasActualUnion) return false;
        } else {
          if (!unions.includes(filters.unionAffiliation)) return false;
        }
      }

      // Contract preference filter
      if (filters.contractPreference && filters.contractPreference !== 'all') {
        if (actor.actorProfile?.contractPreference !== filters.contractPreference) return false;
      }

      return true;
    });
  };

  const filteredActors = getFilteredActors();

  // Actor Card Component
  const ActorCard = ({ actor }) => {
    const stats = window.actorsService.getActorStats(actor.id);
    const primaryHeadshot = actor.actorProfile?.headshots?.find(h => h.isPrimary);

    const handleHeadshotClick = () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          const base64 = ev.target.result;
          const existingHeadshots = (actor.actorProfile?.headshots || []).map(h => ({ ...h, isPrimary: false }));
          const newHeadshot = { id: Date.now().toString(), data: base64, isPrimary: true, filename: file.name };
          window.actorsService.updateActor(actor.id, {
            actorProfile: { ...(actor.actorProfile || {}), headshots: [...existingHeadshots, newHeadshot] }
          });
          if (window.showToast) window.showToast('Headshot updated', 'success', 2000);
          loadActors();
        };
        reader.readAsDataURL(file);
      };
      input.click();
    };

    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow">
        {/* Headshot */}
        <div className="flex items-start gap-4 mb-3">
          <div className="relative group w-20 h-20 bg-gray-200 rounded-lg flex-shrink-0 overflow-hidden cursor-pointer" onClick={handleHeadshotClick}>
            {primaryHeadshot ? (
              <img src={primaryHeadshot.data} alt={`${actor.firstName} ${actor.lastName}`} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 text-2xl">
                👤
              </div>
            )}
            {/* Hover overlay — empty state */}
            {!primaryHeadshot && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                <span className="text-white text-lg leading-none">📷</span>
                <span className="text-white text-xs font-medium mt-1">Add Photo</span>
              </div>
            )}
            {/* Hover overlay — has headshot */}
            {primaryHeadshot && (
              <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                <span className="text-white text-xs font-medium">Change</span>
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg text-gray-900 truncate">
              {actor.firstName} {actor.lastName}
            </h3>
            <p className="text-sm text-gray-600 truncate">{actor.email}</p>
            {actor.actorProfile?.experienceLevel && (
              <span className={`inline-block mt-1 px-2 py-1 text-xs rounded font-medium capitalize ${getExperienceLevelColor(actor.actorProfile.experienceLevel)}`}>
                {actor.actorProfile.experienceLevel}
              </span>
            )}
            {actor.actorProfile?.credentials?.accountStatus === 'pending' && (
              <span className="inline-block mt-1 ml-2 px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded">
                Pending
              </span>
            )}
            {actor.actorProfile?.credentials?.accountStatus === 'suspended' && (
              <span className="inline-block mt-1 ml-2 px-2 py-1 bg-red-100 text-red-700 text-xs rounded">
                Suspended
              </span>
            )}
            {(() => {
              const unions = Array.isArray(actor.actorProfile?.unionAffiliation) ? actor.actorProfile.unionAffiliation : [];
              const contractPref = actor.actorProfile?.contractPreference;
              const contractBadges = {
                'union-only': { text: 'Union Only', color: 'bg-blue-100 text-blue-700' },
                'non-union-only': { text: 'Non-Union Only', color: 'bg-gray-100 text-gray-700' },
                'union-and-non-union': { text: 'Union & Non-Union', color: 'bg-green-100 text-green-700' },
                'open-to-all': { text: 'Open to All', color: 'bg-purple-100 text-purple-700' }
              };
              if (unions.length === 0 || unions.includes('Non-Union')) {
                return (
                  <span className="inline-block mt-2 px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full font-medium">
                    Non-Union
                  </span>
                );
              }
              return (
                <div className="flex flex-wrap gap-1 mt-2">
                  {unions.map((union, idx) => (
                    <span key={idx} className="inline-flex items-center px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded-full font-medium whitespace-nowrap">
                      {union}
                    </span>
                  ))}
                  {contractPref && contractBadges[contractPref] && (
                    <span className={`inline-flex items-center px-2 py-1 text-xs rounded-full font-medium whitespace-nowrap ${contractBadges[contractPref].color}`}>
                      {contractBadges[contractPref].text}
                    </span>
                  )}
                </div>
              );
            })()}
          </div>
        </div>

        {/* Stats Icons */}
        <div className="flex gap-1.5 mb-3">
          {stats?.hasResume && (
            <span
              className="w-7 h-7 flex items-center justify-center bg-green-100 text-green-700 rounded-full text-base"
              title="Has Resume"
            >
              📄
            </span>
          )}
          {stats?.hasHeadshot && (
            <span
              className="w-7 h-7 flex items-center justify-center bg-purple-100 text-purple-700 rounded-full text-base"
              title="Has Headshot"
            >
              📷
            </span>
          )}
          {stats?.hasAuditionVideo && (
            <span
              className="w-7 h-7 flex items-center justify-center bg-pink-100 text-pink-700 rounded-full text-base"
              title="Has Audition Video"
            >
              🎥
            </span>
          )}
          {stats?.hasSizeCard && (
            <span
              className="w-7 h-7 flex items-center justify-center bg-yellow-100 text-yellow-700 rounded-full text-base"
              title="Has Size Card"
            >
              📏
            </span>
          )}
          {!stats?.hasResume && !stats?.hasHeadshot && !stats?.hasAuditionVideo && !stats?.hasSizeCard && (
            <span className="text-xs text-gray-400 italic py-1">No materials</span>
          )}
        </div>

        {/* Production Count */}
        <div className="text-sm text-gray-600 mb-3">
          {stats?.totalProductions || 0} production{stats?.totalProductions !== 1 ? 's' : ''}
          {stats?.activeProductions > 0 && (
            <span className="ml-2 text-green-600 font-medium">
              ({stats.activeProductions} active)
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => onViewActor?.(actor)}
            className="flex-1 px-3 py-2 bg-violet-600 text-white text-sm rounded hover:bg-violet-700 transition-colors"
          >
            View Profile
          </button>
          <button
            onClick={() => handleDeleteActor(actor.id)}
            className="px-3 py-2 bg-red-100 text-red-700 text-sm rounded hover:bg-red-200 transition-colors"
          >
            🗑
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Actor Roster</h2>
          <p className="text-gray-600 mt-1">
            {filteredActors.length} of {actors.length} actor{actors.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => onAddActor ? onAddActor() : alert('Add actor function not available')}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          title="Create minimal account - actor completes profile via Actor Portal"
        >
          + Add Actor
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
            />
          </div>

          {/* Experience Level Filter */}
          <div>
            <select
              title="Experience Level"
              value={filters.experienceLevel}
              onChange={(e) => setFilters({ ...filters, experienceLevel: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
            >
              <option value="all">All Experience</option>
              <option value="beginner">🟢 Beginner</option>
              <option value="intermediate">🔵 Intermediate</option>
              <option value="advanced">🟣 Advanced</option>
              <option value="professional">🟠 Professional</option>
            </select>
          </div>

          {/* Has Resume Filter */}
          <div>
            <select
              title="Resume Filter"
              value={filters.hasResume}
              onChange={(e) => setFilters({ ...filters, hasResume: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
            >
              <option value="all">Resume: Any</option>
              <option value="yes">Has Resume</option>
              <option value="no">No Resume</option>
            </select>
          </div>

          {/* Has Headshot Filter */}
          <div>
            <select
              title="Headshot Filter"
              value={filters.hasHeadshot}
              onChange={(e) => setFilters({ ...filters, hasHeadshot: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
            >
              <option value="all">Headshot: Any</option>
              <option value="yes">Has Headshot</option>
              <option value="no">No Headshot</option>
            </select>
          </div>

          {/* Union Filter */}
          <div>
            <select
              title="Union Filter"
              value={filters.unionAffiliation}
              onChange={(e) => setFilters({ ...filters, unionAffiliation: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-sm"
            >
              <option value="all">Union: All Actors</option>
              <option value="non-union">Non-Union Only</option>
              <option value="union-any">Any Union Member</option>
              <optgroup label="Stage &amp; Theatre">
                <option value="AEA">AEA</option>
                <option value="AEA-EMC">AEA - Equity Eligible (EMC)</option>
                <option value="CAEA">CAEA - Canadian Equity</option>
                <option value="UK-Equity">UK Equity</option>
              </optgroup>
              <optgroup label="Film &amp; Television">
                <option value="SAG-AFTRA">SAG-AFTRA</option>
                <option value="SAG-AFTRA-Eligible">SAG-AFTRA Eligible</option>
              </optgroup>
              <optgroup label="Opera &amp; Dance">
                <option value="AGMA">AGMA</option>
              </optgroup>
              <optgroup label="Variety &amp; Other">
                <option value="AGVA">AGVA</option>
              </optgroup>
            </select>
          </div>

          {/* Contract Preference Filter */}
          <div>
            <select
              title="Contract Preference Filter"
              value={filters.contractPreference}
              onChange={(e) => setFilters({ ...filters, contractPreference: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-sm"
            >
              <option value="all">Contract: Any</option>
              <option value="union-only">Union Only</option>
              <option value="non-union-only">Non-Union Only</option>
              <option value="union-and-non-union">Union & Non-Union</option>
              <option value="open-to-all">Open to All</option>
            </select>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex justify-end mt-4">
          <div className="flex border border-gray-300 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-4 py-2 text-sm ${viewMode === 'cards' ? 'bg-violet-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
            >
              📇 Cards
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-4 py-2 text-sm border-l border-gray-300 ${viewMode === 'table' ? 'bg-violet-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
            >
              📋 Table
            </button>
          </div>
        </div>
      </div>

      {/* Actor List */}
      {filteredActors.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-500 text-lg mb-2">No actors found</p>
          <p className="text-gray-400 text-sm">
            {actors.length === 0
              ? 'Click "+ Add Actor" to get started'
              : 'Try adjusting your search or filters'}
          </p>
        </div>
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredActors.map(actor => (
            <ActorCard key={actor.id} actor={actor} />
          ))}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Name</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Email</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Experience</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Union</th>
                <th className="text-center px-4 py-3 text-sm font-semibold text-gray-700">Materials</th>
                <th className="text-center px-4 py-3 text-sm font-semibold text-gray-700">Productions</th>
                <th className="text-right px-4 py-3 text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredActors.map((actor, index) => {
                const stats = window.actorsService.getActorStats(actor.id);
                return (
                  <tr key={actor.id} className={`border-b border-gray-200 hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">
                        {actor.firstName} {actor.lastName}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{actor.email}</td>
                    <td className="px-4 py-3">
                      {actor.actorProfile?.experienceLevel && (
                        <span className={`px-2 py-1 text-xs rounded font-medium capitalize ${getExperienceLevelColor(actor.actorProfile.experienceLevel)}`}>
                          {actor.actorProfile.experienceLevel}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {(() => {
                        const unions = Array.isArray(actor.actorProfile?.unionAffiliation) ? actor.actorProfile.unionAffiliation : [];
                        const contractPref = actor.actorProfile?.contractPreference;
                        const contractBadges = {
                          'union-only': { text: 'Union Only', color: 'bg-blue-100 text-blue-700' },
                          'non-union-only': { text: 'Non-Union Only', color: 'bg-gray-100 text-gray-700' },
                          'union-and-non-union': { text: 'Union & Non-Union', color: 'bg-green-100 text-green-700' },
                          'open-to-all': { text: 'Open to All', color: 'bg-purple-100 text-purple-700' }
                        };
                        if (unions.length === 0 || unions.includes('Non-Union')) {
                          return <span className="text-gray-400 text-xs">Non-Union</span>;
                        }
                        return (
                          <div className="flex flex-wrap gap-1">
                            {unions.map((union, idx) => (
                              <span key={idx} className="inline-flex items-center px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded-full font-medium whitespace-nowrap">
                                {union}
                              </span>
                            ))}
                            {contractPref && contractBadges[contractPref] && (
                              <span className={`inline-flex items-center px-2 py-1 text-xs rounded-full font-medium whitespace-nowrap ${contractBadges[contractPref].color}`}>
                                {contractBadges[contractPref].text}
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center gap-1">
                        {stats?.hasResume && <span title="Has Resume">📄</span>}
                        {stats?.hasHeadshot && <span title="Has Headshot">📷</span>}
                        {stats?.hasAuditionVideo && <span title="Has Video">🎥</span>}
                        {stats?.hasSizeCard && <span title="Has Size Card">📏</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-600">
                      {stats?.totalProductions || 0}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => onViewActor?.(actor)}
                          className="px-3 py-1 bg-violet-600 text-white text-xs rounded hover:bg-violet-700"
                        >
                          View
                        </button>
                      </div>
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

window.ActorRoster = ActorRoster;
