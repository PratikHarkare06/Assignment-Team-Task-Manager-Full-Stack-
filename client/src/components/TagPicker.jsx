import { useState } from 'react';
import { Tag, Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';

const PRESET_TAGS = [
  { name: 'Bug',      color: '#E5484D' },
  { name: 'Feature',  color: '#6366F1' },
  { name: 'Design',   color: '#EC4899' },
  { name: 'DevOps',   color: '#F59E0B' },
  { name: 'Research', color: '#14B8A6' },
  { name: 'Backend',  color: '#8B5CF6' },
];

export default function TagPicker({ tags = [], onTagsChange }) {
  const [customName, setCustomName]   = useState('');
  const [selectedColor, setSelectedColor] = useState('#6366F1');
  const [showAdd, setShowAdd]         = useState(false);

  const handleAddPreset = (preset) => {
    if (tags.some(t => t.name.toLowerCase() === preset.name.toLowerCase())) {
      toast.error(`Tag "${preset.name}" already added`);
      return;
    }
    onTagsChange([...tags, preset]);
  };

  const handleAddCustom = (e) => {
    e.preventDefault();
    if (!customName.trim()) return;
    if (tags.some(t => t.name.toLowerCase() === customName.trim().toLowerCase())) {
      toast.error(`Tag "${customName.trim()}" already added`);
      return;
    }
    onTagsChange([...tags, { name: customName.trim(), color: selectedColor }]);
    setCustomName('');
    setShowAdd(false);
  };

  const handleRemove = (tagName) => {
    onTagsChange(tags.filter(t => t.name !== tagName));
  };

  return (
    <div>
      {/* Header */}
      <div style={{
        fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-3)',
        textTransform: 'uppercase', letterSpacing: '0.06em',
        marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <Tag size={13} /> Tags & Labels ({tags.length})
      </div>

      {/* Applied Tags List */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
        {tags.map(t => (
          <span
            key={t.name}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              background: (t.color || '#6366F1') + '20',
              color: t.color || '#6366F1',
              border: `1px solid ${t.color || '#6366F1'}40`,
              borderRadius: 6, padding: '2px 8px', fontSize: '0.75rem', fontWeight: 600,
            }}
          >
            {t.name}
            <button
              type="button"
              onClick={() => handleRemove(t.name)}
              style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, display: 'flex' }}
            >
              <X size={11} />
            </button>
          </span>
        ))}
        {tags.length === 0 && (
          <span style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>No tags added yet</span>
        )}
      </div>

      {/* Preset Badges & Custom Add */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
        {PRESET_TAGS.map(p => {
          const isAdded = tags.some(t => t.name.toLowerCase() === p.name.toLowerCase());
          return (
            <button
              key={p.name}
              type="button"
              disabled={isAdded}
              onClick={() => handleAddPreset(p)}
              style={{
                background: isAdded ? 'var(--bg)' : p.color + '15',
                color: isAdded ? 'var(--text-3)' : p.color,
                border: `1px dashed ${isAdded ? 'var(--border)' : p.color + '50'}`,
                borderRadius: 6, padding: '2px 8px', fontSize: '0.72rem', fontWeight: 600,
                cursor: isAdded ? 'default' : 'pointer', opacity: isAdded ? 0.5 : 1,
                transition: 'all 0.15s',
              }}
            >
              + {p.name}
            </button>
          );
        })}

        {!showAdd && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setShowAdd(true)}
            style={{ padding: '2px 6px', fontSize: '0.72rem' }}
          >
            <Plus size={12} /> Custom
          </button>
        )}
      </div>

      {/* Custom Tag Form */}
      {showAdd && (
        <form onSubmit={handleAddCustom} style={{ display: 'flex', gap: 6, marginTop: 8, alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Tag name..."
            value={customName}
            onChange={e => setCustomName(e.target.value)}
            style={{
              padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)',
              background: 'var(--surface)', color: 'var(--text-1)', fontSize: '0.78rem', outline: 'none',
              width: 120,
            }}
          />
          <input
            type="color"
            value={selectedColor}
            onChange={e => setSelectedColor(e.target.value)}
            style={{ width: 24, height: 24, border: 'none', background: 'none', cursor: 'pointer' }}
          />
          <button type="submit" className="btn btn-primary btn-sm" style={{ padding: '2px 8px', fontSize: '0.72rem' }}>Add</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowAdd(false)} style={{ padding: '2px 6px', fontSize: '0.72rem' }}>Cancel</button>
        </form>
      )}
    </div>
  );
}
