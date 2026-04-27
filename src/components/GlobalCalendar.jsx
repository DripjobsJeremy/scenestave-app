/**
 * GlobalCalendar.jsx
 * Cross-production calendar — aggregates events from all productions.
 */

const { useState, useEffect, useMemo } = React;

// ── Data helpers ─────────────────────────────────────────────────────────────

const PRODUCTION_COLORS = [
  '#7C3AED', '#DB2777', '#D97706', '#059669',
  '#2563EB', '#DC2626', '#7C2D12', '#1D4ED8',
];

const aggregateEvents = (productions) => {
  const allEvents = [];
  (productions || []).forEach((prod, idx) => {
    const color = PRODUCTION_COLORS[idx % PRODUCTION_COLORS.length];
    (prod.calendar || []).forEach(event => {
      const dateVal = event.start || event.date || event.datetime;
      if (!dateVal) return;
      const d = new Date(dateVal);
      allEvents.push({
        ...event,
        productionId: prod.id,
        productionTitle: prod.title,
        productionColor: color,
        _date: d,
      });
    });
  });
  return allEvents
    .filter(e => !isNaN(e._date.getTime()))
    .sort((a, b) => a._date - b._date);
};

const normalizeType = (t) => {
  if (!t) return 'other';
  const s = String(t).toLowerCase();
  if (s.includes('audition')) return 'audition';
  if (s.includes('performance') || s.includes('show')) return 'show';
  if (s.includes('rehearsal')) return 'rehearsal';
  if (s.includes('technical') || s.includes('tech')) return 'technical';
  if (s.includes('board')) return 'board';
  if (s.includes('meeting')) return 'meeting';
  return 'other';
};

const TYPE_LABELS = {
  audition:  'Auditions',
  rehearsal: 'Rehearsals',
  show:      'Shows / Performances',
  technical: 'Tech Rehearsals',
  board:     'Board Meetings',
  meeting:   'Meetings',
  other:     'Other',
};

// ── Component ─────────────────────────────────────────────────────────────────

