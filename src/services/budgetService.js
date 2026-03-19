const BudgetService = (() => {
    const STORAGE_KEY = 'showsuite_production_budgets';

    const DEFAULT_BUDGET_STRUCTURE = {
        totalBudget: 0,
        departments: {
            lighting: { allocated: 0, spent: 0, items: [] },
            sound: { allocated: 0, spent: 0, items: [] },
            wardrobe: { allocated: 0, spent: 0, items: [] },
            props: { allocated: 0, spent: 0, items: [] },
            set: { allocated: 0, spent: 0, items: [] },
            marketing: { allocated: 0, spent: 0, items: [] },
            venue: { allocated: 0, spent: 0, items: [] },
            cast: { allocated: 0, spent: 0, items: [] },
            crew: { allocated: 0, spent: 0, items: [] },
            other: { allocated: 0, spent: 0, items: [] }
        },
        revenue: {
            ticketSales: 0,
            donations: 0,
            grants: 0,
            sponsorships: 0,
            other: 0
        },
        notes: '',
        lastUpdated: new Date().toISOString()
    };

    const loadBudgets = () => {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : {};
        } catch (error) {
            console.error('Error loading budgets:', error);
            return {};
        }
    };

    const saveBudgets = (budgets) => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(budgets));
            return true;
        } catch (error) {
            console.error('Error saving budgets:', error);
            return false;
        }
    };

    const getProductionBudget = (productionId) => {
        const budgets = loadBudgets();
        if (!budgets[productionId]) {
            budgets[productionId] = { ...DEFAULT_BUDGET_STRUCTURE };
            saveBudgets(budgets);
        }
        return budgets[productionId];
    };

    const updateProductionBudget = (productionId, updates) => {
        const budgets = loadBudgets();
        budgets[productionId] = {
            ...budgets[productionId],
            ...updates,
            lastUpdated: new Date().toISOString()
        };
        saveBudgets(budgets);
        return budgets[productionId];
    };

    const updateDepartmentBudget = (productionId, department, updates) => {
        const budgets = loadBudgets();
        if (!budgets[productionId]) {
            budgets[productionId] = { ...DEFAULT_BUDGET_STRUCTURE };
        }

        budgets[productionId].departments[department] = {
            ...budgets[productionId].departments[department],
            ...updates
        };

        budgets[productionId].lastUpdated = new Date().toISOString();
        saveBudgets(budgets);

        return budgets[productionId];
    };

    const addBudgetItem = (productionId, department, item) => {
        const budgets = loadBudgets();
        if (!budgets[productionId]) {
            budgets[productionId] = { ...DEFAULT_BUDGET_STRUCTURE };
        }

        const newItem = {
            id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            description: item.description || '',
            estimatedCost: parseFloat(item.estimatedCost) || 0,
            actualCost: parseFloat(item.actualCost) || 0,
            vendor: item.vendor || '',
            status: item.status || 'planned', // planned, ordered, received, paid
            notes: item.notes || '',
            createdAt: new Date().toISOString()
        };

        if (!budgets[productionId].departments[department].items) {
            budgets[productionId].departments[department].items = [];
        }

        budgets[productionId].departments[department].items.push(newItem);

        // Recalculate spent
        const spent = budgets[productionId].departments[department].items
            .reduce((sum, i) => sum + (parseFloat(i.actualCost) || 0), 0);
        budgets[productionId].departments[department].spent = spent;

        budgets[productionId].lastUpdated = new Date().toISOString();
        saveBudgets(budgets);

        return newItem;
    };

    const updateBudgetItem = (productionId, department, itemId, updates) => {
        const budgets = loadBudgets();
        if (!budgets[productionId]?.departments[department]?.items) {
            return null;
        }

        const items = budgets[productionId].departments[department].items;
        const index = items.findIndex(i => i.id === itemId);

        if (index === -1) return null;

        items[index] = { ...items[index], ...updates };

        // Recalculate spent
        const spent = items.reduce((sum, i) => sum + (parseFloat(i.actualCost) || 0), 0);
        budgets[productionId].departments[department].spent = spent;

        budgets[productionId].lastUpdated = new Date().toISOString();
        saveBudgets(budgets);

        return items[index];
    };

    const deleteBudgetItem = (productionId, department, itemId) => {
        const budgets = loadBudgets();
        if (!budgets[productionId]?.departments[department]?.items) {
            return false;
        }

        budgets[productionId].departments[department].items =
            budgets[productionId].departments[department].items.filter(i => i.id !== itemId);

        // Recalculate spent
        const spent = budgets[productionId].departments[department].items
            .reduce((sum, i) => sum + (parseFloat(i.actualCost) || 0), 0);
        budgets[productionId].departments[department].spent = spent;

        budgets[productionId].lastUpdated = new Date().toISOString();
        saveBudgets(budgets);

        return true;
    };

    const calculateBudgetSummary = (productionId) => {
        const budget = getProductionBudget(productionId);

        const totalAllocated = Object.values(budget.departments)
            .reduce((sum, dept) => sum + (parseFloat(dept.allocated) || 0), 0);

        const totalSpent = Object.values(budget.departments)
            .reduce((sum, dept) => sum + (parseFloat(dept.spent) || 0), 0);

        const totalRevenue = Object.values(budget.revenue)
            .reduce((sum, val) => sum + (parseFloat(val) || 0), 0);

        const remaining = totalAllocated - totalSpent;
        const percentUsed = totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0;
        const netIncome = totalRevenue - totalSpent;

        return {
            totalBudget: budget.totalBudget,
            totalAllocated,
            totalSpent,
            totalRevenue,
            remaining,
            percentUsed,
            netIncome,
            isOverBudget: totalSpent > totalAllocated,
            departments: Object.entries(budget.departments).map(([name, dept]) => ({
                name,
                allocated: dept.allocated || 0,
                spent: dept.spent || 0,
                remaining: (dept.allocated || 0) - (dept.spent || 0),
                percentUsed: dept.allocated > 0 ? ((dept.spent || 0) / dept.allocated) * 100 : 0,
                isOverBudget: (dept.spent || 0) > (dept.allocated || 0),
                itemCount: dept.items?.length || 0
            }))
        };
    };

    const getAllProductionsBudgetSummary = () => {
        const budgets = loadBudgets();
        const productions = JSON.parse(localStorage.getItem('showsuite_productions') || '[]');

        return productions.map(prod => {
            const summary = calculateBudgetSummary(prod.id);
            return {
                productionId: prod.id,
                productionTitle: prod.title,
                ...summary
            };
        });
    };

    const syncDepartmentCosts = (productionId) => {
        console.log('🔄 Syncing department costs for production:', productionId);

        const productions = JSON.parse(localStorage.getItem('showsuite_productions') || '[]');
        const production = productions.find(p => p.id === productionId);

        const budgets = loadBudgets();
        if (!budgets[productionId]) {
            budgets[productionId] = { ...DEFAULT_BUDGET_STRUCTURE };
            saveBudgets(budgets);
        }

        if (!production) {
            console.log('❌ No production found, returning default budget');
            return budgets[productionId];
        }

        if (!production.scenes || production.scenes.length === 0) {
            console.log('⚠️ No scenes found, returning budget without sync');
            return budgets[productionId];
        }

        const departmentCosts = { lighting: 0, sound: 0, wardrobe: 0, props: 0, set: 0 };

        console.log('📊 Processing', production.scenes.length, 'scenes');

        production.scenes.forEach((scene, idx) => {
            console.log('Scene', idx + 1, ':', scene.title);

            // Lighting costs
            if (scene.lighting) {
                if (Array.isArray(scene.lighting.fixtures)) {
                    scene.lighting.fixtures.forEach(f => {
                        const cost = parseFloat(f.cost) || 0;
                        if (cost > 0) { console.log('  💡 Lighting fixture:', f.type, '$' + cost); departmentCosts.lighting += cost; }
                    });
                }
                if (Array.isArray(scene.lighting.gels)) {
                    scene.lighting.gels.forEach(g => {
                        const cost = parseFloat(g.cost) || 0;
                        if (cost > 0) { console.log('  💡 Lighting gel:', g.color, '$' + cost); departmentCosts.lighting += cost; }
                    });
                }
                if (Array.isArray(scene.lighting.cues)) {
                    scene.lighting.cues.forEach(c => {
                        const cost = parseFloat(c.cost) || 0;
                        if (cost > 0) { console.log('  💡 Lighting cue:', c.name, '$' + cost); departmentCosts.lighting += cost; }
                    });
                }
            }

            // Sound costs
            if (scene.sound) {
                if (Array.isArray(scene.sound.cues)) {
                    scene.sound.cues.forEach(c => {
                        const cost = parseFloat(c.cost) || 0;
                        if (cost > 0) { console.log('  🔊 Sound cue:', c.name, '$' + cost); departmentCosts.sound += cost; }
                    });
                }
                if (Array.isArray(scene.sound.music)) {
                    scene.sound.music.forEach(t => {
                        const cost = parseFloat(t.cost) || 0;
                        if (cost > 0) { console.log('  🔊 Music track:', t.title, '$' + cost); departmentCosts.sound += cost; }
                    });
                }
                if (Array.isArray(scene.sound.equipment)) {
                    scene.sound.equipment.forEach(e => {
                        const cost = parseFloat(e.cost) || 0;
                        if (cost > 0) { console.log('  🔊 Sound equipment:', e.name, '$' + cost); departmentCosts.sound += cost; }
                    });
                }
            }

            // Wardrobe costs
            if (scene.wardrobe) {
                if (Array.isArray(scene.wardrobe.costumes)) {
                    scene.wardrobe.costumes.forEach(c => {
                        const cost = parseFloat(c.cost) || 0;
                        if (cost > 0) { console.log('  👔 Wardrobe costume:', c.character, '$' + cost); departmentCosts.wardrobe += cost; }
                    });
                }
                if (Array.isArray(scene.wardrobe.items)) {
                    scene.wardrobe.items.forEach(i => {
                        const cost = parseFloat(i.cost) || 0;
                        if (cost > 0) { console.log('  👔 Wardrobe item:', i.name, '$' + cost); departmentCosts.wardrobe += cost; }
                    });
                }
            }

            // Props costs
            if (scene.props) {
                if (Array.isArray(scene.props.items)) {
                    scene.props.items.forEach(p => {
                        const cost = parseFloat(p.cost) || parseFloat(p.Cost) || 0;
                        if (cost > 0) { console.log('  🎭 Prop:', p.name || p['Prop Name'], '$' + cost); departmentCosts.props += cost; }
                    });
                }
            }

            // Set costs
            if (scene.set) {
                if (Array.isArray(scene.set.pieces)) {
                    scene.set.pieces.forEach(p => {
                        const cost = parseFloat(p.cost) || 0;
                        if (cost > 0) { console.log('  🎨 Set piece:', p.name, '$' + cost); departmentCosts.set += cost; }
                    });
                }
                if (Array.isArray(scene.set.elements)) {
                    scene.set.elements.forEach(e => {
                        const cost = parseFloat(e.cost) || 0;
                        if (cost > 0) { console.log('  🎨 Set element:', e.name, '$' + cost); departmentCosts.set += cost; }
                    });
                }
            }
        });

        console.log('💰 Calculated department costs:', departmentCosts);

        // Update spent amounts from scene data
        Object.entries(departmentCosts).forEach(([dept, cost]) => {
            if (budgets[productionId].departments[dept]) {
                const existingItemsCost = (budgets[productionId].departments[dept].items || [])
                    .reduce((sum, item) => sum + (parseFloat(item.actualCost) || 0), 0);

                if (!budgets[productionId].departments[dept].items?.length) {
                    budgets[productionId].departments[dept].spent = cost;
                    console.log(`  ✅ ${dept}: Set spent to $${cost} from scene data`);
                } else {
                    budgets[productionId].departments[dept].spent = existingItemsCost + cost;
                    console.log(`  ✅ ${dept}: Combined items ($${existingItemsCost}) + scene data ($${cost}) = $${existingItemsCost + cost}`);
                }
            }
        });

        budgets[productionId].lastUpdated = new Date().toISOString();
        saveBudgets(budgets);

        console.log('✅ Sync complete');
        return budgets[productionId];
    };

    return {
        loadBudgets,
        saveBudgets,
        getProductionBudget,
        updateProductionBudget,
        updateDepartmentBudget,
        addBudgetItem,
        updateBudgetItem,
        deleteBudgetItem,
        calculateBudgetSummary,
        getAllProductionsBudgetSummary,
        syncDepartmentCosts,
        DEFAULT_BUDGET_STRUCTURE
    };
})();

window.budgetService = BudgetService;

console.log('✅ Budget Service loaded');
