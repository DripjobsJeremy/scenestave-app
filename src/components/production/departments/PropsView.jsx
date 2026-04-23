/**
 * PropsView - Props Department Tab for Productions
 * 
 * Features:
 * - View props organized by scene
 * - Import props from CSV/Excel files
 * - Support for "All" scenes and "Full Show" bulk imports
 * - Add, edit, and delete props
 * - Print-friendly checklist view for run crew
 */

// Print styles for checklist view
const printStyles = `
  @media print {
    body {
      margin: 0;
      padding: 0.5in;
      font-size: 12pt;
    }
    
    .no-print {
      display: none !important;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      page-break-inside: avoid;
    }
    
    th, td {
      border: 1px solid #333;
      padding: 6pt 8pt;
      text-align: left;
    }
    
    th {
      background-color: #f3f4f6;
      font-weight: bold;
      page-break-after: avoid;
    }
    
    tr {
      page-break-inside: avoid;
    }
    
    input[type="checkbox"] {
      width: 14pt;
      height: 14pt;
      margin: 0;
    }
    
    button, .flex {
      display: none;
    }
    
    .print-visible {
      display: block;
    }
  }
`;

// Inject print styles
if (!document.getElementById('propsview-print-styles')) {
  const styleEl = document.createElement('style');
  styleEl.id = 'propsview-print-styles';
  styleEl.textContent = printStyles;
  document.head.appendChild(styleEl);
}

const { useState, useRef } = React;

