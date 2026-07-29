import React, { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Users, UserPlus, Trash2, X, Check } from 'lucide-react';

export default function ProjectMembersModal({ project, onMembersUpdated, onClose }) {
  const [allUsers, setAllUsers] = useState([]);
  const [selectedIds, setSelectedIds] = useState((project.members || []).map(m => typeof m === 'object' ? m._id : m));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/users').then(res => {
      if (res.data?.users) setAllUsers(res.data.users);
    }).catch(() => {});
  }, []);

  const toggleUser = (userId) => {
    setSelectedIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.put(`/projects/${project._id}`, { members: selectedIds });
      if (res.data?.success) {
        toast.success('Project members updated!');
        onMembersUpdated?.();
        onClose();
      }
    } catch {
      toast.error('Failed to update members');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={18} /> Manage Project Members
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="modal-body">
          <div style={{ fontSize: '0.8rem', color: 'var(--text-3)', marginBottom: 14 }}>
            Select team members who have access to <strong>{project.name || project.title}</strong>:
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 280, overflowY: 'auto' }}>
            {allUsers.map(u => {
              const isSelected = selectedIds.includes(u._id);
              return (
                <div
                  key={u._id}
                  onClick={() => toggleUser(u._id)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 12px', borderRadius: 8,
                    background: isSelected ? 'var(--accent)10' : 'var(--bg)',
                    border: `1px solid ${isSelected ? 'var(--accent)40' : 'var(--border)'}`,
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', background: 'var(--accent)',
                      color: 'white', fontSize: '0.65rem', fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {(u.name || u.email || 'U').slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-1)' }}>{u.name || 'User'}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>{u.email}</div>
                    </div>
                  </div>
                  <div style={{
                    width: 20, height: 20, borderRadius: '50%',
                    background: isSelected ? 'var(--accent)' : 'transparent',
                    border: `2px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
                  }}>
                    {isSelected && <Check size={12} strokeWidth={3} />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Members'}
          </button>
        </div>
      </div>
    </div>
  );
}
