/**
 * ImportDonorsModal (Step 1 only)
 * Multi-step wizard for importing donor data from CSV/Excel files.
 *
 * Props:
 * - isOpen: boolean
 * - onClose: function
 * - onComplete: function (future steps)
 */

(function (global) {
  'use strict';

  const { React } = global;
  const { useState, useEffect } = React;

  const ImportDonorsModal = ({ isOpen, onClose, onComplete }) => {
    const [currentStep, setCurrentStep] = useState(1);
    const [fileData, setFileData] = useState(null);
    const [parsedData, setParsedData] = useState([]);
    const [fieldMapping, setFieldMapping] = useState({});
    const [mappingWarnings, setMappingWarnings] = useState([]);
    // Mapping presets
    const [availablePresets, setAvailablePresets] = useState([]);
    const [selectedPreset, setSelectedPreset] = useState(null);
    // Mapping UI helpers
    const [mappingSearch, setMappingSearch] = useState('');
    const [showSampleData, setShowSampleData] = useState(true);
    const [importOptions, setImportOptions] = useState({
      skipInvalid: true,
      updateExisting: true,
      sendAcknowledgments: false,
    });

    const [isProcessing, setIsProcessing] = useState(false);
    const [parseProgress, setParseProgress] = useState(0);
    const [error, setError] = useState(null);

    // Step 3 state
    const [transformedData, setTransformedData] = useState({ valid: [], invalid: [] });
    const [importStatus, setImportStatus] = useState('preview'); // preview, importing, complete, error
    const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
    const [importResults, setImportResults] = useState(null);
    const [newContactCount, setNewContactCount] = useState(0);
    const [updateContactCount, setUpdateContactCount] = useState(0);
    const [showInvalidRows, setShowInvalidRows] = useState(false);

    // Import log tracking
    const importLogIdRef = React.useRef(null);

    // Prevent body scroll when open + close on Escape
    useEffect(() => {
      if (!isOpen) return;
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      const handleKey = (e) => {
        if (e.key === 'Escape') onClose && onClose();
      };
      document.addEventListener('keydown', handleKey);
      return () => {
        document.body.style.overflow = prevOverflow;
        document.removeEventListener('keydown', handleKey);
      };
    }, [isOpen, onClose]);

    // Keyboard shortcuts for step navigation
    useEffect(() => {
      const handleKeyPress = (e) => {
        if (!isOpen) return;
        const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
        const isTyping = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target?.isContentEditable;

        if (e.key === 'Escape' && importStatus !== 'importing') {
          onClose && onClose();
        }
        if (e.key === 'Enter' && !e.shiftKey && !isTyping) {
          if (currentStep === 1 && parsedData.length > 0) {
            setCurrentStep(2);
          } else if (currentStep === 2 && !mappingWarnings.some(w => w.includes('Required'))) {
            setCurrentStep(3);
          }
        }
        if (e.key === 'ArrowLeft' && currentStep > 1 && importStatus === 'preview') {
          setCurrentStep(currentStep - 1);
        }
        if (e.key === 'ArrowRight' && currentStep < 3 && !isTyping) {
          if (currentStep === 1 && parsedData.length > 0) {
            setCurrentStep(2);
          } else if (currentStep === 2 && !mappingWarnings.some(w => w.includes('Required'))) {
            setCurrentStep(3);
          }
        }
      };
      window.addEventListener('keydown', handleKeyPress);
      return () => window.removeEventListener('keydown', handleKeyPress);
    }, [isOpen, currentStep, parsedData, mappingWarnings, importStatus, onClose]);

    // Reset state when opening modal
    useEffect(() => {
      if (isOpen) {
        setCurrentStep(1);
        setFileData(null);
        setParsedData([]);
        setFieldMapping({});
        setImportOptions({ skipInvalid: true, updateExisting: true, sendAcknowledgments: false });
        setIsProcessing(false);
        setParseProgress(0);
        setError(null);
        setTransformedData({ valid: [], invalid: [] });
        setImportStatus('preview');
        setImportProgress({ current: 0, total: 0 });
        setImportResults(null);
        setNewContactCount(0);
        setUpdateContactCount(0);
        setShowInvalidRows(false);
        importLogIdRef.current = null;
      }
    }, [isOpen]);

    // ----- Helpers: Field definitions and auto-mapping -----
    const fieldDefs = (global.csvTemplateGenerator && global.csvTemplateGenerator.getImportFieldDefinitions)
      ? global.csvTemplateGenerator.getImportFieldDefinitions()
      : { contact: [], donation: [], skip: [{ key: 'skip', label: '[Skip This Column]' }] };

    const contactFields = fieldDefs.contact || [];
    const donationFields = fieldDefs.donation || [];

    // Simple auto-mapper when csvMapper is not provided globally
    const localCsvMapper = {
      normalizeHeader(h) {
        return String(h || '')
          .toLowerCase()
          .replace(/[_\-]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      },
      autoMapFields(headers = []) {
        const map = {};
        const synonyms = [
          { keys: ['first name', 'firstname', 'given name', 'fname'], field: 'firstName' },
          { keys: ['last name', 'lastname', 'surname', 'family name', 'lname'], field: 'lastName' },
          { keys: ['email', 'email address', 'e-mail'], field: 'email' },
          { keys: ['phone', 'phone number', 'telephone', 'tel'], field: 'phone' },
          { keys: ['street', 'address', 'address line 1', 'address1', 'street address'], field: 'street' },
          { keys: ['city', 'town'], field: 'city' },
          { keys: ['state', 'province', 'region'], field: 'state' },
          { keys: ['zip', 'zip code', 'postal code', 'postcode'], field: 'zip' },
          { keys: ['donation amount', 'amount', 'gift amount', 'value'], field: 'amount' },
          { keys: ['donation date', 'date', 'gift date'], field: 'date' },
          { keys: ['donation type', 'type', 'recurring', 'frequency'], field: 'recurringType' },
          { keys: ['campaign', 'campaign/fund', 'fund', 'campaign name'], field: 'campaignName' },
          { keys: ['payment method', 'payment', 'method'], field: 'paymentMethod' },
          { keys: ['transaction number', 'transaction id', 'txn', 'receipt number'], field: 'transactionNumber' },
          { keys: ['notes', 'donation notes', 'comment', 'comments'], field: 'notes' },
        ];

        headers.forEach((raw) => {
          const h = localCsvMapper.normalizeHeader(raw);
          let mapped = 'skip';
          for (const entry of synonyms) {
            if (entry.keys.includes(h)) {
              mapped = entry.field;
              break;
            }
          }
          map[raw] = mapped;
        });
        return map;
      }
    };

    const csvMapper = global.csvMapper && typeof global.csvMapper.autoMapFields === 'function'
      ? global.csvMapper
      : localCsvMapper;

    // ----- Step 2 Auto-map and validation -----
    useEffect(() => {
      if (currentStep === 2 && Array.isArray(parsedData) && parsedData.length > 0) {
        const csvHeaders = Object.keys(parsedData[0] || {});
        const autoMapping = csvMapper.autoMapFields(csvHeaders);
        setFieldMapping(autoMapping);
        validateFieldMapping(autoMapping);

        // Load presets and suggest best match
        const svc = global.mappingPresetsService;
        if (svc) {
          const presets = svc.loadMappingPresets();
          setAvailablePresets(presets);
          try {
            const match = svc.findMatchingPreset(csvHeaders);
            setSelectedPreset(match || null);
          } catch (e) {
            console.warn('Preset match failed', e);
          }
        }
      }
    }, [currentStep, parsedData]);

    // Auto-save draft mapping while editing
    useEffect(() => {
      if (currentStep === 2 && Object.keys(fieldMapping || {}).length > 0) {
        const timer = setTimeout(() => {
          try {
            localStorage.setItem('showsuite_import_draft_mapping', JSON.stringify({
              mapping: fieldMapping,
              fileName: fileData?.name,
              savedAt: new Date().toISOString()
            }));
          } catch (e) {}
        }, 1000);
        return () => clearTimeout(timer);
      }
    }, [fieldMapping, currentStep, fileData]);

    // Restore draft mapping on entering Step 2
    useEffect(() => {
      if (currentStep === 2) {
        try {
          const draft = localStorage.getItem('showsuite_import_draft_mapping');
          if (draft) {
            const parsed = JSON.parse(draft);
            if (parsed && parsed.mapping) {
              if (confirm(`Restore previous mapping draft from ${formatDate(parsed.savedAt)}?`)) {
                setFieldMapping(parsed.mapping);
              }
            }
          }
        } catch (error) {
          console.error('Error restoring draft:', error);
        }
      }
    }, [currentStep]);

    // Allow drag-drop anywhere inside modal on Step 1
    useEffect(() => {
      if (currentStep !== 1) return;
      const modalEl = document.querySelector('.import-modal');
      if (!modalEl) return;
      const handleDropAny = (e) => {
        e.preventDefault();
        if (e.dataTransfer?.files?.length > 0) {
          processFile(e.dataTransfer.files[0]);
        }
      };
      const handleDragOverAny = (e) => { e.preventDefault(); };
      modalEl.addEventListener('drop', handleDropAny);
      modalEl.addEventListener('dragover', handleDragOverAny);
      return () => {
        modalEl.removeEventListener('drop', handleDropAny);
        modalEl.removeEventListener('dragover', handleDragOverAny);
      };
    }, [currentStep]);

    const handleMappingChange = (csvColumn, targetField) => {
      const updated = { ...fieldMapping, [csvColumn]: targetField };
      setFieldMapping(updated);
      validateFieldMapping(updated);
    };

    const validateFieldMapping = (mapping) => {
      const warnings = [];
      try {
        const requiredFields = [
          ...(contactFields.filter(f => f.required)),
          ...(donationFields.filter(f => f.required))
        ];

        // Required fields mapped
        requiredFields.forEach(field => {
          const isMapped = Object.values(mapping || {}).includes(field.key);
          if (!isMapped) warnings.push(`Required field "${field.label}" is not mapped`);
        });

        // Duplicate targets
        const mappedTo = Object.values(mapping || {}).filter(v => v && v !== 'skip');
        const duplicates = mappedTo.filter((v, i, arr) => arr.indexOf(v) !== i);
        if (duplicates.length > 0) {
          const uniq = Array.from(new Set(duplicates));
          warnings.push(`Multiple columns mapped to same field: ${uniq.join(', ')}`);
        }

        // Type checks on sample rows
        const validations = global.ValidationService || {};
        const sampleRows = (parsedData || []).slice(0, 10);
        Object.entries(mapping || {}).forEach(([csvCol, targetField]) => {
          if (!targetField || targetField === 'skip') return;
          const fieldDef = [...contactFields, ...donationFields].find(f => f.key === targetField);
          if (!fieldDef) return;

          if (fieldDef.type === 'currency' && typeof validations.isValidCurrency === 'function') {
            const hasInvalid = sampleRows.some(row => {
              const v = row[csvCol];
              return v && !validations.isValidCurrency(v);
            });
            if (hasInvalid) warnings.push(`Column "${csvCol}" contains non-numeric values for currency field`);
          }

          if (fieldDef.type === 'date' && typeof validations.isValidDate === 'function') {
            const hasInvalid = sampleRows.some(row => {
              const v = row[csvCol];
              return v && !validations.isValidDate(v);
            });
            if (hasInvalid) warnings.push(`Column "${csvCol}" contains invalid date values`);
          }

          if (fieldDef.type === 'email' && typeof validations.isValidEmail === 'function') {
            const hasInvalid = sampleRows.some(row => {
              const v = row[csvCol];
              return v && !validations.isValidEmail(v);
            });
            if (hasInvalid) warnings.push(`Column "${csvCol}" contains invalid email addresses`);
          }
        });
      } catch (e) {
        console.warn('Field mapping validation error:', e);
      }
      setMappingWarnings(warnings);
    };

    // Detect instruction/template rows and header-like guidance rows
    const isInstructionRow = (row) => {
      try {
        const combined = Object.values(row || {})
          .map(v => String(v || '').toLowerCase())
          .join(' ');
        // Heuristic 1: template hints
        if (combined.includes('required') && combined.includes('optional')) return true;
        // Heuristic 2: row lists many known field labels (likely instruction line)
        const labels = [
          'first name','last name','name','email','phone','street','address','city','state','zip','postal',
          'amount','donation amount','date','donation date','recurring','campaign','fund','payment','transaction','notes'
        ];
        const hitCount = labels.reduce((acc, label) => acc + (combined.includes(label) ? 1 : 0), 0);
        if (hitCount >= 5) return true;
        return false;
      } catch {
        return false;
      }
    };

    const getColumnSample = (csvColumn) => {
      const clean = (val) =>
        String(val ?? '')
          .replace(/\r?\n|\r/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      const truncate = (s, n = 60) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
      const isInstructionValue = (s) => {
        const lower = s.toLowerCase();
        const commaCount = (s.match(/,/g) || []).length;
        const labels = ['first name','last name','email','phone','street','address','city','state','zip','amount','date','recurring','campaign','payment','transaction','notes'];
        const labelHits = labels.reduce((acc, l) => acc + (lower.includes(l) ? 1 : 0), 0);
        return (commaCount >= 4 && labelHits >= 3) || labelHits >= 6;
      };

      const samples = (parsedData || [])
        .filter(row => !isInstructionRow(row))
        .slice(0, 20)
        .map(row => row[csvColumn])
        .filter(val => val && String(val).trim())
        .map(clean)
        .filter(s => !isInstructionValue(s))
        .map(s => truncate(s))
        .slice(0, 3);
      return samples.join(', ') || '(empty)';
    };

    const getMappingStatus = (csvColumn) => {
      const targetField = fieldMapping[csvColumn];
      if (!targetField || targetField === 'skip') {
        return React.createElement('span', { className: 'text-gray-400' }, '—');
      }
      const all = [...contactFields, ...donationFields];
      const fieldDef = all.find(f => f.key === targetField);
      if (!fieldDef) return React.createElement('span', { className: 'text-gray-400' }, '—');
      if (fieldDef.required) return React.createElement('span', { className: 'text-green-600 font-bold' }, '✓');
      return React.createElement('span', { className: 'text-blue-600' }, '✓');
    };

    const handleProceedToPreview = () => {
      const requiredKeys = ['firstName', 'lastName', 'amount', 'date'];
      const mappedValues = Object.values(fieldMapping || {});
      const hasAll = requiredKeys.every(k => mappedValues.includes(k));
      if (!hasAll) {
        alert('Please map all required fields before proceeding.');
        return;
      }
      setCurrentStep(3);
    };

    const handleApplyPreset = (preset) => {
      if (!preset) return;
      setFieldMapping(preset.mapping || {});
      validateFieldMapping(preset.mapping || {});
      const svc = global.mappingPresetsService;
      if (svc) {
        try { svc.recordPresetUsage(preset.id); } catch {}
      }
      alert(`Applied preset: ${preset.name}`);
    };

    const handleSaveAsPreset = () => {
      const svc = global.mappingPresetsService;
      if (!svc) { alert('Preset service not available'); return; }
      const name = prompt('Enter a name for this mapping preset:');
      if (!name) return;
      const description = prompt('Enter a description (optional):');
      try {
        svc.createMappingPreset(name, description, fieldMapping);
        const presets = svc.loadMappingPresets();
        setAvailablePresets(presets);
        alert('Preset saved successfully!');
      } catch (error) {
        alert('Failed to save preset: ' + error.message);
      }
    };

    // Bulk field mapping actions
    const handleAutoMapAll = () => {
      if (!parsedData || parsedData.length === 0) return;
      const csvHeaders = Object.keys(parsedData[0] || {});
      const autoMapping = csvMapper.autoMapFields(csvHeaders);
      setFieldMapping(autoMapping);
      validateFieldMapping(autoMapping);
      alert('Auto-mapped all fields');
    };

    const handleClearAllMappings = () => {
      if (!fieldMapping) return;
      if (confirm('Clear all field mappings?')) {
        const cleared = {};
        Object.keys(fieldMapping).forEach(key => { cleared[key] = 'skip'; });
        setFieldMapping(cleared);
        validateFieldMapping(cleared);
      }
    };

    const handleResetToDefaults = () => {
      handleAutoMapAll();
    };

    // Export/Import mapping
    const handleExportMapping = () => {
      try {
        const mappingExport = {
          name: fileData?.name || 'mapping',
          date: new Date().toISOString(),
          mapping: fieldMapping
        };
        const blob = new Blob([JSON.stringify(mappingExport, null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `field-mapping-${Date.now()}.json`;
        link.click();
      } catch (e) {
        alert('Failed to export mapping');
      }
    };

    const handleImportMapping = () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = (e) => {
        const f = e.target.files[0];
        if (!f) return;
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const imported = JSON.parse(event.target.result);
            if (imported && imported.mapping) {
              setFieldMapping(imported.mapping);
              validateFieldMapping(imported.mapping);
              alert('Mapping imported successfully');
            } else {
              alert('Invalid mapping file');
            }
          } catch (error) {
            alert('Error reading mapping file: ' + error.message);
          }
        };
        reader.readAsText(f);
      };
      input.click();
    };

    // Persist progress across steps
    const saveImportProgress = () => {
      try {
        localStorage.setItem('showsuite_import_progress', JSON.stringify({
          step: currentStep,
          fileData: { name: fileData?.name, size: fileData?.size },
          parsedRowCount: parsedData.length,
          fieldMapping,
          options: importOptions,
          timestamp: new Date().toISOString()
        }));
      } catch (e) {}
    };
    useEffect(() => {
      if (isOpen && fileData) {
        saveImportProgress();
      }
    }, [currentStep, fieldMapping, importOptions]);

    const HelpTooltip = ({ text }) => (
      React.createElement('div', { className: 'inline-block ml-2 relative group' },
        React.createElement('span', { className: 'text-gray-400 cursor-help' }, 'ⓘ'),
        React.createElement('div', { className: 'hidden group-hover:block absolute bottom-full left-0 mb-2 w-64 p-2 bg-gray-800 text-white text-xs rounded shadow-lg z-10' }, text)
      )
    );

    // Step 3 initialization - transform and validate data
    useEffect(() => {
      if (currentStep === 3 && importStatus === 'preview') {
        try {
          const transformed = csvMapper.transformData(parsedData, fieldMapping);
          const validated = csvMapper.validateTransformedData(transformed);
          setTransformedData(validated);
          calculateImportCounts(validated.valid);

          // Log error summary if there are invalid rows
          if (validated.invalid.length > 0 && global.errorReportGenerator) {
            const summary = global.errorReportGenerator.generateErrorSummary(validated.invalid);
            console.log('Import Validation Summary:', summary.message);
            console.log('Top Errors:', summary.topErrors);
          }
        } catch (err) {
          console.error('Error transforming data:', err);
          setError('Failed to transform data. Please check your field mappings.');
        }
      }
    }, [currentStep, importStatus]);

    const calculateImportCounts = (validRows) => {
      const contactsService = global.contactsService;
      if (!contactsService) {
        setNewContactCount(validRows.length);
        setUpdateContactCount(0);
        return;
      }

      const existingContacts = contactsService.loadContacts();
      const existingEmails = existingContacts.map(c => c.email?.toLowerCase()).filter(Boolean);

      let newCount = 0;
      let updateCount = 0;

      validRows.forEach(row => {
        if (row.contact.email && existingEmails.includes(row.contact.email.toLowerCase())) {
          updateCount++;
        } else {
          newCount++;
        }
      });

      setNewContactCount(newCount);
      setUpdateContactCount(updateCount);
    };

    const formatCurrency = (amount) => {
      if (amount === undefined || amount === null) return '$0.00';
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    };

    const formatDate = (dateString) => {
      if (!dateString) return '—';
      try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      } catch {
        return dateString;
      }
    };

    const handleStartImport = () => {
      if (!confirm(`Import ${transformedData.valid.length} donations? This action cannot be undone.`)) {
        return;
      }

      // Create import log entry
      const importLogsService = global.importLogsService;
      if (importLogsService) {
        try {
          const log = importLogsService.createImportLog({
            fileName: fileData?.name || 'unknown.csv',
            totalRows: transformedData.valid.length,
            userId: 'current_user', // TODO: Get from auth service
            options: importOptions
          });
          importLogIdRef.current = log.id;

          // Update to processing status
          importLogsService.updateImportLog(log.id, {
            status: 'processing'
          });
        } catch (error) {
          console.error('Error creating import log:', error);
        }
      }

      setImportStatus('importing');
      setImportProgress({ current: 0, total: transformedData.valid.length });

      // Process import
      setTimeout(() => processImport(), 100);
    };

    const processImport = async () => {
      const contactsService = global.contactsService;
      const donationsService = global.donationsService;
      const donorCalculationService = global.donorCalculationService;

      if (!contactsService || !donationsService) {
        alert('Services not loaded. Please refresh the page.');
        setImportStatus('error');
        return;
      }

      const results = {
        contactsCreated: 0,
        contactsUpdated: 0,
        donationsCreated: 0,
        totalAmount: 0,
        errors: []
      };

      const batchSize = 10;
      const batches = [];

      for (let i = 0; i < transformedData.valid.length; i += batchSize) {
        batches.push(transformedData.valid.slice(i, i + batchSize));
      }

      try {
        for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
          const batch = batches[batchIndex];

          for (const row of batch) {
            try {
              let contact = null;

              // Find or create contact
              if (row.contact.email && importOptions.updateExisting) {
                const existingContact = contactsService.findContactByEmail(row.contact.email);
                if (existingContact) {
                  // Update existing contact
                  contactsService.updateContact(existingContact.id, {
                    ...existingContact,
                    ...row.contact,
                    isDonor: true,
                    tags: existingContact.tags.includes('Donor')
                      ? existingContact.tags
                      : [...existingContact.tags, 'Donor']
                  });
                  contact = contactsService.getContactById(existingContact.id);
                  results.contactsUpdated++;
                }
              }

              if (!contact) {
                // Create new contact
                contact = contactsService.addContact({
                  ...row.contact,
                  address: {
                    street: row.contact.street || '',
                    city: row.contact.city || '',
                    state: row.contact.state || '',
                    zip: row.contact.zip || ''
                  },
                  tags: ['Donor'],
                  isDonor: true,
                  donorProfile: {
                    donorLevelId: null,
                    lifetimeTotal: 0,
                    inKindTotal: 0,
                    firstDonationDate: null,
                    lastDonationDate: null,
                    donorSince: null,
                    totalDonations: 0,
                    notes: ''
                  }
                });
                results.contactsCreated++;
              }

              // Create donation
              const donation = donationsService.addDonation({
                contactId: contact.id,
                donationType: 'monetary',
                amount: row.donation.amount,
                date: row.donation.date,
                recurringType: row.donation.recurringType || 'One-Time',
                campaignType: row.donation.campaignName ? 'custom' : 'general',
                campaignId: null,
                campaignName: row.donation.campaignName || 'General Operating Fund',
                paymentMethod: row.donation.paymentMethod || 'Check',
                transactionNumber: row.donation.transactionNumber || '',
                taxDeductible: true,
                acknowledgmentSent: false,
                acknowledgmentDate: null,
                acknowledgmentMethod: null,
                addedBy: 'import',
                notes: row.donation.notes || ''
              });

              results.donationsCreated++;
              results.totalAmount += row.donation.amount;

              // Update donor profile
              if (donorCalculationService) {
                donorCalculationService.updateDonorProfileById(contact.id);
              }

            } catch (error) {
              console.error('Error importing row:', row, error);
              results.errors.push({
                row: row.rowNumber,
                error: error.message,
                data: row
              });
            }

            // Update progress
            setImportProgress(prev => ({
              ...prev,
              current: prev.current + 1
            }));
          }

          // Small delay between batches to keep UI responsive
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Complete
        setImportResults(results);
        setImportStatus('complete');

        console.log('Import complete:', results);

        // Complete import log
        const importLogsService = global.importLogsService;
        if (importLogsService && importLogIdRef.current) {
          try {
            importLogsService.completeImportLog(importLogIdRef.current, results);
          } catch (error) {
            console.error('Error completing import log:', error);
          }
        }

        // Log error summary if there were errors
        if (results.errors.length > 0 && global.errorReportGenerator) {
          const summary = global.errorReportGenerator.generateErrorSummary(results.errors);
          console.log('Import Error Summary:', summary.message);
        }
      } catch (error) {
        console.error('Import failed:', error);
        setImportStatus('error');
        setError('Import failed: ' + error.message);

        // Mark import log as failed
        const importLogsService = global.importLogsService;
        if (importLogsService && importLogIdRef.current) {
          try {
            importLogsService.failImportLog(importLogIdRef.current, error.message);
          } catch (logError) {
            console.error('Error updating import log:', logError);
          }
        }
      }
    };

    const handleDownloadErrorReport = () => {
      const errorData = importStatus === 'preview'
        ? transformedData.invalid
        : importResults?.errors || [];

      if (!errorData || errorData.length === 0) {
        alert('No errors to download');
        return;
      }

      // Use errorReportGenerator utility
      const errorReportGenerator = global.errorReportGenerator;
      if (errorReportGenerator && typeof errorReportGenerator.downloadErrorReport === 'function') {
        errorReportGenerator.downloadErrorReport(errorData);
      } else {
        // Fallback to basic CSV export if utility not available
        const Papa = global.Papa || window.Papa;
        if (Papa) {
          const csv = Papa.unparse(errorData);
          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = `import_errors_${new Date().toISOString().split('T')[0]}.csv`;
          link.click();
        } else {
          alert('CSV export not available. Please refresh the page.');
        }
      }
    };

    const handleGoToContacts = () => {
      if (onComplete) onComplete();
      onClose();
    };

    const handleFileDrop = (e) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      processFile(file);
    };

    const handleDragOver = (e) => {
      e.preventDefault();
    };

    const handleFileSelect = (e) => {
      const file = e.target.files[0];
      processFile(file);
    };

    const processFile = async (file) => {
      if (!file) return;

      // Size check (10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('File must be under 10MB');
        return;
      }

      const allowedTypes = [
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ];

      if (!allowedTypes.includes(file.type) && !file.name.match(/\.(csv|xlsx|xls)$/i)) {
        setError('Please upload a CSV or Excel file');
        return;
      }

      setFileData(file);
      setError(null);
      setIsProcessing(true);
      setParseProgress(10);

      try {
        let data;
        if (file.name.toLowerCase().endsWith('.csv')) {
          data = await parseCSV(file, setParseProgress);
        } else {
          data = await parseExcel(file, setParseProgress);
        }

        if (!Array.isArray(data) || data.length === 0) {
          setError('File appears to be empty');
          setFileData(null);
          setParsedData([]);
          setIsProcessing(false);
          setParseProgress(0);
          return;
        }

        setParsedData(data);
        setIsProcessing(false);
        setParseProgress(100);
      } catch (err) {
        console.error('Error parsing file:', err);
        setError('Unable to read file. Please check format.');
        setFileData(null);
        setParsedData([]);
        setIsProcessing(false);
        setParseProgress(0);
      }
    };

    const parseCSV = (file, setProgressCb) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const Papa = global.Papa || window.Papa;
            if (!Papa) throw new Error('PapaParse not loaded');
            const result = Papa.parse(e.target.result, {
              header: true,
              skipEmptyLines: true,
              transformHeader: (h) => (h || '').trim(),
              complete: () => setProgressCb && setProgressCb(90),
            });
            if (result.errors && result.errors.length) {
              console.warn('CSV parsing warnings:', result.errors);
            }
            resolve(result.data);
          } catch (err) {
            reject(err);
          }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
      });
    };

    const parseExcel = (file, setProgressCb) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const XLSX = global.XLSX || window.XLSX;
            if (!XLSX) throw new Error('SheetJS (XLSX) not loaded');
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const json = XLSX.utils.sheet_to_json(worksheet, {
              raw: false,
              defval: '',
            });
            setProgressCb && setProgressCb(90);
            resolve(json);
          } catch (err) {
            reject(err);
          }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsArrayBuffer(file);
      });
    };

    const handleRemoveFile = () => {
      if (confirm('Remove uploaded file?')) {
        setFileData(null);
        setParsedData([]);
        setError(null);
        setIsProcessing(false);
        setParseProgress(0);
      }
    };

    const handleDownloadTemplate = () => {
      // Use global csvTemplateGenerator utility
      if (global.csvTemplateGenerator && typeof global.csvTemplateGenerator.downloadSampleTemplate === 'function') {
        global.csvTemplateGenerator.downloadSampleTemplate('SceneStave_Donor_Import_Template.csv');
      } else {
        alert('CSV Template Generator not available. Please refresh the page.');
        console.error('csvTemplateGenerator not found in global scope');
      }
    };

    const formatFileSize = (bytes) => {
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
      return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    if (!isOpen) return null;

    return React.createElement(
      'div',
      {
        className: 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4',
        style: { backdropFilter: 'blur(4px)' },
        onClick: onClose,
      },
      React.createElement(
        'div',
        {
          className: 'bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-xl import-modal',
          onClick: (e) => e.stopPropagation(),
        },
        // Header
        React.createElement(
          'div',
          { className: 'flex items-center justify-between p-4 border-b' },
          React.createElement('h2', { className: 'text-xl font-bold' }, 'Import Donors'),
          React.createElement(
            'button',
            { className: 'text-gray-400 hover:text-gray-600 text-2xl leading-none', onClick: onClose },
            '✕'
          )
        ),
        // Body
        React.createElement(
          'div',
          { className: 'p-4 overflow-y-auto max-h-[70vh]' },
          // Step indicator (simple)
          React.createElement(
            'div',
            { className: 'text-sm text-gray-500 mb-3' },
            `Step ${currentStep} of 3`
          ),
          currentStep === 1 && React.createElement(
            'div',
            { className: 'import-step' },
            React.createElement('h3', { className: 'text-lg font-semibold mb-2' }, 'Step 1 of 3: Upload File'),
            React.createElement(
              'p',
              { className: 'text-sm text-gray-600 mb-4' },
              'Upload a CSV or Excel file containing donor and donation information.'
            ),
            !fileData
              ? React.createElement(
                  React.Fragment,
                  null,
                  // Dropzone
                  React.createElement(
                    'div',
                    {
                      className:
                        'border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition',
                      onDrop: handleFileDrop,
                      onDragOver: handleDragOver,
                      onClick: () => document.getElementById('import-donors-file-input')?.click(),
                    },
                    React.createElement('div', { className: 'text-4xl mb-2' }, '📁'),
                    React.createElement('p', { className: 'text-lg font-medium mb-1' }, 'Drop CSV/Excel file here'),
                    React.createElement('p', { className: 'text-sm text-gray-500 mb-4' }, 'or click to browse'),
                    React.createElement(
                      'p',
                      { className: 'text-xs text-gray-400' },
                      'Supported: .csv, .xlsx, .xls (Max 10MB)'
                    )
                  ),
                  React.createElement('input', {
                    id: 'import-donors-file-input',
                    type: 'file',
                    accept: '.csv,.xlsx,.xls',
                    onChange: handleFileSelect,
                    className: 'hidden',
                  }),
                  // Sample download
                  React.createElement(
                    'div',
                    { className: 'mt-4 text-center' },
                    React.createElement(
                      'button',
                      { onClick: handleDownloadTemplate, className: 'text-blue-600 hover:underline text-sm' },
                      '📥 Download Sample Template'
                    )
                  )
                )
              : React.createElement(
                  React.Fragment,
                  null,
                  // File preview
                  React.createElement(
                    'div',
                    { className: 'bg-gray-50 border rounded-lg p-4 mb-4' },
                    React.createElement(
                      'div',
                      { className: 'flex items-center justify-between mb-2' },
                      React.createElement(
                        'div',
                        { className: 'flex items-center gap-2' },
                        React.createElement('span', { className: 'text-2xl' }, '📄'),
                        React.createElement(
                          'div',
                          null,
                          React.createElement('p', { className: 'font-medium' }, fileData?.name || ''),
                          React.createElement(
                            'p',
                            { className: 'text-sm text-gray-600' },
                            `${formatFileSize(fileData?.size || 0)} • ${parsedData.length} rows`
                          )
                        )
                      ),
                      React.createElement(
                        'button',
                        { onClick: handleRemoveFile, className: 'text-gray-400 hover:text-gray-600' },
                        '✕'
                      )
                    ),
                    isProcessing &&
                      React.createElement(
                        'div',
                        { className: 'w-full h-2 bg-gray-200 rounded overflow-hidden' },
                        React.createElement('div', {
                          className: 'h-2 bg-blue-500 transition-all',
                          style: { width: `${parseProgress}%` },
                        })
                      ),
                    error &&
                      React.createElement(
                        'div',
                        { className: 'text-red-600 text-sm mt-2' },
                        `⚠ ${error}`
                      )
                  )
                )
          ),

          // ----- STEP 2: FIELD MAPPING -----
          currentStep === 2 && React.createElement(
            'div',
            { className: 'import-step' },
            React.createElement('h3', { className: 'text-lg font-semibold mb-2' }, 'Step 2 of 3: Map Fields'),
            React.createElement('p', { className: 'text-sm text-gray-600 mb-4' }, `Match your CSV columns to SceneStave fields. Found ${parsedData.length} rows in ${fileData?.name || 'file'}.`),

            // Bulk actions and utilities
            React.createElement('div', { className: 'bulk-actions mb-3 flex flex-wrap gap-2 items-center' },
              React.createElement('button', { onClick: handleAutoMapAll, className: 'text-sm px-3 py-1 rounded border' }, '🤖 Auto-Map All Fields'),
              React.createElement('button', { onClick: handleClearAllMappings, className: 'text-sm px-3 py-1 rounded border' }, '✕ Clear All Mappings'),
              React.createElement('button', { onClick: handleResetToDefaults, className: 'text-sm px-3 py-1 rounded border' }, '↺ Reset to Defaults'),
              React.createElement('span', { className: 'ml-auto flex items-center gap-3' },
                React.createElement('button', { onClick: handleExportMapping, className: 'text-sm text-blue-600 hover:underline' }, '📤 Export Mapping as JSON'),
                React.createElement('button', { onClick: handleImportMapping, className: 'text-sm text-blue-600 hover:underline' }, '📥 Import Mapping from JSON')
              )
            ),

            // Search and sample toggle
            React.createElement('div', { className: 'mb-2' },
              React.createElement('input', {
                type: 'text',
                placeholder: 'Search columns...',
                value: mappingSearch,
                onChange: (e) => setMappingSearch(e.target.value),
                className: 'border rounded px-3 py-2 w-full mb-2'
              }),
              React.createElement('label', { className: 'flex items-center text-sm mb-2' },
                React.createElement('input', { type: 'checkbox', checked: showSampleData, onChange: (e) => setShowSampleData(e.target.checked), className: 'mr-2' }),
                'Show sample data in mapping table'
              )
            ),

            // Presets section
            React.createElement('div', { className: 'presets-section mb-4' },
              React.createElement('div', { className: 'flex items-center justify-between mb-2' },
                React.createElement('label', { className: 'text-sm font-medium' }, 'Field Mapping Presets'),
                React.createElement('button', { onClick: handleSaveAsPreset, className: 'text-sm text-blue-600 hover:underline' }, '💾 Save Current Mapping as Preset')
              ),
              selectedPreset && React.createElement('div', { className: 'preset-suggestion bg-blue-50 border border-blue-200 rounded p-3 mb-2' },
                React.createElement('p', { className: 'text-sm text-blue-800 mb-2' },
                  React.createElement('strong', null, 'Suggested preset: '),
                  selectedPreset.name
                ),
                selectedPreset.description && React.createElement('p', { className: 'text-xs text-blue-600 mb-2' }, selectedPreset.description),
                React.createElement('div', { className: 'flex gap-2' },
                  React.createElement('button', { onClick: () => handleApplyPreset(selectedPreset), className: 'bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1 rounded' }, 'Apply This Preset'),
                  React.createElement('button', { onClick: () => setSelectedPreset(null), className: 'text-sm px-3 py-1 rounded border' }, 'Dismiss')
                )
              ),
              React.createElement('select', {
                value: '',
                onChange: (e) => {
                  const id = e.target.value;
                  if (id) {
                    const p = (availablePresets || []).find(pr => pr.id === id);
                    if (p) handleApplyPreset(p);
                  }
                },
                className: 'w-full border rounded p-2'
              },
                React.createElement('option', { value: '' }, '-- Choose a saved preset --'),
                (availablePresets || []).map(p => (
                  React.createElement('option', { key: p.id, value: p.id }, `${p.name} (used ${p.useCount || 0} times)`)
                ))
              )
            ),

            // Mapping table
            React.createElement('div', { className: 'mapping-table max-h-96 overflow-y-auto border rounded-lg' },
              React.createElement('table', { className: 'w-full' },
                React.createElement('thead', { className: 'bg-gray-50 sticky top-0' },
                  React.createElement('tr', null,
                    React.createElement('th', { className: 'text-left p-3 border-b' }, 'Your Column'),
                    React.createElement('th', { className: 'text-left p-3 border-b' }, 'Sample Data'),
                    React.createElement('th', { className: 'text-left p-3 border-b' }, 'Maps To'),
                    React.createElement('th', { className: 'text-center p-3 border-b w-20' }, 'Status')
                  )
                ),
                React.createElement('tbody', null,
                  Object.keys(parsedData[0] || {})
                    .filter(col => col.toLowerCase().includes((mappingSearch || '').toLowerCase()))
                    .map((csvColumn, index) => (
                    React.createElement('tr', { key: index, className: 'border-b hover:bg-gray-50' },
                      React.createElement('td', { className: 'p-3 font-medium' }, csvColumn),
                      showSampleData
                        ? React.createElement('td', { className: 'p-3 text-sm text-gray-600 whitespace-nowrap overflow-hidden text-ellipsis w-[360px]', title: getColumnSample(csvColumn) }, getColumnSample(csvColumn))
                        : React.createElement('td', { className: 'p-3 text-sm text-gray-400 italic' }, '(hidden)'),
                      React.createElement('td', { className: 'p-3' },
                        React.createElement('select', {
                          value: fieldMapping[csvColumn] || 'skip',
                          onChange: (e) => handleMappingChange(csvColumn, e.target.value),
                          className: 'w-full border rounded p-1'
                        },
                          React.createElement('option', { value: 'skip' }, '[Skip This Column]'),
                          React.createElement('optgroup', { label: 'Contact Fields' },
                            contactFields.map(field => React.createElement('option', { key: field.key, value: field.key }, `${field.label}${field.required ? ' *' : ''}`))
                          ),
                          React.createElement('optgroup', { label: 'Donation Fields' },
                            donationFields.map(field => React.createElement('option', { key: field.key, value: field.key }, `${field.label}${field.required ? ' *' : ''}`))
                          )
                        )
                      ),
                      React.createElement('td', { className: 'p-3 text-center' }, getMappingStatus(csvColumn))
                    )
                  ))
                )
              )
            ),

            // Warnings
            (mappingWarnings.length > 0) && React.createElement('div', { className: 'warnings mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded' },
              React.createElement('p', { className: 'font-semibold text-yellow-800 mb-2' }, '⚠ Warnings:'),
              React.createElement('ul', { className: 'text-sm text-yellow-700 space-y-1' },
                mappingWarnings.map((w, i) => React.createElement('li', { key: i }, `• ${w}`))
              )
            ),

            // Import options
            React.createElement('div', { className: 'import-options mt-4 p-4 bg-gray-50 border rounded' },
              React.createElement('p', { className: 'font-semibold mb-3' }, 'Import Options:'),
              React.createElement('label', { className: 'flex items-center mb-2 cursor-pointer' },
                React.createElement('input', {
                  type: 'checkbox',
                  checked: importOptions.skipInvalid,
                  onChange: (e) => setImportOptions({ ...importOptions, skipInvalid: e.target.checked }),
                  className: 'mr-2'
                }),
                React.createElement('span', { className: 'text-sm flex items-center' }, 'Skip rows with missing required fields', React.createElement(HelpTooltip, { text: 'Rows without First Name, Last Name, Amount, or Date will be skipped during import.' }))
              ),
              React.createElement('label', { className: 'flex items-center mb-2 cursor-pointer' },
                React.createElement('input', {
                  type: 'checkbox',
                  checked: importOptions.updateExisting,
                  onChange: (e) => setImportOptions({ ...importOptions, updateExisting: e.target.checked }),
                  className: 'mr-2'
                }),
                React.createElement('span', { className: 'text-sm flex items-center' }, 'Update existing contacts (match by email)', React.createElement(HelpTooltip, { text: 'If a contact with the same email exists, their info will be updated rather than creating a duplicate.' }))
              ),
              React.createElement('label', { className: 'flex items-center cursor-pointer' },
                React.createElement('input', {
                  type: 'checkbox',
                  checked: importOptions.sendAcknowledgments,
                  onChange: (e) => setImportOptions({ ...importOptions, sendAcknowledgments: e.target.checked }),
                  className: 'mr-2',
                  disabled: true
                }),
                React.createElement('span', { className: 'text-sm text-gray-400 flex items-center' }, 'Send acknowledgment emails after import (coming soon)', React.createElement(HelpTooltip, { text: 'This option will send thank-you emails after import in a future update.' }))
              )
            )
          ),

          // ----- STEP 3: PREVIEW & IMPORT -----
          currentStep === 3 && importStatus === 'preview' && React.createElement(
            'div',
            { className: 'import-step' },
            React.createElement('h3', { className: 'text-lg font-semibold mb-2' }, 'Step 3 of 3: Review & Confirm'),

            // Summary statistics
            React.createElement('div', { className: 'summary-stats grid grid-cols-2 gap-4 mb-4' },
              React.createElement('div', { className: 'stat-card bg-green-50 border border-green-200 rounded p-3' },
                React.createElement('div', { className: 'text-2xl font-bold text-green-600' },
                  `✓ ${transformedData.valid.length}`
                ),
                React.createElement('div', { className: 'text-sm text-green-700' },
                  'Rows ready to import'
                )
              ),

              transformedData.invalid.length > 0 && React.createElement('div', { className: 'stat-card bg-orange-50 border border-orange-200 rounded p-3' },
                React.createElement('div', { className: 'text-2xl font-bold text-orange-600' },
                  `⚠ ${transformedData.invalid.length}`
                ),
                React.createElement('div', { className: 'text-sm text-orange-700' },
                  'Rows with errors (will be skipped)'
                )
              ),

              React.createElement('div', { className: 'stat-card bg-blue-50 border border-blue-200 rounded p-3' },
                React.createElement('div', { className: 'text-2xl font-bold text-blue-600' },
                  newContactCount
                ),
                React.createElement('div', { className: 'text-sm text-blue-700' },
                  'New contacts'
                )
              ),

              React.createElement('div', { className: 'stat-card bg-purple-50 border border-purple-200 rounded p-3' },
                React.createElement('div', { className: 'text-2xl font-bold text-purple-600' },
                  updateContactCount
                ),
                React.createElement('div', { className: 'text-sm text-purple-700' },
                  'Contacts will be updated'
                )
              )
            ),

            // Preview table
            React.createElement('div', { className: 'preview-section mb-4' },
              React.createElement('h4', { className: 'font-semibold mb-2' }, 'Preview (first 5 rows):'),
              React.createElement('div', { className: 'preview-table max-h-64 overflow-auto border rounded' },
                React.createElement('table', { className: 'w-full text-sm' },
                  React.createElement('thead', { className: 'bg-gray-50 sticky top-0' },
                    React.createElement('tr', null,
                      React.createElement('th', { className: 'p-2 border-b text-left' }, 'Name'),
                      React.createElement('th', { className: 'p-2 border-b text-left' }, 'Email'),
                      React.createElement('th', { className: 'p-2 border-b text-right' }, 'Amount'),
                      React.createElement('th', { className: 'p-2 border-b text-left' }, 'Date'),
                      React.createElement('th', { className: 'p-2 border-b text-left' }, 'Campaign')
                    )
                  ),
                  React.createElement('tbody', null,
                    transformedData.valid.slice(0, 5).map((row, index) => (
                      React.createElement('tr', { key: index, className: 'border-b hover:bg-gray-50' },
                        React.createElement('td', { className: 'p-2' },
                          `${row.contact.firstName} ${row.contact.lastName}`
                        ),
                        React.createElement('td', { className: 'p-2 text-gray-600' },
                          row.contact.email || '—'
                        ),
                        React.createElement('td', { className: 'p-2 text-right font-semibold text-green-600' },
                          formatCurrency(row.donation.amount)
                        ),
                        React.createElement('td', { className: 'p-2 text-gray-600' },
                          formatDate(row.donation.date)
                        ),
                        React.createElement('td', { className: 'p-2 text-gray-600' },
                          row.donation.campaignName || 'General Fund'
                        )
                      )
                    ))
                  )
                )
              )
            ),

            // Invalid rows section
            transformedData.invalid.length > 0 && React.createElement('div', { className: 'invalid-rows mb-4' },
              React.createElement('button', {
                onClick: () => setShowInvalidRows(!showInvalidRows),
                className: 'w-full flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded hover:bg-orange-100'
              },
                React.createElement('span', { className: 'font-semibold text-orange-800' },
                  `⚠ ${transformedData.invalid.length} Rows with Errors`
                ),
                React.createElement('span', null, showInvalidRows ? '▼' : '▶')
              ),

              showInvalidRows && React.createElement('div', { className: 'mt-2 p-3 border rounded max-h-48 overflow-auto' },
                transformedData.invalid.slice(0, 10).map((row, index) => (
                  React.createElement('div', { key: index, className: 'mb-3 pb-3 border-b last:border-b-0' },
                    React.createElement('div', { className: 'text-sm font-medium' },
                      `Row ${row.rowNumber}: ${row.contact.firstName || '?'} ${row.contact.lastName || '?'}`
                    ),
                    React.createElement('div', { className: 'text-xs text-red-600 mt-1' },
                      row.errors.map((err, i) => (
                        React.createElement('div', { key: i }, `• ${err}`)
                      ))
                    )
                  )
                )),
                transformedData.invalid.length > 10 && React.createElement('button', {
                  onClick: handleDownloadErrorReport,
                  className: 'text-sm text-blue-600 hover:underline mt-2'
                },
                  `Download full error report (${transformedData.invalid.length} rows)`
                )
              )
            ),

            // Final confirmation
            React.createElement('div', { className: 'confirmation-notice p-3 bg-blue-50 border border-blue-200 rounded' },
              React.createElement('p', { className: 'text-sm text-blue-800' },
                React.createElement('strong', null, 'Ready to import: '),
                `This will create ${newContactCount} new contacts and ${transformedData.valid.length} donation records.`,
                importOptions.updateExisting && updateContactCount > 0 &&
                  ` ${updateContactCount} existing contacts will be updated.`
              ),
              transformedData.valid.length > 50 && React.createElement('p', { className: 'text-xs text-blue-600 mt-1' },
                `⏱ Estimated time: ~${Math.ceil(transformedData.valid.length / 50)} seconds`
              )
            )
          ),

          // ----- STEP 3: IMPORTING -----
          currentStep === 3 && importStatus === 'importing' && React.createElement(
            'div',
            { className: 'import-step text-center' },
            React.createElement('div', { className: 'importing-animation mb-4' },
              React.createElement('div', { className: 'text-6xl mb-4' }, '⏳'),
              React.createElement('h3', { className: 'text-xl font-semibold mb-2' }, 'Importing Donors...'),
              React.createElement('p', { className: 'text-gray-600 mb-4' },
                `Processing row ${importProgress.current} of ${importProgress.total}`
              )
            ),

            // Progress bar
            React.createElement('div', { className: 'progress-container w-full bg-gray-200 rounded-full h-4 mb-4' },
              React.createElement('div', {
                className: 'progress-bar bg-blue-600 h-4 rounded-full transition-all duration-300',
                style: { width: `${(importProgress.current / importProgress.total) * 100}%` }
              })
            ),

            React.createElement('p', { className: 'text-sm text-gray-500' },
              'Please don\'t close this window...'
            )
          ),

          // ----- STEP 3: COMPLETE -----
          currentStep === 3 && importStatus === 'complete' && React.createElement(
            'div',
            { className: 'import-step text-center' },
            React.createElement('div', { className: 'success-animation mb-4' },
              React.createElement('div', { className: 'text-6xl mb-4' }, '✓'),
              React.createElement('h3', { className: 'text-2xl font-bold text-green-600 mb-2' },
                'Import Complete!'
              )
            ),

            // Results summary
            React.createElement('div', { className: 'results-summary max-w-md mx-auto' },
              React.createElement('div', { className: 'grid grid-cols-2 gap-3 mb-4' },
                React.createElement('div', { className: 'stat-box bg-green-50 border border-green-200 rounded p-3' },
                  React.createElement('div', { className: 'text-2xl font-bold text-green-600' },
                    importResults.contactsCreated
                  ),
                  React.createElement('div', { className: 'text-sm text-green-700' }, 'New Contacts')
                ),
                React.createElement('div', { className: 'stat-box bg-blue-50 border border-blue-200 rounded p-3' },
                  React.createElement('div', { className: 'text-2xl font-bold text-blue-600' },
                    importResults.contactsUpdated
                  ),
                  React.createElement('div', { className: 'text-sm text-blue-700' }, 'Updated Contacts')
                ),
                React.createElement('div', { className: 'stat-box bg-purple-50 border border-purple-200 rounded p-3' },
                  React.createElement('div', { className: 'text-2xl font-bold text-purple-600' },
                    importResults.donationsCreated
                  ),
                  React.createElement('div', { className: 'text-sm text-purple-700' }, 'Donations Added')
                ),
                React.createElement('div', { className: 'stat-box bg-indigo-50 border border-indigo-200 rounded p-3' },
                  React.createElement('div', { className: 'text-2xl font-bold text-indigo-600' },
                    formatCurrency(importResults.totalAmount)
                  ),
                  React.createElement('div', { className: 'text-sm text-indigo-700' }, 'Total Contributions')
                )
              ),

              importResults.errors.length > 0 && React.createElement('div', { className: 'errors-notice bg-orange-50 border border-orange-200 rounded p-3 mb-4' },
                React.createElement('p', { className: 'text-sm text-orange-800 font-medium mb-2' },
                  `⚠ ${importResults.errors.length} rows failed to import`
                ),
                React.createElement('button', {
                  onClick: handleDownloadErrorReport,
                  className: 'text-sm text-orange-600 hover:underline'
                },
                  'Download error report'
                )
              )
            ),

            React.createElement('button', {
              onClick: handleGoToContacts,
              className: 'bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded mt-4'
            },
              'Go to Contact Database'
            )
          )
        ),
        // Footer
        React.createElement(
          'div',
          { className: 'p-4 border-t flex items-center justify-end gap-2' },
          currentStep === 1 && React.createElement(
            React.Fragment,
            null,
            React.createElement(
              'button',
              { onClick: onClose, className: 'bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded' },
              'Cancel'
            ),
            React.createElement(
              'button',
              {
                onClick: () => setCurrentStep(2),
                disabled: !parsedData.length || isProcessing,
                className: `px-4 py-2 rounded text-white ${!parsedData.length || isProcessing ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`,
              },
              'Next: Map Fields →'
            )
          ),
          currentStep === 2 && React.createElement(
            React.Fragment,
            null,
            React.createElement(
              'button',
              { onClick: () => setCurrentStep(1), className: 'bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded' },
              '← Back'
            ),
            React.createElement(
              'button',
              {
                onClick: handleProceedToPreview,
                disabled: mappingWarnings.some(w => w.includes('Required')),
                className: `px-4 py-2 rounded text-white ${mappingWarnings.some(w => w.includes('Required')) ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`,
              },
              'Preview Import →'
            )
          ),
          currentStep === 3 && importStatus === 'preview' && React.createElement(
            React.Fragment,
            null,
            React.createElement(
              'button',
              { onClick: () => setCurrentStep(2), className: 'bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded' },
              '← Back'
            ),
            React.createElement(
              'button',
              {
                onClick: handleStartImport,
                disabled: transformedData.valid.length === 0,
                className: `px-4 py-2 rounded text-white ${transformedData.valid.length === 0 ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`,
              },
              `Confirm Import (${transformedData.valid.length} rows)`
            )
          ),
          currentStep === 3 && importStatus === 'importing' && React.createElement(
            'div',
            { className: 'text-sm text-gray-500' },
            'Import in progress...'
          ),
          currentStep === 3 && importStatus === 'complete' && React.createElement(
            'button',
            { onClick: onClose, className: 'bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded w-full' },
            'Done'
          )
        )
      )
    );
  };

  // Export globally
  global.ImportDonorsModal = ImportDonorsModal;
})(window);
