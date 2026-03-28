function ProductionBudgetsFinancialView({ userRole }) {
    const [budgetSummaries, setBudgetSummaries] = React.useState([]);
    const [selectedProduction, setSelectedProduction] = React.useState(null);
    const [showBudgetManager, setShowBudgetManager] = React.useState(false);

    React.useEffect(() => {
        loadBudgets();
    }, []);

    const loadBudgets = () => {
        const summaries = window.budgetService.getAllProductionsBudgetSummary();
        setBudgetSummaries(summaries);
    };

    const totalStats = budgetSummaries.reduce((acc, s) => ({
        totalBudget: acc.totalBudget + s.totalBudget,
        totalAllocated: acc.totalAllocated + s.totalAllocated,
        totalSpent: acc.totalSpent + s.totalSpent,
        totalRevenue: acc.totalRevenue + s.totalRevenue,
        netIncome: acc.netIncome + s.netIncome
    }), { totalBudget: 0, totalAllocated: 0, totalSpent: 0, totalRevenue: 0, netIncome: 0 });

    return (
        <div className="space-y-6">
            {/* Overall Stats */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="text-sm text-gray-600 mb-1">Total Budgets</div>
                    <div className="text-2xl font-bold text-gray-900">
                        ${totalStats.totalBudget.toLocaleString()}
                    </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="text-sm text-gray-600 mb-1">Total Allocated</div>
                    <div className="text-2xl font-bold text-blue-600">
                        ${totalStats.totalAllocated.toLocaleString()}
                    </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="text-sm text-gray-600 mb-1">Total Spent</div>
                    <div className="text-2xl font-bold text-red-600">
                        ${totalStats.totalSpent.toLocaleString()}
                    </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="text-sm text-gray-600 mb-1">Total Revenue</div>
                    <div className="text-2xl font-bold text-green-600">
                        ${totalStats.totalRevenue.toLocaleString()}
                    </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="text-sm text-gray-600 mb-1">Net Income</div>
                    <div className={`text-2xl font-bold ${totalStats.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${totalStats.netIncome.toLocaleString()}
                    </div>
                </div>
            </div>

            {/* Production Budgets Table */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="p-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">All Production Budgets</h3>
                </div>

                {budgetSummaries.length > 0 ? (
                    <div className="hub-table-wrap overflow-x-auto">
                        <table className="hub-table budget-table">
                            <thead>
                                <tr>
                                    <th className="col-production">Production</th>
                                    <th className="right whitespace-nowrap col-budget">Budget</th>
                                    <th className="right whitespace-nowrap col-allocated">Allocated</th>
                                    <th className="right whitespace-nowrap col-spent">Spent</th>
                                    <th className="right whitespace-nowrap col-revenue">Revenue</th>
                                    <th className="right whitespace-nowrap col-net-income">Net Income</th>
                                    <th className="col-status">Status</th>
                                    <th className="right col-actions">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {budgetSummaries.map(summary => (
                                    <tr key={summary.productionId}>
                                        <td className="col-production">
                                            <span className="font-semibold">{summary.productionTitle}</span>
                                        </td>
                                        <td className="right nowrap">
                                            ${summary.totalBudget.toLocaleString()}
                                        </td>
                                        <td className="right nowrap">
                                            ${summary.totalAllocated.toLocaleString()}
                                        </td>
                                        <td className="right nowrap">
                                            <span className={summary.isOverBudget ? 'text-red-600 font-semibold' : ''}>
                                                ${summary.totalSpent.toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="right nowrap">
                                            <span className="text-green-600 font-semibold">
                                                ${summary.totalRevenue.toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="right nowrap">
                                            <span className={`font-semibold ${summary.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                ${summary.netIncome.toLocaleString()}
                                            </span>
                                        </td>
                                        <td>
                                            {summary.isOverBudget ? (
                                                <span className="whitespace-nowrap px-2 py-1 bg-red-100 text-red-700 text-xs rounded">
                                                    Over Budget
                                                </span>
                                            ) : summary.percentUsed > 90 ? (
                                                <span className="whitespace-nowrap px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded">
                                                    Warning
                                                </span>
                                            ) : (
                                                <span className="whitespace-nowrap px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                                                    On Track
                                                </span>
                                            )}
                                        </td>
                                        <td className="right nowrap">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const productions = JSON.parse(localStorage.getItem('showsuite_productions') || '[]');
                                                    const prod = productions.find(p => p.id === summary.productionId);
                                                    if (prod) {
                                                        setSelectedProduction(prod);
                                                        setShowBudgetManager(true);
                                                    }
                                                }}
                                                className="text-green-600 hover:text-green-700 font-medium text-sm"
                                            >
                                                Manage →
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-12 text-gray-400">
                        <div className="text-6xl mb-4">💰</div>
                        <p className="text-lg">No production budgets yet</p>
                        <p className="text-sm mt-2">Create budgets from the Productions tab</p>
                    </div>
                )}
            </div>

            {/* Budget Manager Modal */}
            {showBudgetManager && selectedProduction && window.ProductionBudgetManager && (
                React.createElement(window.ProductionBudgetManager, {
                    production: selectedProduction,
                    onClose: () => {
                        setShowBudgetManager(false);
                        setSelectedProduction(null);
                    },
                    onSave: () => {
                        setShowBudgetManager(false);
                        setSelectedProduction(null);
                        loadBudgets();
                        if (window.showToast) {
                            window.showToast('✅ Budget updated', 'success');
                        }
                    }
                })
            )}
        </div>
    );
}

window.ProductionBudgetsFinancialView = ProductionBudgetsFinancialView;

console.log('✅ ProductionBudgetsFinancialView component loaded');
