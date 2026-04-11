/**
 * SetDesignView - Set Design & Scene Shop Management
 * 
 * Features:
 * - Track set pieces as construction projects
 * - Construction-specific fields: materials, weight, build status, labor hours
 * - Scene-based organization with type and priority tracking
 * - Budget tracking with labor hour totals
 * - CSV import/export for shop coordination
 */

const { useState, useRef } = React;

// Comprehensive list of common theatre scene shop tools, grouped by category
const THEATRE_SHOP_TOOLS = [
  // Power Tools
  { category: 'Power Tools', name: 'Table Saw' },
  { category: 'Power Tools', name: 'Miter Saw' },
  { category: 'Power Tools', name: 'Circular Saw' },
  { category: 'Power Tools', name: 'Jigsaw' },
  { category: 'Power Tools', name: 'Band Saw' },
  { category: 'Power Tools', name: 'Scroll Saw' },
  { category: 'Power Tools', name: 'Drill Press' },
  { category: 'Power Tools', name: 'Power Drill/Driver' },
  { category: 'Power Tools', name: 'Impact Driver' },
  { category: 'Power Tools', name: 'Router' },
  { category: 'Power Tools', name: 'Planer' },
  { category: 'Power Tools', name: 'Jointer' },
  { category: 'Power Tools', name: 'Belt Sander' },
  { category: 'Power Tools', name: 'Orbital Sander' },
  { category: 'Power Tools', name: 'Angle Grinder' },
  { category: 'Power Tools', name: 'Reciprocating Saw' },
  { category: 'Power Tools', name: 'Nail Gun (Pneumatic)' },
  { category: 'Power Tools', name: 'Staple Gun (Pneumatic)' },
  { category: 'Power Tools', name: 'Air Compressor' },
  { category: 'Power Tools', name: 'Hot Glue Gun' },
  // Hand Tools
  { category: 'Hand Tools', name: 'Hammer (Claw)' },
  { category: 'Hand Tools', name: 'Hammer (Sledge)' },
  { category: 'Hand Tools', name: 'Hammer (Rubber Mallet)' },
  { category: 'Hand Tools', name: 'Screwdriver Set (Phillips)' },
  { category: 'Hand Tools', name: 'Screwdriver Set (Flat)' },
  { category: 'Hand Tools', name: 'Allen Wrench Set' },
  { category: 'Hand Tools', name: 'Wrench Set' },
  { category: 'Hand Tools', name: 'Socket Set' },
  { category: 'Hand Tools', name: 'Pliers (Needle Nose)' },
  { category: 'Hand Tools', name: 'Pliers (Channel Lock)' },
  { category: 'Hand Tools', name: 'Wire Cutters' },
  { category: 'Hand Tools', name: 'Tin Snips' },
  { category: 'Hand Tools', name: 'Hand Saw' },
  { category: 'Hand Tools', name: 'Hack Saw' },
  { category: 'Hand Tools', name: 'Coping Saw' },
  { category: 'Hand Tools', name: 'Chisel Set' },
  { category: 'Hand Tools', name: 'Files (Various)' },
  { category: 'Hand Tools', name: 'Rasp' },
  { category: 'Hand Tools', name: 'Plane (Hand)' },
  { category: 'Hand Tools', name: 'Utility Knife' },
  { category: 'Hand Tools', name: 'Scissors (Heavy Duty)' },
  { category: 'Hand Tools', name: 'Staple Gun (Manual)' },
  { category: 'Hand Tools', name: 'C-Clamps (Various Sizes)' },
  { category: 'Hand Tools', name: 'Bar Clamps' },
  { category: 'Hand Tools', name: 'Spring Clamps' },
  { category: 'Hand Tools', name: 'Pipe Clamps' },
  { category: 'Hand Tools', name: 'Crowbar/Pry Bar' },
  // Measuring & Layout Tools
  { category: 'Measuring Tools', name: 'Tape Measure (25ft)' },
  { category: 'Measuring Tools', name: 'Tape Measure (100ft)' },
  { category: 'Measuring Tools', name: 'Speed Square' },
  { category: 'Measuring Tools', name: 'Combination Square' },
  { category: 'Measuring Tools', name: 'Framing Square' },
  { category: 'Measuring Tools', name: 'T-Square' },
  { category: 'Measuring Tools', name: 'Level (2ft)' },
  { category: 'Measuring Tools', name: 'Level (4ft)' },
  { category: 'Measuring Tools', name: 'Laser Level' },
  { category: 'Measuring Tools', name: 'Chalk Line' },
  { category: 'Measuring Tools', name: 'Protractor' },
  { category: 'Measuring Tools', name: 'Calipers' },
  { category: 'Measuring Tools', name: 'Compass (Drawing)' },
  // Safety Equipment
  { category: 'Safety Equipment', name: 'Safety Glasses' },
  { category: 'Safety Equipment', name: 'Face Shield' },
  { category: 'Safety Equipment', name: 'Hearing Protection' },
  { category: 'Safety Equipment', name: 'Dust Masks' },
  { category: 'Safety Equipment', name: 'Respirator' },
  { category: 'Safety Equipment', name: 'Work Gloves' },
  { category: 'Safety Equipment', name: 'First Aid Kit' },
  { category: 'Safety Equipment', name: 'Fire Extinguisher' },
  // Painting & Finishing
  { category: 'Painting Tools', name: 'Paint Brushes (Various)' },
  { category: 'Painting Tools', name: 'Paint Rollers' },
  { category: 'Painting Tools', name: 'Paint Sprayer' },
  { category: 'Painting Tools', name: 'Drop Cloths' },
  { category: 'Painting Tools', name: 'Paint Trays' },
  { category: 'Painting Tools', name: 'Putty Knives' },
  { category: 'Painting Tools', name: 'Sandpaper (Various Grits)' },
  { category: 'Painting Tools', name: 'Sanding Blocks' },
  // Fasteners & Hardware
  { category: 'Fasteners', name: 'Screw Assortment' },
  { category: 'Fasteners', name: 'Nail Assortment' },
  { category: 'Fasteners', name: 'Bolt & Nut Assortment' },
  { category: 'Fasteners', name: 'Wood Glue' },
  { category: 'Fasteners', name: 'Construction Adhesive' },
  { category: 'Fasteners', name: 'Staples' },
  // Specialty Theatre Tools
  { category: 'Specialty', name: 'Foam Cutter (Hot Wire)' },
  { category: 'Specialty', name: 'Vacuum Former' },
  { category: 'Specialty', name: 'Welding Equipment' },
  { category: 'Specialty', name: 'Rigging Hardware' },
  { category: 'Specialty', name: 'Theatrical Fasteners (Tee Nuts, Carriage Bolts)' },
  // Material Handling
  { category: 'Material Handling', name: 'Hand Truck/Dolly' },
  { category: 'Material Handling', name: 'Platform Cart' },
  { category: 'Material Handling', name: 'Scaffolding' },
  { category: 'Material Handling', name: 'Ladder (Step)' },
  { category: 'Material Handling', name: 'Ladder (Extension)' },
  { category: 'Material Handling', name: 'Sawhorses' },
  { category: 'Material Handling', name: 'Work Bench' }
];

