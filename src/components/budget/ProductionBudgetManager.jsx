function ProductionBudgetManager({ production, onClose, onSave }) {
    console.log('🎬 ProductionBudgetManager rendering for:', production?.id, production?.title);

    const [budget, setBudget] = React.useState(null);
    const [activeTab, setActiveTab] = React.useState('overview');

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
                            onUpdateTotalBudget={handleUpdateTotalBudget}
                            onSyncCosts={handleSyncDepartmentCosts}
                        />
                    )}

                    {activeTab === 'departments' && window.DepartmentsBudget && (
                        <window.DepartmentsBudget
                            budget={budget}
                            summary={summary}
                            departments={DEPARTMENTS}
                            productionId={production.id}
                            onUpdateAllocation={handleUpdateDepartmentAllocation}
                            onRefresh={loadBudget}
                        />
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
                        <button
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
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

window.ProductionBudgetManager = ProductionBudgetManager;

console.log('✅ ProductionBudgetManager component loaded - VERSION 2');
