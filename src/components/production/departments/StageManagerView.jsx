const { useState, useEffect } = React;

// Stage Manager Department View - collaboration hub and show bible
function StageManagerView({ production, onUpdateScene, onUpdateProduction }) {
  const [expandedActs, setExpandedActs] = useState({});
  const [activeSection, setActiveSection] = useState('cuesheet');
  const [preShowChecklist, setPreShowChecklist] = useState(production?.smPreShowChecklist || []);
  const [intermissionChecklist, setIntermissionChecklist] = useState(production?.smIntermissionChecklist || []);
  const [newPreShowItem, setNewPreShowItem] = useState('');
  const [newIntermissionItem, setNewIntermissionItem] = useState('');

  // Toggle act expansion
  const toggleAct = (actIndex) => {
    setExpandedActs(prev => ({
      ...prev,
      [actIndex]: !prev[actIndex]
    }));
  };

  // Initialize all acts as expanded
  useEffect(() => {
    if (production?.acts) {
      const expanded = {};
      production.acts.forEach((_, idx) => expanded[idx] = true);
      setExpandedActs(expanded);
    }
    setPreShowChecklist(production?.smPreShowChecklist || []);
    setIntermissionChecklist(production?.smIntermissionChecklist || []);
  }, [production?.id]);

  // Handle SM-specific field updates
  const handleSMUpdate = (actIndex, sceneIndex, field, value) => {
    onUpdateScene?.(actIndex, sceneIndex, field, value);
  };

  // Checklist handlers
  const addChecklistItem = (type) => {
    const newItem = { id: 'chk_' + Date.now(), text: type === 'preshow' ? newPreShowItem : newIntermissionItem, completed: false };
    if (type === 'preshow') {
      const updated = [...preShowChecklist, newItem];
      setPreShowChecklist(updated);
      setNewPreShowItem('');
      onUpdateProduction?.({ smPreShowChecklist: updated });
    } else {
      const updated = [...intermissionChecklist, newItem];
      setIntermissionChecklist(updated);
      setNewIntermissionItem('');
      onUpdateProduction?.({ smIntermissionChecklist: updated });
    }
  };

  const toggleChecklistItem = (type, itemId) => {
    if (type === 'preshow') {
      const updated = preShowChecklist.map(item => 
        item.id === itemId ? { ...item, completed: !item.completed } : item
      );
      setPreShowChecklist(updated);
      onUpdateProduction?.({ smPreShowChecklist: updated });
    } else {
      const updated = intermissionChecklist.map(item => 
        item.id === itemId ? { ...item, completed: !item.completed } : item
      );
      setIntermissionChecklist(updated);
      onUpdateProduction?.({ smIntermissionChecklist: updated });
    }
  };

  const deleteChecklistItem = (type, itemId) => {
    if (type === 'preshow') {
      const updated = preShowChecklist.filter(item => item.id !== itemId);
      setPreShowChecklist(updated);
      onUpdateProduction?.({ smPreShowChecklist: updated });
    } else {
      const updated = intermissionChecklist.filter(item => item.id !== itemId);
      setIntermissionChecklist(updated);
      onUpdateProduction?.({ smIntermissionChecklist: updated });
    }
  };

  // Get character name by ID
  const getCharacterName = (charId) => {
    const char = (production?.characters || []).find(c => c.id === charId);
    return char?.name || 'Unknown';
  };

  // Calculate totals
  const totalScenes = production?.acts?.reduce((sum, act) => sum + (act.scenes?.length || 0), 0) || 0;
  const totalRunTime = production?.acts?.reduce((sum, act) => 
    sum + (act.scenes?.reduce((s, scene) => s + (parseInt(scene.smRunTime) || 0), 0) || 0), 0
  ) || 0;

  if (!production?.acts?.length) {
    return React.createElement(
      'div',
      { className: 'text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300' },
      React.createElement('p', { className: 'text-gray-500 text-lg mb-2' }, '📋 Stage Manager'),
      React.createElement('p', { className: 'text-gray-400 text-sm' }, 'No scenes have been created yet.'),
      React.createElement('p', { className: 'text-gray-400 text-sm' }, 'Add acts and scenes in the Scenes tab first.')
    );
  }

  // Section tabs
  const sectionTabs = React.createElement(
    'div',
    { className: 'flex gap-2 mb-6' },
    [
      { id: 'cuesheet', label: '📋 Cue Sheet', desc: 'Cue-to-cue builder' },
      { id: 'runsheet', label: '📄 Run Sheet', desc: 'Scene-by-scene overview' },
      { id: 'checklists', label: '✅ Checklists', desc: 'Pre-show & intermission' }
    ].map(section =>
      React.createElement(
        'button',
        {
          key: section.id,
          onClick: () => setActiveSection(section.id),
          className: 'px-4 py-2 rounded-lg text-sm font-medium transition-colors ' +
            (activeSection === section.id
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200')
        },
        section.label
      )
    )
  );

  // Helper: detect empty/unset department values
  const isEmpty = (val) => !val || val === 'Not set' || val === 'None assigned' || (Array.isArray(val) && val.length === 0);

  // Run Sheet Section
  const runSheetContent = React.createElement(
    'div',
    null,
    // Header with stats
    React.createElement(
      'div',
      { className: 'flex items-center justify-between mb-4 p-4 bg-blue-50 rounded-lg' },
      React.createElement(
        'div',
        null,
        React.createElement('h3', { className: 'text-lg font-semibold text-gray-900' }, '📄 Run Sheet'),
        React.createElement('p', { className: 'text-sm text-gray-600' }, 'Complete scene breakdown with all department data')
      ),
      React.createElement(
        'div',
        { className: 'text-right' },
        React.createElement('p', { className: 'text-sm font-medium text-gray-700' }, totalScenes + ' scenes'),
        React.createElement('p', { className: 'text-xs text-gray-500' }, 
          'Est. run time: ' + Math.floor(totalRunTime / 60) + 'h ' + (totalRunTime % 60) + 'm'
        )
      )
    ),
    // Acts and scenes
    React.createElement(
      'div',
      { className: 'space-y-4' },
      production.acts.map((act, actIndex) =>
        React.createElement(
          'div',
          { key: actIndex, className: 'bg-white rounded-lg border border-gray-200 overflow-hidden' },
          // Act header
          React.createElement(
            'div',
            { 
              className: 'flex items-center justify-between p-4 bg-gray-50 cursor-pointer hover:bg-gray-100',
              onClick: () => toggleAct(actIndex)
            },
            React.createElement(
              'div',
              { className: 'flex items-center gap-3' },
              React.createElement(
                'span',
                { className: 'text-gray-400 transition-transform ' + (expandedActs[actIndex] ? 'rotate-90' : '') },
                '▶'
              ),
              React.createElement('span', { className: 'font-semibold text-gray-800' }, act.name || 'Act ' + (actIndex + 1)),
              React.createElement(
                'span',
                { className: 'text-sm text-gray-500' },
                (act.scenes?.length || 0) + ' scene' + ((act.scenes?.length || 0) !== 1 ? 's' : '')
              )
            )
          ),
          // Scenes
          expandedActs[actIndex] && (act.scenes?.length > 0
            ? React.createElement(
                'div',
                { className: 'divide-y divide-gray-100' },
                act.scenes.map((scene, sceneIndex) =>
                  React.createElement(
                    'div',
                    { key: sceneIndex, className: 'p-4' },
                    // Scene header
                    React.createElement(
                      'div',
                      { className: 'flex items-center justify-between mb-3' },
                      React.createElement(
                        'div',
                        { className: 'flex items-center gap-2' },
                        (act.name) && React.createElement(
                          'span',
                          { className: 'text-gray-400 text-xs' },
                          act.name + ' —'
                        ),
                        React.createElement(
                          'span',
                          { className: 'px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded' },
                          'Scene ' + (scene.number || sceneIndex + 1)
                        ),
                        scene.label && scene.label !== 'Custom' && React.createElement(
                          'span',
                          { className: 'text-sm text-gray-600' },
                          scene.label
                        ),
                        scene.label === 'Custom' && scene.customLabel && React.createElement(
                          'span',
                          { className: 'text-sm text-gray-600' },
                          scene.customLabel
                        ),
                        scene.name && React.createElement(
                          'span',
                          { className: 'text-sm font-medium text-gray-800' },
                          '— ' + scene.name
                        )
                      ),
                      // Run time input
                      React.createElement(
                        'div',
                        { className: 'flex items-center gap-2' },
                        React.createElement('span', { className: 'text-xs text-gray-500' }, 'Run time:'),
                        React.createElement('input', {
                          type: 'number',
                          min: 0,
                          value: scene.smRunTime || '',
                          onChange: (e) => handleSMUpdate(actIndex, sceneIndex, 'smRunTime', e.target.value),
                          className: 'w-16 px-2 py-1 border border-gray-300 rounded text-sm text-center',
                          placeholder: '0'
                        }),
                        React.createElement('span', { className: 'text-xs text-gray-500' }, 'min')
                      )
                    ),
                    // Department data summary (read-only)
                    React.createElement(
                      'div',
                      { className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-3' },
                      // Characters
                      (() => {
                        const charVal = scene.characterIds?.length > 0
                          ? scene.characterIds.map(id => getCharacterName(id)).join(', ')
                          : null;
                        const charEmpty = isEmpty(charVal);
                        return React.createElement(
                          'div',
                          { className: charEmpty ? 'p-2 rounded border-2 border-dashed border-gray-300 bg-gray-50 opacity-70' : 'p-2 bg-violet-50 rounded' },
                          React.createElement('p', { className: 'text-xs font-medium text-violet-700 mb-1' }, '🎭 Characters'),
                          charEmpty
                            ? React.createElement('span', { className: 'italic text-gray-400 text-xs' }, '⚠ None assigned')
                            : React.createElement('p', { className: 'text-xs text-violet-600' }, charVal)
                        );
                      })(),
                      // Lighting
                      (() => {
                        const lightVal = [scene.lightingCue, scene.lightingMood, scene.lightingColor].filter(Boolean).join(' • ') || null;
                        const lightEmpty = isEmpty(lightVal);
                        return React.createElement(
                          'div',
                          { className: lightEmpty ? 'p-2 rounded border-2 border-dashed border-gray-300 bg-gray-50 opacity-70' : 'p-2 bg-yellow-50 rounded' },
                          React.createElement('p', { className: 'text-xs font-medium text-yellow-700 mb-1' }, '💡 Lighting'),
                          lightEmpty
                            ? React.createElement('span', { className: 'italic text-gray-400 text-xs' }, '⚠ Not set')
                            : React.createElement('p', { className: 'text-xs text-yellow-600' }, lightVal)
                        );
                      })(),
                      // Sound
                      (() => {
                        const soundVal = [scene.songTitle, scene.artist, scene.soundType].filter(Boolean).join(' • ') || null;
                        const soundEmpty = isEmpty(soundVal);
                        return React.createElement(
                          'div',
                          { className: soundEmpty ? 'p-2 rounded border-2 border-dashed border-gray-300 bg-gray-50 opacity-70' : 'p-2 bg-green-50 rounded' },
                          React.createElement('p', { className: 'text-xs font-medium text-green-700 mb-1' }, '🔊 Sound'),
                          soundEmpty
                            ? React.createElement('span', { className: 'italic text-gray-400 text-xs' }, '⚠ Not set')
                            : React.createElement('p', { className: 'text-xs text-green-600' }, soundVal)
                        );
                      })(),
                      // Location/Time
                      (() => {
                        const settingVal = [scene.location, scene.time].filter(Boolean).join(' — ') || null;
                        const settingEmpty = isEmpty(settingVal);
                        return React.createElement(
                          'div',
                          { className: settingEmpty ? 'p-2 rounded border-2 border-dashed border-gray-300 bg-gray-50 opacity-70' : 'p-2 bg-gray-100 rounded' },
                          React.createElement('p', { className: 'text-xs font-medium text-gray-700 mb-1' }, '📍 Setting'),
                          settingEmpty
                            ? React.createElement('span', { className: 'italic text-gray-400 text-xs' }, '⚠ Not set')
                            : React.createElement('p', { className: 'text-xs text-gray-600' }, settingVal)
                        );
                      })()
                    ),
                    // SM Cue Notes (editable)
                    React.createElement(
                      'div',
                      { className: 'mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200' },
                      React.createElement('label', { className: 'block text-xs font-medium text-blue-700 mb-1' }, '📋 SM Cue Notes'),
                      React.createElement('textarea', {
                        value: scene.smCueNotes || '',
                        onChange: (e) => handleSMUpdate(actIndex, sceneIndex, 'smCueNotes', e.target.value),
                        className: 'w-full px-3 py-2 border border-blue-300 rounded text-sm resize-y focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                        rows: 2,
                        placeholder: 'Standby cues, warnings, calls, blocking notes...'
                      })
                    )
                  )
                )
              )
            : React.createElement(
                'div',
                { className: 'p-4 text-center text-gray-500 text-sm' },
                'No scenes in this act'
              )
          )
        )
      )
    )
  );

  // Checklists Section
  const renderChecklist = (type, items, newItem, setNewItem) => {
    const title = type === 'preshow' ? '🎬 Pre-Show Checklist' : '⏸️ Intermission Checklist';
    
    return React.createElement(
      'div',
      { className: 'bg-white rounded-lg border border-gray-200 p-4' },
      React.createElement('h4', { className: 'font-semibold text-gray-800 mb-3' }, title),
      // Checklist items
      React.createElement(
        'div',
        { className: 'space-y-2 mb-3' },
        items.length === 0
          ? React.createElement('p', { className: 'text-sm text-gray-400 italic' }, 'No items yet')
          : items.map(item =>
              React.createElement(
                'div',
                { key: item.id, className: 'flex items-center gap-2 p-2 bg-gray-50 rounded' },
                React.createElement('input', {
                  type: 'checkbox',
                  checked: item.completed,
                  onChange: () => toggleChecklistItem(type, item.id),
                  className: 'w-4 h-4 text-blue-600 rounded'
                }),
                React.createElement(
                  'span',
                  { className: 'flex-1 text-sm ' + (item.completed ? 'line-through text-gray-400' : 'text-gray-700') },
                  item.text
                ),
                React.createElement(
                  'button',
                  {
                    onClick: () => deleteChecklistItem(type, item.id),
                    className: 'text-gray-400 hover:text-red-600 text-sm'
                  },
                  '🗑'
                )
              )
            )
      ),
      // Add new item
      React.createElement(
        'div',
        { className: 'flex gap-2' },
        React.createElement('input', {
          type: 'text',
          value: newItem,
          onChange: (e) => setNewItem(e.target.value),
          onKeyPress: (e) => e.key === 'Enter' && newItem.trim() && addChecklistItem(type),
          className: 'flex-1 px-3 py-2 border border-gray-300 rounded text-sm',
          placeholder: 'Add new item...'
        }),
        React.createElement(
          'button',
          {
            onClick: () => newItem.trim() && addChecklistItem(type),
            disabled: !newItem.trim(),
            className: 'px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50'
          },
          '+ Add'
        )
      )
    );
  };

  const checklistsContent = React.createElement(
    'div',
    { className: 'grid grid-cols-1 md:grid-cols-2 gap-6' },
    renderChecklist('preshow', preShowChecklist, newPreShowItem, setNewPreShowItem),
    renderChecklist('intermission', intermissionChecklist, newIntermissionItem, setNewIntermissionItem)
  );

  return React.createElement(
    'div',
    null,
    sectionTabs,
    activeSection === 'runsheet' ? runSheetContent :
    activeSection === 'checklists' ? checklistsContent :
    (window.CueSheetBuilder
      ? React.createElement(window.CueSheetBuilder, { production, userRole: 'stage_manager' })
      : React.createElement('div', { className: 'text-center py-12 text-gray-400' }, 'Loading cue sheet...')
    )
  );
}

window.StageManagerView = StageManagerView;
