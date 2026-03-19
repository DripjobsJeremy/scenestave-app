/**
 * Acknowledgment Settings Component
 * Template editor for donor acknowledgment letters and tax receipts.
 * Features: Live preview, placeholder system, organization info management.
 */
(function (global) {
  'use strict';

  const { React } = global;
  const { useState, useEffect } = React;

  /**
   * PlaceholderTag Component
   * Clickable placeholder with copy functionality
   */
  const PlaceholderTag = ({ tag, description }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
      navigator.clipboard.writeText(tag).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    };

    return React.createElement('div', {
      onClick: handleCopy,
      className: `placeholder-tag bg-white border border-gray-300 rounded px-2 py-1 cursor-pointer hover:bg-gray-50 transition ${copied ? 'ring-2 ring-green-500' : ''}`,
      title: `Click to copy: ${description}`
    },
      React.createElement('code', { className: 'text-xs text-violet-400' }, tag),
      React.createElement('span', { className: 'text-xs text-gray-600 ml-1' }, '- ', description),
      copied && React.createElement('span', { className: 'text-xs text-green-400 ml-2' }, '✓')
    );
  };

  /**
   * Main AcknowledgmentSettings Component
   */
  const AcknowledgmentSettings = () => {
    const [templates, setTemplates] = useState({
      emailTemplate: '',
      letterTemplate: '',
      receiptTemplate: ''
    });
    const [activeTemplate, setActiveTemplate] = useState('email');
    const [hasChanges, setHasChanges] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [orgInfo, setOrgInfo] = useState({
      name: '',
      ein: '',
      address: ''
    });

    const acknowledgmentService = global.acknowledgmentService;

    useEffect(() => {
      loadTemplates();
      loadOrgInfo();
    }, []);

    const loadTemplates = () => {
      if (acknowledgmentService) {
        const savedTemplates = acknowledgmentService.loadTemplates();
        setTemplates(savedTemplates);
      }
    };

    const loadOrgInfo = () => {
      if (acknowledgmentService) {
        const savedOrgInfo = acknowledgmentService.loadOrgInfo();
        setOrgInfo(savedOrgInfo);
      }
    };

    const getTemplateTitle = (type) => {
      const titles = {
        email: 'Email Acknowledgment',
        letter: 'Printed Letter',
        receipt: 'Tax Receipt'
      };
      return titles[type] || 'Template';
    };

    const getActiveTemplateContent = () => {
      const templateMap = {
        email: templates.emailTemplate,
        letter: templates.letterTemplate,
        receipt: templates.receiptTemplate
      };
      return templateMap[activeTemplate] || '';
    };

    const handleTemplateChange = (e) => {
      const newContent = e.target.value;
      const templateKey = `${activeTemplate}Template`;

      setTemplates({
        ...templates,
        [templateKey]: newContent
      });
      setHasChanges(true);
    };

    const handleOrgInfoChange = (field, value) => {
      setOrgInfo({
        ...orgInfo,
        [field]: value
      });
      setHasChanges(true);
    };

    const handleResetToDefault = () => {
      if (confirm('Reset this template to default? This will erase your current template.')) {
        if (acknowledgmentService) {
          const defaultTemplates = acknowledgmentService.getDefaultTemplates();
          const templateKey = `${activeTemplate}Template`;
          setTemplates({
            ...templates,
            [templateKey]: defaultTemplates[templateKey]
          });
          setHasChanges(true);
        }
      }
    };

    const renderPreview = (templateContent) => {
      const sampleData = {
        '{{donor_name}}': 'Jane Smith',
        '{{first_name}}': 'Jane',
        '{{last_name}}': 'Smith',
        '{{amount}}': '$1,000.00',
        '{{date}}': new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        '{{campaign}}': 'Fall Musical 2025',
        '{{org_name}}': orgInfo.name || 'Your Theatre Company',
        '{{org_address}}': orgInfo.address || '123 Main Street\nAnytown, ST 12345',
        '{{ein}}': orgInfo.ein || '12-3456789',
        '{{receipt_number}}': 'R-2025-001234'
      };

      let preview = templateContent;
      Object.entries(sampleData).forEach(([placeholder, value]) => {
        preview = preview.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
      });

      preview = preview.replace(/\n/g, '<br>');

      return preview;
    };

    const handleSave = () => {
      try {
        if (acknowledgmentService) {
          acknowledgmentService.saveTemplates(templates);
          acknowledgmentService.saveOrgInfo(orgInfo);
          setHasChanges(false);
          alert('Templates saved successfully!');
        }
      } catch (error) {
        console.error('Error saving templates:', error);
        alert('Failed to save templates. Please try again.');
      }
    };

    const handleCancel = () => {
      if (hasChanges) {
        if (confirm('Discard unsaved changes?')) {
          loadTemplates();
          loadOrgInfo();
          setHasChanges(false);
        }
      }
    };

    return React.createElement('div', { className: 'acknowledgment-settings' },
      // Section Header
      React.createElement('div', { className: 'section-header mb-4' },
        React.createElement('h2', { className: 'text-xl font-bold mb-1 text-gray-900' }, 'Acknowledgment Templates'),
        React.createElement('p', { className: 'text-sm text-gray-600' },
          'Customize thank-you letters and donation receipts'
        )
      ),

      // Template Type Selector
      React.createElement('div', { className: 'template-selector mb-4 flex gap-2' },
        React.createElement('button', {
          onClick: () => setActiveTemplate('email'),
          className: `px-4 py-2 rounded ${activeTemplate === 'email'
            ? 'bg-violet-600 text-gray-900'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`
        }, '✉️ Email Template'),
        React.createElement('button', {
          onClick: () => setActiveTemplate('letter'),
          className: `px-4 py-2 rounded ${activeTemplate === 'letter'
            ? 'bg-violet-600 text-gray-900'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`
        }, '📄 Letter Template'),
        React.createElement('button', {
          onClick: () => setActiveTemplate('receipt'),
          className: `px-4 py-2 rounded ${activeTemplate === 'receipt'
            ? 'bg-violet-600 text-gray-900'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`
        }, '🧾 Tax Receipt Template')
      ),

      // Available Placeholders
      React.createElement('div', { className: 'placeholders-info mb-4 p-4 bg-white border border-gray-200 rounded' },
        React.createElement('h3', { className: 'font-semibold text-violet-400 mb-2' }, 'Available Placeholders (click to copy):'),
        React.createElement('div', { className: 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 text-sm' },
          React.createElement(PlaceholderTag, { tag: '{{donor_name}}', description: 'Full name' }),
          React.createElement(PlaceholderTag, { tag: '{{first_name}}', description: 'First name' }),
          React.createElement(PlaceholderTag, { tag: '{{last_name}}', description: 'Last name' }),
          React.createElement(PlaceholderTag, { tag: '{{amount}}', description: 'Amount' }),
          React.createElement(PlaceholderTag, { tag: '{{date}}', description: 'Date' }),
          React.createElement(PlaceholderTag, { tag: '{{campaign}}', description: 'Campaign' }),
          React.createElement(PlaceholderTag, { tag: '{{org_name}}', description: 'Org name' }),
          React.createElement(PlaceholderTag, { tag: '{{org_address}}', description: 'Address' }),
          React.createElement(PlaceholderTag, { tag: '{{ein}}', description: 'Tax ID' }),
          React.createElement(PlaceholderTag, { tag: '{{receipt_number}}', description: 'Receipt #' })
        )
      ),

      // Template Editor
      React.createElement('div', { className: 'template-editor border border-gray-200 rounded-lg overflow-hidden bg-white' },
        React.createElement('div', { className: 'editor-toolbar bg-gray-50 border-b border-gray-200 p-3 flex items-center justify-between' },
          React.createElement('h3', { className: 'font-semibold text-gray-900' },
            getTemplateTitle(activeTemplate)
          ),
          React.createElement('div', { className: 'flex gap-2' },
            React.createElement('button', {
              onClick: () => setShowPreview(!showPreview),
              className: 'bg-gray-200 hover:bg-gray-300 text-gray-900 px-3 py-1.5 rounded text-sm'
            }, showPreview ? 'Hide Preview' : 'Show Preview'),
            React.createElement('button', {
              onClick: handleResetToDefault,
              className: 'bg-gray-200 hover:bg-gray-300 text-gray-900 px-3 py-1.5 rounded text-sm'
            }, 'Reset to Default')
          )
        ),

        React.createElement('div', { className: showPreview ? 'grid grid-cols-2' : '' },
          // Editor pane
          React.createElement('div', { className: 'editor-pane p-4' },
            React.createElement('textarea', {
              value: getActiveTemplateContent(),
              onChange: handleTemplateChange,
              className: 'w-full border border-gray-300 bg-white text-gray-900 rounded p-3 font-mono text-sm',
              rows: '20',
              placeholder: 'Enter your template content here...'
            }),
            React.createElement('div', { className: 'text-xs text-gray-600 mt-2' },
              getActiveTemplateContent().length, ' characters'
            )
          ),

          // Preview pane
          showPreview && React.createElement('div', { className: 'preview-pane p-4 bg-white border-l border-gray-200' },
            React.createElement('h4', { className: 'font-semibold mb-3 text-gray-900' }, 'Preview:'),
            React.createElement('div', { className: 'preview-content border border-gray-300 rounded bg-gray-50 p-4' },
              React.createElement('div', {
                className: 'text-gray-700 text-sm',
                dangerouslySetInnerHTML: {
                  __html: renderPreview(getActiveTemplateContent())
                }
              })
            )
          )
        )
      ),

      // Organization Info Section
      React.createElement('div', { className: 'org-info-section mt-6 p-4 border border-gray-200 rounded bg-white' },
        React.createElement('h3', { className: 'font-semibold mb-3 text-gray-900' }, 'Organization Information'),
        React.createElement('p', { className: 'text-sm text-gray-600 mb-3' },
          'This information is used in templates and tax receipts'
        ),

        React.createElement('div', { className: 'grid grid-cols-2 gap-4' },
          React.createElement('div', null,
            React.createElement('label', { className: 'block text-sm font-medium mb-1 text-gray-900' },
              'Organization Name*'
            ),
            React.createElement('input', {
              type: 'text',
              value: orgInfo.name,
              onChange: (e) => handleOrgInfoChange('name', e.target.value),
              className: 'w-full border border-gray-300 bg-white text-gray-900 rounded px-3 py-2',
              placeholder: 'SceneStave Theatre Company'
            })
          ),

          React.createElement('div', null,
            React.createElement('label', { className: 'block text-sm font-medium mb-1 text-gray-900' },
              'Tax ID (EIN)*'
            ),
            React.createElement('input', {
              type: 'text',
              value: orgInfo.ein,
              onChange: (e) => handleOrgInfoChange('ein', e.target.value),
              className: 'w-full border border-gray-300 bg-white text-gray-900 rounded px-3 py-2',
              placeholder: '12-3456789'
            })
          ),

          React.createElement('div', { className: 'col-span-2' },
            React.createElement('label', { className: 'block text-sm font-medium mb-1 text-gray-900' },
              'Mailing Address*'
            ),
            React.createElement('textarea', {
              value: orgInfo.address,
              onChange: (e) => handleOrgInfoChange('address', e.target.value),
              className: 'w-full border border-gray-300 bg-white text-gray-900 rounded px-3 py-2',
              rows: '3',
              placeholder: '123 Main Street\nAnytown, ST 12345'
            })
          )
        )
      ),

      // Save Actions
      React.createElement('div', { className: 'save-actions mt-6 flex items-center justify-between' },
        hasChanges && React.createElement('div', { className: 'text-sm text-orange-400' },
          '⚠️ You have unsaved changes'
        ),
        React.createElement('div', { className: 'flex gap-2 ml-auto' },
          React.createElement('button', {
            onClick: handleCancel,
            className: 'bg-gray-200 hover:bg-gray-100 text-gray-900 px-4 py-2 rounded'
          }, 'Cancel'),
          React.createElement('button', {
            onClick: handleSave,
            className: `bg-violet-600 hover:bg-violet-700 text-gray-900 px-4 py-2 rounded ${!hasChanges ? 'opacity-50 cursor-not-allowed' : ''}`,
            disabled: !hasChanges
          }, 'Save All Templates')
        )
      )
    );
  };

  // Export globally
  global.AcknowledgmentSettings = AcknowledgmentSettings;
})(window);
