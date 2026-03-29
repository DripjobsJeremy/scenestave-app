const CueSheetBuilder = ({ production, userRole }) => {
  const [cueSheet, setCueSheet] = React.useState(() =>
    window.cueSheetService.loadCueSheet(production.id)
  );
  const [editingCue, setEditingCue] = React.useState(null);
  const [showAddForm, setShowAddForm] = React.useState(false);
  const [filterType, setFilterType] = React.useState('all');
  const [viewMode, setViewMode] = React.useState('scene'); // 'scene' | 'linear'

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

  // Group cues by scene for scene view
  const cuesByScene = React.useMemo(() => {
    const groups = {};
    const filteredCues = filterType === 'all' ? cueSheet.cues : cueSheet.cues.filter(c => c.type === filterType);
    filteredCues.forEach(cue => {
      const key = cue.sceneId || '__unassigned__';
      if (!groups[key]) groups[key] = [];
      groups[key].push(cue);
    });
    return groups;
  }, [cueSheet.cues, filterType]);

  const getSceneLabel = (sceneId) => {
    if (sceneId === '__unassigned__') return 'Unassigned Cues';
    const scene = flatScenes.find(s => s.id === sceneId);
    return scene ? `${scene._actName ? scene._actName + ' — ' : ''}${scene.sceneLabel || scene.title || 'Untitled Scene'}` : 'Unknown Scene';
  };

  const getCueTypeConfig = (typeId) => CUE_TYPES.find(t => t.id === typeId) || CUE_TYPES[CUE_TYPES.length - 1];

  // Render a single cue row
  const CueRow = ({ cue }) => {
    const typeConfig = getCueTypeConfig(cue.type);
    return (
      <div
        className="flex items-start gap-3 px-4 py-3 rounded-lg transition-colors"
        style={{ backgroundColor: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', marginBottom: '4px' }}
      >
        {/* Type badge */}
        <div className="flex-shrink-0 text-center" style={{ minWidth: '52px' }}>
          <div className="text-xs font-bold px-2 py-1 rounded"
            style={{ backgroundColor: typeConfig.color + '22', color: typeConfig.color, border: `1px solid ${typeConfig.color}44` }}>
            {typeConfig.icon} {typeConfig.label}
          </div>
          {cue.number && (
            <div className="text-xs mt-1 font-mono font-semibold" style={{ color: typeConfig.color }}>
              {cue.number}
            </div>
          )}
        </div>

        {/* Cue details */}
        <div className="flex-1 min-w-0">
          {cue.triggerLine && (
            <div className="text-xs italic mb-1" style={{ color: 'var(--color-text-muted)' }}>
              "{cue.triggerLine}"
            </div>
          )}
          <div className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
            {cue.description || <span style={{ color: 'var(--color-text-muted)' }}>No description</span>}
          </div>
          {cue.notes && (
            <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
              📝 {cue.notes}
            </div>
          )}
          {cue.autoFromScene && (
            <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
              ↗ Auto from Scene Builder
            </div>
          )}
        </div>

        {/* Actions */}
        {canEdit && (
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={() => setEditingCue(cue)}
              className="text-xs px-2 py-1 rounded"
              style={{ backgroundColor: 'var(--color-bg-elevated)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
            >
              Edit
            </button>
            <button
              onClick={() => {
                if (!window.confirm('Delete this cue?')) return;
                window.cueSheetService.deleteCue(production.id, cue.id);
                setCueSheet(window.cueSheetService.loadCueSheet(production.id));
              }}
              className="text-xs px-2 py-1 rounded"
              style={{ backgroundColor: 'var(--color-danger-surface)', color: 'var(--color-danger)', border: '1px solid var(--color-danger)' }}
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
      <div className="rounded-lg p-4 mb-4" style={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-primary)' }}>
        <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Cue Type</label>
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{ backgroundColor: 'var(--color-bg-surface)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }}>
              {CUE_TYPES.map(t => <option key={t.id} value={t.id}>{t.icon} {t.label} — {t.id}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Cue Number</label>
            <input value={form.number} onChange={e => setForm({ ...form, number: e.target.value })}
              placeholder="e.g. LQ 45"
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{ backgroundColor: 'var(--color-bg-surface)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Trigger Line (what SM listens for)</label>
            <input value={form.triggerLine} onChange={e => setForm({ ...form, triggerLine: e.target.value })}
              placeholder="e.g. As Michael exits stage right..."
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{ backgroundColor: 'var(--color-bg-surface)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Description</label>
            <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="What happens when this cue fires"
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{ backgroundColor: 'var(--color-bg-surface)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }} />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Scene</label>
            <select value={form.sceneId || ''} onChange={e => setForm({ ...form, sceneId: e.target.value || null })}
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{ backgroundColor: 'var(--color-bg-surface)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }}>
              <option value="">— Unassigned —</option>
              {flatScenes.map(s => (
                <option key={s.id} value={s.id}>
                  {s._actName ? s._actName + ' — ' : ''}{s.sceneLabel || s.title || 'Untitled'}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Duration (seconds, optional)</label>
            <input type="number" value={form.duration || ''} onChange={e => setForm({ ...form, duration: e.target.value ? parseInt(e.target.value) : null })}
              placeholder="e.g. 5"
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{ backgroundColor: 'var(--color-bg-surface)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>SM Notes (private)</label>
            <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
              placeholder="Private SM notes"
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{ backgroundColor: 'var(--color-bg-surface)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }} />
          </div>
        </div>
        <div className="flex gap-2 mt-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg text-sm btn-secondary">Cancel</button>
          <button onClick={() => onSave(form)} className="px-4 py-2 rounded-lg text-sm btn-primary">
            {cue ? 'Save Changes' : 'Add Cue'}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div style={{ backgroundColor: 'var(--color-bg-base)', minHeight: '100%', padding: '1.5rem' }}>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            📋 Cue Sheet — {production.title}
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            {cueSheet.cues.length} cues · Build mode
          </p>
        </div>
        <div className="flex gap-2">
          {/* View toggle */}
          <div className="view-toggle">
            <button className={`view-toggle-btn ${viewMode === 'scene' ? 'active' : ''}`} onClick={() => setViewMode('scene')}>
              By Scene
            </button>
            <button className={`view-toggle-btn ${viewMode === 'linear' ? 'active' : ''}`} onClick={() => setViewMode('linear')}>
              Linear
            </button>
          </div>
          {canEdit && (
            <>
              <button onClick={handleAutoGenerate} className="px-3 py-2 rounded-lg text-sm btn-secondary">
                ↗ Import from Scene Builder
              </button>
              <button onClick={() => setShowAddForm(true)} className="px-3 py-2 rounded-lg text-sm btn-primary">
                + Add Cue
              </button>
            </>
          )}
        </div>
      </div>

      {/* Type filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setFilterType('all')}
          className="text-xs px-3 py-1.5 rounded-full font-medium transition-colors"
          style={{ backgroundColor: filterType === 'all' ? 'var(--color-primary)' : 'var(--color-bg-elevated)', color: filterType === 'all' ? '#fff' : 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
        >All ({cueSheet.cues.length})</button>
        {CUE_TYPES.map(t => {
          const count = cueSheet.cues.filter(c => c.type === t.id).length;
          if (count === 0) return null;
          return (
            <button key={t.id}
              onClick={() => setFilterType(t.id)}
              className="text-xs px-3 py-1.5 rounded-full font-medium transition-colors"
              style={{ backgroundColor: filterType === t.id ? t.color : 'var(--color-bg-elevated)', color: filterType === t.id ? '#fff' : 'var(--color-text-secondary)', border: `1px solid ${filterType === t.id ? t.color : 'var(--color-border)'}` }}
            >{t.icon} {t.label} ({count})</button>
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
          <p className="text-lg font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>No cues yet</p>
          <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
            Import cues from Scene Builder to get started, or add cues manually
          </p>
          {canEdit && (
            <div className="flex gap-3 justify-center">
              <button onClick={handleAutoGenerate} className="px-4 py-2 rounded-lg btn-secondary">
                ↗ Import from Scene Builder
              </button>
              <button onClick={() => setShowAddForm(true)} className="px-4 py-2 rounded-lg btn-primary">
                + Add First Cue
              </button>
            </div>
          )}
        </div>
      )}

      {/* Scene view */}
      {viewMode === 'scene' && cueSheet.cues.length > 0 && (
        <div className="space-y-6">
          {(production.acts || []).map((act, actIdx) =>
            (act.scenes || []).map(scene => {
              const sceneCues = cueSheet.cues.filter(c => c.sceneId === scene.id &&
                (filterType === 'all' || c.type === filterType));
              if (sceneCues.length === 0) return null;
              return (
                <div key={scene.id}>
                  <div className="flex items-center gap-2 mb-2">
                    {act.name && (
                      <span className="text-xs font-semibold uppercase tracking-wide px-2 py-1 rounded"
                        style={{ backgroundColor: 'var(--color-primary-surface)', color: 'var(--color-primary)' }}>
                        {act.name}
                      </span>
                    )}
                    <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                      {scene.sceneLabel || scene.title || 'Untitled Scene'}
                    </span>
                    {scene.hazards && <span className="text-xs" style={{ color: 'var(--color-warning)' }}>⚠️ {scene.hazards}</span>}
                    <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>({sceneCues.length} cues)</span>
                  </div>
                  {sceneCues.sort((a, b) => a.order - b.order).map(cue => <CueRow key={cue.id} cue={cue} />)}
                  {canEdit && (
                    <button
                      onClick={() => setShowAddForm(true)}
                      className="text-xs mt-1 px-3 py-1 rounded"
                      style={{ color: 'var(--color-text-muted)', backgroundColor: 'transparent', border: '1px dashed var(--color-border)' }}
                    >+ Add cue to this scene</button>
                  )}
                </div>
              );
            })
          )}
          {/* Unassigned cues */}
          {cuesByScene['__unassigned__']?.length > 0 && (
            <div>
              <div className="font-semibold mb-2" style={{ color: 'var(--color-text-muted)' }}>Unassigned Cues</div>
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
                {/* Scene break label */}
                {(idx === 0 || cue.sceneId !== sorted[idx - 1]?.sceneId) && (
                  <div className="text-xs font-semibold uppercase tracking-wide pt-3 pb-1"
                    style={{ color: 'var(--color-text-muted)', borderTop: idx > 0 ? '1px solid var(--color-border)' : 'none' }}>
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
