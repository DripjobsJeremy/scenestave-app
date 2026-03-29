const IMAGE_CATEGORIES = [
  { id: 'poster',      label: 'Poster' },
  { id: 'headshot',    label: 'Headshots' },
  { id: 'rehearsal',   label: 'Rehearsal' },
  { id: 'costume',     label: 'Costumes' },
  { id: 'set',         label: 'Set Design' },
  { id: 'props',       label: 'Props' },
  { id: 'lighting',    label: 'Lighting' },
  { id: 'production',  label: 'Production' },
  { id: 'promotional', label: 'Promotional' },
  { id: 'misc',        label: 'Misc' },
];

const normalizeImageUrl = (raw) => {
  if (!raw) return raw;
  const url = raw.trim();

  // Dropbox: strip dl param then append raw=1
  if (url.includes('dropbox.com')) {
    const stripped = url.replace(/([?&])dl=\d(&|$)/, (_, pre, post) => post ? pre : '').replace(/[?&]$/, '');
    return stripped + (stripped.includes('?') ? '&raw=1' : '?raw=1');
  }

  // Google Drive: /file/d/ID/view  →  uc?export=view&id=ID
  const driveFile = url.match(/drive\.google\.com\/file\/d\/([^/?#]+)/);
  if (driveFile) return `https://drive.google.com/uc?export=view&id=${driveFile[1]}`;

  // Google Drive: open?id=ID  →  uc?export=view&id=ID
  const driveOpen = url.match(/drive\.google\.com\/open\?id=([^&]+)/);
  if (driveOpen) return `https://drive.google.com/uc?export=view&id=${driveOpen[1]}`;

  return url;
};

function ProductionImagesManager({ production, onSave }) {
  const [images, setImages] = React.useState(() => production.images || []);
  const [filterCat, setFilterCat] = React.useState('all');
  const [urlInput, setUrlInput] = React.useState('');
  const [catInput, setCatInput] = React.useState('poster');
  const [labelInput, setLabelInput] = React.useState('');
  const [addError, setAddError] = React.useState('');

  const persistImages = (newImages) => {
    setImages(newImages);
    const prods = JSON.parse(localStorage.getItem('showsuite_productions') || '[]');
    const idx = prods.findIndex(p => p.id === production.id);
    if (idx >= 0) {
      prods[idx] = { ...prods[idx], images: newImages };
      localStorage.setItem('showsuite_productions', JSON.stringify(prods));
      if (onSave) onSave({ ...production, images: newImages });
    }
  };

  const handleAdd = () => {
    const raw = urlInput.trim();
    if (!raw) { setAddError('Please enter an image URL.'); return; }
    try { new URL(raw); } catch (_) { setAddError('Please enter a valid URL (must start with https://).'); return; }
    setAddError('');
    const url = normalizeImageUrl(raw);
    const newImg = {
      id: Date.now().toString(),
      url,
      category: catInput,
      label: labelInput.trim(),
      isPrimary: images.length === 0,
      addedAt: new Date().toISOString(),
    };
    persistImages([...images, newImg]);
    setUrlInput('');
    setLabelInput('');
  };

  const handleSetPrimary = (id) => {
    persistImages(images.map(img => ({ ...img, isPrimary: img.id === id })));
  };

  const handleRemove = (id) => {
    const filtered = images.filter(img => img.id !== id);
    if (filtered.length > 0 && !filtered.some(img => img.isPrimary)) {
      filtered[0] = { ...filtered[0], isPrimary: true };
    }
    persistImages(filtered);
  };

  const allWithAll = [{ id: 'all', label: 'All' }, ...IMAGE_CATEGORIES];
  const displayed = filterCat === 'all' ? images : images.filter(img => img.category === filterCat);
  const countFor = (catId) => catId === 'all' ? images.length : images.filter(img => img.category === catId).length;

  return (
    <div className="prod-images-wrap">
      <div className="prod-images-header">
        <h3 className="prod-images-title">Production Images</h3>
        <p className="prod-images-subtitle">Add image URLs for posters, headshots, rehearsal photos, and more.</p>
      </div>

      {/* Add image form */}
      <div className="prod-images-add-form">
        <div className="prod-images-add-row">
          <input
            type="url"
            className="prod-images-url-input"
            placeholder="https://example.com/image.jpg or a Dropbox / Google Drive share link"
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <select
            className="prod-images-cat-select"
            value={catInput}
            onChange={e => setCatInput(e.target.value)}
            aria-label="Image category"
          >
            {IMAGE_CATEGORIES.map(c => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
          <input
            type="text"
            className="prod-images-label-input"
            placeholder="Label (optional)"
            value={labelInput}
            onChange={e => setLabelInput(e.target.value)}
          />
          <button
            type="button"
            className="prod-images-add-btn"
            onClick={handleAdd}
          >
            + Add Image
          </button>
        </div>
        {addError && <p className="prod-images-add-error">{addError}</p>}
        {(() => {
          const isCloud = urlInput.includes('dropbox.com') || urlInput.includes('drive.google.com');
          if (!isCloud) return null;
          const converted = normalizeImageUrl(urlInput);
          const changed = converted !== urlInput.trim();
          return changed
            ? <p className="prod-images-url-hint prod-images-url-hint--ok">✓ URL will be auto-converted for direct image display</p>
            : <p className="prod-images-url-hint">Detected cloud link — converting to direct image URL…</p>;
        })()}
      </div>

      {/* Category filter chips */}
      <div className="prod-images-filters">
        {allWithAll.map(c => (
          <button
            key={c.id}
            type="button"
            className={'prod-images-chip' + (filterCat === c.id ? ' prod-images-chip--active' : '')}
            onClick={() => setFilterCat(c.id)}
          >
            {c.label}
            <span className="prod-images-chip-count">{countFor(c.id)}</span>
          </button>
        ))}
      </div>

      {/* Image grid */}
      {displayed.length === 0 ? (
        <div className="prod-images-empty">
          <p className="prod-images-empty-msg">
            No images{filterCat !== 'all' ? ` in "${IMAGE_CATEGORIES.find(c => c.id === filterCat)?.label}"` : ''} yet.
          </p>
          <p className="prod-images-empty-hint">Paste an image URL above and click Add Image.</p>
        </div>
      ) : (
        <div className="prod-images-grid">
          {displayed.map(img => (
            <div key={img.id} className={'prod-images-card' + (img.isPrimary ? ' prod-images-card--primary' : '')}>
              <div className="prod-images-thumb-wrap">
                <img
                  src={img.url}
                  alt={img.label || img.category}
                  className="prod-images-thumb"
                  onError={e => { e.currentTarget.style.display = 'none'; }}
                />
              </div>
              <div className="prod-images-card-body">
                <div className="prod-images-card-meta">
                  <span className="prod-images-cat-badge">
                    {IMAGE_CATEGORIES.find(c => c.id === img.category)?.label || img.category}
                  </span>
                  {img.isPrimary && <span className="prod-images-primary-badge">Primary</span>}
                </div>
                {img.label && <p className="prod-images-card-label">{img.label}</p>}
                <p className="prod-images-card-url" title={img.url}>{img.url}</p>
              </div>
              <div className="prod-images-card-actions">
                {!img.isPrimary && (
                  <button
                    type="button"
                    className="prod-images-action-btn prod-images-action-btn--star"
                    onClick={() => handleSetPrimary(img.id)}
                    title="Set as primary image"
                  >
                    Set Primary
                  </button>
                )}
                <button
                  type="button"
                  className="prod-images-action-btn prod-images-action-btn--remove"
                  onClick={() => handleRemove(img.id)}
                  title="Remove image"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

window.ProductionImagesManager = ProductionImagesManager;

console.log('✅ ProductionImagesManager component loaded');
