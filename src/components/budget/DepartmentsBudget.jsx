function DepartmentsBudget({ budget, summary, departments, productionId, canEditBudget = true, onUpdateAllocation, onRefresh, onAutoAllocate }) {
    const [selectedDept, setSelectedDept] = React.useState(null);
    const [showAddItem, setShowAddItem] = React.useState(false);
    const [allocMode, setAllocMode] = React.useState(() =>
        localStorage.getItem('scenestave_alloc_mode') || 'percentage'
    );
    const [lockedDepts, setLockedDepts] = React.useState(() => {
        try { return JSON.parse(localStorage.getItem('scenestave_locked_depts') || '{}'); }
        catch { return {}; }
    });

    React.useEffect(() => {
        localStorage.setItem('scenestave_alloc_mode', allocMode);
    }, [allocMode]);

    React.useEffect(() => {
        localStorage.setItem('scenestave_locked_depts', JSON.stringify(lockedDepts));
    }, [lockedDepts]);

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

    const deptAmounts = React.useMemo(() => {
        const obj = {};
        departments.forEach(d => {
            obj[d.id] = parseFloat(budget.departments[d.id]?.allocated || 0);
        });
        return obj;
    }, [budget, departments]);

    const totalAllocated = departments.reduce((sum, d) => sum + (deptAmounts[d.id] || 0), 0);
    const totalPct = totalBudget > 0 ? (totalAllocated / totalBudget) * 100 : 0;
    const remaining = totalBudget - totalAllocated;
    const isOver = totalAllocated > totalBudget && totalBudget > 0;

    const toggleLock = (deptId) => {
        setLockedDepts(prev => ({ ...prev, [deptId]: !prev[deptId] }));
    };

    const updateDeptAmount = (deptId, newAmt) => {
        onUpdateAllocation(deptId, parseFloat(newAmt) || 0);
    };

    const handlePctChange = (deptId, newPct) => {
        const newAmt = (newPct / 100) * totalBudget;
        const lockedAllocated = departments
            .filter(d => d.id !== deptId && lockedDepts[d.id])
            .reduce((sum, d) => sum + (deptAmounts[d.id] || 0), 0);
        const maxAllowed = totalBudget - lockedAllocated;
        if (newAmt > maxAllowed) {
            const otherFreeAllocated = departments
                .filter(d => d.id !== deptId && !lockedDepts[d.id])
                .reduce((sum, d) => sum + (deptAmounts[d.id] || 0), 0);
            const capped = Math.max(0, maxAllowed - otherFreeAllocated);
            updateDeptAmount(deptId, parseFloat(capped.toFixed(2)));
            if (window.showToast) window.showToast('Cannot exceed total budget — unlock or adjust locked departments', 'warning');
            return;
        }
        updateDeptAmount(deptId, parseFloat(newAmt.toFixed(2)));
    };

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

            {/* Allocation Mode Toggle */}
            <div className="alloc-mode-wrap">
                <span className="alloc-mode-label">Allocation mode</span>
                <div className="alloc-mode-btns">
                    {[
                        { id: 'percentage', label: '% Based', hint: 'Sliders control %' },
                        { id: 'dollar',     label: '$ Based', hint: 'Inputs control $' },
                        { id: 'hybrid',     label: 'Hybrid',  hint: 'Edit either freely' },
                    ].map(mode => (
                        <button
                            key={mode.id}
                            type="button"
                            title={mode.hint}
                            onClick={() => setAllocMode(mode.id)}
                            className={`alloc-mode-btn ${allocMode === mode.id ? 'alloc-mode-btn--active' : ''}`}
                        >
                            {mode.label}
                        </button>
                    ))}
                </div>
                <span className="alloc-mode-hint">
                    {allocMode === 'percentage' ? 'Drag sliders to set % — $ auto-calculates'
                        : allocMode === 'dollar' ? 'Type $ amounts — % auto-calculates'
                        : 'Edit % or $ freely — no constraints applied'}
                </span>
            </div>

            {/* Global Progress Bar */}
            {totalBudget > 0 && (
                <div className={`alloc-progress-wrap ${isOver ? 'alloc-progress-wrap--over' : ''}`}>
                    <div className="alloc-progress-header">
                        <span className="alloc-progress-label">
                            Total allocated: {totalPct.toFixed(1)}% (${totalAllocated.toLocaleString('en-US', { minimumFractionDigits: 2 })})
                        </span>
                        <span className={`alloc-progress-status ${isOver ? 'alloc-progress-status--over' : remaining === 0 ? 'alloc-progress-status--full' : ''}`}>
                            {isOver
                                ? `⚠ Over by $${Math.abs(remaining).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                                : remaining === 0
                                ? '✓ Fully allocated'
                                : `Remaining: $${remaining.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
                        </span>
                    </div>
                    <div className="alloc-progress-track">
                        <div
                            className={`alloc-progress-bar ${isOver ? 'alloc-progress-bar--over' : totalPct >= 100 ? 'alloc-progress-bar--full' : ''}`}
                            style={{ width: `${Math.min(100, totalPct)}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Department List */}
            <div className="grid grid-cols-2 gap-4">
                {departments.map(dept => {
                    const deptData = budget.departments[dept.id];
                    const deptSummary = summary.departments.find(d => d.name === dept.id);
                    const deptAmount = deptAmounts[dept.id] || 0;
                    const currentPct = totalBudget > 0 ? (deptAmount / totalBudget) * 100 : 0;
                    const isLocked = lockedDepts[dept.id] || false;
                    const sliderDisabled = !canEditBudget || totalBudget === 0 || isLocked || allocMode === 'dollar';
                    const inputDisabled = !canEditBudget || isLocked || allocMode === 'percentage';

                    return (
                        <div
                            key={dept.id}
                            className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                                selectedDept === dept.id
                                    ? 'border-green-600 bg-green-50'
                                    : isLocked
                                    ? 'border-yellow-300 bg-yellow-50'
                                    : 'border-gray-200 hover:border-gray-300'
                            }`}
                            onClick={() => setSelectedDept(dept.id)}
                        >
                            {/* Card Header */}
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-2xl">{dept.icon}</span>
                                    <div>
                                        <div className="font-semibold text-gray-900">{dept.name}</div>
                                        <div className="text-xs text-gray-500">{deptSummary?.itemCount || 0} items</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    {deptSummary?.isOverBudget && (
                                        <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded">
                                            Over Budget
                                        </span>
                                    )}
                                    <button
                                        type="button"
                                        title={isLocked ? 'Unlock department' : 'Lock department budget'}
                                        onClick={(e) => { e.stopPropagation(); toggleLock(dept.id); }}
                                        className={`dept-lock-btn ${isLocked ? 'dept-lock-btn--locked' : ''}`}
                                    >
                                        {isLocked ? '🔒' : '🔓'}
                                    </button>
                                </div>
                            </div>

                            {/* Allocation: % slider + dollar input */}
                            <div className="mb-2">
                                <div className="flex items-center justify-between mb-1">
                                    <label className="text-xs text-gray-600">Allocated Budget</label>
                                    <div className="dept-pct-wrap">
                                        <span className="text-xs font-semibold text-gray-500">{currentPct.toFixed(1)}%</span>
                                        {totalBudget > 0 && (
                                            <div className="dept-pct-tooltip">
                                                +1% = +${(totalBudget / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    step="0.1"
                                    value={currentPct}
                                    disabled={sliderDisabled}
                                    onChange={(e) => {
                                        if (sliderDisabled) return;
                                        const newPct = parseFloat(e.target.value);
                                        if (allocMode === 'percentage') {
                                            handlePctChange(dept.id, newPct);
                                        } else {
                                            updateDeptAmount(dept.id, parseFloat(((newPct / 100) * totalBudget).toFixed(2)));
                                        }
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    className={`w-full mb-2 accent-green-600 ${sliderDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                    title={`${dept.name}: ${currentPct.toFixed(1)}% of total budget`}
                                />
                                <div className="relative">
                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                                    <input
                                        type="number"
                                        value={deptData.allocated || ''}
                                        onChange={(e) => {
                                            if (inputDisabled) return;
                                            updateDeptAmount(dept.id, e.target.value);
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        readOnly={inputDisabled}
                                        className={`w-full pl-6 pr-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-green-500 ${inputDisabled ? 'opacity-60 cursor-not-allowed bg-gray-50' : ''}`}
                                        placeholder="0.00"
                                        step="0.01"
                                    />
                                </div>
                                {isLocked && (
                                    <div className="dept-lock-notice">🔒 Locked — unlock to edit</div>
                                )}
                            </div>

                            {/* Spent vs Allocated */}
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-gray-600">Spent:</span>
                                <span className={`font-semibold ${deptSummary?.isOverBudget ? 'text-red-600' : 'text-gray-900'}`}>
                                    ${(deptData.spent || 0).toLocaleString()}
                                </span>
                            </div>

                            {/* Progress Bar (spent vs allocated) */}
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
