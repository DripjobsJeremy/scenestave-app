/**
 * Campaigns Settings Component
 * Comprehensive interface for managing fundraising campaigns and funds.
 * Features: CRUD operations, filtering, progress tracking, status management.
 */
(function (global) {
  'use strict';

  const { React } = global;
  const { useState, useEffect } = React;

  /**
   * CampaignForm Component
   * Reusable form for adding/editing campaigns
   */
  const CampaignForm = ({ campaign, onSave, onCancel }) => {
    const [formData, setFormData] = useState(campaign);
    const [errors, setErrors] = useState({});

    const handleSubmit = (e) => {
      e.preventDefault();

      // Validate
      const validationErrors = {};

      if (!formData.name || formData.name.trim().length < 3) {
        validationErrors.name = 'Name must be at least 3 characters';
      }

      if (formData.startDate && formData.endDate) {
        if (new Date(formData.endDate) <= new Date(formData.startDate)) {
          validationErrors.endDate = 'End date must be after start date';
        }
      }

      if (formData.goalAmount !== null && formData.goalAmount !== '' && formData.goalAmount < 0) {
        validationErrors.goalAmount = 'Goal amount cannot be negative';
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
        className: 'campaign-form space-y-4'
      },
      // Name and Type row
      React.createElement('div', { className: 'grid grid-cols-2 gap-4' },
        React.createElement('div', { className: 'col-span-1' },
          React.createElement('label', { className: 'block text-sm font-medium mb-1 text-gray-900' },
            'Campaign Name*'
          ),
          React.createElement('input', {
            type: 'text',
            value: formData.name,
            onChange: (e) => setFormData({ ...formData, name: e.target.value }),
            className: 'w-full border border-gray-300 bg-white text-gray-900 rounded px-3 py-2',
            placeholder: 'e.g., Building Renovation Fund',
            required: true
          }),
          errors.name && React.createElement('p', { className: 'text-xs text-red-400 mt-1' }, errors.name)
        ),

        React.createElement('div', { className: 'col-span-1' },
          React.createElement('label', { className: 'block text-sm font-medium mb-1 text-gray-900' },
            'Campaign Type*'
          ),
          React.createElement('select', {
            value: formData.type || 'custom',
            onChange: (e) => setFormData({ ...formData, type: e.target.value }),
            className: 'w-full border border-gray-300 bg-white text-gray-900 rounded px-3 py-2',
            required: true
          },
            React.createElement('option', { value: 'general' }, 'General Operating Fund'),
            React.createElement('option', { value: 'building' }, 'Building/Capital Campaign'),
            React.createElement('option', { value: 'scholarship' }, 'Scholarship Fund'),
            React.createElement('option', { value: 'custom' }, 'Custom Campaign')
          )
        )
      ),

      // Description
      React.createElement('div', null,
        React.createElement('label', { className: 'block text-sm font-medium mb-1 text-gray-900' },
          'Description'
        ),
        React.createElement('textarea', {
          value: formData.description || '',
          onChange: (e) => setFormData({ ...formData, description: e.target.value }),
          className: 'w-full border border-gray-300 bg-white text-gray-900 rounded px-3 py-2',
          rows: '3',
          placeholder: 'Brief description of the campaign goals and purpose'
        })
      ),

      // Goal, Start Date, End Date row
      React.createElement('div', { className: 'grid grid-cols-3 gap-4' },
        React.createElement('div', null,
          React.createElement('label', { className: 'block text-sm font-medium mb-1 text-gray-900' },
            'Goal Amount'
          ),
          React.createElement('div', { className: 'relative' },
            React.createElement('span', { className: 'absolute left-3 top-2 text-gray-600' }, '$'),
            React.createElement('input', {
              type: 'number',
              value: formData.goalAmount || '',
              onChange: (e) => setFormData({
                ...formData,
                goalAmount: e.target.value ? parseFloat(e.target.value) : null
              }),
              className: 'w-full border border-gray-300 bg-white text-gray-900 rounded px-3 py-2 pl-7',
              min: '0',
              step: '0.01',
              placeholder: 'Optional'
            })
          ),
          errors.goalAmount && React.createElement('p', { className: 'text-xs text-red-400 mt-1' }, errors.goalAmount)
        ),

        React.createElement('div', null,
          React.createElement('label', { className: 'block text-sm font-medium mb-1 text-gray-900' },
            'Start Date'
          ),
          React.createElement('input', {
            type: 'date',
            value: formData.startDate || '',
            onChange: (e) => setFormData({ ...formData, startDate: e.target.value || null }),
            className: 'w-full border border-gray-300 bg-white text-gray-900 rounded px-3 py-2'
          })
        ),

        React.createElement('div', null,
          React.createElement('label', { className: 'block text-sm font-medium mb-1 text-gray-900' },
            'End Date'
          ),
          React.createElement('input', {
            type: 'date',
            value: formData.endDate || '',
            onChange: (e) => setFormData({ ...formData, endDate: e.target.value || null }),
            className: 'w-full border border-gray-300 bg-white text-gray-900 rounded px-3 py-2'
          }),
          errors.endDate && React.createElement('p', { className: 'text-xs text-red-400 mt-1' }, errors.endDate)
        )
      ),

      // Active checkbox
      React.createElement('div', null,
        React.createElement('label', { className: 'flex items-center' },
          React.createElement('input', {
            type: 'checkbox',
            checked: formData.active,
            onChange: (e) => setFormData({ ...formData, active: e.target.checked }),
            className: 'mr-2'
          }),
          React.createElement('span', { className: 'text-sm text-gray-900' },
            'Active (accepting donations)'
          )
        )
      ),

      // Action buttons
      React.createElement('div', { className: 'flex gap-2 justify-end' },
        React.createElement('button', {
          type: 'button',
          onClick: onCancel,
          className: 'bg-gray-200 hover:bg-gray-100 text-gray-900 px-4 py-2 rounded'
        }, 'Cancel'),
        React.createElement('button', {
          type: 'submit',
          className: 'bg-violet-600 hover:bg-violet-700 text-gray-900 px-4 py-2 rounded'
        }, 'Save Campaign')
      )
    );
  };

  /**
   * CampaignCard Component
   * Display individual campaign with stats and actions
   */
  const CampaignCard = ({ campaign, onEdit, onDelete, onToggleActive, donations, formatCurrency, formatDate }) => {
    const currentAmount = donations.reduce((sum, d) => sum + (d.amount || 0), 0);
    const progressPercent = campaign.goalAmount
      ? Math.min((currentAmount / campaign.goalAmount) * 100, 100)
      : 0;

    const isCompleted = campaign.endDate && new Date(campaign.endDate) < new Date();

    const getCampaignTypeColor = (type) => {
      const colors = {
        general: 'bg-gray-100 text-gray-700',
        building: 'bg-blue-900 text-blue-300',
        scholarship: 'bg-purple-900 text-purple-300',
        custom: 'bg-green-900 text-green-300'
      };
      return colors[type] || colors.custom;
    };

    const getCampaignTypeLabel = (type) => {
      const labels = {
        general: 'General Fund',
        building: 'Building',
        scholarship: 'Scholarship',
        custom: 'Custom'
      };
      return labels[type] || type;
    };

    return React.createElement(
      'div',
      {
        className: `campaign-card border border-gray-200 rounded-lg p-4 bg-white ${!campaign.active ? 'opacity-60' : ''}`
      },
      // Header
      React.createElement('div', { className: 'card-header mb-3' },
        React.createElement('div', { className: 'flex items-start justify-between mb-2' },
          React.createElement('div', { className: 'flex-1' },
            React.createElement('h3', { className: 'font-semibold text-lg mb-1 text-gray-900' }, campaign.name),
            React.createElement('div', { className: 'flex gap-2 items-center flex-wrap' },
              React.createElement('span', {
                className: `text-xs px-2 py-1 rounded ${getCampaignTypeColor(campaign.type)}`
              }, getCampaignTypeLabel(campaign.type)),
              !campaign.active && React.createElement('span', {
                className: 'text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded'
              }, 'Inactive'),
              isCompleted && React.createElement('span', {
                className: 'text-xs px-2 py-1 bg-green-100 text-green-800 rounded'
              }, 'Completed')
            )
          )
        ),
        campaign.description && React.createElement('p', {
          className: 'text-sm text-gray-600 line-clamp-2'
        }, campaign.description)
      ),

      // Progress
      campaign.goalAmount && React.createElement('div', { className: 'progress-section mb-3' },
        React.createElement('div', { className: 'flex justify-between text-sm mb-1' },
          React.createElement('span', { className: 'text-gray-600' }, 'Progress'),
          React.createElement('span', { className: 'font-semibold text-gray-900' },
            formatCurrency(currentAmount), ' / ', formatCurrency(campaign.goalAmount)
          )
        ),
        React.createElement('div', { className: 'progress-bar-container bg-gray-200 rounded-full h-3 overflow-hidden' },
          React.createElement('div', {
            className: `progress-bar h-full transition-all ${progressPercent >= 100 ? 'bg-green-500' : 'bg-violet-500'}`,
            style: { width: `${progressPercent}%` }
          })
        ),
        React.createElement('div', { className: 'text-xs text-gray-600 mt-1' },
          progressPercent.toFixed(1), '% of goal'
        )
      ),

      // Stats
      React.createElement('div', { className: 'stats-section mb-3 grid grid-cols-2 gap-2 text-sm' },
        React.createElement('div', { className: 'stat' },
          React.createElement('div', { className: 'text-gray-600' }, 'Total Raised'),
          React.createElement('div', { className: 'font-semibold text-green-600' },
            formatCurrency(currentAmount)
          )
        ),
        React.createElement('div', { className: 'stat' },
          React.createElement('div', { className: 'text-gray-600' }, 'Donations'),
          React.createElement('div', { className: 'font-semibold text-gray-900' }, donations.length)
        )
      ),

      // Dates
      (campaign.startDate || campaign.endDate) && React.createElement('div', { className: 'dates-section mb-3 text-xs text-gray-600' },
        campaign.startDate && React.createElement('div', null, 'Start: ', formatDate(campaign.startDate)),
        campaign.endDate && React.createElement('div', null, 'End: ', formatDate(campaign.endDate))
      ),

      // Actions
      React.createElement('div', { className: 'actions flex gap-2' },
        React.createElement('button', {
          onClick: onEdit,
          className: 'bg-gray-200 hover:bg-gray-300 text-gray-900 px-3 py-1.5 rounded text-sm flex-1'
        }, 'Edit'),
        React.createElement('button', {
          onClick: onToggleActive,
          className: 'bg-violet-700 hover:bg-violet-600 text-gray-900 px-3 py-1.5 rounded text-sm flex-1'
        }, campaign.active ? 'Deactivate' : 'Activate'),
        React.createElement('button', {
          onClick: onDelete,
          className: `bg-red-700 hover:bg-red-600 text-gray-900 px-3 py-1.5 rounded text-sm ${donations.length > 0 ? 'opacity-50 cursor-not-allowed' : ''}`,
          disabled: donations.length > 0,
          title: donations.length > 0 ? 'Cannot delete campaign with donations' : ''
        }, 'Delete')
      )
    );
  };

  /**
   * CampaignEditModal Component
   */
  const CampaignEditModal = ({ campaign, onSave, onClose }) => {
    return React.createElement('div', {
      className: 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50',
      onClick: onClose
    },
      React.createElement('div', {
        className: 'bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto',
        onClick: (e) => e.stopPropagation()
      },
            React.createElement('div', { className: 'sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between' },
              React.createElement('h2', { className: 'text-xl font-bold text-gray-900' }, 'Edit Campaign'),
          React.createElement('button', {
            onClick: onClose,
            className: 'text-gray-600 hover:text-gray-900 text-2xl'
          }, '×')
        ),
        React.createElement('div', { className: 'p-4' },
          React.createElement(CampaignForm, {
            campaign: campaign,
            onSave: (data) => {
              onSave(data);
              onClose();
            },
            onCancel: onClose
          })
        )
      )
    );
  };

  /**
   * Main CampaignsSettings Component
   */
  const CampaignsSettings = () => {
    const [campaigns, setCampaigns] = useState([]);
    const [filter, setFilter] = useState('all');
    const [editingCampaign, setEditingCampaign] = useState(null);
    const [showAddForm, setShowAddForm] = useState(false);

    const campaignsService = global.campaignsService;
    const donationsService = global.donationsService;

    useEffect(() => {
      loadCampaigns();
    }, []);

    const loadCampaigns = () => {
      if (campaignsService) {
        const allCampaigns = campaignsService.loadCampaigns();
        setCampaigns(allCampaigns);
      }
    };

    const formatCurrency = (amount) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0
      }).format(amount || 0);
    };

    const formatDate = (dateString) => {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    };

    const getFilteredCampaigns = () => {
      switch (filter) {
        case 'active':
          return campaigns.filter(c => c.active);
        case 'completed':
          return campaigns.filter(c => !c.active);
        default:
          return campaigns;
      }
    };

    const getDonationsForCampaign = (campaign) => {
      if (!donationsService) return [];
      const allDonations = donationsService.loadDonations();
      return allDonations.filter(d =>
        (d.campaignType === 'custom' && d.campaignName === campaign.name) ||
        (d.campaignId === campaign.id)
      );
    };

    const handleSaveNew = (campaignData) => {
      if (!campaignsService) return;
      const newCampaign = campaignsService.addCampaign(campaignData);
      setCampaigns([...campaigns, newCampaign]);
      setShowAddForm(false);
    };

    const handleSave = (campaignData) => {
      if (!campaignsService || !editingCampaign) return;
      campaignsService.updateCampaign(editingCampaign.id, campaignData);
      loadCampaigns();
      setEditingCampaign(null);
    };

    const handleEdit = (campaign) => {
      setEditingCampaign(campaign);
    };

    const handleDelete = (campaignId) => {
      const campaign = campaigns.find(c => c.id === campaignId);
      const donations = getDonationsForCampaign(campaign);

      if (donations.length > 0) {
        alert(`Cannot delete "${campaign.name}" because it has ${donations.length} associated donations.`);
        return;
      }

      if (confirm(`Delete "${campaign.name}"?`)) {
        if (campaignsService) {
          campaignsService.deleteCampaign(campaignId);
          loadCampaigns();
        }
      }
    };

    const handleToggleActive = (campaignId) => {
      const campaign = campaigns.find(c => c.id === campaignId);
      if (campaignsService) {
        campaignsService.updateCampaign(campaignId, {
          ...campaign,
          active: !campaign.active
        });
        loadCampaigns();
      }
    };

    return React.createElement(
      'div',
      { className: 'campaigns-settings' },

      // Section Header
      React.createElement('div', { className: 'section-header mb-4 flex items-center justify-between' },
        React.createElement('div', null,
          React.createElement('h2', { className: 'text-xl font-bold mb-1 text-gray-900' }, 'Campaigns & Funds'),
            React.createElement('p', { className: 'text-sm text-gray-600' },
            'Manage fundraising campaigns and donation categories'
          )
        ),
        React.createElement('button', {
          onClick: () => setShowAddForm(true),
          className: 'bg-violet-600 hover:bg-violet-700 text-gray-900 px-4 py-2 rounded',
          'data-action': 'create-campaign'
        }, '+ Create Campaign')
      ),

      // Filter tabs
      React.createElement('div', { className: 'filters mb-4 flex gap-2' },
        React.createElement('button', {
          onClick: () => setFilter('all'),
          className: `px-4 py-2 rounded ${filter === 'all'
            ? 'bg-violet-600 text-gray-900'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`
        }, `All Campaigns (${campaigns.length})`),
        React.createElement('button', {
          onClick: () => setFilter('active'),
          className: `px-4 py-2 rounded ${filter === 'active'
            ? 'bg-violet-600 text-gray-900'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`
        }, `Active (${campaigns.filter(c => c.active).length})`),
        React.createElement('button', {
          onClick: () => setFilter('completed'),
          className: `px-4 py-2 rounded ${filter === 'completed'
            ? 'bg-violet-600 text-gray-900'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`
        }, `Completed (${campaigns.filter(c => !c.active).length})`)
      ),

      // Add Campaign Form
      showAddForm && React.createElement('div', { className: 'add-campaign-form mb-6 p-4 border border-gray-200 rounded bg-white' },
            React.createElement('h3', { className: 'font-semibold mb-3 text-gray-900' }, 'Create New Campaign'),
        React.createElement(CampaignForm, {
          campaign: {
            name: '',
            type: 'custom',
            description: '',
            goalAmount: null,
            active: true,
            startDate: null,
            endDate: null
          },
          onSave: handleSaveNew,
          onCancel: () => setShowAddForm(false)
        })
      ),

      // Campaigns Grid
      React.createElement('div', { className: 'campaigns-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' },
        getFilteredCampaigns().length === 0
            ? React.createElement('div', { className: 'col-span-full text-center py-12 border border-gray-200 rounded bg-white' },
              React.createElement('div', { className: 'text-4xl mb-2' }, '📊'),
              React.createElement('p', { className: 'text-gray-600' }, 'No campaigns found')
            )
          : getFilteredCampaigns().map(campaign =>
              React.createElement(CampaignCard, {
                key: campaign.id,
                campaign: campaign,
                onEdit: () => handleEdit(campaign),
                onDelete: () => handleDelete(campaign.id),
                onToggleActive: () => handleToggleActive(campaign.id),
                donations: getDonationsForCampaign(campaign),
                formatCurrency: formatCurrency,
                formatDate: formatDate
              })
            )
      ),

      // Edit Modal
      editingCampaign && React.createElement(CampaignEditModal, {
        campaign: editingCampaign,
        onSave: handleSave,
        onClose: () => setEditingCampaign(null)
      })
    );
  };

  // Export globally
  global.CampaignsSettings = CampaignsSettings;
})(window);
