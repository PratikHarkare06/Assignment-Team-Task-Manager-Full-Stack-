import { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateTask } from '../redux/slices/tasksSlice';
import CommentsThread from './CommentsThread';
import AttachmentsPanel from './AttachmentsPanel';
import ActivityLog from './ActivityLog';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
  X, Calendar, User, Flag, Folder, Clock,
  CheckCircle2, Circle, AlertCircle, Ban,
  Edit3, Check,
} from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'todo',        label: 'Todo',        color: '#6B7280', icon: Circle },
  { value: 'in-progress', label: 'In Progress', color: '#3B82F6', icon: Clock },
  { value: 'completed',   label: 'Completed',   color: '#22C55E', icon: CheckCircle2 },
  { value: 'blocked',     label: 'Blocked',     color: '#E5484D', icon: Ban },
];

const PRIORITY_OPTIONS = [
  { value: 'low',      label: 'Low',      color: '#22C55E' },
  { value: 'medium',   label: 'Medium',   color: '#F59E0B' },
  { value: 'high',     label: 'High',     color: '#E5484D' },
  { value: 'critical', label: 'Critical', color: '#7C3AED' },
];

function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function isOverdue(task) {
  return task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';
}

export default function TaskDrawer({ taskId, onClose }) {
  const dispatch = useDispatch();
  const { user } = useSelector(s => s.auth);
  const taskFromStore = useSelector(s => s.tasks.list.find(t => t._id === taskId));

  const [task, setTask] = useState(taskFromStore || null);
  const [loading, setLoading] = useState(!taskFromStore);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState('');
  const [saving, setSaving] = useState(false);
  // Local attachment + activity state (populated from full GET)
  const [attachments, setAttachments]   = useState([]);
  const [activityLog, setActivityLog]   = useState([]);

  // Fetch full task detail (with comments populated)
  useEffect(() => {
    if (!taskId) return;
    setLoading(true);
    api.get(`/tasks/${taskId}`)
      .then(res => {
        if (res.data?.task) {
          setTask(res.data.task);
          setAttachments(res.data.task.attachments || []);
          setActivityLog(res.data.task.activityLog || []);
        }
      })
      .catch(() => toast.error('Failed to load task details'))
      .finally(() => setLoading(false));
  }, [taskId]);

  // Close on Escape key
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleStatusChange = async (newStatus) => {
    try {
      const result = await dispatch(updateTask({ id: task._id, data: { status: newStatus } })).unwrap();
      setTask(t => ({ ...t, status: newStatus }));
    } catch { toast.error('Failed to update status'); }
  };

  const handlePriorityChange = async (newPriority) => {
    try {
      await dispatch(updateTask({ id: task._id, data: { priority: newPriority } })).unwrap();
      setTask(t => ({ ...t, priority: newPriority }));
    } catch { toast.error('Failed to update priority'); }
  };

  const saveTitle = async () => {
    if (!titleDraft.trim() || titleDraft === task.title) { setEditingTitle(false); return; }
    setSaving(true);
    try {
      await dispatch(updateTask({ id: task._id, data: { title: titleDraft.trim() } })).unwrap();
      setTask(t => ({ ...t, title: titleDraft.trim() }));
      setEditingTitle(false);
    } catch { toast.error('Failed to save title'); }
    finally { setSaving(false); }
  };

  const saveDesc = async () => {
    setSaving(true);
    try {
      await dispatch(updateTask({ id: task._id, data: { description: descDraft } })).unwrap();
      setTask(t => ({ ...t, description: descDraft }));
      setEditingDesc(false);
    } catch { toast.error('Failed to save description'); }
    finally { setSaving(false); }
  };

  const statusInfo  = STATUS_OPTIONS.find(s => s.value === task?.status) || STATUS_OPTIONS[0];
  const priorityInfo = PRIORITY_OPTIONS.find(p => p.value === task?.priority) || PRIORITY_OPTIONS[1];

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.25)',
          zIndex: 1000,
          animation: 'fadeIn 0.15s ease',
        }}
      />

      {/* Drawer panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: Math.min(560, window.innerWidth - 64),
        background: 'var(--surface)',
        borderLeft: '1px solid var(--border)',
        zIndex: 1001,
        display: 'flex', flexDirection: 'column',
        animation: 'slideInRight 0.22s cubic-bezier(0.22,1,0.36,1)',
        boxShadow: '-8px 0 40px rgba(0,0,0,0.15)',
        overflowY: 'auto',
      }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
          position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {task && (
              <div
                style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: statusInfo.color, flexShrink: 0,
                }}
              />
            )}
            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-1)' }}>
              Task Details
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', color: 'var(--text-3)',
              cursor: 'pointer', padding: 4, borderRadius: 6, display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        {loading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="spinner" />
          </div>
        ) : !task ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)' }}>
            Task not found
          </div>
        ) : (
          <div style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Title */}
            <div>
              {editingTitle ? (
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <input
                    autoFocus
                    value={titleDraft}
                    onChange={e => setTitleDraft(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') setEditingTitle(false); }}
                    style={{
                      flex: 1, fontSize: '1.2rem', fontWeight: 700,
                      border: '2px solid var(--accent)', borderRadius: 8,
                      padding: '6px 10px', background: 'var(--bg)', color: 'var(--text-1)',
                      outline: 'none', fontFamily: 'inherit',
                    }}
                  />
                  <button onClick={saveTitle} disabled={saving} className="btn btn-primary btn-sm">
                    <Check size={14} />
                  </button>
                  <button onClick={() => setEditingTitle(false)} className="btn btn-secondary btn-sm">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div
                  style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer' }}
                  onClick={() => { setTitleDraft(task.title); setEditingTitle(true); }}
                  title="Click to edit title"
                >
                  <h2 style={{
                    margin: 0, fontSize: '1.2rem', fontWeight: 700,
                    color: 'var(--text-1)', lineHeight: 1.3, flex: 1,
                  }}>
                    {task.title}
                  </h2>
                  <Edit3 size={14} style={{ color: 'var(--text-3)', flexShrink: 0, marginTop: 4 }} />
                </div>
              )}
            </div>

            {/* Metadata grid */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr',
              gap: 12,
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 12, padding: 16,
            }}>
              {/* Status */}
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Status</div>
                <select
                  value={task.status}
                  onChange={e => handleStatusChange(e.target.value)}
                  style={{
                    background: statusInfo.color + '20',
                    color: statusInfo.color,
                    border: `1px solid ${statusInfo.color}40`,
                    borderRadius: 6, padding: '4px 8px',
                    fontSize: '0.82rem', fontWeight: 600,
                    cursor: 'pointer', width: '100%', outline: 'none',
                  }}
                >
                  {STATUS_OPTIONS.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              {/* Priority */}
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Priority</div>
                <select
                  value={task.priority}
                  onChange={e => handlePriorityChange(e.target.value)}
                  style={{
                    background: priorityInfo.color + '20',
                    color: priorityInfo.color,
                    border: `1px solid ${priorityInfo.color}40`,
                    borderRadius: 6, padding: '4px 8px',
                    fontSize: '0.82rem', fontWeight: 600,
                    cursor: 'pointer', width: '100%', outline: 'none',
                  }}
                >
                  {PRIORITY_OPTIONS.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>

              {/* Assignee */}
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Assignee</div>
                {task.assignedTo ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%',
                      background: 'var(--accent)', color: 'white',
                      fontSize: '0.6rem', fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {getInitials(task.assignedTo.name || '')}
                    </div>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-1)' }}>{task.assignedTo.name}</span>
                  </div>
                ) : (
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-3)' }}>Unassigned</span>
                )}
              </div>

              {/* Due Date */}
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Due Date</div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  fontSize: '0.85rem',
                  color: isOverdue(task) ? '#E5484D' : 'var(--text-1)',
                  fontWeight: isOverdue(task) ? 600 : 400,
                }}>
                  <Calendar size={13} />
                  {formatDate(task.dueDate)}
                  {isOverdue(task) && <span style={{ fontSize: '0.72rem', background: '#E5484D20', color: '#E5484D', padding: '1px 6px', borderRadius: 4 }}>Overdue</span>}
                </div>
              </div>

              {/* Project */}
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Project</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: 'var(--text-1)' }}>
                  <Folder size={13} style={{ color: 'var(--accent)' }} />
                  {task.projectId?.title || '—'}
                </div>
              </div>

              {/* Created by */}
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Created By</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: 'var(--text-1)' }}>
                  <User size={13} />
                  {task.createdBy?.name || '—'}
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <div style={{
                fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-3)',
                textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                Description
                {!editingDesc && (
                  <button
                    onClick={() => { setDescDraft(task.description || ''); setEditingDesc(true); }}
                    style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem' }}
                  >
                    <Edit3 size={12} /> Edit
                  </button>
                )}
              </div>
              {editingDesc ? (
                <div>
                  <textarea
                    autoFocus
                    value={descDraft}
                    onChange={e => setDescDraft(e.target.value)}
                    rows={4}
                    style={{
                      width: '100%', padding: '10px 12px',
                      border: '2px solid var(--accent)', borderRadius: 8,
                      background: 'var(--bg)', color: 'var(--text-1)',
                      fontSize: '0.875rem', lineHeight: 1.6,
                      outline: 'none', resize: 'vertical', fontFamily: 'inherit',
                      boxSizing: 'border-box',
                    }}
                  />
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button onClick={saveDesc} disabled={saving} className="btn btn-primary btn-sm">Save</button>
                    <button onClick={() => setEditingDesc(false)} className="btn btn-secondary btn-sm">Cancel</button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => { setDescDraft(task.description || ''); setEditingDesc(true); }}
                  style={{
                    minHeight: 60,
                    padding: '10px 12px',
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    fontSize: '0.875rem',
                    lineHeight: 1.6,
                    color: task.description ? 'var(--text-1)' : 'var(--text-3)',
                    cursor: 'text',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {task.description || 'Add a description…'}
                </div>
              )}
            </div>

            {/* Activity Log */}
            <ActivityLog entries={activityLog} defaultExpanded={false} />

            {/* Divider */}
            <div style={{ height: 1, background: 'var(--border)' }} />

            {/* Attachments */}
            <AttachmentsPanel
              taskId={task._id}
              attachments={attachments}
              currentUser={user}
              onAttachmentAdded={att => setAttachments(prev => [...prev, att])}
              onAttachmentDeleted={id => setAttachments(prev => prev.filter(a => a._id !== id))}
            />

            {/* Divider */}
            <div style={{ height: 1, background: 'var(--border)' }} />

            {/* Comments */}
            <CommentsThread
              taskId={task._id}
              comments={task.comments || []}
              currentUser={user}
            />
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </>
  );
}
