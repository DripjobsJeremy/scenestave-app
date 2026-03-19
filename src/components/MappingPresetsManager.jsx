(function (global) {
  'use strict';

  const { React } = global;
  const { useState, useEffect } = React;

  const MappingPresetsManager = () => {
    const [presets, setPresets] = useState([]);

    const svc = global.mappingPresetsService;

    const formatDate = (dateString) => {
      if (!dateString) return '—';
      try {
        const d = new Date(dateString);
        return d.toLocaleString('en-US', {
          year: 'numeric', month: 'short', day: 'numeric',
          hour: 'numeric', minute: '2-digit'
        });
      } catch {
        return dateString;
      }
    };

    const loadPresets = () => {
      try {
        setPresets((svc && svc.loadMappingPresets()) || []);
      } catch (e) {
        console.error('Failed to load presets', e);
        setPresets([]);
      }
    };

    useEffect(() => {
      loadPresets();
    }, []);

    const handleDelete = (presetId) => {
      if (!svc) return;
      if (confirm('Delete this preset?')) {
        svc.deleteMappingPreset(presetId);
        loadPresets();
      }
    };

    return (
      React.createElement('div', { className: 'presets-manager bg-white text-gray-800 rounded-lg p-4' },
        React.createElement('h3', { className: 'font-semibold mb-3 text-gray-900' }, 'Saved Field Mapping Presets'),
        presets.length === 0
          ? React.createElement('p', { className: 'text-gray-500 text-sm' }, 'No saved presets yet')
          : React.createElement('div', { className: 'presets-list space-y-2' },
              presets.map(preset => (
                React.createElement('div', { key: preset.id, className: 'preset-item border rounded p-3 hover:bg-gray-50' },
                  React.createElement('div', { className: 'flex items-start justify-between' },
                    React.createElement('div', null,
                      React.createElement('p', { className: 'font-medium' }, preset.name || 'Untitled Preset'),
                      preset.description && React.createElement('p', { className: 'text-sm text-gray-600' }, preset.description),
                      React.createElement('p', { className: 'text-xs text-gray-500 mt-1' },
                        `Used ${preset.useCount || 0} times • Last used ${formatDate(preset.lastUsed)}`
                      )
                    ),
                    React.createElement('button', { onClick: () => handleDelete(preset.id), className: 'text-red-600 hover:underline text-sm' }, 'Delete')
                  )
                )
              ))
            )
      )
    );
  };

  global.MappingPresetsManager = MappingPresetsManager;
})(window);
