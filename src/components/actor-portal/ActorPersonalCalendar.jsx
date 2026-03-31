const { useState, useEffect } = React;

function ActorPersonalCalendar({ actor, onBack }) {
  const [viewMode, setViewMode] = useState('month'); // month, list
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [productions, setProductions] = useState([]);
  const [selectedProduction, setSelectedProduction] = useState('all');
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    loadActorEvents();
  }, [actor, selectedProduction, refreshKey]);

  useEffect(() => {
    const handler = (e) => {
      if (!e.detail?.actorId || e.detail.actorId === actor.id) {
        setRefreshKey(k => k + 1);
      }
    };
    window.addEventListener('actorCalendarUpdated', handler);
    return () => window.removeEventListener('actorCalendarUpdated', handler);
  }, [actor.id]);

  // Helper: look up a scene by its ID (format "actIndex-sceneIndex") from production.acts
  const getSceneFromId = (production, sceneId) => {
    if (!production.acts || !Array.isArray(production.acts)) return null;
    const parts = String(sceneId).split('-');
    if (parts.length !== 2) return null;
    const actIdx = parseInt(parts[0], 10);
    const sceneIdx = parseInt(parts[1], 10);
    if (isNaN(actIdx) || isNaN(sceneIdx)) return null;
    const act = production.acts[actIdx];
    if (!act || !act.scenes) return null;
    return act.scenes[sceneIdx] || null;
  };

  const loadActorEvents = () => {
    try {
      // Load all productions
      const allProductions = JSON.parse(localStorage.getItem('showsuite_productions') || '[]');

      // Filter to productions where this actor is cast
      const myProductions = allProductions.filter(prod =>
        prod.characters?.some(char => char.actorId === actor.id)
      );

      setProductions(myProductions);

      // Build events from productions
      const allEvents = [];

      myProductions.forEach(production => {
        const productionColor = getProductionColor(production.id);

        // Get my characters in this production
        const myCharacters = production.characters?.filter(c => c.actorId === actor.id) || [];
        const myCharacterNames = myCharacters.map(c => c.name);

        // Load calendar events - CalendarView stores in calendar_events_{id},
        // also check production.calendar as fallback
        let calendarEvents = [];
        try {
          const saved = localStorage.getItem(`calendar_events_${production.id}`);
          if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) calendarEvents = parsed;
          }
        } catch (e) {
          console.error('Error parsing calendar_events for', production.id, e);
        }
        // Fallback: also check production.calendar
        if (calendarEvents.length === 0 && production.calendar && Array.isArray(production.calendar)) {
          calendarEvents = production.calendar;
        }

        console.log(`📅 ${production.title}:`, {
          calendarEventsCount: calendarEvents.length,
          calendarArray: calendarEvents,
          productionId: production.id,
          localStorageKey: `calendar_events_${production.id}`,
          rawLocalStorage: localStorage.getItem(`calendar_events_${production.id}`),
          productionCalendarExists: !!production.calendar,
          productionCalendarLength: production.calendar?.length || 0,
          myCharacters: myCharacterNames,
          source: calendarEvents === production.calendar ? 'production.calendar' : 'localStorage'
        });

        calendarEvents.forEach(calEvent => {
          try {
            // Determine if this event is relevant to the actor
            let isRelevant = false;

            // Shows, performances, auditions, meetings, deadlines are relevant to all cast
            if (['show', 'performance', 'audition', 'meeting', 'deadline'].includes(calEvent.type)) {
              isRelevant = true;
            }

            // Rehearsals and tech - check if actor is in the scenes being rehearsed
            if (calEvent.type === 'rehearsal' || calEvent.type === 'tech') {
              if (!calEvent.scenes || calEvent.scenes.length === 0) {
                // No scenes specified = all cast called
                isRelevant = true;
              } else {
                // Check if actor's character is in any selected scene
                for (const sceneId of calEvent.scenes) {
                  const scene = getSceneFromId(production, sceneId);
                  if (scene?.characters && Array.isArray(scene.characters)) {
                    // Scene characters can be objects with .name or plain strings
                    const actorInScene = scene.characters.some(char => {
                      const charName = typeof char === 'string' ? char : char?.name;
                      return charName && myCharacterNames.includes(charName);
                    });
                    if (actorInScene) {
                      isRelevant = true;
                      break;
                    }
                  }
                }
                // If no scene had character data, show to all cast
                if (!isRelevant) {
                  const anySceneHasChars = calEvent.scenes.some(sid => {
                    const s = getSceneFromId(production, sid);
                    return s?.characters && s.characters.length > 0;
                  });
                  if (!anySceneHasChars) isRelevant = true;
                }
              }
            }

            if (isRelevant) {
              // Parse dates - CalendarView stores start as ISO datetime string
              const startDate = calEvent.start ? calEvent.start.split('T')[0] : (calEvent.date || calEvent.datetime);
              const endDate = calEvent.endDate || startDate;

              if (startDate) {
                // Extract times from ISO start/end strings
                let startTime = calEvent.startTime;
                let endTime = calEvent.endTime;
                if (!startTime && calEvent.start && calEvent.start.includes('T')) {
                  startTime = calEvent.start.split('T')[1]?.substring(0, 5);
                }
                if (!endTime && calEvent.end && calEvent.end.includes('T')) {
                  endTime = calEvent.end.split('T')[1]?.substring(0, 5);
                }

                allEvents.push({
                  id: calEvent.id,
                  type: calEvent.type,
                  title: calEvent.title || `${production.title} - ${calEvent.type}`,
                  production: production.title,
                  productionId: production.id,
                  location: calEvent.location,
                  startDate: startDate,
                  endDate: endDate,
                  startTime: startTime,
                  endTime: endTime,
                  roles: myCharacterNames,
                  color: productionColor,
                  allDay: calEvent.allDay || false,
                  notes: calEvent.notes,
                  rehearsalType: calEvent.rehearsalType,
                  propsNeeded: calEvent.propsNeeded,
                  costumesNeeded: calEvent.costumesNeeded
                });
              }
            }
          } catch (eventError) {
            console.error('Error processing calendar event:', eventError, calEvent);
          }
        });

        console.log(`📅 ${production.title}: ${allEvents.filter(e => e.productionId === production.id).length} relevant events found out of ${calendarEvents.length} total`);
      });

      // Add conflicts
      if (actor.actorProfile?.conflicts && Array.isArray(actor.actorProfile.conflicts)) {
        actor.actorProfile.conflicts.forEach(conflict => {
          try {
            if (conflict.date) {
              allEvents.push({
                id: conflict.id,
                type: 'conflict',
                title: `Conflict: ${conflict.reason || 'Personal'}`,
                startDate: conflict.date,
                endDate: conflict.date,
                startTime: conflict.startTime,
                endTime: conflict.endTime,
                color: '#ef4444',
                allDay: conflict.allDay || false
              });
            }
          } catch (conflictError) {
            console.error('Error processing conflict:', conflictError, conflict);
          }
        });
      }

      // Load actor-specific calendar events (e.g. accepted auditions before cast)
      try {
        const actorCalKey = `actor_calendar_${actor.id}`;
        const actorPersonalEvents = JSON.parse(localStorage.getItem(actorCalKey) || '[]');
        actorPersonalEvents.forEach(ev => {
          // Avoid duplication if actor is now cast and event also appears via production calendar
          const alreadyAdded = allEvents.some(e => e.invitationThreadId && e.invitationThreadId === ev.invitationThreadId);
          if (!alreadyAdded) {
            const startDate = ev.date || (ev.start ? ev.start.split('T')[0] : null);
            const startTime = ev.time || (ev.start && ev.start.includes('T') ? ev.start.split('T')[1].substring(0, 5) : null);
            const endTime = ev.end && ev.end.includes('T') ? ev.end.split('T')[1].substring(0, 5) : null;
            if (startDate) {
              allEvents.push({
                id: ev.id,
                type: ev.type,
                title: ev.title,
                production: ev.productionTitle || '',
                productionId: ev.productionId,
                location: ev.location,
                startDate: startDate,
                endDate: startDate,
                startTime: startTime,
                endTime: endTime,
                roles: [],
                color: getProductionColor(ev.productionId || 'audition'),
                allDay: false,
                notes: ev.notes,
                invitationThreadId: ev.invitationThreadId,
              });
            }
          }
        });
      } catch (e) {
        console.error('Error loading actor personal calendar events:', e);
      }

      // Filter by selected production
      const filtered = selectedProduction === 'all'
        ? allEvents
        : allEvents.filter(e => e.productionId === selectedProduction || e.type === 'conflict');

      console.log('📅 Actor Calendar Summary:', {
        actorId: actor.id,
        actorName: `${actor.firstName} ${actor.lastName}`,
        totalProductionsChecked: myProductions.length,
        productionNames: myProductions.map(p => p.title),
        totalEventsFound: allEvents.length,
        afterProductionFilter: {
          selectedProduction,
          filteredCount: filtered.length
        },
        events: filtered
      });
      setEvents(filtered);

    } catch (error) {
      console.error('Error loading actor events:', error);
      setEvents([]);
    }
  };

  const getProductionColor = (productionId) => {
    const colors = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#6366f1'];
    const hash = productionId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const handleAddConflict = (conflictData) => {
    const conflict = {
      id: 'conflict_' + Date.now(),
      date: conflictData.date,
      startTime: conflictData.startTime,
      endTime: conflictData.endTime,
      reason: conflictData.reason,
      allDay: conflictData.allDay
    };

    const updatedActor = {
      ...actor,
      actorProfile: {
        ...actor.actorProfile,
        conflicts: [...(actor.actorProfile.conflicts || []), conflict]
      }
    };

    window.actorsService.updateActor(actor.id, updatedActor);
    window.actorAuthService.updateSession(updatedActor);

    setShowConflictModal(false);
    loadActorEvents();
  };

  const handleRemoveConflict = (conflictId) => {
    if (!confirm('Remove this conflict?')) return;

    const rawId = conflictId.replace('conflict_', '');
    const updatedConflicts = (actor.actorProfile.conflicts || []).filter(c => c.id !== conflictId && c.id !== rawId);

    const updatedActor = {
      ...actor,
      actorProfile: {
        ...actor.actorProfile,
        conflicts: updatedConflicts
      }
    };

    window.actorsService.updateActor(actor.id, updatedActor);
    window.actorAuthService.updateSession(updatedActor);

    loadActorEvents();
  };

  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startingDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const days = [];

    // Helper function to check if date is within event range
    // Use string comparison on YYYY-MM-DD — no Date objects, no UTC issues
    const isDateInEvent = (dateStr, event) => {
      const start = event.startDate ? String(event.startDate).split('T')[0] : '';
      const end = event.endDate ? String(event.endDate).split('T')[0] : start;
      return dateStr >= start && dateStr <= end;
    };

    // Previous month padding
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="h-24 bg-gray-50 border border-gray-200"></div>);
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayEvents = events.filter(e => isDateInEvent(dateStr, e));
      const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();

      days.push(
        <div key={day} className={`h-24 border border-gray-200 p-1 overflow-y-auto ${isToday ? 'bg-blue-50 border-blue-400' : 'bg-white'}`}>
          <div className={`text-sm font-semibold mb-1 ${isToday ? 'text-blue-700' : 'text-gray-900'}`}>
            {day}
          </div>
          <div className="space-y-1">
            {dayEvents.slice(0, 3).map(event => {
              // Check if this is first or middle/last day of multi-day event
              // Use string comparison — no Date objects, no UTC issues
              const startStr = event.startDate ? String(event.startDate).split('T')[0] : '';
              const endStr = event.endDate ? String(event.endDate).split('T')[0] : startStr;
              const isFirstDay = dateStr === startStr;
              const isMultiDay = startStr !== endStr;

              return (
                <div
                  key={event.id}
                  className={`text-xs p-1 rounded truncate cursor-pointer hover:opacity-80 ${
                    isMultiDay && !isFirstDay ? 'ml-[-4px] rounded-l-none border-l-0' : ''
                  }`}
                  style={{
                    backgroundColor: event.color + '20',
                    color: event.color,
                    borderLeft: isFirstDay ? `3px solid ${event.color}` : 'none'
                  }}
                  title={`${event.title}\n${event.startTime ? `${event.startTime} - ${event.endTime}` : 'All day'}\n${event.location || ''}`}
                  onClick={() => alert(`${event.title}\n${event.startTime ? `${event.startTime} - ${event.endTime}` : 'All day'}\n${event.location || ''}${event.rehearsalType === 'full-run' ? '\n📦 All Props Required • 👗 All Costumes Required' : ''}${event.notes ? '\n' + event.notes : ''}`)}
                >
                  {isFirstDay && (
                    <>
                      {event.type === 'rehearsal' && '🎭 '}
                      {event.type === 'show' && '🎬 '}
                      {event.type === 'audition' && '🎤 '}
                      {event.type === 'conflict' && '⚠️ '}
                      {event.title}
                    </>
                  )}
                  {!isFirstDay && isMultiDay && (
                    <span className="text-xs opacity-75">↔ {event.title}</span>
                  )}
                </div>
              );
            })}
            {dayEvents.length > 3 && (
              <div className="text-xs text-gray-500 pl-1">+{dayEvents.length - 3} more</div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-7 gap-0">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="bg-gray-100 border border-gray-300 p-2 text-center font-semibold text-sm text-gray-700">
            {day}
          </div>
        ))}
        {days}
      </div>
    );
  };

  const renderListView = () => {
    const sortedEvents = [...events].sort((a, b) => {
      const dateA = a.startDate ? String(a.startDate).split('T')[0] : '';
      const dateB = b.startDate ? String(b.startDate).split('T')[0] : '';
      return dateA.localeCompare(dateB);
    });

    return (
      <div className="space-y-3 p-4">
        {sortedEvents.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <div className="text-6xl mb-4">📅</div>
            <p className="text-gray-500 text-lg">No upcoming events</p>
            <p className="text-gray-400 text-sm">Your rehearsals and performances will appear here</p>
          </div>
        ) : (
          sortedEvents.map(event => (
            <div key={event.id} className="bg-white border-l-4 border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow" style={{ borderLeftColor: event.color }}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl">
                      {event.type === 'rehearsal' && '🎭'}
                      {event.type === 'show' && '🎬'}
                      {event.type === 'audition' && '🎤'}
                      {event.type === 'conflict' && '⚠️'}
                    </span>
                    <h3 className="font-semibold text-gray-900">{event.title}</h3>
                  </div>

                  <div className="space-y-1 text-sm text-gray-600 ml-9">
                    <div className="flex items-center gap-2">
                      <span>📅</span>
                      <span>
                        {event.startDate}
                        {event.endDate && event.endDate !== event.startDate && (
                          <> - {event.endDate}</>
                        )}
                      </span>
                      {event.startTime && !event.allDay && (
                        <span>• {event.startTime} - {event.endTime}</span>
                      )}
                      {event.allDay && <span className="text-xs text-gray-500">• All Day</span>}
                    </div>

                    {event.location && (
                      <div className="flex items-center gap-2">
                        <span>📍</span>
                        <span>{event.location}</span>
                      </div>
                    )}

                    {event.roles && event.roles.length > 0 && (
                      <div className="flex items-center gap-2">
                        <span>🎭</span>
                        <span>Playing: {event.roles.join(', ')}</span>
                      </div>
                    )}

                    {event.production && (
                      <div className="flex items-center gap-2">
                        <span>🎬</span>
                        <span>{event.production}</span>
                      </div>
                    )}

                    {(event.rehearsalType === 'full-run' || (event.propsNeeded?.length > 0) || (event.costumesNeeded?.length > 0)) && (
                      <div className="flex items-center gap-3 mt-1">
                        {(event.rehearsalType === 'full-run' || event.propsNeeded?.length > 0) && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">
                            📦 {event.rehearsalType === 'full-run' ? 'All Props' : `${event.propsNeeded.length} Props`}
                          </span>
                        )}
                        {(event.rehearsalType === 'full-run' || event.costumesNeeded?.length > 0) && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-pink-100 text-pink-800 rounded text-xs font-medium">
                            👗 {event.rehearsalType === 'full-run' ? 'All Costumes' : `${event.costumesNeeded.length} Costumes`}
                          </span>
                        )}
                        {event.rehearsalType && event.rehearsalType !== 'custom' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-xs font-medium">
                            {event.rehearsalType === 'full-run' && '🎭 Full Run'}
                            {event.rehearsalType === 'act-1-run' && '📖 Act I Run'}
                            {event.rehearsalType === 'act-2-run' && '📖 Act II Run'}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {event.type === 'conflict' && (
                  <button
                    onClick={() => handleRemoveConflict(event.id)}
                    className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    );
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-2">
            <button
              onClick={onBack}
              className="px-3 py-1 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-colors text-sm"
            >
              ← Back to Dashboard
            </button>
          </div>
          <h1 className="text-3xl font-bold mb-2">My Calendar</h1>
          <p className="text-purple-100">
            Rehearsals, performances, and conflicts for {actor.firstName} {actor.lastName}
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* View Mode */}
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('month')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  viewMode === 'month'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Month
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  viewMode === 'list'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                List
              </button>
            </div>

            {/* Month Navigation (for month view) */}
            {viewMode === 'month' && (
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
                  className="px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  ←
                </button>
                <span className="font-semibold text-gray-900 min-w-[200px] text-center">
                  {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                </span>
                <button
                  onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
                  className="px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  →
                </button>
                <button
                  onClick={() => setCurrentDate(new Date())}
                  className="px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200"
                >
                  Today
                </button>
              </div>
            )}

            {/* Production Filter */}
            <select
              value={selectedProduction}
              onChange={(e) => setSelectedProduction(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Productions</option>
              {productions.map(prod => (
                <option key={prod.id} value={prod.id}>{prod.title}</option>
              ))}
            </select>

            {/* Refresh Button */}
            <button
              onClick={() => setRefreshKey(k => k + 1)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              title="Refresh calendar events"
            >
              🔄 Refresh
            </button>

            {/* Add Conflict Button */}
            <button
              onClick={() => setShowConflictModal(true)}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
            >
              + Add Conflict
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="bg-white rounded-lg shadow p-3 mb-4">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="font-medium text-gray-700">Legend:</span>
            <span className="flex items-center gap-1">🎭 Rehearsal</span>
            <span className="flex items-center gap-1">🎬 Show</span>
            <span className="flex items-center gap-1">🎤 Audition</span>
            <span className="flex items-center gap-1">⚠️ Conflict</span>
            {productions.map(prod => (
              <span key={prod.id} className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: getProductionColor(prod.id) }}></span>
                {prod.title}
              </span>
            ))}
          </div>
        </div>

        {/* Calendar View */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {viewMode === 'month' ? renderMonthView() : renderListView()}
        </div>
      </div>

      {/* Add Conflict Modal */}
      {showConflictModal && (
        <ConflictModal
          onClose={() => setShowConflictModal(false)}
          onSave={handleAddConflict}
        />
      )}
    </div>
  );
}

function ConflictModal({ onClose, onSave }) {
  const [formData, setFormData] = useState({
    date: '',
    startTime: '',
    endTime: '',
    reason: '',
    allDay: false
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.date || !formData.reason) {
      alert('Please provide date and reason');
      return;
    }
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-xl font-bold text-gray-900 mb-4">Add Conflict</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              required
            />
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.allDay}
                onChange={(e) => setFormData({ ...formData, allDay: e.target.checked })}
                className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
              />
              <span className="text-sm font-medium text-gray-700">All Day</span>
            </label>
          </div>

          {!formData.allDay && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                <input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                <input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
            <input
              type="text"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              placeholder="e.g., Work, Vacation, Doctor's appointment"
              required
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Add Conflict
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

window.ActorPersonalCalendar = ActorPersonalCalendar;