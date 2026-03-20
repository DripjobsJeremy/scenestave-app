const { useState, useEffect } = React;

// Lighting Department View - displays and manages lighting data for all scenes
function LightingView({ production, onUpdateScene }) {
  const [expandedActs, setExpandedActs] = useState({});

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
  }, [production?.id]);

  // Handle updating lighting fields
  const handleLightingUpdate = (actIndex, sceneIndex, field, value) => {
    onUpdateScene?.(actIndex, sceneIndex, field, value);
  };

  if (!production?.acts?.length) {
    return React.createElement(
      'div',
      { className: 'text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300' },
      React.createElement('p', { className: 'text-gray-500 text-lg mb-2' }, '💡 Lighting Department'),
      React.createElement('p', { className: 'text-gray-400 text-sm' }, 'No scenes have been created yet.'),
      React.createElement('p', { className: 'text-gray-400 text-sm' }, 'Add acts and scenes in the Scenes tab first.')
    );
  }

  // Summary stats
  const totalScenes = production.acts.reduce((sum, act) => sum + (act.scenes?.length || 0), 0);
  const scenesWithLighting = production.acts.reduce((sum, act) => 
    sum + (act.scenes?.filter(s => s.lightingMood || s.lightingColor || s.lightingCue)?.length || 0), 0
  );

  const header = React.createElement(
    'div',
    { className: 'flex items-center justify-between mb-6' },
    React.createElement(
      'div',
      null,
      React.createElement('h3', { className: 'text-lg font-semibold text-gray-900' }, '💡 Lighting Design'),
      React.createElement('p', { className: 'text-sm text-gray-500' }, 'Manage lighting mood, color, and cues for each scene')
    ),
    React.createElement(
      'div',
      { className: 'text-right' },
      React.createElement('p', { className: 'text-sm font-medium text-gray-700' }, scenesWithLighting + ' / ' + totalScenes + ' scenes'),
      React.createElement('p', { className: 'text-xs text-gray-500' }, 'have lighting data')
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
                    React.createElement(
                      'span',
                      { className: 'px-2 py-1 bg-violet-100 text-violet-700 text-xs font-medium rounded' },
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
                      scene.name
                    ),
                    // Character count
                    scene.characterIds?.length > 0 && React.createElement(
                      'span',
                      { className: 'text-xs text-gray-500' },
                      '(' + scene.characterIds.length + ' characters)'
                    )
                  ),
                  // Lighting fields
                  React.createElement(
                    'div',
                    { className: 'grid grid-cols-1 md:grid-cols-4 gap-3' },
                    // Cue Number
                    React.createElement(
                      'div',
                      null,
                      React.createElement('label', { className: 'block text-xs text-gray-500 mb-1' }, 'Cue #'),
                      React.createElement('input', {
                        type: 'text',
                        value: scene.lightingCue || '',
                        onChange: (e) => handleLightingUpdate(actIndex, sceneIndex, 'lightingCue', e.target.value),
                        className: 'w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500',
                        placeholder: 'e.g., LX 1'
                      })
                    ),
                    // Mood
                    React.createElement(
                      'div',
                      null,
                      React.createElement('label', { className: 'block text-xs text-gray-500 mb-1' }, 'Mood'),
                      React.createElement('input', {
                        type: 'text',
                        value: scene.lightingMood || '',
                        onChange: (e) => handleLightingUpdate(actIndex, sceneIndex, 'lightingMood', e.target.value),
                        className: 'w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500',
                        placeholder: 'e.g., warm, dramatic'
                      })
                    ),
                    // Color
                    React.createElement(
                      'div',
                      null,
                      React.createElement('label', { className: 'block text-xs text-gray-500 mb-1' }, 'Color'),
                      React.createElement('input', {
                        type: 'text',
                        value: scene.lightingColor || '',
                        onChange: (e) => handleLightingUpdate(actIndex, sceneIndex, 'lightingColor', e.target.value),
                        className: 'w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500',
                        placeholder: 'e.g., amber, blue wash'
                      })
                    ),
                    // Intensity
                    React.createElement(
                      'div',
                      null,
                      React.createElement('label', { className: 'block text-xs text-gray-500 mb-1' }, 'Intensity'),
                      React.createElement('input', {
                        type: 'text',
                        value: scene.lightingIntensity || '',
                        onChange: (e) => handleLightingUpdate(actIndex, sceneIndex, 'lightingIntensity', e.target.value),
                        className: 'w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500',
                        placeholder: 'e.g., 80%, full'
                      })
                    )
                  ),
                  // Lighting notes
                  React.createElement(
                    'div',
                    { className: 'mt-3' },
                    React.createElement('label', { className: 'block text-xs text-gray-500 mb-1' }, 'Lighting Notes'),
                    React.createElement('textarea', {
                      value: scene.lightingNotes || '',
                      onChange: (e) => handleLightingUpdate(actIndex, sceneIndex, 'lightingNotes', e.target.value),
                      className: 'w-full px-3 py-2 border border-gray-300 rounded text-sm resize-y focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500',
                      rows: 2,
                      placeholder: 'Special instructions, transitions, effects...'
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
  );

  const getBudgetData = () => {
    const budget = window.budgetService?.getProductionBudget?.(production?.id);
    const dept = budget?.departments?.lighting || {};
    return {
      allocated: parseFloat(dept.allocated) || 0,
      spent: parseFloat(dept.spent) || 0,
      itemCount: dept.items?.length || 0
    };
  };
  const lightingBudget = getBudgetData();

  const budgetPanel = React.createElement(
    'div',
    { className: 'bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4' },
    React.createElement(
      'div',
      { className: 'flex items-center justify-between' },
      React.createElement(
        'div',
        null,
        React.createElement('h3', { className: 'font-semibold text-amber-900' }, '💡 Lighting Budget'),
        React.createElement('p', { className: 'text-sm text-amber-700' },
          lightingBudget.itemCount + ' fixture' + (lightingBudget.itemCount !== 1 ? 's' : '') + ' with cost data'
        )
      ),
      React.createElement(
        'div',
        { className: 'text-right' },
        React.createElement('div', { className: 'text-2xl font-bold text-amber-900' }, '$' + lightingBudget.spent.toFixed(2)),
        React.createElement('div', { className: 'text-sm text-amber-700' },
          lightingBudget.allocated > 0 ? 'of $' + lightingBudget.allocated.toFixed(2) + ' allocated' : 'No budget allocated'
        )
      )
    ),
    lightingBudget.allocated > 0 && React.createElement(
      'div',
      { className: 'mt-3' },
      React.createElement(
        'div',
        { className: 'w-full bg-amber-200 rounded-full h-2' },
        React.createElement('div', {
          className: 'h-2 rounded-full ' + (lightingBudget.spent > lightingBudget.allocated ? 'bg-red-500' : 'bg-amber-500'),
          style: { width: Math.min(100, (lightingBudget.spent / lightingBudget.allocated) * 100) + '%' }
        })
      ),
      React.createElement('div', { className: 'text-xs text-amber-700 mt-1' },
        lightingBudget.spent > lightingBudget.allocated
          ? 'Over budget'
          : '$' + (lightingBudget.allocated - lightingBudget.spent).toFixed(2) + ' remaining'
      )
    )
  );

  return React.createElement(
    'div',
    null,
    budgetPanel,
    header,
    actsList
  );
}

window.LightingView = LightingView;
