function RevenueBudget({ budget, summary, productionId, productionTitle, onUpdateRevenue, onRefresh }) {
    const [revenueData, setRevenueData] = React.useState(budget.revenue);
    const [showAllocationManager, setShowAllocationManager] = React.useState(false);

    const handleUpdate = (field, value) => {
        const updated = { ...revenueData, [field]: parseFloat(value) || 0 };
        setRevenueData(updated);
        onUpdateRevenue(field, value);
    };

    const REVENUE_SOURCES = [
        { id: 'ticketSales', label: 'Ticket Sales', icon: '🎫', color: 'purple' },
        { id: 'donations', label: 'Donations', icon: '💰', color: 'green' },
        { id: 'grants', label: 'Grants', icon: '📜', color: 'blue' },
        { id: 'sponsorships', label: 'Sponsorships', icon: '🤝', color: 'indigo' },
        { id: 'other', label: 'Other Revenue', icon: '📊', color: 'gray' }
    ];

    return (
        <div className="space-y-6">
            {/* Revenue Summary */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Total Revenue</h3>
                <div className="text-4xl font-bold text-green-600 mb-2">
                    ${summary.totalRevenue.toLocaleString()}
                </div>
                <div className="flex gap-4 text-sm text-gray-600">
                    <div>Net Income: <span className={`font-semibold ${summary.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${summary.netIncome.toLocaleString()}
                    </span></div>
                    <div>Total Expenses: <span className="font-semibold">${summary.totalSpent.toLocaleString()}</span></div>
                </div>
            </div>

            {/* Revenue Sources */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {REVENUE_SOURCES.map(source => (
                    <div key={source.id} className="bg-white border border-gray-200 rounded-lg p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="text-3xl">{source.icon}</span>
                            <h4 className="font-semibold text-gray-900">{source.label}</h4>
                        </div>

                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                            <input
                                type="number"
                                value={revenueData[source.id] || ''}
                                onChange={(e) => handleUpdate(source.id, e.target.value)}
                                className="w-full pl-8 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-xl font-semibold"
                                placeholder="0.00"
                                step="0.01"
                            />
                        </div>

                        <div className="mt-2 text-sm text-gray-600">
                            {revenueData[source.id] > 0 && summary.totalRevenue > 0 && (
                                <span>{((revenueData[source.id] / summary.totalRevenue) * 100).toFixed(1)}% of total revenue</span>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Allocate Donations Button */}
            {productionId && (
                <div className="flex justify-center">
                    <button
                        type="button"
                        onClick={() => setShowAllocationManager(true)}
                        className="px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-semibold transition-colors"
                    >
                        💸 Allocate Donations to This Production
                    </button>
                </div>
            )}

            {/* Revenue Breakdown Chart */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-4">Revenue Breakdown</h4>
                <div className="space-y-3">
                    {REVENUE_SOURCES.map(source => {
                        const amount = revenueData[source.id] || 0;
                        const percentage = summary.totalRevenue > 0 ? (amount / summary.totalRevenue) * 100 : 0;

                        return (
                            <div key={source.id}>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-gray-700">{source.icon} {source.label}</span>
                                    <span className="font-semibold">${amount.toLocaleString()} ({percentage.toFixed(1)}%)</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                    <div
                                        className={`h-full rounded-full ${
                                            source.color === 'purple' ? 'bg-purple-500' :
                                            source.color === 'green' ? 'bg-green-500' :
                                            source.color === 'blue' ? 'bg-blue-500' :
                                            source.color === 'indigo' ? 'bg-indigo-500' :
                                            'bg-gray-500'
                                        }`}
                                        style={{ width: `${percentage}%` }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Profit/Loss Statement */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-4">Profit & Loss Statement</h4>
                <div className="space-y-2">
                    <div className="flex justify-between py-2">
                        <span className="text-gray-700">Total Revenue</span>
                        <span className="font-semibold text-green-600">+${summary.totalRevenue.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-2">
                        <span className="text-gray-700">Total Expenses</span>
                        <span className="font-semibold text-red-600">-${summary.totalSpent.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-3 border-t-2 border-gray-300">
                        <span className="font-bold text-gray-900">Net Income</span>
                        <span className={`font-bold text-xl ${summary.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ${summary.netIncome.toLocaleString()}
                        </span>
                    </div>
                </div>

                {summary.netIncome < 0 && (
                    <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded">
                        <div className="font-semibold text-red-900 mb-1">⚠️ Loss Warning</div>
                        <p className="text-sm text-red-700">
                            This production is currently ${Math.abs(summary.netIncome).toLocaleString()} in the red.
                            Consider reducing expenses or increasing revenue sources.
                        </p>
                    </div>
                )}
            </div>
            {/* Allocation Manager Modal */}
            {showAllocationManager && productionId && window.DonationAllocationManager && (
                React.createElement(window.DonationAllocationManager, {
                    productionId: productionId,
                    productionTitle: productionTitle || '',
                    onClose: () => {
                        setShowAllocationManager(false);
                        if (onRefresh) onRefresh();
                    }
                })
            )}
        </div>
    );
}

window.RevenueBudget = RevenueBudget;

console.log('✅ RevenueBudget component loaded');
