function ProductionBudgetManager({ production, onClose, onSave }) {
    console.log('🎬 ProductionBudgetManager rendering for:', production?.id, production?.title);

    const [budget, setBudget] = React.useState(null);
    const [activeTab, setActiveTab] = React.useState('overview');

    const BUDGET_ROLES = ['super_admin', 'venue_manager', 'admin', 'client_admin', 'board_member', 'accounting_manager'];
    const canEditBudget = BUDGET_ROLES.includes(localStorage.getItem('showsuite_user_role') || 'admin');

    const [royalties, setRoyalties] = React.useState(() => ({
        flatFee: parseFloat(production?.royalties?.flatFee || 0),
        perPerformance: parseFloat(production?.royalties?.perPerformance || 0),
        perSeat: parseFloat(production?.royalties?.perSeat || 0),
        numberOfPerformances: parseInt(production?.royalties?.numberOfPerformances || 0),
        notes: production?.royalties?.notes || '',
    }));
    const [royaltiesExpanded, setRoyaltiesExpanded] = React.useState(false);

    const saveRoyalties = (updates) => {
        const updated = { ...royalties, ...updates };
        setRoyalties(updated);
        try {
            const prods = JSON.parse(localStorage.getItem('showsuite_productions') || '[]');
            const idx = prods.findIndex(p => p.id === production.id);
            if (idx !== -1) {
                prods[idx].royalties = updated;
                localStorage.setItem('showsuite_productions', JSON.stringify(prods));
            }
        } catch (e) { /* ignore */ }
    };

    React.useEffect(() => {
        loadBudget();
    }, [production.id]);

    const loadBudget = () => {
        console.log('📊 Loading budget for production:', production.id, production.title);

        try {
            // Try to sync department costs from scene data
            const synced = window.budgetService.syncDepartmentCosts(production.id);
            console.log('✅ Budget synced:', synced);
            setBudget(synced);
        } catch (error) {
            console.warn('⚠️ Sync failed, loading budget without sync:', error.message);
            // Load budget anyway even if sync fails
            const budgetData = window.budgetService.getProductionBudget(production.id);
            setBudget(budgetData);
        }
    };

    const handleUpdateTotalBudget = (value) => {
        const updated = window.budgetService.updateProductionBudget(production.id, {
            totalBudget: parseFloat(value) || 0
        });
        setBudget(updated);
    };

    const handleUpdateDepartmentAllocation = (department, value) => {
        const updated = window.budgetService.updateDepartmentBudget(production.id, department, {
            allocated: parseFloat(value) || 0
        });
        setBudget(updated);
    };

    const handleAutoAllocate = () => {
        const total = budget.totalBudget || 0;
        if (!total) return;
        const deptIds = DEPARTMENTS.map(d => d.id);
        const perDept = parseFloat((total / deptIds.length).toFixed(2));
        const remainder = parseFloat((total - perDept * (deptIds.length - 1)).toFixed(2));
        deptIds.forEach((deptId, idx) => {
            window.budgetService.updateDepartmentBudget(production.id, deptId, {
                allocated: idx === deptIds.length - 1 ? remainder : perDept
            });
        });
        loadBudget();
        if (window.showToast) {
            window.showToast(`⚡ Budget split evenly: $${perDept.toFixed(2)} per department`, 'success');
        }
    };

    const handleSyncDepartmentCosts = () => {
        const updated = window.budgetService.syncDepartmentCosts(production.id);
        setBudget(updated);
        if (window.showToast) {
            window.showToast('✅ Synced costs from scene data', 'success');
        }
    };

    const handleUpdateRevenue = (field, value) => {
        const updated = window.budgetService.updateProductionBudget(production.id, {
            revenue: {
                ...budget.revenue,
                [field]: parseFloat(value) || 0
            }
        });
        setBudget(updated);
    };

    if (!budget) return <div className="p-6">Loading budget...</div>;

    const summary = window.budgetService.calculateBudgetSummary(production.id);
    const royaltiesTotal = royalties.flatFee +
        (royalties.perPerformance * royalties.numberOfPerformances) +
        (royalties.perSeat * royalties.numberOfPerformances * (production?.seatingCapacity || 0));

    const DEPARTMENTS = [
        { id: 'lighting', name: 'Lighting', icon: '💡' },
        { id: 'sound', name: 'Sound', icon: '🔊' },
        { id: 'wardrobe', name: 'Wardrobe', icon: '👔' },
        { id: 'props', name: 'Props', icon: '🎭' },
        { id: 'set', name: 'Set Design', icon: '🎨' },
        { id: 'marketing', name: 'Marketing', icon: '📢' },
        { id: 'venue', name: 'Venue', icon: '🏛️' },
        { id: 'cast', name: 'Cast', icon: '🎬' },
        { id: 'crew', name: 'Crew', icon: '👷' },
        { id: 'other', name: 'Other', icon: '📦' }
    ];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold">Production Budget</h2>
                            <p className="text-green-100 mt-1">{production.title}</p>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-8 h-8 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full flex items-center justify-center transition-colors"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-4 gap-4 mt-6">
                        <div className="bg-white bg-opacity-10 rounded-lg p-3">
                            <div className="text-xs opacity-75">Total Budget</div>
                            <div className="text-xl font-bold">${summary.totalBudget.toLocaleString()}</div>
                        </div>
                        <div className="bg-white bg-opacity-10 rounded-lg p-3">
                            <div className="text-xs opacity-75">Allocated</div>
                            <div className="text-xl font-bold">${summary.totalAllocated.toLocaleString()}</div>
                        </div>
                        <div className="bg-white bg-opacity-10 rounded-lg p-3">
                            <div className="text-xs opacity-75">Spent</div>
                            <div className={`text-xl font-bold ${summary.isOverBudget ? 'text-red-300' : ''}`}>
                                ${summary.totalSpent.toLocaleString()}
                            </div>
                        </div>
                        <div className="bg-white bg-opacity-10 rounded-lg p-3">
                            <div className="text-xs opacity-75">Remaining</div>
                            <div className={`text-xl font-bold ${summary.remaining < 0 ? 'text-red-300' : ''}`}>
                                ${summary.remaining.toLocaleString()}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex gap-2 px-6 pt-4 border-b border-gray-200">
                    {[
                        { id: 'overview', label: 'Overview' },
                        { id: 'departments', label: 'Departments' },
                        { id: 'revenue', label: 'Revenue' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-2 border-b-2 transition-colors ${
                                activeTab === tab.id
                                    ? 'border-green-600 text-green-600 font-semibold'
                                    : 'border-transparent text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {activeTab === 'overview' && window.BudgetOverview && (
                        <window.BudgetOverview
                            budget={budget}
                            summary={summary}
                            canEditBudget={canEditBudget}
                            onUpdateTotalBudget={handleUpdateTotalBudget}
                            onSyncCosts={handleSyncDepartmentCosts}
                            royaltiesTotal={royaltiesTotal}
                        />
                    )}

                    {activeTab === 'departments' && window.DepartmentsBudget && (
                        <div>
                            <window.DepartmentsBudget
                                budget={budget}
                                summary={summary}
                                departments={DEPARTMENTS}
                                productionId={production.id}
                                canEditBudget={canEditBudget}
                                onUpdateAllocation={handleUpdateDepartmentAllocation}
                                onRefresh={loadBudget}
                                onAutoAllocate={handleAutoAllocate}
                            />

                            {/* Royalties & Licensing */}
                            <div className="border border-gray-200 rounded-lg overflow-hidden mt-6">
                                <button
                                    type="button"
                                    className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                                    onClick={() => setRoyaltiesExpanded(e => !e)}
                                >
                                    <div className="flex items-center gap-2">
                                        <span>🎭</span>
                                        <span className="font-semibold text-gray-900">Royalties &amp; Licensing</span>
                                        {royaltiesTotal > 0 && (
                                            <span className="text-xs text-yellow-600 font-medium ml-2">
                                                ${royaltiesTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })} total
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-gray-400 text-sm">{royaltiesExpanded ? '▼' : '▶'}</span>
                                </button>

                                {royaltiesExpanded && (
                                    <div className="p-4 grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs text-gray-600 mb-1">Flat Licensing Fee</label>
                                            <input
                                                type="number" min="0" step="0.01"
                                                value={royalties.flatFee}
                                                onChange={e => saveRoyalties({ flatFee: parseFloat(e.target.value) || 0 })}
                                                placeholder="0.00"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                                            />
                                            <p className="text-xs text-gray-400 mt-1">One-time fee paid to licensor</p>
                                        </div>

                                        <div>
                                            <label className="block text-xs text-gray-600 mb-1">Per-Performance Royalty</label>
                                            <input
                                                type="number" min="0" step="0.01"
                                                value={royalties.perPerformance}
                                                onChange={e => saveRoyalties({ perPerformance: parseFloat(e.target.value) || 0 })}
                                                placeholder="0.00"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                                            />
                                            <p className="text-xs text-gray-400 mt-1">Rate per performance</p>
                                        </div>

                                        <div>
                                            <label className="block text-xs text-gray-600 mb-1">Number of Performances</label>
                                            <input
                                                type="number" min="0" step="1"
                                                value={royalties.numberOfPerformances}
                                                onChange={e => saveRoyalties({ numberOfPerformances: parseInt(e.target.value) || 0 })}
                                                placeholder="0"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs text-gray-600 mb-1">
                                                Per-Seat Royalty <span className="text-gray-400 font-normal">(optional)</span>
                                            </label>
                                            <input
                                                type="number" min="0" step="0.01"
                                                value={royalties.perSeat}
                                                onChange={e => saveRoyalties({ perSeat: parseFloat(e.target.value) || 0 })}
                                                placeholder="0.00"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                                            />
                                            <p className="text-xs text-gray-400 mt-1">Rate × performances × seats</p>
                                        </div>

                                        <div className="col-span-2">
                                            <label className="block text-xs text-gray-600 mb-1">Licensing Notes</label>
                                            <textarea
                                                value={royalties.notes}
                                                onChange={e => saveRoyalties({ notes: e.target.value })}
                                                placeholder="Licensor contact, rights holder, contract number, renewal date..."
                                                rows={2}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 resize-y"
                                            />
                                        </div>

                                        <div className="col-span-2 bg-gray-50 border border-gray-200 rounded-lg p-3">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-gray-600">
                                                    Flat fee ${royalties.flatFee.toFixed(2)}
                                                    {royalties.perPerformance > 0 && ` + $${royalties.perPerformance.toFixed(2)} × ${royalties.numberOfPerformances} performances`}
                                                    {royalties.perSeat > 0 && ` + $${royalties.perSeat.toFixed(2)}/seat`}
                                                </span>
                                                <span className={`text-base font-bold ${royaltiesTotal > 0 ? 'text-yellow-600' : 'text-gray-400'}`}>
                                                    ${royaltiesTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                            {royaltiesTotal > 0 && (
                                                <p className="text-xs text-gray-400 mt-1">
                                                    Royalties are not included in department allocations — budget accordingly
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'revenue' && window.RevenueBudget && (
                        <window.RevenueBudget
                            budget={budget}
                            summary={summary}
                            productionId={production.id}
                            productionTitle={production.title}
                            onUpdateRevenue={handleUpdateRevenue}
                            onRefresh={loadBudget}
                        />
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 p-4 bg-gray-50 flex justify-between items-center">
                    <div className="text-sm text-gray-600">
                        Last updated: {new Date(budget.lastUpdated).toLocaleString()}
                    </div>
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                        >
                            Close
                        </button>
                        {canEditBudget && <button
                            type="button"
                            onClick={() => {
                                if (onSave) onSave();
                                if (window.showToast) {
                                    window.showToast('✅ Budget saved', 'success');
                                }
                            }}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                            Save & Close
                        </button>}
                    </div>
                </div>
            </div>
        </div>
    );
}

window.ProductionBudgetManager = ProductionBudgetManager;

console.log('✅ ProductionBudgetManager component loaded - VERSION 2');
