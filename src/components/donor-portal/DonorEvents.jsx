function DonorEvents({ events }) {
    return (
        <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Upcoming Shows & Events</h2>

                {events.length > 0 ? (
                    <div className="space-y-4">
                        {events.map((event, idx) => (
                            <div key={idx} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                                <div className="flex items-start gap-6">
                                    {/* Date */}
                                    <div className="text-center min-w-[80px] bg-purple-50 rounded-lg p-4">
                                        <div className="text-3xl font-bold text-purple-600">
                                            {new Date(event.start || event.date).getDate()}
                                        </div>
                                        <div className="text-sm text-gray-600 uppercase">
                                            {new Date(event.start || event.date).toLocaleDateString('en-US', { month: 'short' })}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {new Date(event.start || event.date).getFullYear()}
                                        </div>
                                    </div>

                                    {/* Details */}
                                    <div className="flex-1">
                                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                            {event.productionTitle}
                                        </h3>
                                        <p className="text-gray-600 mb-3">{event.title}</p>

                                        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                                            <div className="flex items-center gap-1">
                                                <span>🕐</span>
                                                <span>{event.time || 'TBA'}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <span>📍</span>
                                                <span>{event.location || 'Main Stage'}</span>
                                            </div>
                                        </div>

                                        {event.description && (
                                            <p className="mt-3 text-sm text-gray-600">{event.description}</p>
                                        )}
                                    </div>

                                    {/* Status */}
                                    <div>
                                        <span className="px-4 py-2 bg-purple-100 text-purple-700 text-sm rounded-full font-medium">
                                            Invited
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 text-gray-400">
                        <div className="text-6xl mb-4">🎭</div>
                        <p className="text-lg">No upcoming events</p>
                        <p className="text-sm mt-2">Check back soon for new show announcements!</p>
                    </div>
                )}
            </div>
        </div>
    );
}

window.DonorEvents = DonorEvents;

console.log('✅ DonorEvents component loaded');
