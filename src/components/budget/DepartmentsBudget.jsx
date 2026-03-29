function DepartmentsBudget({ budget, summary, departments, productionId, canEditBudget = true, onUpdateAllocation, onRefresh, onAutoAllocate }) {
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
    const totalBudget = parseFloat(budget.totalBudget || 0);
    const totalAllocated = summary.totalAllocated || 0;
    const totalPct = totalBudget > 0 ? Math.round((totalAllocated / totalBudget) * 100) : 0;

    return (
        <div className="space-y-6">
            {/* Auto-Allocate */}
            {canEditBudget && (budget.totalBudget || 0) > 0 && onAutoAllocate && (
                <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                    <div>
                        <span className="text-sm font-medium text-green-900">Auto-Allocate</span>
                        <span className="text-xs text-green-700 ml-2">
                            Splits ${(budget.totalBudget || 0).toLocaleString()} evenly across all {departments.length} departments
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={onAutoAllocate}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                        title={`Split $${(budget.totalBudget || 0).toLocaleString()} evenly across all ${departments.length} departments`}
                    >
                        ⚡ Auto-Allocate Evenly
                    </button>
                </div>
            )}
            {/* Department List */}
            <div className="grid grid-cols-2 gap-4">
                {departments.map(dept => {
                    const deptData = budget.departments[dept.id];
                    const deptSummary = summary.departments.find(d => d.name === dept.id);
                    const deptAmount = parseFloat(deptData.allocated || 0);
                    const currentPct = totalBudget > 0 ? Math.round((deptAmount / totalBudget) * 100) : 0;

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

                            {/* Allocation: % slider + dollar input */}
                            <div className="mb-2">
                                <div className="flex items-center justify-between mb-1">
                                    <label className="text-xs text-gray-600">Allocated Budget</label>
                                    <span className="text-xs font-semibold text-gray-500">{currentPct}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    step="1"
                                    value={currentPct}
                                    disabled={!canEditBudget || totalBudget === 0}
                                    onChange={(e) => {
                                        const newPct = parseInt(e.target.value);
                                        const newAmount = parseFloat(((newPct / 100) * totalBudget).toFixed(2));
                                        onUpdateAllocation(dept.id, newAmount);
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    className={`w-full mb-2 accent-green-600 ${!canEditBudget || totalBudget === 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                    title={`${dept.name}: ${currentPct}% of total budget`}
                                />
                                <div className="relative">
                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                                    <input
                                        type="number"
                                        value={deptData.allocated || ''}
                                        onChange={(e) => canEditBudget && onUpdateAllocation(dept.id, e.target.value)}
                                        onClick={(e) => e.stopPropagation()}
                                        readOnly={!canEditBudget}
                                        className={`w-full pl-6 pr-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-green-500 ${!canEditBudget ? 'opacity-60 cursor-not-allowed bg-gray-50' : ''}`}
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

            {/* Total allocated % summary */}
            {totalBudget > 0 && (
                <div className={`text-right text-xs font-medium ${
                    totalPct > 100 ? 'text-red-600' :
                    totalPct === 100 ? 'text-green-600' :
                    'text-gray-500'
                }`}>
                    {totalPct}% allocated
                    {totalPct > 100 ? ' — over budget' :
                     totalPct === 100 ? ' — fully allocated ✓' :
                     ` — ${100 - totalPct}% unallocated`}
                </div>
            )}

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