function GlobalCalendar() {
  const [productions, setProductions] = useState([]);

  useEffect(() => {
    const prods = window.productionsService?.getAll?.() || [];
    setProductions(prods);
  }, []);

  const [filterProduction, setFilterProduction] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [viewMode, setViewMode] = useState(() => {
    try { return localStorage.getItem('scenestave_global_cal_view') || 'month'; } catch { return 'month'; }
  });
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const allEvents = useMemo(() => aggregateEvents(productions), [productions]);

  const filteredEvents = useMemo(() => {
    return allEvents.filter(ev => {
      if (filterProduction !== 'all' && ev.productionId !== filterProduction) return false;
      if (filterType !== 'all' && normalizeType(ev.type) !== filterType) return false;
      return true;
    });
  }, [allEvents, filterProduction, filterType]);

  // Unique productions that have at least one event (for legend + filter)
  const productionsWithEvents = useMemo(() => {
    const seen = new Set();
    const result = [];
    allEvents.forEach(ev => {
      if (!seen.has(ev.productionId)) {
        seen.add(ev.productionId);
        result.push({ id: ev.productionId, title: ev.productionTitle, color: ev.productionColor });
      }
    });
    return result;
  }, [allEvents]);

  const setView = (mode) => {
    setViewMode(mode);
    try { localStorage.setItem('scenestave_global_cal_view', mode); } catch {}
  };

  const prevMonth = () => setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  const goToday   = () => { const n = new Date(); setCurrentMonth(new Date(n.getFullYear(), n.getMonth(), 1)); };

  const monthLabel = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

  // ── Month grid helpers ────────────────────────────────────────────────────

  const monthCells = useMemo(() => {
    const year  = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];
    // Leading empty cells
    for (let i = 0; i < firstDay; i++) cells.push(null);
    // Day cells
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
    return cells;
  }, [currentMonth]);

  const eventsForDay = (day) => {
    if (!day) return [];
    return filteredEvents.filter(ev =>
      ev._date.getFullYear() === day.getFullYear() &&
      ev._date.getMonth()    === day.getMonth()    &&
      ev._date.getDate()     === day.getDate()
    );
  };

  const today = new Date();
  const isToday = (day) =>
    day &&
    day.getFullYear() === today.getFullYear() &&
    day.getMonth()    === today.getMonth()    &&
    day.getDate()     === today.getDate();

  // ── List view grouping ────────────────────────────────────────────────────

  const groupedByMonth = useMemo(() => {
    const groups = {};
    filteredEvents.forEach(ev => {
      const key = ev._date.toLocaleString('default', { month: 'long', year: 'numeric' });
      if (!groups[key]) groups[key] = [];
      groups[key].push(ev);
    });
    return groups;
  }, [filteredEvents]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="bg-base min-h-screen">
    <div className="max-w-screen-xl mx-auto p-6">

      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">📅 Global Calendar</h1>
          <p className="text-gray-400">
            All productions — {allEvents.length} event{allEvents.length !== 1 ? 's' : ''} across {productions.length} production{productions.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          {[['month', '🗓 Month'], ['list', '📋 List']].map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              onClick={() => setView(mode)}
              className={`px-4 py-2 rounded text-sm font-medium ${
                viewMode === mode
                  ? 'bg-violet-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Filters bar */}
      <div className="banquo-card flex flex-wrap gap-4 mb-6 p-4 bg-surface rounded-lg border border-gray-700">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Production</label>
          <select
            title="Filter by production"
            value={filterProduction}
            onChange={e => setFilterProduction(e.target.value)}
            className="bg-gray-700 text-white px-3 py-1.5 rounded border border-gray-600 text-sm"
          >
            <option value="all">All Productions</option>
            {productions.map(p => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Event Type</label>
          <select
            title="Filter by event type"
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="bg-gray-700 text-white px-3 py-1.5 rounded border border-gray-600 text-sm"
          >
            <option value="all">All Types</option>
            <option value="audition">Auditions</option>
            <option value="rehearsal">Rehearsals</option>
            <option value="show">Shows / Performances</option>
            <option value="technical">Tech Rehearsals</option>
            <option value="board">Board Meetings</option>
            <option value="meeting">Meetings</option>
            <option value="other">Other</option>
          </select>
        </div>
        {(filterProduction !== 'all' || filterType !== 'all') && (
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => { setFilterProduction('all'); setFilterType('all'); }}
              className="text-xs text-violet-400 hover:text-violet-300 underline pb-2"
            >
              Clear filters
            </button>
          </div>
        )}
        <div className="flex items-end ml-auto">
          <span className="text-xs text-gray-500 pb-2">
            {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''}
            {(filterProduction !== 'all' || filterType !== 'all') ? ' matching' : ''}
          </span>
        </div>
      </div>

      {/* Production color legend */}
      {filterProduction === 'all' && productionsWithEvents.length > 0 && (
        <div className="flex flex-wrap gap-4 mb-5">
          {productionsWithEvents.map(p => (
            <div key={p.id} className="flex items-center gap-1.5 text-xs text-gray-300">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
              <span>{p.title}</span>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {productions.length === 0 && (
        <div className="banquo-card bg-surface rounded-lg border border-gray-700 p-16 text-center">
          <div className="text-5xl mb-4">🎬</div>
          <h3 className="text-xl font-semibold text-white mb-2">No Productions Yet</h3>
          <p className="text-gray-400 text-sm">Create productions and add calendar events to see them here.</p>
        </div>
      )}

      {/* ── Month view ── */}
      {productions.length > 0 && viewMode === 'month' && (
        <div className="banquo-card bg-surface rounded-lg border border-gray-700 overflow-hidden">
          {/* Month nav */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
              title="Previous month"
            >
              ‹
            </button>
            <div className="flex items-center gap-3">
              <span className="text-white font-semibold">{monthLabel}</span>
              <button
                type="button"
                onClick={goToday}
                className="text-xs text-violet-400 hover:text-violet-300 px-2 py-0.5 border border-violet-700 rounded"
              >
                Today
              </button>
            </div>
            <button
              type="button"
              onClick={nextMonth}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
              title="Next month"
            >
              ›
            </button>
          </div>

          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 border-b border-gray-700">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {monthCells.map((day, i) => {
              const dayEvents = eventsForDay(day);
              const today_ = isToday(day);
              return (
                <div
                  key={i}
                  className={`min-h-[90px] p-1.5 border-b border-r border-gray-700 ${
                    !day ? 'bg-gray-850' : ''
                  }`}
                >
                  {day && (
                    <>
                      <div className={`text-xs font-semibold mb-1 w-6 h-6 flex items-center justify-center rounded-full ${
                        today_
                          ? 'bg-violet-600 text-white'
                          : 'text-gray-400'
                      }`}>
                        {day.getDate()}
                      </div>
                      <div className="space-y-0.5">
                        {dayEvents.slice(0, 3).map((ev, j) => (
                          <div
                            key={j}
                            title={`${ev.productionTitle}: ${ev.title || ev.type || 'Event'}`}
                            className="truncate text-xs px-1 py-0.5 rounded text-white"
                            style={{ backgroundColor: ev.productionColor }}
                          >
                            {ev.title || ev.type || 'Event'}
                          </div>
                        ))}
                        {dayEvents.length > 3 && (
                          <div className="text-xs text-gray-500 pl-1">
                            +{dayEvents.length - 3} more
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── List view ── */}
      {productions.length > 0 && viewMode === 'list' && (
        <div className="space-y-6">
          {filteredEvents.length === 0 ? (
            <div className="banquo-card bg-surface rounded-lg border border-gray-700 p-12 text-center">
              <div className="text-4xl mb-3">🔍</div>
              <p className="text-gray-400">No events match the current filters.</p>
            </div>
          ) : (
            Object.entries(groupedByMonth).map(([monthKey, events]) => (
              <div key={monthKey}>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  {monthKey}
                </h3>
                <div className="space-y-2">
                  {events.map((ev, i) => (
                    <div
                      key={i}
                      className="banquo-card--flat flex items-start gap-3 p-3 bg-surface rounded-lg border border-gray-700 hover:border-gray-600 transition-colors"
                    >
                      {/* Color dot */}
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0 mt-1"
                        style={{ backgroundColor: ev.productionColor }}
                        title={ev.productionTitle}
                      />
                      {/* Date */}
                      <div className="w-16 flex-shrink-0 text-center">
                        <div className="text-xs text-gray-500 uppercase">
                          {ev._date.toLocaleString('default', { month: 'short' })}
                        </div>
                        <div className="text-xl font-bold text-white leading-tight">
                          {ev._date.getDate()}
                        </div>
                      </div>
                      {/* Event info */}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-white text-sm truncate">
                          {ev.title || ev.type || 'Event'}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5 flex flex-wrap gap-2">
                          <span>{ev.productionTitle}</span>
                          {ev.type && (
                            <span className="text-gray-600">·</span>
                          )}
                          {ev.type && (
                            <span>{TYPE_LABELS[normalizeType(ev.type)] || ev.type}</span>
                          )}
                          {(ev.startTime || ev.time) && (
                            <>
                              <span className="text-gray-600">·</span>
                              <span>{ev.startTime || ev.time}</span>
                            </>
                          )}
                          {ev.location && (
                            <>
                              <span className="text-gray-600">·</span>
                              <span>📍 {ev.location}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

    </div>
    </div>
  );
}

window.GlobalCalendar = GlobalCalendar;
