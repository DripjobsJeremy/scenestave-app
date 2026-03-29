const { useState, useEffect } = React;
const { Link, useParams } = window.ReactRouterDOM || {};

// Global SceneBuilder component - uses React Router useParams for production ID
const CUSTOM_VALUES_KEY = 'scenestave_custom_field_values';

const TIME_OF_DAY_OPTIONS = [
  'Dawn', 'Morning', 'Midday', 'Afternoon', 'Dusk',
  'Evening', 'Night', 'Midnight', 'Pre-show', 'Intermission', 'Post-show'
];

const LIGHTING_MOOD_OPTIONS = [
  'Warm', 'Cool', 'Neutral', 'Bright', 'Dim', 'Dark',
  'Dramatic', 'Romantic', 'Mysterious', 'Tense', 'Joyful',
  'Melancholic', 'Ethereal', 'Harsh', 'Soft', 'Spotlight'
];

const getCustomValues = (field) => {
  try {
    const all = JSON.parse(localStorage.getItem(CUSTOM_VALUES_KEY) || '{}');
    return all[field] || [];
  } catch { return []; }
};

const saveCustomValue = (field, value) => {
  try {
    const all = JSON.parse(localStorage.getItem(CUSTOM_VALUES_KEY) || '{}');
    const existing = all[field] || [];
    if (!existing.includes(value)) {
      all[field] = [...existing, value];
      localStorage.setItem(CUSTOM_VALUES_KEY, JSON.stringify(all));
    }
  } catch {}
};

