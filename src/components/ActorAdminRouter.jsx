const { useState, useEffect } = React;

function PendingApprovalsView({ onApprove, onReject }) {
  const [pendingActors, setPendingActors] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPendingActors();
  }, []);

  const loadPendingActors = () => {
    const pending = window.actorAuthService?.getPendingActors() || [];
    setPendingActors(pending);
  };

  const handleApprove = async (actorId) => {
    if (!confirm('Approve this actor account?')) return;

    setLoading(true);
    try {
      window.actorAuthService.approveActorAccount(actorId);
      loadPendingActors();
      if (onApprove) onApprove();
    } catch (error) {
      alert('Error approving account: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (actorId) => {
    if (!confirm('Reject and delete this actor account? This cannot be undone.')) return;

    setLoading(true);
    try {
      window.actorsService.deleteActor(actorId);
      loadPendingActors();
      if (onReject) onReject();
    } catch (error) {
      alert('Error rejecting account: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Pending Approvals</h2>
          <p className="text-gray-600 mt-1">
            {pendingActors.length} account{pendingActors.length !== 1 ? 's' : ''} awaiting approval
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Actors complete their own profiles after approval
          </p>
        </div>
      </div>

      {pendingActors.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-500 text-lg mb-2">No pending approvals</p>
          <p className="text-gray-400 text-sm">All actor accounts have been reviewed</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingActors.map(actor => (
            <div key={actor.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                {/* Actor Info */}
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {actor.firstName} {actor.lastName}
                  </h3>
                  <p className="text-gray-600">{actor.email}</p>
                  {actor.phone && <p className="text-gray-600">{actor.phone}</p>}

                  <div className="flex gap-2 mt-2">
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                      Pending Approval
                    </span>
                    {actor.actorProfile?.credentials?.accountCreated && (
                      <span className="text-xs text-gray-500">
                        Signed up {new Date(actor.actorProfile.credentials.accountCreated).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(actor.id)}
                    disabled={loading}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(actor.id)}
                    disabled={loading}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const getExperienceLevelColor = (level) => {
  const colors = {
    'beginner': 'bg-green-100 text-green-700',
    'intermediate': 'bg-blue-100 text-blue-700',
    'advanced': 'bg-purple-100 text-purple-700',
    'professional': 'bg-orange-100 text-orange-700'
  };
  return colors[level?.toLowerCase()] || 'bg-gray-100 text-gray-700';
};

function ActorProfileViewModal({ actor, onClose }) {
  const [activeTab, setActiveTab] = useState('contact');
  const profile = actor.actorProfile || {};
  const stats = window.actorsService?.getActorStats(actor.id);
  const primaryHeadshot = profile.headshots?.find(h => h.isPrimary) || profile.headshots?.[0];

  const tabs = [
    { id: 'contact', label: 'Contact Info', icon: '📧' },
    { id: 'materials', label: 'Materials', icon: '📁' },
    { id: 'sizes', label: 'Size Card', icon: '📏' },
    { id: 'skills', label: 'Skills', icon: '⭐' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header with headshot */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 bg-gray-200 rounded-lg flex-shrink-0 overflow-hidden">
              {primaryHeadshot ? (
                <img src={primaryHeadshot.data} alt={`${actor.firstName} ${actor.lastName}`} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-3xl">👤</div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-2xl font-semibold text-gray-900">
                {actor.firstName} {actor.lastName}
              </h3>
              <p className="text-gray-600">{actor.email}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {profile.experienceLevel && (
                  <span className={`px-2 py-1 text-xs rounded font-medium capitalize ${getExperienceLevelColor(profile.experienceLevel)}`}>
                    {profile.experienceLevel}
                  </span>
                )}
                {profile.credentials?.accountStatus && (
                  <span className={`px-2 py-1 rounded text-xs capitalize ${
                    profile.credentials.accountStatus === 'active' ? 'bg-green-100 text-green-700' :
                    profile.credentials.accountStatus === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {profile.credentials.accountStatus}
                  </span>
                )}
                {(() => {
                  const unions = Array.isArray(profile.unionAffiliation) ? profile.unionAffiliation : [];
                  if (unions.length === 0 || (unions.length === 1 && unions[0] === 'Non-Union')) {
                    return <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">Non-Union</span>;
                  }
                  return unions.map((u, i) => (
                    <span key={i} className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded">{u}</span>
                  ));
                })()}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <div className="flex gap-1 p-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded transition-colors ${
                  activeTab === tab.id
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* Contact Info Tab */}
          {activeTab === 'contact' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">First Name</h4>
                  <p className="text-gray-900">{actor.firstName || '—'}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Last Name</h4>
                  <p className="text-gray-900">{actor.lastName || '—'}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Email</h4>
                  <p className="text-gray-900">{actor.email || '—'}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Phone</h4>
                  <p className="text-gray-900">{actor.phone || '—'}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Experience Level</h4>
                  {profile.experienceLevel ? (
                    <span className={`inline-block px-3 py-1 text-sm rounded font-medium capitalize ${getExperienceLevelColor(profile.experienceLevel)}`}>
                      {profile.experienceLevel}
                    </span>
                  ) : (
                    <p className="text-gray-400">—</p>
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Vocal Range</h4>
                  <p className="text-gray-900">{profile.vocalRange || '—'}</p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">Contract Preference</h4>
                <p className="text-gray-900 capitalize">{(profile.contractPreference || '—').replace(/-/g, ' ')}</p>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">Productions</h4>
                <p className="text-gray-900">
                  {stats?.totalProductions || 0} production{stats?.totalProductions !== 1 ? 's' : ''}
                  {stats?.activeProductions > 0 && (
                    <span className="ml-2 text-green-600 font-medium">({stats.activeProductions} active)</span>
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Materials Tab */}
          {activeTab === 'materials' && (
            <div className="space-y-6">
              {/* Resume Section */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Resume</h4>
                {profile.resume ? (
                  <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <span className="text-3xl">📄</span>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{profile.resume.fileName}</p>
                      <p className="text-sm text-gray-600">
                        {(profile.resume.fileSize / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <a
                      href={profile.resume.data}
                      download={profile.resume.fileName}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Download
                    </a>
                  </div>
                ) : (
                  <p className="text-gray-500 italic">No resume uploaded</p>
                )}
              </div>

              {/* Headshots Section */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-3">
                  Headshots ({profile.headshots?.length || 0})
                </h4>
                {profile.headshots && profile.headshots.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {profile.headshots.map((headshot, idx) => (
                      <div key={headshot.id || idx} className="relative group">
                        <img
                          src={headshot.data}
                          alt={`Headshot ${idx + 1}`}
                          className="w-full aspect-square object-cover rounded-lg border-2 border-gray-300 cursor-pointer hover:border-purple-500 transition-colors"
                          onClick={() => window.open(headshot.data, '_blank')}
                        />
                        {headshot.isPrimary && (
                          <div className="absolute top-2 left-2 px-2 py-1 bg-purple-600 text-white text-xs rounded-full font-medium">
                            Primary
                          </div>
                        )}
                        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <a
                            href={headshot.data}
                            download={headshot.fileName || `headshot-${idx + 1}.jpg`}
                            className="px-2 py-1 bg-white text-gray-700 text-xs rounded shadow hover:bg-gray-100"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Download
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 italic">No headshots uploaded</p>
                )}
              </div>

              {/* Audition Videos Section */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-3">
                  Audition Videos ({profile.auditionVideos?.length || 0})
                </h4>
                {profile.auditionVideos && profile.auditionVideos.length > 0 ? (
                  <div className="space-y-3">
                    {profile.auditionVideos.map((video, idx) => (
                      <div key={video.id || idx} className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-start gap-3 mb-3">
                          <span className="text-3xl">🎥</span>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{video.fileName}</p>
                            <p className="text-sm text-gray-600">
                              {(video.fileSize / 1024 / 1024).toFixed(1)} MB
                              {video.role && ` — ${video.role}`}
                            </p>
                          </div>
                          <a
                            href={video.data}
                            download={video.fileName}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                          >
                            Download
                          </a>
                        </div>
                        {video.data && video.fileType?.startsWith('video/') && (
                          <video
                            controls
                            className="w-full rounded-lg border border-gray-300"
                            style={{ maxHeight: '300px' }}
                          >
                            <source src={video.data} type={video.fileType} />
                            Your browser does not support video playback.
                          </video>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 italic">No audition videos uploaded</p>
                )}
              </div>
            </div>
          )}

          {/* Size Card Tab */}
          {activeTab === 'sizes' && (
            <div className="space-y-4">
              {profile.sizeCard && Object.values(profile.sizeCard).some(v => v && v !== '') ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  {[
                    { label: 'Height', value: profile.sizeCard.height },
                    { label: 'Weight', value: profile.sizeCard.weight },
                    { label: 'Shirt Size', value: profile.sizeCard.shirtSize },
                    { label: 'Pants Size', value: profile.sizeCard.pantsSize },
                    { label: 'Shoe Size', value: profile.sizeCard.shoeSize },
                    { label: 'Jacket Size', value: profile.sizeCard.jacketSize },
                    { label: 'Dress Size', value: profile.sizeCard.dressSize },
                    { label: 'Chest', value: profile.sizeCard.chest },
                    { label: 'Waist', value: profile.sizeCard.waist },
                    { label: 'Inseam', value: profile.sizeCard.inseam }
                  ].map((item, idx) => (
                    <div key={idx}>
                      <h4 className="text-sm font-medium text-gray-500 mb-1">{item.label}</h4>
                      <p className="text-gray-900">{item.value || '—'}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 italic">No size card information provided</p>
              )}
            </div>
          )}

          {/* Skills Tab */}
          {activeTab === 'skills' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Special Skills</h4>
                {profile.specialSkills && profile.specialSkills.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {profile.specialSkills.map((skill, idx) => (
                      <span key={idx} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 italic">No special skills listed</p>
                )}
              </div>

              {profile.conflicts && profile.conflicts.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Conflicts</h4>
                  <div className="flex flex-wrap gap-2">
                    {profile.conflicts.map((conflict, idx) => (
                      <span key={idx} className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm">
                        {conflict}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <p className="text-sm text-gray-600 mb-3 text-center">
            Actors manage their own profiles via the Actor Portal
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function ActorAdminRouter({ userRole }) {
  const [view, setView] = useState('roster'); // roster, import
  const [viewingActor, setViewingActor] = useState(null); // For view modal

  const handleAddActor = () => {
    const firstName = prompt('Actor First Name:');
    if (!firstName) return;

    const lastName = prompt('Actor Last Name:');
    if (!lastName) return;

    const email = prompt('Actor Email:');
    if (!email || !email.includes('@')) {
      alert('Valid email address required');
      return;
    }

    try {
      // Create minimal actor account
      const newActor = window.actorsService.createActor({
        firstName,
        lastName,
        email,
        phone: '',
        actorProfile: {
          credentials: {
            accountStatus: 'active',
            accountCreated: new Date().toISOString()
          }
        }
      });

      // Generate temporary password
      const tempPassword = 'Welcome' + Math.random().toString(36).substr(2, 6) + '1!';
      window.actorAuthService.adminResetPassword(newActor.id, tempPassword);

      alert(`Actor account created!\n\nSend these credentials to ${firstName} ${lastName}:\n\nEmail: ${email}\nTemporary Password: ${tempPassword}\n\nThey can log in at the Actor Portal to complete their profile.`);

      // Refresh view
      setView('_reload');
      setTimeout(() => setView('roster'), 0);
    } catch (error) {
      alert('Error creating actor: ' + error.message);
    }
  };

  const handleViewActor = (actor) => {
    setViewingActor(actor);
  };

  const handleCloseModals = () => {
    setViewingActor(null);
  };

  const getPendingCount = () => {
    const pending = window.actorAuthService?.getPendingActors() || [];
    return pending.length;
  };

  const navItems = [
    { id: 'roster', label: 'Actor Roster', icon: '👥' },
    { id: 'pending', label: 'Pending Approvals', icon: '⏳', badge: getPendingCount() },
    { id: 'import', label: 'Import CSV', icon: '📥' }
  ];

  return (
    <div className="space-y-4" aria-label="Actor Admin Router">
      {/* Navigation Tabs */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
        <div className="flex flex-wrap gap-2">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`relative px-4 py-2 rounded text-sm font-medium transition-colors border ${
                view === item.id
                  ? 'bg-purple-600 text-white border-purple-600 shadow'
                  : 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
              } focus:outline-none focus:ring-2 focus:ring-purple-400`}
              aria-label={`${item.label} View`}
            >
              {item.icon} {item.label}
              {item.badge > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="bg-white border border-gray-200 rounded-lg">
        {view === 'roster' && window.ActorRoster && (
          React.createElement(window.ActorRoster, {
            onViewActor: handleViewActor,
            onAddActor: handleAddActor
          })
        )}

        {view === 'pending' && (
          <PendingApprovalsView
            onApprove={() => setView('pending')}
            onReject={() => setView('pending')}
          />
        )}

        {view === 'import' && window.ActorImportCSV && (
          React.createElement(window.ActorImportCSV, {
            onImportComplete: () => {
              setView('_reload');
              setTimeout(() => setView('roster'), 0);
            }
          })
        )}
      </div>

      {/* View Actor Modal */}
      {viewingActor && (
        <ActorProfileViewModal actor={viewingActor} onClose={handleCloseModals} />
      )}
    </div>
  );
}

window.ActorAdminRouter = ActorAdminRouter;
