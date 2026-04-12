const { useState, useEffect } = React;

function SoundDepartmentView({ production, onUpdateScene, userRole }) {
  const [expandedActs, setExpandedActs] = useState({});
  const [activeTab, setActiveTab] = useState('sound');
  const [localProduction, setLocalProduction] = useState(production);

  const EDIT_ROLES = ['super_admin', 'venue_manager', 'admin', 'client_admin', 'sound', 'sound_designer', 'director'];
  const canEdit = EDIT_ROLES.includes(userRole);

  useEffect(() => { setLocalProduction(production); }, [production]);

  useEffect(() => {
    const refresh = () => {
      try {
        const prods = JSON.parse(localStorage.getItem('showsuite_productions') || '[]');
        const fresh = prods.find(p => p.id === production?.id);
        if (fresh) setLocalProduction(fresh);
      } catch {}
    };
    window.addEventListener('productionUpdated', refresh);
    return () => window.removeEventListener('productionUpdated', refresh);
  }, [production?.id]);
  const soundTypeOptions = [
    { value: 'Musical Number', label: '🎵 Musical Number' },
    { value: 'Underscore', label: 'Underscore' },
    { value: 'Incidental Music', label: 'Incidental Music' },
    { value: 'Diegetic / Onstage', label: 'Diegetic / Onstage' },
    { value: 'Atmosphere / Ambience', label: 'Atmosphere / Ambience' },
    { value: 'Stinger / Button', label: 'Stinger / Button' },
    { value: 'Effect (SFX)', label: 'Effect (SFX)' }
  ];

  const toggleAct = (actIndex) => {
    setExpandedActs(prev => ({
      ...prev,
      [actIndex]: !prev[actIndex]
    }));
  };

  useEffect(() => {
    if (production?.acts) {
      const expanded = {};
      production.acts.forEach((_, idx) => expanded[idx] = true);
      setExpandedActs(expanded);
    }
  }, [production?.id]);

  useEffect(() => {
    if (!production?.acts) return;

    const allScenes = [];
    production.acts.forEach((act) => {
      if (Array.isArray(act.scenes)) {
        act.scenes.forEach((scene, idx) => {
          allScenes.push({
            ...scene,
            act: act.name,
            sceneNumber: scene.number || scene.sceneNumber || idx + 1
          });
        });
      }
    });

    console.log('SoundDepartmentView loaded scenes:', allScenes);
  }, [production?.id, production?.acts]);

  const updateSoundField = (actIndex, sceneIndex, field, value) => {
    // Optimistic update so Artist/Performers toggle without waiting for the localStorage round-trip
    setLocalProduction(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        acts: prev.acts.map((act, ai) => {
          if (ai !== actIndex) return act;
          return {
            ...act,
            scenes: act.scenes.map((scene, si) => {
              if (si !== sceneIndex) return scene;
              return { ...scene, [field]: value };
            })
          };
        })
      };
    });

    onUpdateScene?.(actIndex, sceneIndex, field, value);
  };

  const updateMicAssignment = (actIndex, sceneIndex, char, field, value) => {
    const scene = localProduction.acts[actIndex]?.scenes?.[sceneIndex];
    const existing = scene?.micAssignments || {};
    const updatedMicAssignments = {
      ...existing,
      [char]: { ...(existing[char] || {}), [field]: value }
    };
    setLocalProduction(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        acts: prev.acts.map((act, ai) => {
          if (ai !== actIndex) return act;
          return {
            ...act,
            scenes: act.scenes.map((s, si) => {
              if (si !== sceneIndex) return s;
              return { ...s, micAssignments: updatedMicAssignments };
            })
          };
        })
      };
    });
    onUpdateScene?.(actIndex, sceneIndex, 'micAssignments', updatedMicAssignments);
  };

  if (!localProduction?.acts?.length) {
    return React.createElement(
      'div',
      { className: 'text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300' },
      React.createElement('p', { className: 'text-gray-600' }, 'No scenes created yet.'),
      React.createElement('p', { className: 'text-sm text-gray-500 mt-2' }, 'Add acts and scenes in the Scenes tab first.')
    );
  }

  const header = React.createElement(
    'div',
    { className: 'flex items-center justify-between mb-6' },
    React.createElement(
      'div',
      null,
      React.createElement('h3', { className: 'text-lg font-semibold text-gray-900' }, '🔊 Sound Design'),
      React.createElement('p', { className: 'text-sm text-gray-500' }, 'Manage song cues, artists, durations, and sound types')
    ),
    React.createElement(
      'div',
      { className: 'text-right' },
      React.createElement('p', { className: 'text-sm font-medium text-gray-700' },
        (localProduction.acts.reduce((sum, act) => sum + (act.scenes?.filter(s => s.songTitle || s.artist || s.duration || s.soundType)?.length || 0), 0))
        + ' scenes have sound data'
      )
    )
  );

  const actsList = React.createElement(
    'div',
    { className: 'space-y-4' },
    localProduction.acts.map((act, actIndex) =>
      React.createElement(
        'div',
        { key: actIndex, className: 'bg-white rounded-lg border border-gray-200 overflow-hidden' },
        // Act header
        React.createElement(
          'div',
          { className: 'flex items-center justify-between p-4 bg-purple-50 cursor-pointer hover:bg-purple-100', onClick: () => toggleAct(actIndex) },
          React.createElement(
            'div',
            { className: 'flex items-center gap-3' },
            React.createElement('span', { className: 'text-gray-400 transition-transform ' + (expandedActs[actIndex] ? 'rotate-90' : '') }, '▶'),
            React.createElement('span', { className: 'font-semibold text-purple-900' }, act.name || ('Act ' + (actIndex + 1))),
            React.createElement('span', { className: 'text-sm text-purple-700 bg-white px-2 py-1 rounded' }, (act.scenes?.length || 0) + ' scene' + ((act.scenes?.length || 0) !== 1 ? 's' : ''))
          )
        ),
        // Scenes list
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
                    { className: 'flex items-center gap-2 mb-3' },
                    React.createElement('span', { className: 'px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded' }, 'Scene ' + (scene.number || scene.sceneNumber || sceneIndex + 1)),
                    scene.label && scene.label !== 'Custom' && React.createElement('span', { className: 'text-sm text-gray-600' }, scene.label),
                    scene.label === 'Custom' && scene.customLabel && React.createElement('span', { className: 'text-sm text-gray-600' }, scene.customLabel),
                    scene.name && React.createElement('span', { className: 'text-sm font-medium text-gray-800' }, scene.name),
                    scene.time && React.createElement('span', { className: 'text-xs ml-auto', style: { color: 'var(--color-text-muted)' } }, '🕐 ' + scene.time)
                  ),
                  // Sound fields
                  React.createElement(
                    'div',
                    { className: 'space-y-4' },
                    React.createElement(
                      'div',
                      { className: 'grid grid-cols-1 md:grid-cols-2 gap-4' },
                      React.createElement(
                        'div',
                        null,
                        React.createElement('label', { className: 'block text-xs text-gray-500 mb-1' }, 'Song Title'),
                        React.createElement('div', { className: 'relative' },
                          React.createElement('span', { className: 'absolute left-3 top-2.5 text-gray-400 pointer-events-none' }, '🎵'),
                          React.createElement('input', {
                            type: 'text',
                            value: scene.songTitle || '',
                            onChange: (e) => updateSoundField(actIndex, sceneIndex, 'songTitle', e.target.value),
                            className: 'w-full pl-9 pr-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500',
                            placeholder: 'Song title'
                          })
                        )
                      ),
                      scene.soundType !== 'Musical Number' && React.createElement(
                        'div',
                        null,
                        React.createElement('label', { className: 'block text-xs text-gray-500 mb-1' }, 'Artist'),
                        React.createElement('div', { className: 'relative' },
                          React.createElement('span', { className: 'absolute left-3 top-2.5 text-gray-400 pointer-events-none' }, '🎤'),
                          React.createElement('input', {
                            type: 'text',
                            value: scene.artist || '',
                            onChange: (e) => updateSoundField(actIndex, sceneIndex, 'artist', e.target.value),
                            className: 'w-full pl-9 pr-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500',
                            placeholder: 'Artist name'
                          })
                        )
                      )
                    ),
                    React.createElement(
                      'div',
                      { className: 'grid grid-cols-1 md:grid-cols-2 gap-4' },
                      React.createElement(
                        'div',
                        null,
                        React.createElement('label', { className: 'block text-xs text-gray-500 mb-1' }, 'Duration'),
                        React.createElement('div', { className: 'relative' },
                          React.createElement('span', { className: 'absolute left-3 top-2.5 text-gray-400 pointer-events-none' }, '⏱️'),
                          React.createElement('input', {
                            type: 'text',
                            value: scene.duration || '',
                            onChange: (e) => updateSoundField(actIndex, sceneIndex, 'duration', e.target.value),
                            className: 'w-full pl-9 pr-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500',
                            placeholder: 'e.g., 3:45'
                          })
                        )
                      ),
                      React.createElement(
                        'div',
                        null,
                        React.createElement('label', { className: 'block text-xs text-gray-500 mb-1' }, 'Sound Type'),
                        React.createElement('div', { className: 'relative' },
                          React.createElement('span', { className: 'absolute left-3 top-2.5 text-gray-400 pointer-events-none z-10' }, '🔊'),
                          React.createElement(
                            'select',
                            {
                              value: scene.soundType || '',
                              onChange: (e) => updateSoundField(actIndex, sceneIndex, 'soundType', e.target.value),
                              className: 'w-full pl-9 pr-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white appearance-none'
                            },
                            React.createElement('option', { value: '' }, 'Select type...'),
                            soundTypeOptions.map(opt => React.createElement('option', { key: opt.value, value: opt.value }, opt.label))
                          )
                        )
                      )
                    ),
                    (scene.soundType || '').toLowerCase().includes('musical number')
                      ? React.createElement(
                          'div',
                          { className: 'pt-3', style: { borderTop: '1px solid var(--color-border)' } },
                          React.createElement(
                            'div',
                            { className: 'text-xs font-semibold uppercase tracking-wide mb-2', style: { color: 'var(--color-text-muted)' } },
                            '🎭 Performers'
                          ),
                          (() => {
                            const castCharacters = (localProduction?.characters || []).map(c => c.name).filter(Boolean);
                            const displayPerformers = scene.fullCompany
                              ? (scene.musicalCharacters?.length > 0 ? scene.musicalCharacters : castCharacters)
                              : (scene.musicalCharacters || []);
                            return React.createElement(
                              React.Fragment,
                              null,
                              scene.fullCompany && React.createElement(
                                'div',
                                { className: 'mb-2' },
                                React.createElement(
                                  'span',
                                  {
                                    className: 'text-xs px-2 py-0.5 rounded-full',
                                    style: { backgroundColor: 'var(--color-primary-surface)', color: 'var(--color-primary)', border: '1px solid var(--color-primary)' }
                                  },
                                  '🎭 Full Company'
                                )
                              ),
                              displayPerformers.length === 0
                                ? React.createElement('p', { className: 'text-sm', style: { color: 'var(--color-text-muted)' } }, 'No performers assigned')
                                : React.createElement(
                                    'div',
                                    { className: 'rounded-lg overflow-hidden', style: { border: '1px solid var(--color-border)' } },
                                    React.createElement(
                                      'div',
                                      {
                                        className: 'grid text-xs font-semibold uppercase tracking-wide px-3 py-2',
                                        style: { gridTemplateColumns: '1fr 70px 90px 1fr', backgroundColor: 'var(--color-bg-elevated)', color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border)' }
                                      },
                                      React.createElement('span', null, 'Character'),
                                      React.createElement('span', null, 'Mic #'),
                                      React.createElement('span', null, 'Level'),
                                      React.createElement('span', null, 'Custom')
                                    ),
                                    displayPerformers.map(char => {
                                      const mic = (scene.micAssignments || {})[char] || {};
                                      return React.createElement(
                                        'div',
                                        {
                                          key: char,
                                          className: 'grid px-3 py-2 items-center gap-2 text-sm',
                                          style: { gridTemplateColumns: '1fr 70px 90px 1fr', borderTop: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }
                                        },
                                        React.createElement('span', null, char),
                                        canEdit
                                          ? React.createElement('input', {
                                              type: 'number', min: '1', max: '99', placeholder: '—',
                                              value: mic.micNumber || '',
                                              onChange: (e) => updateMicAssignment(actIndex, sceneIndex, char, 'micNumber', e.target.value),
                                              className: 'w-full px-2 py-1 rounded text-sm text-center',
                                              style: { backgroundColor: 'var(--color-bg-elevated)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }
                                            })
                                          : React.createElement('span', { style: { color: mic.micNumber ? 'var(--color-text-primary)' : 'var(--color-text-muted)' } }, mic.micNumber || '—'),
                                        canEdit
                                          ? React.createElement('input', {
                                              type: 'text', placeholder: 'e.g. -6dB',
                                              value: mic.level || '',
                                              onChange: (e) => updateMicAssignment(actIndex, sceneIndex, char, 'level', e.target.value),
                                              className: 'w-full px-2 py-1 rounded text-sm',
                                              style: { backgroundColor: 'var(--color-bg-elevated)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }
                                            })
                                          : React.createElement('span', { style: { color: mic.level ? 'var(--color-text-primary)' : 'var(--color-text-muted)' } }, mic.level || '—'),
                                        canEdit
                                          ? React.createElement('input', {
                                              type: 'text', placeholder: 'Notes...',
                                              value: mic.custom || '',
                                              onChange: (e) => updateMicAssignment(actIndex, sceneIndex, char, 'custom', e.target.value),
                                              className: 'w-full px-2 py-1 rounded text-sm',
                                              style: { backgroundColor: 'var(--color-bg-elevated)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }
                                            })
                                          : React.createElement('span', { style: { color: mic.custom ? 'var(--color-text-primary)' : 'var(--color-text-muted)' } }, mic.custom || '—')
                                      );
                                    })
                                  )
                            );
                          })()
                        )
                      : null
                  )
                )
              )
            )
          : React.createElement('div', { className: 'p-4 text-center text-gray-500 text-sm' }, 'No scenes in this act')
        )
      )
    )
  );

  const getBudgetData = () => {
    const budget = window.budgetService?.getProductionBudget?.(production?.id);
    const dept = budget?.departments?.sound || {};
    return {
      allocated: parseFloat(dept.allocated) || 0,
      spent: parseFloat(dept.spent) || 0,
      itemCount: dept.items?.length || 0
    };
  };
  const soundBudget = getBudgetData();

  const budgetPanel = React.createElement(
    'div',
    { className: 'bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4' },
    React.createElement(
      'div',
      { className: 'flex items-center justify-between' },
      React.createElement(
        'div',
        null,
        React.createElement('h3', { className: 'font-semibold text-blue-900' }, '🎵 Sound Budget'),
        React.createElement('p', { className: 'text-sm text-blue-700' },
          soundBudget.itemCount + ' item' + (soundBudget.itemCount !== 1 ? 's' : '') + ' with cost data'
        )
      ),
      React.createElement(
        'div',
        { className: 'text-right' },
        React.createElement('div', { className: 'text-2xl font-bold text-blue-900' }, '$' + soundBudget.spent.toFixed(2)),
        React.createElement('div', { className: 'text-sm text-blue-700' },
          soundBudget.allocated > 0 ? 'of $' + soundBudget.allocated.toFixed(2) + ' allocated' : 'No budget allocated'
        )
      )
    ),
    soundBudget.allocated > 0 && React.createElement(
      'div',
      { className: 'mt-3' },
      React.createElement(
        'div',
        { className: 'w-full bg-blue-200 rounded-full h-2' },
        React.createElement('div', {
          className: 'h-2 rounded-full ' + (soundBudget.spent > soundBudget.allocated ? 'bg-red-500' : 'bg-blue-500'),
          style: { width: Math.min(100, (soundBudget.spent / soundBudget.allocated) * 100) + '%' }
        })
      ),
      React.createElement('div', { className: 'text-xs text-blue-700 mt-1' },
        soundBudget.spent > soundBudget.allocated
          ? 'Over budget'
          : '$' + (soundBudget.allocated - soundBudget.spent).toFixed(2) + ' remaining'
      )
    )
  );

  const ghostLightFeatures = [
    { title: '🎶 AI Cue Builder', desc: 'Generate sound cues from your script and scene data' },
    { title: '🎛️ Sound Design Suggester', desc: 'Get recommendations for sound design based on your production style' }
  ];

  const ghostLightPanel = React.createElement(
    'div',
    { style: { background: '#1a1a2e', borderRadius: '12px', padding: '32px', minHeight: '400px', position: 'relative', overflow: 'hidden' } },
    React.createElement('div', { style: { position: 'absolute', right: '24px', bottom: '24px', fontSize: '120px', opacity: 0.05, userSelect: 'none', lineHeight: 1, pointerEvents: 'none' } }, '🕯️'),
    React.createElement('div', { style: { marginBottom: '32px' } },
      React.createElement('img', { src: 'assets/ghostlight/ghostlight-brand.png', alt: 'GhostLight', style: { height: '72px', objectFit: 'contain', marginBottom: '8px' } }),
      React.createElement('p', { style: { color: '#9b8fa8', fontSize: '14px', margin: '0' } }, 'AI-powered tools for theatre professionals — coming soon')
    ),
    React.createElement(
      'div',
      { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px' } },
      ghostLightFeatures.map((feature, i) =>
        React.createElement('div', { key: i, style: { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '24px', position: 'relative' } },
          React.createElement('h3', { style: { fontSize: '15px', fontWeight: '600', color: '#f5f0e8', marginBottom: '8px', marginTop: '0', paddingRight: '32px' } }, feature.title),
          React.createElement('p', { style: { fontSize: '13px', color: '#9b8fa8', lineHeight: '1.5', marginBottom: '16px', marginTop: '0' } }, feature.desc),
          React.createElement('span', { style: { display: 'inline-block', padding: '3px 10px', background: 'rgba(147,97,255,0.15)', border: '1px solid rgba(147,97,255,0.35)', borderRadius: '20px', fontSize: '11px', fontWeight: '500', color: '#b78aff', letterSpacing: '0.5px' } }, 'Coming Soon'),
          React.createElement('img', { src: 'assets/ghostlight/ghostlight-brand.png', alt: '', style: { position: 'absolute', bottom: '10px', right: '10px', height: '28px', objectFit: 'contain', opacity: 0.12 } })
        )
      )
    )
  );

  const tabNav = React.createElement(
    'div',
    { style: { display: 'flex', gap: '4px', marginBottom: '20px', borderBottom: '2px solid #e5e7eb' } },
    React.createElement('button', { onClick: () => setActiveTab('sound'), style: { padding: '8px 16px', fontSize: '14px', fontWeight: '500', borderRadius: '6px 6px 0 0', border: 'none', cursor: 'pointer', background: 'transparent', color: activeTab === 'sound' ? '#7c3aed' : '#6b7280', borderBottom: activeTab === 'sound' ? '2px solid #7c3aed' : '2px solid transparent', marginBottom: '-2px' } }, '🔊 Sound Design'),
    React.createElement('button', { onClick: () => setActiveTab('ghost_light'), style: { padding: '8px 16px', fontSize: '14px', fontWeight: '500', borderRadius: '6px 6px 0 0', border: 'none', cursor: 'pointer', background: 'transparent', color: activeTab === 'ghost_light' ? '#b78aff' : '#6b7280', borderBottom: activeTab === 'ghost_light' ? '2px solid #9361ff' : '2px solid transparent', marginBottom: '-2px' } }, React.createElement('span', { style: { background: '#0d0d0d', padding: '4px 10px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center' } }, React.createElement('img', { src: 'assets/ghostlight/ghostlight-brand.png', alt: 'GhostLight', style: { height: '24px', objectFit: 'contain', filter: 'brightness(1)' } })))
  );

  return React.createElement(
    'div',
    null,
    tabNav,
    activeTab === 'ghost_light'
      ? ghostLightPanel
      : React.createElement('div', null, budgetPanel, header, actsList)
  );
}

window.SoundDepartmentView = SoundDepartmentView;
