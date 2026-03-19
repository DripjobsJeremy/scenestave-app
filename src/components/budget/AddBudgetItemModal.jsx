function AddBudgetItemModal({ department, onAdd, onClose }) {
    const [formData, setFormData] = React.useState({
        description: '',
        estimatedCost: '',
        actualCost: '',
        vendor: '',
        status: 'planned',
        notes: ''
    });

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!formData.description.trim()) {
            alert('Description is required');
            return;
        }

        onAdd(formData);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-lg max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Add Budget Item</h3>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="budget-item-description" className="block text-sm font-medium text-gray-700 mb-1">
                            Description *
                        </label>
                        <input
                            id="budget-item-description"
                            type="text"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                            placeholder="e.g., LED Par Lights (x10)"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="budget-item-estimated" className="block text-sm font-medium text-gray-700 mb-1">
                                Estimated Cost
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                <input
                                    id="budget-item-estimated"
                                    type="number"
                                    value={formData.estimatedCost}
                                    onChange={(e) => setFormData({ ...formData, estimatedCost: e.target.value })}
                                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                    placeholder="0.00"
                                    step="0.01"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="budget-item-actual" className="block text-sm font-medium text-gray-700 mb-1">
                                Actual Cost
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                <input
                                    id="budget-item-actual"
                                    type="number"
                                    value={formData.actualCost}
                                    onChange={(e) => setFormData({ ...formData, actualCost: e.target.value })}
                                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                    placeholder="0.00"
                                    step="0.01"
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="budget-item-vendor" className="block text-sm font-medium text-gray-700 mb-1">
                            Vendor
                        </label>
                        <input
                            id="budget-item-vendor"
                            type="text"
                            value={formData.vendor}
                            onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                            placeholder="e.g., Stage Lighting Co."
                        />
                    </div>

                    <div>
                        <label htmlFor="budget-item-status" className="block text-sm font-medium text-gray-700 mb-1">
                            Status
                        </label>
                        <select
                            id="budget-item-status"
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                        >
                            <option value="planned">Planned</option>
                            <option value="ordered">Ordered</option>
                            <option value="received">Received</option>
                            <option value="paid">Paid</option>
                        </select>
                    </div>

                    <div>
                        <label htmlFor="budget-item-notes" className="block text-sm font-medium text-gray-700 mb-1">
                            Notes
                        </label>
                        <textarea
                            id="budget-item-notes"
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 h-20"
                            placeholder="Additional notes..."
                        />
                    </div>

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
                            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                            Add Item
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

window.AddBudgetItemModal = AddBudgetItemModal;

console.log('✅ AddBudgetItemModal component loaded');
