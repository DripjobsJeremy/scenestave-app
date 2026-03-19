function DepartmentsBudget({ budget, summary, departments, productionId, onUpdateAllocation, onRefresh }) {
    const [selectedDept, setSelectedDept] = React.useState(null);
    const [showAddItem, setShowAddItem] = React.useState(false);

    const handleAddItem = (department, itemData) => {
        window.budgetService.addBudgetItem(productionId, department, itemData);
        onRefresh();
        setShowAddItem(false);
        if (window.showToast) {
            window.showToast('✅ Budget item added', 'success');
        }
    };

    const handleDeleteItem = (department, itemId) => {
        if (confirm('Delete this budget item?')) {
            window.budgetService.deleteBudgetItem(productionId, department, itemId);
            onRefresh();
            if (window.showToast) {
                window.showToast('✅ Budget item deleted', 'success');
            }
        }
    };

    const AddBudgetItemModalComponent = window.AddBudgetItemModal;

    return (
        <div className="space-y-6">
            {/* Department List */}
            <div className="grid grid-cols-2 gap-4">
                {departments.map(dept => {
                    const deptData = budget.departments[dept.id];
                    const deptSummary = summary.departments.find(d => d.name === dept.id);

                    return (
                        <div
                            key={dept.id}
                            className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                                selectedDept === dept.id
                                    ? 'border-green-600 bg-green-50'
                                    : 'border-gray-200 hover:border-gray-300'
                            }`}
                            onClick={() => setSelectedDept(dept.id)}
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-2xl">{dept.icon}</span>
                                    <div>
                                        <div className="font-semibold text-gray-900">{dept.name}</div>
                                        <div className="text-xs text-gray-500">{deptSummary?.itemCount || 0} items</div>
                                    </div>
                                </div>
                                {deptSummary?.isOverBudget && (
                                    <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded">
                                        Over Budget
                                    </span>
                                )}
                            </div>

                            {/* Allocation Input */}
                            <div className="mb-2">
                                <label className="block text-xs text-gray-600 mb-1">Allocated Budget</label>
                                <div className="relative">
                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                                    <input
                                        type="number"
                                        value={deptData.allocated || ''}
                                        onChange={(e) => onUpdateAllocation(dept.id, e.target.value)}
                                        onClick={(e) => e.stopPropagation()}
                                        className="w-full pl-6 pr-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-green-500"
                                        placeholder="0.00"
                                        step="0.01"
                                    />
                                </div>
                            </div>

                            {/* Spent vs Allocated */}
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-gray-600">Spent:</span>
                                <span className={`font-semibold ${deptSummary?.isOverBudget ? 'text-red-600' : 'text-gray-900'}`}>
                                    ${(deptData.spent || 0).toLocaleString()}
                                </span>
                            </div>

                            {/* Progress Bar */}
                            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                <div
                                    className={`h-full transition-all ${
                                        deptSummary?.percentUsed > 100 ? 'bg-red-500' :
                                        deptSummary?.percentUsed > 90 ? 'bg-yellow-500' :
                                        'bg-green-500'
                                    }`}
                                    style={{ width: `${Math.min(deptSummary?.percentUsed || 0, 100)}%` }}
                                />
                            </div>
                            <div className="text-xs text-gray-500 mt-1 text-right">
                                {deptSummary?.percentUsed.toFixed(0)}% used
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Department Detail View */}
            {selectedDept && (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">
                            {departments.find(d => d.id === selectedDept)?.icon}{' '}
                            {departments.find(d => d.id === selectedDept)?.name} Budget Items
                        </h3>
                        <button
                            type="button"
                            onClick={() => setShowAddItem(true)}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm"
                        >
                            + Add Item
                        </button>
                    </div>

                    {/* Items Table */}
                    <div className="overflow-x-auto">
                        {budget.departments[selectedDept].items?.length > 0 ? (
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Estimated</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actual</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {budget.departments[selectedDept].items.map(item => (
                                        <tr key={item.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 text-sm text-gray-900">{item.description}</td>
                                            <td className="px-4 py-3 text-sm text-gray-600">${item.estimatedCost.toLocaleString()}</td>
                                            <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                                                ${item.actualCost.toLocaleString()}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600">{item.vendor || '—'}</td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 text-xs rounded ${
                                                    item.status === 'paid' ? 'bg-green-100 text-green-700' :
                                                    item.status === 'ordered' ? 'bg-blue-100 text-blue-700' :
                                                    item.status === 'received' ? 'bg-purple-100 text-purple-700' :
                                                    'bg-gray-100 text-gray-700'
                                                }`}>
                                                    {item.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteItem(selectedDept, item.id)}
                                                    className="text-red-600 hover:text-red-700 text-sm"
                                                >
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="text-center py-12 text-gray-400">
                                <div className="text-4xl mb-2">📦</div>
                                <p>No budget items yet</p>
                                <p className="text-sm mt-1">Click "Add Item" to start tracking expenses</p>
                            </div>
                        )}
                    </div>

                    {/* Add Item Modal */}
                    {showAddItem && AddBudgetItemModalComponent && (
                        <AddBudgetItemModalComponent
                            department={selectedDept}
                            onAdd={(itemData) => handleAddItem(selectedDept, itemData)}
                            onClose={() => setShowAddItem(false)}
                        />
                    )}
                </div>
            )}
        </div>
    );
}

window.DepartmentsBudget = DepartmentsBudget;

console.log('✅ DepartmentsBudget component loaded');
