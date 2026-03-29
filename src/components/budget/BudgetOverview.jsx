function BudgetOverview({ budget, summary, canEditBudget = true, onUpdateTotalBudget, onSyncCosts, royaltiesTotal = 0 }) {
    const [totalBudget, setTotalBudget] = React.useState(budget.totalBudget);

    return (
        <div className="space-y-6">
            {/* Total Budget */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Total Production Budget</h3>
                <div className="flex items-center gap-4">
                    <div className="flex-1">
                        <label htmlFor="total-budget" className="block text-sm font-medium text-gray-700 mb-1">
                            Total Budget Amount
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                            <input
                                id="total-budget"
                                type="number"
                                value={totalBudget}
                                onChange={(e) => canEditBudget && setTotalBudget(e.target.value)}
                                onBlur={() => canEditBudget && onUpdateTotalBudget(totalBudget)}
                                readOnly={!canEditBudget}
                                className={`w-full pl-8 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-2xl font-bold ${!canEditBudget ? 'opacity-60 cursor-not-allowed bg-gray-50' : ''}`}
                                placeholder="0.00"
                                step="0.01"
                            />
                        </div>
                    </div>
                    {canEditBudget && <button
                        type="button"
                        onClick={onSyncCosts}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                        title="Sync costs from scene-level department data"
                    >
                        🔄 Sync Costs
                    </button>}
                </div>
            </div>

            {/* Budget Breakdown */}
            <div className="grid grid-cols-2 gap-6">
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h4 className="font-semibold text-gray-900 mb-4">Expense Summary</h4>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600">Total Allocated:</span>
                            <span className="font-semibold">${summary.totalAllocated.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600">Total Spent:</span>
                            <span className={`font-semibold ${summary.isOverBudget ? 'text-red-600' : 'text-gray-900'}`}>
                                ${summary.totalSpent.toLocaleString()}
                            </span>
                        </div>
                        {royaltiesTotal > 0 && (
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600">Royalties &amp; Licensing:</span>
                                <span className="font-semibold text-yellow-600">
                                    ${royaltiesTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                        )}
                        <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                            <span className="text-gray-900 font-medium">Remaining:</span>
                            <span className={`font-bold text-lg ${summary.remaining < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                ${summary.remaining.toLocaleString()}
                            </span>
                        </div>
                        {royaltiesTotal > 0 && (
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600 text-sm">Total incl. Royalties:</span>
                                <span className="font-semibold text-gray-900">
                                    ${(summary.totalSpent + royaltiesTotal).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-4">
                        <div className="flex justify-between text-xs text-gray-600 mb-1">
                            <span>Budget Used</span>
                            <span>{summary.percentUsed.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                            <div
                                className={`h-full transition-all duration-300 ${
                                    summary.percentUsed > 100 ? 'bg-red-500' :
                                    summary.percentUsed > 90 ? 'bg-yellow-500' :
                                    'bg-green-500'
                                }`}
                                style={{ width: `${Math.min(summary.percentUsed, 100)}%` }}
                            />
                        </div>
                    </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h4 className="font-semibold text-gray-900 mb-4">Revenue Summary</h4>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600">Total Revenue:</span>
                            <span className="font-semibold">${summary.totalRevenue.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600">Total Expenses:</span>
                            <span className="font-semibold">${summary.totalSpent.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                            <span className="text-gray-900 font-medium">Net Income:</span>
                            <span className={`font-bold text-lg ${summary.netIncome < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                ${summary.netIncome.toLocaleString()}
                            </span>
                        </div>
                    </div>

                    {summary.netIncome < 0 && (
                        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                            ⚠️ Production is currently operating at a loss
                        </div>
                    )}
                </div>
            </div>

            {/* Department Breakdown */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-4">Department Breakdown</h4>
                <div className="grid grid-cols-2 gap-4">
                    {summary.departments.map(dept => (
                        <div key={dept.name} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                            <div className="flex-1">
                                <div className="font-medium text-gray-900 capitalize">{dept.name}</div>
                                <div className="text-sm text-gray-600">
                                    ${dept.spent.toLocaleString()} / ${dept.allocated.toLocaleString()}
                                </div>
                            </div>
                            <div className={`text-sm font-semibold ${dept.isOverBudget ? 'text-red-600' : 'text-gray-600'}`}>
                                {dept.percentUsed.toFixed(0)}%
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

window.BudgetOverview = BudgetOverview;

console.log('✅ BudgetOverview component loaded');
