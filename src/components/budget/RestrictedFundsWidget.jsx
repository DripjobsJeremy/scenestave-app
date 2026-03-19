function RestrictedFundsWidget() {
    const [restrictedFunds, setRestrictedFunds] = React.useState([]);

    React.useEffect(() => {
        loadRestrictedFunds();
    }, []);

    const loadRestrictedFunds = () => {
        if (!window.donationsService) return;
        const summary = window.donationsService.getRestrictedFundsSummary();
        setRestrictedFunds(summary || []);
    };

    const totalRestricted = restrictedFunds.reduce((sum, fund) => sum + (fund.totalAmount || 0), 0);

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Restricted Funds</h2>
                <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded font-medium">
                    Cannot Reallocate
                </span>
            </div>

            <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="text-sm text-orange-800 mb-1">Total Restricted</div>
                <div className="text-2xl font-bold text-orange-900">
                    ${totalRestricted.toLocaleString()}
                </div>
            </div>

            {restrictedFunds.length > 0 ? (
                <div className="space-y-3">
                    {restrictedFunds.map((fund, idx) => (
                        <div key={idx} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="font-semibold text-gray-900 text-sm">{fund.purpose}</h4>
                                <span className="text-xs text-gray-500">{fund.donationCount} donation{fund.donationCount !== 1 ? 's' : ''}</span>
                            </div>
                            <div className="text-xl font-bold text-gray-900">
                                ${(fund.totalAmount || 0).toLocaleString()}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                                Must be used only for: {fund.purpose}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-8 text-gray-400">
                    <div className="text-4xl mb-2">🔒</div>
                    <p className="text-sm">No restricted funds</p>
                </div>
            )}
        </div>
    );
}

window.RestrictedFundsWidget = RestrictedFundsWidget;

console.log('✅ RestrictedFundsWidget component loaded');
