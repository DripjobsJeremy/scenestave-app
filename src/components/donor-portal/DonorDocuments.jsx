function DonorDocuments({ documents }) {
    const handleDownload = (doc) => {
        if (window.showToast) {
            window.showToast(`📄 Downloading ${doc.name}...`, 'info');
        }
        // In production, trigger actual download
        console.log('Download document:', doc);
    };

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">My Documents</h2>

                {documents.length > 0 ? (
                    <div className="space-y-3">
                        {documents.map(doc => (
                            <div key={doc.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-2xl">
                                        📄
                                    </div>
                                    <div>
                                        <div className="font-semibold text-gray-900">{doc.name}</div>
                                        <div className="text-sm text-gray-600">
                                            {new Date(doc.date).toLocaleDateString()}
                                            {doc.type === 'tax-receipt' && ' • Tax Receipt'}
                                            {doc.type === 'annual-report' && ' • Annual Report'}
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleDownload(doc)}
                                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                                >
                                    Download
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 text-gray-400">
                        <div className="text-6xl mb-4">📄</div>
                        <p className="text-lg">No documents available</p>
                        <p className="text-sm mt-2">Your tax receipts and reports will appear here</p>
                    </div>
                )}
            </div>
        </div>
    );
}

window.DonorDocuments = DonorDocuments;

console.log('✅ DonorDocuments component loaded');
