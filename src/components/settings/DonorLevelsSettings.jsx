/**
 * Donor Levels Settings Component
 * Comprehensive interface for managing donor level tiers.
 * Features: CRUD operations, drag-and-drop reordering, inline editing, validation.
 */
(function (global) {
  'use strict';

  const { React } = global;
  const { useState, useEffect } = React;

  /**
   * LevelForm Component
   * Reusable form for adding/editing donor levels
   */
  const LevelForm = ({ level, onSave, onCancel }) => {
    const [formData, setFormData] = useState(level);
    const [errors, setErrors] = useState({});

    const handleSubmit = (e) => {
      e.preventDefault();

      // Validate
      const validationErrors = {};

      if (!formData.name || formData.name.trim().length < 2) {
        validationErrors.name = 'Name must be at least 2 characters';
      }

      if (formData.minAmount < 0) {
        validationErrors.minAmount = 'Minimum amount cannot be negative';
      }

      if (formData.maxAmount !== null && formData.maxAmount !== '' && formData.maxAmount < formData.minAmount) {
        validationErrors.maxAmount = 'Maximum must be greater than minimum';
      }

      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        return;
      }

      onSave(formData);
      setErrors({});
    };

    return React.createElement(
      'form',
      {
        onSubmit: handleSubmit,
        className: 'level-form grid grid-cols-4 gap-3'
      },
      // Level Name
      React.createElement('div', { className: 'col-span-1' },
        React.createElement('label', { className: 'block text-sm font-medium mb-1 text-gray-900' },
          'Level Name*'
        ),
        React.createElement('input', {
          type: 'text',
          value: formData.name,
          onChange: (e) => setFormData({ ...formData, name: e.target.value }),
          className: 'w-full border border-gray-300 bg-white text-gray-900 rounded px-3 py-2',
          placeholder: 'e.g., Patron',
          required: true
        }),
        errors.name && React.createElement('p', { className: 'text-xs text-red-600 mt-1' }, errors.name)
      ),

      // Min Amount
      React.createElement('div', { className: 'col-span-1' },
        React.createElement('label', { className: 'block text-sm font-medium mb-1' },
          'Min Amount*'
        ),
        React.createElement('div', { className: 'relative' },
          React.createElement('span', { className: 'absolute left-3 top-2 text-gray-600' }, '$'),
          React.createElement('input', {
            type: 'number',
            value: formData.minAmount,
            onChange: (e) => setFormData({ ...formData, minAmount: parseFloat(e.target.value) || 0 }),
            className: 'w-full border border-gray-300 bg-white text-gray-900 rounded px-3 py-2 pl-7',
            min: '0',
            step: '0.01',
            required: true
          })
        ),
        errors.minAmount && React.createElement('p', { className: 'text-xs text-red-600 mt-1' }, errors.minAmount)
      ),

      // Max Amount
      React.createElement('div', { className: 'col-span-1' },
        React.createElement('label', { className: 'block text-sm font-medium mb-1' },
          'Max Amount'
        ),
        React.createElement('div', { className: 'relative' },
          React.createElement('span', { className: 'absolute left-3 top-2 text-gray-600' }, '$'),
          React.createElement('input', {
            type: 'number',
            value: formData.maxAmount || '',
            onChange: (e) => setFormData({
              ...formData,
              maxAmount: e.target.value ? parseFloat(e.target.value) : null
            }),
            className: 'w-full border border-gray-300 bg-white text-gray-900 rounded px-3 py-2 pl-7',
            min: '0',
            step: '0.01',
            placeholder: 'No limit'
          })
        ),
        errors.maxAmount && React.createElement('p', { className: 'text-xs text-red-600 mt-1' }, errors.maxAmount)
      ),

      // Action Buttons
      React.createElement('div', { className: 'col-span-1 flex items-end gap-2' },
        React.createElement('button', {
          type: 'submit',
          className: 'bg-violet-600 hover:bg-violet-700 text-gray-900 px-4 py-2 rounded flex-1'
        }, 'Save'),
        React.createElement('button', {
          type: 'button',
          onClick: onCancel,
          className: 'bg-gray-200 hover:bg-gray-100 text-gray-900 px-4 py-2 rounded flex-1'
        }, 'Cancel')
      ),

      // Benefits
      React.createElement('div', { className: 'col-span-4' },
        React.createElement('label', { className: 'block text-sm font-medium mb-1' },
          'Benefits'
        ),
        React.createElement('textarea', {
          value: formData.benefits || '',
          onChange: (e) => setFormData({ ...formData, benefits: e.target.value }),
          className: 'w-full border border-gray-300 bg-white text-gray-900 rounded px-3 py-2',
          rows: '2',
          placeholder: 'e.g., Name in program, 2 complimentary tickets'
        })
      ),

      // Active Checkbox
      React.createElement('div', { className: 'col-span-4' },
        React.createElement('label', { className: 'flex items-center' },
          React.createElement('input', {
            type: 'checkbox',
            checked: formData.active,
            onChange: (e) => setFormData({ ...formData, active: e.target.checked }),
            className: 'mr-2'
          }),
          React.createElement('span', { className: 'text-sm text-gray-900' },
            'Active (donors can be assigned to this level)'
          )
        )
      )
    );
  };

  /**
   * LevelRow Component
   * Individual row with view/edit modes
   */
  const LevelRow = ({
    level,
    index,
    isEditing,
    onEdit,
    onDelete,
    onSave,
    onCancel,
    onDragStart,
    onDragOver,
    onDrop,
    getDonorCountForLevel,
    formatCurrency
  }) => {
    const donorCount = getDonorCountForLevel(level.id);

    if (isEditing) {
      return React.createElement(
        'tr',
        { className: 'bg-gray-50' },
        React.createElement('td', { className: 'p-3' }, '✏️'),
        React.createElement('td', { colSpan: '6', className: 'p-3' },
          React.createElement(LevelForm, {
            level: level,
            onSave: onSave,
            onCancel: onCancel
          })
        )
      );
    }

    return React.createElement(
      'tr',
      {
        className: 'border-b border-gray-200 hover:bg-gray-50 cursor-move bg-white',
        draggable: true,
        onDragStart: onDragStart,
        onDragOver: onDragOver,
        onDrop: onDrop
      },
      // Drag handle
      React.createElement('td', { className: 'p-3 text-gray-600' },
        React.createElement('span', { className: 'cursor-move' }, '⋮⋮')
      ),

      // Level Name
      React.createElement('td', { className: 'p-3' },
        React.createElement('div', { className: 'flex items-center gap-2' },
          React.createElement('span', { className: 'font-medium text-gray-900' }, level.name),
          !level.active && React.createElement('span', {
            className: 'text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded'
          }, 'Inactive')
        )
      ),

      // Min Amount
      React.createElement('td', { className: 'p-3 text-gray-900' }, formatCurrency(level.minAmount)),

      // Max Amount
      React.createElement('td', { className: 'p-3 text-gray-900' },
        level.maxAmount !== null && level.maxAmount !== undefined
          ? formatCurrency(level.maxAmount)
          : 'No limit'
      ),

      // Benefits
      React.createElement('td', { className: 'p-3 text-sm text-gray-600' },
        level.benefits || '—'
      ),

      // Donor Count
      React.createElement('td', { className: 'p-3 text-center' },
        React.createElement('span', {
          className: 'inline-block px-2 py-1 bg-violet-900 text-violet-300 rounded text-sm'
        }, donorCount)
      ),

      // Actions
      React.createElement('td', { className: 'p-3 text-center' },
        React.createElement('div', { className: 'flex gap-2 justify-center' },
          React.createElement('button', {
            onClick: onEdit,
            className: 'text-violet-400 hover:underline text-sm'
          }, 'Edit'),
          React.createElement('button', {
            onClick: onDelete,
            className: `text-red-400 hover:underline text-sm ${donorCount > 0 ? 'opacity-50 cursor-not-allowed' : ''}`,

            disabled: donorCount > 0,
            title: donorCount > 0 ? 'Cannot delete level with active donors' : ''
          }, 'Delete')
        )
      )
    );
  };

  /**
   * Main DonorLevelsSettings Component
   */
  const DonorLevelsSettings = () => {
    const [levels, setLevels] = useState([]);
    const [editingLevel, setEditingLevel] = useState(null);
    const [isAddingNew, setIsAddingNew] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [draggedItem, setDraggedItem] = useState(null);

    const donorLevelsService = global.DonorLevelsService;
    const donorCalculationService = global.donorCalculationService;
    const contactsService = global.contactsService;

    useEffect(() => {
      loadLevels();
    }, []);

    const loadLevels = () => {
      if (donorLevelsService) {
        const loadedLevels = donorLevelsService.loadDonorLevels();
        // Sort by displayOrder
        loadedLevels.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
        setLevels(loadedLevels);
      }
    };

    const formatCurrency = (amount) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0
      }).format(amount || 0);
    };

    const getDonorCountForLevel = (levelId) => {
      if (!contactsService) return 0;
      const contacts = contactsService.loadContacts();
      return contacts.filter(c =>
        c.isDonor && c.donorProfile?.donorLevelId === levelId
      ).length;
    };

    const handleAddNew = () => {
      setIsAddingNew(true);
      setEditingLevel(null);
    };

    const handleEdit = (level) => {
      setEditingLevel(level);
      setIsAddingNew(false);
    };

    const handleSaveNew = (levelData) => {
      if (!donorLevelsService) {
        alert('Donor Levels Service not available');
        return;
      }

      const newLevel = donorLevelsService.addDonorLevel({
        ...levelData,
        displayOrder: levels.length + 1
      });

      setLevels([...levels, newLevel]);
      setIsAddingNew(false);
      setHasChanges(true);

      // Ask about recalculation
      recalculateAllDonors();
    };

    const handleSave = (levelData) => {
      if (!donorLevelsService || !editingLevel) return;

      donorLevelsService.updateDonorLevel(editingLevel.id, levelData);
      loadLevels();
      setEditingLevel(null);
      setHasChanges(true);

      // Ask about recalculation
      recalculateAllDonors();
    };

    const handleDelete = (levelId) => {
      const level = levels.find(l => l.id === levelId);
      const donorCount = getDonorCountForLevel(levelId);

      if (donorCount > 0) {
        alert(`Cannot delete "${level.name}" because ${donorCount} donors are currently assigned to this level.`);
        return;
      }

      if (confirm(`Delete "${level.name}" level?`)) {
        if (donorLevelsService) {
          donorLevelsService.deleteDonorLevel(levelId);
          loadLevels();
        }
      }
    };

    const recalculateAllDonors = () => {
      if (!donorCalculationService) return;

      const confirmed = confirm(
        'Recalculate all donor level assignments? This may take a moment.'
      );

      if (confirmed) {
        donorCalculationService.recalculateAllDonorProfiles();
        setHasChanges(false);
        alert('All donor levels have been recalculated!');
        loadLevels(); // Reload to show updated counts
      }
    };

    // Drag and drop handlers
    const handleDragStart = (index) => {
      setDraggedItem(index);
    };

    const handleDragOver = (e, index) => {
      e.preventDefault();
    };

    const handleDrop = (dropIndex) => {
      if (draggedItem === null) return;

      const reordered = [...levels];
      const [removed] = reordered.splice(draggedItem, 1);
      reordered.splice(dropIndex, 0, removed);

      // Update displayOrder for all levels
      reordered.forEach((level, index) => {
        level.displayOrder = index + 1;
      });

      if (donorLevelsService) {
        donorLevelsService.reorderDonorLevels(reordered);
      }

      setLevels(reordered);
      setDraggedItem(null);
    };

    return React.createElement(
      'div',
      { className: 'donor-levels-settings' },

      // Section Header
      React.createElement('div', { className: 'section-header mb-4 flex items-center justify-between' },
        React.createElement('div', null,
          React.createElement('h2', { className: 'text-xl font-bold mb-1 text-gray-900' }, 'Donor Levels Configuration'),
          React.createElement('p', { className: 'text-sm text-gray-600' },
            'Define giving levels and benefits for your donors'
          )
        ),
        React.createElement('button', {
          onClick: handleAddNew,
          className: 'bg-violet-600 hover:bg-violet-700 text-gray-900 px-4 py-2 rounded',
          'data-action': 'add-donor-level'
        }, '+ Add New Level')
      ),

      // Instructions
      React.createElement('div', { className: 'instructions mb-4 p-4 bg-gray-50 border border-gray-200 rounded' },
        React.createElement('p', { className: 'text-sm text-gray-900' },
          React.createElement('strong', null, '💡 How it works: '),
          'Donors are automatically assigned to levels based on their lifetime giving total. Drag levels to reorder them. Changes are saved automatically.'
        )
      ),

      // Levels Table
      React.createElement('div', { className: 'levels-table border border-gray-200 rounded-lg overflow-hidden bg-white' },
        React.createElement('table', { className: 'w-full' },
          React.createElement('thead', { className: 'bg-gray-50' },
            React.createElement('tr', null,
              React.createElement('th', { className: 'text-left p-3 w-8 text-gray-900' }),
              React.createElement('th', { className: 'text-left p-3 text-gray-900' }, 'Level Name'),
              React.createElement('th', { className: 'text-left p-3 text-gray-900' }, 'Min Amount'),
              React.createElement('th', { className: 'text-left p-3 text-gray-900' }, 'Max Amount'),
              React.createElement('th', { className: 'text-left p-3 text-gray-900' }, 'Benefits'),
              React.createElement('th', { className: 'text-center p-3 text-gray-900' }, 'Donors'),
              React.createElement('th', { className: 'text-center p-3 w-32 text-gray-900' }, 'Actions')
            )
          ),
          React.createElement('tbody', null,
            levels.length === 0
              ? React.createElement('tr', null,
                  React.createElement('td', {
                    colSpan: '7',
                    className: 'text-center py-8 text-gray-600'
                  }, 'No donor levels configured. Click "Add New Level" to get started.')
                )
              : levels.map((level, index) =>
                  React.createElement(LevelRow, {
                    key: level.id,
                    level: level,
                    index: index,
                    isEditing: editingLevel?.id === level.id,
                    onEdit: () => handleEdit(level),
                    onDelete: () => handleDelete(level.id),
                    onSave: handleSave,
                    onCancel: () => setEditingLevel(null),
                    onDragStart: () => handleDragStart(index),
                    onDragOver: (e) => handleDragOver(e, index),
                    onDrop: () => handleDrop(index),
                    getDonorCountForLevel: getDonorCountForLevel,
                    formatCurrency: formatCurrency
                  })
                )
          )
        )
      ),

      // Add New Level Form
      isAddingNew && React.createElement('div', { className: 'add-level-form mt-4 p-4 border border-gray-200 rounded bg-white' },
        React.createElement('h3', { className: 'font-semibold mb-3 text-gray-900' }, 'Add New Donor Level'),
        React.createElement(LevelForm, {
          level: {
            name: '',
            minAmount: 0,
            maxAmount: null,
            benefits: '',
            active: true
          },
          onSave: (levelData) => {
            handleSaveNew(levelData);
          },
          onCancel: () => setIsAddingNew(false)
        })
      ),

      // Impact Warning
      hasChanges && React.createElement('div', { className: 'warning-banner mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded' },
        React.createElement('p', { className: 'text-sm text-yellow-800' },
          React.createElement('strong', null, '⚠️ Note: '),
          'Changing level thresholds will recalculate all donor level assignments. This may take a moment.'
        )
      )
    );
  };

  // Export globally
  global.DonorLevelsSettings = DonorLevelsSettings;
})(window);
