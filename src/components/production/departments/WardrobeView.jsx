/**
 * WardrobeView - Wardrobe/Costume Department Tab for Productions
 * 
 * Features:
 * - View costumes organized by scene
 * - Import costumes from CSV/Excel files
 * - Support for "All" scenes and "Full Show" bulk imports
 * - Add, edit, and delete costumes
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
if (!document.getElementById('wardrobeview-print-styles')) {
  const styleEl = document.createElement('style');
  styleEl.id = 'wardrobeview-print-styles';
  styleEl.textContent = printStyles;
  document.head.appendChild(styleEl);
}

const { useState, useRef } = React;

function WardrobeView({ production, onSave, onUpdateScene }) {
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState(null);
  const [selectedWardrobe, setSelectedWardrobe] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterAct, setFilterAct] = useState('');
  const [checklistMode, setChecklistMode] = React.useState(false);
  const [checklistStatus, setChecklistStatus] = React.useState({});
  
  const fileInputRef = useRef(null);

  // Toggle selection for a single costume
  const toggleCostumeSelection = (actIndex, sceneIndex, costumeId) => {
    const key = `${actIndex}:${sceneIndex}:${costumeId}`;
    setSelectedWardrobe(prev => 
      prev.includes(key) 
        ? prev.filter(k => k !== key)
        : [...prev, key]
    );
  };

  // Count all costumes in production
  const getAllCostumesCount = () => {
    let count = 0;
    (production.acts || []).forEach(act => {
      (act.scenes || []).forEach(scene => {
        if (scene.wardrobe?.length) {
          count += scene.wardrobe.length;
        }
      });
    });
    return count;
  };

  // Select all costumes in current view
  const selectAllWardrobe = () => {
    const allKeys = [];
    (production.acts || []).forEach((act, actIndex) => {
      (act.scenes || []).forEach((scene, sceneIndex) => {
        if (scene.wardrobe?.length) {
          scene.wardrobe.forEach(costume => {
            allKeys.push(`${actIndex}:${sceneIndex}:${costume.id}`);
          });
        }
      });
    });
    setSelectedWardrobe(allKeys);
  };

  // Deselect all costumes
  const deselectAllWardrobe = () => {
    setSelectedWardrobe([]);
  };

  // Bulk delete selected costumes
  const bulkDeleteWardrobe = () => {
    if (selectedWardrobe.length === 0) return;
    
    if (!confirm(`Delete ${selectedWardrobe.length} selected costume${selectedWardrobe.length !== 1 ? 's' : ''}? This cannot be undone.`)) {
      return;
    }
    
    const updated = { ...production, acts: production.acts.map(a => ({ ...a })) };
    
    selectedWardrobe.forEach(key => {
      const [actIdx, sceneIdx, costumeId] = key.split(':');
      const ai = parseInt(actIdx);
      const si = parseInt(sceneIdx);
      if (updated.acts[ai]?.scenes[si]?.wardrobe) {
        updated.acts[ai].scenes[si].wardrobe = updated.acts[ai].scenes[si].wardrobe.filter(
          c => c.id !== parseFloat(costumeId)
        );
      }
    });
    
    window.productionsService?.updateProduction?.(production.id, { acts: updated.acts });
    setSelectedWardrobe([]);
  };

  // Filter costumes based on search and filters
  const filterWardrobe = (wardrobe, sceneAct) => {
    if (!wardrobe) return [];
    return wardrobe.filter(costume => {
      // Search filter (name, description, character, category)
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          (costume.description || '').toLowerCase().includes(query) ||
          (costume.pieces || '').toLowerCase().includes(query) ||
          (costume.character || '').toLowerCase().includes(query) ||
          (costume.category || '').toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }
      
      // Status filter
      if (filterStatus && costume.status !== filterStatus) {
        return false;
      }
      
      // Category filter
      if (filterCategory && costume.category !== filterCategory) {
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
        if (scene.wardrobe?.length) {
          scene.wardrobe.forEach(costume => {
            if (costume[field]) values.add(costume[field]);
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
    let costumesWithCost = 0;
    let totalCostumes = 0;
    
    (production.acts || []).forEach(act => {
      (act.scenes || []).forEach(scene => {
        if (scene.wardrobe?.length) {
          scene.wardrobe.forEach(costume => {
            totalCostumes++;
            if (costume.cost && !isNaN(parseFloat(costume.cost))) {
              totalCost += parseFloat(costume.cost);
              costumesWithCost++;
            }
          });
        }
      });
    });
    
    return {
      totalCost,
      costumesWithCost,
      totalCostumes,
      costumesWithoutCost: totalCostumes - costumesWithCost
    };
  };

  // Calculate cost for a specific scene
  const calculateSceneCost = (sceneWardrobe) => {
    if (!sceneWardrobe || !Array.isArray(sceneWardrobe)) return 0;
    return sceneWardrobe.reduce((sum, costume) => {
      const cost = parseFloat(costume.cost);
      return sum + (isNaN(cost) ? 0 : cost);
    }, 0);
  };

  const budgetTotals = calculateBudgetTotals();

  const getBudgetData = () => {
    const budget = window.budgetService?.getProductionBudget?.(production?.id);
    const dept = budget?.departments?.wardrobe || {};
    return {
      allocated: parseFloat(dept.allocated) || 0,
      spent: parseFloat(dept.spent) || 0,
      itemCount: dept.items?.length || 0
    };
  };
  const wardrobeBudget = getBudgetData();

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

      // Import the costumes
      const result = await importWardrobeFile(parsedData, production);
      setImportStatus(result);
      
      // Refresh the production data after import
      if (result.imported > 0) {
        window.location.reload(); // Simple refresh for now
      }

    } catch (error) {
      console.error('Import error:', error);
      setImportStatus({
        success: false,
        message: error.message || 'Failed to import costumes',
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

  const importWardrobeFile = async (data, production) => {
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
      const costumeData = {};
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
            costumeData.scene = value; // Save the original scene value
          } else if (field === 'act') {
            costumeData.act = value;
          } else {
            costumeData[field] = value;
          }
        }
      }
      
      // Debug: log what we extracted
      console.log(`Extracted: description="${costumeData.description}", act="${costumeData.act}", scene=${sceneNumber !== null ? sceneNumber : 'null'}`);
      
      if (!costumeData.description) {
        console.warn('Skipping row: missing costume description');
        skipped++;
        continue;
      }
      
      // Determine which scenes to add this costume to
      let targetScenes = [];
      
      // Check if Act is "Full Show" variant
      const actStr = String(costumeData.act || '').trim().toLowerCase();
      const isFullShow = ['full show', 'all acts', 'entire show', 'whole show'].includes(actStr);
      
      if (sceneNumber === 'all' || isFullShow) {
        // Add to all scenes (or all scenes in specific act)
        if (isFullShow || !costumeData.act) {
          // Add to ALL scenes in production
          updated.acts.forEach((act, actIdx) => {
            (act.scenes || []).forEach((scene, sceneIdx) => {
              targetScenes.push({ actIdx, sceneIdx });
            });
          });
          console.log(`Bulk import: Adding "${costumeData.description}" to ALL ${targetScenes.length} scenes`);
          bulkImports++;
        } else {
          // Add to all scenes in specified act
          updated.acts.forEach((act, actIdx) => {
            if (act.name === costumeData.act) {
              (act.scenes || []).forEach((scene, sceneIdx) => {
                targetScenes.push({ actIdx, sceneIdx });
              });
            }
          });
          console.log(`Bulk import: Adding "${costumeData.description}" to ${targetScenes.length} scenes in ${costumeData.act}`);
          if (targetScenes.length > 0) {
            bulkImports++;
          }
        }
        
        if (targetScenes.length === 0) {
          console.warn(`No scenes found for "${costumeData.description}" with act="${costumeData.act}". Skipping.`);
          skipped++;
          continue;
        }
      } else if (sceneNumber !== null && sceneNumber >= 0) {
        // Add to specific scene number (across all acts or specific act)
        if (costumeData.act) {
          // Find scene in specific act
          const actIdx = updated.acts.findIndex(a => a.name === costumeData.act);
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
          console.warn(`Invalid scene number ${sceneNumber + 1} for "${costumeData.description}". Skipping.`);
          skipped++;
          continue;
        }
      } else {
        console.warn(`Missing or invalid scene for "${costumeData.description}". Skipping.`);
        skipped++;
        continue;
      }
      
      // Add costume to all target scenes
      targetScenes.forEach(({ actIdx, sceneIdx }) => {
        if (!updated.acts[actIdx].scenes[sceneIdx].wardrobe) {
          updated.acts[actIdx].scenes[sceneIdx].wardrobe = [];
        }
        
        const costume = {
          id: Date.now() + Math.random(),
          description: costumeData.description,
          pieces: costumeData.pieces || '',
          category: costumeData.category || '',
          quickChange: costumeData.quickChange || '',
          changeTime: costumeData.changeTime || '',
          character: costumeData.character || '',
          sizeMeasurements: costumeData.sizeMeasurements || '',
          color: costumeData.color || '',
          status: costumeData.status || 'To Source',
          source: costumeData.source || '',
          cost: costumeData.cost || '',
          storage: costumeData.storage || '',
          checkoutDate: costumeData.checkoutDate || '',
          returnDate: costumeData.returnDate || '',
          condition: costumeData.condition || '',
          imageUrl: costumeData.imageUrl || '',
          scriptReference: costumeData.scriptReference || '',
          assignedTo: costumeData.assignedTo || ''
        };
        
        updated.acts[actIdx].scenes[sceneIdx].wardrobe.push(costume);
        imported++;
      });
    }
    
    // Save updated production
    if (imported > 0) {
      window.productionsService?.updateProduction?.(production.id, { acts: updated.acts });
    }
    
    // Return status with detailed statistics
    const message = bulkImports > 0
      ? `Successfully imported ${imported} costumes (${bulkImports} bulk imports). ${skipped} rows skipped.`
      : `Successfully imported ${imported} costumes. ${skipped} rows skipped.`;
    
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
      
      // Map common header variations to costume fields
      if (lower.match(/^(costume\s*)?desc/i)) map[lower] = 'description';
      else if (lower.match(/^pieces/i)) map[lower] = 'pieces';
      else if (lower.match(/^cat/i)) map[lower] = 'category';
      else if (lower.match(/^(quick\s*)?change/i)) map[lower] = 'quickChange';
      else if (lower.match(/^change\s*time/i)) map[lower] = 'changeTime';
      else if (lower.match(/^(character|actor)/i)) map[lower] = 'character';
      else if (lower.match(/^(size|measurement)/i)) map[lower] = 'sizeMeasurements';
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

  const handleAddCostume = (actIndex, sceneIndex) => {
    const newCostume = {
      id: Date.now(),
      description: '',
      pieces: '',
      category: '',
      status: 'To Source'
    };
    
    const updatedActs = [...production.acts];
    if (!updatedActs[actIndex].scenes[sceneIndex].wardrobe || !Array.isArray(updatedActs[actIndex].scenes[sceneIndex].wardrobe)) {
      updatedActs[actIndex].scenes[sceneIndex].wardrobe = { items: [], notes: '' };
    }
    if (!Array.isArray(updatedActs[actIndex].scenes[sceneIndex].wardrobe.items)) {
      updatedActs[actIndex].scenes[sceneIndex].wardrobe.items = [];
    }
    updatedActs[actIndex].scenes[sceneIndex].wardrobe.items.push(newCostume);
    
    window.productionsService?.updateProduction?.(production.id, { acts: updatedActs });
    onSave({ ...production, acts: updatedActs });
  };

  // Immediate update for React state (doesn't save to DB)
  const handleUpdateCostumeImmediate = (actIndex, sceneIndex, costumeId, field, value) => {
    console.log('handleUpdateCostumeImmediate:', { actIndex, sceneIndex, costumeId, field, value });
    
    const updatedActs = [...production.acts];
    const wardrobe = updatedActs[actIndex].scenes[sceneIndex].wardrobe || [];
    const costumeIndex = wardrobe.findIndex(c => c.id === costumeId);
    
    if (costumeIndex >= 0) {
      wardrobe[costumeIndex] = { ...wardrobe[costumeIndex], [field]: value };
      updatedActs[actIndex].scenes[sceneIndex].wardrobe = wardrobe;
      
      // Update production object in parent component's state without DB save
      // This allows React to re-render with the new value while typing
      if (typeof onUpdateScene === 'function') {
        onUpdateScene(actIndex, { ...production.acts[actIndex], scenes: updatedActs[actIndex].scenes });
      }
    }
  };

  // Full update that saves to productionsService (for blur/final save)
  const handleUpdateCostumeAndSave = (actIndex, sceneIndex, costumeId, field, value) => {
    console.log('handleUpdateCostumeAndSave:', { actIndex, sceneIndex, costumeId, field, value });
    
    const updatedActs = [...production.acts];
    const wardrobe = updatedActs[actIndex].scenes[sceneIndex].wardrobe || [];
    const costumeIndex = wardrobe.findIndex(c => c.id === costumeId);
    
    if (costumeIndex >= 0) {
      wardrobe[costumeIndex] = { ...wardrobe[costumeIndex], [field]: value };
      updatedActs[actIndex].scenes[sceneIndex].wardrobe = wardrobe;
      
      // Save to productionsService (persists to backend)
      if (window.productionsService?.updateProduction) {
        window.productionsService.updateProduction(production.id, { acts: updatedActs });
        console.log('Production saved to productionsService');
      } else {
        console.error('productionsService not available!');
      }
      
      // Also update parent component's state
      if (typeof onUpdateScene === 'function') {
        onUpdateScene(actIndex, { ...production.acts[actIndex], scenes: updatedActs[actIndex].scenes });
      }
    } else {
      console.error('Costume not found:', costumeId);
    }
  };

  const handleDeleteCostume = (actIndex, sceneIndex, costumeId) => {
    if (!confirm('Delete this costume?')) return;
    
    const updatedActs = [...production.acts];
    const wardrobe = updatedActs[actIndex].scenes[sceneIndex].wardrobe || [];
    updatedActs[actIndex].scenes[sceneIndex].wardrobe = wardrobe.filter(c => c.id !== costumeId);
    
    window.productionsService?.updateProduction?.(production.id, { acts: updatedActs });
  };

  // Checklist functions
  const toggleChecklistStatus = (costumeId, statusType) => {
    setChecklistStatus(prev => ({
      ...prev,
      [costumeId]: {
        ...prev[costumeId],
        [statusType]: !prev[costumeId]?.[statusType]
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

  // Export costumes to CSV
  const handleExportCSV = () => {
    console.log('Exporting costumes to CSV');
    
    // Collect all costumes with scene context
    const costumeData = [];
    
    production.acts.forEach((act, actIndex) => {
      act.scenes.forEach((scene, sceneIndex) => {
        if (scene.wardrobe && Array.isArray(scene.wardrobe)) {
          scene.wardrobe.forEach(costume => {
            // Apply current filters if any are active
            const matchesFilters = 
              (!searchQuery || 
                (costume.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (costume.pieces || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (costume.character || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (costume.category || '').toLowerCase().includes(searchQuery.toLowerCase())) &&
              (!filterStatus || costume.status === filterStatus) &&
              (!filterCategory || costume.category === filterCategory) &&
              (!filterAct || act.name === filterAct);
            
            if (matchesFilters) {
              costumeData.push({
                'Production Title': production.title || 'Untitled Production',
                'Act': act.name || `Act ${actIndex + 1}`,
                'Scene': scene.number || sceneIndex + 1,
                'Scene Label': scene.label || scene.title || '',
                'Costume Description': costume.description || '',
                'Pieces': costume.pieces || '',
                'Category': costume.category || '',
                'Quick Change': costume.quickChange || '',
                'Change Time': costume.changeTime || '',
                'Character': costume.character || '',
                'Size/Measurements': costume.sizeMeasurements || '',
                'Status': costume.status || '',
                'Color / Material': costume.color || '',
                'Source / Vendor': costume.source || '',
                'Cost': costume.cost || '',
                'Storage Location': costume.storage || '',
                'Check-out Date': costume.checkoutDate || '',
                'Return Date': costume.returnDate || '',
                'Condition Notes': costume.condition || '',
                'Image URL': costume.imageUrl || '',
                'Script Reference': costume.scriptReference || '',
                'Assigned To': costume.assignedTo || '',
                'Notes': costume.notes || ''
              });
            }
          });
        }
      });
    });
    
    if (costumeData.length === 0) {
      alert('No costumes to export. Add some costumes first or adjust your filters.');
      return;
    }
    
    // Convert to CSV
    const headers = Object.keys(costumeData[0]);
    const csvContent = [
      headers.join(','),
      ...costumeData.map(row => 
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
    const filename = `${productionName}_costumes_${date}.csv`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log(`Exported ${costumeData.length} costumes to ${filename}`);
  };

  const allScenes = getAllScenes();

  return React.createElement(
    'div',
    { className: 'space-y-4' },
    // Header with View Toggle
    React.createElement(
      'div',
      { className: 'flex items-center justify-between mb-4' },
      React.createElement('h3', { className: 'text-lg font-semibold text-gray-900' }, '👗 Wardrobe Department'),
      React.createElement(
        'div',
        { className: 'flex gap-2' },
        React.createElement(
          'button',
          {
            onClick: () => setChecklistMode(false),
            className: `px-4 py-2 text-sm font-medium rounded transition-colors ${
              !checklistMode 
                ? 'bg-rose-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`
          },
          '📋 Manager View'
        ),
        React.createElement(
          'button',
          {
            onClick: () => setChecklistMode(true),
            className: `px-4 py-2 text-sm font-medium rounded transition-colors ${
              checklistMode 
                ? 'bg-rose-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`
          },
          '✓ Checklist View'
        )
      )
    ),
    
    // Conditional rendering: Manager View vs Checklist View
    checklistMode ? 
      // CHECKLIST VIEW
      React.createElement(
        'div',
        { className: 'space-y-4' },
        // Checklist Title
        React.createElement(
          'div',
          { className: 'p-4 bg-pink-50 border border-pink-200 rounded-lg' },
          React.createElement('h2', { className: 'text-2xl font-bold text-pink-900 mb-1' }, '✓ Costume Checklist'),
          React.createElement('p', { className: 'text-sm text-pink-700' }, `${production.title || 'Production'} - ${allScenes.length} scenes`)
        ),
        // Checklist Controls
        React.createElement(
          'div',
          { className: 'flex gap-2' },
          React.createElement(
            'button',
            {
              onClick: handlePrintChecklist,
              className: 'px-4 py-2 bg-pink-600 text-white rounded hover:bg-pink-700 text-sm font-medium'
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
                React.createElement('th', { className: 'p-3 text-left font-semibold text-gray-700' }, 'Costume'),
                React.createElement('th', { className: 'p-3 text-left font-semibold text-gray-700' }, 'Character'),
                React.createElement('th', { className: 'p-3 text-center font-semibold text-gray-700 w-20' }, 'Ready'),
                React.createElement('th', { className: 'p-3 text-center font-semibold text-gray-700 w-20' }, 'Worn'),
                React.createElement('th', { className: 'p-3 text-center font-semibold text-gray-700 w-20' }, 'Returned')
              )
            ),
            // Table Body
            React.createElement(
              'tbody',
              null,
              allScenes.flatMap((scene, sceneIdx) => {
                const filteredWardrobe = scene.wardrobe ? filterWardrobe(scene.wardrobe, scene.act) : [];
                return filteredWardrobe.map((costume, costumeIdx) =>
                  React.createElement(
                    'tr',
                    { 
                      key: `${sceneIdx}-${costumeIdx}`,
                      className: 'border-b border-gray-200 hover:bg-pink-50 print:hover:bg-white'
                    },
                    React.createElement(
                      'td',
                      { className: 'p-3 text-sm text-gray-600' },
                      costumeIdx + 1
                    ),
                    React.createElement(
                      'td',
                      { className: 'p-3 text-sm font-semibold text-gray-800 whitespace-nowrap' },
                      `Act ${scene.act}, Scene ${scene.number}`
                    ),
                    React.createElement(
                      'td',
                      { className: 'p-3 text-sm text-gray-800 font-medium' },
                      costume.description
                    ),
                    React.createElement(
                      'td',
                      { className: 'p-3 text-sm text-gray-600' },
                      costume.character || '-'
                    ),
                    React.createElement(
                      'td',
                      { className: 'p-3 text-center' },
                      React.createElement('input', {
                        type: 'checkbox',
                        checked: checklistStatus[costume.id]?.ready || false,
                        onChange: () => toggleChecklistStatus(costume.id, 'ready'),
                        className: 'w-5 h-5 text-pink-600 rounded cursor-pointer print:appearance-none print:w-4 print:h-4 print:border print:border-gray-400'
                      })
                    ),
                    React.createElement(
                      'td',
                      { className: 'p-3 text-center' },
                      React.createElement('input', {
                        type: 'checkbox',
                        checked: checklistStatus[costume.id]?.onStage || false,
                        onChange: () => toggleChecklistStatus(costume.id, 'onStage'),
                        className: 'w-5 h-5 text-orange-600 rounded cursor-pointer print:appearance-none print:w-4 print:h-4 print:border print:border-gray-400'
                      })
                    ),
                    React.createElement(
                      'td',
                      { className: 'p-3 text-center' },
                      React.createElement('input', {
                        type: 'checkbox',
                        checked: checklistStatus[costume.id]?.returned || false,
                        onChange: () => toggleChecklistStatus(costume.id, 'returned'),
                        className: 'w-5 h-5 text-rose-600 rounded cursor-pointer print:appearance-none print:w-4 print:h-4 print:border print:border-gray-400'
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
      { className: 'mb-4 p-4 bg-gradient-to-r from-pink-50 to-rose-50 border border-pink-200 rounded-lg' },
      React.createElement(
        'div',
        { className: 'flex items-center justify-between' },
        React.createElement(
          'div',
          null,
          React.createElement('h3', { className: 'text-lg font-semibold text-gray-800 mb-1' }, '💰 Costume Budget'),
          React.createElement(
            'div',
            { className: 'flex items-center gap-4 text-sm text-gray-600' },
            React.createElement(
              'span',
              null,
              React.createElement('strong', null, budgetTotals.costumesWithCost),
              ' of ',
              React.createElement('strong', null, budgetTotals.totalCostumes),
              ' costumes have cost data'
            ),
            budgetTotals.costumesWithoutCost > 0 && React.createElement(
              'span',
              { className: 'text-amber-600' },
              `⚠️ ${budgetTotals.costumesWithoutCost} costumes missing cost`
            )
          )
        ),
        React.createElement(
          'div',
          { className: 'text-right' },
          React.createElement(
            'div',
            { className: 'text-3xl font-bold text-rose-700' },
            `$${wardrobeBudget.spent.toFixed(2)}`
          ),
          React.createElement('div', { className: 'text-xs text-gray-500' },
            wardrobeBudget.allocated > 0 ? 'of $' + wardrobeBudget.allocated.toFixed(2) + ' allocated' : 'Total Costume Cost'
          )
        )
      ),
      wardrobeBudget.allocated > 0 && React.createElement(
        'div',
        { className: 'mt-3' },
        React.createElement(
          'div',
          { className: 'w-full bg-rose-200 rounded-full h-2' },
          React.createElement('div', {
            className: 'h-2 rounded-full ' + (wardrobeBudget.spent > wardrobeBudget.allocated ? 'bg-red-500' : 'bg-rose-500'),
            style: { width: Math.min(100, (wardrobeBudget.spent / wardrobeBudget.allocated) * 100) + '%' }
          })
        ),
        React.createElement('div', { className: 'text-xs text-rose-700 mt-1' },
          wardrobeBudget.spent > wardrobeBudget.allocated
            ? 'Over budget'
            : '$' + (wardrobeBudget.allocated - wardrobeBudget.spent).toFixed(2) + ' remaining'
        )
      )
    ),
    
    // Bulk Actions Bar (shown when costumes are selected)
    selectedWardrobe.length > 0 && React.createElement(
      'div',
      { className: 'mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center justify-between' },
      React.createElement(
        'span',
        { className: 'text-sm font-medium text-rose-900' },
        `${selectedWardrobe.length} costume${selectedWardrobe.length !== 1 ? 's' : ''} selected`
      ),
      React.createElement(
        'div',
        { className: 'flex gap-2' },
        React.createElement(
          'button',
          {
            onClick: deselectAllWardrobe,
            className: 'px-3 py-1.5 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50'
          },
          'Deselect All'
        ),
        React.createElement(
          'button',
          {
            onClick: bulkDeleteWardrobe,
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
            placeholder: '🔍 Search costumes by description, pieces, character, or category...',
            value: searchQuery,
            onChange: (e) => setSearchQuery(e.target.value),
            className: 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent'
          })
        ),
        // Status Filter
        React.createElement(
          'select',
          {
            value: filterStatus,
            onChange: (e) => setFilterStatus(e.target.value),
            className: 'px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 bg-white'
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
            className: 'px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 bg-white'
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
            className: 'px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 bg-white'
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
            onClick: selectedWardrobe.length === getAllCostumesCount() ? deselectAllWardrobe : selectAllWardrobe,
            className: 'px-3 py-1.5 text-sm bg-gray-100 border border-gray-300 rounded hover:bg-gray-200'
          },
          selectedWardrobe.length === getAllCostumesCount() ? '☑️ Deselect All' : '☐ Select All'
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
          '📥 Export Costumes CSV'
        ),
        // Import CSV/Excel Button
        React.createElement(
          'button',
          {
            onClick: handleImportClick,
            disabled: importing,
            className: 'px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 font-medium'
          },
          importing ? '⏳ Importing...' : '📤 Import Costumes CSV'
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
        `${importStatus.bulkImports} costume${importStatus.bulkImports !== 1 ? 's' : ''} imported to multiple scenes`
      )
    ),
    
    // Filter indicator message
    hasActiveFilters && React.createElement(
      'div',
      { className: 'mb-3 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800' },
      'ℹ️ Export will include only the filtered costumes currently visible'
    ),
    
    // Costumes by scene
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
          { className: 'flex items-center justify-between mb-3' },
          React.createElement(
            'h4',
            { className: 'font-semibold text-gray-900' },
            `${scene.act} - Scene ${scene.number || scene.sceneIndex + 1}` +
            (scene.name ? `: ${scene.name}` : '')
          ),
          React.createElement(
            'div',
            { className: 'flex items-center gap-3' },
            scene.wardrobe && scene.wardrobe.length > 0 && React.createElement(
              'span',
              { className: 'text-sm text-gray-600' },
              `${filterWardrobe(scene.wardrobe, scene.act).length} costume${filterWardrobe(scene.wardrobe, scene.act).length !== 1 ? 's' : ''}`
            ),
            scene.wardrobe && calculateSceneCost(scene.wardrobe) > 0 && React.createElement(
              'span',
              { className: 'px-3 py-1 bg-pink-100 text-pink-700 rounded-full text-sm font-medium' },
              `$${calculateSceneCost(scene.wardrobe).toFixed(2)}`
            ),
            React.createElement(
              'button',
              {
                onClick: () => handleAddCostume(scene.actIndex, scene.sceneIndex),
                className: 'px-3 py-1 text-sm bg-rose-100 text-rose-700 rounded hover:bg-rose-200'
              },
              '+ Add Costume'
            )
          )
        ),
        
        // Costumes list
        (!scene.wardrobe || scene.wardrobe.length === 0) && React.createElement(
          'p',
          { className: 'text-gray-500 text-sm italic' },
          'No costumes for this scene yet.'
        ),
        
        scene.wardrobe && scene.wardrobe.length > 0 && React.createElement(
          'div',
          { className: 'space-y-2' },
          filterWardrobe(scene.wardrobe, scene.act).map(costume =>
            React.createElement(
              'div',
              { key: costume.id, className: 'relative flex items-start gap-3 p-3 bg-gray-50 rounded border border-gray-200' },
              // Checkbox for bulk selection
              React.createElement(
                'div',
                { className: 'absolute top-3 left-3' },
                React.createElement('input', {
                  type: 'checkbox',
                  checked: selectedWardrobe.includes(`${scene.actIndex}:${scene.sceneIndex}:${costume.id}`),
                  onChange: () => toggleCostumeSelection(scene.actIndex, scene.sceneIndex, costume.id),
                  className: 'w-5 h-5 text-rose-600 rounded border-gray-300 focus:ring-rose-500',
                  title: 'Select for bulk delete'
                })
              ),
              // Cost Badge
              costume.cost && !isNaN(parseFloat(costume.cost)) && React.createElement(
                'div',
                { 
                  className: `absolute top-3 right-10 px-2 py-1 rounded text-xs font-medium ${
                    parseFloat(costume.cost) > 50 
                      ? 'bg-red-100 text-red-700 border border-red-300' 
                      : 'bg-gray-100 text-gray-700'
                  }`
                },
                `$${parseFloat(costume.cost).toFixed(2)}`
              ),
              React.createElement(
                'div',
                { className: 'flex-1 space-y-2 ml-6' },
                // Description and pieces
                React.createElement('input', {
                  type: 'text',
                  value: costume.description || '',
                  onChange: (e) => handleUpdateCostumeAndSave(scene.actIndex, scene.sceneIndex, costume.id, 'description', e.target.value),
                  className: 'w-full px-2 py-1 border border-gray-300 rounded text-sm font-medium',
                  placeholder: 'Costume description'
                }),
                React.createElement('input', {
                  type: 'text',
                  value: costume.pieces || '',
                  onChange: (e) => handleUpdateCostumeAndSave(scene.actIndex, scene.sceneIndex, costume.id, 'pieces', e.target.value),
                  className: 'w-full px-2 py-1 border border-gray-300 rounded text-sm',
                  placeholder: 'Pieces/Items'
                }),
                // Category, Character, Status, Cost
                React.createElement(
                  'div',
                  { className: 'grid grid-cols-4 gap-2' },
                  React.createElement('input', {
                    type: 'text',
                    value: costume.category || '',
                    onChange: (e) => handleUpdateCostumeAndSave(scene.actIndex, scene.sceneIndex, costume.id, 'category', e.target.value),
                    className: 'px-2 py-1 border border-gray-300 rounded text-xs',
                    placeholder: 'Category'
                  }),
                  React.createElement('input', {
                    type: 'text',
                    value: costume.character || '',
                    onChange: (e) => handleUpdateCostumeAndSave(scene.actIndex, scene.sceneIndex, costume.id, 'character', e.target.value),
                    className: 'px-2 py-1 border border-gray-300 rounded text-xs',
                    placeholder: 'Character'
                  }),
                  React.createElement('select', {
                    value: costume.status || 'To Source',
                    onChange: (e) => handleUpdateCostumeAndSave(scene.actIndex, scene.sceneIndex, costume.id, 'status', e.target.value),
                    className: 'px-2 py-1 border border-gray-300 rounded text-xs bg-white'
                  },
                    React.createElement('option', { value: 'To Source' }, 'To Source'),
                    React.createElement('option', { value: 'In Progress' }, 'In Progress'),
                    React.createElement('option', { value: 'Acquired' }, 'Acquired'),
                    React.createElement('option', { value: 'Needs Repair' }, 'Needs Repair'),
                    React.createElement('option', { value: 'Ready' }, 'Ready'),
                    React.createElement('option', { value: 'Worn' }, 'Worn')
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
                      value: costume.cost || '',
                      
                      // Use immediate update while typing (no DB save)
                      onInput: (e) => {
                        console.log('onInput triggered:', e.target.value);
                        let cleanValue = e.target.value.replace(/[^\d.]/g, '');
                        const parts = cleanValue.split('.');
                        if (parts.length > 2) {
                          cleanValue = parts[0] + '.' + parts.slice(1).join('');
                        }
                        // Only update React state, don't save to DB yet
                        handleUpdateCostumeImmediate(scene.actIndex, scene.sceneIndex, costume.id, 'cost', cleanValue);
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
                        handleUpdateCostumeImmediate(scene.actIndex, scene.sceneIndex, costume.id, 'cost', cleanValue);
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
                          handleUpdateCostumeAndSave(scene.actIndex, scene.sceneIndex, costume.id, 'cost', formatted);
                        } else if (value === '') {
                          // If empty, save empty value
                          handleUpdateCostumeAndSave(scene.actIndex, scene.sceneIndex, costume.id, 'cost', '');
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
                      
                      className: 'w-full pr-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-rose-500 focus:border-rose-500 focus:outline-none',
                      
                      'aria-label': 'Cost',
                      'data-field': 'cost',
                      'data-testid': 'cost-input'
                    })
                  )
                )
              ),
              // Delete button
              React.createElement(
                'button',
                {
                  onClick: (e) => {
                    e.stopPropagation();
                    handleDeleteCostume(scene.actIndex, scene.sceneIndex, costume.id);
                  },
                  className: 'absolute top-3 right-3 text-gray-400 hover:text-red-600 transition-colors p-0'
                },
                '🗑️'
              )
            )
          )
        ),
        
        // No results message when filters are active
        scene.wardrobe && scene.wardrobe.length > 0 && filterWardrobe(scene.wardrobe, scene.act).length === 0 && React.createElement(
          'div',
          { className: 'p-4 text-center text-gray-500 bg-gray-50 rounded border border-gray-200' },
          'No costumes match the current filters'
        )
      )
    )
      )
  );
}

window.WardrobeView = WardrobeView;
