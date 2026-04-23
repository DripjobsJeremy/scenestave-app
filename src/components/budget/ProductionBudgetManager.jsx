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
    const [ctOpen, setCtOpen] = React.useState(false);

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
        const grossBasis = seats * (r.attendancePct / 100) * perfs * r.avgTicketPrice;
        const type = r.contractType;

        let base = 0;
        let perPerfSubtotal = 0;
        let subtotal = 0;

        if (['flat','perf_seat','custom'].includes(type) && r.flatFee > 0) {
            base = r.flatFee;
            subtotal += r.flatFee;
        }
        if (['per_perf','perf_seat','custom'].includes(type) && r.perPerformance > 0) {
            perPerfSubtotal = r.perPerformance * perfs;
            subtotal += perPerfSubtotal;
            if (type === 'per_perf') base = r.perPerformance;
        }
        if (['per_seat','perf_seat','custom'].includes(type) && r.perSeat > 0) {
            subtotal += r.perSeat * seatsUsed * perfs;
            if (type === 'per_seat') base = r.perSeat;
        }
        if (['pct_gross','pct_min'].includes(type) && r.pctGross > 0) {
            let amt = grossBasis * (r.pctGross / 100);
            if (type === 'pct_min') amt = Math.max(amt, r.minGuarantee);
            subtotal += amt;
            base = r.pctGross;
        }

        const subtotalBeforeCap = subtotal;
        const capTriggered = r.maxCap > 0 && subtotal > r.maxCap;
        const capAdjustment = capTriggered ? subtotal - r.maxCap : 0;
        const afterCapTotal = capTriggered ? r.maxCap : subtotal;
        const discountAmount = r.discount > 0 ? afterCapTotal * (r.discount / 100) : 0;
        const total = afterCapTotal - discountAmount;

        return { base, perPerfSubtotal, grossBasis, discountAmount, subtotalBeforeCap, capAdjustment, total, capTriggered, seatsUsed };
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
                        { id: 'royalties', label: 'Royalties & Licensing' },
                        { id: 'revenue', label: 'Revenue' },
                        { id: 'ghost_light', label: '🕯️ Ghost Light' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-2 border-b-2 transition-colors ${tab.id === 'ghost_light' ? 'ghostlight-btn' : ''} ${
                                activeTab === tab.id && tab.id === 'ghost_light'
                                    ? 'border-purple-500 text-purple-400 font-semibold'
                                    : activeTab === tab.id
                                    ? 'border-green-600 text-green-600 font-semibold'
                                    : 'border-transparent text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            {tab.id === 'ghost_light' ? <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }} title="Get assistance from GhostLight AI"><img src="assets/ghostlight/ghostlight-logo.png" alt="GhostLight AI" style={{ height: '36px', width: '36px', objectFit: 'contain' }} /></span> : tab.label}
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
                    )}

                    {activeTab === 'royalties' && (() => {
                        const CONTRACT_TYPES = {
                            flat:      { name: 'Flat Fee',                   desc: 'A single fixed licensing amount, paid once regardless of attendance.' },
                            per_perf:  { name: 'Per Performance',            desc: 'A fixed royalty charged for each performance given.' },
                            per_seat:  { name: 'Per Seat',                   desc: 'A royalty per seat based on capacity or tickets sold.' },
                            perf_seat: { name: 'Per Performance, Per Seat',  desc: 'Combines a per-performance charge with a per-seat royalty.' },
                            pct_gross: { name: 'Percentage of Gross',        desc: 'A percentage of total box office gross revenue.' },
                            pct_min:   { name: 'Percentage with Minimum',    desc: 'Percentage of gross, with a minimum guarantee floor.' },
                            custom:    { name: 'Custom / Hybrid',            desc: 'Mix flat fee, per-performance, and per-seat components freely.' },
                        };

                        const METHOD_NOTES = {
                            flat:      'Total is the flat licensing fee with any negotiated discount applied.',
                            per_perf:  'Total is the per-performance rate multiplied by number of performances.',
                            per_seat:  'Total is the per-seat rate multiplied by seats and performances.',
                            perf_seat: 'Total combines a per-performance charge and a per-seat royalty across all performances.',
                            pct_gross: 'Total is calculated as a percentage of estimated gross box office revenue.',
                            pct_min:   'Total is the higher of the percentage-of-gross amount or the minimum guarantee.',
                            custom:    'Total combines all active components: flat fee, per-performance, and per-seat royalties.',
                        };

                        const ROYALTY_DEFAULTS = {
                            contractType: 'perf_seat', numberOfPerformances: 0, seatingCapacity: 0,
                            avgTicketPrice: 0, attendancePct: 80, flatFee: 0, perPerformance: 0,
                            perSeat: 0, seatBasis: 'capacity', pctGross: 0, minGuarantee: 0,
                            maxCap: 0, discount: 0, notes: '',
                        };

                        const ct = royalties.contractType;
                        const showFlat      = ['flat','perf_seat','custom'].includes(ct);
                        const showPerPerf   = ['per_perf','perf_seat','custom'].includes(ct);
                        const showPerSeat   = ['per_seat','perf_seat','custom'].includes(ct);
                        const showPctGross  = ['pct_gross','pct_min'].includes(ct);
                        const showMinGuar   = ct === 'pct_min';
                        const showDiscount  = ct !== 'flat';
                        const showCap       = ct !== 'flat';
                        const showModifiers = showFlat || showPerPerf || showPerSeat || showPctGross;

                        const fmt = (n) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

                        const inputCls = 'rl-number-input w-full min-h-[48px] px-4 text-lg bg-[var(--color-bg-base)] border border-[var(--color-border)] rounded-[20px] focus:border-[var(--color-accent-gold)] focus:outline-none text-[var(--color-text)]';
                        const lbl = 'text-xs uppercase tracking-wide text-[var(--color-text-muted)]';
                        const sectionCls = 'bg-[var(--color-bg-panel)] border border-[var(--color-border)] rounded-[20px] p-6';
                        const sliderPct = (val, min, max) => (((Math.min(val, max) - min) / (max - min)) * 100).toFixed(1) + '%';

                        return (
                            <div className="bg-[var(--color-bg-base)] rounded-[20px] p-8 gap-8 rl-outer-grid">
                                <style>{`
                                  .rl-s-perf   { --rl-progress: ${sliderPct(royalties.numberOfPerformances, 0, 100)}; }
                                  .rl-s-seats  { --rl-progress: ${sliderPct(royalties.seatingCapacity, 0, 3000)}; }
                                  .rl-s-price  { --rl-progress: ${sliderPct(royalties.avgTicketPrice, 0, 500)}; }
                                  .rl-s-attend { --rl-progress: ${sliderPct(royalties.attendancePct, 0, 100)}; }
                                  .rl-s-flat   { --rl-progress: ${sliderPct(royalties.flatFee, 0, 50000)}; }
                                  .rl-s-pperf  { --rl-progress: ${sliderPct(royalties.perPerformance, 0, 5000)}; }
                                  .rl-s-pseat  { --rl-progress: ${sliderPct(royalties.perSeat, 0, 100)}; }
                                  .rl-s-minguá { --rl-progress: ${sliderPct(royalties.minGuarantee, 0, 50000)}; }
                                  .rl-s-pctg   { --rl-progress: ${sliderPct(royalties.pctGross, 0, 50)}; }
                                  .rl-s-disc   { --rl-progress: ${sliderPct(royalties.discount, 0, 50)}; }
                                  .rl-s-cap    { --rl-progress: ${sliderPct(royalties.maxCap, 0, 100000)}; }
                                `}</style>

                                {/* LEFT COLUMN */}
                                <div className="flex flex-col gap-6">

                                    {/* Contract Type */}
                                    <div className={sectionCls}>
                                        <h3 className="font-fraunces text-xl text-[var(--color-text)] mb-1">Contract Type</h3>
                                        <p className="text-sm text-[var(--color-text-muted)] mb-4">Choose the royalty structure that matches your licensing agreement.</p>
                                        <div className="relative">
                                            {ctOpen && <div className="fixed inset-0 z-10" onClick={() => setCtOpen(false)} />}
                                            <button
                                                type="button"
                                                disabled={!canEditBudget}
                                                onClick={() => canEditBudget && setCtOpen(o => !o)}
                                                className="w-full min-h-[56px] px-5 py-3 bg-[var(--color-bg-base)] border border-[var(--color-border)] rounded-[20px] text-left flex items-center justify-between gap-4 focus:border-[var(--color-accent-gold)] focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <div>
                                                    <div className="font-medium text-[var(--color-text)]">{CONTRACT_TYPES[ct].name}</div>
                                                    <div className="text-xs text-[var(--color-text-muted)] mt-0.5">{CONTRACT_TYPES[ct].desc}</div>
                                                </div>
                                                <span className="text-[var(--color-text-muted)] shrink-0 text-lg leading-none">{ctOpen ? '▴' : '▾'}</span>
                                            </button>
                                            {ctOpen && (
                                                <div className="absolute z-20 left-0 right-0 mt-2 bg-[var(--color-bg-panel)] border border-[var(--color-border)] rounded-[20px] overflow-hidden rl-dropdown-list">
                                                    {Object.entries(CONTRACT_TYPES).map(([val, info]) => (
                                                        <button
                                                            key={val}
                                                            type="button"
                                                            onClick={() => { saveRoyalties({ contractType: val }); setCtOpen(false); }}
                                                            className={[
                                                                'w-full text-left px-5 py-3 transition-colors border-b border-[var(--color-border)] last:border-b-0',
                                                                val === ct ? 'rl-option-selected' : 'hover:bg-[var(--color-bg-base)]',
                                                            ].join(' ')}
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                {val === ct && <span className="text-accent-gold text-xs">✓</span>}
                                                                <span className={`font-semibold text-sm ${val === ct ? 'text-[var(--color-text)]' : 'text-[var(--color-text)]'}`}>{info.name}</span>
                                                            </div>
                                                            <div className="text-xs text-[var(--color-text-muted)] mt-0.5">{info.desc}</div>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Production Details */}
                                    <div className={sectionCls}>
                                        <h3 className="font-fraunces text-xl text-[var(--color-text)] mb-1">Production Details</h3>
                                        <p className="text-sm text-[var(--color-text-muted)] mb-5">Enter your run details to calculate expected royalty obligations.</p>
                                        <div className="grid grid-cols-2 gap-6">
                                            <div>
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className={lbl}>Performances</span>
                                                    <span className="text-xs tabular-nums text-[var(--color-text-muted)]">{royalties.numberOfPerformances}</span>
                                                </div>
                                                <input type="range" title="Performances" min="0" max="100" step="1" disabled={!canEditBudget}
                                                    value={Math.min(royalties.numberOfPerformances, 100)}
                                                    onChange={e => saveRoyalties({ numberOfPerformances: parseInt(e.target.value) || 0 })}
                                                    className="rl-slider rl-s-perf w-full mb-3"
                                                />
                                                <input type="number" step="1" min="0" disabled={!canEditBudget}
                                                    value={royalties.numberOfPerformances || ''} placeholder="0"
                                                    onChange={e => saveRoyalties({ numberOfPerformances: parseInt(e.target.value) || 0 })}
                                                    className={inputCls}
                                                />
                                            </div>
                                            <div>
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className={lbl}>Seating Capacity</span>
                                                    <span className="text-xs tabular-nums text-[var(--color-text-muted)]">{royalties.seatingCapacity}</span>
                                                </div>
                                                <input type="range" title="Seating capacity" min="0" max="3000" step="50" disabled={!canEditBudget}
                                                    value={Math.min(royalties.seatingCapacity, 3000)}
                                                    onChange={e => saveRoyalties({ seatingCapacity: parseInt(e.target.value) || 0 })}
                                                    className="rl-slider rl-s-seats w-full mb-3"
                                                />
                                                <input type="number" step="1" min="0" disabled={!canEditBudget}
                                                    value={royalties.seatingCapacity || ''} placeholder="0"
                                                    onChange={e => saveRoyalties({ seatingCapacity: parseInt(e.target.value) || 0 })}
                                                    className={inputCls}
                                                />
                                            </div>
                                            <div>
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className={lbl}>Avg Ticket Price</span>
                                                    <span className="text-xs tabular-nums text-[var(--color-text-muted)]">${royalties.avgTicketPrice}</span>
                                                </div>
                                                <input type="range" title="Avg ticket price" min="0" max="500" step="1" disabled={!canEditBudget}
                                                    value={Math.min(royalties.avgTicketPrice, 500)}
                                                    onChange={e => saveRoyalties({ avgTicketPrice: parseFloat(e.target.value) || 0 })}
                                                    className="rl-slider rl-s-price w-full mb-3"
                                                />
                                                <div className="relative">
                                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">$</span>
                                                    <input type="number" step="0.01" min="0" disabled={!canEditBudget}
                                                        value={royalties.avgTicketPrice || ''} placeholder="0.00"
                                                        onChange={e => saveRoyalties({ avgTicketPrice: parseFloat(e.target.value) || 0 })}
                                                        className={inputCls + ' pl-8'}
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className={lbl}>Expected Attendance</span>
                                                    <span className="text-xs tabular-nums text-[var(--color-text-muted)]">{royalties.attendancePct}%</span>
                                                </div>
                                                <input type="range" title="Expected attendance" min="0" max="100" step="1" disabled={!canEditBudget}
                                                    value={Math.min(royalties.attendancePct, 100)}
                                                    onChange={e => saveRoyalties({ attendancePct: parseFloat(e.target.value) || 0 })}
                                                    className="rl-slider rl-s-attend w-full mb-3"
                                                />
                                                <div className="relative">
                                                    <input type="number" step="1" min="0" max="100" disabled={!canEditBudget}
                                                        value={royalties.attendancePct || ''} placeholder="80"
                                                        onChange={e => saveRoyalties({ attendancePct: parseFloat(e.target.value) || 0 })}
                                                        className={inputCls + ' pr-8'}
                                                    />
                                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">%</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Modifiers */}
                                    {showModifiers && (
                                        <div className={sectionCls}>
                                            <h3 className="font-fraunces text-xl text-[var(--color-text)] mb-1">Modifiers</h3>
                                            <p className="text-sm text-[var(--color-text-muted)] mb-5">Set the rates and adjustments that apply to this contract type.</p>
                                            <div className="grid grid-cols-2 gap-6">
                                                <div className="flex flex-col gap-5">
                                                    {showFlat && (
                                                        <div>
                                                            <div className="flex justify-between items-center mb-2">
                                                                <span className={lbl}>Flat Licensing Fee</span>
                                                                <span className="text-xs tabular-nums text-[var(--color-text-muted)]">${royalties.flatFee}</span>
                                                            </div>
                                                            <input type="range" title="Flat licensing fee" min="0" max="50000" step="100" disabled={!canEditBudget}
                                                                value={Math.min(royalties.flatFee, 50000)}
                                                                onChange={e => saveRoyalties({ flatFee: parseFloat(e.target.value) || 0 })}
                                                                className="rl-slider rl-s-flat w-full mb-3"
                                                            />
                                                            <div className="relative">
                                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">$</span>
                                                                <input type="number" step="0.01" min="0" disabled={!canEditBudget}
                                                                    value={royalties.flatFee || ''} placeholder="0.00"
                                                                    onChange={e => saveRoyalties({ flatFee: parseFloat(e.target.value) || 0 })}
                                                                    className={inputCls + ' pl-8'}
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
                                                    {showPerPerf && (
                                                        <div>
                                                            <div className="flex justify-between items-center mb-2">
                                                                <span className={lbl}>Per Performance Royalty</span>
                                                                <span className="text-xs tabular-nums text-[var(--color-text-muted)]">${royalties.perPerformance}</span>
                                                            </div>
                                                            <input type="range" title="Per performance royalty" min="0" max="5000" step="10" disabled={!canEditBudget}
                                                                value={Math.min(royalties.perPerformance, 5000)}
                                                                onChange={e => saveRoyalties({ perPerformance: parseFloat(e.target.value) || 0 })}
                                                                className="rl-slider rl-s-pperf w-full mb-3"
                                                            />
                                                            <div className="relative">
                                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">$</span>
                                                                <input type="number" step="0.01" min="0" disabled={!canEditBudget}
                                                                    value={royalties.perPerformance || ''} placeholder="0.00"
                                                                    onChange={e => saveRoyalties({ perPerformance: parseFloat(e.target.value) || 0 })}
                                                                    className={inputCls + ' pl-8'}
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
                                                    {showPerSeat && (
                                                        <div>
                                                            <div className="flex justify-between items-center mb-2">
                                                                <span className={lbl}>Per Seat Royalty</span>
                                                                <span className="text-xs tabular-nums text-[var(--color-text-muted)]">${royalties.perSeat}</span>
                                                            </div>
                                                            <input type="range" title="Per seat royalty" min="0" max="100" step="0.5" disabled={!canEditBudget}
                                                                value={Math.min(royalties.perSeat, 100)}
                                                                onChange={e => saveRoyalties({ perSeat: parseFloat(e.target.value) || 0 })}
                                                                className="rl-slider rl-s-pseat w-full mb-3"
                                                            />
                                                            <div className="relative">
                                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">$</span>
                                                                <input type="number" step="0.01" min="0" disabled={!canEditBudget}
                                                                    value={royalties.perSeat || ''} placeholder="0.00"
                                                                    onChange={e => saveRoyalties({ perSeat: parseFloat(e.target.value) || 0 })}
                                                                    className={inputCls + ' pl-8'}
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
                                                    {showMinGuar && (
                                                        <div>
                                                            <div className="flex justify-between items-center mb-2">
                                                                <span className={lbl}>Minimum Guarantee</span>
                                                                <span className="text-xs tabular-nums text-[var(--color-text-muted)]">${royalties.minGuarantee}</span>
                                                            </div>
                                                            <input type="range" title="Minimum guarantee" min="0" max="50000" step="100" disabled={!canEditBudget}
                                                                value={Math.min(royalties.minGuarantee, 50000)}
                                                                onChange={e => saveRoyalties({ minGuarantee: parseFloat(e.target.value) || 0 })}
                                                                className="rl-slider rl-s-minguá w-full mb-3"
                                                            />
                                                            <div className="relative">
                                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">$</span>
                                                                <input type="number" step="0.01" min="0" disabled={!canEditBudget}
                                                                    value={royalties.minGuarantee || ''} placeholder="0.00"
                                                                    onChange={e => saveRoyalties({ minGuarantee: parseFloat(e.target.value) || 0 })}
                                                                    className={inputCls + ' pl-8'}
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex flex-col gap-5">
                                                    {showPerSeat && (
                                                        <div>
                                                            <span className={lbl + ' block mb-2'}>Seat Basis</span>
                                                            <div className="flex bg-[var(--color-bg-base)] border border-[var(--color-border)] rounded-[20px] overflow-hidden">
                                                                {[['capacity','Capacity'],['attendance','Sold']].map(([val, lbl2]) => (
                                                                    <button
                                                                        key={val}
                                                                        type="button"
                                                                        disabled={!canEditBudget}
                                                                        onClick={() => saveRoyalties({ seatBasis: val })}
                                                                        className={[
                                                                            'flex-1 px-4 py-2 text-sm transition-colors',
                                                                            royalties.seatBasis === val
                                                                                ? 'bg-[var(--color-accent-gold)] text-[var(--color-bg-base)]'
                                                                                : 'text-[var(--color-text-muted)]',
                                                                        ].join(' ')}
                                                                    >
                                                                        {lbl2}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {showPctGross && (
                                                        <div>
                                                            <div className="flex justify-between items-center mb-2">
                                                                <span className={lbl}>Percentage of Gross</span>
                                                                <span className="text-xs tabular-nums text-[var(--color-text-muted)]">{royalties.pctGross}%</span>
                                                            </div>
                                                            <input type="range" title="Percentage of gross" min="0" max="50" step="0.5" disabled={!canEditBudget}
                                                                value={Math.min(royalties.pctGross, 50)}
                                                                onChange={e => saveRoyalties({ pctGross: parseFloat(e.target.value) || 0 })}
                                                                className="rl-slider rl-s-pctg w-full mb-3"
                                                            />
                                                            <div className="relative">
                                                                <input type="number" step="0.1" min="0" max="100" disabled={!canEditBudget}
                                                                    value={royalties.pctGross || ''} placeholder="0.0"
                                                                    onChange={e => saveRoyalties({ pctGross: parseFloat(e.target.value) || 0 })}
                                                                    className={inputCls + ' pr-8'}
                                                                />
                                                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">%</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {showDiscount && (
                                                        <div>
                                                            <div className="flex justify-between items-center mb-2">
                                                                <span className={lbl}>Discount</span>
                                                                <span className="text-xs tabular-nums text-[var(--color-text-muted)]">{royalties.discount}%</span>
                                                            </div>
                                                            <input type="range" title="Discount" min="0" max="50" step="0.5" disabled={!canEditBudget}
                                                                value={Math.min(royalties.discount, 50)}
                                                                onChange={e => saveRoyalties({ discount: parseFloat(e.target.value) || 0 })}
                                                                className="rl-slider rl-s-disc w-full mb-3"
                                                            />
                                                            <div className="relative">
                                                                <input type="number" step="0.1" min="0" max="100" disabled={!canEditBudget}
                                                                    value={royalties.discount || ''} placeholder="0%"
                                                                    onChange={e => saveRoyalties({ discount: parseFloat(e.target.value) || 0 })}
                                                                    className={inputCls + ' pr-8'}
                                                                />
                                                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">%</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Cap */}
                                    {showCap && (
                                        <div className={sectionCls}>
                                            <h3 className="font-fraunces text-xl text-[var(--color-text)] mb-1">Cap</h3>
                                            <p className="text-sm text-[var(--color-text-muted)] mb-5">Set an optional ceiling on total royalty payout.</p>
                                            <div>
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className={lbl}>Maximum Royalty Cap</span>
                                                    <span className="text-xs tabular-nums text-[var(--color-text-muted)]">{royalties.maxCap > 0 ? '$' + royalties.maxCap.toLocaleString() : 'No cap'}</span>
                                                </div>
                                                <input type="range" title="Maximum royalty cap" min="0" max="100000" step="500" disabled={!canEditBudget}
                                                    value={Math.min(royalties.maxCap, 100000)}
                                                    onChange={e => saveRoyalties({ maxCap: parseFloat(e.target.value) || 0 })}
                                                    className="rl-slider rl-s-cap w-full mb-3"
                                                />
                                                <div className="relative">
                                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">$</span>
                                                    <input type="number" step="0.01" min="0" disabled={!canEditBudget}
                                                        value={royalties.maxCap || ''} placeholder="No cap"
                                                        onChange={e => saveRoyalties({ maxCap: parseFloat(e.target.value) || 0 })}
                                                        className={inputCls + ' pl-8'}
                                                    />
                                                </div>
                                                <p className="text-xs text-[var(--color-text-muted)] mt-2">The cap limits the total royalty payout for contracts that calculate from gross. Any amount above the cap is not charged.</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Notes */}
                                    <div>
                                        <span className={lbl + ' block mb-2'}>Notes</span>
                                        <textarea
                                            rows={3}
                                            disabled={!canEditBudget}
                                            value={royalties.notes}
                                            placeholder="Licensor contact, rights holder, contract number, renewal date..."
                                            onChange={e => saveRoyalties({ notes: e.target.value })}
                                            className="w-full px-4 py-3 bg-[var(--color-bg-base)] border border-[var(--color-border)] rounded-[20px] focus:border-[var(--color-accent-gold)] focus:outline-none text-[var(--color-text)] resize-y text-sm"
                                        />
                                    </div>
                                </div>

                                {/* RIGHT COLUMN: sticky live summary rail */}
                                <div className="sticky top-6 self-start h-fit bg-[var(--color-bg-panel)] border border-[var(--color-border)] rounded-[20px] p-6 flex flex-col gap-6 rl-rail-shadow">
                                    <div className="text-xs uppercase tracking-wider text-[var(--color-text-muted)]">Estimated Royalty</div>

                                    <div>
                                        <div className="font-cormorant text-5xl text-[var(--color-text)] tabular-nums">
                                            ${fmt(royaltyCalc.total)}
                                        </div>
                                        {royaltyCalc.capTriggered && (
                                            <span className="inline-block mt-2 px-2 py-0.5 rounded-[20px] text-xs bg-[var(--color-accent-gold)] text-[var(--color-bg-base)]">
                                                Capped at ${fmt(royalties.maxCap)}
                                            </span>
                                        )}
                                    </div>

                                    <div className="h-px bg-[var(--color-border)]" />

                                    <div className="font-cormorant flex flex-col gap-2 text-sm">
                                        {royaltyCalc.base > 0 && (
                                            <div className="flex justify-between">
                                                <span className="text-[var(--color-text-muted)]">Base rate</span>
                                                <span className="text-[var(--color-text)] tabular-nums">${fmt(royaltyCalc.base)}</span>
                                            </div>
                                        )}
                                        {royaltyCalc.perPerfSubtotal > 0 && (
                                            <div className="flex justify-between">
                                                <span className="text-[var(--color-text-muted)]">Per performance subtotal</span>
                                                <span className="text-[var(--color-text)] tabular-nums">${fmt(royaltyCalc.perPerfSubtotal)}</span>
                                            </div>
                                        )}
                                        {royaltyCalc.grossBasis > 0 && ['pct_gross','pct_min'].includes(ct) && (
                                            <div className="flex justify-between">
                                                <span className="text-[var(--color-text-muted)]">Ticket gross basis</span>
                                                <span className="text-[var(--color-text)] tabular-nums">${fmt(royaltyCalc.grossBasis)}</span>
                                            </div>
                                        )}
                                        {royaltyCalc.discountAmount > 0 && (
                                            <div className="flex justify-between">
                                                <span className="text-[var(--color-text-muted)]">Discount applied</span>
                                                <span className="text-accent-gold tabular-nums">-${fmt(royaltyCalc.discountAmount)}</span>
                                            </div>
                                        )}
                                        {royaltyCalc.subtotalBeforeCap > 0 && (royaltyCalc.capTriggered || royaltyCalc.discountAmount > 0) && (
                                            <>
                                                {royaltyCalc.capTriggered && <div className="h-px bg-[var(--color-border)]" />}
                                                <div className="flex justify-between">
                                                    <span className="text-[var(--color-text-muted)]">Subtotal</span>
                                                    <span className="text-[var(--color-text)] tabular-nums">${fmt(royaltyCalc.subtotalBeforeCap)}</span>
                                                </div>
                                            </>
                                        )}
                                        {royaltyCalc.capTriggered && (
                                            <div className="flex justify-between">
                                                <span className="text-[var(--color-text-muted)]">Cap adjustment</span>
                                                <span className="text-accent-crimson tabular-nums">-${fmt(royaltyCalc.capAdjustment)}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="h-px bg-[var(--color-border)]" />

                                    <p className="text-xs italic text-[var(--color-text-muted)]">{METHOD_NOTES[ct]}</p>

                                    {canEditBudget && (
                                        <div className="flex flex-col gap-2">
                                            <button
                                                type="button"
                                                disabled
                                                className="bg-accent-crimson px-4 py-3 rounded-[20px] font-medium opacity-60 cursor-default text-white"
                                            >
                                                Saved
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => saveRoyalties(ROYALTY_DEFAULTS)}
                                                className="bg-transparent border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] px-4 py-3 rounded-[20px]"
                                            >
                                                Reset to defaults
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })()}

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
                                <img src="assets/ghostlight/ghostlight-brand.png" alt="" style={{ position: 'absolute', right: '24px', bottom: '24px', height: '40px', objectFit: 'contain', opacity: 0.25, pointerEvents: 'none' }} />
                                <div style={{ marginBottom: '32px' }}>
                                    <img src="assets/ghostlight/ghostlight-brand.png" alt="GhostLight" style={{ height: '56px', objectFit: 'contain', marginBottom: '8px' }} />
                                    <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', margin: '0' }}>AI-powered tools for theatre professionals — coming soon</p>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px' }}>
                                    {features.map((feature, i) => (
                                        <div key={i} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '24px', position: 'relative' }}>
                                            <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--color-text-primary)', marginBottom: '8px', marginTop: '0', paddingRight: '32px' }}>{feature.title}</h3>
                                            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: '1.5', marginBottom: '16px', marginTop: '0' }}>{feature.desc}</p>
                                            <span style={{ display: 'inline-block', padding: '3px 10px', background: 'rgba(201,161,74,0.12)', border: '1px solid rgba(201,161,74,0.35)', borderRadius: '20px', fontSize: '11px', fontWeight: '500', color: 'var(--color-accent-gold)', letterSpacing: '0.5px' }}>Coming Soon</span>
                                            <img src="assets/ghostlight/ghostlight-brand.png" alt="" style={{ position: 'absolute', bottom: '10px', right: '10px', height: '28px', objectFit: 'contain', opacity: 0.25 }} />
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
