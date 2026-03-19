function DonationAllocationManager({ productionId, productionTitle, onClose }) {
    const [allocations, setAllocations] = React.useState([]);
    const [availableDonations, setAvailableDonations] = React.useState([]);
    const [showAllocateModal, setShowAllocateModal] = React.useState(false);
    const [selectedDonationId, setSelectedDonationId] = React.useState('');
    const [allocateAmount, setAllocateAmount] = React.useState('');
    const [allocateError, setAllocateError] = React.useState('');
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const load = () => {
        if (!window.donationsService) return;

        // Load existing allocations for this production
        const prodAllocations = window.donationsService.getProductionAllocations(productionId);
        setAllocations(prodAllocations);

        // getUnallocatedDonations returns all non-restricted donations with available balance
        const allUnallocated = window.donationsService.getUnallocatedDonations();
        console.log('📊 DonationAllocationManager: all unallocated:', allUnallocated.length, 'for production:', productionId);

        const eligible = allUnallocated.filter(d => {
            // Production-specific: only show if designated for THIS production
            if (d.restrictionType === 'production-specific') {
                const matches = d.designatedProductionId === productionId;
                console.log('🎭 Production-specific:', d.id, 'designated:', d.designatedProductionId, 'matches:', matches);
                return matches;
            }
            // Unrestricted (or null/undefined): always eligible
            console.log('✅ Unrestricted donation eligible:', d.id);
            return true;
        });

        console.log('✅ Eligible for this production:', eligible.length);
        setAvailableDonations(eligible);
    };

    React.useEffect(() => {
        load();
    }, [productionId]);

    const getAvailableForSelected = () => {
        if (!selectedDonationId) return 0;
        return window.donationsService.getDonationAvailableAmount(selectedDonationId);
    };

    const handleAllocate = () => {
        setAllocateError('');
        const amount = parseFloat(allocateAmount);
        if (!selectedDonationId) {
            setAllocateError('Please select a donation.');
            return;
        }
        if (!amount || amount <= 0) {
            setAllocateError('Please enter a valid amount greater than $0.');
            return;
        }
        const available = getAvailableForSelected();
        if (amount > available) {
            setAllocateError(`Amount exceeds available balance of $${available.toLocaleString()}.`);
            return;
        }

        setIsSubmitting(true);
        try {
            window.donationsService.allocateDonationToProduction(selectedDonationId, productionId, amount);
            setShowAllocateModal(false);
            setSelectedDonationId('');
            setAllocateAmount('');
            load();
            if (window.showToast) window.showToast('✅ Donation allocated successfully', 'success');
        } catch (err) {
            setAllocateError(err.message || 'Failed to allocate donation.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRemove = (donationId, allocationId) => {
        if (!window.confirm('Remove this allocation? The funds will be returned to the donation\'s available balance.')) return;
        try {
            window.donationsService.removeAllocation(donationId, allocationId);
            load();
            if (window.showToast) window.showToast('Allocation removed', 'info');
        } catch (err) {
            if (window.showToast) window.showToast('Failed to remove allocation: ' + err.message, 'error');
        }
    };

    const totalAllocated = allocations.reduce((sum, a) => sum + (a.amount || 0), 0);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-xl" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="bg-gradient-to-r from-violet-600 to-purple-600 text-white p-5 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold">Donation Allocations</h2>
                        <p className="text-violet-100 text-sm mt-0.5">{productionTitle}</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-8 h-8 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full flex items-center justify-center transition-colors"
                    >
                        ✕
                    </button>
                </div>

                {/* Summary Bar */}
                <div className="bg-violet-50 border-b border-violet-100 px-5 py-3 flex items-center justify-between">
                    <div className="text-sm text-violet-700">
                        <span className="font-semibold">{allocations.length}</span> allocation{allocations.length !== 1 ? 's' : ''} totalling{' '}
                        <span className="font-semibold">${totalAllocated.toLocaleString()}</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            setAllocateError('');
                            setSelectedDonationId('');
                            setAllocateAmount('');
                            setShowAllocateModal(true);
                        }}
                        className="px-3 py-1.5 bg-violet-600 text-white text-sm rounded-lg hover:bg-violet-700 transition-colors"
                    >
                        + Allocate Donation
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5 space-y-5">

                    {/* Current Allocations */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Current Allocations</h3>
                        {allocations.length === 0 ? (
                            <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                                <div className="text-3xl mb-2">💸</div>
                                <p className="text-sm">No donations allocated to this production yet.</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {allocations.map(alloc => (
                                    <div key={alloc.allocationId} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-gray-900 text-sm truncate">
                                                {alloc.donorName || 'Anonymous'}
                                            </div>
                                            <div className="text-xs text-gray-500 mt-0.5">
                                                {alloc.donationDate ? new Date(alloc.donationDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                                                {alloc.restrictionType && alloc.restrictionType !== 'unrestricted' && (
                                                    <span className="ml-2 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-xs">
                                                        {alloc.restrictionType === 'production-specific' ? 'Designated' : 'Restricted'}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 ml-3">
                                            <span className="font-semibold text-green-700 text-sm">
                                                ${(alloc.amount || 0).toLocaleString()}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => handleRemove(alloc.donationId, alloc.allocationId)}
                                                className="text-xs text-red-500 hover:text-red-700 hover:underline"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Available Donations */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Available Donations</h3>
                        {availableDonations.length === 0 ? (
                            <p className="text-sm text-gray-400 italic">No unallocated donations available.</p>
                        ) : (
                            <div className="space-y-2">
                                {availableDonations.map(donation => {
                                    const available = window.donationsService.getDonationAvailableAmount(donation.id);
                                    const total = donation.amount || 0;
                                    const allocated = total - available;
                                    return (
                                        <div key={donation.id} className="p-3 border border-gray-200 rounded-lg bg-white">
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium text-gray-900 text-sm">
                                                        {donation.donorName || 'Anonymous'}
                                                    </div>
                                                    <div className="text-xs text-gray-500 mt-0.5">
                                                        Total: ${total.toLocaleString()}
                                                        {allocated > 0 && <span className="text-gray-400"> · Allocated: ${allocated.toLocaleString()}</span>}
                                                        {donation.restrictionType === 'production-specific' && (
                                                            <span className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                                                                Designated for this production
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="ml-3 text-right">
                                                    <div className="text-sm font-semibold text-violet-700">${available.toLocaleString()}</div>
                                                    <div className="text-xs text-gray-400">available</div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 p-4 bg-gray-50 flex justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
                    >
                        Close
                    </button>
                </div>
            </div>

            {/* Allocate Donation Modal */}
            {showAllocateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-60 p-4" onClick={() => setShowAllocateModal(false)}>
                    <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Allocate Donation</h3>

                        <div className="space-y-4">
                            <div>
                                <label htmlFor="alloc-donation-select" className="block text-sm font-medium text-gray-700 mb-1">
                                    Select Donation <span className="text-red-500">*</span>
                                </label>
                                <select
                                    id="alloc-donation-select"
                                    value={selectedDonationId}
                                    onChange={e => {
                                        setSelectedDonationId(e.target.value);
                                        setAllocateAmount('');
                                        setAllocateError('');
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-sm"
                                >
                                    <option value="">— Choose a donation —</option>
                                    {availableDonations.map(d => {
                                        const avail = window.donationsService.getDonationAvailableAmount(d.id);
                                        return (
                                            <option key={d.id} value={d.id}>
                                                {d.donorName || 'Anonymous'} — ${avail.toLocaleString()} available
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>

                            {selectedDonationId && (
                                <div className="p-3 bg-violet-50 border border-violet-200 rounded-lg text-sm text-violet-700">
                                    Available balance: <strong>${getAvailableForSelected().toLocaleString()}</strong>
                                </div>
                            )}

                            <div>
                                <label htmlFor="alloc-amount" className="block text-sm font-medium text-gray-700 mb-1">
                                    Amount to Allocate <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                                    <input
                                        id="alloc-amount"
                                        type="number"
                                        min="0.01"
                                        step="0.01"
                                        max={getAvailableForSelected()}
                                        value={allocateAmount}
                                        onChange={e => {
                                            setAllocateAmount(e.target.value);
                                            setAllocateError('');
                                        }}
                                        className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-sm"
                                        placeholder="0.00"
                                    />
                                </div>
                                {selectedDonationId && (
                                    <button
                                        type="button"
                                        onClick={() => setAllocateAmount(String(getAvailableForSelected()))}
                                        className="mt-1 text-xs text-violet-600 hover:underline"
                                    >
                                        Use full available amount
                                    </button>
                                )}
                            </div>

                            {allocateError && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                                    {allocateError}
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                type="button"
                                onClick={() => setShowAllocateModal(false)}
                                className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleAllocate}
                                disabled={isSubmitting}
                                className="flex-1 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors text-sm disabled:opacity-50"
                            >
                                {isSubmitting ? 'Allocating...' : 'Allocate'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

window.DonationAllocationManager = DonationAllocationManager;

console.log('✅ DonationAllocationManager component loaded');
