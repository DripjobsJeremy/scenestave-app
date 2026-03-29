const CueSheetBuilder = ({ production, userRole }) => {
  const [cueSheet, setCueSheet] = React.useState(() =>
    window.cueSheetService.loadCueSheet(production.id)
  );
  const [editingCue, setEditingCue] = React.useState(null);
  const [showAddForm, setShowAddForm] = React.useState(false);
  const [filterType, setFilterType] = React.useState('all');
  const [viewMode, setViewMode] = React.useState('scene'); // 'scene' | 'linear'

  // Calling Mode state
  const [callingMode, setCallingMode] = React.useState(false);
  const [currentCueIdx, setCurrentCueIdx] = React.useState(0);

  const CUE_TYPES = window.cueSheetService.CUE_TYPES;

  // Flatten nested acts[].scenes[] into a single array for lookups/selects
  const flatScenes = React.useMemo(() =>
    (production.acts || []).flatMap(act => (act.scenes || []).map(scene => ({
      ...scene,
      _actName: act.name || '',
    }))),
    [production.acts]
  );

  const canEdit = ['super_admin', 'venue_manager', 'admin', 'client_admin', 'director', 'stage_manager'].includes(userRole);

  // Auto-generate cues from scene data
  const handleAutoGenerate = () => {
    if (!window.confirm('This will replace auto-generated cues with fresh data from Scene Builder. Manually added cues are preserved. Continue?')) return;
    const generated = window.cueSheetService.generateCuesFromScenes(production);
    const manual = cueSheet.cues.filter(c => !c.autoFromScene);
    const merged = [...generated, ...manual].sort((a, b) => a.order - b.order);
    const updated = { ...cueSheet, cues: merged };
    window.cueSheetService.saveCueSheet(production.id, updated);
    setCueSheet(updated);
    if (window.showToast) window.showToast(`Generated ${generated.length} cues from Scene Builder`, 'success');
  };

  // Calling Mode: advance with status persistence
  const handleAdvance = () => {
    const sorted = [...cueSheet.cues].sort((a, b) => a.order - b.order);
    const calledCue = sorted[currentCueIdx];
    if (calledCue) {
      window.cueSheetService.updateCue(production.id, calledCue.id, { status: 'completed' });
    }
    const nextCue = sorted[currentCueIdx + 1];
    if (nextCue) {
      window.cueSheetService.updateCue(production.id, nextCue.id, { status: 'go' });
    }
    setCueSheet(window.cueSheetService.loadCueSheet(production.id));
    setCurrentCueIdx(i => Math.min(i + 1, sorted.length));
  };

  const handleBack = () => setCurrentCueIdx(i => Math.max(i - 1, 0));

  const handleEnterCallingMode = () => {
    const currentTheme = localStorage.getItem('scenestave_theme_mode') || 'dark';
    sessionStorage.setItem('scenestave_pre_call_theme', currentTheme);
    window.organizationService?.saveThemeMode?.('dark');
    setCallingMode(true);
    setCurrentCueIdx(0);
  };

  const handleExitCalling = () => {
    const previousTheme = sessionStorage.getItem('scenestave_pre_call_theme') || 'dark';
    window.organizationService?.saveThemeMode?.(previousTheme);
    sessionStorage.removeItem('scenestave_pre_call_theme');
    setCallingMode(false);
    setCurrentCueIdx(0);
  };

  // Group cues by scene for scene view
  const cuesByScene = React.useMemo(() => {
    const groups = {};
    const filtered = filterType === 'all' ? cueSheet.cues : cueSheet.cues.filter(c => c.type === filterType);
    filtered.forEach(cue => {
      const key = cue.sceneId || '__unassigned__';
      if (!groups[key]) groups[key] = [];
      groups[key].push(cue);
    });
    return groups;
  }, [cueSheet.cues, filterType]);

  const getSceneLabel = (sceneName) => {
    if (!sceneName || sceneName === '__unassigned__') return 'Unassigned Cues';
    const scene = flatScenes.find(s => s.name === sceneName);
    return scene ? `${scene._actName ? scene._actName + ' — ' : ''}${scene.name}` : sceneName;
  };

  const getCueTypeConfig = (typeId) => CUE_TYPES.find(t => t.id === typeId) || CUE_TYPES[CUE_TYPES.length - 1];

  // ─── CALLING SCREEN ────────────────────────────────────────────────────────

  const CallingScreen = ({ cues, currentIdx, onAdvance, onBack, onExit, onJumpTo }) => {
    const sorted = React.useMemo(() => [...cues].sort((a, b) => a.order - b.order), [cues]);

    const sceneOptions = React.useMemo(() =>
      (production.acts || []).flatMap(act =>
        (act.scenes || []).map(scene => ({
          label: `${act.name || 'Act'} — ${scene.name || 'Scene'}`,
          sceneKey: scene.name,
        }))
      ),
      [production.acts]
    );

    const getFirstCueIdxForScene = (sceneId) => {
      const idx = sorted.findIndex(c => c.sceneId === sceneId);
      return idx >= 0 ? idx : null;
    };

    // Brightness control — persisted across sessions, range 0.2–1.25
    const [brightness, setBrightness] = React.useState(() =>
      parseFloat(localStorage.getItem('scenestave_call_brightness') || '0.75')
    );
    const sliderRef = React.useRef(null);

    const handleBrightness = (val) => {
      setBrightness(val);
      localStorage.setItem('scenestave_call_brightness', String(val));
    };

    // Sync CSS variable to root — filter: brightness() on .cs-scroll reads this
    React.useEffect(() => {
      document.documentElement.style.setProperty('--call-brightness', String(brightness));
      return () => document.documentElement.style.removeProperty('--call-brightness');
    }, [brightness]);

    // Update slider fill gradient (normalized to 0.2–1.25 range)
    React.useEffect(() => {
      if (sliderRef.current) {
        const pct = ((brightness - 0.2) / (1.25 - 0.2)) * 100;
        sliderRef.current.style.background =
          `linear-gradient(to right, #34d399 ${pct}%, #333 ${pct}%)`;
      }
    }, [brightness]);

    const current = sorted[currentIdx];
    const prev2 = sorted[currentIdx - 2];
    const prev1 = sorted[currentIdx - 1];
    const next1 = sorted[currentIdx + 1];
    const next2 = sorted[currentIdx + 2];
    const next3 = sorted[currentIdx + 3];

    // Keyboard: Space/Enter/→ = GO, ← = back, Esc = exit
    React.useEffect(() => {
      const handleKey = (e) => {
        if (e.code === 'Space' || e.code === 'ArrowRight' || e.code === 'Enter') {
          e.preventDefault();
          onAdvance();
        } else if (e.code === 'ArrowLeft') {
          e.preventDefault();
          onBack();
        } else if (e.code === 'Escape') {
          onExit();
        }
      };
      window.addEventListener('keydown', handleKey);
      return () => window.removeEventListener('keydown', handleKey);
    }, [onAdvance, onBack, onExit]);

    // Cue type label lookup (uses service data, colors in CSS via data-cue-type)
    const getCueLabel = (typeId) => getCueTypeConfig(typeId).label;

    // Scene label traverses production.acts[].scenes[]
    const getSceneContext = (sceneName) => {
      if (!sceneName) return null;
      for (const act of (production.acts || [])) {
        for (const scene of (act.scenes || [])) {
          if (scene.name === sceneName) {
            return act.name ? `${act.name} — ${scene.name}` : scene.name;
          }
        }
      }
      return sceneName;
    };

    // Dark type badge — colors driven by CSS .cs-dark-badge[data-cue-type]
    const DarkBadge = ({ type, number }) => (
      <div className="cs-dark-badge-wrap">
        <div className="cs-dark-badge" data-cue-type={type}>
          {getCueLabel(type)}
        </div>
        {number && (
          <div className="cs-dark-badge-num" data-cue-type={type}>{number}</div>
        )}
      </div>
    );

    // ── Show Complete ──────────────────────────────────────────────────────────
    if (!current) {
      return (
        <div className="cs-complete">
          <div className="cs-complete-icon">🎭</div>
          <div className="cs-complete-title">Show Complete</div>
          <div className="cs-complete-count">All {cues.length} cues called</div>
          <div className="cs-complete-sub">Excellent work tonight.</div>
          <button type="button" onClick={onExit} className="cs-btn-exit-complete">
            Exit Calling Mode
          </button>
        </div>
      );
    }

    return (
      <div className="cs-screen">

        {/* ── Header ──────────────────────────────────────────────────────────── */}
        <div className="cs-header">
          <div>
            <div className="cs-header-title">{production.title ?? 'Untitled Production'}</div>
            <div className="cs-header-sub">{getSceneContext(current.sceneId) ?? 'General'}</div>
          </div>
          <div className="cs-header-actions">
            <div className="cs-live-badge">LIVE</div>
            <div className="cs-counter">{currentIdx + 1} / {sorted.length}</div>
            <button type="button" onClick={onExit} className="cs-btn-exit">Exit</button>
            <div className="cs-brightness-control">
              <span className="cs-brightness-icon">☀</span>
              <input
                type="range"
                min="0.2"
                max="1.25"
                step="0.05"
                value={brightness}
                ref={sliderRef}
                onChange={e => handleBrightness(parseFloat(e.target.value))}
                title="Adjust screen brightness"
                className="cs-brightness-slider"
              />
              <span className="cs-brightness-icon cs-brightness-icon--dim">☾</span>
            </div>
          </div>
        </div>

        {/* ── Cue scroll area ─────────────────────────────────────────────────── */}
        <div className="cs-scroll">

          {/* Completed −2 */}
          {prev2 && (
            <div className="cs-cue-row cs-cue-row--prev2">
              <DarkBadge type={prev2.type} number={prev2.number} />
              <div className="cs-prev-desc">{prev2.description || '—'}</div>
            </div>
          )}

          {/* Completed −1 */}
          {prev1 && (
            <div className="cs-cue-row cs-cue-row--prev1">
              <DarkBadge type={prev1.type} number={prev1.number} />
              <div className="cs-prev-desc">{prev1.description || '—'}</div>
            </div>
          )}

          {/* Separator between completed and current */}
          {(prev1 || prev2) && <div className="cs-completed-divider" />}

          {/* Standby bar */}
          {current.triggerLine && (
            <div className="cs-standby-bar">
              <div className="cs-standby-row">
                <span className="cs-standby-keyword">STANDBY</span>
                <span className="cs-standby-cue-id">
                  {getCueLabel(current.type)}{current.number ? ' ' + current.number : ''}
                </span>
              </div>
              <div className="cs-standby-trigger">"{current.triggerLine}"</div>
            </div>
          )}

          {/* ── CURRENT CUE — GO box ──────────────────────────────────────────── */}
          <div className="cs-current-cue" data-cue-type={current.type}>
            <div className="cs-current-badge-col">
              <DarkBadge type={current.type} number={current.number} />
            </div>
            <div className="cs-current-body">
              <div className="cs-current-desc">{current.description || 'No description'}</div>
              {current.notes && <div className="cs-current-notes">{current.notes}</div>}
            </div>
            {/* GO button — cs-current-cue has no filter rule so this stays fully bright */}
            <button
              type="button"
              onClick={onAdvance}
              className="cs-go-btn"
              aria-label="GO — advance to next cue"
            >
              GO
            </button>
          </div>

          {/* Next cues */}
          {[[next1, 'cs-cue-row--next1', 'NEXT'], [next2, 'cs-cue-row--next2', '+2'], [next3, 'cs-cue-row--next3', '+3']].map(([cue, cls, lbl]) =>
            cue ? (
              <div key={cue.id} className={`cs-cue-row ${cls}`}>
                <DarkBadge type={cue.type} number={cue.number} />
                <div className="cs-next-body">
                  {cue.triggerLine && <div className="cs-next-trigger">"{cue.triggerLine}"</div>}
                  <div className="cs-next-desc">{cue.description || '—'}</div>
                </div>
                <span className="cs-next-label">{lbl}</span>
              </div>
            ) : null
          )}
        </div>

        {/* ── Footer ──────────────────────────────────────────────────────────── */}
        <div className="cs-footer">
          <button
            type="button"
            onClick={onBack}
            disabled={currentIdx === 0}
            className="cs-btn-nav"
            aria-label="Previous cue"
          >
            ◄ PREV
          </button>
          <select
            title="Jump to scene"
            value=""
            onChange={e => {
              const idx = getFirstCueIdxForScene(e.target.value);
              if (idx !== null) onJumpTo(idx);
            }}
            className="cs-jump-select"
          >
            <option value="">⏭ Jump to scene...</option>
            {sceneOptions.map(s => (
              <option key={s.sceneKey} value={s.sceneKey}>{s.label}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={onAdvance}
            className="cs-btn-nav"
            aria-label="Advance to next cue"
          >
            NEXT ►
          </button>
        </div>
      </div>
    );
  };

  // ─── CALLING MODE: early return ────────────────────────────────────────────
  if (callingMode) {
    return (
      <div className="cs-calling-wrapper">
        <CallingScreen
          cues={cueSheet.cues}
          currentIdx={currentCueIdx}
          onAdvance={handleAdvance}
          onBack={handleBack}
          onExit={handleExitCalling}
          onJumpTo={(idx) => setCurrentCueIdx(idx)}
        />
      </div>
    );
  }

  // ─── BUILD MODE ────────────────────────────────────────────────────────────

  // Cue row — colors via data-cue-type, no inline styles
  const CueRow = ({ cue }) => {
    const typeConfig = getCueTypeConfig(cue.type);
    const rowNeedsReview = cue.autoFromScene && (!cue.triggerLine || !cue.number);
    return (
      <div className="cue-row">
        <div className="cue-row-badge-col">
          <div className="cue-type-badge" data-cue-type={cue.type}>
            {typeConfig.icon} {typeConfig.label}
          </div>
          {cue.number && (
            <div className="cue-type-num" data-cue-type={cue.type}>{cue.number}</div>
          )}
        </div>
        <div className="cue-row-body">
          {cue.triggerLine && (
            <div className="cue-row-trigger">"{cue.triggerLine}"</div>
          )}
          <div className="cue-row-desc">
            {cue.description || <span className="cue-row-desc--empty">No description</span>}
          </div>
          {rowNeedsReview && (
            <div className="cue-needs-review">⚠ Needs review — add cue number and trigger line</div>
          )}
          {cue.notes && <div className="cue-row-meta">📝 {cue.notes}</div>}
          {cue.autoFromScene && <div className="cue-row-meta">↗ Auto from Scene Builder</div>}
          {cue.status === 'completed' && <div className="cue-row-called">✓ Called</div>}
        </div>
        {canEdit && (
          <div className="cue-row-actions">
            <button
              type="button"
              onClick={() => setEditingCue(cue)}
              className="cue-row-btn-edit"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => {
                if (!window.confirm('Delete this cue?')) return;
                window.cueSheetService.deleteCue(production.id, cue.id);
                setCueSheet(window.cueSheetService.loadCueSheet(production.id));
              }}
              className="cue-row-btn-delete"
            >
              ×
            </button>
          </div>
        )}
      </div>
    );
  };

  // Add/Edit cue form
  const CueForm = ({ cue, onSave, onCancel }) => {
    const [form, setForm] = React.useState(cue || window.cueSheetService.newCue({ sceneId: null }));
    return (
      <div className="rounded-lg p-4 mb-4 bg-elevated cue-form-wrap">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium mb-1 block text-muted-color">Cue Type</label>
            <select title="Cue Type" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
              className="w-full px-3 py-2 rounded-lg text-sm bg-surface border-theme text-primary-color">
              {CUE_TYPES.map(t => <option key={t.id} value={t.id}>{t.icon} {t.label} — {t.id}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block text-muted-color">Cue Number</label>
            <input value={form.number} onChange={e => setForm({ ...form, number: e.target.value })}
              placeholder="e.g. LQ 45"
              className="w-full px-3 py-2 rounded-lg text-sm bg-surface border-theme text-primary-color" />
          </div>
          <div className="col-span-2">
            <label className="text-xs font-medium mb-1 block text-muted-color">Trigger Line (what SM listens for)</label>
            <input value={form.triggerLine} onChange={e => setForm({ ...form, triggerLine: e.target.value })}
              placeholder="e.g. As Michael exits stage right..."
              className="w-full px-3 py-2 rounded-lg text-sm bg-surface border-theme text-primary-color" />
          </div>
          <div className="col-span-2">
            <label className="text-xs font-medium mb-1 block text-muted-color">Description</label>
            <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="What happens when this cue fires"
              className="w-full px-3 py-2 rounded-lg text-sm bg-surface border-theme text-primary-color" />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block text-muted-color">Scene</label>
            <select title="Scene" value={form.sceneId || ''} onChange={e => setForm({ ...form, sceneId: e.target.value || null })}
              className="w-full px-3 py-2 rounded-lg text-sm bg-surface border-theme text-primary-color">
              <option value="">— Unassigned —</option>
              {flatScenes.map(s => (
                <option key={s.name} value={s.name}>
                  {s._actName ? s._actName + ' — ' : ''}{s.name || 'Untitled'}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block text-muted-color">Duration (seconds, optional)</label>
            <input type="number" value={form.duration || ''} onChange={e => setForm({ ...form, duration: e.target.value ? parseInt(e.target.value) : null })}
              placeholder="e.g. 5"
              className="w-full px-3 py-2 rounded-lg text-sm bg-surface border-theme text-primary-color" />
          </div>
          <div className="col-span-2">
            <label className="text-xs font-medium mb-1 block text-muted-color">SM Notes (private)</label>
            <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
              placeholder="Private SM notes"
              className="w-full px-3 py-2 rounded-lg text-sm bg-surface border-theme text-primary-color" />
          </div>
        </div>
        <div className="flex gap-2 mt-3 justify-end">
          <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg text-sm btn-secondary">Cancel</button>
          <button type="button" onClick={() => onSave(form)} className="px-4 py-2 rounded-lg text-sm btn-primary">
            {cue ? 'Save Changes' : 'Add Cue'}
          </button>
        </div>
      </div>
    );
  };

  const needsReview = cueSheet.cues.filter(c => c.autoFromScene && (!c.triggerLine || !c.number)).length;
  const unassigned = cueSheet.cues.filter(c => !c.sceneId).length;
  const total = cueSheet.cues.length;

  return (
    <div className="bg-base min-h-full p-6">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-primary-color">
            📋 Cue Sheet — {production.title ?? 'Untitled'}
          </h2>
          <p className="text-sm mt-1 text-muted-color">
            {total} cues
            {needsReview > 0 && (
              <span className="cue-header-warn">· ⚠ {needsReview} need review</span>
            )}
            {unassigned > 0 && (
              <span className="cue-header-muted">· {unassigned} unassigned</span>
            )}
            {needsReview === 0 && unassigned === 0 && total > 0 && (
              <span className="cue-header-ready">· ✓ Ready to call</span>
            )}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end items-center">
          <div className="view-toggle">
            <button type="button" className={`view-toggle-btn ${viewMode === 'scene' ? 'active' : ''}`} onClick={() => setViewMode('scene')}>
              By Scene
            </button>
            <button type="button" className={`view-toggle-btn ${viewMode === 'linear' ? 'active' : ''}`} onClick={() => setViewMode('linear')}>
              Linear
            </button>
          </div>
          {canEdit && (
            <>
              <button type="button" onClick={handleAutoGenerate} className="px-3 py-2 rounded-lg text-sm btn-secondary">
                ↗ Import
              </button>
              <button type="button" onClick={() => setShowAddForm(true)} className="px-3 py-2 rounded-lg text-sm btn-primary">
                + Add Cue
              </button>
            </>
          )}
          {cueSheet.cues.length > 0 && (
            <>
              <div className="cue-call-divider" />
              <button
                type="button"
                onClick={handleEnterCallingMode}
                className="btn-call-show"
              >
                ▶ Call Show
              </button>
            </>
          )}
        </div>
      </div>

      {/* Type filter chips */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          type="button"
          onClick={() => setFilterType('all')}
          className="cue-filter-chip cue-filter-chip--all"
          data-active={filterType === 'all' ? 'true' : 'false'}
        >
          All ({cueSheet.cues.length})
        </button>
        {CUE_TYPES.map(t => {
          const count = cueSheet.cues.filter(c => c.type === t.id).length;
          if (count === 0) return null;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setFilterType(t.id)}
              className="cue-filter-chip"
              data-cue-type={t.id}
              data-active={filterType === t.id ? 'true' : 'false'}
            >
              {t.icon} {t.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Add form */}
      {showAddForm && (
        <CueForm
          onSave={(form) => {
            window.cueSheetService.addCue(production.id, form);
            setCueSheet(window.cueSheetService.loadCueSheet(production.id));
            setShowAddForm(false);
            if (window.showToast) window.showToast('Cue added', 'success');
          }}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {/* Edit form */}
      {editingCue && (
        <CueForm
          cue={editingCue}
          onSave={(form) => {
            window.cueSheetService.updateCue(production.id, form.id, form);
            setCueSheet(window.cueSheetService.loadCueSheet(production.id));
            setEditingCue(null);
            if (window.showToast) window.showToast('Cue updated', 'success');
          }}
          onCancel={() => setEditingCue(null)}
        />
      )}

      {/* Empty state */}
      {cueSheet.cues.length === 0 && (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">📋</div>
          <p className="text-lg font-semibold mb-2 cue-empty-text">Build your cue sheet</p>
          <p className="text-sm mb-6 cue-empty-sub">
            Import lighting, sound, and entrance cues automatically from Scene Builder — then add fly, deck, and spot cues manually.
          </p>
          {canEdit && (
            <div className="flex flex-col items-center gap-3">
              <button type="button" onClick={handleAutoGenerate} className="px-5 py-2.5 rounded-lg btn-primary font-medium">
                ↗ Import from Scene Builder
              </button>
              <button type="button" onClick={() => setShowAddForm(true)} className="px-4 py-2 rounded-lg btn-secondary text-sm">
                + Add Cue Manually
              </button>
              <p className="text-xs cue-header-muted mt-1">You can edit all imported cues after importing</p>
            </div>
          )}
        </div>
      )}

      {/* Scene view */}
      {viewMode === 'scene' && cueSheet.cues.length > 0 && (
        <div className="space-y-6">
          {(production.acts || []).map(act =>
            (act.scenes || []).map(scene => {
              const sceneCues = cueSheet.cues.filter(c => c.sceneId === scene.name &&
                (filterType === 'all' || c.type === filterType));
              if (sceneCues.length === 0) return null;
              return (
                <div key={scene.name}>
                  <div className="flex items-center gap-2 mb-2">
                    {act.name && <span className="cue-act-label">{act.name}</span>}
                    <span className="cue-scene-title">{scene.name || 'Untitled Scene'}</span>
                    {scene.hazards && <span className="cue-scene-hazard">⚠️ {scene.hazards}</span>}
                    <span className="cue-scene-count">({sceneCues.length} cues)</span>
                  </div>
                  {sceneCues.sort((a, b) => a.order - b.order).map(cue => <CueRow key={cue.id} cue={cue} />)}
                  {canEdit && (
                    <button type="button" onClick={() => setShowAddForm(true)} className="cue-add-dashed">
                      + Add cue to this scene
                    </button>
                  )}
                </div>
              );
            })
          )}
          {cuesByScene['__unassigned__']?.length > 0 && (
            <div>
              <div className="cue-unassigned-label">Unassigned Cues</div>
              {cuesByScene['__unassigned__'].map(cue => <CueRow key={cue.id} cue={cue} />)}
            </div>
          )}
        </div>
      )}

      {/* Linear view */}
      {viewMode === 'linear' && cueSheet.cues.length > 0 && (() => {
        const sorted = [...cueSheet.cues]
          .filter(c => filterType === 'all' || c.type === filterType)
          .sort((a, b) => a.order - b.order);
        return (
          <div className="space-y-1">
            {sorted.map((cue, idx) => (
              <div key={cue.id}>
                {(idx === 0 || cue.sceneId !== sorted[idx - 1]?.sceneId) && (
                  <div className={`cue-linear-break${idx === 0 ? ' cue-linear-break--first' : ''}`}>
                    {getSceneLabel(cue.sceneId)}
                  </div>
                )}
                <CueRow cue={cue} />
              </div>
            ))}
          </div>
        );
      })()}
    </div>
  );
};

window.CueSheetBuilder = CueSheetBuilder;

console.log('✅ CueSheetBuilder loaded');
