const { useState, useEffect } = React;

function SoundDepartmentView({ production, onUpdateScene }) {
  const [expandedActs, setExpandedActs] = useState({});
  const soundTypeOptions = [
    'Underscore',
    'Incidental Music',
    'Diegetic / Onstage',
    'Atmosphere / Ambience',
    'Stinger / Button',
    'Effect (SFX)'
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
    console.log('=== UPDATE SOUND FIELD ===');
    console.log('Act Index:', actIndex, 'Scene Index:', sceneIndex);
    console.log('Field:', field);
    console.log('New Value:', value);

    onUpdateScene?.(actIndex, sceneIndex, field, value);
  };

  if (!production?.acts?.length) {
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
        (production.acts.reduce((sum, act) => sum + (act.scenes?.filter(s => s.songTitle || s.artist || s.duration || s.soundType)?.length || 0), 0))
        + ' scenes have sound data'
      )
    )
  );

  const actsList = React.createElement(
    'div',
    { className: 'space-y-4' },
    production.acts.map((act, actIndex) =>
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
                    scene.name && React.createElement('span', { className: 'text-sm font-medium text-gray-800' }, scene.name)
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
                      React.createElement(
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
                            soundTypeOptions.map(option => React.createElement('option', { key: option, value: option }, option))
                          )
                        )
                      )
                    )
                  )
                )
              )
            )
          : React.createElement('div', { className: 'p-4 text-center text-gray-500 text-sm' }, 'No scenes in this act')
        )
      )
    )
  );

  const calculateSoundBudget = () => {
    let totalCost = 0;
    let itemCount = 0;
    if (production?.acts) {
      production.acts.forEach(act => {
        act.scenes?.forEach(scene => {
          scene.sound?.items?.forEach(item => {
            if (item.cost) { totalCost += parseFloat(item.cost) || 0; itemCount++; }
          });
        });
      });
    }
    return { totalCost, itemCount };
  };
  const soundBudget = calculateSoundBudget();
  const soundAllocated = parseFloat(production?.soundBudget) || 0;

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
        React.createElement('div', { className: 'text-2xl font-bold text-blue-900' }, '$' + soundBudget.totalCost.toFixed(2)),
        React.createElement('div', { className: 'text-sm text-blue-700' },
          soundAllocated > 0 ? 'of $' + soundAllocated.toFixed(2) + ' allocated' : 'No budget allocated'
        )
      )
    ),
    soundAllocated > 0 && React.createElement(
      'div',
      { className: 'mt-3' },
      React.createElement(
        'div',
        { className: 'w-full bg-blue-200 rounded-full h-2' },
        React.createElement('div', {
          className: 'h-2 rounded-full ' + (soundBudget.totalCost > soundAllocated ? 'bg-red-500' : 'bg-blue-500'),
          style: { width: Math.min(100, (soundBudget.totalCost / soundAllocated) * 100) + '%' }
        })
      ),
      React.createElement('div', { className: 'text-xs text-blue-700 mt-1' },
        soundBudget.totalCost > soundAllocated
          ? 'Over budget'
          : '$' + (soundAllocated - soundBudget.totalCost).toFixed(2) + ' remaining'
      )
    )
  );

  return React.createElement('div', null, budgetPanel, header, actsList);
}

window.SoundDepartmentView = SoundDepartmentView;
