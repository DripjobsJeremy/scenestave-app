function SendDonationModal({ donor, onClose, onSuccess }) {
    const [amount, setAmount] = React.useState('');
    const [paymentMethod, setPaymentMethod] = React.useState('Credit Card');
    const [campaign, setCampaign] = React.useState('');
    const [notes, setNotes] = React.useState('');
    const [restrictionType, setRestrictionType] = React.useState('unrestricted');
    const [restrictionPurpose, setRestrictionPurpose] = React.useState('');
    const [designatedProductionId, setDesignatedProductionId] = React.useState('');

    const campaigns = JSON.parse(localStorage.getItem('tld_campaign_categories_v1') || '[]');

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!amount || parseFloat(amount) <= 0) {
            if (window.showToast) window.showToast('Please enter a valid donation amount', 'error');
            return;
        }

        // Validate restriction fields
        if (restrictionType === 'production-specific' && !designatedProductionId) {
            if (window.showToast) window.showToast('Please select a production for this donation', 'error');
            return;
        }

        if (restrictionType === 'restricted' && !restrictionPurpose.trim()) {
            if (window.showToast) window.showToast('Please specify the purpose for this restricted donation', 'error');
            return;
        }

        const donation = {
            contactId: donor.id,
            amount: parseFloat(amount),
            date: new Date().toISOString().split('T')[0],
            paymentMethod: paymentMethod,
            campaignId: campaign || null,
            campaignName: campaigns.find(c => c.id === campaign)?.name || null,
            notes: notes,
            restrictionType: restrictionType,
            restrictionPurpose: restrictionType === 'restricted' ? restrictionPurpose : null,
            designatedProductionId: restrictionType === 'production-specific' ? designatedProductionId : null,
            allocations: []
        };

        console.log('💰 Donation object:', donation);

        try {
            console.log('💾 Creating donation:', donation);
            window.donationsService.addDonation(donation);
            console.log('✅ Donation created');

            if (window.showToast) {
                window.showToast(`✅ Thank you for your $${parseFloat(amount).toLocaleString()} donation!`, 'success');
            }

            onSuccess();
        } catch (error) {
            console.error('❌ Error creating donation:', error);
            if (window.showToast) {
                window.showToast('❌ Error processing donation', 'error');
            }
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-lg max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Send a Donation</h3>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Donation Amount *
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                placeholder="100.00"
                                step="0.01"
                                min="0"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Payment Method
                        </label>
                        <select
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                            aria-label="Payment Method"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        >
                            <option>Credit Card</option>
                            <option>Debit Card</option>
                            <option>PayPal</option>
                            <option>Venmo</option>
                            <option>Bank Transfer</option>
                            <option>Check</option>
                        </select>
                    </div>

                    {campaigns.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Campaign (Optional)
                            </label>
                            <select
                                value={campaign}
                                onChange={(e) => setCampaign(e.target.value)}
                                aria-label="Campaign"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                            >
                                <option value="">General Fund</option>
                                {campaigns.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Notes (Optional)
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 h-20"
                            placeholder="Add a message with your donation..."
                        />
                    </div>

                    {/* Donation Type */}
                    <div>
                        <label htmlFor="donor-restriction-type" className="block text-sm font-medium text-gray-700 mb-1">
                            Donation Type
                        </label>
                        <select
                            id="donor-restriction-type"
                            value={restrictionType}
                            onChange={(e) => {
                                setRestrictionType(e.target.value);
                                if (e.target.value !== 'restricted') setRestrictionPurpose('');
                                if (e.target.value !== 'production-specific') setDesignatedProductionId('');
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        >
                            <option value="unrestricted">General Support — Can be used for any purpose</option>
                            <option value="production-specific">Support a Specific Production</option>
                            <option value="restricted">Restricted — Specific purpose only</option>
                        </select>
                    </div>

                    {/* Production Selection */}
                    {restrictionType === 'production-specific' && (
                        <div>
                            <label htmlFor="donor-designated-production" className="block text-sm font-medium text-gray-700 mb-1">
                                Which Production? <span className="text-red-500">*</span>
                            </label>
                            <select
                                id="donor-designated-production"
                                value={designatedProductionId}
                                onChange={(e) => setDesignatedProductionId(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                            >
                                <option value="">— Select Production —</option>
                                {(() => {
                                    const prods = JSON.parse(localStorage.getItem('showsuite_productions') || '[]');
                                    return prods
                                        .filter(p => {
                                            if (!p.calendar) return true;
                                            return p.calendar.some(e =>
                                                (e.type === 'show' || e.type === 'performance') &&
                                                new Date(e.start || e.date) >= new Date()
                                            );
                                        })
                                        .map(prod => (
                                            <option key={prod.id} value={prod.id}>{prod.title}</option>
                                        ));
                                })()}
                            </select>
                            <p className="text-xs text-gray-500 mt-1">
                                Your donation will support this specific production
                            </p>
                        </div>
                    )}

                    {/* Restriction Purpose */}
                    {restrictionType === 'restricted' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                What should this donation fund? <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={restrictionPurpose}
                                onChange={(e) => setRestrictionPurpose(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                placeholder="e.g., New Theatre Seating, Scholarship Fund"
                            />
                            <p className="text-xs text-orange-600 mt-1">
                                ⚠️ Restricted donations can only be used for the specified purpose
                            </p>
                        </div>
                    )}

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold"
                        >
                            Donate ${amount ? parseFloat(amount).toLocaleString() : '0'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function DonorDashboard({ donor, stats, donations, events, onNavigate }) {
    const [showSendDonation, setShowSendDonation] = React.useState(false);
    console.log('🎯 DonorDashboard state:', { showSendDonation });

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-lg shadow-lg p-6 text-white">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium opacity-90">Lifetime Giving</h3>
                        <span className="text-3xl">💎</span>
                    </div>
                    <div className="text-3xl font-bold mb-1">
                        ${stats.totalAmount.toLocaleString()}
                    </div>
                    <p className="text-sm opacity-75">{stats.totalDonations} donations</p>
                </div>

                <div className="bg-gradient-to-br from-green-500 to-green-700 rounded-lg shadow-lg p-6 text-white">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium opacity-90">This Year</h3>
                        <span className="text-3xl">📅</span>
                    </div>
                    <div className="text-3xl font-bold mb-1">
                        ${stats.yearAmount.toLocaleString()}
                    </div>
                    <p className="text-sm opacity-75">{stats.yearDonations} donations</p>
                </div>

                <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg shadow-lg p-6 text-white">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium opacity-90">Upcoming Shows</h3>
                        <span className="text-3xl">🎭</span>
                    </div>
                    <div className="text-3xl font-bold mb-1">{events.length}</div>
                    <p className="text-sm opacity-75">events to attend</p>
                </div>

                <div className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-lg shadow-lg p-6 text-white">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium opacity-90">Donor Status</h3>
                        <span className="text-3xl">⭐</span>
                    </div>
                    <div className="text-2xl font-bold mb-1">
                        {stats.isTopDonor ? `Top #${stats.rank}` : 'Supporter'}
                    </div>
                    <p className="text-sm opacity-75">
                        {stats.isTopDonor ? 'Elite supporter' : 'Valued donor'}
                    </p>
                </div>
            </div>

            {/* Recent Donations */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">Recent Donations</h2>
                    <button
                        type="button"
                        onClick={() => onNavigate('donations')}
                        className="text-purple-600 hover:text-purple-700 text-sm font-medium"
                    >
                        View All →
                    </button>
                </div>

                {donations.length > 0 ? (
                    <div className="space-y-3">
                        {donations.slice(0, 5).map(donation => (
                            <div key={donation.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div>
                                    <div className="font-medium text-gray-900">
                                        ${parseFloat(donation.amount).toLocaleString()}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        {new Date(donation.date).toLocaleDateString()}
                                        {donation.campaignName && ` • ${donation.campaignName}`}
                                    </div>
                                </div>
                                <span className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full">
                                    Thank you!
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 text-gray-400">
                        <div className="text-4xl mb-2">💰</div>
                        <p>No donations yet</p>
                    </div>
                )}
            </div>

            {/* Upcoming Events */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">Upcoming Shows</h2>
                    <button
                        type="button"
                        onClick={() => onNavigate('events')}
                        className="text-purple-600 hover:text-purple-700 text-sm font-medium"
                    >
                        View All →
                    </button>
                </div>

                {events.length > 0 ? (
                    <div className="space-y-3">
                        {events.slice(0, 3).map((event, idx) => (
                            <div key={idx} className="flex items-start gap-4 p-3 bg-gray-50 rounded-lg">
                                <div className="text-center min-w-[60px]">
                                    <div className="text-2xl font-bold text-purple-600">
                                        {new Date(event.start || event.date).getDate()}
                                    </div>
                                    <div className="text-xs text-gray-600 uppercase">
                                        {new Date(event.start || event.date).toLocaleDateString('en-US', { month: 'short' })}
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <div className="font-semibold text-gray-900">{event.productionTitle}</div>
                                    <div className="text-sm text-gray-600">{event.title}</div>
                                    <div className="text-sm text-gray-500 mt-1">
                                        {event.location || 'Main Stage'}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 text-gray-400">
                        <div className="text-4xl mb-2">🎭</div>
                        <p>No upcoming shows</p>
                    </div>
                )}
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <button
                        type="button"
                        onClick={() => onNavigate('profile')}
                        className="flex flex-col items-center gap-2 p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors border border-purple-200"
                    >
                        <span className="text-3xl">👤</span>
                        <span className="text-sm font-medium text-purple-900">Edit Profile</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            console.log('💰 Opening Send Donation modal');
                            setShowSendDonation(true);
                        }}
                        className="flex flex-col items-center gap-2 p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors border border-green-200"
                    >
                        <span className="text-3xl">💰</span>
                        <span className="text-sm font-medium text-green-900">Send Donation</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => onNavigate('documents')}
                        className="flex flex-col items-center gap-2 p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200"
                    >
                        <span className="text-3xl">📄</span>
                        <span className="text-sm font-medium text-blue-900">Tax Receipts</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => onNavigate('events')}
                        className="flex flex-col items-center gap-2 p-4 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-200"
                    >
                        <span className="text-3xl">🎫</span>
                        <span className="text-sm font-medium text-indigo-900">View Events</span>
                    </button>
                </div>
            </div>

            {/* Send Donation Modal */}
            {showSendDonation && (
                <>
                    {console.log('🎨 Rendering SendDonationModal')}
                    <SendDonationModal
                        donor={donor}
                        onClose={() => {
                            console.log('🚪 Closing SendDonationModal');
                            setShowSendDonation(false);
                        }}
                        onSuccess={() => {
                            console.log('✅ Donation successful, reloading');
                            setShowSendDonation(false);
                            window.location.reload();
                        }}
                    />
                </>
            )}
        </div>
    );
}

window.DonorDashboard = DonorDashboard;
window.SendDonationModal = SendDonationModal;

console.log('✅ DonorDashboard component loaded');
console.log('✅ SendDonationModal component loaded');
