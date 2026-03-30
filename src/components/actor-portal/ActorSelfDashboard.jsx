const { useState, useEffect } = React;

// ── RehearsalNotesView ────────────────────────────────────────────────────────
function RehearsalNotesView({ actor }) {
  const notes = React.useMemo(() => {
    const actors = JSON.parse(localStorage.getItem('showsuite_actors') || '[]');
    const fresh = actors.find(a => a.id === actor.id);
    return (fresh?.rehearsalNotes || []).sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));
  }, [actor.id]);

  const byProduction = React.useMemo(() => {
    const groups = {};
    notes.forEach(note => {
      const key = note.productionId;
      if (!groups[key]) groups[key] = { title: note.productionTitle || 'Production', notes: [] };
      groups[key].notes.push(note);
    });
    return groups;
  }, [notes]);

  if (notes.length === 0) return (
    <div className="ap-rnv-wrap">
      <h1 className="ap-rnv-title">Rehearsal Notes</h1>
      <p className="ap-rnv-subtitle">Director notes tagged to you during rehearsal</p>
      <div className="ap-rnv-empty">
        <div className="ap-rnv-empty-icon">📋</div>
        <p className="ap-rnv-empty-title">No rehearsal notes yet</p>
        <p className="ap-rnv-empty-sub">Your director will add notes here during rehearsal</p>
      </div>
    </div>
  );

  return (
    <div className="ap-rnv-wrap">
      <h1 className="ap-rnv-title">Rehearsal Notes</h1>
      <p className="ap-rnv-subtitle">Director notes tagged to you during rehearsal</p>
      {Object.values(byProduction).map(group => (
        <div key={group.title} className="ap-rnv-prod-group">
          <div className="ap-rnv-prod-header">
            <span className="ap-rnv-prod-icon">🎭</span>
            <h2 className="ap-rnv-prod-title">{group.title}</h2>
            <span className="ap-rnv-prod-count">{group.notes.length} note{group.notes.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="ap-rnv-notes-list">
            {group.notes.map(note => (
              <div key={note.id} className="ap-rnv-note-card">
                <div className="ap-rnv-note-scene">{note.sceneRef}</div>
                <div className="ap-rnv-note-text">{note.note}</div>
                <div className="ap-rnv-note-footer">
                  <span className="ap-rnv-note-char">as {note.character}</span>
                  <span className="ap-rnv-note-meta">
                    {note.taggedBy} · {new Date(note.addedAt || note.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                    {note.updatedAt && note.updatedAt !== note.addedAt ? ' (updated)' : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

window.RehearsalNotesView = RehearsalNotesView;

// ── ActorProductionDashboard ──────────────────────────────────────────────────
function getDirectorName(production) {
  const staff = window.contactsService?.getProductionStaff?.(production.id) || [];
  const d = staff.find(c =>
    (c.staffProfile?.productions || []).some(p => p.productionId === production.id && p.role === 'Director')
  );
  const fromStaff = d ? `${d.firstName || ''} ${d.lastName || ''}`.trim() || d.email || null : null;
  return fromStaff || production.director || null;
}

function ActorProductionDashboard({ production, actor }) {
  const myCharacter = (production.characters || []).find(c => c.actorId === actor.id);
  const directorName = getDirectorName(production);

  const now = new Date();
  const upcomingEvents = (production.calendar || [])
    .map(ev => ({ ...ev, _start: new Date(ev.start || ev.date || ev.datetime) }))
    .filter(ev => !isNaN(ev._start) && ev._start >= now)
    .sort((a, b) => a._start - b._start)
    .slice(0, 8);

  const rehearsals = upcomingEvents.filter(ev => (ev.type || '').toLowerCase().includes('rehearsal'));
  const showDates = upcomingEvents.filter(ev =>
    (ev.type || '').toLowerCase().includes('show') || (ev.type || '').toLowerCase().includes('performance')
  );

  const myNotes = React.useMemo(() => {
    const actors = JSON.parse(localStorage.getItem('showsuite_actors') || '[]');
    const fresh = actors.find(a => a.id === actor.id);
    return (fresh?.rehearsalNotes || [])
      .filter(n => n.productionId === production.id)
      .sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));
  }, [actor.id, production.id]);

  const myScenes = (production.acts || []).flatMap(act =>
    (act.scenes || [])
      .filter(scene =>
        (scene.characters || []).some(c => {
          const charObj = (production.characters || []).find(ch => ch.name === c);
          return charObj?.actorId === actor.id;
        })
      )
      .map(scene => ({ ...scene, actName: act.name || act.title }))
  );

  const coStars = (production.characters || [])
    .filter(c => c.actorId && c.actorId !== actor.id)
    .map(c => {
      const allActors = JSON.parse(localStorage.getItem('showsuite_actors') || '[]');
      const coActor = allActors.find(a => a.id === c.actorId);
      return coActor ? { name: `${coActor.firstName} ${coActor.lastName}`, character: c.name } : null;
    })
    .filter(Boolean);

  const fmtDate = d => new Date(d).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  const fmtTime = d => new Date(d).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  return (
    <div className="ap-pd-wrap">
      <div className="ap-pd-header">
        <h1 className="ap-pd-title">{production.title}</h1>
        <div className="ap-pd-meta">
          {myCharacter && <span className="ap-pd-char-pill">as {myCharacter.name}</span>}
          {directorName && <span className="ap-pd-director">Director: {directorName}</span>}
          <span className="ap-pd-status">{production.status || 'Active'}</span>
        </div>
      </div>

      <div className="ap-pd-grid">
        {/* Upcoming Rehearsals */}
        <div className="ap-pd-card">
          <h3 className="ap-pd-card-title">🎬 Upcoming Rehearsals</h3>
          {rehearsals.length === 0
            ? <p className="ap-pd-empty">No rehearsals scheduled</p>
            : rehearsals.slice(0, 4).map((ev, i) => (
              <div key={i} className="ap-pd-event-row">
                <div className="ap-pd-event-date">{fmtDate(ev._start)}</div>
                <div className="ap-pd-event-time">{fmtTime(ev._start)} · {ev.title || ev.name || 'Rehearsal'}</div>
              </div>
            ))
          }
        </div>

        {/* Show Dates */}
        <div className="ap-pd-card">
          <h3 className="ap-pd-card-title">🎟 Show Dates</h3>
          {showDates.length === 0
            ? <p className="ap-pd-empty">No show dates scheduled</p>
            : showDates.slice(0, 4).map((ev, i) => (
              <div key={i} className="ap-pd-event-row">
                <div className="ap-pd-event-date">{fmtDate(ev._start)}</div>
                <div className="ap-pd-event-time">{fmtTime(ev._start)} · {ev.title || ev.name || 'Performance'}</div>
              </div>
            ))
          }
        </div>

        {/* Director's Notes */}
        {myNotes.length > 0 && (
          <div className="ap-pd-card ap-pd-card--full">
            <h3 className="ap-pd-card-title">📋 Director's Notes for You</h3>
            <div className="ap-pd-note-list">
              {myNotes.slice(0, 3).map(note => (
                <div key={note.id} className="ap-pd-note-item">
                  <div className="ap-pd-note-scene">{note.sceneRef}</div>
                  <div className="ap-pd-note-text">{note.note}</div>
                  <div className="ap-pd-note-date">{new Date(note.addedAt).toLocaleDateString()}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* My Scenes */}
        {myScenes.length > 0 && (
          <div className="ap-pd-card">
            <h3 className="ap-pd-card-title">🎭 My Scenes</h3>
            <div className="ap-pd-scene-list">
              {myScenes.map((scene, i) => (
                <div key={i} className="ap-pd-scene-item">
                  <span className="ap-pd-scene-act">{scene.actName}</span>
                  {scene.name || scene.title || 'Scene'}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Co-stars */}
        {coStars.length > 0 && (
          <div className="ap-pd-card">
            <h3 className="ap-pd-card-title">🌟 Co-Stars</h3>
            <div className="ap-pd-costar-list">
              {coStars.map((co, i) => (
                <div key={i} className="ap-pd-costar-row">
                  <div className="ap-pd-costar-avatar">{co.name.charAt(0)}</div>
                  <div>
                    <div className="ap-pd-costar-name">{co.name}</div>
                    <div className="ap-pd-costar-char">as {co.character}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

window.ActorProductionDashboard = ActorProductionDashboard;

// ── ActorSelfDashboard ────────────────────────────────────────────────────────
function ActorSelfDashboard({ actor, onEditProfile, onViewRehearsalNotes }) {
  const [productions, setProductions] = useState([]);

  useEffect(() => {
    const allProductions = JSON.parse(localStorage.getItem('showsuite_productions') || '[]');
    setProductions(allProductions.filter(prod =>
      prod.characters?.some(char => char.actorId === actor.id)
    ));
  }, [actor]);

  const getMyCharacters = (production) =>
    production.characters?.filter(char => char.actorId === actor.id) || [];

  const recentNotes = React.useMemo(() => {
    const actors = JSON.parse(localStorage.getItem('showsuite_actors') || '[]');
    const fresh = actors.find(a => a.id === actor.id);
    return (fresh?.rehearsalNotes || []).sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));
  }, [actor.id]);

  const checklistItems = [
    { key: 'bio',        label: 'Bio',        complete: !!actor.actorProfile?.bio },
    { key: 'phone',      label: 'Phone',      complete: !!actor.phone },
    { key: 'pronouns',   label: 'Pronouns',   complete: !!actor.actorProfile?.pronouns },
    { key: 'headshot',   label: 'Headshot',   complete: actor.actorProfile?.headshots?.length > 0 },
    { key: 'experience', label: 'Experience', complete: !!actor.actorProfile?.experienceLevel },
    { key: 'training',   label: 'Training',   complete: actor.actorProfile?.training?.length > 0 },
    { key: 'skills',     label: 'Skills',     complete: actor.actorProfile?.specialSkills?.length > 0 },
    { key: 'resume',     label: 'Resume',     complete: !!actor.actorProfile?.resume },
  ];
  const completedItems = checklistItems.filter(item => item.complete);
  const profileCompletion = Math.round((completedItems.length / checklistItems.length) * 100);

  const milestones = [
    { value: 0,   label: 'Start',       posClass: 'left-0' },
    { value: 25,  label: 'Basic Info',  posClass: 'left-1/4 -translate-x-1/2' },
    { value: 50,  label: 'Half Way',    posClass: 'left-1/2 -translate-x-1/2' },
    { value: 75,  label: 'Almost Done', posClass: 'left-3/4 -translate-x-1/2' },
    { value: 100, label: 'Complete',    posClass: 'left-full -translate-x-full' },
  ];

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Welcome back, {actor.firstName}!</h1>
        <p className="text-sm text-gray-500 mt-1">{actor.email}</p>
      </div>

      {/* Recent Rehearsal Notes preview */}
      {recentNotes.length > 0 && (
        <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-gray-900">📋 Rehearsal Notes</h2>
            <button type="button" onClick={onViewRehearsalNotes}
              className="text-sm text-purple-600 hover:text-purple-700 font-medium">
              View all →
            </button>
          </div>
          <div className="space-y-2">
            {recentNotes.slice(0, 2).map(note => (
              <div key={note.id} className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                <div className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">{note.sceneRef}</div>
                <div className="text-sm text-gray-800 actor-note-preview">{note.note}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Profile Completion */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Profile Completion</h3>
            <p className="text-sm text-gray-600 mt-1">
              {profileCompletion}% complete &bull; {completedItems.length} of {checklistItems.length} items
            </p>
          </div>
          <button type="button" onClick={onEditProfile}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors">
            Update Profile
          </button>
        </div>

        <div className="relative ap-progress-wrap" data-pct={profileCompletion}
          ref={el => { if (el) el.style.setProperty('--progress-pct', profileCompletion + '%'); }}>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div className="ap-progress-fill h-full bg-gradient-to-r from-purple-600 to-indigo-600 transition-all duration-500 rounded-full" />
          </div>
          <div className="absolute top-0 left-0 right-0 h-3 pointer-events-none">
            {milestones.map(milestone => {
              const isReached = profileCompletion >= milestone.value;
              return (
                <div key={milestone.label} className={`absolute top-0 ${milestone.posClass}`} title={milestone.label}>
                  <div className={`w-3 h-3 rounded-full border-2 transition-all duration-300 ${
                    isReached ? 'bg-white border-purple-700' : 'bg-white border-gray-300'}`} />
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-between mt-5">
          {milestones.map(milestone => {
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

        <div className="mt-5 grid grid-cols-2 gap-2">
          {checklistItems.map(item => (
            <div key={item.key} className={`flex items-center gap-2 text-sm ${item.complete ? 'text-gray-700' : 'text-gray-400'}`}>
              <div className={`flex-shrink-0 w-5 h-5 rounded flex items-center justify-center text-xs font-bold ${
                item.complete ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                {item.complete ? '✓' : '○'}
              </div>
              <span className={item.complete ? 'font-medium' : ''}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* My Productions */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">My Productions</h2>
        {productions.length === 0 ? (
          <div className="bg-white rounded-lg p-12 shadow text-center">
            <p className="text-gray-500 text-lg mb-2">No productions yet</p>
            <p className="text-gray-400 text-sm">You'll see your productions here when you're cast in a role</p>
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
                      {getDirectorName(production) && (
                        <p className="text-sm text-gray-600">Director: {getDirectorName(production)}</p>
                      )}
                    </div>
                    {isActive && (
                      <span className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">Active</span>
                    )}
                  </div>
                  <div className="mb-3">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">My Role{myCharacters.length !== 1 ? 's' : ''}:</h4>
                    <div className="flex flex-wrap gap-2">
                      {myCharacters.map((char, idx) => (
                        <span key={idx} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">{char.name}</span>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1 text-sm text-gray-600">
                    {production.performanceDates && <div>{production.performanceDates}</div>}
                    {production.venue && <div>{production.venue}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

window.ActorSelfDashboard = ActorSelfDashboard;
