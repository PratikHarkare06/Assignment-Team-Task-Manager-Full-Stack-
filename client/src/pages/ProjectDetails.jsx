import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProjects } from '../redux/slices/projectsSlice';
import { fetchTasks, createTask, updateTask } from '../redux/slices/tasksSlice';
import { Plus, Search, ArrowLeft, MoreHorizontal, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';

const COLUMNS = ['Todo', 'In Progress', 'Completed'];
const PRIORITIES = ['High', 'Medium', 'Low'];

function priorityBadge(p) {
  if (!p) return null;
  const cls = p === 'High' ? 'badge-red' : p === 'Medium' ? 'badge-yellow' : 'badge-green';
  return <span className={`badge ${cls}`}>{p}</span>;
}

const COLORS = ['#6366F1', '#22C55E', '#F59E0B', '#E5484D', '#8B5CF6'];

export default function ProjectDetails() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { list: projects } = useSelector(s => s.projects);
  const { list: tasks } = useSelector(s => s.tasks);
  const { user } = useSelector(s => s.auth);
  const isAdmin = user?.role === 'admin';

  const [view, setView] = useState('Board');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', priority: 'Medium', status: 'Todo', dueDate: '', assignedTo: '' });
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState([]);

  useEffect(() => {
    dispatch(fetchProjects());
    dispatch(fetchTasks());
    api.get('/users').then(res => {
      if (res.data?.users) setUsers(res.data.users);
    }).catch(() => {});
  }, [dispatch]);

  const project = (projects || []).find(p => p._id === id);
  const projectTasks = (tasks || []).filter(t => t.projectId === id || t.projectId?._id === id);
  const filtered = projectTasks.filter(t => !search || t.title?.toLowerCase().includes(search.toLowerCase()));

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await dispatch(createTask({ ...form, projectId: id })).unwrap();
      toast.success('Task added!');
      setShowModal(false);
      setForm({ title: '', description: '', priority: 'Medium', status: 'Todo', dueDate: '', assignedTo: '' });
    } catch { toast.error('Failed to create task'); }
    finally { setCreating(false); }
  };

  const moveTask = async (task, newStatus) => {
    try { await dispatch(updateTask({ id: task._id, data: { status: newStatus } })).unwrap(); }
    catch { toast.error('Update failed'); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/projects')} style={{ padding: '6px 8px' }}>
            <ArrowLeft size={16} />
          </button>
          <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{project?.name || 'Project'}</div>
          <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
          <div className="tab-group" style={{ background: 'transparent', border: 'none', gap: 4 }}>
            {['Board', 'List', 'Timeline'].map(v => (
              <button key={v} className={`tab ${view === v ? 'active' : ''}`} onClick={() => setView(v)} style={{ padding: '5px 14px' }}>{v}</button>
            ))}
          </div>
        </div>
        <div className="search-box" style={{ minWidth: 200 }}>
          <Search size={14} />
          <input placeholder="Search tasks..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={15} /> New Task
        </button>
      </div>

      <div className="divider" style={{ margin: '16px -28px 20px', width: 'calc(100% + 56px)' }} />

      {/* Kanban board */}
      {view === 'Board' && (
        <div className="kanban-board" style={{ flex: 1 }}>
          {COLUMNS.map(col => {
            const colTasks = filtered.filter(t => (t.status || 'Todo').toLowerCase() === col.toLowerCase());
            return (
              <div key={col} className="kanban-col">
                <div className="kanban-col-header">
                  <span>{col}</span>
                  <span className="kanban-count">{colTasks.length}</span>
                  <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto', padding: '3px 6px' }}
                    onClick={() => { setForm(f => ({ ...f, status: col })); setShowModal(true); }}>
                    <Plus size={14} />
                  </button>
                </div>
                {colTasks.map(task => {
                  const idx = filtered.indexOf(task);
                  return (
                    <div key={task._id} className="kanban-card">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        {priorityBadge(task.priority)}
                        <button className="btn btn-ghost btn-sm" style={{ padding: '2px 4px' }}>
                          <MoreHorizontal size={14} />
                        </button>
                      </div>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: 6 }}>{task.title}</div>
                      {task.description && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-2)', marginBottom: 12, lineHeight: 1.5 }}>
                          {task.description}
                        </div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
                        <div className="overlap-avatars">
                          <div className="avatar avatar-sm" style={{ background: COLORS[idx % COLORS.length], fontSize: '0.6rem' }}>
                            {(task.assignedTo?.name || 'ME').slice(0, 2).toUpperCase()}
                          </div>
                        </div>
                        {task.dueDate && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: 'var(--text-3)' }}>
                            <Calendar size={11} />
                            {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* List view */}
      {view !== 'Board' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>TASK</th><th>STATUS</th><th>PRIORITY</th><th>DUE DATE</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(task => (
                <tr key={task._id}>
                  <td style={{ fontWeight: 500 }}>{task.title}</td>
                  <td><span className="badge badge-gray">{task.status || 'Todo'}</span></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className={`dot ${task.priority === 'High' ? 'dot-red' : task.priority === 'Medium' ? 'dot-yellow' : 'dot-green'}`} />
                      {task.priority}
                    </div>
                  </td>
                  <td style={{ fontSize: '0.83rem', color: 'var(--text-3)' }}>
                    {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="empty-state">
              <h3>No tasks yet</h3>
              <p>Add your first task to this project.</p>
            </div>
          )}
        </div>
      )}

      {/* Task Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">New Task</div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Title *</label>
                  <input className="form-input" placeholder="Task title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-textarea" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Priority</label>
                    <select className="form-select" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                      {PRIORITIES.map(p => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select className="form-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                      {COLUMNS.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Assignee</label>
                    <select className="form-select" value={form.assignedTo} onChange={e => setForm({ ...form, assignedTo: e.target.value })}>
                      <option value="">Unassigned</option>
                      {users.map(u => <option key={u._id} value={u._id}>{u.name || u.email}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Due Date</label>
                    <input className="form-input" type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={creating}>{creating ? 'Creating…' : 'Add Task'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
