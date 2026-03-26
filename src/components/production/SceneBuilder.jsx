const { useState, useEffect } = React;
const { Link, useParams } = window.ReactRouterDOM || {};

// Global SceneBuilder component - uses React Router useParams for production ID
function SceneBuilder({ productionId: propId }) {
  const [production, setProduction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [draggedActIndex, setDraggedActIndex] = useState(null);
  const [openCharacterSelector, setOpenCharacterSelector] = useState(null); // format: "actIndex-sceneIndex"
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

  const hasNotes = (scene) => !!(scene.notes || scene.stageNotes || scene.blocking || scene.directorNotes);

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

  const canAccessTab = (tabId) => {
    if (tabId === 'scenes') return true; // Everyone can see scenes (read-only for dept roles)
    if (tabId === 'calendar') return true; // Everyone can view the calendar
    return window.canAccessAllDepartments?.(currentRole.id) ||
           window.canAccessDepartment?.(currentRole.id, tabId);
  };

  const canEditCurrentTab = () => {
    // Admins and directors can edit everything
    if (window.canAccessAllDepartments?.(currentRole.id)) return true;
    // Dept roles can edit their own tab, but not scenes (read-only) or calendar (limited)
    if (activeTab === 'scenes') return false;
    if (activeTab === 'calendar') return false; // calendar gating handled inside CalendarView
    return window.canAccessDepartment?.(currentRole.id, activeTab) || false;
  };

  const visibleTabs = departmentTabs.filter(tab => canAccessTab(tab.id));

  // True when a dept role is viewing the Scenes tab (read-only)
  const scenesReadOnly = activeTab === 'scenes' && !canEditCurrentTab();

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
            (activeTab === tab.id
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
                  { className: 'flex gap-3 text-xs mb-3' },
                  React.createElement(
                    'span',
                    { className: hasCueData(scene) ? 'text-green-600' : 'text-gray-400' },
                    hasCueData(scene) ? '✓' : '○', ' Cues'
                  ),
                  React.createElement(
                    'span',
                    { className: hasNotes(scene) ? 'text-green-600' : 'text-gray-400' },
                    hasNotes(scene) ? '✓' : '○', ' Notes'
                  )
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
                // Characters in scene (multi-select popover)
                React.createElement(
                  'div',
                  { className: 'mb-3' },
                  React.createElement('label', { className: 'block text-xs text-gray-600 mb-1' }, '🎭 Characters in Scene'),
                  // Selected characters display
                  React.createElement(
                    'div',
                    { className: 'flex flex-wrap items-center gap-1 mb-2' },
                    (scene.characterIds || []).map(charId => {
                      const char = (production.characters || []).find(c => c.id === charId);
                      if (!char) return null;
                      return React.createElement(
                        'span',
                        { 
                          key: charId,
                          className: 'inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-violet-100 text-violet-800'
                        },
                        char.name,
                        React.createElement(
                          'button',
                          {
                            type: 'button',
                            onClick: () => {
                              const newChars = (scene.characterIds || []).filter(id => id !== charId);
                              handleUpdateScene(actIndex, sceneIndex, 'characterIds', newChars);
                            },
                            className: 'ml-1 text-violet-600 hover:text-violet-900 font-bold'
                          },
                          '×'
                        )
                      );
                    }),
                    // Add button to open selector
                    React.createElement(
                      'button',
                      {
                        type: 'button',
                        onClick: () => setOpenCharacterSelector(
                          openCharacterSelector === `${actIndex}-${sceneIndex}` ? null : `${actIndex}-${sceneIndex}`
                        ),
                        className: 'inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full border border-dashed border-gray-300 text-gray-600 hover:border-violet-400 hover:text-violet-600'
                      },
                      '+ Add Characters'
                    )
                  ),
                  // Multi-select popover
                  openCharacterSelector === `${actIndex}-${sceneIndex}` && React.createElement(
                    'div',
                    { className: 'absolute z-10 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg p-2' },
                    // Header
                    React.createElement(
                      'div',
                      { className: 'flex items-center justify-between mb-2 pb-2 border-b border-gray-100' },
                      React.createElement('span', { className: 'text-sm font-medium text-gray-700' }, 'Select Characters'),
                      React.createElement(
                        'button',
                        {
                          type: 'button',
                          onClick: () => setOpenCharacterSelector(null),
                          className: 'text-gray-400 hover:text-gray-600'
                        },
                        '✕'
                      )
                    ),
                    // Character list with checkboxes
                    React.createElement(
                      'div',
                      { className: 'max-h-48 overflow-y-auto space-y-1' },
                      (production.characters || []).length === 0
                        ? React.createElement('p', { className: 'text-xs text-gray-400 italic p-2' }, 'No characters defined yet')
                        : (production.characters || []).map(char =>
                            React.createElement(
                              'label',
                              { 
                                key: char.id,
                                className: 'flex items-center gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer'
                              },
                              React.createElement('input', {
                                type: 'checkbox',
                                checked: (scene.characterIds || []).includes(char.id),
                                onChange: (e) => {
                                  const currentChars = scene.characterIds || [];
                                  const newChars = e.target.checked
                                    ? [...currentChars, char.id]
                                    : currentChars.filter(id => id !== char.id);
                                  handleUpdateScene(actIndex, sceneIndex, 'characterIds', newChars);
                                },
                                className: 'w-4 h-4 text-violet-600 rounded border-gray-300 focus:ring-violet-500'
                              }),
                              React.createElement('span', { className: 'text-sm text-gray-700' }, char.name)
                            )
                          )
                    ),
                    // Done button
                    React.createElement(
                      'div',
                      { className: 'mt-2 pt-2 border-t border-gray-100' },
                      React.createElement(
                        'button',
                        {
                          type: 'button',
                          onClick: () => setOpenCharacterSelector(null),
                          className: 'w-full px-3 py-1 text-sm bg-violet-600 text-white rounded hover:bg-violet-700'
                        },
                        'Done'
                      )
                    )
                  )
                ),
                React.createElement(
                  'div',
                  { className: 'grid grid-cols-1 md:grid-cols-3 gap-3 mb-2' },
                  React.createElement('div', { className: 'relative' },
                    React.createElement('span', { className: 'absolute left-2.5 top-2 text-sm pointer-events-none' }, '📍'),
                    React.createElement('textarea', {
                      value: scene.location || '',
                      onChange: (e) => handleUpdateScene(actIndex, sceneIndex, 'location', e.target.value),
                      className: 'pl-8 pr-3 py-2 border border-gray-300 rounded w-full text-sm resize-none',
                      placeholder: 'Location',
                      rows: 2
                    })
                  ),
                  React.createElement('div', { className: 'relative' },
                    React.createElement('span', { className: 'absolute left-2.5 top-1/2 -translate-y-1/2 text-sm pointer-events-none' }, '🕐'),
                    React.createElement('input', {
                      type: 'text',
                      value: scene.time || '',
                      onChange: (e) => handleUpdateScene(actIndex, sceneIndex, 'time', e.target.value),
                      className: 'pl-8 pr-3 py-2 border border-gray-300 rounded w-full text-sm',
                      placeholder: 'Time of day'
                    })
                  ),
                  React.createElement('div', { className: 'relative' },
                    React.createElement('span', { className: 'absolute left-2.5 top-2 text-sm pointer-events-none' }, '📝'),
                    React.createElement('textarea', {
                      value: scene.description || '',
                      onChange: (e) => handleUpdateScene(actIndex, sceneIndex, 'description', e.target.value),
                      className: 'pl-8 pr-3 py-2 border border-gray-300 rounded w-full text-sm resize-none',
                      placeholder: 'Description',
                      rows: 2
                    })
                  )
                ),
                // Department Cues toggle
                React.createElement(
                  'button',
                  {
                    type: 'button',
                    onClick: () => toggleSection(`${actIndex}-${sceneIndex}`, 'cues'),
                    className: 'flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 mt-3 mb-1 w-full select-none'
                  },
                  React.createElement(
                    'span',
                    { className: 'transition-transform duration-150 ' + (isSectionOpen(`${actIndex}-${sceneIndex}`, 'cues') ? 'rotate-90' : '') },
                    '▶'
                  ),
                  React.createElement('span', null, ' Department Cues'),
                  hasCueData(scene) && !isSectionOpen(`${actIndex}-${sceneIndex}`, 'cues')
                    ? React.createElement('span', { className: 'ml-1 text-green-500 text-xs' }, '●')
                    : null,
                  !hasCueData(scene)
                    ? React.createElement('span', { className: 'ml-auto text-gray-400 text-xs italic' }, 'not set')
                    : null
                ),
                // Department Cues collapsible content
                isSectionOpen(`${actIndex}-${sceneIndex}`, 'cues') && React.createElement(
                  'div',
                  { className: 'mt-1 pt-2 border-t border-gray-200 space-y-2' },
                  // Lighting section
                  React.createElement(
                    'div',
                    { className: 'grid grid-cols-1 md:grid-cols-2 gap-3' },
                    React.createElement('div', { className: 'relative' },
                      React.createElement('span', { className: 'absolute left-2.5 top-1/2 -translate-y-1/2 text-sm pointer-events-none' }, '💡'),
                      React.createElement('input', {
                        type: 'text',
                        value: scene.lightingMood || '',
                        onChange: (e) => handleUpdateScene(actIndex, sceneIndex, 'lightingMood', e.target.value),
                        className: 'pl-8 pr-3 py-2 border border-gray-300 rounded w-full text-sm',
                        placeholder: 'Lighting mood (e.g., warm, dramatic)'
                      })
                    ),
                    React.createElement('div', { className: 'relative' },
                      React.createElement('span', { className: 'absolute left-2.5 top-1/2 -translate-y-1/2 text-sm pointer-events-none' }, '🎨'),
                      React.createElement('input', {
                        type: 'text',
                        value: scene.lightingColor || '',
                        onChange: (e) => handleUpdateScene(actIndex, sceneIndex, 'lightingColor', e.target.value),
                        className: 'pl-8 pr-3 py-2 border border-gray-300 rounded w-full text-sm',
                        placeholder: 'Lighting color (e.g., amber, blue wash)'
                      })
                    )
                  ),
                  // Sound section
                  React.createElement(
                    'div',
                    { className: 'grid grid-cols-1 md:grid-cols-4 gap-3' },
                    React.createElement('div', { className: 'relative' },
                      React.createElement('span', { className: 'absolute left-2.5 top-1/2 -translate-y-1/2 text-sm pointer-events-none' }, '🎵'),
                      React.createElement('input', {
                        type: 'text',
                        value: scene.songTitle || '',
                        onChange: (e) => handleUpdateScene(actIndex, sceneIndex, 'songTitle', e.target.value),
                        className: 'pl-8 pr-3 py-2 border border-gray-300 rounded w-full text-sm',
                        placeholder: 'Song title'
                      })
                    ),
                    // Artist field OR Character selection depending on sound type
                    (() => {
                      if (scene.soundType === 'Musical Number') {
                        const sceneChars = (production.characters || []).filter(c => (scene.characterIds || []).includes(c.id));
                        return React.createElement(
                          'div',
                          null,
                          React.createElement('label', { className: 'block text-xs text-gray-500 mb-1' }, '🎭 Performers (Characters)'),
                          React.createElement(
                            'div',
                            { className: 'border border-gray-300 rounded bg-white p-2 max-h-32 overflow-y-auto' },
                            sceneChars.length === 0
                              ? React.createElement('p', { className: 'text-xs text-gray-400 italic' }, 'No characters in scene. Add characters above first.')
                              : sceneChars.map(char => React.createElement(
                                  'label',
                                  { key: char.id, className: 'flex items-center gap-2 py-0.5 cursor-pointer hover:bg-gray-50 px-1 rounded' },
                                  React.createElement('input', {
                                    type: 'checkbox',
                                    checked: (scene.musicalCharacterIds || []).includes(char.id),
                                    onChange: (e) => {
                                      const current = scene.musicalCharacterIds || [];
                                      const next = e.target.checked
                                        ? [...current, char.id]
                                        : current.filter(id => id !== char.id);
                                      handleUpdateScene(actIndex, sceneIndex, 'musicalCharacterIds', next);
                                    },
                                    className: 'w-4 h-4 text-violet-600 rounded border-gray-300'
                                  }),
                                  React.createElement('span', { className: 'text-sm text-gray-700' }, char.name)
                                ))
                          ),
                          (scene.musicalCharacterIds || []).length > 0 && React.createElement(
                            'div',
                            { className: 'flex flex-wrap gap-1 mt-1' },
                            (production.characters || [])
                              .filter(c => (scene.musicalCharacterIds || []).includes(c.id))
                              .map(c => React.createElement(
                                'span',
                                { key: c.id, className: 'px-2 py-0.5 bg-violet-100 text-violet-700 text-xs rounded-full' },
                                c.name
                              ))
                          )
                        );
                      }
                      return React.createElement('div', { className: 'relative' },
                        React.createElement('span', { className: 'absolute left-2.5 top-1/2 -translate-y-1/2 text-sm pointer-events-none' }, '🎤'),
                        React.createElement('input', {
                          type: 'text',
                          value: scene.artist || '',
                          onChange: (e) => handleUpdateScene(actIndex, sceneIndex, 'artist', e.target.value),
                          className: 'pl-8 pr-3 py-2 border border-gray-300 rounded w-full text-sm',
                          placeholder: 'Artist'
                        })
                      );
                    })(),
                    React.createElement('div', { className: 'relative' },
                      React.createElement('span', { className: 'absolute left-2.5 top-1/2 -translate-y-1/2 text-sm pointer-events-none' }, '⏱️'),
                      React.createElement('input', {
                        type: 'text',
                        value: scene.duration || '',
                        onChange: (e) => handleUpdateScene(actIndex, sceneIndex, 'duration', e.target.value),
                        className: 'pl-8 pr-3 py-2 border border-gray-300 rounded w-full text-sm',
                        placeholder: 'Duration'
                      })
                    ),
                    React.createElement(
                      'select',
                      {
                        value: scene.soundType || '',
                        onChange: (e) => handleUpdateScene(actIndex, sceneIndex, 'soundType', e.target.value),
                        className: 'px-3 py-2 border border-gray-300 rounded w-full text-sm bg-white'
                      },
                      React.createElement('option', { value: '' }, '🔊 Sound Type'),
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
                // Production Notes toggle
                React.createElement(
                  'button',
                  {
                    type: 'button',
                    onClick: () => toggleSection(`${actIndex}-${sceneIndex}`, 'notes'),
                    className: 'flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 mt-3 mb-1 w-full select-none'
                  },
                  React.createElement(
                    'span',
                    { className: 'transition-transform duration-150 ' + (isSectionOpen(`${actIndex}-${sceneIndex}`, 'notes') ? 'rotate-90' : '') },
                    '▶'
                  ),
                  React.createElement('span', null, ' Production Notes'),
                  hasNotes(scene) && !isSectionOpen(`${actIndex}-${sceneIndex}`, 'notes')
                    ? React.createElement('span', { className: 'ml-1 text-green-500 text-xs' }, '●')
                    : null,
                  !hasNotes(scene)
                    ? React.createElement('span', { className: 'ml-auto text-gray-400 text-xs italic' }, 'not set')
                    : null
                ),
                // Production Notes collapsible content
                isSectionOpen(`${actIndex}-${sceneIndex}`, 'notes') && React.createElement(
                  'div',
                  { className: 'mt-1 pt-2 border-t border-gray-200' },
                  React.createElement('textarea', {
                    value: scene.notes || '',
                    onChange: (e) => handleUpdateScene(actIndex, sceneIndex, 'notes', e.target.value),
                    className: 'w-full px-3 py-2 border border-gray-300 rounded text-sm resize-y',
                    rows: 3,
                    placeholder: 'Enter blocking notes, stage directions, choreography cues, or other production notes...'
                  })
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
    activeTab === 'scenes' && React.createElement(
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
    activeTab === 'lighting' && React.createElement(LightingView, {
      production: production,
      onUpdateScene: (actIndex, sceneIndex, field, value) => {
        handleUpdateScene(actIndex, sceneIndex, field, value);
      }
    }),
    activeTab === 'sound' && React.createElement(SoundDepartmentView, {
      production: production,
      onUpdateScene: (actIndex, sceneIndex, field, value) => {
        handleUpdateScene(actIndex, sceneIndex, field, value);
      }
    }),
    activeTab === 'wardrobe' && (
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
    activeTab === 'props' && React.createElement(PropsView, {
      production: production,
      onSave: saveProduction,
      onUpdateScene: (actIndex, sceneIndex, field, value) => {
        handleUpdateScene(actIndex, sceneIndex, field, value);
      }
    }),
    activeTab === 'set' && (
      React.createElement(SetDesignView, {
        production: production,
        onSave: saveProduction
      })
    ),
    activeTab === 'stage_manager' && React.createElement(StageManagerView, {
      production: production,
      onUpdateScene: (actIndex, sceneIndex, field, value) => {
        handleUpdateScene(actIndex, sceneIndex, field, value);
      },
      onUpdateProduction: (updates) => {
        handleUpdateProduction(updates);
      }
    }),
    activeTab === 'calendar' && React.createElement(CalendarView, {
      production: production,
      onSave: saveProduction,
      userRole: currentRole.id
    })
  );
}

window.SceneBuilder = SceneBuilder;
