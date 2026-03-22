function CalendarView({ production, onSave, userRole }) {
  // Clean up event to ensure it has valid start field
  const cleanupEvent = (event) => {
    if (!event) return event;

    if (event.start) return event;

    if (event.date) {
      const dateStr = typeof event.date === 'string'
        ? event.date
        : new Date(event.date).toISOString().split('T')[0];
      const timeStr = event.startTime || event.time || '00:00';
      return {
        ...event,
        start: `${dateStr}T${timeStr}:00`,
        end: event.endTime ? `${dateStr}T${event.endTime}:00` : event.end
      };
    }

    console.warn('Event missing date information:', event);
    return event;
  };

  // State management
  const [viewMode, setViewMode] = React.useState('month'); // month, week, day
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [events, setEvents] = React.useState(() => {
    const saved = localStorage.getItem(`calendar_events_${production.id}`);
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return [];

      const cleaned = parsed
        .map(cleanupEvent)
        .filter(e => e && e.start);

      if (cleaned.length !== parsed.length) {
        console.log(`Cleaned ${parsed.length - cleaned.length} invalid events`);
        localStorage.setItem(`calendar_events_${production.id}`, JSON.stringify(cleaned));
      }

      return cleaned;
    } catch (e) {
      console.error('Failed to parse calendar events:', e);
      return [];
    }
  });
  const [selectedEvent, setSelectedEvent] = React.useState(null);
  const [showEventModal, setShowEventModal] = React.useState(false);
  const [editingEvent, setEditingEvent] = React.useState(null);
  const [showAttendance, setShowAttendance] = React.useState(null); // Event ID for attendance view
  const [showTemplates, setShowTemplates] = React.useState(false);
  const [showDashboard, setShowDashboard] = React.useState(false);
  const [filterType, setFilterType] = React.useState('');
  const [showConflicts, setShowConflicts] = React.useState(false);
  const [rehearsalType, setRehearsalType] = React.useState('custom');

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
        return;
      }

      if (e.key === 'Escape') {
        setShowEventModal(false);
        setEditingEvent(null);
        setSelectedEvent(null);
        return;
      }

      if (showEventModal) return;

      switch (e.key) {
        case 'ArrowLeft': {
          e.preventDefault();
          if (viewMode === 'month') {
            const newDate = new Date(currentDate);
            newDate.setMonth(currentDate.getMonth() - 1);
            setCurrentDate(newDate);
          } else if (viewMode === 'week') {
            const newDate = new Date(currentDate);
            newDate.setDate(currentDate.getDate() - 7);
            setCurrentDate(newDate);
          } else if (viewMode === 'day') {
            const newDate = new Date(currentDate);
            newDate.setDate(currentDate.getDate() - 1);
            setCurrentDate(newDate);
          }
          break;
        }
        case 'ArrowRight': {
          e.preventDefault();
          if (viewMode === 'month') {
            const newDate = new Date(currentDate);
            newDate.setMonth(currentDate.getMonth() + 1);
            setCurrentDate(newDate);
          } else if (viewMode === 'week') {
            const newDate = new Date(currentDate);
            newDate.setDate(currentDate.getDate() + 7);
            setCurrentDate(newDate);
          } else if (viewMode === 'day') {
            const newDate = new Date(currentDate);
            newDate.setDate(currentDate.getDate() + 1);
            setCurrentDate(newDate);
          }
          break;
        }
        case 't':
        case 'T':
          e.preventDefault();
          setCurrentDate(new Date());
          break;
        case 'n':
        case 'N':
          e.preventDefault();
          setEditingEvent({ date: new Date().toISOString().split('T')[0] });
          setShowEventModal(true);
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          setViewMode('month');
          break;
        case 'w':
        case 'W':
          e.preventDefault();
          setViewMode('week');
          break;
        case 'd':
        case 'D':
          e.preventDefault();
          setViewMode('day');
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [viewMode, currentDate, showEventModal]);
  
  // Save events to localStorage
  React.useEffect(() => {
    localStorage.setItem(`calendar_events_${production.id}`, JSON.stringify(events));
  }, [events, production.id]);
  
  // Event types with colors
  const eventTypes = {
    'rehearsal': { label: 'Rehearsal', color: 'bg-blue-500', textColor: 'text-blue-700', bgLight: 'bg-blue-50', border: 'border-blue-300' },
    'tech': { label: 'Tech Rehearsal', color: 'bg-purple-500', textColor: 'text-purple-700', bgLight: 'bg-purple-50', border: 'border-purple-300' },
    'performance': { label: 'Performance', color: 'bg-red-500', textColor: 'text-red-700', bgLight: 'bg-red-50', border: 'border-red-300' },
    'deadline': { label: 'Deadline', color: 'bg-orange-500', textColor: 'text-orange-700', bgLight: 'bg-orange-50', border: 'border-orange-300' },
    'meeting': { label: 'Meeting', color: 'bg-green-500', textColor: 'text-green-700', bgLight: 'bg-green-50', border: 'border-green-300' },
    'costume-fitting': { label: 'Costume Fitting', color: 'bg-pink-500', textColor: 'text-pink-700', bgLight: 'bg-pink-50', border: 'border-pink-300' },
    'build': { label: 'Build Day', color: 'bg-indigo-500', textColor: 'text-indigo-700', bgLight: 'bg-indigo-50', border: 'border-indigo-300' }
  };
  
  // Roles that can schedule rehearsals, shows, and tech events
  const FULL_ACCESS_ROLES = ['admin', 'director', 'stage_manager'];

  // Role-based event type filtering — dept roles never see Rehearsal/Tech/Performance
  const allowedEventTypesForRole = () => {
    if (!userRole || FULL_ACCESS_ROLES.includes(userRole)) return eventTypes;
    const deptAllowed = {
      lighting_designer: ['deadline', 'meeting'],
      sound_designer:    ['deadline', 'meeting'],
      wardrobe_designer: ['costume-fitting', 'deadline', 'meeting'],
      props_master:      ['deadline', 'meeting'],
      scenic_designer:   ['build', 'deadline', 'meeting'],
    };
    const allowed = deptAllowed[userRole] || ['deadline', 'meeting'];
    return Object.fromEntries(Object.entries(eventTypes).filter(([key]) => allowed.includes(key)));
  };

  const canEditEvent = (event) => {
    if (!event) return false;
    if (!userRole || userRole === 'admin' || userRole === 'director') return true;
    return event.createdByRole === userRole || event.createdByRole === undefined;
  };

  // Rehearsal type subtypes
  const rehearsalSubtypes = {
    'table-read': 'Table Read',
    'blocking': 'Blocking',
    'scene-work': 'Scene Work',
    'music': 'Music Rehearsal',
    'choreography': 'Choreography',
    'run-through': 'Run Through',
    'act-run': 'Act Run-Through',
    'stumble-through': 'Stumble Through',
    'work-through': 'Work Through',
    'off-book': 'Off-Book Rehearsal',
    'polish': 'Polish Rehearsal'
  };

  const techSubtypes = {
    'paper-tech': 'Paper Tech',
    'dry-tech': 'Dry Tech',
    'cue-to-cue': 'Cue-to-Cue',
    'tech-rehearsal': 'Technical Rehearsal',
    'dress-rehearsal': 'Dress Rehearsal',
    'dress-1': 'First Dress',
    'dress-2': 'Second Dress',
    'dress-3': 'Third Dress',
    'final-dress': 'Final Dress',
    'photo-call': 'Photo Call',
    'preview': 'Preview Performance'
  };

  const milestoneTypes = {
    'auditions': 'Auditions',
    'callbacks': 'Callbacks',
    'first-rehearsal': 'First Rehearsal',
    'design-deadline': 'Design Deadline',
    'off-book-deadline': 'Off-Book Deadline',
    'costume-fitting': 'Costume Fitting',
    'costume-parade': 'Costume Parade',
    'props-deadline': 'Props Deadline',
    'set-deadline': 'Set Construction Deadline',
    'load-in': 'Load-In',
    'focus': 'Light Focus',
    'sitzprobe': 'Sitzprobe',
    'opening': 'Opening Night',
    'closing': 'Closing Night',
    'strike': 'Strike'
  };
  
  // Format time from 24hr to 12hr with AM/PM
  const formatTime = (time24) => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${hour12}:${minutes} ${ampm}`;
  };

  // Format time range
  const formatTimeRange = (startTime, endTime) => {
    return `${formatTime(startTime)} - ${formatTime(endTime)}`;
  };

  const normalizeType = (eventType) => {
    if (!eventType) return 'meeting';
    const type = String(eventType).trim().toLowerCase();
    if (type.includes('rehearsal') || type.includes('blocking') || type.includes('scene-work')) return 'rehearsal';
    if (type.includes('tech') || type.includes('dress') || type.includes('cue-to-cue')) return 'tech';
    if (type.includes('performance') || type.includes('show') || type.includes('opening') || type.includes('closing')) return 'performance';
    if (type.includes('deadline') || type.includes('off-book')) return 'deadline';
    if (type.includes('meeting')) return 'meeting';
    if (type.includes('costume') || type.includes('fitting')) return 'costume-fitting';
    if (type.includes('build') || type.includes('load-in') || type.includes('strike')) return 'build';
    return 'meeting';
  };

  const coerceArray = (value) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }
    if (value === null || value === undefined) return [];
    return [value];
  };

  const getEventColorClasses = (eventType) => {
    const type = normalizeType(eventType);
    const colorMap = {
      rehearsal: 'bg-blue-600 hover:bg-blue-700',
      tech: 'bg-purple-600 hover:bg-purple-700',
      performance: 'bg-red-600 hover:bg-red-700',
      deadline: 'bg-orange-600 hover:bg-orange-700',
      meeting: 'bg-green-600 hover:bg-green-700',
      'costume-fitting': 'bg-pink-600 hover:bg-pink-700',
      build: 'bg-indigo-600 hover:bg-indigo-700',
      show: 'bg-purple-600 hover:bg-purple-700',
      technical: 'bg-yellow-600 hover:bg-yellow-700 text-gray-900',
      audition: 'bg-pink-600 hover:bg-pink-700',
      board: 'bg-indigo-600 hover:bg-indigo-700',
      other: 'bg-gray-600 hover:bg-gray-700'
    };
    return colorMap[type] || colorMap.other;
  };

  const migrateEvent = (event) => {
    if (!event) return event;

    const hasLegacyFields = event.date || event.datetime || event.startTime || event.endTime;
    if (event.start && !hasLegacyFields) return event;

    const dateValue = event.start || event.date || event.datetime;
    if (!dateValue) return event;

    // Extract the date part directly — no UTC conversion
    const dateStr = String(dateValue).split('T')[0];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return event;

    let start = event.start;
    if (event.startTime) {
      start = `${dateStr}T${event.startTime}:00`;
    } else if (typeof dateValue === 'string' && dateValue.includes('T')) {
      start = dateValue;
    } else if (!start) {
      start = `${dateStr}T00:00:00`;
    }

    let end = event.end;
    if (event.endTime) {
      end = `${dateStr}T${event.endTime}:00`;
    }

    const { date, datetime, startTime, endTime, ...rest } = event;
    return {
      ...rest,
      start,
      end,
      scenes: coerceArray(rest.scenes),
      charactersNeeded: coerceArray(rest.charactersNeeded),
      propsNeeded: coerceArray(rest.propsNeeded),
      costumesNeeded: coerceArray(rest.costumesNeeded),
      attendees: coerceArray(rest.attendees)
    };
  };

  const parseDateTime = (isoString) => {
    if (!isoString) return { date: '', time: '' };
    // Split directly — avoids UTC conversion bugs.
    // "2026-02-24"       → { date: '2026-02-24', time: '' }
    // "2026-02-24T19:00" → { date: '2026-02-24', time: '19:00' }
    const str = String(isoString);
    const tIndex = str.indexOf('T');
    if (tIndex === -1) return { date: str, time: '' };
    return { date: str.slice(0, tIndex), time: str.slice(tIndex + 1, tIndex + 6) };
  };

  const combineDateTimeLocal = (dateStr, timeStr) => {
    if (!dateStr) return null;
    if (!timeStr) return `${dateStr}T00:00:00`;
    return `${dateStr}T${timeStr}:00`;
  };

  const buildFormEvent = (event, defaults = {}) => {
    const migrated = migrateEvent(event) || {};
    const startParsed = parseDateTime(migrated.start);
    const endParsed = parseDateTime(migrated.end);
    const endDate = migrated.endDate || (endParsed.date && endParsed.date !== startParsed.date ? endParsed.date : '');
    return {
      ...migrated,
      date: startParsed.date || defaults.date || '',
      startTime: startParsed.time || defaults.startTime || '',
      endTime: endParsed.time || defaults.endTime || '',
      endDate: endDate || defaults.endDate || ''
    };
  };

  const getWeekStart = (date) => {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const day = start.getDay();
    start.setDate(start.getDate() - day);
    return start;
  };

  const formatDateDisplay = (date, format = 'short') => {
    if (format === 'short') {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    if (format === 'long') {
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
    }
    if (format === 'weekday') {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    }
    return date.toLocaleDateString();
  };

  const isSameDay = (date1, date2) => {
    return date1.toISOString().split('T')[0] === date2.toISOString().split('T')[0];
  };

  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 6; hour < 23; hour += 1) {
      const hourStr = String(hour).padStart(2, '0');
      const time24 = `${hourStr}:00`;
      slots.push({
        hour,
        time24,
        time12: formatTime(time24)
      });
    }
    return slots;
  };

  const calculateEventPosition = (startTime, endTime) => {
    if (!startTime) return { top: 0, height: 60 };

    const parseTime = (timeStr) => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return (hours * 60) + minutes;
    };

    const dayStartMinutes = 6 * 60;
    const startMinutes = parseTime(startTime);
    const endMinutes = endTime ? parseTime(endTime) : startMinutes + 60;

    const top = ((startMinutes - dayStartMinutes) / 60) * 60;
    const duration = endMinutes - startMinutes;
    const height = Math.max((duration / 60) * 60, 30);

    return { top, height };
  };

  const getTimeFromPosition = (pixelY) => {
    const hour = Math.floor(pixelY / 60) + 6;
    const minutes = Math.round(((pixelY % 60) / 60) * 60 / 15) * 15;
    return `${String(hour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  };

  // Local-timezone-safe helper: convert a Date to "YYYY-MM-DD" using local calendar fields
  const localDateStr = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // Parse a "YYYY-MM-DD" string into a local-midnight Date (no UTC shift)
  const parseDateLocal = (str) => {
    const parts = String(str).split('T')[0].split('-').map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]);
  };

  // Check if event spans multiple days
  const isMultiDayEvent = (event) => {
    if (!event.start || !event.endDate) return false;
    return event.start.split('T')[0] !== event.endDate;
  };

  // Get all local-midnight Dates an event spans
  const getEventDateRange = (event) => {
    if (!event.start) return [];
    const startDate = parseDateLocal(event.start);
    if (!event.endDate) return [startDate];
    const endDate = parseDateLocal(event.endDate);
    const dates = [];
    const current = new Date(startDate);
    while (current <= endDate) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };

  const eventOccursOnDate = (event, date) => {
    const target = localDateStr(date);
    return getEventDateRange(event).some(d => localDateStr(d) === target);
  };

  const isFirstDayOfEvent = (event, date) => {
    if (!event?.start) return false;
    return event.start.split('T')[0] === localDateStr(date);
  };

  const isLastDayOfEvent = (event, date) => {
    if (!event?.endDate) return true;
    return event.endDate === localDateStr(date);
  };

  const getDaysRemainingInWeek = (date) => {
    return 6 - date.getDay();
  };

  const getSpanColor = (typeKey) => {
    const colors = {
      rehearsal: '#3b82f6',
      tech: '#a855f7',
      performance: '#ef4444',
      deadline: '#f97316',
      meeting: '#22c55e',
      'costume-fitting': '#ec4899',
      build: '#6366f1'
    };
    return colors[typeKey] || '#6b7280';
  };

  const calculateSpanDays = (event, startDay) => {
    if (!isMultiDayEvent(event)) return 1;

    const eventDates = getEventDateRange(event);
    const startDateStr = startDay.toISOString().split('T')[0];
    const startIndex = eventDates.findIndex(d => d.toISOString().split('T')[0] === startDateStr);
    if (startIndex === -1) return 0;

    const daysInWeek = getDaysRemainingInWeek(startDay) + 1;
    const daysRemaining = eventDates.length - startIndex;

    return Math.min(daysInWeek, daysRemaining);
  };
  
  // Rehearsal-specific helpers - Extract production data
  const getAllScenes = () => {
    const scenes = [];
    if (production.acts && Array.isArray(production.acts)) {
      production.acts.forEach((act, actIndex) => {
        if (act.scenes && Array.isArray(act.scenes)) {
          act.scenes.forEach((scene, sceneIndex) => {
            scenes.push({
              id: `${actIndex}-${sceneIndex}`,
              actIndex,
              sceneIndex,
              label: `${act.name || 'Act ' + (actIndex + 1)} - Scene ${scene.number || sceneIndex + 1}: ${scene.label || scene.title || 'Untitled'}`,
              actName: act.name,
              sceneNumber: scene.number || sceneIndex + 1,
              sceneTitle: scene.label || scene.title
            });
          });
        }
      });
    }
    return scenes;
  };

  const getAllCharacters = () => {
    const characters = new Set();
    const productionChars = production.characters || [];
    if (production.acts && Array.isArray(production.acts)) {
      production.acts.forEach(act => {
        if (act.scenes && Array.isArray(act.scenes)) {
          act.scenes.forEach(scene => {
            // Scenes store characterIds (array of IDs); look up names from production.characters
            if (scene.characterIds && Array.isArray(scene.characterIds)) {
              scene.characterIds.forEach(charId => {
                const char = productionChars.find(c => c.id === charId);
                if (char?.name) characters.add(char.name);
              });
            }
          });
        }
      });
    }
    return Array.from(characters).sort();
  };

  const getAllProps = () => {
    const props = [];
    if (production.acts && Array.isArray(production.acts)) {
      production.acts.forEach((act, actIndex) => {
        if (act.scenes && Array.isArray(act.scenes)) {
          act.scenes.forEach((scene, sceneIndex) => {
            if (scene.props && Array.isArray(scene.props)) {
              scene.props.forEach(prop => {
                props.push({
                  id: prop.id || `prop_${Math.random()}`,
                  name: prop.name || prop.description || 'Unnamed Prop',
                  scene: `${act.name || 'Act ' + (actIndex + 1)} - Scene ${scene.number || sceneIndex + 1}`
                });
              });
            }
          });
        }
      });
    }
    return props;
  };

  const getAllCostumes = () => {
    const costumes = [];
    if (production.acts && Array.isArray(production.acts)) {
      production.acts.forEach((act, actIndex) => {
        if (act.scenes && Array.isArray(act.scenes)) {
          act.scenes.forEach((scene, sceneIndex) => {
            if (scene.wardrobe && Array.isArray(scene.wardrobe)) {
              scene.wardrobe.forEach(costume => {
                costumes.push({
                  id: costume.id || `costume_${Math.random()}`,
                  name: costume.description || costume.name || 'Unnamed Costume',
                  character: costume.character,
                  scene: `${act.name || 'Act ' + (actIndex + 1)} - Scene ${scene.number || sceneIndex + 1}`
                });
              });
            }
          });
        }
      });
    }
    return costumes;
  };

  const getSceneLabel = (sceneId) => {
    const allScenes = getAllScenes();
    const scene = allScenes.find(s => s.id === sceneId);
    return scene ? scene.label : sceneId;
  };

  const allScenes = getAllScenes();
  const allCharacters = getAllCharacters();
  const allProps = getAllProps();
  const allCostumes = getAllCostumes();
  
  // Conflict detection
  const detectConflicts = () => {
    const conflicts = [];

    const normalizedEvents = events.map(migrateEvent);
    
    normalizedEvents.forEach((event1, idx1) => {
      normalizedEvents.forEach((event2, idx2) => {
        if (idx1 >= idx2) return;

        const event1Start = event1.start ? new Date(event1.start) : null;
        const event2Start = event2.start ? new Date(event2.start) : null;
        if (!event1Start || !event2Start) return;
        if (isNaN(event1Start.getTime()) || isNaN(event2Start.getTime())) return;

        const event1DateStr = event1Start.toISOString().split('T')[0];
        const event2DateStr = event2Start.toISOString().split('T')[0];
        if (event1DateStr !== event2DateStr) return;

        const event1End = event1.end ? new Date(event1.end) : event1Start;
        const event2End = event2.end ? new Date(event2.end) : event2Start;
        if (isNaN(event1End.getTime()) || isNaN(event2End.getTime())) return;

        const overlaps = (event1Start < event2End && event1End > event2Start);
        
        if (overlaps) {
          conflicts.push({
            type: 'time',
            event1,
            event2,
            message: `Time conflict: "${event1.title}" and "${event2.title}" overlap on ${event1DateStr}`
          });
        }
        
        if (event1.propsNeeded && event2.propsNeeded) {
          const sharedProps = event1.propsNeeded.filter(p => event2.propsNeeded.includes(p));
          if (sharedProps.length > 0 && overlaps) {
            conflicts.push({
              type: 'props',
              event1,
              event2,
              resources: sharedProps,
              message: `Props conflict: ${sharedProps.length} prop(s) needed by both events`
            });
          }
        }
        
        if (event1.costumesNeeded && event2.costumesNeeded) {
          const sharedCostumes = event1.costumesNeeded.filter(c => event2.costumesNeeded.includes(c));
          if (sharedCostumes.length > 0 && overlaps) {
            conflicts.push({
              type: 'costumes',
              event1,
              event2,
              resources: sharedCostumes,
              message: `Costume conflict: ${sharedCostumes.length} costume(s) needed by both events`
            });
          }
        }
        
        if (event1.charactersNeeded && event2.charactersNeeded) {
          const sharedCharacters = event1.charactersNeeded.filter(c => event2.charactersNeeded.includes(c));
          if (sharedCharacters.length > 0 && overlaps) {
            conflicts.push({
              type: 'characters',
              event1,
              event2,
              resources: sharedCharacters,
              message: `Actor conflict: ${sharedCharacters.join(', ')} needed at both events`
            });
          }
        }
      });
    });
    
    return conflicts;
  };
  
  const conflicts = detectConflicts();
  
  // Dashboard functions
  const getUpcomingEvents = () => {
    const todayLocal = new Date();
    todayLocal.setHours(0, 0, 0, 0);
    const todayStr = localDateStr(todayLocal);
    const weekFromNow = new Date(todayLocal);
    weekFromNow.setDate(weekFromNow.getDate() + 7);
    const weekStr = localDateStr(weekFromNow);

    return events
      .map(migrateEvent)
      .filter(event => {
        if (!event.start) return false;
        const dateStr = event.start.split('T')[0];
        return dateStr >= todayStr && dateStr <= weekStr;
      })
      .sort((a, b) => (a.start || '').localeCompare(b.start || ''));
  };

  const getTodaysEvents = () => {
    const todayStr = localDateStr(new Date());
    return events
      .map(migrateEvent)
      .filter(event => {
        if (!event.start) return false;
        return event.start.split('T')[0] === todayStr;
      })
      .sort((a, b) => (a.start || '').localeCompare(b.start || ''));
  };
  
  const getPropsNeededThisWeek = () => {
    const upcomingEvents = getUpcomingEvents();
    const propsSet = new Set();
    
    upcomingEvents.forEach(event => {
      if (event.propsNeeded) {
        event.propsNeeded.forEach(propId => propsSet.add(propId));
      }
    });
    
    return Array.from(propsSet).map(propId => {
      const prop = allProps.find(p => p.id === propId);
      return prop || { id: propId, name: propId };
    });
  };
  
  const getCostumesNeededThisWeek = () => {
    const upcomingEvents = getUpcomingEvents();
    const costumesSet = new Set();
    
    upcomingEvents.forEach(event => {
      if (event.costumesNeeded) {
        event.costumesNeeded.forEach(costumeId => costumesSet.add(costumeId));
      }
    });
    
    return Array.from(costumesSet).map(costumeId => {
      const costume = allCostumes.find(c => c.id === costumeId);
      return costume || { id: costumeId, name: costumeId };
    });
  };
  
  const getMilestones = () => {
    return events
      .filter(e => e.type === 'deadline' || e.type === 'performance')
      .map(migrateEvent)
      .sort((a, b) => {
        const aDate = new Date(a.start || a.createdAt);
        const bDate = new Date(b.start || b.createdAt);
        return aDate - bDate;
      });
  };
  
  // Event management functions
  const handleAddEvent = () => {
    const defaultDate = currentDate.toISOString().split('T')[0];
    const defaultStartTime = '19:00';
    const defaultEndTime = '22:00';
    const newEvent = {
      id: 'event_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      title: '',
      type: 'rehearsal',
      subtype: '', // NEW: event subtype
      start: combineDateTimeLocal(defaultDate, defaultStartTime),
      end: combineDateTimeLocal(defaultDate, defaultEndTime),
      location: '',
      notes: '',
      status: 'scheduled',
      
      // Rehearsal-specific fields
      scenes: [],
      charactersNeeded: [],
      propsNeeded: [],
      costumesNeeded: [],
      attendees: [],
      attendance: {}, // NEW: attendance tracking
      
      createdAt: new Date().toISOString()
    };
    setEditingEvent(buildFormEvent(newEvent, {
      date: defaultDate,
      startTime: defaultStartTime,
      endTime: defaultEndTime
    }));
    setRehearsalType('custom');
    setShowEventModal(true);
  };
  
  const handleSaveEvent = () => {
    if (!editingEvent || !editingEvent.title) {
      alert('Please enter an event title');
      return;
    }

    if (!editingEvent.date) {
      alert('Please select a date');
      return;
    }

    console.log('Saving event:', editingEvent);
    console.log('Has endDate:', !!editingEvent.endDate);

    const eventToSave = {
      ...editingEvent,
      id: editingEvent.id || `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: editingEvent.type || 'rehearsal',
      title: editingEvent.title || 'Untitled Event',
      start: combineDateTimeLocal(editingEvent.date, editingEvent.startTime || '00:00'),
      end: editingEvent.endTime ? combineDateTimeLocal(editingEvent.date, editingEvent.endTime) : null,
      location: editingEvent.location === '__custom__' ? '' : (editingEvent.location || ''),
      rehearsalType: editingEvent.type === 'rehearsal' ? rehearsalType : undefined,
      scenes: editingEvent.scenes || [],
      includeAllProps: editingEvent.includeAllProps || false,
      includeAllCostumes: editingEvent.includeAllCostumes || false,
      createdAt: editingEvent.createdAt || new Date().toISOString(),
      createdByRole: editingEvent.createdByRole || userRole || 'admin',
    };

    if (editingEvent.endDate && editingEvent.endDate !== editingEvent.date) {
      eventToSave.endDate = editingEvent.endDate;
    } else {
      delete eventToSave.endDate;
    }

    delete eventToSave.date;
    delete eventToSave.startTime;
    delete eventToSave.endTime;

    console.log('Event to save:', eventToSave);

    // Build updated production with the new/edited event in production.calendar
    const updatedProduction = { ...production };
    if (!updatedProduction.calendar) updatedProduction.calendar = [];

    const existingIndex = updatedProduction.calendar.findIndex(e => e.id === eventToSave.id);
    if (existingIndex >= 0) {
      updatedProduction.calendar = [
        ...updatedProduction.calendar.slice(0, existingIndex),
        eventToSave,
        ...updatedProduction.calendar.slice(existingIndex + 1)
      ];
    } else {
      updatedProduction.calendar = [...updatedProduction.calendar, eventToSave];
    }

    console.log('✅ Calendar after save:', updatedProduction.calendar.length, 'events');

    // Keep internal events state in sync
    setEvents(updatedProduction.calendar);

    // Persist via parent
    if (onSave) {
      onSave(updatedProduction);
    }

    setShowEventModal(false);
    setEditingEvent(null);
    setSelectedEvent(null);
  };
  
  const openEditModal = (event) => {
    const startParsed = parseDateTime(event.start);
    const endParsed = parseDateTime(event.end);
    
    const editData = {
      ...event,
      date: startParsed.date,
      startTime: startParsed.time || '',
      endTime: endParsed.time || ''
    };

    if (event.endDate) {
      editData.endDate = event.endDate;
    }

    setEditingEvent(editData);
    setSelectedEvent(event);
    setRehearsalType(editData.rehearsalType || 'custom');
    setShowEventModal(true);
  };
  
  const handleDeleteEvent = (eventId) => {
    if (!confirm('Delete this event?')) return;
    const updatedProduction = { ...production };
    updatedProduction.calendar = (updatedProduction.calendar || events).filter(e => e.id !== eventId);
    setEvents(updatedProduction.calendar);
    if (onSave) {
      onSave(updatedProduction);
    }
    setShowEventModal(false);
    setEditingEvent(null);
  };

  const handleDuplicateEvent = (event) => {
    const formEvent = buildFormEvent(event);
    const duplicatedEvent = {
      ...formEvent,
      id: undefined,
      createdAt: undefined,
      title: `${formEvent.title || 'Event'} (Copy)`
    };
    setEditingEvent(duplicatedEvent);
    setRehearsalType(formEvent.rehearsalType || 'custom');
    setShowEventModal(true);
    if (window.showToast) window.showToast('📋 Duplicating event - edit details and save', 'info');
  };

  // Generate Tech Week Template
  const generateTechWeek = () => {
    if (!confirm('Generate a standard Tech Week schedule? This will create 7 events.')) return;
    
    // Find next Monday or use a specific date
    const today = new Date();
    const daysUntilMonday = (8 - today.getDay()) % 7 || 7;
    const techWeekStart = new Date(today);
    techWeekStart.setDate(today.getDate() + daysUntilMonday);
    
    const techWeekEvents = [
      {
        day: 0, // Monday
        title: 'Cue-to-Cue',
        type: 'tech',
        subtype: 'cue-to-cue',
        startTime: '18:00',
        endTime: '22:00',
        notes: 'Run all technical cues with actors. Stop for each light, sound, and set cue.'
      },
      {
        day: 1, // Tuesday
        title: 'Technical Rehearsal',
        type: 'tech',
        subtype: 'tech-rehearsal',
        startTime: '18:00',
        endTime: '22:00',
        notes: 'Stop-and-go technical rehearsal. Work through problem areas.'
      },
      {
        day: 2, // Wednesday
        title: 'First Dress Rehearsal',
        type: 'tech',
        subtype: 'dress-1',
        startTime: '18:00',
        endTime: '22:00',
        notes: 'Full costumes, makeup, props. Stop for major issues only.'
      },
      {
        day: 3, // Thursday
        title: 'Second Dress Rehearsal',
        type: 'tech',
        subtype: 'dress-2',
        startTime: '18:00',
        endTime: '22:00',
        notes: 'Full dress. Minimal stops. Notes after.'
      },
      {
        day: 4, // Friday
        title: 'Final Dress Rehearsal',
        type: 'tech',
        subtype: 'final-dress',
        startTime: '18:00',
        endTime: '22:00',
        notes: 'Treat as performance. No stops. Full audience simulation.'
      },
      {
        day: 5, // Saturday
        title: 'Opening Night',
        type: 'performance',
        subtype: 'opening',
        startTime: '19:00',
        endTime: '21:30',
        notes: 'Opening night performance!'
      },
      {
        day: 6, // Sunday
        title: 'Photo Call',
        type: 'tech',
        subtype: 'photo-call',
        startTime: '14:00',
        endTime: '16:00',
        notes: 'Production photos. Key scenes and moments.'
      }
    ];
    
    const newEvents = techWeekEvents.map(template => {
      const eventDate = new Date(techWeekStart);
      eventDate.setDate(techWeekStart.getDate() + template.day);
      const dateStr = eventDate.toISOString().split('T')[0];
      
      return {
        id: 'event_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        title: template.title,
        type: template.type,
        subtype: template.subtype,
        start: combineDateTimeLocal(dateStr, template.startTime),
        end: combineDateTimeLocal(dateStr, template.endTime),
        location: 'Main Stage',
        notes: template.notes,
        status: 'scheduled',
        scenes: [],
        charactersNeeded: [],
        propsNeeded: [],
        costumesNeeded: [],
        attendees: ['Full Cast', 'Full Crew'],
        attendance: {},
        createdAt: new Date().toISOString()
      };
    });
    
    setEvents(prev => [...prev, ...newEvents]);
    alert('Tech Week schedule created! Check your calendar.');
  };
  
  // Date navigation
  const navigateMonth = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + direction);
    setCurrentDate(newDate);
  };
  
  const navigateWeek = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + (direction * 7));
    setCurrentDate(newDate);
  };
  
  const navigateDay = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + direction);
    setCurrentDate(newDate);
  };
  
  const goToToday = () => {
    setCurrentDate(new Date());
  };
  
  // Get events for a specific date
  const getEventsForDate = (date, eventsList = events) => {
    return eventsList
      .map(migrateEvent)
      .filter(event => eventOccursOnDate(event, date))
      .sort((a, b) => {
        const aDate = new Date(a.start || a.createdAt);
        const bDate = new Date(b.start || b.createdAt);
        return aDate - bDate;
      });
  };
  
  // Calendar helpers
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    return { daysInMonth, startingDayOfWeek, year, month };
  };
  
  const getWeekDays = (date) => {
    const startOfWeek = getWeekStart(date);
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      return day;
    });
  };
  
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  // Export calendar to CSV
  const handleExportCalendar = () => {
    const csvData = events.map(event => {
      const migrated = migrateEvent(event);
      const startParsed = parseDateTime(migrated.start);
      const endParsed = parseDateTime(migrated.end);
      return {
        'Date': startParsed.date,
        'Start Time': formatTime(startParsed.time),
        'End Time': formatTime(endParsed.time),
        'Title': migrated.title,
        'Type': eventTypes[migrated.type]?.label || migrated.type,
        'Subtype': migrated.subtype || '',
        'Location': migrated.location || '',
        'Scenes': migrated.scenes.map(s => getSceneLabel(s)).join('; ') || '',
        'Characters': migrated.charactersNeeded.join(', ') || '',
        'Props': migrated.propsNeeded.length || 0,
        'Costumes': migrated.costumesNeeded.length || 0,
        'Attendees': migrated.attendees.join(', ') || '',
        'Notes': migrated.notes || ''
      };
    });
    
    if (csvData.length === 0) {
      alert('No events to export.');
      return;
    }
    
    const headers = Object.keys(csvData[0]);
    const csvContent = [
      headers.join(','),
      ...csvData.map(row =>
        headers.map(header => {
          const value = String(row[header] || '');
          if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    const productionName = (production.title || 'Production').replace(/[^a-z0-9]/gi, '_');
    const date = new Date().toISOString().split('T')[0];
    const filename = `${productionName}_Calendar_${date}.csv`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log(`Calendar exported to ${filename}`);
  };
  
  // Render calendar
  return React.createElement(
    'div',
    { className: 'calendar-view p-6' },
    
    // Header
    React.createElement(
      'div',
      { className: 'mb-6' },
      React.createElement('h2', { className: 'text-2xl font-bold mb-4' }, 
        `📅 Production Calendar - ${production.title || 'Untitled Production'}`
      ),
      
      // Controls row
      React.createElement(
        'div',
        { className: 'flex items-center justify-between gap-3 flex-wrap' },
        
        // View mode buttons (left side)
        React.createElement(
          'div',
          { className: 'flex gap-2' },
          React.createElement('button', {
            onClick: () => setViewMode('month'),
            className: `px-3 py-2 rounded-lg font-medium text-sm whitespace-nowrap ${
              viewMode === 'month' ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`
          }, 'Month'),
          React.createElement('button', {
            onClick: () => setViewMode('week'),
            className: `px-3 py-2 rounded-lg font-medium text-sm whitespace-nowrap ${
              viewMode === 'week' ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`
          }, 'Week'),
          React.createElement('button', {
            onClick: () => setViewMode('day'),
            className: `px-3 py-2 rounded-lg font-medium text-sm whitespace-nowrap ${
              viewMode === 'day' ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`
          }, 'Day')
        ),
        React.createElement(
          'div',
          { className: 'text-xs text-gray-500 flex items-center gap-4' },
          React.createElement('span', null, '⌨️ Shortcuts:'),
          React.createElement(
            'span',
            { className: 'hidden sm:inline' },
            React.createElement('kbd', { className: 'px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-[10px]' }, '←→'),
            ' Navigate'
          ),
          React.createElement(
            'span',
            { className: 'hidden sm:inline' },
            React.createElement('kbd', { className: 'px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-[10px]' }, 'T'),
            ' Today'
          ),
          React.createElement(
            'span',
            { className: 'hidden sm:inline' },
            React.createElement('kbd', { className: 'px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-[10px]' }, 'N'),
            ' New Event'
          ),
          React.createElement(
            'span',
            { className: 'hidden sm:inline' },
            React.createElement('kbd', { className: 'px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-[10px]' }, 'M/W/D'),
            ' Views'
          )
        ),
        
        // Navigation (center)
        React.createElement(
          'div',
          { className: 'flex items-center gap-2' },
          React.createElement('button', {
            onClick: () => {
              if (viewMode === 'month') navigateMonth(-1);
              else if (viewMode === 'week') navigateWeek(-1);
              else navigateDay(-1);
            },
            className: 'px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 font-medium'
          }, '◀'),
          React.createElement('button', {
            onClick: goToToday,
            className: 'px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium text-sm whitespace-nowrap text-gray-700'
          }, 'Today'),
          React.createElement('button', {
            onClick: () => {
              if (viewMode === 'month') navigateMonth(1);
              else if (viewMode === 'week') navigateWeek(1);
              else navigateDay(1);
            },
            className: 'px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 font-medium'
          }, '▶'),
          React.createElement('div', { className: 'ml-2 text-base font-semibold text-gray-800 whitespace-nowrap' },
            viewMode === 'month' ? `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}` :
            viewMode === 'week' ? `Week of ${currentDate.toLocaleDateString()}` :
            currentDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
          )
        ),
        
        // Action buttons (right side)
        React.createElement(
          'div',
          { className: 'flex gap-2 ml-auto' },
          React.createElement('button', {
            onClick: handleAddEvent,
            className: 'px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm whitespace-nowrap flex items-center gap-1'
          }, '+ Add Event'),
          FULL_ACCESS_ROLES.includes(userRole) && React.createElement('button', {
            onClick: generateTechWeek,
            className: 'px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium text-sm whitespace-nowrap flex items-center gap-1'
          }, '🎭 Tech Week'),
          React.createElement('button', {
            onClick: () => setShowDashboard(!showDashboard),
            title: showDashboard ? 'Return to calendar view' : 'View dashboard summary',
            className: `px-3 py-2 rounded-lg font-medium text-sm whitespace-nowrap flex items-center gap-1 transition-colors ${
              showDashboard ? 'bg-white text-gray-900 hover:bg-gray-100 border border-gray-300' : 'bg-blue-600 text-white hover:bg-blue-700'
            }`
          }, showDashboard ? '📅 Calendar' : '📊 Dashboard'),
          React.createElement('button', {
            onClick: handleExportCalendar,
            className: 'px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm whitespace-nowrap flex items-center gap-1'
          }, '📥 Export')
        )
      )
    ),
    
    // Event type legend
    React.createElement(
      'div',
      { className: 'mb-4 flex flex-wrap gap-3 p-3 bg-gray-50 rounded-lg' },
      Object.entries(eventTypes).map(([key, type]) =>
        React.createElement(
          'div',
          { key: key, className: 'flex items-center gap-2' },
          React.createElement('div', { className: `w-4 h-4 rounded ${type.color}` }),
          React.createElement('span', { className: 'text-sm text-gray-700' }, type.label)
        )
      )
    ),
    
    // Production Dashboard or Calendar views
    showDashboard ? (
      // PRODUCTION DASHBOARD
      React.createElement(
        'div',
        { className: 'space-y-6' },
        React.createElement('h3', { className: 'text-2xl font-bold' }, '📊 Production Dashboard'),
        
        // Stats cards
        React.createElement(
          'div',
          { className: 'grid grid-cols-4 gap-4' },
          React.createElement(
            'div',
            { className: 'p-4 bg-blue-50 border border-blue-200 rounded-lg' },
            React.createElement('div', { className: 'text-sm text-gray-600 mb-1' }, 'Total Events'),
            React.createElement('div', { className: 'text-3xl font-bold text-blue-700' }, events.length),
            React.createElement('div', { className: 'text-xs text-gray-500 mt-1' },
              `${events.filter(e => e.type === 'rehearsal').length} rehearsals`
            )
          ),
          React.createElement(
            'div',
            { className: 'p-4 bg-green-50 border border-green-200 rounded-lg' },
            React.createElement('div', { className: 'text-sm text-gray-600 mb-1' }, 'This Week'),
            React.createElement('div', { className: 'text-3xl font-bold text-green-700' }, getUpcomingEvents().length),
            React.createElement('div', { className: 'text-xs text-gray-500 mt-1' },
              `${getTodaysEvents().length} today`
            )
          ),
          React.createElement(
            'div',
            { className: 'p-4 bg-orange-50 border border-orange-200 rounded-lg' },
            React.createElement('div', { className: 'text-sm text-gray-600 mb-1' }, 'Conflicts'),
            React.createElement('div', { className: 'text-3xl font-bold text-orange-700' }, conflicts.length),
            conflicts.length > 0 && React.createElement('button', {
              onClick: () => setShowConflicts(true),
              className: 'text-xs text-orange-600 hover:underline mt-1'
            }, 'View Details')
          ),
          React.createElement(
            'div',
            { className: 'p-4 bg-purple-50 border border-purple-200 rounded-lg' },
            React.createElement('div', { className: 'text-sm text-gray-600 mb-1' }, 'Milestones'),
            React.createElement('div', { className: 'text-3xl font-bold text-purple-700' }, getMilestones().length),
            React.createElement('div', { className: 'text-xs text-gray-500 mt-1' },
              `${events.filter(e => e.type === 'performance').length} performances`
            )
          )
        ),
        
        // Two-column layout
        React.createElement(
          'div',
          { className: 'grid grid-cols-2 gap-6' },
          
          // Left column: Upcoming events
          React.createElement(
            'div',
            null,
            React.createElement('h4', { className: 'text-lg font-semibold mb-3' }, '📅 Upcoming This Week'),
            React.createElement(
              'div',
              { className: 'space-y-2 max-h-96 overflow-y-auto' },
              getUpcomingEvents().length === 0 ? React.createElement('p', { className: 'text-gray-500 text-sm' },
                'No events scheduled this week'
              ) : getUpcomingEvents().map(event => {
                const type = eventTypes[event.type] || eventTypes.rehearsal;
                const startParsed = parseDateTime(event.start);
                const eventDate = event.start ? parseDateLocal(event.start) : null;
                return React.createElement(
                  'div',
                  {
                    key: event.id,
                    className: `p-3 border rounded-lg ${type.bgLight} ${type.border} cursor-pointer hover:shadow-md`,
                    onClick: () => openEditModal(event)
                  },
                  React.createElement('div', { className: 'flex items-start justify-between' },
                    React.createElement(
                      'div',
                      null,
                      React.createElement('div', { className: `text-sm font-semibold ${type.textColor}` }, event.title),
                      React.createElement('div', { className: 'text-xs text-gray-600 mt-1' },
                        `${eventDate ? eventDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : 'No date'}${startParsed.time ? ` • ${formatTime(startParsed.time)}` : ''}`
                      ),
                      event.scenes?.length > 0 && React.createElement('div', { className: 'text-xs text-gray-500 mt-1' },
                        `${event.scenes.length} scene(s)`
                      )
                    ),
                    React.createElement('div', { className: `px-2 py-1 rounded text-xs ${type.color} text-white` },
                      type.label
                    )
                  )
                );
              })
            )
          ),
          
          // Right column: Resources & Milestones
          React.createElement(
            'div',
            { className: 'space-y-4' },
            
            React.createElement(
              'div',
              null,
              React.createElement('h4', { className: 'text-lg font-semibold mb-3' }, '🎭 Props Needed This Week'),
              React.createElement(
                'div',
                { className: 'p-3 bg-blue-50 border border-blue-200 rounded-lg' },
                getPropsNeededThisWeek().length === 0 ? React.createElement('p', { className: 'text-sm text-gray-500' },
                  'No props needed'
                ) : React.createElement(
                  'div',
                  { className: 'space-y-1' },
                  getPropsNeededThisWeek().slice(0, 5).map(prop =>
                    React.createElement('div', { key: prop.id, className: 'text-sm' }, `• ${prop.name}`)
                  ),
                  getPropsNeededThisWeek().length > 5 && React.createElement('div', { className: 'text-xs text-gray-500 mt-1' },
                    `+${getPropsNeededThisWeek().length - 5} more`
                  )
                )
              )
            ),
            
            React.createElement(
              'div',
              null,
              React.createElement('h4', { className: 'text-lg font-semibold mb-3' }, '👗 Costumes Needed This Week'),
              React.createElement(
                'div',
                { className: 'p-3 bg-pink-50 border border-pink-200 rounded-lg' },
                getCostumesNeededThisWeek().length === 0 ? React.createElement('p', { className: 'text-sm text-gray-500' },
                  'No costumes needed'
                ) : React.createElement(
                  'div',
                  { className: 'space-y-1' },
                  getCostumesNeededThisWeek().slice(0, 5).map(costume =>
                    React.createElement('div', { key: costume.id, className: 'text-sm' }, `• ${costume.name}`)
                  ),
                  getCostumesNeededThisWeek().length > 5 && React.createElement('div', { className: 'text-xs text-gray-500 mt-1' },
                    `+${getCostumesNeededThisWeek().length - 5} more`
                  )
                )
              )
            ),
            
            React.createElement(
              'div',
              null,
              React.createElement('h4', { className: 'text-lg font-semibold mb-3' }, '🎯 Upcoming Milestones'),
              React.createElement(
                'div',
                { className: 'space-y-2' },
                getMilestones().slice(0, 5).map(milestone => {
                  const type = eventTypes[milestone.type] || eventTypes.deadline;
                  const milestoneDate = milestone.start ? new Date(milestone.start) : null;
                  return React.createElement(
                    'div',
                    {
                      key: milestone.id,
                      className: `p-2 border rounded ${type.bgLight} ${type.border} text-sm`
                    },
                    React.createElement('div', { className: 'font-semibold' }, milestone.title),
                    React.createElement('div', { className: 'text-xs text-gray-600' },
                      `${milestoneDate && !isNaN(milestoneDate.getTime()) ? milestoneDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No date'}`
                    )
                  );
                })
              )
            )
          )
        )
      )
    ) : (
      // CALENDAR VIEWS
    viewMode === 'month' ? (
      // MONTH VIEW
      (() => {
        const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate);
        const weeks = [];
        let currentWeek = [];
        
        // Add empty cells for days before month starts
        for (let i = 0; i < startingDayOfWeek; i++) {
          currentWeek.push(null);
        }
        
        // Add days of month
        for (let day = 1; day <= daysInMonth; day++) {
          const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
          currentWeek.push(date);
          
          if (currentWeek.length === 7) {
            weeks.push(currentWeek);
            currentWeek = [];
          }
        }
        
        // Add remaining empty cells
        while (currentWeek.length > 0 && currentWeek.length < 7) {
          currentWeek.push(null);
        }
        if (currentWeek.length > 0) {
          weeks.push(currentWeek);
        }
        
        return React.createElement(
          'div',
          { className: 'border border-gray-300 rounded-lg overflow-hidden' },
          
          // Day headers
          React.createElement(
            'div',
            { className: 'grid grid-cols-7 bg-gray-100 border-b border-gray-300' },
            dayNames.map(day =>
              React.createElement('div', { 
                key: day, 
                className: 'p-2 text-center font-semibold text-sm border-r border-gray-300 last:border-r-0'
              }, day)
            )
          ),
          
          // Calendar grid
          weeks.map((week, weekIdx) =>
            React.createElement(
              'div',
              { key: weekIdx, className: 'grid grid-cols-7 border-b border-gray-300 last:border-b-0' },
              week.map((date, dayIdx) => {
                if (!date) {
                  return React.createElement('div', { 
                    key: dayIdx, 
                    className: 'min-h-24 p-2 bg-gray-50 border-r border-gray-300 last:border-r-0'
                  });
                }
                
                const dayEvents = getEventsForDate(date);
                const isToday = date.toDateString() === new Date().toDateString();
                
                return React.createElement(
                  'div',
                  { 
                    key: dayIdx,
                    className: `p-2 min-h-[120px] border overflow-hidden hover:bg-gray-50 transition-colors cursor-pointer ${
                      isToday ? 'bg-blue-50 border-blue-400 border-2 shadow-sm' : 'bg-white border-gray-200'
                    }`,
                    onClick: () => {
                      setEditingEvent({ date: date.toISOString().split('T')[0] });
                      setShowEventModal(true);
                    }
                  },
                  
                  // Day number
                  React.createElement('div', { 
                    className: `text-sm font-semibold mb-2 ${isToday ? 'text-blue-600' : 'text-gray-700'}`
                  },
                    date.getDate(),
                    isToday && React.createElement(
                      'span',
                      { className: 'ml-1 text-[10px] font-normal bg-blue-600 text-white px-1.5 py-0.5 rounded' },
                      'Today'
                    )
                  ),
                  
                  // Events
                  React.createElement(
                    'div',
                    { className: 'space-y-1 relative' },
                    dayEvents
                      .slice(0, 3)
                      .map(event => {
                        const typeKey = normalizeType(event.type);
                        const typeStyles = eventTypes[typeKey] || eventTypes.meeting;
                        const isMultiDay = isMultiDayEvent(event);
                        const isFirst = isFirstDayOfEvent(event, date);
                        const isLast = isLastDayOfEvent(event, date);
                        const tooltipText = [
                          event.title,
                          event.scenes?.length ? `Scenes: ${event.scenes.map(s => getSceneLabel(s)).join(', ')}` : '',
                          event.charactersNeeded?.length ? `Cast: ${event.charactersNeeded.join(', ')}` : ''
                        ].filter(Boolean).join('\n');

                        if (isMultiDay) {
                          const roundClass = (isFirst && isLast) ? 'rounded' : isFirst ? 'rounded-l' : isLast ? 'rounded-r' : '';
                          return React.createElement(
                            'button',
                            {
                              key: event.id,
                              onClick: (e) => { e.stopPropagation(); openEditModal(event); },
                              className: `text-left py-0.5 text-[11px] hover:opacity-80 transition-opacity overflow-hidden ${roundClass}`,
                              style: {
                                backgroundColor: getSpanColor(typeKey),
                                width: 'calc(100% + 16px)',
                                marginLeft: '-8px',
                                paddingLeft: isFirst ? '8px' : '4px',
                                paddingRight: '4px'
                              },
                              title: tooltipText
                            },
                            isFirst
                              ? React.createElement('span', { className: 'font-medium text-white truncate block leading-tight' }, event.title)
                              : React.createElement('span', { style: { visibility: 'hidden' }, className: 'leading-tight' }, '\u00A0')
                          );
                        }

                        const eventStart = event.start || event.date;
                        const showTime = eventStart && eventStart.includes('T') && eventStart !== `${eventStart.split('T')[0]}T00:00:00`;
                        const startTime = showTime ? formatTime(eventStart.split('T')[1].substring(0, 5)) : '';

                        return React.createElement(
                          'button',
                          {
                            key: event.id,
                            onClick: (e) => {
                              e.stopPropagation();
                              openEditModal(event);
                            },
                            className: `text-left p-1.5 px-2 rounded border ${typeStyles.border} ${typeStyles.bgLight} hover:shadow-md transition-shadow text-xs w-full`,
                            title: tooltipText
                          },
                          React.createElement(
                            'div',
                            { className: 'flex items-start gap-1.5' },
                            startTime && React.createElement(
                              'span',
                              { className: `font-bold ${typeStyles.textColor} text-[10px] whitespace-nowrap` },
                              startTime
                            ),
                            React.createElement(
                              'span',
                              { className: `font-medium ${typeStyles.textColor} truncate flex-1 leading-tight` },
                              event.title
                            )
                          )
                        );
                      }),
                    dayEvents.length > 3 && React.createElement(
                      'button',
                      {
                        onClick: (e) => {
                          e.stopPropagation();
                          alert(`All events for ${formatDateDisplay(date, 'long')}:\n\n${dayEvents.map((event, idx) => `${idx + 1}. ${event.title}${event.start && event.start.includes('T') ? ' - ' + formatTime(event.start.split('T')[1].substring(0, 5)) : ''}`).join('\n')}`);
                        },
                        className: 'text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-0.5 hover:bg-blue-100 rounded transition-colors'
                      },
                      `+${dayEvents.length - 3} more`
                    )
                  )
                );
              })
            )
          )
        );
      })()
    ) : viewMode === 'week' ? (
      // WEEK VIEW
      (() => {
        const weekStart = getWeekStart(currentDate);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);

        const normalizedFilter = normalizeType(filterType);
        const filteredEvents = !filterType || filterType === 'all'
          ? events
          : events.filter(event => normalizeType(event.type) === normalizedFilter);
        const normalizedEvents = filteredEvents.map(migrateEvent);

        const getEventsForDay = (date) => {
          return getEventsForDate(date, normalizedEvents);
        };

        return React.createElement(
          'div',
          { className: 'bg-white rounded-lg shadow-sm border border-gray-200' },

          React.createElement(
            'div',
            { className: 'flex items-center justify-between p-4 border-b border-gray-200' },
            React.createElement('button', {
              onClick: () => {
                const newDate = new Date(currentDate);
                newDate.setDate(currentDate.getDate() - 7);
                setCurrentDate(newDate);
              },
              className: 'px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50'
            }, '← Previous Week'),

            React.createElement(
              'div',
              { className: 'flex items-center gap-3' },
              React.createElement(
                'h3',
                { className: 'text-lg font-semibold text-gray-900' },
                `${formatDateDisplay(weekStart, 'short')} - ${formatDateDisplay(weekEnd, 'short')}`
              ),
              React.createElement('button', {
                onClick: () => setCurrentDate(new Date()),
                className: 'px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md'
              }, 'Today')
            ),

            React.createElement('button', {
              onClick: () => {
                const newDate = new Date(currentDate);
                newDate.setDate(currentDate.getDate() + 7);
                setCurrentDate(newDate);
              },
              className: 'px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50'
            }, 'Next Week →')
          ),

          React.createElement(
            'div',
            { className: 'grid grid-cols-7 divide-x divide-gray-200' },
            getWeekDays(currentDate).map((day, idx) => {
              const dayEvents = getEventsForDay(day);
              const isToday = isSameDay(day, new Date());
              const isWeekend = day.getDay() === 0 || day.getDay() === 6;

              return React.createElement(
                'div',
                {
                  key: idx,
                  className: `min-h-[400px] ${isWeekend ? 'bg-gray-50' : 'bg-white'}`
                },
                React.createElement(
                  'div',
                  { className: `p-3 border-b border-gray-200 ${isToday ? 'bg-blue-600 text-white' : isWeekend ? 'bg-gray-100' : 'bg-white'}` },
                  React.createElement(
                    'div',
                    { className: `text-xs font-medium uppercase ${isToday ? 'text-blue-100' : 'text-gray-500'}` },
                    formatDateDisplay(day, 'weekday')
                  ),
                  React.createElement(
                    'div',
                    { className: `text-xl font-semibold mt-1 ${isToday ? 'text-white' : 'text-gray-900'}` },
                    day.getDate(),
                    isToday && React.createElement(
                      'span',
                      { className: 'ml-2 text-xs font-normal' },
                      'Today'
                    )
                  )
                ),

                React.createElement(
                  'div',
                  { className: 'p-2 space-y-1' },
                  dayEvents.length === 0
                    ? React.createElement('button', {
                      onClick: () => {
                        const dayStr = day.toISOString().split('T')[0];
                        setEditingEvent(buildFormEvent({ date: dayStr }, { date: dayStr }));
                        setShowEventModal(true);
                      },
                      className: 'w-full py-8 text-sm text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded border-2 border-dashed border-gray-200 hover:border-gray-300'
                    }, '+ Add Event')
                    : React.createElement(
                      React.Fragment,
                      null,
                      dayEvents
                        .filter(event => !isMultiDayEvent(event) || isFirstDayOfEvent(event, day))
                        .sort((a, b) => {
                          const aTime = (a.start || a.date || '').split('T')[1] || '00:00:00';
                          const bTime = (b.start || b.date || '').split('T')[1] || '00:00:00';
                          return aTime.localeCompare(bTime);
                        })
                        .map(event => {
                          const typeKey = normalizeType(event.type);
                          const typeStyles = eventTypes[typeKey] || eventTypes.meeting;
                          const startParsed = parseDateTime(event.start);
                          const showTime = startParsed.time && startParsed.time !== '00:00';
                          const startTime = showTime ? formatTime(startParsed.time) : '';
                          const spanDays = calculateSpanDays(event, day);

                          return React.createElement(
                            'button',
                            {
                              key: event.id,
                              onClick: () => openEditModal(event),
                              className: `w-full text-left p-2 rounded-md border ${typeStyles.border} ${typeStyles.bgLight} hover:shadow-md transition-shadow ${
                                spanDays > 1 ? 'relative' : ''
                              }`,
                              style: spanDays > 1 ? {
                                width: `calc(${spanDays * 100}% + ${(spanDays - 1) * 8}px)`
                              } : undefined
                            },
                            showTime && React.createElement(
                              'div',
                              { className: `text-xs font-semibold ${typeStyles.textColor} mb-1` },
                              startTime
                            ),
                            React.createElement(
                              'div',
                              { className: `text-sm font-medium ${typeStyles.textColor} flex items-center gap-1` },
                              React.createElement('span', { className: 'line-clamp-2' }, event.title),
                              isMultiDayEvent(event) && React.createElement(
                                'span',
                                { className: 'text-xs opacity-60' },
                                `(${getEventDateRange(event).length}d)`
                              )
                            ),
                            event.location && React.createElement(
                              'div',
                              { className: 'text-xs text-gray-500 mt-1 truncate' },
                              `📍 ${event.location}`
                            )
                          );
                        }),
                      React.createElement('button', {
                        onClick: () => {
                          const dayStr = day.toISOString().split('T')[0];
                          setEditingEvent(buildFormEvent({ date: dayStr }, { date: dayStr }));
                          setShowEventModal(true);
                        },
                        className: 'w-full py-2 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded mt-2'
                      }, '+ Add Event')
                    )
                )
              );
            })
          )
        );
      })()
    ) : (
      // DAY VIEW
      (() => {
        const normalizedFilter = normalizeType(filterType);
        const filteredEvents = !filterType || filterType === 'all'
          ? events
          : events.filter(event => normalizeType(event.type) === normalizedFilter);
        const normalizedEvents = filteredEvents.map(migrateEvent);

        const dayEvents = getEventsForDate(currentDate, normalizedEvents)
          .map(event => {
            const startDateStr = event.start ? event.start.split('T')[0] : null;
            const endDateStr = event.endDate || (event.end ? event.end.split('T')[0] : startDateStr);
            const currentDateStr = currentDate.toISOString().split('T')[0];
            const isStartDay = startDateStr === currentDateStr;
            const isEndDay = endDateStr === currentDateStr;

            const startParsed = parseDateTime(event.start);
            const endParsed = parseDateTime(event.end);
            let startTime = startParsed.time || '09:00';
            let endTime = endParsed.time || null;

            if (!isStartDay) startTime = '06:00';
            if (!isEndDay) endTime = '23:00';

            const parseMinutes = (timeStr) => {
              const [hours, minutes] = timeStr.split(':').map(Number);
              return (hours * 60) + minutes;
            };

            const clampMinutes = (minutes) => Math.min(Math.max(minutes, 6 * 60), 23 * 60);
            const startMinutes = clampMinutes(parseMinutes(startTime));
            let endMinutes = endTime ? clampMinutes(parseMinutes(endTime)) : startMinutes + 60;
            if (endMinutes <= startMinutes) {
              endMinutes = Math.min(startMinutes + 60, 23 * 60);
            }

            return {
              ...event,
              startTime,
              endTime,
              startMinutes,
              endMinutes
            };
          })
          .sort((a, b) => a.startMinutes - b.startMinutes);

        const layoutEvents = () => {
          const groups = [];
          let currentGroup = [];
          let currentGroupEnd = null;

          dayEvents.forEach(event => {
            if (currentGroup.length === 0) {
              currentGroup = [event];
              currentGroupEnd = event.endMinutes;
              return;
            }

            if (event.startMinutes < currentGroupEnd) {
              currentGroup.push(event);
              currentGroupEnd = Math.max(currentGroupEnd, event.endMinutes);
            } else {
              groups.push(currentGroup);
              currentGroup = [event];
              currentGroupEnd = event.endMinutes;
            }
          });

          if (currentGroup.length) {
            groups.push(currentGroup);
          }

          const positioned = [];

          groups.forEach(group => {
            const columns = [];
            const positionedGroup = group.map(event => {
              let columnIndex = columns.findIndex(endMinute => endMinute <= event.startMinutes);
              if (columnIndex === -1) {
                columnIndex = columns.length;
                columns.push(event.endMinutes);
              } else {
                columns[columnIndex] = event.endMinutes;
              }

              return {
                ...event,
                columnIndex
              };
            });

            const totalColumns = columns.length || 1;
            positionedGroup.forEach(event => {
              positioned.push({
                ...event,
                totalColumns
              });
            });
          });

          return positioned;
        };

        const positionedEvents = layoutEvents();
        const timeSlots = generateTimeSlots();

        return React.createElement(
          'div',
          { className: 'bg-white rounded-lg shadow-sm border border-gray-200 relative' },
          React.createElement(
            'div',
            { className: 'flex items-center justify-between p-4 border-b border-gray-200' },
            React.createElement('button', {
              onClick: () => {
                const newDate = new Date(currentDate);
                newDate.setDate(currentDate.getDate() - 1);
                setCurrentDate(newDate);
              },
              className: 'px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50'
            }, '← Previous Day'),

            React.createElement(
              'div',
              { className: 'flex items-center gap-3' },
              React.createElement(
                'h3',
                { className: 'text-lg font-semibold text-gray-900' },
                formatDateDisplay(currentDate, 'long')
              ),
              React.createElement('button', {
                onClick: () => setCurrentDate(new Date()),
                className: 'px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md'
              }, 'Today')
            ),

            React.createElement('button', {
              onClick: () => {
                const newDate = new Date(currentDate);
                newDate.setDate(currentDate.getDate() + 1);
                setCurrentDate(newDate);
              },
              className: 'px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50'
            }, 'Next Day →')
          ),

          React.createElement(
            'div',
            { className: 'overflow-auto', style: { maxHeight: '600px' } },
            React.createElement(
              'div',
              { className: 'flex relative' },
              React.createElement(
                'div',
                { className: 'w-20 flex-shrink-0 border-r border-gray-200' },
                timeSlots.map(slot =>
                  React.createElement(
                    'div',
                    {
                      key: slot.hour,
                      className: 'h-[60px] border-b border-gray-100 px-2 py-1 text-xs text-gray-500 text-right'
                    },
                    slot.time12
                  )
                )
              ),

              React.createElement(
                'div',
                { className: 'flex-1 relative' },
                timeSlots.map((slot, idx) =>
                  React.createElement('div', {
                    key: slot.hour,
                    className: 'h-[60px] border-b border-gray-100 hover:bg-gray-50 cursor-pointer',
                    onClick: (e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const y = e.clientY - rect.top;
                      const clickedTime = getTimeFromPosition((idx * 60) + y);
                      const dayStr = currentDate.toISOString().split('T')[0];
                      const endMinutes = Math.min(23 * 60, (parseInt(clickedTime.split(':')[0], 10) * 60) + parseInt(clickedTime.split(':')[1], 10) + 60);
                      const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;
                      setEditingEvent(buildFormEvent({ date: dayStr, startTime: clickedTime, endTime }, { date: dayStr, startTime: clickedTime, endTime }));
                      setShowEventModal(true);
                    }
                  })
                ),

                React.createElement(
                  'div',
                  { className: 'absolute inset-0 px-2' },
                  positionedEvents.map(event => {
                    const { top, height } = calculateEventPosition(event.startTime, event.endTime);
                    const typeKey = normalizeType(event.type);
                    const typeStyles = eventTypes[typeKey] || eventTypes.meeting;
                    const width = 100 / (event.totalColumns || 1);
                    const left = width * (event.columnIndex || 0);

                    return React.createElement(
                      'button',
                      {
                        key: event.id,
                        onClick: (e) => {
                          e.stopPropagation();
                          openEditModal(event);
                        },
                        className: `absolute mx-1 rounded-md border-l-4 ${typeStyles.border} ${typeStyles.bgLight} hover:shadow-lg transition-shadow p-2 overflow-hidden`,
                        style: {
                          top: `${top}px`,
                          height: `${height}px`,
                          left: `calc(${left}% + 4px)`,
                          width: `calc(${width}% - 8px)`,
                          zIndex: 10
                        }
                      },
                      React.createElement(
                        'div',
                        { className: `text-xs font-semibold ${typeStyles.textColor} mb-1` },
                        event.endTime ? `${formatTime(event.startTime)} - ${formatTime(event.endTime)}` : formatTime(event.startTime)
                      ),
                      React.createElement(
                        'div',
                        { className: `text-sm font-medium ${typeStyles.textColor} line-clamp-1` },
                        event.title
                      ),
                      event.location && React.createElement(
                        'div',
                        { className: 'text-xs text-gray-600 mt-1 truncate' },
                        `📍 ${event.location}`
                      ),
                      event.description && height > 80 && React.createElement(
                        'div',
                        { className: 'text-xs text-gray-600 mt-1 line-clamp-2' },
                        event.description
                      )
                    );
                  })
                )
              )
            )
          ),

          isSameDay(currentDate, new Date()) && React.createElement(
            'div',
            {
              className: 'absolute left-20 right-0 h-0.5 bg-red-500 z-20 pointer-events-none',
              style: {
                top: `${calculateEventPosition(new Date().toTimeString().slice(0, 5), null).top + 60}px`
              }
            },
            React.createElement('div', { className: 'absolute -left-2 -top-2 w-4 h-4 bg-red-500 rounded-full' })
          )
        );
      })()
    )
    ),
    
    // Event Modal
    showEventModal && React.createElement(
      'div',
      { 
        className: 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50',
        onClick: () => {
          setShowEventModal(false);
          setEditingEvent(null);
        }
      },
      React.createElement(
        'div',
        {
          className: 'bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto',
          onClick: (e) => e.stopPropagation()
        },
        
        // Modal header
        React.createElement(
          'div',
          { className: 'flex items-center justify-between mb-4' },
          React.createElement('h3', { className: 'text-xl font-bold' },
            editingEvent.id ? 'Edit Event' :
            editingEvent.title ? 'Duplicate Event' :
            'New Event'
          ),
          React.createElement('button', {
            onClick: () => {
              setShowEventModal(false);
              setEditingEvent(null);
            },
            className: 'text-gray-500 hover:text-gray-700 text-2xl'
          }, '×')
        ),
        
        // Event form
        React.createElement(
          'div',
          { className: 'space-y-4' },

          // Duplicate notice banner
          !editingEvent.id && editingEvent.title && React.createElement(
            'div',
            { className: 'p-3 bg-blue-50 border border-blue-200 rounded-lg' },
            React.createElement('div', { className: 'flex items-center gap-2 text-sm text-blue-700' },
              React.createElement('span', null, '📋'),
              React.createElement('span', null, 'Duplicating event. Modify details as needed and click "Create Event" to save.')
            )
          ),

          // Title
          React.createElement(
            'div',
            null,
            React.createElement('label', { className: 'block text-sm font-medium mb-1' }, 'Event Title *'),
            React.createElement('input', {
              type: 'text',
              value: editingEvent?.title || '',
              onChange: (e) => setEditingEvent({ ...editingEvent, title: e.target.value }),
              className: 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500',
              placeholder: 'e.g., Blocking - Act 1, Scene 1'
            })
          ),
          
          // Type
          React.createElement(
            'div',
            null,
            React.createElement('label', { className: 'block text-sm font-medium mb-1' }, 'Event Type'),
            React.createElement('select', {
              value: editingEvent?.type || 'rehearsal',
              onChange: (e) => setEditingEvent({ ...editingEvent, type: e.target.value }),
              className: 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500'
            },
              Object.entries(allowedEventTypesForRole()).map(([key, type]) =>
                React.createElement('option', { key: key, value: key }, type.label)
              )
            )
          ),
          
          // Subtype selector (conditional based on type)
          editingEvent?.type === 'rehearsal' && React.createElement(
            'div',
            null,
            React.createElement('label', { className: 'block text-sm font-medium mb-1' }, 'Rehearsal Type'),
            React.createElement('select', {
              value: editingEvent?.subtype || '',
              onChange: (e) => setEditingEvent({ ...editingEvent, subtype: e.target.value }),
              className: 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500'
            },
              React.createElement('option', { value: '' }, '-- Select Type --'),
              Object.entries(rehearsalSubtypes).map(([key, label]) =>
                React.createElement('option', { key: key, value: key }, label)
              )
            )
          ),

          editingEvent?.type === 'tech' && React.createElement(
            'div',
            null,
            React.createElement('label', { className: 'block text-sm font-medium mb-1' }, 'Tech Type'),
            React.createElement('select', {
              value: editingEvent?.subtype || '',
              onChange: (e) => setEditingEvent({ ...editingEvent, subtype: e.target.value }),
              className: 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500'
            },
              React.createElement('option', { value: '' }, '-- Select Type --'),
              Object.entries(techSubtypes).map(([key, label]) =>
                React.createElement('option', { key: key, value: key }, label)
              )
            )
          ),

          editingEvent?.type === 'deadline' && React.createElement(
            'div',
            null,
            React.createElement('label', { className: 'block text-sm font-medium mb-1' }, 'Milestone Type'),
            React.createElement('select', {
              value: editingEvent?.subtype || '',
              onChange: (e) => setEditingEvent({ ...editingEvent, subtype: e.target.value }),
              className: 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500'
            },
              React.createElement('option', { value: '' }, '-- Select Type --'),
              Object.entries(milestoneTypes).map(([key, label]) =>
                React.createElement('option', { key: key, value: key }, label)
              )
            )
          ),
          
          // Rehearsal Quick Select (only for rehearsal type)
          editingEvent?.type === 'rehearsal' && React.createElement(
            'div',
            { className: 'p-4 bg-blue-50 border border-blue-200 rounded-lg' },
            React.createElement('label', { className: 'block text-sm font-medium text-blue-900 mb-2' }, 'Quick Select - Rehearsal Scope'),
            React.createElement(
              'div',
              { className: 'grid grid-cols-2 gap-2' },

              // Full Run
              React.createElement(
                'button',
                {
                  type: 'button',
                  onClick: () => {
                    setRehearsalType('full-run');
                    const allSceneIds = allScenes.map(s => s.id);
                    const allPropIds = allProps.map(p => p.id);
                    const allCostumeIds = allCostumes.map(c => c.id);
                    const allCharNames = allCharacters;
                    setEditingEvent({
                      ...editingEvent,
                      scenes: allSceneIds,
                      charactersNeeded: allCharNames,
                      propsNeeded: allPropIds,
                      costumesNeeded: allCostumeIds,
                      rehearsalType: 'full-run'
                    });
                  },
                  className: `px-4 py-3 rounded-lg text-sm font-medium transition-colors border-2 ${
                    rehearsalType === 'full-run'
                      ? 'bg-purple-600 border-purple-600 text-white'
                      : 'bg-white border-gray-300 text-gray-700 hover:border-purple-500'
                  }`
                },
                React.createElement('div', { className: 'font-bold mb-1' }, '🎭 Full Run'),
                React.createElement('div', { className: 'text-xs opacity-80' }, 'All scenes + props + costumes')
              ),

              // Act I Run
              React.createElement(
                'button',
                {
                  type: 'button',
                  onClick: () => {
                    setRehearsalType('act-1-run');
                    const act1Scenes = allScenes.filter(s => s.actIndex === 0);
                    const act1Ids = act1Scenes.map(s => s.id);
                    // Auto-extract characters from Act I scenes via characterIds
                    const act1Chars = new Set();
                    const productionChars = production.characters || [];
                    if (production.acts && production.acts[0]?.scenes) {
                      production.acts[0].scenes.forEach(sc => {
                        if (sc.characterIds && Array.isArray(sc.characterIds)) {
                          sc.characterIds.forEach(id => {
                            const char = productionChars.find(c => c.id === id);
                            if (char?.name) act1Chars.add(char.name);
                          });
                        }
                      });
                    }
                    setEditingEvent({
                      ...editingEvent,
                      scenes: act1Ids,
                      charactersNeeded: Array.from(act1Chars),
                      propsNeeded: [],
                      costumesNeeded: [],
                      rehearsalType: 'act-1-run'
                    });
                  },
                  className: `px-4 py-3 rounded-lg text-sm font-medium transition-colors border-2 ${
                    rehearsalType === 'act-1-run'
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-white border-gray-300 text-gray-700 hover:border-blue-500'
                  }`
                },
                React.createElement('div', { className: 'font-bold mb-1' }, '📖 Act I Run'),
                React.createElement('div', { className: 'text-xs opacity-80' }, 'All Act 1 scenes')
              ),

              // Act II Run
              React.createElement(
                'button',
                {
                  type: 'button',
                  onClick: () => {
                    setRehearsalType('act-2-run');
                    const act2Scenes = allScenes.filter(s => s.actIndex === 1);
                    const act2Ids = act2Scenes.map(s => s.id);
                    // Auto-extract characters from Act II scenes via characterIds
                    const act2Chars = new Set();
                    const productionChars2 = production.characters || [];
                    if (production.acts && production.acts[1]?.scenes) {
                      production.acts[1].scenes.forEach(sc => {
                        if (sc.characterIds && Array.isArray(sc.characterIds)) {
                          sc.characterIds.forEach(id => {
                            const char = productionChars2.find(c => c.id === id);
                            if (char?.name) act2Chars.add(char.name);
                          });
                        }
                      });
                    }
                    setEditingEvent({
                      ...editingEvent,
                      scenes: act2Ids,
                      charactersNeeded: Array.from(act2Chars),
                      propsNeeded: [],
                      costumesNeeded: [],
                      rehearsalType: 'act-2-run'
                    });
                  },
                  className: `px-4 py-3 rounded-lg text-sm font-medium transition-colors border-2 ${
                    rehearsalType === 'act-2-run'
                      ? 'bg-green-600 border-green-600 text-white'
                      : 'bg-white border-gray-300 text-gray-700 hover:border-green-500'
                  }`
                },
                React.createElement('div', { className: 'font-bold mb-1' }, '📖 Act II Run'),
                React.createElement('div', { className: 'text-xs opacity-80' }, 'All Act 2 scenes')
              ),

              // Custom
              React.createElement(
                'button',
                {
                  type: 'button',
                  onClick: () => {
                    setRehearsalType('custom');
                    setEditingEvent({
                      ...editingEvent,
                      scenes: [],
                      charactersNeeded: [],
                      propsNeeded: [],
                      costumesNeeded: [],
                      rehearsalType: 'custom'
                    });
                  },
                  className: `px-4 py-3 rounded-lg text-sm font-medium transition-colors border-2 ${
                    rehearsalType === 'custom'
                      ? 'bg-orange-600 border-orange-600 text-white'
                      : 'bg-white border-gray-300 text-gray-700 hover:border-orange-500'
                  }`
                },
                React.createElement('div', { className: 'font-bold mb-1' }, '🎯 Custom'),
                React.createElement('div', { className: 'text-xs opacity-80' }, 'Select individual scenes')
              ),

              // Table Read (full-width)
              React.createElement(
                'button',
                {
                  type: 'button',
                  onClick: () => {
                    setRehearsalType('table-read');
                    setEditingEvent({
                      ...editingEvent,
                      scenes: allScenes.map(s => s.id),
                      charactersNeeded: allCharacters,
                      propsNeeded: [],
                      costumesNeeded: [],
                      rehearsalType: 'table-read'
                    });
                  },
                  className: `col-span-2 px-4 py-3 rounded-lg text-sm font-medium transition-colors border-2 ${
                    rehearsalType === 'table-read'
                      ? 'bg-sky-700 border-sky-700 text-white'
                      : 'bg-white border-gray-300 text-gray-700 hover:border-sky-600'
                  }`
                },
                React.createElement('div', { className: 'font-bold mb-1' }, '📖 Table Read'),
                React.createElement('div', { className: 'text-xs opacity-80' }, 'All scenes selected • Props & costumes not needed')
              )
            ),

            // Status indicator
            rehearsalType === 'table-read' && React.createElement(
              'div',
              { className: 'mt-3 p-3 bg-sky-100 border border-sky-300 rounded-lg' },
              React.createElement(
                'div',
                { className: 'flex items-center gap-2' },
                React.createElement('span', { className: 'text-lg' }, '📖'),
                React.createElement('div', null,
                  React.createElement('div', { className: 'font-semibold text-sky-900 text-sm' }, 'Table Read'),
                  React.createElement('div', { className: 'text-xs text-sky-700' },
                    `All ${allScenes.length} scenes selected. Props and costumes not needed.`
                  )
                )
              )
            ),
            rehearsalType === 'full-run' && React.createElement(
              'div',
              { className: 'mt-3 p-3 bg-purple-100 border border-purple-300 rounded-lg text-sm text-purple-800' },
              React.createElement('strong', null, 'Full Run: '),
              `All ${allScenes.length} scenes • All ${allProps.length} props • All ${allCostumes.length} costumes • All ${allCharacters.length} characters`
            ),
            rehearsalType === 'act-1-run' && React.createElement(
              'div',
              { className: 'mt-3 p-3 bg-blue-100 border border-blue-300 rounded-lg text-sm text-blue-800' },
              React.createElement('strong', null, 'Act I Run: '),
              `${editingEvent?.scenes?.length || 0} scenes • ${editingEvent?.charactersNeeded?.length || 0} characters`
            ),
            rehearsalType === 'act-2-run' && React.createElement(
              'div',
              { className: 'mt-3 p-3 bg-green-100 border border-green-300 rounded-lg text-sm text-green-800' },
              React.createElement('strong', null, 'Act II Run: '),
              `${editingEvent?.scenes?.length || 0} scenes • ${editingEvent?.charactersNeeded?.length || 0} characters`
            )
          ),

          // Date and time
          React.createElement(
            'div',
            { className: 'grid grid-cols-3 gap-3' },
            React.createElement(
              'div',
              null,
              React.createElement('label', { className: 'block text-sm font-medium mb-1' }, 'Date'),
              React.createElement('input', {
                type: 'date',
                value: editingEvent?.date || '',
                onChange: (e) => setEditingEvent({ ...editingEvent, date: e.target.value }),
                className: 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500'
              })
            ),
            React.createElement(
              'div',
              null,
              React.createElement('label', { className: 'block text-sm font-medium mb-1' }, 'Start Time'),
              React.createElement('input', {
                type: 'time',
                value: editingEvent?.startTime || '',
                onChange: (e) => setEditingEvent({ ...editingEvent, startTime: e.target.value }),
                className: 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500'
              })
            ),
            React.createElement(
              'div',
              null,
              React.createElement('label', { className: 'block text-sm font-medium mb-1' }, 'End Time'),
              React.createElement('input', {
                type: 'time',
                value: editingEvent?.endTime || '',
                onChange: (e) => setEditingEvent({ ...editingEvent, endTime: e.target.value }),
                className: 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500'
              })
            )
          ),

          editingEvent && React.createElement(
            'div',
            { className: 'mt-3' },
            React.createElement(
              'label',
              { className: 'flex items-center gap-2 text-sm text-gray-700 mb-1' },
              React.createElement('input', {
                type: 'checkbox',
                checked: !!(editingEvent.endDate && editingEvent.endDate !== editingEvent.date),
                onChange: (e) => {
                  if (e.target.checked) {
                    const nextDay = new Date(editingEvent.date);
                    nextDay.setDate(nextDay.getDate() + 1);
                    const updatedEvent = {
                      ...editingEvent,
                      endDate: nextDay.toISOString().split('T')[0]
                    };
                    setEditingEvent(updatedEvent);
                  } else {
                    const { endDate, ...restEvent } = editingEvent;
                    setEditingEvent(restEvent);
                  }
                },
                className: 'rounded'
              }),
              React.createElement('span', { className: 'font-medium' }, 'Multi-day event')
            ),

            editingEvent.endDate && React.createElement(
              'div',
              { className: 'mt-2' },
              React.createElement('label', { className: 'block text-sm text-gray-600 mb-1' }, 'End Date'),
              React.createElement('input', {
                type: 'date',
                value: editingEvent.endDate,
                min: editingEvent.date,
                onChange: (e) => {
                  const updatedEvent = { ...editingEvent, endDate: e.target.value };
                  setEditingEvent(updatedEvent);
                },
                className: 'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
              }),
              React.createElement(
                'p',
                { className: 'text-xs text-gray-500 mt-1' },
                `Duration: ${(() => {
                  const start = new Date(editingEvent.date || editingEvent.start);
                  const end = new Date(editingEvent.endDate);
                  const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
                  return days;
                })()} day${(() => {
                  const start = new Date(editingEvent.date || editingEvent.start);
                  const end = new Date(editingEvent.endDate);
                  const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
                  return days === 1 ? '' : 's';
                })()}`
              )
            )
          ),
          
          // Time preview
          editingEvent?.startTime && editingEvent?.endTime && React.createElement(
            'div',
            { className: 'text-sm text-gray-600 mt-1' },
            `📅 ${formatTimeRange(editingEvent.startTime, editingEvent.endTime)}`
          ),
          
          // Location
          React.createElement(
            'div',
            null,
            React.createElement('label', { className: 'block text-sm font-medium mb-1' }, 'Location'),
            (() => {
              const venues = window.venuesService?.loadVenues() || [];
              const loc = editingEvent?.location || '';
              const isKnownVenue = venues.some(v => v.name === loc);
              // Custom mode: location is set, non-empty, and not a known venue name
              const isCustom = Boolean(loc) && !isKnownVenue && loc !== '__custom__';
              const dropdownValue = !loc ? '' : (isKnownVenue ? loc : '__custom__');
              return React.createElement(
                React.Fragment,
                null,
                React.createElement(
                  'select',
                  {
                    value: dropdownValue,
                    onChange: (e) => {
                      if (e.target.value === '__custom__') {
                        setEditingEvent({ ...editingEvent, location: '__custom__' });
                      } else {
                        setEditingEvent({ ...editingEvent, location: e.target.value });
                      }
                    },
                    className: 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500'
                  },
                  React.createElement('option', { value: '' }, 'Select location...'),
                  venues.map(v => React.createElement('option', { key: v.id, value: v.name }, v.name)),
                  React.createElement('option', { value: '__custom__' }, '✏️ Enter custom location...')
                ),
                // Show text input when in custom mode (loc is __custom__ marker or an unrecognised value)
                (loc === '__custom__' || isCustom) && React.createElement('input', {
                  type: 'text',
                  value: loc === '__custom__' ? '' : loc,
                  onChange: (e) => setEditingEvent({ ...editingEvent, location: e.target.value }),
                  className: 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 mt-2',
                  placeholder: 'Enter custom location...',
                  autoFocus: loc === '__custom__'
                })
              );
            })()
          ),
          
          // Rehearsal-specific fields (show for tech, or rehearsal in custom mode)
          (editingEvent?.type === 'tech' || (editingEvent?.type === 'rehearsal' && rehearsalType === 'custom')) && React.createElement(
            'div',
            { className: 'space-y-4 p-4 bg-blue-50 border border-blue-200 rounded-lg' },

            React.createElement('h4', { className: 'font-semibold text-blue-900 mb-2' },
              editingEvent?.type === 'rehearsal' ? '🎯 Custom Rehearsal Details' : '🎭 Rehearsal Details'
            ),
            
            // Scenes
            React.createElement(
              'div',
              null,
              React.createElement(
                'div',
                { className: 'flex items-center justify-between mb-2' },
                React.createElement('label', { className: 'block text-sm font-medium' }, 'Scenes to Rehearse'),
                allScenes.length > 0 && React.createElement(
                  'label',
                  { className: 'flex items-center gap-1 text-xs text-blue-600 cursor-pointer hover:text-blue-800' },
                  React.createElement('input', {
                    type: 'checkbox',
                    checked: (editingEvent?.scenes || []).length === allScenes.length,
                    onChange: (e) => setEditingEvent({
                      ...editingEvent,
                      scenes: e.target.checked ? allScenes.map(s => s.id) : []
                    }),
                    className: 'rounded'
                  }),
                  'Select All'
                )
              ),
              React.createElement(
                'div',
                { className: 'max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-2 bg-white' },
                allScenes.length === 0 ? React.createElement('p', { className: 'text-sm text-gray-500' },
                  'No scenes available. Add scenes to your production first.'
                ) : allScenes.map(scene =>
                  React.createElement(
                    'label',
                    { key: scene.id, className: 'flex items-center gap-2 p-1 hover:bg-gray-50 cursor-pointer' },
                    React.createElement('input', {
                      type: 'checkbox',
                      checked: (editingEvent?.scenes || []).includes(scene.id),
                      onChange: (e) => {
                        const scenes = editingEvent?.scenes || [];
                        if (e.target.checked) {
                          setEditingEvent({ ...editingEvent, scenes: [...scenes, scene.id] });
                        } else {
                          setEditingEvent({ ...editingEvent, scenes: scenes.filter(s => s !== scene.id) });
                        }
                      },
                      className: 'rounded'
                    }),
                    React.createElement('span', { className: 'text-sm' }, scene.label)
                  )
                )
              )
            ),
            
            // Characters needed
            React.createElement(
              'div',
              null,
              React.createElement(
                'div',
                { className: 'flex items-center justify-between mb-2' },
                React.createElement('label', { className: 'block text-sm font-medium' }, 'Characters Called'),
                allCharacters.length > 0 && React.createElement(
                  'label',
                  { className: 'flex items-center gap-1 text-xs text-blue-600 cursor-pointer hover:text-blue-800' },
                  React.createElement('input', {
                    type: 'checkbox',
                    checked: (editingEvent?.charactersNeeded || []).length === allCharacters.length,
                    onChange: (e) => setEditingEvent({
                      ...editingEvent,
                      charactersNeeded: e.target.checked ? [...allCharacters] : []
                    }),
                    className: 'rounded'
                  }),
                  'Select All'
                )
              ),
              React.createElement(
                'div',
                { className: 'max-h-32 overflow-y-auto border border-gray-300 rounded-lg p-2 bg-white' },
                allCharacters.length === 0 ? React.createElement('p', { className: 'text-sm text-gray-500' },
                  'No characters found.'
                ) : allCharacters.map(character =>
                  React.createElement(
                    'label',
                    { key: character, className: 'flex items-center gap-2 p-1 hover:bg-gray-50 cursor-pointer' },
                    React.createElement('input', {
                      type: 'checkbox',
                      checked: (editingEvent?.charactersNeeded || []).includes(character),
                      onChange: (e) => {
                        const chars = editingEvent?.charactersNeeded || [];
                        if (e.target.checked) {
                          setEditingEvent({ ...editingEvent, charactersNeeded: [...chars, character] });
                        } else {
                          setEditingEvent({ ...editingEvent, charactersNeeded: chars.filter(c => c !== character) });
                        }
                      },
                      className: 'rounded'
                    }),
                    React.createElement('span', { className: 'text-sm' }, character)
                  )
                )
              )
            ),
            
            // Props needed
            React.createElement(
              'div',
              null,
              React.createElement(
                'div',
                { className: 'flex items-center justify-between mb-2' },
                React.createElement('label', { className: 'block text-sm font-medium' }, 'Props Needed'),
                allProps.length > 0 && React.createElement(
                  'label',
                  { className: 'flex items-center gap-1 text-xs text-blue-600 cursor-pointer hover:text-blue-800' },
                  React.createElement('input', {
                    type: 'checkbox',
                    checked: (editingEvent?.propsNeeded || []).length === allProps.length,
                    onChange: (e) => setEditingEvent({
                      ...editingEvent,
                      propsNeeded: e.target.checked ? allProps.map(p => p.id) : []
                    }),
                    className: 'rounded'
                  }),
                  'Select All'
                )
              ),
              React.createElement(
                'div',
                { className: 'max-h-32 overflow-y-auto border border-gray-300 rounded-lg p-2 bg-white' },
                allProps.length === 0 ? React.createElement('p', { className: 'text-sm text-gray-500' },
                  'No props found. Add props to your production first.'
                ) : allProps.map(prop =>
                  React.createElement(
                    'label',
                    { key: prop.id, className: 'flex items-center gap-2 p-1 hover:bg-gray-50 cursor-pointer' },
                    React.createElement('input', {
                      type: 'checkbox',
                      checked: (editingEvent?.propsNeeded || []).includes(prop.id),
                      onChange: (e) => {
                        const props = editingEvent?.propsNeeded || [];
                        if (e.target.checked) {
                          setEditingEvent({ ...editingEvent, propsNeeded: [...props, prop.id] });
                        } else {
                          setEditingEvent({ ...editingEvent, propsNeeded: props.filter(p => p !== prop.id) });
                        }
                      },
                      className: 'rounded'
                    }),
                    React.createElement('span', { className: 'text-sm' }, `${prop.name} (${prop.scene})`)
                  )
                )
              )
            ),
            
            // Costumes needed
            React.createElement(
              'div',
              null,
              React.createElement(
                'div',
                { className: 'flex items-center justify-between mb-2' },
                React.createElement('label', { className: 'block text-sm font-medium' }, 'Costumes Needed'),
                allCostumes.length > 0 && React.createElement(
                  'label',
                  { className: 'flex items-center gap-1 text-xs text-blue-600 cursor-pointer hover:text-blue-800' },
                  React.createElement('input', {
                    type: 'checkbox',
                    checked: (editingEvent?.costumesNeeded || []).length === allCostumes.length,
                    onChange: (e) => setEditingEvent({
                      ...editingEvent,
                      costumesNeeded: e.target.checked ? allCostumes.map(c => c.id) : []
                    }),
                    className: 'rounded'
                  }),
                  'Select All'
                )
              ),
              React.createElement(
                'div',
                { className: 'max-h-32 overflow-y-auto border border-gray-300 rounded-lg p-2 bg-white' },
                allCostumes.length === 0 ? React.createElement('p', { className: 'text-sm text-gray-500' },
                  'No costumes found. Add costumes to your production first.'
                ) : allCostumes.map(costume =>
                  React.createElement(
                    'label',
                    { key: costume.id, className: 'flex items-center gap-2 p-1 hover:bg-gray-50 cursor-pointer' },
                    React.createElement('input', {
                      type: 'checkbox',
                      checked: (editingEvent?.costumesNeeded || []).includes(costume.id),
                      onChange: (e) => {
                        const costumes = editingEvent?.costumesNeeded || [];
                        if (e.target.checked) {
                          setEditingEvent({ ...editingEvent, costumesNeeded: [...costumes, costume.id] });
                        } else {
                          setEditingEvent({ ...editingEvent, costumesNeeded: costumes.filter(c => c !== costume.id) });
                        }
                      },
                      className: 'rounded'
                    }),
                    React.createElement('span', { className: 'text-sm' }, 
                      `${costume.name}${costume.character ? ' - ' + costume.character : ''}`
                    )
                  )
                )
              )
            ),
            
            // Additional attendees (free-form)
            React.createElement(
              'div',
              null,
              React.createElement('label', { className: 'block text-sm font-medium mb-1' }, 'Additional Attendees'),
              React.createElement('input', {
                type: 'text',
                value: (editingEvent?.attendees || []).join(', '),
                onChange: (e) => {
                  const attendeesList = e.target.value.split(',').map(a => a.trim()).filter(Boolean);
                  setEditingEvent({ ...editingEvent, attendees: attendeesList });
                },
                className: 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500',
                placeholder: 'e.g., Stage Manager, Director, Costume Designer (comma-separated)'
              })
            )
          ),
          
          // Notes
          React.createElement(
            'div',
            null,
            React.createElement('label', { className: 'block text-sm font-medium mb-1' }, 'Notes'),
            React.createElement('textarea', {
              value: editingEvent?.notes || '',
              onChange: (e) => setEditingEvent({ ...editingEvent, notes: e.target.value }),
              className: 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500',
              rows: 3,
              placeholder: 'Additional notes...'
            })
          )
        ),
        
        // Event summary (when viewing existing event)
        editingEvent?.id && events.find(e => e.id === editingEvent.id) && React.createElement(
          'div',
          { className: 'mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg' },
          React.createElement('h4', { className: 'font-semibold mb-2' }, '📋 Event Summary'),
          React.createElement(
            'div',
            { className: 'space-y-2 text-sm' },
            editingEvent.scenes?.length > 0 && React.createElement('div', null,
              React.createElement('strong', null, 'Scenes: '),
              editingEvent.scenes.map(s => getSceneLabel(s)).join(', ')
            ),
            editingEvent.charactersNeeded?.length > 0 && React.createElement('div', null,
              React.createElement('strong', null, 'Characters: '),
              editingEvent.charactersNeeded.join(', ')
            ),
            editingEvent.propsNeeded?.length > 0 && React.createElement('div', null,
              React.createElement('strong', null, 'Props: '),
              `${editingEvent.propsNeeded.length} prop(s) needed`
            ),
            editingEvent.costumesNeeded?.length > 0 && React.createElement('div', null,
              React.createElement('strong', null, 'Costumes: '),
              `${editingEvent.costumesNeeded.length} costume(s) needed`
            ),
            editingEvent.attendees?.length > 0 && React.createElement('div', null,
              React.createElement('strong', null, 'Other Attendees: '),
              editingEvent.attendees.join(', ')
            )
          )
        ),
        
        // Attendance tracking (for past events)
        editingEvent?.id && events.find(e => e.id === editingEvent.id) && 
        new Date(editingEvent.date) <= new Date() &&
        (editingEvent.type === 'rehearsal' || editingEvent.type === 'tech') &&
        React.createElement(
          'div',
          { className: 'mt-4 p-4 bg-green-50 border border-green-200 rounded-lg' },
          React.createElement('h4', { className: 'font-semibold mb-3 text-green-900' }, '✓ Attendance'),
          
          // Character attendance
          editingEvent.charactersNeeded?.length > 0 && React.createElement(
            'div',
            { className: 'mb-3' },
            React.createElement('div', { className: 'text-sm font-medium mb-2' }, 'Cast:'),
            React.createElement(
              'div',
              { className: 'space-y-1' },
              editingEvent.charactersNeeded.map(character =>
                React.createElement(
                  'label',
                  { key: character, className: 'flex items-center gap-2 text-sm' },
                  React.createElement('input', {
                    type: 'checkbox',
                    checked: editingEvent.attendance?.[character] || false,
                    onChange: (e) => {
                      const newAttendance = { ...(editingEvent.attendance || {}), [character]: e.target.checked };
                      setEditingEvent({ ...editingEvent, attendance: newAttendance });
                      // Auto-save attendance
                      setEvents(prev => prev.map(ev => 
                        ev.id === editingEvent.id ? { ...ev, attendance: newAttendance } : ev
                      ));
                    },
                    className: 'rounded'
                  }),
                  React.createElement('span', null, character)
                )
              )
            )
          ),
          
          // Additional attendees
          editingEvent.attendees?.length > 0 && React.createElement(
            'div',
            null,
            React.createElement('div', { className: 'text-sm font-medium mb-2' }, 'Crew/Staff:'),
            React.createElement(
              'div',
              { className: 'space-y-1' },
              editingEvent.attendees.map(attendee =>
                React.createElement(
                  'label',
                  { key: attendee, className: 'flex items-center gap-2 text-sm' },
                  React.createElement('input', {
                    type: 'checkbox',
                    checked: editingEvent.attendance?.[attendee] || false,
                    onChange: (e) => {
                      const newAttendance = { ...(editingEvent.attendance || {}), [attendee]: e.target.checked };
                      setEditingEvent({ ...editingEvent, attendance: newAttendance });
                      // Auto-save attendance
                      setEvents(prev => prev.map(ev => 
                        ev.id === editingEvent.id ? { ...ev, attendance: newAttendance } : ev
                      ));
                    },
                    className: 'rounded'
                  }),
                  React.createElement('span', null, attendee)
                )
              )
            )
          ),
          
          // Attendance summary
          React.createElement('div', { className: 'mt-3 pt-3 border-t border-green-300 text-sm text-green-800' },
            `${Object.values(editingEvent.attendance || {}).filter(Boolean).length} / ${
              (editingEvent.charactersNeeded?.length || 0) + (editingEvent.attendees?.length || 0)
            } attended`
          )
        ),
        
        // Action buttons
        React.createElement(
          'div',
          { className: 'flex justify-between mt-6' },
          React.createElement(
            'div',
            { className: 'flex gap-2' },
            editingEvent.id && events.find(e => e.id === editingEvent.id) && canEditEvent(editingEvent) && React.createElement('button', {
              type: 'button',
              onClick: () => handleDeleteEvent(editingEvent.id),
              className: 'px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700'
            }, 'Delete Event'),
            editingEvent.id && events.find(e => e.id === editingEvent.id) && React.createElement('button', {
              type: 'button',
              onClick: () => handleDuplicateEvent(editingEvent),
              className: 'px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700'
            }, 'Duplicate')
          ),
          React.createElement(
            'div',
            { className: 'flex gap-2' },
            React.createElement('button', {
              onClick: () => {
                setShowEventModal(false);
                setEditingEvent(null);
              },
              className: 'px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300'
            }, 'Cancel'),
            (canEditEvent(editingEvent) || !editingEvent.id) && React.createElement('button', {
              onClick: handleSaveEvent,
              className: 'px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700'
            }, editingEvent.id ? 'Save Event' : 'Create Event')
          )
        )
      )
    ),
    
    // Conflicts Modal
    showConflicts && React.createElement(
      'div',
      {
        className: 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50',
        onClick: () => setShowConflicts(false)
      },
      React.createElement(
        'div',
        {
          className: 'bg-white rounded-lg p-6 max-w-3xl w-full mx-4 max-h-[80vh] overflow-y-auto',
          onClick: (e) => e.stopPropagation()
        },
        React.createElement(
          'div',
          { className: 'flex items-center justify-between mb-4' },
          React.createElement('h3', { className: 'text-xl font-bold' }, `⚠️ Scheduling Conflicts (${conflicts.length})`),
          React.createElement('button', {
            onClick: () => setShowConflicts(false),
            className: 'text-gray-500 hover:text-gray-700 text-2xl'
          }, '×')
        ),
        
        conflicts.length === 0 ? React.createElement('p', { className: 'text-gray-500' },
          'No conflicts detected! 🎉'
        ) : React.createElement(
          'div',
          { className: 'space-y-3' },
          conflicts.map((conflict, idx) =>
            React.createElement(
              'div',
              {
                key: idx,
                className: `p-4 border-l-4 rounded ${
                  conflict.type === 'time' ? 'border-red-500 bg-red-50' :
                  conflict.type === 'characters' ? 'border-orange-500 bg-orange-50' :
                  conflict.type === 'props' ? 'border-yellow-500 bg-yellow-50' :
                  'border-purple-500 bg-purple-50'
                }`
              },
              React.createElement('div', { className: 'font-semibold mb-1' }, conflict.message),
              React.createElement('div', { className: 'text-sm text-gray-700' },
                (() => {
                  const startParsed = parseDateTime(conflict.event1.start);
                  const endParsed = parseDateTime(conflict.event1.end);
                  const timeRange = startParsed.time && endParsed.time
                    ? `${formatTime(startParsed.time)} - ${formatTime(endParsed.time)}`
                    : startParsed.time
                      ? formatTime(startParsed.time)
                      : 'No time';
                  return `${conflict.event1.title} (${timeRange})`;
                })()
              ),
              React.createElement('div', { className: 'text-sm text-gray-700' },
                (() => {
                  const startParsed = parseDateTime(conflict.event2.start);
                  const endParsed = parseDateTime(conflict.event2.end);
                  const timeRange = startParsed.time && endParsed.time
                    ? `${formatTime(startParsed.time)} - ${formatTime(endParsed.time)}`
                    : startParsed.time
                      ? formatTime(startParsed.time)
                      : 'No time';
                  return `${conflict.event2.title} (${timeRange})`;
                })()
              ),
              conflict.resources && React.createElement('div', { className: 'text-xs text-gray-600 mt-1' },
                `Conflicting resources: ${Array.isArray(conflict.resources) ? conflict.resources.join(', ') : conflict.resources}`
              )
            )
          )
        )
      )
    )
  );
}

// Export
window.CalendarView = CalendarView;
