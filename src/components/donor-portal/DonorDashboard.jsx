function SendDonationModal({ donor, onClose, onSuccess }) {
    const [amount, setAmount] = React.useState('');
    const [paymentMethod, setPaymentMethod] = React.useState('Credit Card');
    const [notes, setNotes] = React.useState('');
    const [giftPath, setGiftPath] = React.useState('general');
    const [selectedProductionId, setSelectedProductionId] = React.useState('');
    const [selectedCampaignId, setSelectedCampaignId] = React.useState('');
    const [restrictionNote, setRestrictionNote] = React.useState('');

    const campaigns = window.CampaignsService
        ? window.CampaignsService.getActiveCampaigns()
        : (console.warn('CampaignsService unavailable — campaign dropdown disabled'), []);

    const productions = JSON.parse(localStorage.getItem('showsuite_productions') || '[]')
        .filter(p => !p.status || !['cancelled', 'closed', 'archived'].includes(p.status.toLowerCase()));

    const selectPath = (path) => {
        setGiftPath(path);
        setSelectedProductionId('');
        setSelectedCampaignId('');
        setRestrictionNote('');
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!amount || parseFloat(amount) <= 0) {
            if (window.showToast) window.showToast('Please enter a valid donation amount', 'error');
            return;
        }
        if (giftPath === 'production' && !selectedProductionId) {
            if (window.showToast) window.showToast('Please select a production', 'error');
            return;
        }
        if (giftPath === 'restricted' && !restrictionNote.trim()) {
            if (window.showToast) window.showToast('Please describe the purpose of this restricted gift', 'error');
            return;
        }

        const selectedProduction = productions.find(p => p.id === selectedProductionId);
        const selectedCampaign = campaigns.find(c => c.id === selectedCampaignId);

        let pathFields;
        if (giftPath === 'production') {
            pathFields = {
                donationType: 'monetary',
                campaignType: 'production',
                campaignId: selectedCampaignId || selectedProductionId,
                campaignName: selectedCampaign?.name || selectedProduction?.title || null,
                restrictionType: 'production-specific',
                designatedProductionId: selectedProductionId,
                designatedProductionTitle: selectedProduction?.title || null,
                restrictionPurpose: null,
            };
        } else if (giftPath === 'restricted') {
            pathFields = {
                donationType: 'monetary',
                campaignType: null,
                campaignId: selectedCampaignId || null,
                campaignName: selectedCampaign?.name || restrictionNote || null,
                restrictionType: 'restricted',
                designatedProductionId: null,
                designatedProductionTitle: null,
                restrictionPurpose: restrictionNote,
            };
        } else {
            pathFields = {
                donationType: 'monetary',
                campaignType: selectedCampaignId ? 'general' : null,
                campaignId: selectedCampaignId || null,
                campaignName: selectedCampaign?.name || null,
                restrictionType: 'unrestricted',
                designatedProductionId: null,
                designatedProductionTitle: null,
                restrictionPurpose: null,
            };
        }

        const donation = {
            contactId: donor.id,
            amount: parseFloat(amount),
            date: new Date().toISOString().split('T')[0],
            paymentMethod: paymentMethod,
            notes: notes,
            allocations: [],
            ...pathFields,
        };

        console.log('💰 Donation object:', donation);

        try {
            window.donationsService.addDonation(donation);
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

    const pathOptions = [
        { value: 'general',    label: 'General Support',       desc: 'Used where most needed' },
        { value: 'production', label: 'Support a Production',  desc: 'Directed to a specific show' },
        { value: 'restricted', label: 'Restricted Gift',       desc: 'For a specific purpose' },
    ];

    const inputStyle = {
        background: 'var(--color-bg-base)',
        border: '1px solid var(--color-border)',
        color: 'var(--color-text-primary)',
    };

    const labelStyle = { color: 'var(--color-text-secondary)' };
    const hintStyle  = { color: 'var(--color-text-muted)' };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="rounded-lg max-w-md w-full p-6" style={{ background: 'var(--color-bg-elevated)' }} onClick={(e) => e.stopPropagation()}>
                <h3 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>Send a Donation</h3>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Amount */}
                    <div>
                        <label className="block text-sm font-medium mb-1" style={labelStyle}>
                            Donation Amount *
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={hintStyle}>$</span>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full pl-8 pr-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                                style={inputStyle}
                                placeholder="100.00"
                                step="0.01"
                                min="0"
                                required
                            />
                        </div>
                    </div>

                    {/* Payment Method */}
                    <div>
                        <label className="block text-sm font-medium mb-1" style={labelStyle}>
                            Payment Method
                        </label>
                        <select
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                            aria-label="Payment Method"
                            className="w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                            style={inputStyle}
                        >
                            <option>Credit Card</option>
                            <option>Debit Card</option>
                            <option>PayPal</option>
                            <option>Venmo</option>
                            <option>Bank Transfer</option>
                            <option>Check</option>
                        </select>
                    </div>

                    {/* Gift Direction — three-path pill group */}
                    <div>
                        <p className="block text-sm font-medium mb-2" style={labelStyle}>
                            How would you like your gift directed?
                        </p>
                        <div className="flex flex-col gap-2">
                            {pathOptions.map(opt => {
                                const active = giftPath === opt.value;
                                return (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => selectPath(opt.value)}
                                        className="w-full text-left px-4 py-3 rounded-lg transition-colors"
                                        style={{
                                            background: active ? 'rgba(201,161,74,0.12)' : 'var(--color-bg-base)',
                                            border: active ? '1px solid var(--color-accent-gold)' : '1px solid var(--color-border)',
                                            color: 'var(--color-text-primary)',
                                        }}
                                    >
                                        <span className="font-medium text-sm">{opt.label}</span>
                                        <span className="block text-xs mt-0.5" style={hintStyle}>{opt.desc}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Production sub-fields */}
                    {giftPath === 'production' && (
                        <div className="space-y-3 pl-1">
                            <div>
                                <label className="block text-sm font-medium mb-1" style={labelStyle}>
                                    Which Production? <span style={{ color: 'var(--color-error, #ef4444)' }}>*</span>
                                </label>
                                <select
                                    value={selectedProductionId}
                                    onChange={(e) => setSelectedProductionId(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                                    style={inputStyle}
                                >
                                    <option value="">— Select Production —</option>
                                    {productions.map(p => (
                                        <option key={p.id} value={p.id}>{p.title}</option>
                                    ))}
                                </select>
                            </div>
                            {campaigns.length > 0 && (
                                <div>
                                    <label className="block text-sm font-medium mb-1" style={labelStyle}>
                                        Campaign Fund (Optional)
                                    </label>
                                    <select
                                        value={selectedCampaignId}
                                        onChange={(e) => setSelectedCampaignId(e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                                        style={inputStyle}
                                    >
                                        <option value="">— None —</option>
                                        {campaigns.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Restricted sub-fields */}
                    {giftPath === 'restricted' && (
                        <div className="space-y-3 pl-1">
                            <div>
                                <label className="block text-sm font-medium mb-1" style={labelStyle}>
                                    Purpose / Restriction <span style={{ color: 'var(--color-error, #ef4444)' }}>*</span>
                                </label>
                                <input
                                    type="text"
                                    value={restrictionNote}
                                    onChange={(e) => setRestrictionNote(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                                    style={inputStyle}
                                    placeholder="e.g., New Theatre Seating, Scholarship Fund"
                                />
                                <p className="text-xs mt-1" style={{ color: 'var(--color-warning, #f59e0b)' }}>
                                    ⚠️ Restricted donations can only be used for the specified purpose
                                </p>
                            </div>
                            {campaigns.length > 0 && (
                                <div>
                                    <label className="block text-sm font-medium mb-1" style={labelStyle}>
                                        Campaign Fund (Optional)
                                    </label>
                                    <select
                                        value={selectedCampaignId}
                                        onChange={(e) => setSelectedCampaignId(e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                                        style={inputStyle}
                                    >
                                        <option value="">— None —</option>
                                        {campaigns.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                    )}

                    {/* General — optional campaign fund */}
                    {giftPath === 'general' && campaigns.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium mb-1" style={labelStyle}>
                                Campaign Fund (Optional)
                            </label>
                            <select
                                value={selectedCampaignId}
                                onChange={(e) => setSelectedCampaignId(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                                style={inputStyle}
                            >
                                <option value="">— None —</option>
                                {campaigns.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-medium mb-1" style={labelStyle}>
                            Notes (Optional)
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 h-20"
                            style={inputStyle}
                            placeholder="Add a message with your donation..."
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 rounded-lg transition-colors"
                            style={{ background: 'var(--color-bg-base)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 rounded-lg font-semibold transition-colors"
                            style={{ background: 'var(--color-accent-gold)', color: '#1a1209' }}
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
                                        {` • ${donation.campaignName || donation.designatedProductionTitle || '—'}`}
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