const SmartDropdown = ({ field, value, defaultOptions, onChange, placeholder }) => {
  const [showCustomInput, setShowCustomInput] = React.useState(false);
  const [customText, setCustomText] = React.useState('');
  const [customOptions, setCustomOptions] = React.useState(() => getCustomValues(field));
  const allOptions = [...defaultOptions, ...customOptions.filter(c => !defaultOptions.includes(c))];
  if (showCustomInput) {
    return React.createElement(
      'div',
      { className: 'flex gap-2' },
      React.createElement('input', {
        autoFocus: true,
        type: 'text',
        value: customText,
        onChange: (e) => setCustomText(e.target.value),
        onKeyDown: (e) => {
          if (e.key === 'Enter') {
            const val = customText.trim();
            if (val) {
              saveCustomValue(field, val);
              setCustomOptions(getCustomValues(field));
              onChange(val);
            }
            setShowCustomInput(false);
            setCustomText('');
          }
          if (e.key === 'Escape') {
            setShowCustomInput(false);
            setCustomText('');
          }
        },
        placeholder: 'Type and press Enter...',
        className: 'flex-1 px-3 py-2 rounded-lg text-sm',
        style: { backgroundColor: 'var(--color-bg-elevated)', color: 'var(--color-text-primary)', border: '1px solid var(--color-primary)' }
      }),
      React.createElement(
        'button',
        {
          type: 'button',
          onClick: () => { setShowCustomInput(false); setCustomText(''); },
          className: 'px-3 py-2 rounded-lg text-sm',
          style: { backgroundColor: 'var(--color-bg-elevated)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }
        },
        '✕'
      )
    );
  }
  return React.createElement(
    'select',
    {
      value: value || '',
      onChange: (e) => {
        if (e.target.value === '__custom__') {
          setShowCustomInput(true);
        } else {
          onChange(e.target.value);
        }
      },
      className: 'w-full px-3 py-2 rounded-lg text-sm',
      style: {
        backgroundColor: 'var(--color-bg-elevated)',
        color: value ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
        border: '1px solid var(--color-border)'
      }
    },
    React.createElement('option', { value: '' }, placeholder),
    allOptions.map(opt => React.createElement('option', { key: opt, value: opt }, opt)),
    React.createElement('option', { value: '__custom__' }, '+ Add custom...')
  );
};

function SceneBuilder({ productionId: propId }) {
  const [production, setProduction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [draggedActIndex, setDraggedActIndex] = useState(null);
  const [openCharacterSelector, setOpenCharacterSelector] = useState(null); // format: "actIndex-sceneIndex"
  const [newCharInput, setNewCharInput] = useState({}); // keyed by "actIndex-sceneIndex"
  const [castCharacters, setCastCharacters] = useState(() => {
    try {
      const prods = JSON.parse(localStorage.getItem('showsuite_productions') || '[]');
      const prod = prods.find(p => p.id === (propId || null));
      return (prod?.characters || []).map(c => c.name).filter(Boolean);
    } catch { return []; }
  });
  const [collapsedScenes, setCollapsedScenes] = useState({}); // format: { "actIndex-sceneIndex": true }
  const [collapsedActs, setCollapsedActs] = useState({}); // format: { actIndex: true }
  const [expandedSections, setExpandedSections] = useState(() => {
    try { return JSON.parse(localStorage.getItem('scenestave_scene_sections') || '{}'); } catch { return {}; }
  });
  const [activeTab, setActiveTab] = useState(() => {
    try {
      const hash = window.location.hash; // e.g. "#/productions/abc?tab=calendar"
      const queryStart = hash.indexOf('?');
      if (queryStart !== -1) {
        const tab = new URLSearchParams(hash.substring(queryStart)).get('tab');
        if (tab) return tab;
      }
    } catch {}
    return localStorage.getItem('showsuite_active_department_tab') || 'scenes';
  });
  // Resolve role from staffProfile.productions assignment for this specific production,
  // falling back to the app-level role. Computed each render so URL changes are reflected.
  const currentRole = (() => {
    const rawAppRole = localStorage.getItem('showsuite_user_role') || 'admin';
    const SUPER_ROLES = ['super_admin', 'venue_manager', 'admin', 'client_admin', 'board_member', 'accounting_manager'];

    if (SUPER_ROLES.includes(rawAppRole)) {
      return window.USER_ROLES?.find(r => r.id === 'admin') ||
             window.USER_ROLES?.find(r => r.departments === 'all') ||
             { id: 'admin', departments: 'all' };
    }

    // Extract productionId from URL hash without a hook (avoids ordering constraints)
    const hashMatch = (window.location.hash || '').match(/\/productions\/([^/?#]+)/);
    const urlProductionId = propId || (hashMatch ? hashMatch[1] : null);

    // Check if viewing as a specific staff contact — look up their role in this production
    const staffContactId = localStorage.getItem('showsuite_staff_contact_id');
    if (staffContactId && urlProductionId) {
      const contact = window.contactsService?.getContactById?.(staffContactId);
      const assignment = (contact?.staffProfile?.productions || [])
        .find(p => p.productionId === urlProductionId);
      if (assignment?.role) {
        const ROLE_MAP = {
          'Director':         'director',
          'Stage Manager':    'stage_manager',
          'Wardrobe Designer':'wardrobe_designer',
          'Lighting Designer':'lighting_designer',
          'Sound Designer':   'sound_designer',
          'Props Master':     'props_master',
          'Scenic Designer':  'scenic_designer',
          'Musical Director': 'director',
          'Choreographer':    'director',
        };
        const roleId = ROLE_MAP[assignment.role] ||
          assignment.role.toLowerCase().replace(/\s+/g, '_');
        const matched = window.USER_ROLES?.find(r => r.id === roleId);
        if (matched) return matched;
      }
    }

    // Fall back to app-level role → USER_ROLES entry
    const APP_ROLE_MAP = {
      lighting:      'lighting_designer',
      sound:         'sound_designer',
      wardrobe:      'wardrobe_designer',
      props:         'props_master',
      set:           'scenic_designer',
      stage_manager: 'stage_manager',
      director:      'director',
    };
    const mappedId = APP_ROLE_MAP[rawAppRole];
    if (mappedId) {
      const mapped = window.USER_ROLES?.find(r => r.id === mappedId);
      if (mapped) return mapped;
    }
    return window.getCurrentRole?.() || { id: 'admin', departments: 'all' };
  })();
  
  // Get ID from React Router params (defined globally via routerGlobals.js)
  const params = typeof useParams === 'function' ? useParams() : null;
  const productionId = propId || (params && params.id) || null;

  const loadProduction = () => {
    setLoading(true);
    
    if (!productionId) {
      // No ID provided, try to get active production
      const active = window.productionsService?.getActiveProduction?.();
      if (active) {
        if (!Array.isArray(active.acts)) active.acts = [];
        setProduction(active);
      }
      setLoading(false);
      return;
    }
    
    const prod = window.productionsService?.getProductionById?.(productionId);
    if (prod) {
      if (!Array.isArray(prod.acts)) prod.acts = [];
      setProduction(prod);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadProduction();
  }, [productionId]);

  // Reload production data when switching tabs to refresh from localStorage
  useEffect(() => {
    if (productionId && activeTab) {
      loadProduction();
    }
  }, [activeTab]);

  // Keep castCharacters in sync with localStorage (updated by Cast List widget)
  useEffect(() => {
    const refresh = () => {
      try {
        const prods = JSON.parse(localStorage.getItem('showsuite_productions') || '[]');
        const prod = prods.find(p => p.id === production?.id);
        setCastCharacters((prod?.characters || []).map(c => c.name).filter(Boolean));
      } catch {}
    };
    refresh(); // run immediately when production changes
    window.addEventListener('storage', refresh);
    window.addEventListener('productionUpdated', refresh);
    window.addEventListener('charactersUpdated', refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('productionUpdated', refresh);
      window.removeEventListener('charactersUpdated', refresh);
    };
  }, [production?.id]);

  if (loading) {
    return React.createElement('div', { className: 'p-6 text-center text-gray-600' }, 'Loading production...');
  }

  if (!production) {
    return React.createElement(
      'div',
      { className: 'p-6' },
      React.createElement(
        'div',
        { className: 'bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center' },
        React.createElement('p', { className: 'text-yellow-800 mb-4' }, 'Production not found'),
        React.createElement(
          Link,
          { to: '/productions', className: 'px-4 py-2 bg-violet-600 text-white rounded hover:bg-violet-700' },
          '← Back to Productions'
        )
      )
    );
  }

  const id = production.id;

  const handleAddAct = () => {
    const newAct = { name: 'New Act', scenes: [] };
    const updatedActs = [...(production.acts || []), newAct];
    const updated = { ...production, acts: updatedActs };
    setProduction(updated);
    window.productionsService.updateProduction(id, { acts: updatedActs });
  };

  const handleAddScene = (actIndex) => {
    const newScene = { name: 'New Scene', location: '', time: '', description: '' };
    const updatedActs = [...production.acts];
    updatedActs[actIndex].scenes = [...(updatedActs[actIndex].scenes || []), newScene];
    const updated = { ...production, acts: updatedActs };
    setProduction(updated);
    window.productionsService.updateProduction(id, { acts: updatedActs });
  };

  const handleUpdateActName = (actIndex, name) => {
    const updatedActs = [...production.acts];
    updatedActs[actIndex] = { ...updatedActs[actIndex], name };
    setProduction({ ...production, acts: updatedActs });
    window.productionsService.updateProduction(id, { acts: updatedActs });
  };

  const handleDeleteAct = (actIndex) => {
    const act = production.acts[actIndex];
    const label = act?.name || 'this act';
    const sceneCount = (act?.scenes || []).length;
    const confirmed = window.confirm(
      `Delete ${label} and its ${sceneCount} scene${sceneCount !== 1 ? 's' : ''}? This cannot be undone.`
    );
    if (!confirmed) return;
    const updatedActs = production.acts.filter((_, i) => i !== actIndex);
    setProduction({ ...production, acts: updatedActs });
    window.productionsService.updateProduction(id, { acts: updatedActs });
  };

  const handleUpdateScene = (actIndex, sceneIndex, field, value) => {
    const updatedActs = [...production.acts];
    const scenes = [...(updatedActs[actIndex].scenes || [])];
    scenes[sceneIndex] = { ...scenes[sceneIndex], [field]: value };
    updatedActs[actIndex].scenes = scenes;
    setProduction({ ...production, acts: updatedActs });
    window.productionsService.updateProduction(id, { acts: updatedActs });
  };

  const handleDeleteScene = (actIndex, sceneIndex) => {
    const updatedActs = [...production.acts];
    updatedActs[actIndex].scenes = updatedActs[actIndex].scenes.filter((_, i) => i !== sceneIndex);
    setProduction({ ...production, acts: updatedActs });
    window.productionsService.updateProduction(id, { acts: updatedActs });
  };

  const handleUpdateProduction = (updates) => {
    const updated = { ...production, ...updates };
    setProduction(updated);
    window.productionsService.updateProduction(id, updates);
  };

  const saveProduction = (updated) => {
    updated.updatedAt = new Date().toISOString();

    // Update React state
    setProduction(updated);

    // Explicit read-modify-write to localStorage
    const allProductions = JSON.parse(localStorage.getItem('showsuite_productions') || '[]');
    const idx = allProductions.findIndex(p => p.id === updated.id);
    if (idx >= 0) {
      allProductions[idx] = updated;
    } else {
      allProductions.push(updated);
    }
    localStorage.setItem('showsuite_productions', JSON.stringify(allProductions));
    window.dispatchEvent(new CustomEvent('productionUpdated', { detail: { productionId: updated.id } }));

    console.log('✅ Production saved:', updated.title, 'Calendar events:', updated.calendar?.length || 0);
  };

  const toggleSceneCollapse = (actIndex, sceneIndex) => {
    const key = `${actIndex}-${sceneIndex}`;
    setCollapsedScenes(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const isSceneCollapsed = (actIndex, sceneIndex) => {
    return collapsedScenes[`${actIndex}-${sceneIndex}`] || false;
  };

  const toggleActCollapse = (actIndex) => {
    setCollapsedActs(prev => ({ ...prev, [actIndex]: !prev[actIndex] }));
  };

  const isActCollapsed = (actIndex) => collapsedActs[actIndex] || false;

  const toggleSection = (sceneKey, section) => {
    setExpandedSections(prev => {
      const next = { ...prev, [sceneKey]: { ...(prev[sceneKey] || {}), [section]: !(prev[sceneKey]?.[section]) } };
      try { localStorage.setItem('scenestave_scene_sections', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const isSectionOpen = (sceneKey, section) => expandedSections[sceneKey]?.[section] ?? false;

  const hasCueData = (scene) => !!(
    scene.lightingMood || scene.lightingColor ||
    scene.songTitle || scene.artist || scene.soundType
  );

  const hasDirectorNotes = (scene) => !!(
    scene.blocking || scene.directorNotes || scene.notes ||
    scene.rehearsal?.rehearsalNotes ||
    (scene.sceneStatus && scene.sceneStatus !== 'not-started')
  );

  const hasSmNotes = (scene) => !!(scene.smNotes || scene.hazards);

  const allActsCollapsed = (production.acts || []).length > 0 &&
    (production.acts || []).every((_, i) => isActCollapsed(i));

  const toggleAllActs = () => {
    const newState = {};
    (production.acts || []).forEach((_, i) => { newState[i] = !allActsCollapsed; });
    setCollapsedActs(newState);
  };

  const handleDuplicateScene = (actIndex, sceneIndex) => {
    const sceneToCopy = production.acts[actIndex].scenes[sceneIndex];
    const duplicatedScene = {
      ...JSON.parse(JSON.stringify(sceneToCopy)), // Deep clone
      number: (production.acts[actIndex].scenes.length + 1),
      name: sceneToCopy.name ? sceneToCopy.name + ' (copy)' : ''
    };
    
    const updatedActs = production.acts.map((act, idx) => {
      if (idx === actIndex) {
        return {
          ...act,
          scenes: [...act.scenes, duplicatedScene]
        };
      }
      return act;
    });
    
    setProduction({ ...production, acts: updatedActs });
    window.productionsService.updateProduction(id, { acts: updatedActs });
  };

  const handleDragStart = (e, actIndex) => {
    setDraggedActIndex(actIndex);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.outerHTML);
    e.target.style.opacity = '0.5';
  };

  const handleDragEnd = (e) => {
    e.target.style.opacity = '1';
    setDraggedActIndex(null);
  };

  const handleDragOver = (e, actIndex) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, targetIndex) => {
    e.preventDefault();
    if (draggedActIndex === null || draggedActIndex === targetIndex) return;
    
    const updatedActs = [...production.acts];
    const [draggedAct] = updatedActs.splice(draggedActIndex, 1);
    updatedActs.splice(targetIndex, 0, draggedAct);
    
    setProduction({ ...production, acts: updatedActs });
    window.productionsService.updateProduction(id, { acts: updatedActs });
    setDraggedActIndex(null);
  };


  // Header with back button
  const header = React.createElement(
    'div',
    { className: 'flex items-center justify-between mb-6 flex-wrap gap-2' },
    React.createElement(
      'div',
      { className: 'flex items-center gap-4' },
      React.createElement(
        Link,
        { to: '/productions', className: 'px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded' },
        '← Back'
      ),
      React.createElement('h2', { className: 'text-2xl font-bold text-gray-900' }, production.title)
    ),
    React.createElement(
      'span',
      { className: 'text-sm text-gray-500' },
      (production.acts?.length || 0) + ' Acts, ' +
      (production.acts?.reduce((sum, act) => sum + (act.scenes?.length || 0), 0) || 0) + ' Scenes'
    )
  );

  // Department tabs
  const departmentTabs = [
    { id: 'scenes', label: 'Scenes', icon: '🎬' },
    { id: 'lighting', label: 'Lighting', icon: '💡' },
    { id: 'sound', label: 'Sound', icon: '🔊' },
    { id: 'wardrobe', label: 'Wardrobe', icon: '👗' },
    { id: 'props', label: 'Props', icon: '🎭' },
    { id: 'set', label: 'Set', icon: '🏗️' },
    { id: 'stage_manager', label: 'Stage Manager', icon: '📋' },
    { id: 'calendar', label: 'Calendar', icon: '📅' }
  ];

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    localStorage.setItem('showsuite_active_department_tab', newTab);
  };

  // Returns all role labels the current staff contact has on this production, or null to use currentRole
  const getStaffProductionRoles = () => {
    const staffId = localStorage.getItem('showsuite_staff_contact_id');
    if (!staffId || staffId === '__test_manager__') return null;
    const contact = window.contactsService?.getContactById?.(staffId);
    if (!contact?.staffProfile?.productions) return null;
    const entries = contact.staffProfile.productions.filter(p => p.productionId === productionId);
    const roles = entries.flatMap(e =>
    Array.isArray(e.roles) ? e.roles :
    Array.isArray(e.role)  ? e.role  :
    (e.role ? [e.role] : [])
  );
    return roles.length > 0 ? roles : null;
  };

  const ROLE_LABEL_TO_TABS = {
    'Director':          ['scenes','lighting','wardrobe','sound','props','set','stage_manager','actors','calendar','images'],
    'Stage Manager':     ['scenes','actors','calendar','images'],
    'Wardrobe Designer': ['wardrobe','scenes','actors','calendar','images'],
    'Lighting Designer': ['lighting','scenes','actors','calendar','images'],
    'Sound Designer':    ['sound','scenes','actors','calendar','images'],
    'Props Master':      ['props','scenes','actors','calendar','images'],
    'Scenic Designer':   ['set','scenes','actors','calendar','images'],
    'Musical Director':  ['sound','scenes','actors','calendar','images'],
    'Choreographer':     ['scenes','actors','calendar','images'],
  };

  const canAccessTab = (tabId) => {
    if (tabId === 'scenes') return true;   // Everyone can see scenes (read-only for dept roles)
    if (tabId === 'calendar') return true; // Everyone can view the calendar

    // Test Manager sees all tabs
    const staffId = localStorage.getItem('showsuite_staff_contact_id');
    if (staffId === '__test_manager__') return true;

    // Per-production role check — union tabs across all roles the staff member holds
    const productionRoles = getStaffProductionRoles();
    if (productionRoles) {
      const allowedTabs = new Set(productionRoles.flatMap(role => ROLE_LABEL_TO_TABS[role] || []));
      return allowedTabs.has(tabId);
    }

    // Fall back to the app-level currentRole
    return window.canAccessAllDepartments?.(currentRole.id) ||
           window.canAccessDepartment?.(currentRole.id, tabId);
  };

  const visibleTabs = departmentTabs.filter(tab => canAccessTab(tab.id));

  // Derive the effective tab synchronously — prevents content/tab mismatch when role changes
  const TAB_FALLBACK_ORDER = ['scenes','lighting','wardrobe','sound','props','set','stage_manager','actors','calendar'];
  const effectiveTab = canAccessTab(activeTab)
    ? activeTab
    : (TAB_FALLBACK_ORDER.find(t => canAccessTab(t)) || 'calendar');

  const canEditCurrentTab = () => {
    // Admins and directors can edit everything
    if (window.canAccessAllDepartments?.(currentRole.id)) return true;
    // Dept roles can edit their own tab, but not scenes (read-only) or calendar (limited)
    if (effectiveTab === 'scenes') return false;
    if (effectiveTab === 'calendar') return false; // calendar gating handled inside CalendarView
    return window.canAccessDepartment?.(currentRole.id, effectiveTab) || false;
  };

  // True when a dept role is viewing the Scenes tab (read-only)
  const scenesReadOnly = effectiveTab === 'scenes' && !canEditCurrentTab();

  const tabNavigation = React.createElement(
    'div',
    { className: 'flex items-center gap-1 border-b border-gray-200 mb-6 overflow-x-auto scrollbar-hide' },
    visibleTabs.map(tab =>
      React.createElement(
        'button',
        {
          key: tab.id,
          onClick: () => handleTabChange(tab.id),
          className: 'px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ' +
            (effectiveTab === tab.id
              ? 'border-violet-600 text-violet-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300')
        },
        tab.icon + ' ' + tab.label
      )
    )
  );

  // Character & Cast List section
  const characterSection = React.createElement(
    'div',
    { className: 'mb-6' },
    window.CharacterCastList && React.createElement(window.CharacterCastList, {
      production: production,
      onUpdate: (updatedProduction) => {
        saveProduction(updatedProduction);
      }
    })
  );

  // Acts list
  const actsList = React.createElement(
    'div',
    { className: 'space-y-4' },
    (production.acts || []).map((act, actIndex) =>
      React.createElement(
        'div',
        { 
          key: actIndex, 
          className: 'bg-white rounded-lg border border-gray-200 p-4 ' + 
            (draggedActIndex === actIndex ? 'opacity-50' : '') +
            (draggedActIndex !== null && draggedActIndex !== actIndex ? ' border-dashed border-violet-300' : ''),
          draggable: true,
          onDragStart: (e) => handleDragStart(e, actIndex),
          onDragEnd: handleDragEnd,
          onDragOver: (e) => handleDragOver(e, actIndex),
          onDrop: (e) => handleDrop(e, actIndex)
        },
        React.createElement(
          'div',
          {
            className: 'flex items-center justify-between mb-3 cursor-pointer select-none',
            onClick: () => toggleActCollapse(actIndex)
          },
          React.createElement(
            'div',
            { className: 'flex items-center' },
            React.createElement('span', {
              className: 'cursor-grab text-gray-400 mr-2',
              title: 'Drag to reorder',
              onClick: (e) => e.stopPropagation()
            }, '⋮⋮'),
            React.createElement(
              'span',
              { className: 'text-gray-400 mr-2 transition-transform text-sm ' + (isActCollapsed(actIndex) ? '' : 'rotate-90') },
              '▶'
            ),
            React.createElement(
              'select',
              {
                value: act.name || '',
                onChange: (e) => handleUpdateActName(actIndex, e.target.value),
                onClick: (e) => e.stopPropagation(),
                className: 'px-3 py-2 border border-gray-300 rounded-lg w-48 font-semibold bg-white focus:ring-2 focus:ring-violet-500 focus:border-violet-500'
              },
              React.createElement('option', { value: '' }, '-- Select Act --'),
              React.createElement('option', { value: 'Pre-Show' }, 'Pre-Show'),
              React.createElement('option', { value: 'Prologue' }, 'Prologue'),
              React.createElement('option', { value: 'Act One' }, 'Act One'),
              React.createElement('option', { value: 'Act Two' }, 'Act Two'),
              React.createElement('option', { value: 'Act Three' }, 'Act Three'),
              React.createElement('option', { value: 'Act Four' }, 'Act Four'),
              React.createElement('option', { value: 'Act Five' }, 'Act Five'),
              React.createElement('option', { value: 'Act I' }, 'Act I'),
              React.createElement('option', { value: 'Act II' }, 'Act II'),
              React.createElement('option', { value: 'Act III' }, 'Act III'),
              React.createElement('option', { value: 'Act IV' }, 'Act IV'),
              React.createElement('option', { value: 'Act V' }, 'Act V'),
              React.createElement('option', { value: 'Intermission' }, 'Intermission'),
              React.createElement('option', { value: "Entr'acte" }, "Entr'acte"),
              React.createElement('option', { value: 'Epilogue' }, 'Epilogue'),
              React.createElement('option', { value: 'Post-Show' }, 'Post-Show')
            )
          ),
          !scenesReadOnly && React.createElement(
            'div',
            { className: 'flex gap-2' },
            React.createElement(
              'button',
              {
                className: 'px-3 py-2 bg-violet-600 text-white rounded hover:bg-violet-700 text-sm',
                onClick: (e) => { e.stopPropagation(); handleAddScene(actIndex); }
              },
              '+ Add Scene'
            ),
            React.createElement(
              'button',
              {
                className: 'px-3 py-2 bg-red-50 text-red-700 border border-red-200 rounded hover:bg-red-100 text-sm',
                onClick: (e) => { e.stopPropagation(); handleDeleteAct(actIndex); }
              },
              'Delete Act'
            )
          )
        ),
        !isActCollapsed(actIndex) && React.createElement(
          'div',
          { className: 'space-y-3 ml-4' },
          (act.scenes || []).map((scene, sceneIndex) =>
            React.createElement(
              'div',
              { 
                key: sceneIndex, 
                className: 'border border-gray-200 rounded bg-gray-50 overflow-hidden'
              },
              // Collapse header (always visible)
              React.createElement(
                'div',
                { 
                  className: 'flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-100',
                  onClick: () => toggleSceneCollapse(actIndex, sceneIndex)
                },
                // Collapse toggle arrow
                React.createElement(
                  'span',
                  { className: 'text-gray-400 text-sm transition-transform ' + (isSceneCollapsed(actIndex, sceneIndex) ? '' : 'rotate-90') },
                  '▶'
                ),
                // Scene summary
                React.createElement(
                  'div',
                  { className: 'flex-1 flex items-center gap-3' },
                  React.createElement('span', { className: 'font-semibold text-gray-700' }, 
                    'Scene ' + (scene.number || sceneIndex + 1) + 
                    (scene.label && scene.label !== 'Custom' ? ' - ' + scene.label : '') +
                    (scene.label === 'Custom' && scene.customLabel ? ' - ' + scene.customLabel : '') +
                    (scene.name ? ': ' + scene.name : '')
                  ),
                  // Character count badge
                  (scene.characterIds?.length > 0) && React.createElement(
                    'span',
                    { className: 'px-2 py-0.5 bg-violet-100 text-violet-700 text-xs rounded-full' },
                    scene.characterIds.length + ' character' + (scene.characterIds.length !== 1 ? 's' : '')
                  ),
                  // Song/music summary
                  scene.songTitle && React.createElement(
                    'span',
                    { className: 'text-xs ' + (scene.soundType === 'Musical Number' ? 'text-violet-600' : 'text-green-600') },
                    (scene.soundType === 'Musical Number' ? '🎵 ' : '♫ ') + scene.songTitle +
                    (scene.soundType === 'Musical Number' && (scene.musicalCharacterIds || []).length > 0
                      ? ' – ' + (production.characters || []).filter(c => (scene.musicalCharacterIds || []).includes(c.id)).map(c => c.name).join(', ')
                      : '') +
                    (scene.soundType !== 'Musical Number' && scene.artist ? ' – ' + scene.artist : '')
                  )
                ),
                // Scene action buttons (hidden in read-only mode)
                !scenesReadOnly && React.createElement(
                  'div',
                  { className: 'flex items-center gap-1' },
                  // Duplicate button
                  React.createElement(
                    'button',
                    {
                      className: 'p-1 text-gray-400 hover:text-violet-600 text-sm',
                      onClick: (e) => {
                        e.stopPropagation();
                        handleDuplicateScene(actIndex, sceneIndex);
                      },
                      title: 'Duplicate scene'
                    },
                    '📋'
                  ),
                  // Delete button
                  React.createElement(
                    'button',
                    {
                      className: 'p-1 text-gray-400 hover:text-red-600 text-sm',
                      onClick: (e) => {
                        e.stopPropagation();
                        handleDeleteScene(actIndex, sceneIndex);
                      },
                      title: 'Delete scene'
                    },
                    '🗑'
                  )
                )
              ),
              // Collapsible content
              !isSceneCollapsed(actIndex, sceneIndex) && React.createElement(
                'div',
                { className: 'p-3 pt-3 border-t border-gray-200' },
                // Completion summary
                React.createElement(
                  'div',
                  { className: 'flex flex-wrap gap-1.5 mb-3' },
                  React.createElement('span', { className: 'inline-flex items-center text-xs ' + (hasCueData(scene) ? 'text-green-600' : 'text-gray-400') }, hasCueData(scene) ? '✓' : '○', ' Cues'),
                  React.createElement('span', { className: 'inline-flex items-center text-xs ' + (hasDirectorNotes(scene) ? 'text-green-600' : 'text-gray-400') }, hasDirectorNotes(scene) ? '✓' : '○', ' Director'),
                  React.createElement('span', { className: 'inline-flex items-center text-xs ' + (hasSmNotes(scene) ? 'text-violet-600' : 'text-gray-400') }, hasSmNotes(scene) ? '✓' : '○', ' SM'),
                  scene.sceneStatus === 'frozen' && React.createElement('span', { className: 'inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800' }, '❄️ Frozen'),
                  scene.hazards && React.createElement('span', { className: 'inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800' }, '⚠️ Hazard')
                ),
                // Scene number and label row
                React.createElement(
                  'div',
                  { className: 'flex items-center gap-3 mb-2' },
                  // Scene number
                  React.createElement(
                    'div',
                    { className: 'flex items-center border border-gray-300 rounded overflow-hidden shrink-0' },
                    React.createElement('span', { className: 'px-2 bg-gray-100 text-sm text-gray-600 border-r border-gray-300', style: { height: '38px', display: 'flex', alignItems: 'center' } }, 'Scene'),
                    React.createElement('input', {
                      type: 'number',
                      min: 1,
                      value: scene.number || sceneIndex + 1,
                      onChange: (e) => handleUpdateScene(actIndex, sceneIndex, 'number', parseInt(e.target.value) || 1),
                      style: { height: '38px', width: '50px' },
                      className: 'px-2 text-center font-semibold border-0 focus:ring-0 focus:outline-none'
                    })
                  ),
                  // Scene label dropdown
                  React.createElement(
                    'select',
                    {
                      value: scene.label || '',
                      onChange: (e) => handleUpdateScene(actIndex, sceneIndex, 'label', e.target.value),
                      style: { height: '38px' },
                      className: 'w-36 px-2 border border-gray-300 rounded bg-white text-sm shrink-0'
                    },
                    React.createElement('option', { value: '' }, '— No Label —'),
                    React.createElement('option', { value: 'Prologue' }, 'Prologue'),
                    React.createElement('option', { value: 'Epilogue' }, 'Epilogue'),
                    React.createElement('option', { value: 'Vignette' }, 'Vignette'),
                    React.createElement('option', { value: 'Tableau' }, 'Tableau'),
                    React.createElement('option', { value: 'Montage' }, 'Montage'),
                    React.createElement('option', { value: 'Finale' }, 'Finale'),
                    React.createElement('option', { value: 'Custom' }, 'Custom...')
                  ),
                  // Scene title or custom label (fills remaining space)
                  scene.label === 'Custom' 
                    ? React.createElement('input', {
                        type: 'text',
                        value: scene.customLabel || '',
                        onChange: (e) => handleUpdateScene(actIndex, sceneIndex, 'customLabel', e.target.value),
                        style: { height: '38px' },
                        className: 'flex-1 px-3 border border-gray-300 rounded text-sm',
                        placeholder: 'Enter custom label...'
                      })
                    : React.createElement('input', {
                        type: 'text',
                        value: scene.name || '',
                        onChange: (e) => handleUpdateScene(actIndex, sceneIndex, 'name', e.target.value),
                        style: { height: '38px' },
                        className: 'flex-1 px-3 border border-gray-300 rounded text-sm',
                        placeholder: 'Scene title (optional)'
                      })
                ),
                // Characters in scene — always-visible input (SS-006)
                React.createElement(
                  'div',
                  { className: 'mb-4' },
                  React.createElement('label', { className: 'block text-xs font-medium text-gray-600 mb-1' }, '🎭 Characters in Scene'),
                  (() => {
                    const sceneCharsArr = scene.characters || [];
                    const isFullCompanyScene = sceneCharsArr.includes('Full Company');
                    const hasAnyChars = (scene.characterIds || []).length > 0 || sceneCharsArr.length > 0;
                    if (!hasAnyChars) return null;
                    return React.createElement(
                      'div',
                      { className: 'flex flex-wrap gap-1 mb-2' },
                      isFullCompanyScene
                        ? React.createElement(
                            'span',
                            {
                              className: 'inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium',
                              style: { backgroundColor: 'var(--color-primary-surface)', color: 'var(--color-primary)', border: '1px solid var(--color-primary)' }
                            },
                            '🎭 Full Company',
                            React.createElement('button', {
                              type: 'button',
                              onClick: () => handleUpdateScene(actIndex, sceneIndex, 'characters', []),
                              style: { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)', marginLeft: '2px' }
                            }, '×')
                          )
                        : [
                            ...(scene.characterIds || []).map(charId => {
                              const char = (production.characters || []).find(c => c.id === charId);
                              if (!char) return null;
                              return React.createElement(
                                'span',
                                { key: charId, className: 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-violet-100 text-violet-800' },
                                char.name,
                                React.createElement('button', {
                                  type: 'button',
                                  onClick: () => handleUpdateScene(actIndex, sceneIndex, 'characterIds', (scene.characterIds || []).filter(id => id !== charId)),
                                  className: 'ml-0.5 text-violet-500 hover:text-violet-900 font-bold leading-none'
                                }, '×')
                              );
                            }),
                            ...sceneCharsArr.map((charName, i) =>
                              React.createElement(
                                'span',
                                { key: `fc-${i}`, className: 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-violet-100 text-violet-800' },
                                charName,
                                React.createElement('button', {
                                  type: 'button',
                                  onClick: () => handleUpdateScene(actIndex, sceneIndex, 'characters', sceneCharsArr.filter((_, idx) => idx !== i)),
                                  className: 'ml-0.5 text-violet-500 hover:text-violet-900 font-bold leading-none'
                                }, '×')
                              )
                            )
                          ]
                    );
                  })(),
                  (() => {
                    // castCharacters comes from component-level state (kept fresh from localStorage)
                    const sceneCharacters = scene.characters || [];
                    const available = castCharacters.filter(c => !sceneCharacters.includes(c));
                    if (castCharacters.length > 0) {
                      const isFullCompanyScene = (scene.characters || []).includes('Full Company');
                      if (isFullCompanyScene) return null;
                      return React.createElement(
                        'select',
                        {
                          value: '',
                          onChange: e => {
                            const val = e.target.value;
                            if (!val) return;
                            if (val === '__full_company__') {
                              handleUpdateScene(actIndex, sceneIndex, 'characters', ['Full Company']);
                              handleUpdateScene(actIndex, sceneIndex, 'fullCompany', true);
                              handleUpdateScene(actIndex, sceneIndex, 'musicalCharacters', [...castCharacters]);
                              handleUpdateScene(actIndex, sceneIndex, 'artist', 'Full Company');
                            } else {
                              const unique = Array.from(new Set([...(scene.characters || []), val]));
                              handleUpdateScene(actIndex, sceneIndex, 'characters', unique);
                            }
                          },
                          className: 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-colors'
                        },
                        React.createElement('option', { value: '' }, '+ Add character from Cast List...'),
                        React.createElement('option', { value: '__full_company__' }, '🎭 Full Company'),
                        ...available.map(char => React.createElement('option', { key: char, value: char }, char))
                      );
                    }
                    return React.createElement(
                      'div',
                      null,
                      React.createElement('input', {
                        type: 'text',
                        value: newCharInput[`${actIndex}-${sceneIndex}`] || '',
                        onChange: e => setNewCharInput(prev => ({ ...prev, [`${actIndex}-${sceneIndex}`]: e.target.value })),
                        onKeyDown: e => {
                          if (e.key === 'Enter' || e.key === ',') {
                            e.preventDefault();
                            const key = `${actIndex}-${sceneIndex}`;
                            const name = (newCharInput[key] || '').replace(',', '').trim();
                            if (!name) return;
                            const unique = Array.from(new Set([...(scene.characters || []), name]));
                            handleUpdateScene(actIndex, sceneIndex, 'characters', unique);
                            setNewCharInput(prev => ({ ...prev, [key]: '' }));
                          }
                        },
                        className: 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-colors',
                        placeholder: 'Type character name and press Enter…'
                      }),
                      React.createElement('p', { className: 'text-xs text-gray-400 mt-1' }, '💡 Add characters to the Cast List first for faster entry')
                    );
                  })()
                ),
                // ── Location + Time of Day ────────────────────────────────────────────
                React.createElement(
                  'div',
                  { className: 'grid grid-cols-1 md:grid-cols-2 gap-4 mb-4' },
                  React.createElement(
                    'div',
                    null,
                    React.createElement('label', { className: 'block text-xs font-medium text-gray-600 mb-1' }, '📍 Location'),
                    React.createElement('input', {
                      type: 'text',
                      value: scene.location || '',
                      onChange: (e) => handleUpdateScene(actIndex, sceneIndex, 'location', e.target.value),
                      className: 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-colors',
                      placeholder: 'e.g., The Unemployment Office, Stage Right'
                    })
                  ),
                  React.createElement(
                    'div',
                    null,
                    React.createElement('label', { className: 'block text-xs font-medium text-gray-600 mb-1' }, '🕐 Time of Day'),
                    React.createElement(SmartDropdown, {
                      field: 'timeOfDay',
                      value: scene.time || '',
                      defaultOptions: TIME_OF_DAY_OPTIONS,
                      onChange: (val) => handleUpdateScene(actIndex, sceneIndex, 'time', val),
                      placeholder: 'Select time of day...'
                    })
                  )
                ),
                // ── Action / Summary ──────────────────────────────────────────────────────
                React.createElement(
                  'div',
                  { className: 'mb-4' },
                  React.createElement('label', { className: 'block text-xs font-medium text-gray-600 mb-1' }, '📝 Action / Summary'),
                  React.createElement('textarea', {
                    value: scene.description || '',
                    onChange: (e) => handleUpdateScene(actIndex, sceneIndex, 'description', e.target.value),
                    className: 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-colors resize-y',
                    rows: 3,
                    placeholder: 'Brief description of what happens in this scene…'
                  })
                ),
                // ── Department Cues (collapsible by default) ─────────────────────────────────
                React.createElement(
                  'button',
                  {
                    type: 'button',
                    onClick: () => toggleSection(`${actIndex}-${sceneIndex}`, 'cues'),
                    className: 'flex items-center gap-2 w-full py-2 text-left select-none border-t border-gray-200 mt-1 hover:text-gray-700 transition-colors'
                  },
                  React.createElement(
                    'span',
                    { className: 'text-gray-400 text-xs transition-transform duration-150 ' + (isSectionOpen(`${actIndex}-${sceneIndex}`, 'cues') ? 'rotate-90' : '') },
                    '▶'
                  ),
                  React.createElement('span', { className: 'text-xs font-semibold tracking-wide text-gray-500 uppercase' }, '🎭 Dept Cues'),
                  hasCueData(scene)
                    ? React.createElement('span', { className: 'w-2 h-2 rounded-full bg-green-500 ml-1 shrink-0', title: 'Has cue data' })
                    : React.createElement('span', { className: 'ml-auto text-gray-400 text-xs italic font-normal normal-case tracking-normal' }, 'not set')
                ),
                isSectionOpen(`${actIndex}-${sceneIndex}`, 'cues') && React.createElement(
                  'div',
                  { className: 'pb-3 space-y-3' },
                  React.createElement(
                    'div',
                    { className: 'grid grid-cols-1 md:grid-cols-2 gap-3' },
                    React.createElement(
                      'div',
                      null,
                      React.createElement('label', { className: 'block text-xs font-medium text-gray-600 mb-1' }, '💡 Lighting Mood'),
                      React.createElement(SmartDropdown, {
                        field: 'lightingMood',
                        value: scene.lightingMood || '',
                        defaultOptions: LIGHTING_MOOD_OPTIONS,
                        onChange: (val) => handleUpdateScene(actIndex, sceneIndex, 'lightingMood', val),
                        placeholder: 'Select lighting mood...'
                      })
                    ),
                    React.createElement(
                      'div',
                      null,
                      React.createElement('label', { className: 'block text-xs font-medium text-gray-600 mb-1' }, '🎨 Lighting Color'),
                      React.createElement('input', {
                        type: 'text',
                        value: scene.lightingColor || '',
                        onChange: (e) => handleUpdateScene(actIndex, sceneIndex, 'lightingColor', e.target.value),
                        className: 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-colors',
                        placeholder: 'e.g., amber, blue wash'
                      })
                    )
                  ),
                  React.createElement(
                    'div',
                    { className: 'space-y-3' },
                    React.createElement(
                      'div',
                      { className: 'grid gap-3', style: { gridTemplateColumns: '1fr auto auto' } },
                      React.createElement(
                        'div',
                        null,
                        React.createElement('label', { className: 'block text-xs font-medium text-gray-600 mb-1' }, '🎵 Song / Cue Title'),
                        React.createElement('input', {
                          type: 'text',
                          value: scene.songTitle || '',
                          onChange: (e) => handleUpdateScene(actIndex, sceneIndex, 'songTitle', e.target.value),
                          className: 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-colors',
                          placeholder: 'Song title'
                        })
                      ),
                      React.createElement(
                        'div',
                        null,
                        React.createElement('label', { className: 'block text-xs font-medium text-gray-600 mb-1' }, '⏱ Duration'),
                        React.createElement('input', {
                          type: 'text',
                          value: scene.duration || '',
                          onChange: (e) => handleUpdateScene(actIndex, sceneIndex, 'duration', e.target.value),
                          className: 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-colors',
                          placeholder: 'Duration'
                        })
                      ),
                      React.createElement(
                        'div',
                        null,
                        React.createElement('label', { className: 'block text-xs font-medium text-gray-600 mb-1' }, '🔊 Sound Type'),
                        React.createElement(
                          'select',
                          {
                            value: scene.soundType || '',
                            onChange: (e) => {
                              const newType = e.target.value;
                              const wasMusical = scene.soundType === 'Musical Number';
                              const isNowMusical = newType === 'Musical Number';
                              handleUpdateScene(actIndex, sceneIndex, 'soundType', newType);
                              if (wasMusical && !isNowMusical) {
                                handleUpdateScene(actIndex, sceneIndex, 'artist', '');
                                handleUpdateScene(actIndex, sceneIndex, 'musicalCharacters', []);
                                handleUpdateScene(actIndex, sceneIndex, 'fullCompany', false);
                                handleUpdateScene(actIndex, sceneIndex, 'micAssignments', {});
                              }
                            },
                            className: 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-colors'
                          },
                          React.createElement('option', { value: '' }, 'Select type…'),
                          React.createElement('option', { value: 'Musical Number' }, '🎵 Musical Number'),
                          React.createElement('option', { value: 'Underscore' }, 'Underscore'),
                          React.createElement('option', { value: 'Incidental Music' }, 'Incidental Music'),
                          React.createElement('option', { value: 'Diegetic / Onstage' }, 'Diegetic / Onstage'),
                          React.createElement('option', { value: 'Atmosphere / Ambience' }, 'Atmosphere / Ambience'),
                          React.createElement('option', { value: 'Stinger / Button' }, 'Stinger / Button'),
                          React.createElement('option', { value: 'Effect (SFX)' }, 'Effect (SFX)')
                        )
                      )
                    ),
                    scene.soundType !== 'Musical Number'
                      ? React.createElement(
                          'div',
                          null,
                          React.createElement('label', { className: 'block text-xs font-medium text-gray-600 mb-1' }, '🎤 Artist / Composer'),
                          React.createElement('input', {
                            type: 'text',
                            value: scene.artist || '',
                            onChange: (e) => handleUpdateScene(actIndex, sceneIndex, 'artist', e.target.value),
                            className: 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-colors',
                            placeholder: 'e.g., Stephen Sondheim'
                          })
                        )
                      : null,
                    scene.soundType === 'Musical Number'
                      ? (() => {
                          const sceneChars = scene.characters || [];
                          const isFullCompany = scene.fullCompany === true;
                          const currentPerformers = isFullCompany
                            ? [...sceneChars]
                            : (Array.isArray(scene.musicalCharacters)
                                ? scene.musicalCharacters
                                : (scene.artist || '').split(',').map(s => s.trim()).filter(Boolean));
                          const availableToAdd = sceneChars.filter(c => !currentPerformers.includes(c));
                          const updatePerformers = (updated) => {
                            handleUpdateScene(actIndex, sceneIndex, 'musicalCharacters', updated);
                            handleUpdateScene(actIndex, sceneIndex, 'artist', updated.join(', '));
                            handleUpdateScene(actIndex, sceneIndex, 'fullCompany', false);
                          };
                          return React.createElement(
                            'div',
                            { className: 'space-y-2' },
                            React.createElement(
                              'div',
                              { className: 'flex items-center justify-between' },
                              React.createElement('label', { className: 'text-xs font-medium', style: { color: 'var(--color-text-muted)' } }, '🎭 Performers'),
                              React.createElement(
                                'button',
                                {
                                  type: 'button',
                                  onClick: () => {
                                    if (isFullCompany) {
                                      handleUpdateScene(actIndex, sceneIndex, 'fullCompany', false);
                                      handleUpdateScene(actIndex, sceneIndex, 'musicalCharacters', []);
                                      handleUpdateScene(actIndex, sceneIndex, 'artist', '');
                                    } else {
                                      handleUpdateScene(actIndex, sceneIndex, 'fullCompany', true);
                                      handleUpdateScene(actIndex, sceneIndex, 'musicalCharacters', [...castCharacters]);
                                      handleUpdateScene(actIndex, sceneIndex, 'artist', 'Full Company');
                                    }
                                  },
                                  className: 'text-xs px-3 py-1 rounded-full font-medium transition-colors',
                                  style: {
                                    backgroundColor: isFullCompany ? 'var(--color-primary-surface)' : 'var(--color-bg-elevated)',
                                    color: isFullCompany ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                                    border: '1px solid ' + (isFullCompany ? 'var(--color-primary)' : 'var(--color-border)'),
                                  }
                                },
                                isFullCompany ? '✓ Full Company' : '+ Full Company'
                              )
                            ),
                            sceneChars.length === 0
                              ? React.createElement('p', {
                                  className: 'text-xs px-3 py-2 rounded-lg',
                                  style: { color: 'var(--color-text-muted)', backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }
                                }, 'No characters in scene — add characters above first')
                              : React.createElement(
                                  'div',
                                  { className: 'rounded-lg overflow-hidden', style: { border: '1px solid var(--color-border)' } },
                                  React.createElement(
                                    'div',
                                    {
                                      className: 'grid text-xs font-semibold uppercase tracking-wide px-3 py-2',
                                      style: { gridTemplateColumns: '1fr 80px 100px 1fr', backgroundColor: 'var(--color-bg-elevated)', color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border)' }
                                    },
                                    React.createElement('span', null, 'Character'),
                                    React.createElement('span', null, 'Mic #'),
                                    React.createElement('span', null, 'Level'),
                                    React.createElement('span', null, 'Custom')
                                  ),
                                  (isFullCompany ? castCharacters : currentPerformers).map(char => {
                                    const mic = (scene.micAssignments || {})[char] || {};
                                    const updateMic = (field, value) => {
                                      const existing = scene.micAssignments || {};
                                      handleUpdateScene(actIndex, sceneIndex, 'micAssignments', {
                                        ...existing,
                                        [char]: { ...(existing[char] || {}), [field]: value }
                                      });
                                    };
                                    return React.createElement(
                                      'div',
                                      {
                                        key: char,
                                        className: 'grid items-center px-3 py-2 gap-2',
                                        style: { gridTemplateColumns: '1fr 80px 100px 1fr', borderTop: '1px solid var(--color-border)' }
                                      },
                                      React.createElement(
                                        'div',
                                        { className: 'flex items-center gap-1 min-w-0' },
                                        React.createElement(
                                          'button',
                                          {
                                            type: 'button',
                                            onClick: () => {
                                              const base = isFullCompany ? [...castCharacters] : [...currentPerformers];
                                              updatePerformers(base.filter(x => x !== char));
                                            },
                                            className: 'text-xs flex-shrink-0',
                                            style: { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }
                                          },
                                          '×'
                                        ),
                                        React.createElement('span', { className: 'text-sm truncate', style: { color: 'var(--color-text-primary)' } }, char)
                                      ),
                                      React.createElement('input', {
                                        type: 'number',
                                        min: '1',
                                        max: '99',
                                        placeholder: '—',
                                        value: mic.micNumber || '',
                                        onChange: (e) => updateMic('micNumber', e.target.value),
                                        className: 'w-full px-2 py-1 rounded text-sm text-center',
                                        style: { backgroundColor: 'var(--color-bg-elevated)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }
                                      }),
                                      React.createElement('input', {
                                        type: 'text',
                                        placeholder: 'e.g. -6dB',
                                        value: mic.level || '',
                                        onChange: (e) => updateMic('level', e.target.value),
                                        className: 'w-full px-2 py-1 rounded text-sm',
                                        style: { backgroundColor: 'var(--color-bg-elevated)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }
                                      }),
                                      React.createElement('input', {
                                        type: 'text',
                                        placeholder: 'Notes...',
                                        value: mic.custom || '',
                                        onChange: (e) => updateMic('custom', e.target.value),
                                        className: 'w-full px-2 py-1 rounded text-sm',
                                        style: { backgroundColor: 'var(--color-bg-elevated)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }
                                      })
                                    );
                                  }),
                                  !isFullCompany && availableToAdd.length > 0
                                    ? React.createElement(
                                        'div',
                                        { className: 'px-3 py-2', style: { borderTop: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-elevated)' } },
                                        React.createElement(
                                          'select',
                                          {
                                            value: '',
                                            onChange: (e) => {
                                              if (!e.target.value) return;
                                              updatePerformers([...currentPerformers, e.target.value]);
                                            },
                                            className: 'w-full px-2 py-1.5 rounded text-sm',
                                            style: { backgroundColor: 'var(--color-bg-elevated)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }
                                          },
                                          React.createElement('option', { value: '' }, '+ Add performer...'),
                                          availableToAdd.map(char => React.createElement('option', { key: char, value: char }, char))
                                        )
                                      )
                                    : null
                                )
                          );
                        })()
                      : null
                  )
                ),
                // ── Director's Notes (collapsible by default) ─────────────────────────────────
                React.createElement(
                  'button',
                  {
                    type: 'button',
                    onClick: () => toggleSection(`${actIndex}-${sceneIndex}`, 'director'),
                    className: 'flex items-center gap-2 w-full py-2 text-left select-none border-t border-gray-200 mt-1 hover:text-gray-700 transition-colors'
                  },
                  React.createElement('span', { className: 'text-gray-400 text-xs transition-transform duration-150 ' + (isSectionOpen(`${actIndex}-${sceneIndex}`, 'director') ? 'rotate-90' : '') }, '▶'),
                  React.createElement('span', { className: 'text-xs font-semibold tracking-wide text-gray-500 uppercase' }, '🎬 Director\'s Notes'),
                  hasDirectorNotes(scene)
                    ? React.createElement('span', { className: 'w-2 h-2 rounded-full bg-green-500 ml-1 shrink-0', title: 'Has director notes' })
                    : React.createElement('span', { className: 'ml-auto text-gray-400 text-xs italic font-normal normal-case tracking-normal' }, 'not set')
                ),
                isSectionOpen(`${actIndex}-${sceneIndex}`, 'director') && React.createElement(
                  'div',
                  { className: 'pb-3 space-y-3' },
                  React.createElement(
                    'div', null,
                    React.createElement('label', { className: 'block text-xs font-medium text-gray-600 mb-1' }, 'Scene Status'),
                    React.createElement(
                      'select',
                      {
                        value: scene.sceneStatus || 'not-started',
                        onChange: (e) => handleUpdateScene(actIndex, sceneIndex, 'sceneStatus', e.target.value),
                        className: 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-colors'
                      },
                      React.createElement('option', { value: 'not-started' }, 'Not Started'),
                      React.createElement('option', { value: 'in-rehearsal' }, 'In Rehearsal'),
                      React.createElement('option', { value: 'blocked' }, 'Blocked'),
                      React.createElement('option', { value: 'stumble-through' }, 'Stumble Through'),
                      React.createElement('option', { value: 'run-through' }, 'Run Through'),
                      React.createElement('option', { value: 'frozen' }, '❄️ Frozen ✓')
                    )
                  ),
                  React.createElement(
                    'div', null,
                    React.createElement('label', { className: 'block text-xs font-medium text-gray-600 mb-1' }, '📐 Blocking / Staging'),
                    React.createElement('textarea', {
                      value: scene.blocking || scene.notes || '',
                      onChange: (e) => handleUpdateScene(actIndex, sceneIndex, 'blocking', e.target.value),
                      className: 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-colors resize-y',
                      rows: 3,
                      placeholder: 'Blocking notes, staging directions, choreography cues...'
                    })
                  ),
                  React.createElement(
                    'div', null,
                    React.createElement('label', { className: 'block text-xs font-medium text-gray-600 mb-1' }, '🎬 Director\'s Notes'),
                    React.createElement('textarea', {
                      value: scene.directorNotes || '',
                      onChange: (e) => handleUpdateScene(actIndex, sceneIndex, 'directorNotes', e.target.value),
                      className: 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-colors resize-y',
                      rows: 3,
                      placeholder: 'Creative intent, tone, concept notes for this scene...'
                    })
                  ),
                  React.createElement(
                    'div', null,
                    React.createElement('label', { className: 'block text-xs font-medium text-gray-600 mb-1' }, '📋 Rehearsal Notes'),
                    React.createElement('textarea', {
                      value: scene.rehearsal?.rehearsalNotes || '',
                      onChange: (e) => handleUpdateScene(actIndex, sceneIndex, 'rehearsal', { ...(scene.rehearsal || {}), rehearsalNotes: e.target.value }),
                      className: 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-colors resize-y',
                      rows: 3,
                      placeholder: 'Notes from rehearsal, adjustments, reminders...'
                    })
                  ),
                  React.createElement(
                    'div', { className: 'grid grid-cols-2 gap-3' },
                    React.createElement(
                      'div', null,
                      React.createElement('label', { className: 'block text-xs font-medium text-gray-600 mb-1' }, 'Priority'),
                      React.createElement(
                        'select',
                        {
                          value: scene.rehearsal?.priority || 'normal',
                          onChange: (e) => handleUpdateScene(actIndex, sceneIndex, 'rehearsal', { ...(scene.rehearsal || {}), priority: e.target.value }),
                          className: 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-colors'
                        },
                        React.createElement('option', { value: 'normal' }, 'Normal'),
                        React.createElement('option', { value: 'high' }, 'High'),
                        React.createElement('option', { value: 'critical' }, 'Critical')
                      )
                    ),
                    React.createElement(
                      'div', null,
                      React.createElement('label', { className: 'block text-xs font-medium text-gray-600 mb-1' }, 'Complexity'),
                      React.createElement(
                        'select',
                        {
                          value: scene.rehearsal?.complexity || 'low',
                          onChange: (e) => handleUpdateScene(actIndex, sceneIndex, 'rehearsal', { ...(scene.rehearsal || {}), complexity: e.target.value }),
                          className: 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-colors'
                        },
                        React.createElement('option', { value: 'low' }, 'Low'),
                        React.createElement('option', { value: 'medium' }, 'Medium'),
                        React.createElement('option', { value: 'high' }, 'High')
                      )
                    )
                  )
                ),
                // ── SM Notes (collapsible by default) ─────────────────────────────────────────
                React.createElement(
                  'button',
                  {
                    type: 'button',
                    onClick: () => toggleSection(`${actIndex}-${sceneIndex}`, 'smNotes'),
                    className: 'flex items-center gap-2 w-full py-2 text-left select-none border-t border-gray-200 mt-1 hover:text-gray-700 transition-colors'
                  },
                  React.createElement('span', { className: 'text-gray-400 text-xs transition-transform duration-150 ' + (isSectionOpen(`${actIndex}-${sceneIndex}`, 'smNotes') ? 'rotate-90' : '') }, '▶'),
                  React.createElement('span', { className: 'text-xs font-semibold tracking-wide text-gray-500 uppercase' }, '📋 SM Notes'),
                  hasSmNotes(scene)
                    ? React.createElement(
                        React.Fragment, null,
                        React.createElement('span', { className: 'w-2 h-2 rounded-full bg-green-500 ml-1 shrink-0', title: 'Has SM notes' }),
                        scene.hazards ? React.createElement('span', { className: 'w-2 h-2 rounded-full bg-amber-500 ml-1 shrink-0', title: 'Has hazards' }) : null
                      )
                    : React.createElement('span', { className: 'ml-auto text-gray-400 text-xs italic font-normal normal-case tracking-normal' }, 'not set')
                ),
                isSectionOpen(`${actIndex}-${sceneIndex}`, 'smNotes') && React.createElement(
                  'div',
                  { className: 'pb-3 space-y-3' },
                  React.createElement(
                    'div', null,
                    React.createElement('label', { className: 'block text-xs font-medium text-gray-600 mb-1' }, 'SM Calling Note'),
                    React.createElement('textarea', {
                      value: scene.smNotes || '',
                      onChange: (e) => handleUpdateScene(actIndex, sceneIndex, 'smNotes', e.target.value),
                      className: 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-colors resize-y',
                      rows: 2,
                      placeholder: 'SM notes for calling this scene — standby cues, special calls...'
                    })
                  ),
                  React.createElement(
                    'div', null,
                    React.createElement('label', { className: 'block text-xs font-medium text-gray-600 mb-1' }, '⚠️ Hazards / Warnings'),
                    React.createElement('input', {
                      type: 'text',
                      value: scene.hazards || '',
                      onChange: (e) => handleUpdateScene(actIndex, sceneIndex, 'hazards', e.target.value),
                      className: 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-colors',
                      placeholder: 'e.g., Pyro, flying, quick change, live flame...'
                    })
                  )
                )
              )
            )
          ),
          (act.scenes || []).length === 0 &&
            React.createElement(
              'p',
              { className: 'text-gray-500 text-sm italic' },
              'No scenes yet. Click "+ Add Scene" to create one.'
            )
        )
      )
    )
  );

  // Collapse All / Expand All toolbar
  const scenesToolbar = (production.acts || []).length > 0 ? React.createElement(
    'div',
    { className: 'flex justify-end mb-3' },
    React.createElement(
      'button',
      {
        className: 'px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50',
        onClick: toggleAllActs
      },
      allActsCollapsed ? 'Expand All' : 'Collapse All'
    )
  ) : null;

  // Add Act button (hidden in read-only mode)
  const addActButton = !scenesReadOnly ? React.createElement(
    'div',
    { className: 'mt-6' },
    React.createElement(
      'button',
      {
        className: 'px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700',
        onClick: handleAddAct
      },
      '+ Add Act'
    )
  ) : null;

  // Empty state
  const emptyState = (production.acts || []).length === 0
    ? React.createElement(
        'div',
        { className: 'text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300' },
        React.createElement('p', { className: 'text-gray-600 mb-4' }, 'No acts defined yet'),
        React.createElement('p', { className: 'text-gray-500 text-sm mb-4' }, 'Start building your production by adding acts and scenes'),
        !scenesReadOnly && React.createElement(
          'button',
          {
            onClick: handleAddAct,
            className: 'px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700'
          },
          '+ Add Your First Act'
        )
      )
    : null;


  return React.createElement(
    'div',
    { className: 'p-6 max-w-4xl mx-auto' },
    header,
    tabNavigation,
    effectiveTab === 'scenes' && React.createElement(
      React.Fragment,
      null,
      scenesReadOnly && React.createElement(
        'div',
        { className: 'mb-4 px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-sm text-amber-800' },
        React.createElement('span', null, '👁'),
        React.createElement('span', null, 'Read-only view — scene editing is available to Directors and Admins only.')
      ),
      characterSection,
      React.createElement('hr', { className: 'my-6 border-gray-200' }),
      scenesToolbar,
      emptyState || actsList,
      !emptyState && addActButton
    ),
    effectiveTab === 'lighting' && React.createElement(LightingView, {
      production: production,
      onUpdateScene: (actIndex, sceneIndex, field, value) => {
        handleUpdateScene(actIndex, sceneIndex, field, value);
      }
    }),
    effectiveTab === 'sound' && React.createElement(SoundDepartmentView, {
      production: production,
      userRole: currentRole.id,
      onUpdateScene: (actIndex, sceneIndex, field, value) => {
        handleUpdateScene(actIndex, sceneIndex, field, value);
      }
    }),
    effectiveTab === 'wardrobe' && (
      typeof WardrobeView !== 'undefined' ? React.createElement(WardrobeView, {
        production: production,
        onSave: saveProduction,
        onUpdateScene: (actIndex, sceneIndex, field, value) => {
          handleUpdateScene(actIndex, sceneIndex, field, value);
        }
      }) : React.createElement(
        'div',
        { className: 'bg-pink-50 border border-pink-200 rounded-lg p-8 text-center' },
        React.createElement('p', { className: 'text-pink-800 text-lg mb-2' }, '👗 Wardrobe Department'),
        React.createElement('p', { className: 'text-pink-600' }, 'Costume tracking coming soon...')
      )
    ),
    effectiveTab === 'props' && React.createElement(PropsView, {
      production: production,
      onSave: saveProduction,
      onUpdateScene: (actIndex, sceneIndex, field, value) => {
        handleUpdateScene(actIndex, sceneIndex, field, value);
      }
    }),
    effectiveTab === 'set' && (
      React.createElement(SetDesignView, {
        production: production,
        onSave: saveProduction
      })
    ),
    effectiveTab === 'stage_manager' && React.createElement(StageManagerView, {
      production: production,
      onUpdateScene: (actIndex, sceneIndex, field, value) => {
        handleUpdateScene(actIndex, sceneIndex, field, value);
      },
      onUpdateProduction: (updates) => {
        handleUpdateProduction(updates);
      }
    }),
    effectiveTab === 'calendar' && React.createElement(CalendarView, {
      production: production,
      onSave: saveProduction,
      userRole: currentRole.id
    })
  );
}

window.SceneBuilder = SceneBuilder;
window.SmartDropdown = SmartDropdown;
window.LIGHTING_MOOD_OPTIONS = LIGHTING_MOOD_OPTIONS;

