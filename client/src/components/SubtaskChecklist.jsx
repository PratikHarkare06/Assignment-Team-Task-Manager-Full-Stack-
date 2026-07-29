import { useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { CheckSquare, Plus, Trash2, Check } from 'lucide-react';

export default function SubtaskChecklist({ taskId, subtasks = [], onSubtasksChange }) {
  const [newTitle, setNewTitle] = useState('');
  const [adding, setAdding]     = useState(false);

  const completedCount = subtasks.filter(s => s.completed).length;
  const totalCount     = subtasks.length;
  const progressPct    = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const handleAddSubtask = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setAdding(true);
    try {
      const res = await api.post(`/tasks/${taskId}/subtasks`, { title: newTitle.trim() });
      if (res.data?.subtasks) {
        onSubtasksChange(res.data.subtasks);
        setNewTitle('');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add subtask');
    } finally {
      setAdding(false);
    }
  };

  const handleToggle = async (subtaskId, currentVal) => {
    // Optimistic UI update
    const updated = subtasks.map(s => s._id === subtaskId ? { ...s, completed: !currentVal } : s);
    onSubtasksChange(updated);

    try {
      const res = await api.put(`/tasks/${taskId}/subtasks/${subtaskId}`, { completed: !currentVal });
      if (res.data?.subtasks) {
        onSubtasksChange(res.data.subtasks);
      }
    } catch {
      toast.error('Failed to update subtask');
      // Revert if error
      onSubtasksChange(subtasks);
    }
  };

  const handleDelete = async (subtaskId) => {
    const updated = subtasks.filter(s => s._id !== subtaskId);
    onSubtasksChange(updated);

    try {
      const res = await api.delete(`/tasks/${taskId}/subtasks/${subtaskId}`);
      if (res.data?.subtasks) {
        onSubtasksChange(res.data.subtasks);
      }
    } catch {
      toast.error('Failed to delete subtask');
      onSubtasksChange(subtasks);
    }
  };

  return (
    <div>
      {/* Header & Progress */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{
          fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-3)',
          textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <CheckSquare size={13} /> Subtasks ({completedCount}/{totalCount})
        </div>
        {totalCount > 0 && (
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: progressPct === 100 ? '#22C55E' : 'var(--text-2)' }}>
            {progressPct}%
          </span>
        )}
      </div>

      {/* Progress Bar */}
      {totalCount > 0 && (
        <div className="progress-bar" style={{ marginBottom: 12 }}>
          <div
            className="progress-fill"
            style={{
              width: `${progressPct}%`,
              background: progressPct === 100 ? '#22C55E' : 'var(--accent)',
              transition: 'width 0.25s ease',
            }}
          />
        </div>
      )}

      {/* Subtasks List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
        {subtasks.map(item => (
          <div
            key={item._id}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '6px 10px', borderRadius: 8,
              background: 'var(--bg)', border: '1px solid var(--border)',
              transition: 'background 0.15s',
            }}
          >
            <button
              type="button"
              onClick={() => handleToggle(item._id, item.completed)}
              style={{
                width: 18, height: 18, borderRadius: 5,
                border: item.completed ? 'none' : '2px solid var(--text-3)',
                background: item.completed ? 'var(--accent)' : 'transparent',
                color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, transition: 'all 0.15s',
              }}
            >
              {item.completed && <Check size={12} strokeWidth={3} />}
            </button>

            <span style={{
              flex: 1, fontSize: '0.84rem', color: item.completed ? 'var(--text-3)' : 'var(--text-1)',
              textDecoration: item.completed ? 'line-through' : 'none',
            }}>
              {item.title}
            </span>

            <button
              type="button"
              onClick={() => handleDelete(item._id)}
              style={{
                background: 'none', border: 'none', color: 'var(--text-3)',
                cursor: 'pointer', padding: 2, borderRadius: 4, display: 'flex',
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.color = '#E5484D'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>

      {/* Add Subtask Form */}
      <form onSubmit={handleAddSubtask} style={{ display: 'flex', gap: 8 }}>
        <input
          type="text"
          placeholder="Add a subtask..."
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          disabled={adding}
          style={{
            flex: 1, padding: '6px 10px', borderRadius: 8,
            border: '1px solid var(--border)', background: 'var(--surface)',
            color: 'var(--text-1)', fontSize: '0.82rem', outline: 'none',
          }}
        />
        <button
          type="submit"
          disabled={adding || !newTitle.trim()}
          className="btn btn-secondary btn-sm"
          style={{ padding: '6px 10px', fontSize: '0.78rem' }}
        >
          <Plus size={13} /> Add
        </button>
      </form>
    </div>
  );
}