function SetDesignView({ production, onSave }) {
  // State management
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterAct, setFilterAct] = useState('');
  const [selectedPieces, setSelectedPieces] = useState([]);
  const [checklistMode, setChecklistMode] = useState(false);
  const [ghostLightMode, setGhostLightMode] = useState(false);
  const [checklistStatus, setChecklistStatus] = useState({});
  const [viewMode, setViewMode] = React.useState('scenes'); // 'scenes' or 'schedule'
  const [showWorkflow, setShowWorkflow] = React.useState(false);
  const [showInventory, setShowInventory] = React.useState(false);
  const [showRentals, setShowRentals] = React.useState(false);
  const [toolsInventory, setToolsInventory] = React.useState(() => {
    const saved = localStorage.getItem(`tools_inventory_${production.id}`);
    return saved ? JSON.parse(saved) : [];
  });
  const [consumables, setConsumables] = React.useState(() => {
    const saved = localStorage.getItem(`consumables_inventory_${production.id}`);
    return saved ? JSON.parse(saved) : [];
  });
  const [rentals, setRentals] = React.useState(() => {
    const saved = localStorage.getItem(`rentals_${production.id}`);
    return saved ? JSON.parse(saved) : [];
  });
  const [expandedConstruction, setExpandedConstruction] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem('scenestave_set_construction_expanded') || '{}'); } catch { return {}; }
  });
  
  // Set piece types
  const pieceTypes = [
    'Platform',
    'Flat/Wall',
    'Door Unit',
    'Window Unit',
    'Staircase',
    'Ramp',
    'Furniture',
    'Backdrop/Drop',
    'Turntable',
    'Wagon/Rolling Unit',
    'Architectural Element',
    'Practical (Working)',
    'Masking',
    'Other'
  ];
  
  // Build status options
  const buildStatuses = [
    'Design Phase',
    'Approved for Build',
    'In Shop',
    'Framed',
    'Skinned',
    'Assembled',
    'Primed',
    'Painted',
    'Finished',
    'Installed',
    'Struck'
  ];
  
  // Priority levels
  const priorities = ['Critical', 'High', 'Normal', 'Low'];
  const toolCategories = ['Power Tool', 'Hand Tool', 'Measuring Tool', 'Safety Equipment', 'Paint Equipment', 'Rigging Equipment', 'Other'];
  const toolStatuses = ['Working', 'Needs Repair', 'Out for Repair', 'Out of Service', 'Missing'];
  // Map THEATRE_SHOP_TOOLS categories to component toolCategories
  const shopToolCategoryMap = {
    'Power Tools': 'Power Tool',
    'Hand Tools': 'Hand Tool',
    'Measuring Tools': 'Measuring Tool',
    'Safety Equipment': 'Safety Equipment',
    'Painting Tools': 'Paint Equipment',
    'Fasteners': 'Other',
    'Specialty': 'Other',
    'Material Handling': 'Other'
  };
  // Pre-group shop tools for optgroup rendering
  const groupedShopTools = Object.entries(
    THEATRE_SHOP_TOOLS.reduce((acc, tool) => {
      if (!acc[tool.category]) acc[tool.category] = [];
      acc[tool.category].push(tool);
      return acc;
    }, {})
  );
  const consumableCategories = ['Hardware', 'Lumber', 'Paint', 'Fabric', 'Adhesives', 'Safety Supplies', 'Other'];
  const units = ['ea', 'ft', 'sheets', 'gallons', 'lbs', 'boxes', 'rolls'];
  const rentalItemTypes = ['Furniture', 'Specialty Prop', 'Backdrop', 'Lighting Equipment', 'Sound Equipment', 'Rigging Equipment', 'Other'];
  const rentalStatuses = ['Reserved', 'Checked Out', 'In Use', 'Returned', 'Cancelled'];
  const rateTypes = ['daily', 'weekly', 'monthly', 'flat'];
  
  // Update functions - immediate update (no DB save)
  const handleUpdatePieceImmediate = (actIndex, sceneIndex, pieceId, field, value) => {
    const updatedActs = [...production.acts];
    const pieces = updatedActs[actIndex].scenes[sceneIndex].set?.pieces || [];
    const pieceIndex = pieces.findIndex(p => p.id === pieceId);

    if (pieceIndex >= 0) {
      pieces[pieceIndex] = { ...pieces[pieceIndex], [field]: value };
      updatedActs[actIndex].scenes[sceneIndex].set = { ...updatedActs[actIndex].scenes[sceneIndex].set, pieces };

      if (typeof onSave === 'function') {
        onSave({ ...production, acts: updatedActs });
      }
    }
  };
  
  // Update and save to DB
  const handleUpdatePieceAndSave = (actIndex, sceneIndex, pieceId, field, value) => {
    const updatedActs = [...production.acts];
    const pieces = updatedActs[actIndex].scenes[sceneIndex].set?.pieces || [];
    const pieceIndex = pieces.findIndex(p => p.id === pieceId);

    if (pieceIndex >= 0) {
      pieces[pieceIndex] = { ...pieces[pieceIndex], [field]: value };
      updatedActs[actIndex].scenes[sceneIndex].set = { ...updatedActs[actIndex].scenes[sceneIndex].set, pieces };
      
      if (window.productionsService?.updateProduction) {
        window.productionsService.updateProduction(production.id, { acts: updatedActs });
      }
      
      if (typeof onSave === 'function') {
        onSave({ ...production, acts: updatedActs });
      }
    }
  };
  
  const toggleConstruction = (pieceId) => {
    setExpandedConstruction(prev => {
      const next = { ...prev, [pieceId]: !prev[pieceId] };
      localStorage.setItem('scenestave_set_construction_expanded', JSON.stringify(next));
      return next;
    });
  };

  // Add new set piece
  const handleAddPiece = (actIndex, sceneIndex) => {
    const newPiece = {
      id: 'set_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      name: '', description: '', type: '', dimensions: '', materials: '',
      weight: '', buildStatus: 'Design Phase', priority: 'Normal',
      cost: '', laborHours: '', laborLog: '', dueDate: '', assignedTo: '',
      constructionNotes: '', riggingNotes: '', safetyNotes: '',
      imageUrl: '', createdAt: new Date().toISOString()
    };
    const updatedActs = production.acts.map((act, aIdx) => {
      if (aIdx !== actIndex) return act;
      return {
        ...act,
        scenes: act.scenes.map((scene, sIdx) => {
          if (sIdx !== sceneIndex) return scene;
          const existingPieces = Array.isArray(scene.set?.pieces) ? scene.set.pieces : [];
          return {
            ...scene,
            set: {
              ...(scene.set || {}),
              pieces: [...existingPieces, newPiece]
            }
          };
        })
      };
    });
    if (window.productionsService?.updateProduction) {
      window.productionsService.updateProduction(production.id, { acts: updatedActs });
    }
    onSave({ ...production, acts: updatedActs });
  };
  
  // Delete set piece
  const handleDeletePiece = (actIndex, sceneIndex, pieceId) => {
    if (!confirm('Delete this set piece? This cannot be undone.')) return;
    
    const updatedActs = [...production.acts];
    const pieces = updatedActs[actIndex].scenes[sceneIndex].set?.pieces || [];
    updatedActs[actIndex].scenes[sceneIndex].set = { ...updatedActs[actIndex].scenes[sceneIndex].set, pieces: pieces.filter(p => p.id !== pieceId) };
    
    if (window.productionsService?.updateProduction) {
      window.productionsService.updateProduction(production.id, { acts: updatedActs });
    }
    onSave({ ...production, acts: updatedActs });
  };
  
  // Budget calculations
  const calculateBudgetTotals = () => {
    let setPiecesCost = 0;
    let totalLaborHours = 0;
    let piecesWithCost = 0;
    let totalPieces = 0;
    
    production.acts.forEach(act => {
      act.scenes.forEach(scene => {
        if (scene.set?.pieces && Array.isArray(scene.set.pieces)) {
          scene.set.pieces.forEach(piece => {
            totalPieces++;
            if (piece.cost && !isNaN(parseFloat(piece.cost))) {
              setPiecesCost += parseFloat(piece.cost);
              piecesWithCost++;
            }
            if (piece.laborHours && !isNaN(parseFloat(piece.laborHours))) {
              totalLaborHours += parseFloat(piece.laborHours);
            }
          });
        }
      });
    });
    
    const rentalCosts = rentals.reduce((sum, rental) => 
      sum + (parseFloat(rental.totalCost) || 0), 0
    );
    
    const totalSetCost = setPiecesCost + rentalCosts;
    
    return {
      setPiecesCost,
      rentalCosts,
      totalSetCost,
      totalLaborHours,
      piecesWithCost,
      totalPieces,
      piecesWithoutCost: totalPieces - piecesWithCost
    };
  };
  
  const budgetTotals = calculateBudgetTotals();

  const getBudgetData = () => {
    const budget = window.budgetService?.getProductionBudget?.(production?.id);
    const dept = budget?.departments?.set || {};
    return {
      allocated: parseFloat(dept.allocated) || 0,
      spent: parseFloat(dept.spent) || 0,
      itemCount: dept.items?.length || 0
    };
  };
  const setDesignBudget = getBudgetData();
  
  React.useEffect(() => {
    localStorage.setItem(`tools_inventory_${production.id}`, JSON.stringify(toolsInventory));
  }, [toolsInventory, production.id]);

  React.useEffect(() => {
    localStorage.setItem(`consumables_inventory_${production.id}`, JSON.stringify(consumables));
  }, [consumables, production.id]);

  React.useEffect(() => {
    localStorage.setItem(`rentals_${production.id}`, JSON.stringify(rentals));
  }, [rentals, production.id]);

  React.useEffect(() => {
    if (!production || !Array.isArray(production.scenes)) return;
    const needsSave = production.scenes.some(scene =>
        !scene.set || !Array.isArray(scene.set.pieces)
    );
    if (!needsSave) return;
    const updated = {
        ...production,
        scenes: production.scenes.map(scene => {
            if (!scene.set) {
                return { ...scene, set: { pieces: [], notes: '' } };
            }
            if (!Array.isArray(scene.set.pieces)) {
                return { ...scene, set: { ...scene.set, pieces: [] } };
            }
            return scene;
        })
    };
    onSave(updated);
  }, []);

  const handleUpdateTool = (toolId, field, value) => {
    setToolsInventory(prev =>
      prev.map(tool =>
        tool.id === toolId ? { ...tool, [field]: value } : tool
      )
    );
  };

  const handleDeleteTool = (toolId) => {
    if (!confirm('Delete this tool from inventory?')) return;
    setToolsInventory(prev => prev.filter(t => t.id !== toolId));
  };

  const handleAddConsumable = () => {
    const newConsumable = {
      id: 'consumable_' + Date.now(),
      name: '',
      category: 'Hardware',
      quantity: '',
      unit: 'ea',
      reorderLevel: '',
      location: 'Shop Storage',
      cost: '',
      notes: '',
      createdAt: new Date().toISOString()
    };
    setConsumables(prev => [...prev, newConsumable]);
  };

  const handleUpdateConsumable = (consumableId, field, value) => {
    setConsumables(prev =>
      prev.map(item =>
        item.id === consumableId ? { ...item, [field]: value } : item
      )
    );
  };

  const handleDeleteConsumable = (consumableId) => {
    if (!confirm('Delete this item from inventory?')) return;
    setConsumables(prev => prev.filter(c => c.id !== consumableId));
  };

  const handleAddRental = () => {
    const newRental = {
      id: 'rental_' + Date.now(),
      itemName: '',
      description: '',
      rentalCompany: '',
      contactPerson: '',
      phone: '',
      email: '',
      itemType: 'Furniture',
      checkoutDate: '',
      returnDate: '',
      rentalRate: '',
      rateType: 'daily',
      damageDeposit: '',
      totalCost: '',
      status: 'Reserved',
      notes: '',
      createdAt: new Date().toISOString()
    };
    setRentals(prev => [...prev, newRental]);
  };

  const handleUpdateRental = (rentalId, field, value) => {
    setRentals(prev =>
      prev.map(rental =>
        rental.id === rentalId ? { ...rental, [field]: value } : rental
      )
    );
  };

  const handleDeleteRental = (rentalId) => {
    if (!confirm('Delete this rental record?')) return;
    setRentals(prev => prev.filter(r => r.id !== rentalId));
  };

  const calculateRentalCosts = () => {
    const totalDeposits = rentals.reduce((sum, r) =>
      sum + (parseFloat(r.damageDeposit) || 0), 0
    );
    const totalRentalCost = rentals.reduce((sum, r) =>
      sum + (parseFloat(r.totalCost) || 0), 0
    );
    return { totalDeposits, totalRentalCost };
  };

  const getOverdueRentals = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return rentals.filter(rental => {
      if (!rental.returnDate || rental.status === 'Returned') return false;
      const returnDate = new Date(rental.returnDate);
      returnDate.setHours(0, 0, 0, 0);
      return returnDate < today;
    });
  };

  const getUpcomingReturns = () => {
    const today = new Date();
    const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    today.setHours(0, 0, 0, 0);
    weekFromNow.setHours(23, 59, 59, 999);

    return rentals.filter(rental => {
      if (!rental.returnDate || rental.status === 'Returned') return false;
      const returnDate = new Date(rental.returnDate);
      return returnDate >= today && returnDate <= weekFromNow;
    });
  };

  // Get all set pieces with scene context
  const getAllSetPieces = () => {
    const allPieces = [];
    production.acts.forEach((act, actIndex) => {
      act.scenes.forEach((scene, sceneIndex) => {
        if (scene.set?.pieces && Array.isArray(scene.set.pieces)) {
          scene.set.pieces.forEach(piece => {
            allPieces.push({
              ...piece,
              actIndex,
              sceneIndex,
              actName: act.name,
              sceneNumber: scene.number || sceneIndex + 1,
              sceneLabel: scene.label || scene.title
            });
          });
        }
      });
    });
    return allPieces;
  };

  // Sort pieces by due date
  const sortPiecesByDueDate = (pieces) => {
    return [...pieces].sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate) - new Date(b.dueDate);
    });
  };

  // Get pieces by build status
  const getPiecesByStatus = (status) => {
    return getAllSetPieces().filter(p => p.buildStatus === status);
  };

  // Get pieces by assigned carpenter
  const getPiecesByAssignment = () => {
    const byAssignment = {};
    getAllSetPieces().forEach(piece => {
      const assignee = piece.assignedTo || 'Unassigned';
      if (!byAssignment[assignee]) {
        byAssignment[assignee] = [];
      }
      byAssignment[assignee].push(piece);
    });
    return byAssignment;
  };

  // Get overdue pieces
  const getOverduePieces = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return getAllSetPieces().filter(piece => {
      if (!piece.dueDate) return false;
      const dueDate = new Date(piece.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate < today && piece.buildStatus !== 'Finished' && piece.buildStatus !== 'Installed';
    });
  };
  
  // Filter function
  const filterPieces = (pieces, sceneAct) => {
    if (!pieces) return [];
    return pieces.filter(piece => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          (piece.name || '').toLowerCase().includes(query) ||
          (piece.description || '').toLowerCase().includes(query) ||
          (piece.type || '').toLowerCase().includes(query) ||
          (piece.materials || '').toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }
      
      if (filterStatus && piece.buildStatus !== filterStatus) return false;
      if (filterType && piece.type !== filterType) return false;
      if (filterAct && sceneAct !== filterAct) return false;
      
      return true;
    });
  };
  
  const hasActiveFilters = searchQuery || filterStatus || filterType || filterAct;
  const clearAllFilters = () => {
    setSearchQuery('');
    setFilterStatus('');
    setFilterType('');
    setFilterAct('');
  };
  
  // Get unique values for filters
  const getUniqueValues = (field) => {
    const values = new Set();
    production.acts.forEach(act => {
      act.scenes.forEach(scene => {
        if (scene.set?.pieces && Array.isArray(scene.set.pieces)) {
          scene.set.pieces.forEach(piece => {
            if (piece[field]) values.add(piece[field]);
          });
        }
      });
    });
    return Array.from(values).sort();
  };
  
  const uniqueStatuses = buildStatuses;
  const uniqueTypes = pieceTypes;
  const uniqueActs = [...new Set(production.acts.map(a => a.name).filter(Boolean))];
  
  // Bulk operations
  const togglePieceSelection = (actIndex, sceneIndex, pieceId) => {
    const key = `${actIndex}:${sceneIndex}:${pieceId}`;
    setSelectedPieces(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };
  
  const bulkDeletePieces = () => {
    if (selectedPieces.length === 0) return;
    if (!confirm(`Delete ${selectedPieces.length} selected set pieces? This cannot be undone.`)) return;
    
    const updatedActs = [...production.acts];
    
    selectedPieces.forEach(key => {
      const [actIndex, sceneIndex, pieceId] = key.split(':');
      const aIdx = parseInt(actIndex);
      const sIdx = parseInt(sceneIndex);
      if (updatedActs[aIdx]?.scenes[sIdx]?.set?.pieces) {
        updatedActs[aIdx].scenes[sIdx].set = {
          ...updatedActs[aIdx].scenes[sIdx].set,
          pieces: updatedActs[aIdx].scenes[sIdx].set.pieces.filter(p => p.id !== pieceId)
        };
      }
    });
    
    if (window.productionsService?.updateProduction) {
      window.productionsService.updateProduction(production.id, { acts: updatedActs });
    }
    onSave({ ...production, acts: updatedActs });
    setSelectedPieces([]);
  };
  
  // CSV Export
  const handleExportCSV = () => {
    const piecesData = [];
    
    production.acts.forEach((act, actIndex) => {
      act.scenes.forEach((scene, sceneIndex) => {
        if (scene.set?.pieces && Array.isArray(scene.set.pieces)) {
          scene.set.pieces.forEach(piece => {
            const matchesFilters =
              (!searchQuery || 
                (piece.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (piece.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (piece.type || '').toLowerCase().includes(searchQuery.toLowerCase())) &&
              (!filterStatus || piece.buildStatus === filterStatus) &&
              (!filterType || piece.type === filterType) &&
              (!filterAct || act.name === filterAct);
            
            if (matchesFilters) {
              piecesData.push({
                'Production': production.title || '',
                'Act': act.name || '',
                'Scene': scene.number || sceneIndex + 1,
                'Piece Name': piece.name || '',
                'Type': piece.type || '',
                'Description': piece.description || '',
                'Dimensions': piece.dimensions || '',
                'Materials': piece.materials || '',
                'Weight': piece.weight || '',
                'Build Status': piece.buildStatus || '',
                'Priority': piece.priority || '',
                'Cost': piece.cost || '',
                'Labor Hours': piece.laborHours || '',
                'Labor Log': piece.laborLog || '',
                'Due Date': piece.dueDate || '',
                'Assigned To': piece.assignedTo || '',
                'Construction Notes': piece.constructionNotes || '',
                'Rigging Notes': piece.riggingNotes || '',
                'Safety Notes': piece.safetyNotes || ''
              });
            }
          });
        }
      });
    });
    
    if (piecesData.length === 0) {
      alert('No set pieces to export.');
      return;
    }
    
    const headers = Object.keys(piecesData[0]);
    const csvContent = [
      headers.join(','),
      ...piecesData.map(row =>
        headers.map(header => {
          const value = String(row[header] || '');
          if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    const productionName = (production.title || 'Production').replace(/[^a-z0-9]/gi, '_');
    const date = new Date().toISOString().split('T')[0];
    const filename = `${productionName}_Set_Pieces_${date}.csv`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log(`Exported ${piecesData.length} set pieces to ${filename}`);
  };
  
  // Get all scenes for checklist
  const getAllScenes = () => {
    const scenes = [];
    production.acts.forEach((act, actIndex) => {
      act.scenes.forEach((scene, sceneIndex) => {
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
  
  // Checklist functions
  const toggleChecklistStatus = (pieceId, statusType) => {
    setChecklistStatus(prev => ({
      ...prev,
      [pieceId]: {
        ...prev[pieceId],
        [statusType]: !prev[pieceId]?.[statusType]
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
  
  const allScenes = getAllScenes();
  
  // Render component
  return React.createElement(
    'div',
    { className: 'space-y-4' },
    
    // Header with View Toggle
    React.createElement(
      'div',
      { className: 'flex items-center justify-between mb-4' },
      React.createElement('h3', { className: 'text-lg font-semibold text-gray-900' }, '🎨 Set Design & Scene Shop'),
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
            style: { background: '#5b21b6', padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer' }
          },
          React.createElement('img', { src: 'assets/ghostlight/ghostlight-button.png', alt: 'GhostLight', style: { height: '22px', objectFit: 'contain' } })
        )
      )
    ),

    // Conditional rendering: Ghost Light / Manager View / Checklist View
    ghostLightMode ?
      (() => {
        const features = [
          { title: '📐 Measurements & Space Calculator', desc: 'Calculate sight lines, clearances, and fly space' },
          { title: '🏗️ Set Visualizer', desc: 'Generate 3D visualization of your set design' },
          { title: '🗓️ Build Planner', desc: 'Plan your build schedule based on your tools, crew, and timeline' }
        ];
        return React.createElement(
          'div',
          { style: { background: '#1a1a2e', borderRadius: '12px', padding: '32px', minHeight: '400px', position: 'relative', overflow: 'hidden' } },
          React.createElement('div', { style: { position: 'absolute', right: '24px', bottom: '24px', fontSize: '120px', opacity: 0.05, userSelect: 'none', lineHeight: 1, pointerEvents: 'none' } }, '🕯️'),
          React.createElement('div', { style: { marginBottom: '32px' } },
            React.createElement('h2', { style: { fontSize: '22px', fontWeight: '700', color: '#f5f0e8', marginBottom: '8px', marginTop: '0' } }, React.createElement('img', { src: 'assets/ghostlight/ghostlight-button.png', alt: 'GhostLight', style: { height: '64px', objectFit: 'contain' } })),
            React.createElement('p', { style: { color: '#9b8fa8', fontSize: '14px', margin: '0' } }, 'AI-powered tools for theatre professionals — coming soon')
          ),
          React.createElement(
            'div',
            { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px' } },
            features.map((feature, i) =>
              React.createElement('div', { key: i, style: { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '24px', position: 'relative' } },
                React.createElement('img', { src: 'assets/ghostlight/ghostlight-purple.png', alt: '', style: { height: '32px', objectFit: 'contain', opacity: 0.25, position: 'absolute', bottom: '12px', right: '12px' } }),
                React.createElement('h3', { style: { fontSize: '15px', fontWeight: '600', color: '#f5f0e8', marginBottom: '8px', marginTop: '0', paddingRight: '32px' } }, feature.title),
                React.createElement('p', { style: { fontSize: '13px', color: '#9b8fa8', lineHeight: '1.5', marginBottom: '16px', marginTop: '0' } }, feature.desc),
                React.createElement('span', { style: { display: 'inline-block', padding: '3px 10px', background: 'rgba(147,97,255,0.15)', border: '1px solid rgba(147,97,255,0.35)', borderRadius: '20px', fontSize: '11px', fontWeight: '500', color: '#b78aff', letterSpacing: '0.5px' } }, 'Coming Soon')
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
          React.createElement('h2', { className: 'text-2xl font-bold text-blue-900 mb-1' }, '✓ Set Pieces Checklist'),
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
                React.createElement('th', { className: 'p-3 text-left font-semibold text-gray-700' }, 'Piece'),
                React.createElement('th', { className: 'p-3 text-left font-semibold text-gray-700' }, 'Type'),
                React.createElement('th', { className: 'p-3 text-center font-semibold text-gray-700 w-20' }, 'Built'),
                React.createElement('th', { className: 'p-3 text-center font-semibold text-gray-700 w-20' }, 'Installed'),
                React.createElement('th', { className: 'p-3 text-center font-semibold text-gray-700 w-20' }, 'Ready')
              )
            ),
            // Table Body
            React.createElement(
              'tbody',
              null,
              allScenes.flatMap((scene, sceneIdx) => {
                const filteredPieces = scene.set?.pieces ? filterPieces(scene.set.pieces, scene.act) : [];
                return filteredPieces.map((piece, pieceIdx) =>
                  React.createElement(
                    'tr',
                    { 
                      key: `${sceneIdx}-${pieceIdx}`,
                      className: 'border-b border-gray-200 hover:bg-blue-50 print:hover:bg-white'
                    },
                    React.createElement(
                      'td',
                      { className: 'p-3 text-sm text-gray-600' },
                      pieceIdx + 1
                    ),
                    React.createElement(
                      'td',
                      { className: 'p-3 text-sm font-semibold text-gray-800 whitespace-nowrap' },
                      `${scene.act}, Scene ${scene.number}`
                    ),
                    React.createElement(
                      'td',
                      { className: 'p-3 text-sm text-gray-800 font-medium' },
                      piece.name
                    ),
                    React.createElement(
                      'td',
                      { className: 'p-3 text-sm text-gray-600' },
                      piece.type || '-'
                    ),
                    React.createElement(
                      'td',
                      { className: 'p-3 text-center' },
                      React.createElement('input', {
                        type: 'checkbox',
                        checked: checklistStatus[piece.id]?.built || false,
                        onChange: () => toggleChecklistStatus(piece.id, 'built'),
                        className: 'w-5 h-5 text-blue-600 rounded cursor-pointer print:appearance-none print:w-4 print:h-4 print:border print:border-gray-400'
                      })
                    ),
                    React.createElement(
                      'td',
                      { className: 'p-3 text-center' },
                      React.createElement('input', {
                        type: 'checkbox',
                        checked: checklistStatus[piece.id]?.installed || false,
                        onChange: () => toggleChecklistStatus(piece.id, 'installed'),
                        className: 'w-5 h-5 text-indigo-600 rounded cursor-pointer print:appearance-none print:w-4 print:h-4 print:border print:border-gray-400'
                      })
                    ),
                    React.createElement(
                      'td',
                      { className: 'p-3 text-center' },
                      React.createElement('input', {
                        type: 'checkbox',
                        checked: checklistStatus[piece.id]?.ready || false,
                        onChange: () => toggleChecklistStatus(piece.id, 'ready'),
                        className: 'w-5 h-5 text-green-600 rounded cursor-pointer print:appearance-none print:w-4 print:h-4 print:border print:border-gray-400'
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
        
        // Budget Summary
        React.createElement(
          'div',
          { className: 'mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg' },
          React.createElement(
            'div',
            { className: 'flex items-center justify-between' },
            React.createElement(
              'div',
              null,
              React.createElement('h3', { className: 'text-lg font-semibold text-gray-800 mb-1' }, '💰 Set Budget & Labor'),
              React.createElement(
                'div',
                { className: 'flex items-center gap-4 text-sm text-gray-600' },
                React.createElement(
                  'span',
                  null,
                  React.createElement('strong', null, budgetTotals.piecesWithCost),
                  ' of ',
                  React.createElement('strong', null, budgetTotals.totalPieces),
                  ' pieces have cost data'
                ),
                React.createElement(
                  'span',
                  null,
                  React.createElement('strong', null, budgetTotals.totalLaborHours.toFixed(1)),
                  ' total labor hours'
                ),
                React.createElement('span', null,
                  React.createElement('strong', null, rentals.length),
                  ' rental items'
                )
              ),
              React.createElement(
                'div',
                { className: 'mt-2 flex items-center gap-4 text-xs text-gray-500' },
                React.createElement('span', null,
                  'Built: $', budgetTotals.setPiecesCost.toFixed(2)
                ),
                budgetTotals.rentalCosts > 0 && React.createElement('span', null,
                  'Rentals: $', budgetTotals.rentalCosts.toFixed(2)
                )
              )
            ),
            React.createElement(
              'div',
              { className: 'text-right' },
              React.createElement('div', { className: 'text-3xl font-bold text-blue-700' },
                '$' + setDesignBudget.spent.toFixed(2)
              ),
              React.createElement('div', { className: 'text-xs text-gray-500' },
                setDesignBudget.allocated > 0 ? 'of $' + setDesignBudget.allocated.toFixed(2) + ' allocated' : 'Total Set Cost'
              )
            )
          ),
          setDesignBudget.allocated > 0 && React.createElement(
            'div',
            { className: 'mt-3' },
            React.createElement(
              'div',
              { className: 'w-full bg-blue-200 rounded-full h-2' },
              React.createElement('div', {
                className: 'h-2 rounded-full ' + (setDesignBudget.spent > setDesignBudget.allocated ? 'bg-red-500' : 'bg-blue-500'),
                style: { width: Math.min(100, (setDesignBudget.spent / setDesignBudget.allocated) * 100) + '%' }
              })
            ),
            React.createElement('div', { className: 'text-xs text-blue-700 mt-1' },
              setDesignBudget.spent > setDesignBudget.allocated
                ? 'Over budget'
                : '$' + (setDesignBudget.allocated - setDesignBudget.spent).toFixed(2) + ' remaining'
            )
          )
        ),

        // View Mode Toggle
        React.createElement(
          'div',
          { className: 'mb-4 flex items-center justify-between' },
          React.createElement(
            'div',
            { className: 'flex gap-2' },
            React.createElement('button', {
              onClick: () => setViewMode('scenes'),
              className: `px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'scenes'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`
            }, '🎬 By Scene'),
            React.createElement('button', {
              onClick: () => setViewMode('schedule'),
              className: `px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'schedule'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`
            }, '📅 Build Schedule'),
            React.createElement('button', {
              onClick: () => setShowWorkflow(!showWorkflow),
              className: `px-4 py-2 rounded-lg font-medium transition-colors ${
                showWorkflow
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`
            }, '🛠️ Shop Workflow'),
            React.createElement('button', {
              onClick: () => setShowInventory(!showInventory),
              className: `px-4 py-2 rounded-lg font-medium transition-colors ${
                showInventory
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`
            }, '🔧 Tools & Inventory')
            ,
            React.createElement('button', {
              onClick: () => setShowRentals(!showRentals),
              className: `px-4 py-2 rounded-lg font-medium transition-colors ${
                showRentals
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`
            }, '🏢 Rentals')
          )
        ),

        // Shop Workflow Dashboard
        showWorkflow && React.createElement(
          'div',
          { className: 'mb-6 p-4 bg-indigo-50 border border-indigo-200 rounded-lg' },
          React.createElement('h3', { className: 'text-xl font-bold text-indigo-900 mb-4' }, '🛠️ Shop Workflow Dashboard'),

          // Overdue Alert
          getOverduePieces().length > 0 && React.createElement(
            'div',
            { className: 'mb-4 p-3 bg-red-50 border border-red-300 rounded-lg' },
            React.createElement('h4', { className: 'font-semibold text-red-800 mb-2' },
              `⚠️ ${getOverduePieces().length} Overdue Pieces`
            ),
            React.createElement(
              'div',
              { className: 'space-y-1' },
              getOverduePieces().slice(0, 5).map(piece =>
                React.createElement('div', { key: piece.id, className: 'text-sm text-red-700' },
                  `${piece.name} - Due: ${piece.dueDate} (${piece.buildStatus})`
                )
              )
            )
          ),

          // Active Builds by Status
          React.createElement(
            'div',
            { className: 'grid grid-cols-3 gap-4' },

            // In Shop
            React.createElement(
              'div',
              { className: 'bg-white p-3 rounded-lg border border-gray-200' },
              React.createElement('h4', { className: 'font-semibold text-gray-800 mb-2' }, 'In Shop'),
              React.createElement('div', { className: 'text-3xl font-bold text-blue-600 mb-2' },
                getPiecesByStatus('In Shop').length
              ),
              React.createElement('div', { className: 'text-xs text-gray-600' },
                `${getPiecesByStatus('Framed').length} framed, ${getPiecesByStatus('Assembled').length} assembled`
              )
            ),

            // Being Painted
            React.createElement(
              'div',
              { className: 'bg-white p-3 rounded-lg border border-gray-200' },
              React.createElement('h4', { className: 'font-semibold text-gray-800 mb-2' }, 'Paint Shop'),
              React.createElement('div', { className: 'text-3xl font-bold text-purple-600 mb-2' },
                getPiecesByStatus('Primed').length + getPiecesByStatus('Painted').length
              ),
              React.createElement('div', { className: 'text-xs text-gray-600' },
                `${getPiecesByStatus('Primed').length} primed, ${getPiecesByStatus('Painted').length} painted`
              )
            ),

            // Ready/Installed
            React.createElement(
              'div',
              { className: 'bg-white p-3 rounded-lg border border-gray-200' },
              React.createElement('h4', { className: 'font-semibold text-gray-800 mb-2' }, 'Complete'),
              React.createElement('div', { className: 'text-3xl font-bold text-green-600 mb-2' },
                getPiecesByStatus('Finished').length + getPiecesByStatus('Installed').length
              ),
              React.createElement('div', { className: 'text-xs text-gray-600' },
                `${getPiecesByStatus('Installed').length} on stage`
              )
            )
          ),

          // Carpenter Assignments
          React.createElement('div', { className: 'mt-4' },
            React.createElement('h4', { className: 'font-semibold text-gray-800 mb-2' }, 'Carpenter Assignments'),
            React.createElement(
              'div',
              { className: 'space-y-2' },
              Object.entries(getPiecesByAssignment()).map(([carpenter, pieces]) =>
                React.createElement(
                  'div',
                  { key: carpenter, className: 'flex items-center justify-between bg-white p-2 rounded border border-gray-200' },
                  React.createElement('span', { className: 'font-medium text-sm' }, carpenter),
                  React.createElement('span', { className: 'text-sm text-gray-600' },
                    `${pieces.length} pieces (${pieces.reduce((sum, p) => sum + (parseFloat(p.laborHours) || 0), 0).toFixed(1)} hrs)`
                  )
                )
              )
            )
          )
        ),
        
        // Bulk Actions Bar
        selectedPieces.length > 0 && React.createElement(
          'div',
          { className: 'mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between' },
          React.createElement(
            'span',
            { className: 'text-sm font-medium text-blue-900' },
            `${selectedPieces.length} piece${selectedPieces.length !== 1 ? 's' : ''} selected`
          ),
          React.createElement(
            'div',
            { className: 'flex gap-2' },
            React.createElement(
              'button',
              {
                onClick: () => setSelectedPieces([]),
                className: 'px-3 py-1.5 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50'
              },
              'Deselect All'
            ),
            React.createElement(
              'button',
              {
                onClick: bulkDeletePieces,
                className: 'px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700'
              },
              '🗑️ Delete Selected'
            )
          )
        ),
        
        // Search & Filter Bar
        React.createElement(
          'div',
          { className: 'mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg' },
          React.createElement(
            'div',
            { className: 'grid grid-cols-1 md:grid-cols-4 gap-3 mb-3' },
            React.createElement(
              'div',
              { className: 'md:col-span-2' },
              React.createElement('input', {
                type: 'text',
                placeholder: '🔍 Search set pieces by name, type, or materials...',
                value: searchQuery,
                onChange: (e) => setSearchQuery(e.target.value),
                className: 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
              })
            ),
            React.createElement(
              'select',
              {
                value: filterStatus,
                onChange: (e) => setFilterStatus(e.target.value),
                className: 'px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white'
              },
              React.createElement('option', { value: '' }, 'All Build Statuses'),
              uniqueStatuses.map(status =>
                React.createElement('option', { key: status, value: status }, status)
              )
            ),
            React.createElement(
              'select',
              {
                value: filterType,
                onChange: (e) => setFilterType(e.target.value),
                className: 'px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white'
              },
              React.createElement('option', { value: '' }, 'All Types'),
              uniqueTypes.map(type =>
                React.createElement('option', { key: type, value: type }, type)
              )
            )
          ),
          React.createElement(
            'div',
            { className: 'flex items-center justify-between' },
            React.createElement(
              'select',
              {
                value: filterAct,
                onChange: (e) => setFilterAct(e.target.value),
                className: 'px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white'
              },
              React.createElement('option', { value: '' }, 'All Acts'),
              uniqueActs.map(act =>
                React.createElement('option', { key: act, value: act }, act)
              )
            ),
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
        
        // Export Button
        React.createElement(
          'div',
          { className: 'mb-4 flex items-center justify-end gap-2' },
          React.createElement(
            'button',
            {
              onClick: handleExportCSV,
              className: 'px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 font-medium'
            },
            '📥 Export CSV'
          )
        ),
        
        // Main Content Area - Conditional Rendering
        showRentals ? (
          React.createElement(
            'div',
            { className: 'rentals-view' },
            React.createElement('h3', { className: 'text-2xl font-bold mb-4' }, '🏢 Rental Management'),

            // Rental Summary
            React.createElement(
              'div',
              { className: 'mb-4 grid grid-cols-3 gap-4' },
              React.createElement(
                'div',
                { className: 'p-4 bg-green-50 border border-green-200 rounded-lg' },
                React.createElement('div', { className: 'text-sm text-gray-600 mb-1' }, 'Total Rental Cost'),
                React.createElement('div', { className: 'text-3xl font-bold text-green-700' },
                  '$' + calculateRentalCosts().totalRentalCost.toFixed(2)
                )
              ),
              React.createElement(
                'div',
                { className: 'p-4 bg-yellow-50 border border-yellow-200 rounded-lg' },
                React.createElement('div', { className: 'text-sm text-gray-600 mb-1' }, 'Total Deposits Held'),
                React.createElement('div', { className: 'text-3xl font-bold text-yellow-700' },
                  '$' + calculateRentalCosts().totalDeposits.toFixed(2)
                )
              ),
              React.createElement(
                'div',
                { className: 'p-4 bg-blue-50 border border-blue-200 rounded-lg' },
                React.createElement('div', { className: 'text-sm text-gray-600 mb-1' }, 'Active Rentals'),
                React.createElement('div', { className: 'text-3xl font-bold text-blue-700' },
                  rentals.filter(r => r.status === 'Checked Out' || r.status === 'In Use').length
                )
              )
            ),

            // Alerts
            (getOverdueRentals().length > 0 || getUpcomingReturns().length > 0) && React.createElement(
              'div',
              { className: 'mb-4 space-y-2' },
              getOverdueRentals().length > 0 && React.createElement(
                'div',
                { className: 'p-3 bg-red-50 border border-red-300 rounded-lg' },
                React.createElement('h4', { className: 'font-semibold text-red-800 mb-2' },
                  `⚠️ ${getOverdueRentals().length} Overdue Returns`
                ),
                React.createElement(
                  'div',
                  { className: 'space-y-1' },
                  getOverdueRentals().map(rental =>
                    React.createElement('div', { key: rental.id, className: 'text-sm text-red-700' },
                      `${rental.itemName} - Due: ${rental.returnDate} (${rental.rentalCompany})`
                    )
                  )
                )
              ),
              getUpcomingReturns().length > 0 && React.createElement(
                'div',
                { className: 'p-3 bg-orange-50 border border-orange-300 rounded-lg' },
                React.createElement('h4', { className: 'font-semibold text-orange-800 mb-2' },
                  `📅 ${getUpcomingReturns().length} Returns Due This Week`
                ),
                React.createElement(
                  'div',
                  { className: 'space-y-1' },
                  getUpcomingReturns().map(rental =>
                    React.createElement('div', { key: rental.id, className: 'text-sm text-orange-700' },
                      `${rental.itemName} - Due: ${rental.returnDate}`
                    )
                  )
                )
              )
            ),

            // Add Rental Button
            React.createElement(
              'div',
              { className: 'mb-4 flex justify-between items-center' },
              React.createElement('h4', { className: 'text-lg font-semibold' }, 'Rental Items'),
              React.createElement('button', {
                onClick: handleAddRental,
                className: 'px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700'
              }, '+ Add Rental')
            ),

            // Rentals List
            React.createElement(
              'div',
              { className: 'space-y-4' },
              rentals.length === 0 ? React.createElement('p', { className: 'text-gray-500 text-center py-8' },
                'No rentals tracked. Click + Add Rental to start.'
              ) : rentals.map(rental => {
                const isOverdue = rental.returnDate && new Date(rental.returnDate) < new Date() && rental.status !== 'Returned';

                return React.createElement(
                  'div',
                  {
                    key: rental.id,
                    className: `p-4 border rounded-lg ${
                      isOverdue ? 'bg-red-50 border-red-300' : 'bg-white border-gray-200'
                    }`
                  },

                  // Header row
                  React.createElement(
                    'div',
                    { className: 'flex items-start justify-between mb-3' },
                    React.createElement('input', {
                      type: 'text',
                      placeholder: 'Rental item name',
                      value: rental.itemName || '',
                      onChange: (e) => handleUpdateRental(rental.id, 'itemName', e.target.value),
                      className: 'text-xl font-semibold px-2 py-1 border-b-2 border-gray-300 focus:border-green-500 focus:outline-none bg-transparent'
                    }),
                    React.createElement(
                      'div',
                      { className: 'flex gap-2' },
                      React.createElement('select', {
                        value: rental.status || 'Reserved',
                        onChange: (e) => handleUpdateRental(rental.id, 'status', e.target.value),
                        className: `px-3 py-1 rounded text-sm font-medium ${
                          rental.status === 'Returned' ? 'bg-gray-200 text-gray-700' :
                          rental.status === 'In Use' ? 'bg-green-100 text-green-700' :
                          'bg-blue-100 text-blue-700'
                        }`
                      },
                        rentalStatuses.map(status =>
                          React.createElement('option', { key: status, value: status }, status)
                        )
                      ),
                      React.createElement('button', {
                        onClick: () => handleDeleteRental(rental.id),
                        className: 'text-gray-400 hover:text-red-600'
                      }, '🗑️')
                    )
                  ),

                  // Description
                  React.createElement('textarea', {
                    placeholder: 'Item description',
                    value: rental.description || '',
                    onChange: (e) => handleUpdateRental(rental.id, 'description', e.target.value),
                    className: 'w-full mb-3 px-2 py-1 border border-gray-300 rounded text-sm',
                    rows: 2
                  }),

                  // Grid of fields
                  React.createElement(
                    'div',
                    { className: 'grid grid-cols-4 gap-3 mb-3' },

                    // Item Type
                    React.createElement('select', {
                      value: rental.itemType || 'Furniture',
                      onChange: (e) => handleUpdateRental(rental.id, 'itemType', e.target.value),
                      className: 'px-2 py-2 border border-gray-300 rounded text-sm'
                    },
                      rentalItemTypes.map(type =>
                        React.createElement('option', { key: type, value: type }, type)
                      )
                    ),

                    // Rental Company
                    React.createElement('input', {
                      type: 'text',
                      placeholder: 'Rental company',
                      value: rental.rentalCompany || '',
                      onChange: (e) => handleUpdateRental(rental.id, 'rentalCompany', e.target.value),
                      className: 'px-2 py-2 border border-gray-300 rounded text-sm'
                    }),

                    // Contact Person
                    React.createElement('input', {
                      type: 'text',
                      placeholder: 'Contact person',
                      value: rental.contactPerson || '',
                      onChange: (e) => handleUpdateRental(rental.id, 'contactPerson', e.target.value),
                      className: 'px-2 py-2 border border-gray-300 rounded text-sm'
                    }),

                    // Phone
                    React.createElement('input', {
                      type: 'tel',
                      placeholder: 'Phone',
                      value: rental.phone || '',
                      onChange: (e) => handleUpdateRental(rental.id, 'phone', e.target.value),
                      className: 'px-2 py-2 border border-gray-300 rounded text-sm'
                    })
                  ),

                  // Dates and costs row
                  React.createElement(
                    'div',
                    { className: 'grid grid-cols-6 gap-3 mb-3' },

                    // Checkout Date
                    React.createElement(
                      'div',
                      null,
                      React.createElement('label', { className: 'block text-xs text-gray-600 mb-1' }, 'Checkout Date'),
                      React.createElement('input', {
                        type: 'date',
                        value: rental.checkoutDate || '',
                        onChange: (e) => handleUpdateRental(rental.id, 'checkoutDate', e.target.value),
                        className: 'w-full px-2 py-1 border border-gray-300 rounded text-sm'
                      })
                    ),

                    // Return Date
                    React.createElement(
                      'div',
                      null,
                      React.createElement('label', { className: 'block text-xs text-gray-600 mb-1' }, 'Return Date'),
                      React.createElement('input', {
                        type: 'date',
                        value: rental.returnDate || '',
                        onChange: (e) => handleUpdateRental(rental.id, 'returnDate', e.target.value),
                        className: `w-full px-2 py-1 border rounded text-sm ${
                          isOverdue ? 'border-red-500 bg-red-50' : 'border-gray-300'
                        }`
                      })
                    ),

                    // Rental Rate
                    React.createElement(
                      'div',
                      null,
                      React.createElement('label', { className: 'block text-xs text-gray-600 mb-1' }, 'Rental Rate'),
                      React.createElement(
                        'div',
                        { className: 'relative' },
                        React.createElement('span', { className: 'absolute left-2 top-2 text-gray-500 text-xs' }, '$'),
                        React.createElement('input', {
                          type: 'text',
                          inputMode: 'decimal',
                          placeholder: '0.00',
                          value: rental.rentalRate || '',
                          onChange: (e) => {
                            let cleanValue = e.target.value.replace(/[^\d.]/g, '');
                            handleUpdateRental(rental.id, 'rentalRate', cleanValue);
                          },
                          className: 'w-full pl-5 pr-2 py-1 border border-gray-300 rounded text-sm'
                        })
                      )
                    ),

                    // Rate Type
                    React.createElement(
                      'div',
                      null,
                      React.createElement('label', { className: 'block text-xs text-gray-600 mb-1' }, 'Rate Type'),
                      React.createElement('select', {
                        value: rental.rateType || 'daily',
                        onChange: (e) => handleUpdateRental(rental.id, 'rateType', e.target.value),
                        className: 'w-full px-2 py-1 border border-gray-300 rounded text-sm'
                      },
                        rateTypes.map(type =>
                          React.createElement('option', { key: type, value: type }, type)
                        )
                      )
                    ),

                    // Damage Deposit
                    React.createElement(
                      'div',
                      null,
                      React.createElement('label', { className: 'block text-xs text-gray-600 mb-1' }, 'Deposit'),
                      React.createElement(
                        'div',
                        { className: 'relative' },
                        React.createElement('span', { className: 'absolute left-2 top-2 text-gray-500 text-xs' }, '$'),
                        React.createElement('input', {
                          type: 'text',
                          inputMode: 'decimal',
                          placeholder: '0.00',
                          value: rental.damageDeposit || '',
                          onChange: (e) => {
                            let cleanValue = e.target.value.replace(/[^\d.]/g, '');
                            handleUpdateRental(rental.id, 'damageDeposit', cleanValue);
                          },
                          className: 'w-full pl-5 pr-2 py-1 border border-gray-300 rounded text-sm'
                        })
                      )
                    ),

                    // Total Cost
                    React.createElement(
                      'div',
                      null,
                      React.createElement('label', { className: 'block text-xs text-gray-600 mb-1' }, 'Total Cost'),
                      React.createElement(
                        'div',
                        { className: 'relative' },
                        React.createElement('span', { className: 'absolute left-2 top-2 text-gray-500 text-xs' }, '$'),
                        React.createElement('input', {
                          type: 'text',
                          inputMode: 'decimal',
                          placeholder: '0.00',
                          value: rental.totalCost || '',
                          onChange: (e) => {
                            let cleanValue = e.target.value.replace(/[^\d.]/g, '');
                            handleUpdateRental(rental.id, 'totalCost', cleanValue);
                          },
                          className: 'w-full pl-5 pr-2 py-1 border border-gray-300 rounded text-sm'
                        })
                      )
                    )
                  ),

                  // Notes
                  React.createElement('textarea', {
                    placeholder: 'Notes (contract details, special instructions, etc.)',
                    value: rental.notes || '',
                    onChange: (e) => handleUpdateRental(rental.id, 'notes', e.target.value),
                    className: 'w-full px-2 py-1 border border-gray-300 rounded text-sm',
                    rows: 2
                  }),

                  // Overdue warning
                  isOverdue && React.createElement('div', { className: 'mt-2 text-sm text-red-700 font-semibold' },
                    `⚠️ OVERDUE: Return date was ${rental.returnDate}`
                  )
                );
              })
            )
          )
        ) : showInventory ? (
          // TOOLS & INVENTORY VIEW
          React.createElement(
            'div',
            { className: 'tools-inventory-view' },
            React.createElement('h3', { className: 'text-2xl font-bold mb-4' }, '🔧 Tools & Equipment Inventory'),
            
            // Two-column layout: Tools | Consumables
            React.createElement(
              'div',
              { className: 'grid grid-cols-2 gap-6' },
              
              // TOOLS COLUMN
              React.createElement(
                'div',
                null,
                React.createElement('h4', { className: 'text-xl font-semibold mb-3' }, '🛠️ Shop Tools'),

                // Quick Add Tool
                React.createElement(
                  'div',
                  { className: 'mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg' },
                  React.createElement('label', { className: 'block text-sm font-semibold text-gray-700 mb-3' }, '⚡ Quick Add Tool'),
                  // Full-width dropdown
                  React.createElement(
                    'select',
                    {
                      className: 'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white mb-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                      defaultValue: '',
                      onChange: (e) => {
                        if (!e.target.value) return;
                        const toolData = THEATRE_SHOP_TOOLS.find(t => t.name === e.target.value);
                        if (!toolData) return;
                        setToolsInventory(prev => [...prev, {
                          id: 'tool_' + Date.now(),
                          name: toolData.name,
                          category: shopToolCategoryMap[toolData.category] || 'Other',
                          status: 'Working',
                          location: 'Shop',
                          checkedOutTo: '',
                          lastMaintenance: '',
                          nextMaintenance: '',
                          notes: '',
                          createdAt: new Date().toISOString()
                        }]);
                        if (window.showToast) window.showToast('✅ Added ' + toolData.name + ' to inventory', 'success');
                        e.target.value = '';
                      }
                    },
                    React.createElement('option', { value: '' }, '-- Select from common tools --'),
                    groupedShopTools.map(([category, tools]) =>
                      React.createElement(
                        'optgroup',
                        { key: category, label: category },
                        tools.map(tool =>
                          React.createElement('option', { key: tool.name, value: tool.name }, tool.name)
                        )
                      )
                    )
                  ),
                  // OR divider
                  React.createElement(
                    'div',
                    { className: 'flex items-center gap-2 mb-3' },
                    React.createElement('div', { className: 'flex-1 border-t border-gray-200' }),
                    React.createElement('span', { className: 'text-xs text-gray-400 font-medium' }, 'OR'),
                    React.createElement('div', { className: 'flex-1 border-t border-gray-200' })
                  ),
                  // Custom tool button — full width, own row
                  React.createElement(
                    'button',
                    {
                      onClick: () => {
                        const toolName = prompt('Enter custom tool name:');
                        if (toolName && toolName.trim()) {
                          setToolsInventory(prev => [...prev, {
                            id: 'tool_' + Date.now(),
                            name: toolName.trim(),
                            category: 'Other',
                            status: 'Working',
                            location: 'Shop',
                            checkedOutTo: '',
                            lastMaintenance: '',
                            nextMaintenance: '',
                            notes: '',
                            createdAt: new Date().toISOString()
                          }]);
                          if (window.showToast) window.showToast('✅ Added ' + toolName.trim() + ' to inventory', 'success');
                        }
                      },
                      className: 'w-full px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors'
                    },
                    '+ Add Custom Tool'
                  ),
                  React.createElement(
                    'p',
                    { className: 'text-xs text-gray-400 mt-2 text-center' },
                    'Select from ' + THEATRE_SHOP_TOOLS.length + ' common theatre tools, or add your own'
                  )
                ),

                // Tools Stats
                React.createElement(
                  'div',
                  { className: 'mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg' },
                  React.createElement('div', { className: 'grid grid-cols-3 gap-2 text-center text-sm' },
                    React.createElement('div', null,
                      React.createElement('div', { className: 'text-2xl font-bold text-green-600' },
                        toolsInventory.filter(t => t.status === 'Working').length
                      ),
                      React.createElement('div', { className: 'text-xs text-gray-600' }, 'Working')
                    ),
                    React.createElement('div', null,
                      React.createElement('div', { className: 'text-2xl font-bold text-yellow-600' },
                        toolsInventory.filter(t => t.status === 'Needs Repair' || t.status === 'Out for Repair').length
                      ),
                      React.createElement('div', { className: 'text-xs text-gray-600' }, 'Needs Service')
                    ),
                    React.createElement('div', null,
                      React.createElement('div', { className: 'text-2xl font-bold text-gray-600' },
                        toolsInventory.filter(t => t.checkedOutTo).length
                      ),
                      React.createElement('div', { className: 'text-xs text-gray-600' }, 'Checked Out')
                    )
                  )
                ),
                
                // Tools List
                toolsInventory.length > 0 && React.createElement(
                  'div',
                  { className: 'flex items-center justify-between mb-2' },
                  React.createElement('span', { className: 'text-sm font-semibold text-gray-700' },
                    'Inventory (' + toolsInventory.length + ' ' + (toolsInventory.length === 1 ? 'tool' : 'tools') + ')'
                  ),
                  React.createElement(
                    'div',
                    { className: 'flex gap-1 flex-wrap justify-end' },
                    Object.entries(
                      toolsInventory.reduce((acc, t) => { acc[t.category] = (acc[t.category] || 0) + 1; return acc; }, {})
                    ).map(([cat, count]) =>
                      React.createElement('span', { key: cat, className: 'px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full' },
                        cat + ': ' + count
                      )
                    )
                  )
                ),
                React.createElement(
                  'div',
                  { className: 'space-y-2 max-h-96 overflow-y-auto' },
                  toolsInventory.length === 0 ? React.createElement(
                    'div',
                    { className: 'text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300' },
                    React.createElement('div', { className: 'text-4xl mb-2' }, '🛠️'),
                    React.createElement('p', { className: 'text-gray-500 text-sm font-medium' }, 'No tools in inventory'),
                    React.createElement('p', { className: 'text-gray-400 text-xs mt-1' }, 'Use the dropdown above to add tools')
                  ) : toolsInventory.map(tool =>
                    React.createElement(
                      'div',
                      { key: tool.id, className: 'p-3 border border-gray-200 rounded-lg bg-white hover:shadow-sm transition-shadow' },
                      React.createElement(
                        'div',
                        { className: 'flex items-start justify-between mb-2' },
                        React.createElement('input', {
                          type: 'text',
                          placeholder: 'Tool name',
                          value: tool.name || '',
                          onChange: (e) => handleUpdateTool(tool.id, 'name', e.target.value),
                          className: 'flex-1 font-semibold px-2 py-1 border-b border-gray-200 focus:border-blue-500 focus:outline-none'
                        }),
                        React.createElement('button', {
                          onClick: () => handleDeleteTool(tool.id),
                          className: 'ml-2 text-gray-400 hover:text-red-600'
                        }, '🗑️')
                      ),
                      
                      React.createElement(
                        'div',
                        { className: 'grid grid-cols-2 gap-2 text-sm' },
                        React.createElement('select', {
                          value: tool.category || 'Power Tool',
                          onChange: (e) => handleUpdateTool(tool.id, 'category', e.target.value),
                          className: 'px-2 py-1 border border-gray-300 rounded text-xs bg-white'
                        },
                          toolCategories.map(cat =>
                            React.createElement('option', { key: cat, value: cat }, cat)
                          )
                        ),
                        React.createElement('select', {
                          value: tool.status || 'Working',
                          onChange: (e) => handleUpdateTool(tool.id, 'status', e.target.value),
                          className: `px-2 py-1 border rounded text-xs ${
                            tool.status === 'Working' ? 'bg-green-50 border-green-300' :
                            tool.status === 'Needs Repair' || tool.status === 'Out for Repair' ? 'bg-yellow-50 border-yellow-300' :
                            'bg-red-50 border-red-300'
                          }`
                        },
                          toolStatuses.map(status =>
                            React.createElement('option', { key: status, value: status }, status)
                          )
                        ),
                        React.createElement('input', {
                          type: 'text',
                          placeholder: 'Location',
                          value: tool.location || '',
                          onChange: (e) => handleUpdateTool(tool.id, 'location', e.target.value),
                          className: 'px-2 py-1 border border-gray-300 rounded text-xs'
                        }),
                        React.createElement('input', {
                          type: 'text',
                          placeholder: 'Checked out to',
                          value: tool.checkedOutTo || '',
                          onChange: (e) => handleUpdateTool(tool.id, 'checkedOutTo', e.target.value),
                          className: 'px-2 py-1 border border-gray-300 rounded text-xs'
                        })
                      ),
                      
                      React.createElement('textarea', {
                        placeholder: 'Notes / maintenance log',
                        value: tool.notes || '',
                        onChange: (e) => handleUpdateTool(tool.id, 'notes', e.target.value),
                        className: 'w-full mt-2 px-2 py-1 border border-gray-300 rounded text-xs',
                        rows: 2
                      })
                    )
                  )
                )
              ),
              
              // CONSUMABLES COLUMN
              React.createElement(
                'div',
                null,
                React.createElement(
                  'div',
                  { className: 'flex items-center justify-between mb-3' },
                  React.createElement('h4', { className: 'text-xl font-semibold' }, '📦 Consumables & Supplies'),
                  React.createElement('button', {
                    onClick: handleAddConsumable,
                    className: 'px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm'
                  }, '+ Add Item')
                ),
                
                // Low stock alert
                React.createElement(
                  'div',
                  { className: 'mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg' },
                  React.createElement('div', { className: 'text-sm font-semibold text-orange-800 mb-1' },
                    '⚠️ Low Stock Items'
                  ),
                  React.createElement('div', { className: 'text-xs text-orange-700' },
                    consumables.filter(item => 
                      item.quantity && item.reorderLevel && 
                      parseFloat(item.quantity) <= parseFloat(item.reorderLevel)
                    ).length > 0
                      ? `${consumables.filter(item => 
                          item.quantity && item.reorderLevel && 
                          parseFloat(item.quantity) <= parseFloat(item.reorderLevel)
                        ).length} items need reordering`
                      : 'All items adequately stocked'
                  )
                ),
                
                // Consumables List
                React.createElement(
                  'div',
                  { className: 'space-y-2 max-h-96 overflow-y-auto' },
                  consumables.length === 0 ? React.createElement('p', { className: 'text-gray-500 text-sm text-center py-4' },
                    'No consumables tracked. Click + Add Item to start.'
                  ) : consumables.map(item => {
                    const isLowStock = item.quantity && item.reorderLevel && 
                      parseFloat(item.quantity) <= parseFloat(item.reorderLevel);
                    
                    return React.createElement(
                      'div',
                      { 
                        key: item.id,
                        className: `p-3 border rounded-lg bg-white ${
                          isLowStock ? 'border-orange-300 bg-orange-50' : 'border-gray-200'
                        }`
                      },
                      React.createElement(
                        'div',
                        { className: 'flex items-start justify-between mb-2' },
                        React.createElement('input', {
                          type: 'text',
                          placeholder: 'Item name',
                          value: item.name || '',
                          onChange: (e) => handleUpdateConsumable(item.id, 'name', e.target.value),
                          className: 'flex-1 font-semibold px-2 py-1 border-b border-gray-200 focus:border-blue-500 focus:outline-none bg-transparent'
                        }),
                        React.createElement('button', {
                          onClick: () => handleDeleteConsumable(item.id),
                          className: 'ml-2 text-gray-400 hover:text-red-600'
                        }, '🗑️')
                      ),
                      
                      React.createElement(
                        'div',
                        { className: 'grid grid-cols-3 gap-2 text-sm' },
                        React.createElement('select', {
                          value: item.category || 'Hardware',
                          onChange: (e) => handleUpdateConsumable(item.id, 'category', e.target.value),
                          className: 'px-2 py-1 border border-gray-300 rounded text-xs bg-white'
                        },
                          consumableCategories.map(cat =>
                            React.createElement('option', { key: cat, value: cat }, cat)
                          )
                        ),
                        React.createElement('input', {
                          type: 'text',
                          inputMode: 'decimal',
                          placeholder: 'Qty',
                          value: item.quantity || '',
                          onChange: (e) => handleUpdateConsumable(item.id, 'quantity', e.target.value),
                          className: 'px-2 py-1 border border-gray-300 rounded text-xs'
                        }),
                        React.createElement('select', {
                          value: item.unit || 'ea',
                          onChange: (e) => handleUpdateConsumable(item.id, 'unit', e.target.value),
                          className: 'px-2 py-1 border border-gray-300 rounded text-xs bg-white'
                        },
                          units.map(unit =>
                            React.createElement('option', { key: unit, value: unit }, unit)
                          )
                        ),
                        React.createElement('input', {
                          type: 'text',
                          inputMode: 'decimal',
                          placeholder: 'Reorder at',
                          value: item.reorderLevel || '',
                          onChange: (e) => handleUpdateConsumable(item.id, 'reorderLevel', e.target.value),
                          className: 'px-2 py-1 border border-gray-300 rounded text-xs'
                        }),
                        React.createElement('input', {
                          type: 'text',
                          placeholder: 'Location',
                          value: item.location || '',
                          onChange: (e) => handleUpdateConsumable(item.id, 'location', e.target.value),
                          className: 'px-2 py-1 border border-gray-300 rounded text-xs'
                        }),
                        React.createElement(
                          'div',
                          { className: 'relative' },
                          React.createElement('span', { className: 'absolute left-2 top-1.5 text-gray-500 text-xs pointer-events-none' }, '$'),
                          React.createElement('input', {
                            type: 'text',
                            inputMode: 'decimal',
                            placeholder: '0.00',
                            value: item.cost || '',
                            onChange: (e) => {
                              let cleanValue = e.target.value.replace(/[^\d.]/g, '');
                              handleUpdateConsumable(item.id, 'cost', cleanValue);
                            },
                            className: 'w-full pl-5 pr-2 py-1 border border-gray-300 rounded text-xs'
                          })
                        )
                      ),
                      
                      isLowStock && React.createElement('div', { className: 'mt-2 text-xs text-orange-700 font-semibold' },
                        `⚠️ Low stock: ${item.quantity} ${item.unit} (reorder at ${item.reorderLevel})`
                      )
                    );
                  })
                )
              )
            )
          )
        ) : viewMode === 'schedule' ? (
          React.createElement(
            'div',
            { className: 'build-schedule-view' },
            React.createElement('h3', { className: 'text-xl font-bold mb-4' }, '📅 Build Schedule'),

            // Sort options
            React.createElement(
              'div',
              { className: 'mb-4 flex gap-2' },
              React.createElement('span', { className: 'text-sm text-gray-600 flex items-center' }, 'Sort by due date')
            ),

            // Timeline view
            React.createElement(
              'div',
              { className: 'space-y-3' },
              sortPiecesByDueDate(getAllSetPieces()).map(piece => {
                const isOverdue = piece.dueDate && new Date(piece.dueDate) < new Date() && piece.buildStatus !== 'Finished' && piece.buildStatus !== 'Installed';

                return React.createElement(
                  'div',
                  {
                    key: piece.id,
                    className: `p-4 border rounded-lg ${isOverdue ? 'bg-red-50 border-red-300' : 'bg-white border-gray-200'}`
                  },
                  React.createElement(
                    'div',
                    { className: 'flex items-start justify-between' },
                    React.createElement(
                      'div',
                      { className: 'flex-1' },
                      React.createElement('h4', { className: 'font-semibold text-lg' }, piece.name || 'Unnamed Piece'),
                      React.createElement('div', { className: 'text-sm text-gray-600 mt-1' },
                        `${piece.actName} - Scene ${piece.sceneNumber}${piece.sceneLabel ? ': ' + piece.sceneLabel : ''}`
                      ),
                      React.createElement(
                        'div',
                        { className: 'flex gap-4 mt-2 text-sm' },
                        React.createElement('span', null,
                          React.createElement('strong', null, 'Type:'),
                          ' ', piece.type || 'Not specified'
                        ),
                        React.createElement('span', null,
                          React.createElement('strong', null, 'Status:'),
                          ' ', piece.buildStatus
                        ),
                        React.createElement('span', null,
                          React.createElement('strong', null, 'Priority:'),
                          ' ', React.createElement('span', {
                            className: piece.priority === 'Critical' ? 'text-red-600 font-semibold' : ''
                          }, piece.priority || 'Normal')
                        )
                      ),
                      piece.assignedTo && React.createElement('div', { className: 'text-sm text-gray-600 mt-1' },
                        React.createElement('strong', null, 'Assigned to:'),
                        ' ', piece.assignedTo,
                        piece.laborHours ? ` (${piece.laborHours} hrs)` : ''
                      )
                    ),
                    React.createElement(
                      'div',
                      { className: 'text-right' },
                      piece.dueDate ? React.createElement(
                        'div',
                        { className: `text-sm font-semibold ${isOverdue ? 'text-red-700' : 'text-blue-700'}` },
                        isOverdue && '⚠️ ',
                        'Due: ',
                        new Date(piece.dueDate).toLocaleDateString()
                      ) : React.createElement('div', { className: 'text-sm text-gray-400' }, 'No due date'),
                      piece.cost && React.createElement('div', { className: 'text-sm text-gray-600 mt-1' },
                        '$', parseFloat(piece.cost).toFixed(2)
                      )
                    )
                  )
                );
              })
            )
          )
        ) : (
          React.createElement(
            React.Fragment,
            null,
            production.acts.length === 0 && React.createElement(
              'div',
              { className: 'bg-gray-50 border border-gray-200 rounded-lg p-8 text-center' },
              React.createElement('p', { className: 'text-gray-600' }, 'No acts/scenes defined yet. Add scenes in the Scenes tab first.')
            ),

            production.acts.map((act, actIndex) =>
              React.createElement(
                'div',
                { key: actIndex },
                React.createElement(
                  'h4',
                  { className: 'text-lg font-bold text-white bg-blue-800 px-4 py-2 mb-3 rounded' },
                  act.name || `Act ${actIndex + 1}`
                ),
                act.scenes.map((scene, sceneIndex) => {
                  const scenePieces = filterPieces(scene.set?.pieces || [], act.name);

                  return React.createElement(
                    'div',
                    { key: sceneIndex, className: 'mb-4 bg-white border border-gray-200 rounded-lg p-4' },
                    // Scene header
                    React.createElement(
                      'div',
                      { className: 'flex flex-wrap items-start justify-between gap-2 mb-3' },
                      React.createElement(
                        'h4',
                        { className: 'font-semibold text-gray-900' },
                        `Scene ${scene.number || sceneIndex + 1}: ${scene.label || scene.title || 'Untitled'}`
                      ),
                      React.createElement(
                        'div',
                        { className: 'flex items-center gap-2 flex-shrink-0' },
                        scenePieces.length > 0 && React.createElement(
                          'span',
                          { className: 'text-sm text-gray-600' },
                          `${scenePieces.length} piece${scenePieces.length !== 1 ? 's' : ''}`
                        ),
                        React.createElement(
                          'button',
                          {
                            onClick: () => handleAddPiece(actIndex, sceneIndex),
                            className: 'px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 font-medium'
                          },
                          '+ Add Set Piece'
                        )
                      )
                    ),

                    // Set pieces list
                    scenePieces.length === 0 ? React.createElement(
                      'p',
                      { className: 'text-gray-500 text-sm italic' },
                      'No set pieces for this scene.'
                    ) : scenePieces.map((piece) =>
                      React.createElement(
                        'div',
                        { key: piece.id, className: 'flex flex-col gap-2 p-3 bg-gray-50 rounded border border-gray-200 mb-2' },

                        // Top row: checkbox, name, delete
                        React.createElement(
                          'div',
                          { className: 'flex items-center gap-2' },
                          React.createElement('input', {
                            type: 'checkbox',
                            checked: selectedPieces.includes(`${actIndex}:${sceneIndex}:${piece.id}`),
                            onChange: () => togglePieceSelection(actIndex, sceneIndex, piece.id),
                            className: 'w-5 h-5 flex-shrink-0 text-blue-600 rounded border-gray-300 focus:ring-blue-500',
                            title: 'Select for bulk delete'
                          }),
                          React.createElement('input', {
                            type: 'text',
                            value: piece.name || '',
                            onChange: (e) => handleUpdatePieceImmediate(actIndex, sceneIndex, piece.id, 'name', e.target.value),
                            onBlur: (e) => handleUpdatePieceAndSave(actIndex, sceneIndex, piece.id, 'name', e.target.value),
                            className: 'flex-1 min-w-0 px-2 py-1 border border-gray-300 rounded text-sm font-medium',
                            placeholder: 'Set piece name'
                          }),
                          React.createElement(
                            'button',
                            {
                              onClick: () => handleDeletePiece(actIndex, sceneIndex, piece.id),
                              className: 'flex-shrink-0 text-gray-400 hover:text-red-600 transition-colors p-0'
                            },
                            '🗑️'
                          )
                        ),

                        // Content
                        React.createElement(
                          'div',
                          { className: 'space-y-2' },

                          // === DESIGN SECTION (always visible) ===
                          React.createElement('p', { className: 'text-xs font-semibold text-gray-400 uppercase tracking-wide -mb-1' }, 'Design'),

                          // Description
                          React.createElement('textarea', {
                            value: piece.description || '',
                            onChange: (e) => handleUpdatePieceImmediate(actIndex, sceneIndex, piece.id, 'description', e.target.value),
                            onBlur: (e) => handleUpdatePieceAndSave(actIndex, sceneIndex, piece.id, 'description', e.target.value),
                            className: 'w-full px-2 py-1 border border-gray-300 rounded text-sm',
                            placeholder: 'Description',
                            rows: 2
                          }),

                          // Grid of fields - Type, Build Status, Priority, Dimensions
                          React.createElement(
                            'div',
                            { className: 'grid grid-cols-2 gap-2' },
                            React.createElement('select', {
                              value: piece.type || '',
                              onChange: (e) => {
                                handleUpdatePieceImmediate(actIndex, sceneIndex, piece.id, 'type', e.target.value);
                                handleUpdatePieceAndSave(actIndex, sceneIndex, piece.id, 'type', e.target.value);
                              },
                              className: 'px-2 py-1.5 border border-gray-300 rounded text-xs bg-white',
                              placeholder: 'Type'
                            },
                              React.createElement('option', { value: '' }, 'Type'),
                              pieceTypes.map(type =>
                                React.createElement('option', { key: type, value: type }, type)
                              )
                            ),
                            React.createElement('select', {
                              value: piece.buildStatus || 'Design Phase',
                              onChange: (e) => {
                                handleUpdatePieceImmediate(actIndex, sceneIndex, piece.id, 'buildStatus', e.target.value);
                                handleUpdatePieceAndSave(actIndex, sceneIndex, piece.id, 'buildStatus', e.target.value);
                              },
                              className: 'px-2 py-1.5 border border-gray-300 rounded text-xs bg-white'
                            },
                              buildStatuses.map(status =>
                                React.createElement('option', { key: status, value: status }, status)
                              )
                            ),
                            React.createElement('select', {
                              value: piece.priority || 'Normal',
                              onChange: (e) => {
                                handleUpdatePieceImmediate(actIndex, sceneIndex, piece.id, 'priority', e.target.value);
                                handleUpdatePieceAndSave(actIndex, sceneIndex, piece.id, 'priority', e.target.value);
                              },
                              className: 'px-2 py-1.5 border border-gray-300 rounded text-xs bg-white'
                            },
                              priorities.map(priority =>
                                React.createElement('option', { key: priority, value: priority }, priority)
                              )
                            ),
                            React.createElement('input', {
                              type: 'text',
                              placeholder: 'Dimensions',
                              value: piece.dimensions || '',
                              onChange: (e) => handleUpdatePieceImmediate(actIndex, sceneIndex, piece.id, 'dimensions', e.target.value),
                              onBlur: (e) => handleUpdatePieceAndSave(actIndex, sceneIndex, piece.id, 'dimensions', e.target.value),
                              className: 'px-2 py-1.5 border border-gray-300 rounded text-xs'
                            })
                          ),

                          // Materials + Cost (design budget)
                          React.createElement(
                            'div',
                            { className: 'grid grid-cols-2 gap-2' },
                            React.createElement('input', {
                              type: 'text',
                              placeholder: 'Materials',
                              value: piece.materials || '',
                              onChange: (e) => handleUpdatePieceImmediate(actIndex, sceneIndex, piece.id, 'materials', e.target.value),
                              onBlur: (e) => handleUpdatePieceAndSave(actIndex, sceneIndex, piece.id, 'materials', e.target.value),
                              className: 'px-2 py-1.5 border border-gray-300 rounded text-xs'
                            }),
                            React.createElement(
                              'div',
                              { className: 'relative' },
                              React.createElement('span', { className: 'absolute left-2 top-2 text-gray-500 text-xs pointer-events-none z-10' }, '$'),
                              React.createElement('input', {
                                type: 'text',
                                inputMode: 'decimal',
                                placeholder: '0.00',
                                value: piece.cost || '',
                                onChange: (e) => {
                                  let cleanValue = e.target.value.replace(/[^\d.]/g, '');
                                  handleUpdatePieceImmediate(actIndex, sceneIndex, piece.id, 'cost', cleanValue);
                                },
                                onBlur: (e) => {
                                  const value = e.target.value.trim();
                                  if (value && !isNaN(parseFloat(value))) {
                                    const formatted = parseFloat(value).toFixed(2);
                                    handleUpdatePieceAndSave(actIndex, sceneIndex, piece.id, 'cost', formatted);
                                  }
                                },
                                className: 'w-full pl-5 pr-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500'
                              })
                            )
                          ),

                          // === BUILD DETAILS TOGGLE ===
                          React.createElement(
                            'button',
                            {
                              type: 'button',
                              onClick: () => toggleConstruction(piece.id),
                              className: 'flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 font-medium mt-1 select-none'
                            },
                            expandedConstruction[piece.id] ? '▼' : '▶',
                            ' Build Details',
                            (() => {
                              const hasData = !!(piece.weight || piece.laborHours || piece.assignedTo || piece.dueDate || piece.laborLog || piece.constructionNotes || piece.riggingNotes || piece.safetyNotes);
                              return hasData && !expandedConstruction[piece.id]
                                ? React.createElement('span', { className: 'w-2 h-2 rounded-full bg-amber-400 inline-block ml-1', title: 'Build data entered' })
                                : null;
                            })()
                          ),

                          // === CONSTRUCTION SECTION (collapsible) ===
                          expandedConstruction[piece.id] && React.createElement(
                            'div',
                            { className: 'space-y-2 pt-2 border-t border-gray-200' },

                            // Weight + Labor Hours
                            React.createElement(
                              'div',
                              { className: 'grid grid-cols-2 gap-2' },
                              React.createElement('input', {
                                type: 'text',
                                placeholder: 'Weight',
                                value: piece.weight || '',
                                onChange: (e) => handleUpdatePieceImmediate(actIndex, sceneIndex, piece.id, 'weight', e.target.value),
                                onBlur: (e) => handleUpdatePieceAndSave(actIndex, sceneIndex, piece.id, 'weight', e.target.value),
                                className: 'px-2 py-1.5 border border-gray-300 rounded text-xs'
                              }),
                              React.createElement('input', {
                                type: 'text',
                                inputMode: 'decimal',
                                placeholder: 'Labor hrs',
                                value: piece.laborHours || '',
                                onChange: (e) => {
                                  let cleanValue = e.target.value.replace(/[^\d.]/g, '');
                                  handleUpdatePieceImmediate(actIndex, sceneIndex, piece.id, 'laborHours', cleanValue);
                                },
                                onBlur: (e) => handleUpdatePieceAndSave(actIndex, sceneIndex, piece.id, 'laborHours', e.target.value),
                                className: 'px-2 py-1.5 border border-gray-300 rounded text-xs'
                              })
                            ),

                            // Assigned To + Due Date
                            React.createElement(
                              'div',
                              { className: 'grid grid-cols-2 gap-2' },
                              React.createElement('input', {
                                type: 'text',
                                placeholder: 'Assigned to',
                                value: piece.assignedTo || '',
                                onChange: (e) => handleUpdatePieceImmediate(actIndex, sceneIndex, piece.id, 'assignedTo', e.target.value),
                                onBlur: (e) => handleUpdatePieceAndSave(actIndex, sceneIndex, piece.id, 'assignedTo', e.target.value),
                                className: 'px-2 py-1.5 border border-gray-300 rounded text-xs'
                              }),
                              React.createElement('input', {
                                type: 'date',
                                value: piece.dueDate || '',
                                onChange: (e) => handleUpdatePieceImmediate(actIndex, sceneIndex, piece.id, 'dueDate', e.target.value),
                                onBlur: (e) => handleUpdatePieceAndSave(actIndex, sceneIndex, piece.id, 'dueDate', e.target.value),
                                className: 'px-2 py-1.5 border border-gray-300 rounded text-xs'
                              })
                            ),

                            // Labor Log
                            React.createElement('input', {
                              type: 'text',
                              placeholder: 'Labor log (e.g., 2 hrs - framing)',
                              value: piece.laborLog || '',
                              onChange: (e) => handleUpdatePieceImmediate(actIndex, sceneIndex, piece.id, 'laborLog', e.target.value),
                              onBlur: (e) => handleUpdatePieceAndSave(actIndex, sceneIndex, piece.id, 'laborLog', e.target.value),
                              className: 'w-full px-2 py-1.5 border border-gray-300 rounded text-xs'
                            }),

                            // Construction Notes
                            React.createElement('textarea', {
                              placeholder: 'Construction notes (materials, techniques, concerns)',
                              value: piece.constructionNotes || '',
                              onChange: (e) => handleUpdatePieceImmediate(actIndex, sceneIndex, piece.id, 'constructionNotes', e.target.value),
                              onBlur: (e) => handleUpdatePieceAndSave(actIndex, sceneIndex, piece.id, 'constructionNotes', e.target.value),
                              className: 'w-full text-xs px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500',
                              rows: 2
                            }),

                            // Rigging Notes
                            React.createElement('textarea', {
                              placeholder: 'Rigging notes',
                              value: piece.riggingNotes || '',
                              onChange: (e) => handleUpdatePieceImmediate(actIndex, sceneIndex, piece.id, 'riggingNotes', e.target.value),
                              onBlur: (e) => handleUpdatePieceAndSave(actIndex, sceneIndex, piece.id, 'riggingNotes', e.target.value),
                              className: 'w-full text-xs px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500',
                              rows: 2
                            }),

                            // Safety Notes
                            React.createElement('textarea', {
                              placeholder: 'Safety notes',
                              value: piece.safetyNotes || '',
                              onChange: (e) => handleUpdatePieceImmediate(actIndex, sceneIndex, piece.id, 'safetyNotes', e.target.value),
                              onBlur: (e) => handleUpdatePieceAndSave(actIndex, sceneIndex, piece.id, 'safetyNotes', e.target.value),
                              className: 'w-full text-xs px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500',
                              rows: 2
                            })
                          )
                        )
                      )
                    )
                  );
                })
              )
            )
          )
        )
      )
  );
}

window.SetDesignView = SetDesignView;
