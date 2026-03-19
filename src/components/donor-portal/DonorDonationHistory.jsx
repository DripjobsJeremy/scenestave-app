function DonorDonationHistory({ donations, stats }) {
    const [filter, setFilter] = React.useState('all');
    const [sortBy, setSortBy] = React.useState('date-desc');

    const filterDonations = () => {
        let filtered = [...donations];

        if (filter !== 'all') {
            const year = parseInt(filter);
            filtered = filtered.filter(d => new Date(d.date).getFullYear() === year);
        }

        if (sortBy === 'date-desc') {
            filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
        } else if (sortBy === 'date-asc') {
            filtered.sort((a, b) => new Date(a.date) - new Date(b.date));
        } else if (sortBy === 'amount-desc') {
            filtered.sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount));
        } else if (sortBy === 'amount-asc') {
            filtered.sort((a, b) => parseFloat(a.amount) - parseFloat(b.amount));
        }

        return filtered;
    };

    const getYears = () => {
        const years = new Set(donations.map(d => new Date(d.date).getFullYear()));
        return Array.from(years).sort((a, b) => b - a);
    };

    const filteredDonations = filterDonations();

    return (
        <div className="space-y-6">
            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="text-sm text-gray-600 mb-1">Lifetime Total</div>
                    <div className="text-3xl font-bold text-gray-900">
                        ${stats.totalAmount.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                        {stats.totalDonations} donations
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="text-sm text-gray-600 mb-1">This Year</div>
                    <div className="text-3xl font-bold text-gray-900">
                        ${stats.yearAmount.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                        {stats.yearDonations} donations
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="text-sm text-gray-600 mb-1">Average Donation</div>
                    <div className="text-3xl font-bold text-gray-900">
                        ${stats.totalDonations > 0
                            ? Math.round(stats.totalAmount / stats.totalDonations).toLocaleString()
                            : '0'}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">per donation</div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex flex-wrap gap-4 items-center justify-between">
                    <div className="flex gap-4 items-center">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Year
                            </label>
                            <select
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                            >
                                <option value="all">All Years</option>
                                {getYears().map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Sort By
                            </label>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                            >
                                <option value="date-desc">Newest First</option>
                                <option value="date-asc">Oldest First</option>
                                <option value="amount-desc">Highest Amount</option>
                                <option value="amount-asc">Lowest Amount</option>
                            </select>
                        </div>
                    </div>

                    <div className="text-sm text-gray-600">
                        Showing {filteredDonations.length} donation{filteredDonations.length !== 1 ? 's' : ''}
                    </div>
                </div>
            </div>

            {/* Donations Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                {filteredDonations.length > 0 ? (
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Campaign</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredDonations.map(donation => (
                                <tr key={donation.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 text-sm text-gray-900">
                                        {new Date(donation.date).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-sm font-semibold text-green-600">
                                        ${parseFloat(donation.amount).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        {donation.campaignName || '—'}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        {donation.paymentMethod || '—'}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        {donation.notes || '—'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="text-center py-12 text-gray-400">
                        <div className="text-4xl mb-2">💰</div>
                        <p>No donations found</p>
                    </div>
                )}
            </div>
        </div>
    );
}

window.DonorDonationHistory = DonorDonationHistory;

console.log('✅ DonorDonationHistory component loaded');
