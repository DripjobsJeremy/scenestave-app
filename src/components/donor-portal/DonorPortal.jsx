function DonorPortal() {
    const [donor, setDonor] = React.useState(null);
    const [activeView, setActiveView] = React.useState('dashboard');
    const [donations, setDonations] = React.useState([]);
    const [events, setEvents] = React.useState([]);
    const [documents, setDocuments] = React.useState([]);

    React.useEffect(() => {
        loadDonorData();
    }, []);

    const loadDonorData = () => {
        const currentDonor = window.donorAuthService.getCurrentDonor();
        if (!currentDonor) {
            window.location.hash = '/donor-login';
            return;
        }

        setDonor(currentDonor);

        // Load donations
        const allDonations = window.donationsService?.loadDonations() || [];
        const donorDonations = allDonations.filter(d => d.contactId === currentDonor.id || d.donorId === currentDonor.id);
        setDonations(donorDonations);

        // Load events (productions with calendar items)
        const productions = JSON.parse(localStorage.getItem('showsuite_productions') || '[]');
        const upcomingEvents = [];
        productions.forEach(prod => {
            if (prod.calendar) {
                prod.calendar.forEach(event => {
                    if (event.type === 'show' && new Date(event.start || event.date) >= new Date()) {
                        upcomingEvents.push({
                            ...event,
                            productionTitle: prod.title
                        });
                    }
                });
            }
        });
        setEvents(upcomingEvents.slice(0, 5));

        // Load documents (placeholder for now)
        setDocuments([
            { id: '1', name: 'Tax Receipt 2025.pdf', date: '2025-01-15', type: 'tax-receipt' },
            { id: '2', name: 'Annual Report 2024.pdf', date: '2024-12-31', type: 'annual-report' }
        ]);
    };

    const handleLogout = () => {
        window.donorAuthService.clearSession();
        window.location.hash = '/donor-login';
    };

    const calculateDonorStats = () => {
        const totalAmount = donations.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
        const thisYear = new Date().getFullYear();
        const yearDonations = donations.filter(d => new Date(d.date).getFullYear() === thisYear);
        const yearAmount = yearDonations.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);

        // Calculate top donor status
        const allDonations = window.donationsService?.loadDonations() || [];
        const donorTotals = {};
        allDonations.forEach(d => {
            const key = d.contactId || d.donorId;
            if (!key) return;
            if (!donorTotals[key]) donorTotals[key] = 0;
            donorTotals[key] += parseFloat(d.amount) || 0;
        });
        const sortedDonors = Object.entries(donorTotals).sort((a, b) => b[1] - a[1]);
        const donorRank = sortedDonors.findIndex(([id]) => id === donor?.id) + 1;
        const isTopDonor = donorRank > 0 && donorRank <= 10;

        return {
            totalAmount,
            totalDonations: donations.length,
            yearAmount,
            yearDonations: yearDonations.length,
            isTopDonor,
            rank: donorRank
        };
    };

    if (!donor) {
        return <div className="p-6">Loading...</div>;
    }

    const stats = calculateDonorStats();
    const DonorDashboardComponent = window.DonorDashboard;
    const DonorProfileEditorComponent = window.DonorProfileEditor;
    const DonorDonationHistoryComponent = window.DonorDonationHistory;
    const DonorEventsComponent = window.DonorEvents;
    const DonorDocumentsComponent = window.DonorDocuments;

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
                <div className="max-w-7xl mx-auto px-6 py-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            {donor.donorProfile?.photoUrl ? (
                                <img
                                    src={donor.donorProfile.photoUrl}
                                    alt={donor.name}
                                    className="w-20 h-20 rounded-full border-4 border-white object-cover"
                                />
                            ) : (
                                <div className="w-20 h-20 rounded-full bg-white bg-opacity-20 flex items-center justify-center text-4xl">
                                    💎
                                </div>
                            )}
                            <div>
                                <h1 className="text-3xl font-bold flex items-center gap-3">
                                    Welcome back, {donor.name?.split(' ')[0] || 'Donor'}!
                                    {stats.isTopDonor && (
                                        <span className="px-3 py-1 bg-yellow-400 text-yellow-900 text-sm rounded-full font-semibold flex items-center gap-1">
                                            ⭐ Top Donor #{stats.rank}
                                        </span>
                                    )}
                                </h1>
                                <p className="text-purple-100 mt-1">{donor.email}</p>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition-colors"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex gap-6">
                        {[
                            { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
                            { id: 'profile', label: 'My Profile', icon: '👤' },
                            { id: 'donations', label: 'Donation History', icon: '💰' },
                            { id: 'events', label: 'Events & Shows', icon: '🎭' },
                            { id: 'documents', label: 'Documents', icon: '📄' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveView(tab.id)}
                                className={`py-4 px-2 border-b-2 transition-colors ${
                                    activeView === tab.id
                                        ? 'border-purple-600 text-purple-600 font-semibold'
                                        : 'border-transparent text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                <span className="mr-2">{tab.icon}</span>
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-6 py-8">
                {activeView === 'dashboard' && DonorDashboardComponent && (
                    <DonorDashboardComponent
                        donor={donor}
                        stats={stats}
                        donations={donations}
                        events={events}
                        onNavigate={setActiveView}
                    />
                )}

                {activeView === 'profile' && DonorProfileEditorComponent && (
                    <DonorProfileEditorComponent
                        donor={donor}
                        onUpdate={loadDonorData}
                    />
                )}

                {activeView === 'donations' && DonorDonationHistoryComponent && (
                    <DonorDonationHistoryComponent
                        donations={donations}
                        stats={stats}
                    />
                )}

                {activeView === 'events' && DonorEventsComponent && (
                    <DonorEventsComponent events={events} />
                )}

                {activeView === 'documents' && DonorDocumentsComponent && (
                    <DonorDocumentsComponent documents={documents} />
                )}
            </div>
        </div>
    );
}

window.DonorPortal = DonorPortal;

console.log('✅ DonorPortal component loaded');
