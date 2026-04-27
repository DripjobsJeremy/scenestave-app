function BudgetDashboardWidget({ userRole }) {
    const [budgetSummaries, setBudgetSummaries] = React.useState([]);
    const [totalStats, setTotalStats] = React.useState({
        totalBudget: 0,
        totalSpent: 0,
        totalRevenue: 0,
        netIncome: 0
    });

    React.useEffect(() => {
        loadBudgetData();
    }, []);

    const loadBudgetData = () => {
        const summaries = window.budgetService.getAllProductionsBudgetSummary();

        // Filter active productions only
        const productions = JSON.parse(localStorage.getItem('showsuite_productions') || '[]');
        const activeProductions = summaries.filter(s => {
            const prod = productions.find(p => p.id === s.productionId);
            if (!prod || !prod.calendar) return false;

            return prod.calendar.some(e =>
                e.type === 'show' && new Date(e.start || e.date) >= new Date()
            );
        });

        setBudgetSummaries(activeProductions);

        const totals = activeProductions.reduce((acc, s) => ({
            totalBudget: acc.totalBudget + s.totalBudget,
            totalSpent: acc.totalSpent + s.totalSpent,
            totalRevenue: acc.totalRevenue + s.totalRevenue,
            netIncome: acc.netIncome + s.netIncome
        }), { totalBudget: 0, totalSpent: 0, totalRevenue: 0, netIncome: 0 });

        setTotalStats(totals);
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Production Budgets</h2>
                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                    {budgetSummaries.length} Active
                </span>
            </div>

            {/* Total Stats */}
            <div className="grid grid-cols-4 gap-3 mb-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3">
                    <div className="text-xs text-gray-600 mb-1">Total Budget</div>
                    <div className="text-lg font-bold text-gray-900">
                        ${totalStats.totalBudget.toLocaleString()}
                    </div>
                </div>

                <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-3">
                    <div className="text-xs text-gray-600 mb-1">Total Spent</div>
                    <div className="text-lg font-bold text-gray-900">
                        ${totalStats.totalSpent.toLocaleString()}
                    </div>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3">
                    <div className="text-xs text-gray-600 mb-1">Total Revenue</div>
                    <div className="text-lg font-bold text-gray-900">
                        ${totalStats.totalRevenue.toLocaleString()}
                    </div>
                </div>

                <div className={`bg-gradient-to-br rounded-lg p-3 ${
                    totalStats.netIncome >= 0
                        ? 'from-emerald-50 to-emerald-100'
                        : 'from-orange-50 to-orange-100'
                }`}>
                    <div className="text-xs text-gray-600 mb-1">Net Income</div>
                    <div className="text-lg font-bold text-gray-900">
                        ${totalStats.netIncome.toLocaleString()}
                    </div>
                </div>
            </div>

            {/* Production List */}
            {budgetSummaries.length > 0 ? (
                <div className="space-y-2">
                    {budgetSummaries.slice(0, 5).map(summary => (
                        <div key={summary.productionId} className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="font-semibold text-gray-900">{summary.productionTitle}</h4>
                                {summary.isOverBudget && (
                                    <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded">
                                        Over Budget
                                    </span>
                                )}
                            </div>

                            <div className="grid grid-cols-3 gap-2 text-sm mb-2">
                                <div>
                                    <span className="text-gray-600">Budget: </span>
                                    <span className="font-semibold">${summary.totalAllocated.toLocaleString()}</span>
                                </div>
                                <div>
                                    <span className="text-gray-600">Spent: </span>
                                    <span className={`font-semibold ${summary.isOverBudget ? 'text-red-600' : ''}`}>
                                        ${summary.totalSpent.toLocaleString()}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-gray-600">Net: </span>
                                    <span className={`font-semibold ${summary.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        ${summary.netIncome.toLocaleString()}
                                    </span>
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all ${
                                        summary.percentUsed > 100 ? 'bg-red-500' :
                                        summary.percentUsed > 90 ? 'bg-yellow-500' :
                                        'bg-green-500'
                                    }`}
                                    style={{ width: `${Math.min(summary.percentUsed, 100)}%` }}
                                />
                            </div>
                            <div className="text-xs text-gray-500 mt-1 text-right">
                                {summary.percentUsed.toFixed(1)}% of budget used
                            </div>
                        </div>
                    ))}

                    {budgetSummaries.length > 5 && (
                        <div className="text-center text-sm text-gray-500 pt-2">
                            + {budgetSummaries.length - 5} more productions
                        </div>
                    )}
                </div>
            ) : (
                <div className="text-center py-8 text-gray-400">
                    <div className="text-4xl mb-2">💰</div>
                    <p>No active production budgets</p>
                </div>
            )}
        </div>
    );
}

window.BudgetDashboardWidget = BudgetDashboardWidget;

console.log('✅ BudgetDashboardWidget component loaded');
