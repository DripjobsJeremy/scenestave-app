function ProductionBudgetManager({ production, onClose, onSave }) {
    console.log('🎬 ProductionBudgetManager rendering for:', production?.id, production?.title);

    const [budget, setBudget] = React.useState(null);
    const [activeTab, setActiveTab] = React.useState('overview');

    const BUDGET_ROLES = ['super_admin', 'venue_manager', 'admin', 'client_admin', 'board_member', 'accounting_manager'];
    const canEditBudget = BUDGET_ROLES.includes(localStorage.getItem('showsuite_user_role') || 'admin');

    const [royalties, setRoyalties] = React.useState(() => {
        try {
            const prods = JSON.parse(localStorage.getItem('showsuite_productions') || '[]');
            const prod = prods.find(p => p.id === production?.id);
            const r = prod?.royalties || production?.royalties || {};
            return {
                contractType: r.contractType || 'perf_seat',
                numberOfPerformances: parseInt(r.numberOfPerformances || 0),
                seatingCapacity: parseInt(r.seatingCapacity || 0),
                avgTicketPrice: parseFloat(r.avgTicketPrice || 0),
                attendancePct: parseFloat(r.attendancePct || 80),
                flatFee: parseFloat(r.flatFee || 0),
                perPerformance: parseFloat(r.perPerformance || 0),
                perSeat: parseFloat(r.perSeat || 0),
                seatBasis: r.seatBasis || 'capacity',
                pctGross: parseFloat(r.pctGross || 0),
                minGuarantee: parseFloat(r.minGuarantee || 0),
                maxCap: parseFloat(r.maxCap || 0),
                discount: parseFloat(r.discount || 0),
                notes: r.notes || '',
            };
        } catch {
            return {
                contractType: 'perf_seat', numberOfPerformances: 0, seatingCapacity: 0,
                avgTicketPrice: 0, attendancePct: 80, flatFee: 0, perPerformance: 0,
                perSeat: 0, seatBasis: 'capacity', pctGross: 0, minGuarantee: 0,
                maxCap: 0, discount: 0, notes: '',
            };
        }
    });
    const [royaltiesExpanded, setRoyaltiesExpanded] = React.useState(false);

    const saveRoyalties = (updates) => {
        const updated = { ...royalties, ...updates };
        setRoyalties(updated);
        try {
            const prods = JSON.parse(localStorage.getItem('showsuite_productions') || '[]');
            const idx = prods.findIndex(p => p.id === production?.id);
            if (idx !== -1) {
                prods[idx] = { ...prods[idx], royalties: updated };
                localStorage.setItem('showsuite_productions', JSON.stringify(prods));
            }
        } catch {}
    };

    React.useEffect(() => {
        loadBudget();
    }, [production.id]);

    const loadBudget = () => {
        console.log('📊 Loading budget for production:', production.id, production.title);

        try {
            // Try to sync department costs from scene data
            const synced = window.budgetService.syncDepartmentCosts(production.id);
            console.log('✅ Budget synced:', synced);
            setBudget(synced);
        } catch (error) {
            console.warn('⚠️ Sync failed, loading budget without sync:', error.message);
            // Load budget anyway even if sync fails
            const budgetData = window.budgetService.getProductionBudget(production.id);
            setBudget(budgetData);
        }
    };

    const handleUpdateTotalBudget = (value) => {
        const updated = window.budgetService.updateProductionBudget(production.id, {
            totalBudget: parseFloat(value) || 0
        });
        setBudget(updated);
    };

    const handleUpdateDepartmentAllocation = (department, value) => {
        const updated = window.budgetService.updateDepartmentBudget(production.id, department, {
            allocated: parseFloat(value) || 0
        });
        setBudget(updated);
    };

    const handleAutoAllocate = () => {
        const total = budget.totalBudget || 0;
        if (!total) return;
        const deptIds = DEPARTMENTS.map(d => d.id);
        const perDept = parseFloat((total / deptIds.length).toFixed(2));
        const remainder = parseFloat((total - perDept * (deptIds.length - 1)).toFixed(2));
        deptIds.forEach((deptId, idx) => {
            window.budgetService.updateDepartmentBudget(production.id, deptId, {
                allocated: idx === deptIds.length - 1 ? remainder : perDept
            });
        });
        loadBudget();
        if (window.showToast) {
            window.showToast(`⚡ Budget split evenly: $${perDept.toFixed(2)} per department`, 'success');
        }
    };

    const handleSyncDepartmentCosts = () => {
        const updated = window.budgetService.syncDepartmentCosts(production.id);
        setBudget(updated);
        if (window.showToast) {
            window.showToast('✅ Synced costs from scene data', 'success');
        }
    };

    const handleUpdateRevenue = (field, value) => {
        const updated = window.budgetService.updateProductionBudget(production.id, {
            revenue: {
                ...budget.revenue,
                [field]: parseFloat(value) || 0
            }
        });
        setBudget(updated);
    };

    const royaltyCalc = React.useMemo(() => {
        const r = royalties;
        const perfs = r.numberOfPerformances;
        const seats = r.seatingCapacity;
        const seatsUsed = r.seatBasis === 'capacity'
            ? seats
            : Math.round(seats * r.attendancePct / 100);
        const grossRev = seats * (r.attendancePct / 100) * perfs * r.avgTicketPrice;
        const type = r.contractType;
        const rows = [];
        let subtotal = 0;

        if (['flat','perf_seat','custom'].includes(type) && r.flatFee > 0) {
            const amt = r.flatFee;
            rows.push({ label: 'Flat licensing fee', amount: amt });
            subtotal += amt;
        }
        if (['per_perf','perf_seat','custom'].includes(type) && r.perPerformance > 0) {
            const amt = r.perPerformance * perfs;
            rows.push({ label: `Per performance ($${r.perPerformance.toFixed(2)} × ${perfs} perfs)`, amount: amt });
            subtotal += amt;
        }
        if (['per_seat','perf_seat','custom'].includes(type) && r.perSeat > 0) {
            const amt = r.perSeat * seatsUsed * perfs;
            const basis = r.seatBasis === 'capacity' ? 'capacity' : 'tickets sold';
            rows.push({ label: `Per seat ($${r.perSeat.toFixed(2)} × ${seatsUsed} seats × ${perfs} perfs, ${basis})`, amount: amt });
            subtotal += amt;
        }
        if (['pct_gross','pct_min'].includes(type) && r.pctGross > 0) {
            let amt = grossRev * (r.pctGross / 100);
            if (type === 'pct_min') amt = Math.max(amt, r.minGuarantee);
            const label = type === 'pct_min'
                ? `${r.pctGross}% of gross revenue (min $${r.minGuarantee.toFixed(2)})`
                : `${r.pctGross}% of gross revenue`;
            rows.push({ label, amount: amt });
            subtotal += amt;
        }

        let total = subtotal;
        let afterCap = null;
        let afterDiscount = null;

        if (r.maxCap > 0 && total > r.maxCap) {
            afterCap = r.maxCap;
            total = r.maxCap;
        }
        if (r.discount > 0) {
            afterDiscount = total * (1 - r.discount / 100);
            total = afterDiscount;
        }

        return { rows, subtotal, afterCap, afterDiscount, total, grossRev, seatsUsed };
    }, [royalties]);

    if (!budget) return <div className="p-6">Loading budget...</div>;

    const summary = window.budgetService.calculateBudgetSummary(production.id);

    const DEPARTMENTS = [
        { id: 'lighting', name: 'Lighting', icon: '💡' },
        { id: 'sound', name: 'Sound', icon: '🔊' },
        { id: 'wardrobe', name: 'Wardrobe', icon: '👔' },
        { id: 'props', name: 'Props', icon: '🎭' },
        { id: 'set', name: 'Set Design', icon: '🎨' },
        { id: 'marketing', name: 'Marketing', icon: '📢' },
        { id: 'venue', name: 'Venue', icon: '🏛️' },
        { id: 'cast', name: 'Cast', icon: '🎬' },
        { id: 'crew', name: 'Crew', icon: '👷' },
        { id: 'other', name: 'Other', icon: '📦' }
    ];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold">Production Budget</h2>
                            <p className="text-green-100 mt-1">{production.title}</p>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-8 h-8 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full flex items-center justify-center transition-colors"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-4 gap-4 mt-6">
                        <div className="bg-white bg-opacity-10 rounded-lg p-3">
                            <div className="text-xs opacity-75">Total Budget</div>
                            <div className="text-xl font-bold">${summary.totalBudget.toLocaleString()}</div>
                        </div>
                        <div className="bg-white bg-opacity-10 rounded-lg p-3">
                            <div className="text-xs opacity-75">Allocated</div>
                            <div className="text-xl font-bold">${summary.totalAllocated.toLocaleString()}</div>
                        </div>
                        <div className="bg-white bg-opacity-10 rounded-lg p-3">
                            <div className="text-xs opacity-75">Spent</div>
                            <div className={`text-xl font-bold ${summary.isOverBudget ? 'text-red-300' : ''}`}>
                                ${summary.totalSpent.toLocaleString()}
                            </div>
                        </div>
                        <div className="bg-white bg-opacity-10 rounded-lg p-3">
                            <div className="text-xs opacity-75">Remaining</div>
                            <div className={`text-xl font-bold ${summary.remaining < 0 ? 'text-red-300' : ''}`}>
                                ${summary.remaining.toLocaleString()}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex gap-2 px-6 pt-4 border-b border-gray-200">
                    {[
                        { id: 'overview', label: 'Overview' },
                        { id: 'departments', label: 'Departments' },
                        { id: 'revenue', label: 'Revenue' },
                        { id: 'ghost_light', label: '🕯️ Ghost Light' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-2 border-b-2 transition-colors ${
                                activeTab === tab.id && tab.id === 'ghost_light'
                                    ? 'border-purple-500 text-purple-400 font-semibold'
                                    : activeTab === tab.id
                                    ? 'border-green-600 text-green-600 font-semibold'
                                    : 'border-transparent text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            {tab.id === 'ghost_light' ? <img src="assets/ghostlight/ghostlight-full-button-new.png" alt="GhostLight" style={{ height: '28px', objectFit: 'contain' }} /> : tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {activeTab === 'overview' && window.BudgetOverview && (
                        <window.BudgetOverview
                            budget={budget}
                            summary={summary}
                            canEditBudget={canEditBudget}
                            onUpdateTotalBudget={handleUpdateTotalBudget}
                            onSyncCosts={handleSyncDepartmentCosts}
                            royaltiesTotal={royaltyCalc.total}
                        />
                    )}

                    {activeTab === 'departments' && window.DepartmentsBudget && (
                        <div>
                            <window.DepartmentsBudget
                                budget={budget}
                                summary={summary}
                                departments={DEPARTMENTS}
                                productionId={production.id}
                                canEditBudget={canEditBudget}
                                onUpdateAllocation={handleUpdateDepartmentAllocation}
                                onRefresh={loadBudget}
                                onAutoAllocate={handleAutoAllocate}
                            />

                            {/* Royalties & Licensing */}
                            <div className="royalties-wrapper">
                                <div
                                    onClick={() => setRoyaltiesExpanded(e => !e)}
                                    className={`royalties-header flex items-center justify-between px-4 py-3 ${royaltiesExpanded ? 'royalties-header--open' : ''}`}
                                >
                                    <div className="flex items-center gap-2">
                                        <span>🎭</span>
                                        <span className="royalties-header-title">Royalties &amp; Licensing</span>
                                        {royaltyCalc.total > 0 && (
                                            <span className="royalties-header-total">
                                                ${royaltyCalc.total.toLocaleString('en-US', { minimumFractionDigits: 2 })} total
                                            </span>
                                        )}
                                    </div>
                                    <span className="royalties-header-chevron">
                                        {royaltiesExpanded ? '▼' : '▶'}
                                    </span>
                                </div>

                                {royaltiesExpanded && (
                                    <div className="royalties-body">

                                        {/* Production Details */}
                                        <div className="royalties-section">
                                            <div className="royalties-section-label">Production details</div>
                                            <div className="royalties-grid-3">
                                                {[
                                                    { key: 'numberOfPerformances', label: 'Performances', step: 1 },
                                                    { key: 'seatingCapacity', label: 'Seating capacity', step: 1 },
                                                    { key: 'avgTicketPrice', label: 'Avg ticket price', step: 0.01 },
                                                ].map(f => (
                                                    <div key={f.key}>
                                                        <label className="royalties-field-label">{f.label}</label>
                                                        <input type="number" step={f.step} min="0"
                                                            value={royalties[f.key] || ''}
                                                            title={f.label}
                                                            placeholder="0"
                                                            onChange={e => saveRoyalties({ [f.key]: f.step === 1 ? parseInt(e.target.value) || 0 : parseFloat(e.target.value) || 0 })}
                                                            className="w-full px-3 py-2 rounded-lg text-sm border border-gray-300 focus:ring-2 focus:ring-green-500"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="royalties-grid-2">
                                                <div>
                                                    <label className="royalties-field-label">Expected attendance %</label>
                                                    <input type="number" min="0" max="100" step="1"
                                                        value={royalties.attendancePct || ''}
                                                        title="Expected attendance %"
                                                        placeholder="80"
                                                        onChange={e => saveRoyalties({ attendancePct: parseFloat(e.target.value) || 0 })}
                                                        className="w-full px-3 py-2 rounded-lg text-sm border border-gray-300 focus:ring-2 focus:ring-green-500"
                                                    />
                                                    <p className="royalties-field-hint">% of capacity per performance</p>
                                                </div>
                                                <div className="royalties-gross-col">
                                                    <span className="royalties-gross-label">
                                                        Est. gross revenue: <strong className="royalties-gross-value">${royaltyCalc.grossRev.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
                                                    </span>
                                                    <span className="royalties-gross-sub">
                                                        {royaltyCalc.seatsUsed} seats × {royalties.numberOfPerformances} perfs
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Contract Type */}
                                        <div className="royalties-section">
                                            <div className="royalties-section-label">Royalty structure</div>
                                            <select
                                                value={royalties.contractType}
                                                onChange={e => saveRoyalties({ contractType: e.target.value })}
                                                title="Royalty structure"
                                                className="w-full px-3 py-2 rounded-lg text-sm border border-gray-300 focus:ring-2 focus:ring-green-500"
                                            >
                                                <option value="flat">Flat fee only</option>
                                                <option value="per_perf">Per performance</option>
                                                <option value="per_seat">Per seat</option>
                                                <option value="perf_seat">Per performance + per seat</option>
                                                <option value="pct_gross">Percentage of gross</option>
                                                <option value="pct_min">Percentage of gross w/ minimum guarantee</option>
                                                <option value="custom">Custom / hybrid</option>
                                            </select>
                                        </div>

                                        {/* Fee Fields */}
                                        <div className="royalties-fee-grid">
                                            {['flat','perf_seat','custom'].includes(royalties.contractType) && (
                                                <div>
                                                    <label className="royalties-field-label">Flat licensing fee</label>
                                                    <input type="number" min="0" step="0.01"
                                                        value={royalties.flatFee || ''}
                                                        onChange={e => saveRoyalties({ flatFee: parseFloat(e.target.value) || 0 })}
                                                        placeholder="0.00"
                                                        className="w-full px-3 py-2 rounded-lg text-sm border border-gray-300 focus:ring-2 focus:ring-green-500"
                                                    />
                                                    <p className="royalties-field-hint">One-time fee paid to licensor</p>
                                                </div>
                                            )}

                                            {['per_perf','perf_seat','custom'].includes(royalties.contractType) && (
                                                <div>
                                                    <label className="royalties-field-label">Per-performance royalty</label>
                                                    <input type="number" min="0" step="0.01"
                                                        value={royalties.perPerformance || ''}
                                                        onChange={e => saveRoyalties({ perPerformance: parseFloat(e.target.value) || 0 })}
                                                        placeholder="0.00"
                                                        className="w-full px-3 py-2 rounded-lg text-sm border border-gray-300 focus:ring-2 focus:ring-green-500"
                                                    />
                                                </div>
                                            )}

                                            {['per_seat','perf_seat','custom'].includes(royalties.contractType) && (
                                                <>
                                                    <div>
                                                        <label className="royalties-field-label">Per-seat royalty</label>
                                                        <input type="number" min="0" step="0.01"
                                                            value={royalties.perSeat || ''}
                                                            onChange={e => saveRoyalties({ perSeat: parseFloat(e.target.value) || 0 })}
                                                            placeholder="0.00"
                                                            className="w-full px-3 py-2 rounded-lg text-sm border border-gray-300 focus:ring-2 focus:ring-green-500"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="royalties-field-label">Applied to</label>
                                                        <div className="royalties-radio-group">
                                                            {[['capacity','Capacity'],['attendance','Tickets sold']].map(([val,lbl]) => (
                                                                <label key={val} className="royalties-radio-label">
                                                                    <input type="radio" name="seatBasis" value={val}
                                                                        checked={royalties.seatBasis === val}
                                                                        onChange={() => saveRoyalties({ seatBasis: val })}
                                                                    />
                                                                    {lbl}
                                                                </label>
                                                            ))}
                                                        </div>
                                                        <p className="royalties-field-hint">
                                                            {royalties.seatBasis === 'capacity'
                                                                ? `${royalties.seatingCapacity} seats per performance`
                                                                : `${royaltyCalc.seatsUsed} seats per performance (${royalties.attendancePct}% attendance)`}
                                                        </p>
                                                    </div>
                                                </>
                                            )}

                                            {['pct_gross','pct_min'].includes(royalties.contractType) && (
                                                <div>
                                                    <label className="royalties-field-label">% of gross revenue</label>
                                                    <input type="number" min="0" max="100" step="0.1"
                                                        value={royalties.pctGross || ''}
                                                        onChange={e => saveRoyalties({ pctGross: parseFloat(e.target.value) || 0 })}
                                                        placeholder="0.0"
                                                        className="w-full px-3 py-2 rounded-lg text-sm border border-gray-300 focus:ring-2 focus:ring-green-500"
                                                    />
                                                </div>
                                            )}

                                            {royalties.contractType === 'pct_min' && (
                                                <div>
                                                    <label className="royalties-field-label">Minimum guarantee</label>
                                                    <input type="number" min="0" step="0.01"
                                                        value={royalties.minGuarantee || ''}
                                                        onChange={e => saveRoyalties({ minGuarantee: parseFloat(e.target.value) || 0 })}
                                                        placeholder="0.00"
                                                        className="w-full px-3 py-2 rounded-lg text-sm border border-gray-300 focus:ring-2 focus:ring-green-500"
                                                    />
                                                    <p className="royalties-field-hint">Higher of % or minimum is charged</p>
                                                </div>
                                            )}

                                            {royalties.contractType !== 'flat' && (
                                                <div>
                                                    <label className="royalties-field-label">
                                                        Maximum royalty cap <span className="font-normal">(optional)</span>
                                                    </label>
                                                    <input type="number" min="0" step="0.01"
                                                        value={royalties.maxCap || ''}
                                                        onChange={e => saveRoyalties({ maxCap: parseFloat(e.target.value) || 0 })}
                                                        placeholder="No cap"
                                                        className="w-full px-3 py-2 rounded-lg text-sm border border-gray-300 focus:ring-2 focus:ring-green-500"
                                                    />
                                                </div>
                                            )}

                                            {royalties.contractType !== 'flat' && (
                                                <div>
                                                    <label className="royalties-field-label">
                                                        Discount % <span className="font-normal">(optional)</span>
                                                    </label>
                                                    <input type="number" min="0" max="100" step="0.1"
                                                        value={royalties.discount || ''}
                                                        onChange={e => saveRoyalties({ discount: parseFloat(e.target.value) || 0 })}
                                                        placeholder="0%"
                                                        className="w-full px-3 py-2 rounded-lg text-sm border border-gray-300 focus:ring-2 focus:ring-green-500"
                                                    />
                                                    <p className="royalties-field-hint">Negotiated reduction</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Breakdown */}
                                        <div className="royalties-breakdown">
                                            {royaltyCalc.rows.length === 0 ? (
                                                <p className="royalties-breakdown-empty">Enter values above to see breakdown</p>
                                            ) : (
                                                <>
                                                    {royaltyCalc.rows.map((row, i) => (
                                                        <div key={i} className="royalties-breakdown-row">
                                                            <span>{row.label}</span>
                                                            <span>${row.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                                        </div>
                                                    ))}
                                                    {royaltyCalc.afterCap !== null && (
                                                        <div className="royalties-breakdown-cap">
                                                            <span>After cap</span>
                                                            <span>${royaltyCalc.afterCap.toLocaleString('en-US', { minimumFractionDigits: 2 })} (capped)</span>
                                                        </div>
                                                    )}
                                                    {royaltyCalc.afterDiscount !== null && (
                                                        <div className="royalties-breakdown-discount">
                                                            <span>After {royalties.discount}% discount</span>
                                                            <span>${royaltyCalc.afterDiscount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                                        </div>
                                                    )}
                                                    <div className="royalties-breakdown-total">
                                                        <span>Total royalties</span>
                                                        <span className="royalties-breakdown-total-amount">${royaltyCalc.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        {/* Notes */}
                                        <div>
                                            <label className="royalties-field-label">Licensing notes</label>
                                            <textarea
                                                value={royalties.notes}
                                                onChange={e => saveRoyalties({ notes: e.target.value })}
                                                placeholder="Licensor contact, rights holder, contract number, renewal date..."
                                                rows={2}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 resize-y"
                                            />
                                        </div>

                                        <p className="royalties-footer-note">
                                            Royalties are separate from department allocations — budget accordingly
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'revenue' && window.RevenueBudget && (
                        <window.RevenueBudget
                            budget={budget}
                            summary={summary}
                            productionId={production.id}
                            productionTitle={production.title}
                            onUpdateRevenue={handleUpdateRevenue}
                            onRefresh={loadBudget}
                        />
                    )}

                    {activeTab === 'ghost_light' && (() => {
                        const features = [
                            { title: '🤖 AI Budget Allocator', desc: 'Get AI-suggested budget allocations based on your production type, venue size, and historical data' },
                            { title: '📈 Cost Forecaster', desc: 'Predict final costs based on early spending patterns' },
                            { title: '🏛️ Grant Match Assistant', desc: 'Identify grants your production may qualify for based on budget and production details' }
                        ];
                        return (
                            <div style={{ background: '#1a1a2e', borderRadius: '12px', padding: '32px', minHeight: '400px', position: 'relative', overflow: 'hidden' }}>
                                <div style={{ position: 'absolute', right: '24px', bottom: '24px', fontSize: '120px', opacity: 0.05, userSelect: 'none', lineHeight: 1, pointerEvents: 'none' }}>🕯️</div>
                                <div style={{ marginBottom: '32px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '8px' }}>
                                        <img src="assets/ghostlight/ghostlight-new-assests.png" alt="GhostLight" style={{ height: '80px', objectFit: 'contain' }} />
                                        <img src="assets/ghostlight/ghostlight-full-button-new.png" alt="GhostLight" style={{ height: '48px', objectFit: 'contain' }} />
                                    </div>
                                    <p style={{ color: '#9b8fa8', fontSize: '14px', margin: '0' }}>AI-powered tools for theatre professionals — coming soon</p>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px' }}>
                                    {features.map((feature, i) => (
                                        <div key={i} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '24px', position: 'relative' }}>
                                            <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#f5f0e8', marginBottom: '8px', marginTop: '0', paddingRight: '32px' }}>{feature.title}</h3>
                                            <p style={{ fontSize: '13px', color: '#9b8fa8', lineHeight: '1.5', marginBottom: '16px', marginTop: '0' }}>{feature.desc}</p>
                                            <span style={{ display: 'inline-block', padding: '3px 10px', background: 'rgba(147,97,255,0.15)', border: '1px solid rgba(147,97,255,0.35)', borderRadius: '20px', fontSize: '11px', fontWeight: '500', color: '#b78aff', letterSpacing: '0.5px' }}>Coming Soon</span>
                                            <img src="assets/ghostlight/ghostlight-button-new_1.1_transparent.png" alt="" style={{ position: 'absolute', bottom: '12px', right: '12px', height: '36px', objectFit: 'contain', opacity: 0.3 }} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })()}
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 p-4 bg-gray-50 flex justify-between items-center">
                    <div className="text-sm text-gray-600">
                        Last updated: {new Date(budget.lastUpdated).toLocaleString()}
                    </div>
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                        >
                            Close
                        </button>
                        {canEditBudget && <button
                            type="button"
                            onClick={() => {
                                if (onSave) onSave();
                                if (window.showToast) {
                                    window.showToast('✅ Budget saved', 'success');
                                }
                            }}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                            Save & Close
                        </button>}
                    </div>
                </div>
            </div>
        </div>
    );
}

window.ProductionBudgetManager = ProductionBudgetManager;

console.log('✅ ProductionBudgetManager component loaded - VERSION 2');
