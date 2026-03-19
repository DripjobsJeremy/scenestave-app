const { useState, useEffect } = React;
const { Link } = window.ReactRouterDOM || {};

const getPerformanceDatesDisplay = (production) => {
  const showEvents = (production.calendar || []).filter(e =>
    e.type === 'show' || e.type === 'performance'
  );
  if (showEvents.length === 0) return 'No shows scheduled';

  const sorted = showEvents
    .map(e => new Date(e.start || e.date))
    .filter(d => !isNaN(d))
    .sort((a, b) => a - b);

  if (sorted.length === 0) return 'No shows scheduled';
  if (sorted.length === 1)
    return sorted[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  if (first.getMonth() === last.getMonth() && first.getFullYear() === last.getFullYear())
    return `${first.toLocaleDateString('en-US', { month: 'short' })} ${first.getDate()}–${last.getDate()}, ${first.getFullYear()}`;

  return `${first.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${last.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
};

const getRehearsalDatesDisplay = (production) => {
  const rehearsals = (production.calendar || []).filter(e => e.type === 'rehearsal');
  if (rehearsals.length === 0) return 'Not scheduled';

  const sorted = rehearsals
    .map(e => new Date(e.start || e.date))
    .filter(d => !isNaN(d))
    .sort((a, b) => a - b);

  if (sorted.length === 0) return 'Not scheduled';
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  return `${first.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${last.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} (${rehearsals.length} sessions)`;
};

const ProductionsView = () => {
  const [productions, setProductions] = useState([]);
  const [activeProductionId, setActiveProductionId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProduction, setEditingProduction] = useState(null);
  const [showBudgetManager, setShowBudgetManager] = useState(false);
  const [budgetProduction, setBudgetProduction] = useState(null);

  const loadProductions = () => {
    const allProductions = window.productionsService.getAll();
    setProductions(allProductions);
    setActiveProductionId(window.productionsService.getActive());
  };

  useEffect(() => {
    loadProductions();
  }, []);

  const handleSetActive = (productionId) => {
    window.productionsService.setActive(productionId);
    setActiveProductionId(productionId);
  };

  const handleProductionCreated = (_newProduction) => {
    loadProductions();
  };

  const handleSaveProduction = (updated) => {
    updated.updatedAt = new Date().toISOString();
    const allProductions = JSON.parse(localStorage.getItem('showsuite_productions') || '[]');
    const idx = allProductions.findIndex(p => p.id === updated.id);
    if (idx >= 0) {
      allProductions[idx] = updated;
    } else {
      allProductions.push(updated);
    }
    localStorage.setItem('showsuite_productions', JSON.stringify(allProductions));
    loadProductions();
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return diffMins + ' min ago';
    if (diffHours < 24) return diffHours + ' hour' + (diffHours > 1 ? 's' : '') + ' ago';
    if (diffDays < 30) return diffDays + ' day' + (diffDays > 1 ? 's' : '') + ' ago';
    return formatDate(dateString);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Planning': return 'bg-blue-100 text-blue-800';
      case 'In Rehearsal': return 'bg-yellow-100 text-yellow-800';
      case 'Active': return 'bg-green-100 text-green-800';
      case 'Completed': return 'bg-purple-100 text-purple-800';
      case 'Archived': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const header = React.createElement(
    'div',
    { className: 'flex justify-between items-center mb-6' },
    React.createElement(
      'div',
      null,
      React.createElement('h1', { className: 'text-3xl font-bold text-gray-900' }, 'Productions'),
      React.createElement('p', { className: 'text-gray-600 mt-1' }, 'Manage your theatre productions')
    ),
    React.createElement(
      'button',
      {
        onClick: () => setShowCreateModal(true),
        className: 'px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 flex items-center gap-2'
      },
      React.createElement('span', { className: 'text-xl leading-none' }, '+'),
      'Create New Production'
    )
  );

  

  const emptyState = React.createElement(
    'div',
    { className: 'text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300' },
    React.createElement('p', { className: 'text-gray-600 mb-4' }, 'No productions yet'),
    React.createElement(
      'button',
      {
        onClick: () => setShowCreateModal(true),
        className: 'px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700'
      },
      'Create Your First Production'
    )
  );

  const descriptionStyle = {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical'
  };

  const grid = React.createElement(
    'div',
    { className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' },
    productions.map((production) => {
      const isActive = production.id === activeProductionId;

      const title = React.createElement(
        'h3',
        { className: 'text-xl font-bold text-gray-900 mb-2' },
        production.title
      );

      const director = production.director
        ? React.createElement(
            'p',
            { className: 'text-gray-600 mb-3' },
            'Director: ',
            production.director
          )
        : null;

      const dates = React.createElement(
        'div',
        { className: 'text-sm text-gray-500 mb-3 space-y-1' },
        React.createElement('p', null, '🎭 Rehearsals: ', getRehearsalDatesDisplay(production)),
        React.createElement('p', null, '🎬 Shows: ', getPerformanceDatesDisplay(production))
      );

      const venue = production.venue
        ? React.createElement(
            'p',
            { className: 'text-sm text-gray-600 mb-3' },
            '📍 ',
            production.venue
          )
        : null;

      const description = production.description
        ? React.createElement(
            'p',
            { className: 'text-sm text-gray-600 mb-4', style: descriptionStyle },
            production.description
          )
        : null;

      const footer = React.createElement(
        'div',
        { className: 'flex items-center justify-between pt-4 border-t border-gray-200' },
        React.createElement(
          'span',
          { className: 'px-2 py-1 text-xs font-semibold rounded ' + getStatusColor(production.status) },
          production.status
        ),
        React.createElement('span', { className: 'text-xs text-gray-500' }, 'Updated ', getTimeAgo(production.updatedAt))
      );

      const activeBadge = isActive
        ? React.createElement(
            'div',
            { className: 'mb-3' },
            React.createElement(
              'span',
              { className: 'inline-block px-2 py-1 bg-violet-100 text-violet-700 text-xs font-semibold rounded' },
              'ACTIVE PRODUCTION'
            )
          )
        : null;
      
      const editButton = React.createElement(
        Link,
        {
          to: '/productions/' + production.id,
          onClick: (e) => e.stopPropagation(),
          className: 'flex-1 px-3 py-2 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 block text-center'
        },
        'Edit Scenes'
      );

      const editDetailsButton = React.createElement(
        'button',
        {
          onClick: (e) => {
            e.stopPropagation();
            setEditingProduction(production);
            setShowEditModal(true);
          },
          className: 'px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded border border-gray-300',
          title: 'Edit production title and dates'
        },
        '✏️ Details'
      );

      const budgetButton = React.createElement(
        'button',
        {
          onClick: (e) => {
            e.stopPropagation();
            console.log('🔘 Budget button clicked for:', production.id, production.title);
            console.log('🔘 window.ProductionBudgetManager:', window.ProductionBudgetManager);
            setBudgetProduction(production);
            console.log('🔘 Setting showBudgetManager: true');
            setShowBudgetManager(true);
            console.log('🔘 State should be updated');
          },
          className: 'px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition-colors'
        },
        '💰 Budget'
      );

      return React.createElement(
        'div',
        {
          key: production.id,
          onClick: () => handleSetActive(production.id),
          className:
            'bg-white rounded-lg border-2 p-6 cursor-pointer transition-all hover:shadow-lg ' +
            (isActive ? 'border-violet-500 shadow-md' : 'border-gray-200 hover:border-gray-300')
        },
        activeBadge,
        title,
        director,
        dates,
        venue,
        description,
        footer,
        React.createElement('div', { className: 'flex gap-2 mt-3' }, editDetailsButton, editButton, budgetButton)
      );
    })
  );

  const createModal = showCreateModal
    ? React.createElement(CreateProductionModal, {
        isOpen: showCreateModal,
        onClose: () => setShowCreateModal(false),
        onSuccess: handleProductionCreated
      })
    : null;

  const editModal = showEditModal && editingProduction
    ? React.createElement(EditProductionModal, {
        production: editingProduction,
        onSave: (updated) => {
          handleSaveProduction(updated);
          setShowEditModal(false);
          setEditingProduction(null);
        },
        onClose: () => {
          setShowEditModal(false);
          setEditingProduction(null);
        }
      })
    : null;

  if (showBudgetManager) {
    console.log('🎯 budgetManagerModal check — budgetProduction:', budgetProduction?.id, '| window.ProductionBudgetManager:', window.ProductionBudgetManager);
  }

  const budgetManagerModal = (showBudgetManager && budgetProduction && window.ProductionBudgetManager)
    ? React.createElement(window.ProductionBudgetManager, {
        production: budgetProduction,
        onClose: () => { setShowBudgetManager(false); setBudgetProduction(null); },
        onSave: () => {
          setShowBudgetManager(false);
          setBudgetProduction(null);
          if (window.showToast) window.showToast('✅ Budget saved successfully', 'success');
        }
      })
    : null;

  return React.createElement('div', { className: 'p-6' }, header, productions.length === 0 ? emptyState : grid, createModal, editModal, budgetManagerModal);
};

window.ProductionsView = ProductionsView;

function EditProductionModal({ production, onSave, onClose }) {
  const [title, setTitle] = useState(production.title || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) { alert('Title is required'); return; }
    onSave({ ...production, title: title.trim() });
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-gray-900 mb-5">Edit Production Details</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Production Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
              placeholder="e.g., TOOTSIE"
              autoFocus
              required
            />
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700">
              💡 Rehearsal and show dates are calculated automatically from events in the Calendar tab.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
