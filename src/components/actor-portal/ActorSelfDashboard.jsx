const { useState, useEffect } = React;

function ActorSelfDashboard({ actor, onEditProfile, onLogout }) {
  const [productions, setProductions] = useState([]);

  useEffect(() => {
    loadProductions();
  }, [actor]);

  const loadProductions = () => {
    const allProductions = JSON.parse(localStorage.getItem('showsuite_productions') || '[]');
    const actorProductions = allProductions.filter(prod =>
      prod.characters?.some(char => char.actorId === actor.id)
    );
    setProductions(actorProductions);
  };

  const getMyCharacters = (production) => {
    return production.characters?.filter(char => char.actorId === actor.id) || [];
  };

  const stats = window.actorsService?.getActorStats(actor.id);

  // Profile completion checklist
  const checklistItems = [
    { key: 'bio', label: 'Bio', complete: !!actor.actorProfile?.bio },
    { key: 'phone', label: 'Phone', complete: !!actor.phone },
    { key: 'pronouns', label: 'Pronouns', complete: !!actor.actorProfile?.pronouns },
    { key: 'headshot', label: 'Headshot', complete: actor.actorProfile?.headshots?.length > 0 },
    { key: 'experience', label: 'Experience', complete: !!actor.actorProfile?.experienceLevel },
    { key: 'training', label: 'Training', complete: actor.actorProfile?.training?.length > 0 },
    { key: 'skills', label: 'Skills', complete: actor.actorProfile?.specialSkills?.length > 0 },
    { key: 'resume', label: 'Resume', complete: !!actor.actorProfile?.resume }
  ];

  const totalItems = checklistItems.length;
  const completedItems = checklistItems.filter(item => item.complete);
  const profileCompletion = Math.round((completedItems.length / totalItems) * 100);

  const milestones = [
    { value: 0,   label: 'Start',       posClass: 'left-0' },
    { value: 25,  label: 'Basic Info',  posClass: 'left-1/4 -translate-x-1/2' },
    { value: 50,  label: 'Half Way',    posClass: 'left-1/2 -translate-x-1/2' },
    { value: 75,  label: 'Almost Done', posClass: 'left-3/4 -translate-x-1/2' },
    { value: 100, label: 'Complete',    posClass: 'left-full -translate-x-full' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                Welcome back, {actor.firstName}!
              </h1>
              <p className="text-purple-100">
                {actor.email}
              </p>
            </div>
            <button
              onClick={onLogout}
              className="px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-4 shadow">
            <div className="text-3xl mb-2">🎬</div>
            <div className="text-2xl font-bold text-gray-900">{stats?.totalProductions || 0}</div>
            <div className="text-sm text-gray-600">Productions</div>
            {stats?.activeProductions > 0 && (
              <div className="text-xs text-green-600 mt-1">
                {stats.activeProductions} active
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg p-4 shadow">
            <div className="text-3xl mb-2">📄</div>
            <div className="text-2xl font-bold text-gray-900">
              {stats?.hasResume ? '✓' : '✗'}
            </div>
            <div className="text-sm text-gray-600">Resume</div>
            {!stats?.hasResume && (
              <div className="text-xs text-orange-600 mt-1">Not uploaded</div>
            )}
          </div>

          <div className="bg-white rounded-lg p-4 shadow">
            <div className="text-3xl mb-2">📷</div>
            <div className="text-2xl font-bold text-gray-900">
              {actor.actorProfile?.headshots?.length || 0}
            </div>
            <div className="text-sm text-gray-600">Headshots</div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow">
            <div className="text-3xl mb-2">📏</div>
            <div className="text-2xl font-bold text-gray-900">
              {stats?.hasSizeCard ? '✓' : '✗'}
            </div>
            <div className="text-sm text-gray-600">Size Card</div>
            {!stats?.hasSizeCard && (
              <div className="text-xs text-orange-600 mt-1">Not complete</div>
            )}
          </div>
        </div>

        {/* Profile Completion - Compact Design */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Profile Completion</h3>
              <p className="text-sm text-gray-600 mt-1">
                {profileCompletion}% complete &bull; {completedItems.length} of {totalItems} items
              </p>
            </div>
            <button
              type="button"
              onClick={onEditProfile}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Update Profile
            </button>
          </div>

          {/* Progress Bar with Milestone Dots */}
          <div className="relative">
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-600 to-indigo-600 transition-all duration-500 rounded-full"
                style={{ width: `${profileCompletion}%` }}
              />
            </div>
            {/* Milestone marker dots overlaid on the bar */}
            <div className="absolute top-0 left-0 right-0 h-3 pointer-events-none">
              {milestones.map((milestone) => {
                const isReached = profileCompletion >= milestone.value;
                return (
                  <div
                    key={milestone.label}
                    className={`absolute top-0 ${milestone.posClass}`}
                    title={milestone.label}
                  >
                    <div className={`w-3 h-3 rounded-full border-2 transition-all duration-300 ${
                      isReached ? 'bg-white border-purple-700' : 'bg-white border-gray-300'
                    }`} />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Milestone Labels */}
          <div className="flex justify-between mt-5">
            {milestones.map((milestone) => {
              const isReached = profileCompletion >= milestone.value;
              return (
                <div key={milestone.label} className="w-1/5 flex flex-col items-center">
                  <div className={`text-xs font-bold mb-0.5 ${isReached ? 'text-purple-600' : 'text-gray-300'}`}>
                    {isReached ? '✓' : '○'}
                  </div>
                  <div className={`text-xs text-center leading-tight ${isReached ? 'text-gray-800 font-medium' : 'text-gray-400'}`}>
                    {milestone.label}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Checklist - 2-column compact grid */}
          <div className="mt-5 grid grid-cols-2 gap-2">
            {checklistItems.map(item => (
              <div
                key={item.key}
                className={`flex items-center gap-2 text-sm ${item.complete ? 'text-gray-700' : 'text-gray-400'}`}
              >
                <div className={`flex-shrink-0 w-5 h-5 rounded flex items-center justify-center text-xs font-bold ${
                  item.complete ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                }`}>
                  {item.complete ? '✓' : '○'}
                </div>
                <span className={item.complete ? 'font-medium' : ''}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Current Productions */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">My Productions</h2>

          {productions.length === 0 ? (
            <div className="bg-white rounded-lg p-12 shadow text-center">
              <p className="text-gray-500 text-lg mb-2">No productions yet</p>
              <p className="text-gray-400 text-sm">
                You'll see your productions here when you're cast in a role
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {productions.map(production => {
                const myCharacters = getMyCharacters(production);
                const isActive = production.status !== 'Completed';

                return (
                  <div key={production.id} className="bg-white rounded-lg p-6 shadow hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">{production.title}</h3>
                        {production.director && (
                          <p className="text-sm text-gray-600">Director: {production.director}</p>
                        )}
                      </div>
                      {isActive && (
                        <span className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                          Active
                        </span>
                      )}
                    </div>

                    {/* My Roles */}
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">My Role{myCharacters.length !== 1 ? 's' : ''}:</h4>
                      <div className="flex flex-wrap gap-2">
                        {myCharacters.map((char, idx) => (
                          <span key={idx} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full font-medium">
                            {char.name}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Production Details */}
                    <div className="space-y-2 text-sm text-gray-600">
                      {production.performanceDates && (
                        <div className="flex items-center gap-2">
                          <span>{production.performanceDates}</span>
                        </div>
                      )}
                      {production.venue && (
                        <div className="flex items-center gap-2">
                          <span>{production.venue}</span>
                        </div>
                      )}
                      {production.scenes?.length > 0 && (
                        <div className="flex items-center gap-2">
                          <span>{production.scenes.length} scenes</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg p-6 shadow">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={onEditProfile}
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors text-left"
            >
              <div className="text-2xl mb-2">✏️</div>
              <div className="font-medium text-gray-900">Update Profile</div>
              <div className="text-sm text-gray-600">Edit info, upload materials</div>
            </button>

            <button
              onClick={() => { if (window.onNavigateToCalendar) window.onNavigateToCalendar(); }}
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors text-left"
            >
              <div className="text-2xl mb-2">📅</div>
              <div className="font-medium text-gray-900">My Calendar</div>
              <div className="text-sm text-gray-600">View rehearsals & shows</div>
            </button>

            <button
              onClick={() => alert('Need help? Contact your theatre administrator.')}
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors text-left"
            >
              <div className="text-2xl mb-2">💬</div>
              <div className="font-medium text-gray-900">Get Help</div>
              <div className="text-sm text-gray-600">Contact support</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

window.ActorSelfDashboard = ActorSelfDashboard;
