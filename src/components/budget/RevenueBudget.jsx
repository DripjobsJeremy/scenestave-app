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
            <div className="rounded-lg p-6" style={{ background: 'linear-gradient(135deg, rgba(201,161,74,0.1) 0%, rgba(139,26,43,0.08) 100%)', border: '1px solid rgba(201,161,74,0.25)' }}>
                <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>Total Revenue</h3>
                <div className="text-4xl font-bold mb-2" style={{ color: 'var(--color-accent-gold)' }}>
                    ${summary.totalRevenue.toLocaleString()}
                </div>
                <div className="flex gap-4 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    <div>Net Income: <span className={`font-semibold ${summary.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${summary.netIncome.toLocaleString()}
                    </span></div>
                    <div>Total Expenses: <span className="font-semibold">${summary.totalSpent.toLocaleString()}</span></div>
                </div>
            </div>

            {/* Revenue Sources */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {REVENUE_SOURCES.map(source => (
                    <div key={source.id} className="rounded-lg p-6" style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}>
                        <div className="flex items-center gap-3 mb-4">
                            <span className="text-3xl">{source.icon}</span>
                            <h4 className="font-semibold text-gray-900">{source.label}</h4>
                        </div>

                        {/* Slider */}
                        <input
                            type="range"
                            min="0"
                            max={Math.max((revenueData[source.id] || 0) * 2, 10000)}
                            step="1"
                            value={revenueData[source.id] || 0}
                            onChange={(e) => handleUpdate(source.id, e.target.value)}
                            onInput={(e) => {
                                const pct = ((e.target.value - e.target.min) / (e.target.max - e.target.min)) * 100;
                                e.target.style.setProperty('--rl-progress', pct + '%');
                            }}
                            style={{ '--rl-progress': (() => {
                                const val = revenueData[source.id] || 0;
                                const max = Math.max(val * 2, 10000);
                                return ((val / max) * 100) + '%';
                            })() }}
                            className="w-full mb-3 rl-slider"
                            title={`${source.label} amount`}
                        />

                        {/* Number input */}
                        <div className="relative">
                            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', fontSize: '14px' }}>$</span>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={revenueData[source.id] || 0}
                                onChange={(e) => handleUpdate(source.id, e.target.value)}
                                title={`${source.label} amount`}
                                placeholder="0.00"
                                className="w-full pl-7 pr-3 py-2 rounded-lg text-sm rl-number-input"
                                style={{
                                    background: 'var(--color-bg-base)',
                                    border: '1px solid var(--color-border)',
                                    color: 'var(--color-text-primary)'
                                }}
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
                        className="px-6 py-3 text-white rounded-lg font-semibold transition-colors hover:opacity-90"
                        style={{ background: '#8B1A2B' }}
                    >
                        💸 Allocate Donations to This Production
                    </button>
                </div>
            )}

            {/* Revenue Breakdown */}
            <div
                className="rounded-xl p-5"
                style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}
            >
                <h3
                    className="text-base font-semibold mb-4"
                    style={{ color: 'var(--color-text-primary)' }}
                >Revenue Breakdown</h3>
                {window.RevenueDoughnutChart && (
                    <window.RevenueDoughnutChart
                        revenueData={revenueData}
                        totalRevenue={summary.totalRevenue}
                    />
                )}
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