function PropsView({ production, onSave, onUpdateScene }) {
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState(null);
  const [selectedProps, setSelectedProps] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterAct, setFilterAct] = useState('');
  const [checklistMode, setChecklistMode] = React.useState(false);
  const [checklistStatus, setChecklistStatus] = React.useState({});
  const [ghostLightMode, setGhostLightMode] = React.useState(false);
  const [lastSaved, setLastSaved] = useState(null);

  const showSaved = () => {
    setLastSaved(new Date());
    if (window.showToast) window.showToast('Changes saved', 'success', 2500);
  };

  const fileInputRef = useRef(null);

  // Toggle selection for a single prop
  const togglePropSelection = (actIndex, sceneIndex, propId) => {
    const key = `${actIndex}:${sceneIndex}:${propId}`;
    setSelectedProps(prev => 
      prev.includes(key) 
        ? prev.filter(k => k !== key)
        : [...prev, key]
    );
  };

  // Count all props in production
  const getAllPropsCount = () => {
    let count = 0;
    (production.acts || []).forEach(act => {
      (act.scenes || []).forEach(scene => {
        if (scene.props?.items?.length) {
          count += scene.props.items.length;
        }
      });
    });
    return count;
  };

  // Select all props in current view
  const selectAllProps = () => {
    const allKeys = [];
    (production.acts || []).forEach((act, actIndex) => {
      (act.scenes || []).forEach((scene, sceneIndex) => {
        if (scene.props?.items?.length) {
          scene.props.items.forEach(prop => {
            allKeys.push(`${actIndex}:${sceneIndex}:${prop.id}`);
          });
        }
      });
    });
    setSelectedProps(allKeys);
  };

  // Deselect all props
  const deselectAllProps = () => {
    setSelectedProps([]);
  };

  // Bulk delete selected props
  const bulkDeleteProps = () => {
    if (selectedProps.length === 0) return;
    
    if (!confirm(`Delete ${selectedProps.length} selected prop${selectedProps.length !== 1 ? 's' : ''}? This cannot be undone.`)) {
      return;
    }
    
    const updated = { ...production, acts: production.acts.map(a => ({ ...a })) };
    
    selectedProps.forEach(key => {
      const [actIdx, sceneIdx, propId] = key.split(':');
      const ai = parseInt(actIdx);
      const si = parseInt(sceneIdx);
      if (updated.acts[ai]?.scenes[si]?.props) {
        updated.acts[ai].scenes[si].props = updated.acts[ai].scenes[si].props.filter(
          p => p.id !== parseFloat(propId)
        );
      }
    });
    
    window.productionsService?.updateProduction?.(production.id, { acts: updated.acts });
    setSelectedProps([]);
  };

  // Filter props based on search and filters
  const filterProps = (props, sceneAct) => {
    if (!props) return [];
    return props.filter(prop => {
      // Search filter (name, description, character, category)
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          (prop.name || '').toLowerCase().includes(query) ||
          (prop.description || '').toLowerCase().includes(query) ||
          (prop.character || '').toLowerCase().includes(query) ||
          (prop.category || '').toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }
      
      // Status filter
      if (filterStatus && prop.status !== filterStatus) {
        return false;
      }
      
      // Category filter
      if (filterCategory && prop.category !== filterCategory) {
        return false;
      }
      
      // Act filter
      if (filterAct && sceneAct !== filterAct) {
        return false;
      }
      
      return true;
    });
  };

  // Get unique values for filter dropdowns
  const getUniqueValues = (field) => {
    const values = new Set();
    (production.acts || []).forEach(act => {
      (act.scenes || []).forEach(scene => {
        if (scene.props?.items?.length) {
          scene.props.items.forEach(prop => {
            if (prop[field]) values.add(prop[field]);
          });
        }
      });
    });
    return Array.from(values).sort();
  };

  const uniqueStatuses = getUniqueValues('status');
  const uniqueCategories = getUniqueValues('category');
  const uniqueActs = [...new Set((production.acts || []).map(a => a.name).filter(Boolean))];

  const hasActiveFilters = searchQuery || filterStatus || filterCategory || filterAct;

  const clearAllFilters = () => {
    setSearchQuery('');
    setFilterStatus('');
    setFilterCategory('');
    setFilterAct('');
  };

  // Calculate budget totals
  const calculateBudgetTotals = () => {
    let totalCost = 0;
    let propsWithCost = 0;
    let totalProps = 0;
    
    (production.acts || []).forEach(act => {
      (act.scenes || []).forEach(scene => {
        if (scene.props?.items?.length) {
          scene.props.items.forEach(prop => {
            totalProps++;
            if (prop.cost && !isNaN(parseFloat(prop.cost))) {
              totalCost += parseFloat(prop.cost);
              propsWithCost++;
            }
          });
        }
      });
    });
    
    return {
      totalCost,
      propsWithCost,
      totalProps,
      propsWithoutCost: totalProps - propsWithCost
    };
  };

  // Calculate cost for a specific scene
  const calculateSceneCost = (sceneProps) => {
    if (!sceneProps || !Array.isArray(sceneProps)) return 0;
    return sceneProps.reduce((sum, prop) => {
      const cost = parseFloat(prop.cost);
      return sum + (isNaN(cost) ? 0 : cost);
    }, 0);
  };

  const budgetTotals = calculateBudgetTotals();

  const getBudgetData = () => {
    const budget = window.budgetService?.getProductionBudget?.(production?.id);
    const dept = budget?.departments?.props || {};
    return {
      allocated: parseFloat(dept.allocated) || 0,
      spent: parseFloat(dept.spent) || 0,
      itemCount: dept.items?.length || 0
    };
  };
  const propsBudget = getBudgetData();

  // Flatten all scenes from all acts for display
  const getAllScenes = () => {
    const scenes = [];
    (production.acts || []).forEach((act, actIndex) => {
      (act.scenes || []).forEach((scene, sceneIndex) => {
        scenes.push({
          act: act.name || `Act ${actIndex + 1}`,
          actIndex,
          sceneIndex,
          ...scene
        });
      });
    });
    return scenes;
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportStatus(null);

    try {
      let parsedData;
      
      if (file.name.toLowerCase().endsWith('.csv')) {
        parsedData = await parseCSV(file);
      } else if (file.name.toLowerCase().match(/\.(xlsx|xls)$/)) {
        parsedData = await parseExcel(file);
      } else {
        throw new Error('Unsupported file type. Please use CSV or Excel files.');
      }

      if (!parsedData || parsedData.length === 0) {
        throw new Error('File is empty or could not be parsed.');
      }

      // Import the props
      const result = await importPropsFile(parsedData, production);
      setImportStatus(result);
      
      // Refresh the production data after import
      if (result.imported > 0) {
        window.location.reload(); // Simple refresh for now
      }

    } catch (error) {
      console.error('Import error:', error);
      setImportStatus({
        success: false,
        message: error.message || 'Failed to import props',
        imported: 0,
        skipped: 0
      });
    } finally {
      setImporting(false);
      e.target.value = ''; // Reset file input
    }
  };

  const parseCSV = (file) => {
    return new Promise((resolve, reject) => {
      const Papa = window.Papa;
      if (!Papa) {
        reject(new Error('PapaParse library not loaded'));
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const result = Papa.parse(e.target.result, {
            header: true,
            skipEmptyLines: true,
            transformHeader: (h) => (h || '').trim()
          });
          resolve(result.data);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  const parseExcel = (file) => {
    return new Promise((resolve, reject) => {
      const XLSX = window.XLSX;
      if (!XLSX) {
        reject(new Error('SheetJS (XLSX) library not loaded'));
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const json = XLSX.utils.sheet_to_json(worksheet, {
            raw: false,
            defval: ''
          });
          resolve(json);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  };

  const importPropsFile = async (data, production) => {
    const headerMap = buildHeaderMap(data[0]);
    
    let imported = 0;
    let skipped = 0;
    let bulkImports = 0;
    
    const updated = JSON.parse(JSON.stringify(production)); // Deep clone
    
    // Build scenes list for easier access
    const scenes = [];
    updated.acts.forEach(act => {
      (act.scenes || []).forEach(scene => {
        scenes.push({ act: act.name, scene });
      });
    });

    for (const row of data) {
      const propData = {};
      let sceneNumber = null;
      
      // Extract data from row based on header mapping
      for (const [rawHeader, value] of Object.entries(row)) {
        const header = rawHeader.trim().toLowerCase();
        const field = headerMap[header];
        if (field && value) {
          if (field === 'scene') {
            // Don't parse "All" as a number - keep it as a string
            const sceneStr = String(value).trim().toLowerCase();
            if (sceneStr === 'all' || sceneStr === 'all scenes') {
              sceneNumber = 'all';
            } else {
              sceneNumber = parseInt(value) - 1;
            }
            propData.scene = value; // Save the original scene value
          } else if (field === 'act') {
            propData.act = value;
          } else {
            propData[field] = value;
          }
        }
      }
      
      // Debug: log what we extracted
      console.log(`Extracted: name="${propData.name}", act="${propData.act}", scene=${sceneNumber !== null ? sceneNumber : 'null'}`);
      
      if (!propData.name) {
        console.warn('Skipping row: missing prop name');
        skipped++;
        continue;
      }
      
      // Determine which scenes to add this prop to
      let targetScenes = [];
      
      // Check if Act is "Full Show" variant
      const actStr = String(propData.act || '').trim().toLowerCase();
      const isFullShow = ['full show', 'all acts', 'entire show', 'whole show'].includes(actStr);
      
      if (sceneNumber === 'all' || isFullShow) {
        // Add to all scenes (or all scenes in specific act)
        if (isFullShow || !propData.act) {
          // Add to ALL scenes in production
          updated.acts.forEach((act, actIdx) => {
            (act.scenes || []).forEach((scene, sceneIdx) => {
              targetScenes.push({ actIdx, sceneIdx });
            });
          });
          console.log(`Bulk import: Adding "${propData.name}" to ALL ${targetScenes.length} scenes`);
          bulkImports++;
        } else {
          // Add to all scenes in specified act
          updated.acts.forEach((act, actIdx) => {
            if (act.name === propData.act) {
              (act.scenes || []).forEach((scene, sceneIdx) => {
                targetScenes.push({ actIdx, sceneIdx });
              });
            }
          });
          console.log(`Bulk import: Adding "${propData.name}" to ${targetScenes.length} scenes in ${propData.act}`);
          if (targetScenes.length > 0) {
            bulkImports++;
          }
        }
        
        if (targetScenes.length === 0) {
          console.warn(`No scenes found for "${propData.name}" with act="${propData.act}". Skipping.`);
          skipped++;
          continue;
        }
      } else if (sceneNumber !== null && sceneNumber >= 0) {
        // Add to specific scene number (across all acts or specific act)
        if (propData.act) {
          // Find scene in specific act
          const actIdx = updated.acts.findIndex(a => a.name === propData.act);
          if (actIdx >= 0 && updated.acts[actIdx].scenes?.[sceneNumber]) {
            targetScenes.push({ actIdx, sceneIdx: sceneNumber });
          }
        } else {
          // Find the Nth scene across all acts
          let globalSceneCount = 0;
          let found = false;
          for (let actIdx = 0; actIdx < updated.acts.length && !found; actIdx++) {
            const act = updated.acts[actIdx];
            for (let sceneIdx = 0; sceneIdx < (act.scenes || []).length && !found; sceneIdx++) {
              if (globalSceneCount === sceneNumber) {
                targetScenes.push({ actIdx, sceneIdx });
                found = true;
              }
              globalSceneCount++;
            }
          }
        }
        
        if (targetScenes.length === 0) {
          console.warn(`Invalid scene number ${sceneNumber + 1} for "${propData.name}". Skipping.`);
          skipped++;
          continue;
        }
      } else {
        console.warn(`Missing or invalid scene for "${propData.name}". Skipping.`);
        skipped++;
        continue;
      }
      
      // Add prop to all target scenes
      targetScenes.forEach(({ actIdx, sceneIdx }) => {
        if (!updated.acts[actIdx].scenes[sceneIdx].props) {
          updated.acts[actIdx].scenes[sceneIdx].props = [];
        }
        
        const prop = {
          id: Date.now() + Math.random(),
          name: propData.name,
          description: propData.description || '',
          category: propData.category || '',
          function: propData.function || '',
          character: propData.character || '',
          quantity: propData.quantity || '',
          dimensions: propData.dimensions || '',
          color: propData.color || '',
          status: propData.status || 'To Source',
          source: propData.source || '',
          cost: propData.cost || '',
          storage: propData.storage || '',
          checkoutDate: propData.checkoutDate || '',
          returnDate: propData.returnDate || '',
          condition: propData.condition || '',
          imageUrl: propData.imageUrl || '',
          scriptReference: propData.scriptReference || '',
          assignedTo: propData.assignedTo || ''
        };
        
        updated.acts[actIdx].scenes[sceneIdx].props.push(prop);
        imported++;
      });
    }
    
    // Save updated production
    if (imported > 0) {
      window.productionsService?.updateProduction?.(production.id, { acts: updated.acts });
    }
    
    // Return status with detailed statistics
    const message = bulkImports > 0
      ? `Successfully imported ${imported} props (${bulkImports} bulk imports). ${skipped} rows skipped.`
      : `Successfully imported ${imported} props. ${skipped} rows skipped.`;
    
    return {
      success: true,
      message,
      imported,
      skipped,
      bulkImports
    };
  };

  const buildHeaderMap = (firstRow) => {
    const map = {};
    for (const header of Object.keys(firstRow)) {
      const lower = header.trim().toLowerCase();
      
      // Map common header variations to prop fields
      if (lower.match(/^(prop\s*)?name$/i)) map[lower] = 'name';
      else if (lower.match(/^desc/i)) map[lower] = 'description';
      else if (lower.match(/^cat/i)) map[lower] = 'category';
      else if (lower.match(/^(function|use)/i)) map[lower] = 'function';
      else if (lower.match(/^(character|actor)/i)) map[lower] = 'character';
      else if (lower.match(/^quant/i)) map[lower] = 'quantity';
      else if (lower.match(/^dim/i)) map[lower] = 'dimensions';
      else if (lower.match(/^(color|colour|material)/i)) map[lower] = 'color';
      else if (lower.match(/^stat/i)) map[lower] = 'status';
      else if (lower.match(/^(source|vendor)/i)) map[lower] = 'source';
      else if (lower.match(/^(cost|price)/i)) map[lower] = 'cost';
      else if (lower.match(/^(storage|location)/i)) map[lower] = 'storage';
      else if (lower.match(/^check.*out/i)) map[lower] = 'checkoutDate';
      else if (lower.match(/^return/i)) map[lower] = 'returnDate';
      else if (lower.match(/^cond/i)) map[lower] = 'condition';
      else if (lower.match(/^image/i)) map[lower] = 'imageUrl';
      else if (lower.match(/^script/i)) map[lower] = 'scriptReference';
      else if (lower.match(/^assign/i)) map[lower] = 'assignedTo';
      else if (lower.match(/^scene/i)) map[lower] = 'scene';
      else if (lower.match(/^act/i)) map[lower] = 'act';
    }
    return map;
  };

  const handleAddProp = (actIndex, sceneIndex) => {
    const newProp = {
      id: Date.now(),
      name: '',
      description: '',
      category: '',
      status: 'To Source'
    };
    const updatedActs = production.acts.map((act, aIdx) => {
      if (aIdx !== actIndex) return act;
      return {
        ...act,
        scenes: act.scenes.map((scene, sIdx) => {
          if (sIdx !== sceneIndex) return scene;
          const existingItems = Array.isArray(scene.props?.items) ? scene.props.items : [];
          return {
            ...scene,
            props: {
              ...(scene.props || {}),
              items: [...existingItems, newProp]
            }
          };
        })
      };
    });
    if (window.productionsService?.updateProduction) {
      window.productionsService.updateProduction(production.id, { acts: updatedActs });
    }
    onSave({ ...production, acts: updatedActs });
    showSaved();
  };

  // Immediate update for React state (doesn't save to DB)
  const handleUpdatePropImmediate = (actIndex, sceneIndex, propId, field, value) => {
    const updatedActs = [...production.acts];
    const propsObj = updatedActs[actIndex].scenes[sceneIndex].props || { items: [], notes: '' };
    const items = Array.isArray(propsObj.items) ? [...propsObj.items] : [];
    const propIndex = items.findIndex(p => p.id === propId);
    if (propIndex >= 0) {
      items[propIndex] = { ...items[propIndex], [field]: value };
      updatedActs[actIndex].scenes[sceneIndex].props = { ...propsObj, items };
      if (typeof onUpdateScene === 'function') {
        onUpdateScene(actIndex, { ...production.acts[actIndex], scenes: updatedActs[actIndex].scenes });
      }
    }
  };

  // Full update that saves to productionsService (for blur/final save)
  const handleUpdatePropAndSave = (actIndex, sceneIndex, propId, field, value) => {
    const updatedActs = [...production.acts];
    const propsObj = updatedActs[actIndex].scenes[sceneIndex].props || { items: [], notes: '' };
    const items = Array.isArray(propsObj.items) ? [...propsObj.items] : [];
    const propIndex = items.findIndex(p => p.id === propId);
    if (propIndex >= 0) {
      items[propIndex] = { ...items[propIndex], [field]: value };
      updatedActs[actIndex].scenes[sceneIndex].props = { ...propsObj, items };
      if (window.productionsService?.updateProduction) {
        window.productionsService.updateProduction(production.id, { acts: updatedActs });
      }
      onSave({ ...production, acts: updatedActs });
      showSaved();
    }
  };

  const handleDeleteProp = (actIndex, sceneIndex, propId) => {
    if (!confirm('Delete this prop?')) return;

    const updatedActs = [...production.acts];
    const propsObj = updatedActs[actIndex].scenes[sceneIndex].props || { items: [], notes: '' };
    const items = Array.isArray(propsObj.items) ? propsObj.items.filter(p => p.id !== propId) : [];
    updatedActs[actIndex].scenes[sceneIndex].props = { ...propsObj, items };
    if (window.productionsService?.updateProduction) {
      window.productionsService.updateProduction(production.id, { acts: updatedActs });
    }
    onSave({ ...production, acts: updatedActs });
    showSaved();
  };

  // Checklist functions
  const toggleChecklistStatus = (propId, statusType) => {
    setChecklistStatus(prev => ({
      ...prev,
      [propId]: {
        ...prev[propId],
        [statusType]: !prev[propId]?.[statusType]
      }
    }));
  };

  const handlePrintChecklist = () => {
    window.print();
  };

  const resetChecklist = () => {
    if (confirm('Reset all checklist items? This will uncheck all boxes.')) {
      setChecklistStatus({});
    }
  };

  // Export props to CSV
  const handleExportCSV = () => {
    console.log('Exporting props to CSV');
    
    // Collect all props with scene context
    const propsData = [];
    
    production.acts.forEach((act, actIndex) => {
      act.scenes.forEach((scene, sceneIndex) => {
        if (scene.props && Array.isArray(scene.props.items)) {
          scene.props.items.forEach(prop => {
            // Apply current filters if any are active
            const matchesFilters = 
              (!searchQuery || 
                (prop.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (prop.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (prop.character || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (prop.category || '').toLowerCase().includes(searchQuery.toLowerCase())) &&
              (!filterStatus || prop.status === filterStatus) &&
              (!filterCategory || prop.category === filterCategory) &&
              (!filterAct || act.name === filterAct);
            
            if (matchesFilters) {
              propsData.push({
                'Production Title': production.title || 'Untitled Production',
                'Act': act.name || `Act ${actIndex + 1}`,
                'Scene': scene.number || sceneIndex + 1,
                'Scene Label': scene.label || scene.title || '',
                'Prop Name': prop.name || '',
                'Description': prop.description || '',
                'Category': prop.category || '',
                'Function / Use': prop.function || '',
                'Character': prop.character || '',
                'Quantity': prop.quantity || '',
                'Status': prop.status || '',
                'Dimensions': prop.dimensions || '',
                'Color / Material': prop.colorMaterial || '',
                'Source / Vendor': prop.source || '',
                'Cost': prop.cost || '',
                'Storage Location': prop.storageLocation || '',
                'Check-out Date': prop.checkoutDate || '',
                'Return Date': prop.returnDate || '',
                'Condition Notes': prop.conditionNotes || '',
                'Image URL': prop.imageUrl || '',
                'Script Reference': prop.scriptReference || '',
                'Assigned To': prop.assignedTo || '',
                'Notes': prop.notes || ''
              });
            }
          });
        }
      });
    });
    
    if (propsData.length === 0) {
      alert('No props to export. Add some props first or adjust your filters.');
      return;
    }
    
    // Convert to CSV
    const headers = Object.keys(propsData[0]);
    const csvContent = [
      headers.join(','),
      ...propsData.map(row => 
        headers.map(header => {
          const value = String(row[header] || '');
          // Escape quotes and wrap in quotes if contains comma, quote, or newline
          if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');
    
    // Create download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    const productionName = (production.title || 'Production').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const date = new Date().toISOString().split('T')[0];
    const filename = `${productionName}_props_${date}.csv`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log(`Exported ${propsData.length} props to ${filename}`);
  };

  const allScenes = getAllScenes();

  return React.createElement(
    'div',
    { className: 'space-y-4' },
    // Header with View Toggle
    React.createElement(
      'div',
      { className: 'flex items-center justify-between mb-4' },
      React.createElement('div', { className: 'flex items-baseline gap-2' },
        React.createElement('h3', { className: 'text-lg font-semibold text-gray-900' }, '🎭 Props Manager'),
        lastSaved && React.createElement('span', { className: 'text-xs text-gray-500 font-normal' },
          'Last saved: ' + lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        )
      ),
      React.createElement(
        'div',
        { className: 'flex gap-2' },
        React.createElement(
          'button',
          {
            onClick: () => { setChecklistMode(false); setGhostLightMode(false); },
            className: `px-4 py-2 text-sm font-medium rounded transition-colors ${
              !checklistMode && !ghostLightMode
                ? 'bg-violet-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`
          },
          '📋 Manager View'
        ),
        React.createElement(
          'button',
          {
            onClick: () => { setChecklistMode(true); setGhostLightMode(false); },
            className: `px-4 py-2 text-sm font-medium rounded transition-colors ${
              checklistMode && !ghostLightMode
                ? 'bg-violet-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`
          },
          '✓ Checklist View'
        ),
        React.createElement(
          'button',
          {
            onClick: () => setGhostLightMode(true),
            style: ghostLightMode
              ? { background: 'var(--color-bg-elevated)', color: 'var(--color-accent-gold)', border: '1px solid rgba(201,161,74,0.4)' }
              : { background: '', color: '' },
            className: `ghostlight-btn px-4 py-2 text-sm font-medium rounded transition-colors ${
              ghostLightMode
                ? ''
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`
          },
          React.createElement('span', {
  style: { position: 'relative', display: 'inline-flex', alignItems: 'center' },
  title: 'Get assistance from GhostLight AI'
},
  React.createElement('img', {
    src: 'assets/ghostlight/ghostlight-logo.png',
    alt: 'GhostLight AI',
    style: { height: '36px', width: '36px', objectFit: 'contain' }
  })
)
        )
      )
    ),

    // Conditional rendering: Ghost Light / Manager View / Checklist View
    ghostLightMode ?
      (() => {
        const features = [
          { title: '🔍 AI Prop Sourcer', desc: 'Find and price props from online vendors automatically' },
          { title: '🖼️ Props Visualizer', desc: 'Generate reference images for hard-to-find props' }
        ];
        return React.createElement(
          'div',
          { style: { background: '#1a1a2e', borderRadius: '12px', padding: '32px', minHeight: '400px', position: 'relative', overflow: 'hidden' } },
          React.createElement('img', { src: 'assets/ghostlight/ghostlight-brand.png', alt: '', style: { position: 'absolute', right: '24px', bottom: '24px', height: '40px', objectFit: 'contain', opacity: 0.25, pointerEvents: 'none' } }),
          React.createElement('div', { style: { marginBottom: '32px' } },
            React.createElement('img', { src: 'assets/ghostlight/ghostlight-brand.png', alt: 'GhostLight', style: { height: '56px', objectFit: 'contain', marginBottom: '8px' } }),
            React.createElement('p', { style: { color: 'var(--color-text-muted)', fontSize: '14px', margin: '0' } }, 'AI-powered tools for theatre professionals — coming soon')
          ),
          React.createElement(
            'div',
            { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px' } },
            features.map((feature, i) =>
              React.createElement('div', { key: i, style: { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '24px', position: 'relative' } },
                React.createElement('h3', { style: { fontSize: '15px', fontWeight: '600', color: 'var(--color-text-primary)', marginBottom: '8px', marginTop: '0', paddingRight: '32px' } }, feature.title),
                React.createElement('p', { style: { fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: '1.5', marginBottom: '16px', marginTop: '0' } }, feature.desc),
                React.createElement('span', { style: { display: 'inline-block', padding: '3px 10px', background: 'rgba(201,161,74,0.12)', border: '1px solid rgba(201,161,74,0.35)', borderRadius: '20px', fontSize: '11px', fontWeight: '500', color: 'var(--color-accent-gold)', letterSpacing: '0.5px' } }, 'Coming Soon'),
                React.createElement('img', { src: 'assets/ghostlight/ghostlight-brand.png', alt: '', style: { position: 'absolute', bottom: '10px', right: '10px', height: '28px', objectFit: 'contain', opacity: 0.25 } })
              )
            )
          )
        );
      })()
    : checklistMode ?
      // CHECKLIST VIEW
      React.createElement(
        'div',
        { className: 'space-y-4' },
        // Checklist Title
        React.createElement(
          'div',
          { className: 'p-4 bg-blue-50 border border-blue-200 rounded-lg' },
          React.createElement('h2', { className: 'text-2xl font-bold text-blue-900 mb-1' }, '✓ Props Checklist'),
          React.createElement('p', { className: 'text-sm text-blue-700' }, `${production.title || 'Production'} - ${allScenes.length} scenes`)
        ),
        // Checklist Controls
        React.createElement(
          'div',
          { className: 'flex gap-2' },
          React.createElement(
            'button',
            {
              onClick: handlePrintChecklist,
              className: 'px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium'
            },
            '🖨️ Print Checklist'
          ),
          React.createElement(
            'button',
            {
              onClick: resetChecklist,
              className: 'px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm font-medium'
            },
            '🔄 Reset All'
          )
        ),
        // Checklist Table
        React.createElement(
          'div',
          { className: 'overflow-x-auto' },
          React.createElement(
            'table',
            { className: 'w-full border-collapse print:text-xs' },
            // Table Header
            React.createElement(
              'thead',
              null,
              React.createElement(
                'tr',
                { className: 'border-b-2 border-gray-300 bg-gray-100' },
                React.createElement('th', { className: 'p-3 text-left font-semibold text-gray-700 w-10' }, '#'),
                React.createElement('th', { className: 'p-3 text-left font-semibold text-gray-700' }, 'Scene'),
                React.createElement('th', { className: 'p-3 text-left font-semibold text-gray-700' }, 'Prop Name'),
                React.createElement('th', { className: 'p-3 text-left font-semibold text-gray-700' }, 'Character'),
                React.createElement('th', { className: 'p-3 text-center font-semibold text-gray-700 w-20' }, 'Ready'),
                React.createElement('th', { className: 'p-3 text-center font-semibold text-gray-700 w-20' }, 'On Stage'),
                React.createElement('th', { className: 'p-3 text-center font-semibold text-gray-700 w-20' }, 'Returned')
              )
            ),
            // Table Body
            React.createElement(
              'tbody',
              null,
              allScenes.flatMap((scene, sceneIdx) => {
                const filteredProps = scene.props?.items ? filterProps(scene.props.items, scene.act) : [];
                return filteredProps.map((prop, propIdx) =>
                  React.createElement(
                    'tr',
                    { 
                      key: `${sceneIdx}-${propIdx}`,
                      className: 'border-b border-gray-200 hover:bg-blue-50 print:hover:bg-white'
                    },
                    React.createElement(
                      'td',
                      { className: 'p-3 text-sm text-gray-600' },
                      propIdx + 1
                    ),
                    React.createElement(
                      'td',
                      { className: 'p-3 text-sm font-semibold text-gray-800 whitespace-nowrap' },
                      (() => {
                        const actLabel = scene.act || 'Act ?';
                        const sceneLabel = scene.name || scene.title || `Scene ${scene.number || sceneIdx + 1}`;
                        return `${actLabel} – ${sceneLabel}`;
                      })()
                    ),
                    React.createElement(
                      'td',
                      { className: 'p-3 text-sm text-gray-800 font-medium' },
                      prop.name
                    ),
                    React.createElement(
                      'td',
                      { className: 'p-3 text-sm text-gray-600' },
                      prop.character || '-'
                    ),
                    React.createElement(
                      'td',
                      { className: 'p-3 text-center' },
                      React.createElement('input', {
                        type: 'checkbox',
                        checked: checklistStatus[prop.id]?.ready || false,
                        onChange: () => toggleChecklistStatus(prop.id, 'ready'),
                        className: 'w-5 h-5 text-blue-600 rounded cursor-pointer print:appearance-none print:w-4 print:h-4 print:border print:border-gray-400'
                      })
                    ),
                    React.createElement(
                      'td',
                      { className: 'p-3 text-center' },
                      React.createElement('input', {
                        type: 'checkbox',
                        checked: checklistStatus[prop.id]?.onStage || false,
                        onChange: () => toggleChecklistStatus(prop.id, 'onStage'),
                        className: 'w-5 h-5 text-green-600 rounded cursor-pointer print:appearance-none print:w-4 print:h-4 print:border print:border-gray-400'
                      })
                    ),
                    React.createElement(
                      'td',
                      { className: 'p-3 text-center' },
                      React.createElement('input', {
                        type: 'checkbox',
                        checked: checklistStatus[prop.id]?.returned || false,
                        onChange: () => toggleChecklistStatus(prop.id, 'returned'),
                        className: 'w-5 h-5 text-purple-600 rounded cursor-pointer print:appearance-none print:w-4 print:h-4 print:border print:border-gray-400'
                      })
                    )
                  )
                );
              })
            )
          )
        )
      )
    :
      // MANAGER VIEW
      React.createElement(
        'div',
        { className: 'space-y-4' },
        // Budget Summary Card
    React.createElement(
      'div',
      { className: 'mb-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg' },
      React.createElement(
        'div',
        { className: 'flex items-center justify-between' },
        React.createElement(
          'div',
          null,
          React.createElement('h3', { className: 'text-lg font-semibold text-gray-800 mb-1' }, '💰 Props Budget'),
          React.createElement(
            'div',
            { className: 'flex items-center gap-4 text-sm text-gray-600' },
            React.createElement(
              'span',
              null,
              React.createElement('strong', null, budgetTotals.propsWithCost),
              ' of ',
              React.createElement('strong', null, budgetTotals.totalProps),
              ' props have cost data'
            ),
            budgetTotals.propsWithoutCost > 0 && React.createElement(
              'span',
              { className: 'text-amber-600' },
              `⚠️ ${budgetTotals.propsWithoutCost} props missing cost`
            )
          )
        ),
        React.createElement(
          'div',
          { className: 'text-right' },
          React.createElement(
            'div',
            { className: 'text-3xl font-bold text-green-700' },
            `$${propsBudget.spent.toFixed(2)}`
          ),
          React.createElement('div', { className: 'text-xs text-gray-500' },
            propsBudget.allocated > 0 ? 'of $' + propsBudget.allocated.toFixed(2) + ' allocated' : 'Total Props Cost'
          )
        )
      ),
      propsBudget.allocated > 0 && React.createElement(
        'div',
        { className: 'mt-3' },
        React.createElement(
          'div',
          { className: 'w-full bg-green-200 rounded-full h-2' },
          React.createElement('div', {
            className: 'h-2 rounded-full ' + (propsBudget.spent > propsBudget.allocated ? 'bg-red-500' : 'bg-green-500'),
            style: { width: Math.min(100, (propsBudget.spent / propsBudget.allocated) * 100) + '%' }
          })
        ),
        React.createElement('div', { className: 'text-xs text-green-700 mt-1' },
          propsBudget.spent > propsBudget.allocated
            ? 'Over budget'
            : '$' + (propsBudget.allocated - propsBudget.spent).toFixed(2) + ' remaining'
        )
      )
    ),
    
    // Bulk Actions Bar (shown when props are selected)
    selectedProps.length > 0 && React.createElement(
      'div',
      { className: 'mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg flex items-center justify-between' },
      React.createElement(
        'span',
        { className: 'text-sm font-medium text-purple-900' },
        `${selectedProps.length} prop${selectedProps.length !== 1 ? 's' : ''} selected`
      ),
      React.createElement(
        'div',
        { className: 'flex gap-2' },
        React.createElement(
          'button',
          {
            onClick: deselectAllProps,
            className: 'px-3 py-1.5 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50'
          },
          'Deselect All'
        ),
        React.createElement(
          'button',
          {
            onClick: bulkDeleteProps,
            className: 'px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700'
          },
          '🗑️ Delete Selected'
        )
      )
    ),
    
    // Search and Filter Bar
    React.createElement(
      'div',
      { className: 'mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg' },
      React.createElement(
        'div',
        { className: 'grid grid-cols-1 md:grid-cols-4 gap-3 mb-3' },
        // Search Input
        React.createElement(
          'div',
          { className: 'md:col-span-2' },
          React.createElement('input', {
            type: 'text',
            placeholder: '🔍 Search props by name, description, character, or category...',
            value: searchQuery,
            onChange: (e) => setSearchQuery(e.target.value),
            className: 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent'
          })
        ),
        // Status Filter
        React.createElement(
          'select',
          {
            value: filterStatus,
            onChange: (e) => setFilterStatus(e.target.value),
            className: 'px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white'
          },
          React.createElement('option', { value: '' }, 'All Statuses'),
          uniqueStatuses.map(status =>
            React.createElement('option', { key: status, value: status }, status)
          )
        ),
        // Category Filter
        React.createElement(
          'select',
          {
            value: filterCategory,
            onChange: (e) => setFilterCategory(e.target.value),
            className: 'px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white'
          },
          React.createElement('option', { value: '' }, 'All Categories'),
          uniqueCategories.map(category =>
            React.createElement('option', { key: category, value: category }, category)
          )
        )
      ),
      React.createElement(
        'div',
        { className: 'flex items-center justify-between' },
        // Act Filter
        React.createElement(
          'select',
          {
            value: filterAct,
            onChange: (e) => setFilterAct(e.target.value),
            className: 'px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white'
          },
          React.createElement('option', { value: '' }, 'All Acts'),
          uniqueActs.map(act =>
            React.createElement('option', { key: act, value: act }, act)
          )
        ),
        // Clear Filters Button
        hasActiveFilters && React.createElement(
          'button',
          {
            onClick: clearAllFilters,
            className: 'px-3 py-1.5 text-sm bg-gray-200 hover:bg-gray-300 rounded-lg'
          },
          '✕ Clear Filters'
        )
      )
    ),
    
    // Import/Export Button Bar
    React.createElement(
      'div',
      { className: 'mb-4 flex items-center justify-between gap-3' },
      React.createElement(
        'div',
        { className: 'flex gap-2' },
        // Select All Button
        React.createElement(
          'button',
          {
            onClick: selectedProps.length === getAllPropsCount() ? deselectAllProps : selectAllProps,
            className: 'px-3 py-1.5 text-sm bg-gray-100 border border-gray-300 rounded hover:bg-gray-200'
          },
          selectedProps.length === getAllPropsCount() ? '☑️ Deselect All' : '☐ Select All'
        ),
        // Show filter indicator if filters active
        hasActiveFilters && React.createElement(
          'span',
          { className: 'px-3 py-1.5 text-sm bg-blue-50 text-blue-700 border border-blue-200 rounded' },
          'Filters Active'
        )
      ),
      React.createElement(
        'div',
        { className: 'flex gap-2' },
        // Export CSV Button
        React.createElement(
          'button',
          {
            onClick: handleExportCSV,
            className: 'px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 font-medium'
          },
          '📥 Export CSV'
        ),
        // Import CSV/Excel Button
        React.createElement(
          'button',
          {
            onClick: handleImportClick,
            disabled: importing,
            className: 'px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 font-medium'
          },
          importing ? '⏳ Importing...' : '📤 Import CSV/Excel'
        )
      )
    ),
    
    // Hidden file input
    React.createElement('input', {
      ref: fileInputRef,
      type: 'file',
      accept: '.csv,.xlsx,.xls',
      onChange: handleFileSelect,
      className: 'hidden'
    }),
    
    // Import status message
    importStatus && React.createElement(
      'div',
      { className: `p-4 rounded-lg ${importStatus.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}` },
      React.createElement(
        'p',
        { className: `${importStatus.success ? 'text-green-800' : 'text-red-800'}` },
        importStatus.message
      ),
      importStatus.success && importStatus.bulkImports > 0 && React.createElement(
        'p',
        { className: 'text-green-700 text-sm mt-1' },
        `${importStatus.bulkImports} prop${importStatus.bulkImports !== 1 ? 's' : ''} imported to multiple scenes`
      )
    ),
    
    // Filter indicator message
    hasActiveFilters && React.createElement(
      'div',
      { className: 'mb-3 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800' },
      'ℹ️ Export will include only the filtered props currently visible'
    ),
    
    // Props by scene
    allScenes.length === 0 && React.createElement(
      'div',
      { className: 'bg-gray-50 border border-gray-200 rounded-lg p-8 text-center' },
      React.createElement('p', { className: 'text-gray-600' }, 'No scenes defined yet. Add scenes in the Scenes tab first.')
    ),
    
    allScenes.map((scene, idx) =>
      React.createElement(
        'div',
        { key: idx, className: 'bg-white border border-gray-200 rounded-lg p-4' },
        // Scene header
        React.createElement(
          'div',
          { className: 'flex flex-wrap items-start justify-between gap-2 mb-3' },
          React.createElement(
            'h4',
            { className: 'font-semibold text-gray-900' },
            `${scene.act} - Scene ${scene.number || scene.sceneIndex + 1}` +
            (scene.name ? `: ${scene.name}` : '')
          ),
          React.createElement(
            'div',
            { className: 'flex items-center gap-2 flex-shrink-0' },
            scene.props?.items && scene.props.items.length > 0 && React.createElement(
              'span',
              { className: 'text-sm text-gray-600' },
              `${filterProps(scene.props.items, scene.act).length} prop${filterProps(scene.props.items, scene.act).length !== 1 ? 's' : ''}`
            ),
            scene.props?.items && calculateSceneCost(scene.props.items) > 0 && React.createElement(
              'span',
              { className: 'px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium' },
              `$${calculateSceneCost(scene.props.items).toFixed(2)}`
            ),
            React.createElement(
              'button',
              {
                onClick: () => handleAddProp(scene.actIndex, scene.sceneIndex),
                className: 'px-3 py-1 text-sm bg-violet-100 text-violet-700 rounded hover:bg-violet-200'
              },
              '+ Add Prop'
            )
          )
        ),
        
        // Props list
        (!scene.props?.items || scene.props.items.length === 0) && React.createElement(
          'p',
          { className: 'text-gray-500 text-sm italic' },
          'No props for this scene yet.'
        ),

        scene.props?.items && scene.props.items.length > 0 && React.createElement(
          'div',
          { className: 'space-y-2' },
          filterProps(scene.props.items, scene.act).map(prop =>
            React.createElement(
              'div',
              { key: prop.id, className: 'flex flex-col gap-2 p-3 bg-gray-50 rounded border border-gray-200' },
              // Top row: checkbox, name, cost badge, delete
              React.createElement(
                'div',
                { className: 'flex items-center gap-2' },
                React.createElement('input', {
                  type: 'checkbox',
                  checked: selectedProps.includes(`${scene.actIndex}:${scene.sceneIndex}:${prop.id}`),
                  onChange: () => togglePropSelection(scene.actIndex, scene.sceneIndex, prop.id),
                  className: 'w-5 h-5 flex-shrink-0 text-purple-600 rounded border-gray-300 focus:ring-purple-500',
                  title: 'Select for bulk delete'
                }),
                React.createElement('input', {
                  type: 'text',
                  value: prop.name || '',
                  onChange: (e) => handleUpdatePropAndSave(scene.actIndex, scene.sceneIndex, prop.id, 'name', e.target.value),
                  className: 'flex-1 min-w-0 px-2 py-1 border border-gray-300 rounded text-sm font-medium',
                  placeholder: 'Prop name'
                }),
                prop.cost && !isNaN(parseFloat(prop.cost)) && React.createElement(
                  'span',
                  {
                    className: `flex-shrink-0 px-2 py-1 rounded text-xs font-medium ${
                      parseFloat(prop.cost) > 50
                        ? 'bg-red-100 text-red-700 border border-red-300'
                        : 'bg-gray-100 text-gray-700'
                    }`
                  },
                  `$${parseFloat(prop.cost).toFixed(2)}`
                ),
                React.createElement(
                  'button',
                  {
                    onClick: (e) => {
                      e.stopPropagation();
                      handleDeleteProp(scene.actIndex, scene.sceneIndex, prop.id);
                    },
                    className: 'flex-shrink-0 text-gray-400 hover:text-red-600 transition-colors p-0'
                  },
                  '🗑️'
                )
              ),
              // Remaining fields
              React.createElement(
                'div',
                { className: 'space-y-2' },
                // Description
                React.createElement('input', {
                  type: 'text',
                  value: prop.description || '',
                  onChange: (e) => handleUpdatePropAndSave(scene.actIndex, scene.sceneIndex, prop.id, 'description', e.target.value),
                  className: 'w-full px-2 py-1 border border-gray-300 rounded text-sm',
                  placeholder: 'Description'
                }),
                // Category, Character, Status, Cost
                React.createElement(
                  'div',
                  { className: 'grid grid-cols-2 gap-2' },
                  React.createElement('input', {
                    type: 'text',
                    value: prop.category || '',
                    onChange: (e) => handleUpdatePropAndSave(scene.actIndex, scene.sceneIndex, prop.id, 'category', e.target.value),
                    className: 'px-2 py-1 border border-gray-300 rounded text-xs',
                    placeholder: 'Category'
                  }),
                  React.createElement('input', {
                    type: 'text',
                    value: prop.character || '',
                    onChange: (e) => handleUpdatePropAndSave(scene.actIndex, scene.sceneIndex, prop.id, 'character', e.target.value),
                    className: 'px-2 py-1 border border-gray-300 rounded text-xs',
                    placeholder: 'Character'
                  }),
                  React.createElement('select', {
                    value: prop.status || 'To Source',
                    onChange: (e) => handleUpdatePropAndSave(scene.actIndex, scene.sceneIndex, prop.id, 'status', e.target.value),
                    className: 'px-2 py-1 border border-gray-300 rounded text-xs bg-white'
                  },
                    React.createElement('option', { value: 'To Source' }, 'To Source'),
                    React.createElement('option', { value: 'In Progress' }, 'In Progress'),
                    React.createElement('option', { value: 'Acquired' }, 'Acquired'),
                    React.createElement('option', { value: 'Needs Repair' }, 'Needs Repair'),
                    React.createElement('option', { value: 'Ready' }, 'Ready'),
                    React.createElement('option', { value: 'On Stage' }, 'On Stage')
                  ),
                  // Cost field
                  React.createElement(
                    'div',
                    { className: 'relative' },
                    React.createElement('span', { 
                      className: 'absolute left-2 top-2 text-gray-500 text-xs pointer-events-none z-10' 
                    }, '$'),
                    React.createElement('input', {
                      type: 'text',
                      inputMode: 'decimal',
                      placeholder: '0.00',
                      value: prop.cost || '',
                      
                      // Use immediate update while typing (no DB save)
                      onInput: (e) => {
                        console.log('onInput triggered:', e.target.value);
                        let cleanValue = e.target.value.replace(/[^\d.]/g, '');
                        const parts = cleanValue.split('.');
                        if (parts.length > 2) {
                          cleanValue = parts[0] + '.' + parts.slice(1).join('');
                        }
                        // Only update React state, don't save to DB yet
                        handleUpdatePropImmediate(scene.actIndex, scene.sceneIndex, prop.id, 'cost', cleanValue);
                      },
                      
                      // Backup onChange handler
                      onChange: (e) => {
                        console.log('onChange triggered:', e.target.value);
                        let cleanValue = e.target.value.replace(/[^\d.]/g, '');
                        const parts = cleanValue.split('.');
                        if (parts.length > 2) {
                          cleanValue = parts[0] + '.' + parts.slice(1).join('');
                        }
                        // Only update React state, don't save to DB yet
                        handleUpdatePropImmediate(scene.actIndex, scene.sceneIndex, prop.id, 'cost', cleanValue);
                      },
                      
                      // Capture all key presses to debug keyboard input
                      onKeyDown: (e) => {
                        console.log('Key pressed:', e.key);
                        e.stopPropagation(); // Prevent parent handlers from interfering
                        
                        // Allow: backspace, delete, tab, escape, enter, decimal point, arrow keys
                        const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', '.'];
                        
                        // Allow numbers 0-9
                        if ((e.key >= '0' && e.key <= '9') || allowedKeys.includes(e.key)) {
                          return; // Allow the key
                        }
                        
                        // Allow Ctrl+C, Ctrl+V, Ctrl+A, Ctrl+X, Cmd+C, Cmd+V, Cmd+A, Cmd+X
                        if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'a', 'x'].includes(e.key.toLowerCase())) {
                          return; // Allow the key
                        }
                        
                        // Block all other keys
                        e.preventDefault();
                      },
                      
                      // Prevent click from being intercepted by parent
                      onClick: (e) => {
                        console.log('Input clicked');
                        e.stopPropagation();
                      },
                      
                      // Prevent mousedown from being intercepted by parent
                      onMouseDown: (e) => {
                        console.log('Input mousedown');
                        e.stopPropagation();
                      },
                      
                      onFocus: (e) => {
                        console.log('Cost input focused');
                        e.stopPropagation();
                        e.target.select();
                      },
                      
                      // IMPORTANT: Only save to DB on blur (when done typing)
                      onBlur: (e) => {
                        console.log('Input blur, value:', e.target.value);
                        const value = e.target.value.trim();
                        if (value && !isNaN(parseFloat(value))) {
                          const formatted = parseFloat(value).toFixed(2);
                          // Now we save to productionsService
                          handleUpdatePropAndSave(scene.actIndex, scene.sceneIndex, prop.id, 'cost', formatted);
                        } else if (value === '') {
                          // If empty, save empty value
                          handleUpdatePropAndSave(scene.actIndex, scene.sceneIndex, prop.id, 'cost', '');
                        }
                      },
                      
                      // Explicitly mark as editable
                      contentEditable: false, // Don't use contentEditable, use input's natural editability
                      readOnly: false,
                      disabled: false,
                      tabIndex: 0,
                      
                      style: { 
                        paddingLeft: '1.5rem',
                        cursor: 'text',
                        backgroundColor: 'white',
                        pointerEvents: 'auto', // Ensure pointer events work
                        userSelect: 'text' // Allow text selection
                      },
                      
                      className: 'w-full pr-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:outline-none',
                      
                      'aria-label': 'Cost',
                      'data-field': 'cost',
                      'data-testid': 'cost-input'
                    })
                  )
                )
              )
            )
          )
        ),

        // No results message when filters are active
        scene.props?.items && scene.props.items.length > 0 && filterProps(scene.props.items, scene.act).length === 0 && React.createElement(
          'div',
          { className: 'p-4 text-center text-gray-500 bg-gray-50 rounded border border-gray-200' },
          'No props match the current filters'
        )
      )
    )
      )
  );
}

window.PropsView = PropsView;
