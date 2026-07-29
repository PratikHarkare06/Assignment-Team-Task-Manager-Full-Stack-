import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProjects } from '../redux/slices/projectsSlice';
import { fetchTasks, createTask, updateTask } from '../redux/slices/tasksSlice';
import { Plus, Search, ArrowLeft, MoreHorizontal, Calendar, FileText, Users, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import ProjectReportModal from '../components/ProjectReportModal';
import ProjectMembersModal from '../components/ProjectMembersModal';
import TaskDrawer from '../components/TaskDrawer';

const COLUMNS = ['Todo', 'In Progress', 'Completed'];
const PRIORITIES = ['High', 'Medium', 'Low'];

function priorityBadge(p) {
  if (!p) return null;
  const cls = p === 'High' ? 'badge-red' : p === 'Medium' ? 'badge-yellow' : 'badge-green';
  return <span className={`badge ${cls}`}>{p}</span>;
}

const COLORS = ['#6366F1', '#22C55E', '#F59E0B', '#E5484D', '#8B5CF6'];

/* ── Gantt Chart View Component ───────────────────────────────────────────── */
function GanttView({ tasks, onTaskClick }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    return d;
  });

  const STATUS_COLORS = {
    todo: '#6B7280',
    'in-progress': '#3B82F6',
    completed: '#22C55E',
    blocked: '#E5484D',
  };

  return (
    <div className="card" style={{ padding: 0, overflow: 'auto' }}>
      {/* Date Header */}
      <div style={{
        display: 'grid', gridTemplateColumns: '220px repeat(14, 1fr)',
        borderBottom: '1px solid var(--border)', background: 'var(--bg)',
        minWidth: 900,
      }}>
        <div style={{ padding: '10px 14px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase' }}>
          Task Name
        </div>
        {days.map((d, i) => (
          <div key={i} style={{
            padding: '8px 4px', textAlign: 'center',
            fontSize: '0.7rem', fontWeight: 600,
            borderLeft: '1px solid var(--border)',
            color: d.getDay() === 0 || d.getDay() === 6 ? 'var(--accent)' : 'var(--text-2)',
          }}>
            <div>{d.toLocaleDateString('en-US', { weekday: 'narrow' })}</div>
            <div style={{ fontWeight: 700 }}>{d.getDate()}</div>
          </div>
        ))}
      </div>

      {/* Task Rows */}
      <div style={{ minWidth: 900 }}>
        {tasks.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)', fontSize: '0.85rem' }}>
            No tasks to display in Gantt Timeline
          </div>
        ) : (
          tasks.map(task => {
            const created = new Date(task.createdAt || Date.now());
            created.setHours(0, 0, 0, 0);
            const due = task.dueDate ? new Date(task.dueDate) : new Date(created.getTime() + 3 * 86400000);
            due.setHours(0, 0, 0, 0);

            const startDiff = Math.max(0, Math.round((created - today) / 86400000));
            const endDiff   = Math.max(startDiff, Math.round((due - today) / 86400000));

            const colStart = Math.min(14, Math.max(1, startDiff + 1));
            const colEnd   = Math.min(14, Math.max(colStart, endDiff + 1));
            const span     = Math.max(1, colEnd - colStart + 1);

            const statusKey = (task.status || 'todo').toLowerCase().replace(' ', '-');
            const barColor = STATUS_COLORS[statusKey] || '#6366F1';

            return (
              <div
                key={task._id}
                onClick={() => onTaskClick(task._id)}
                style={{
                  display: 'grid', gridTemplateColumns: '220px repeat(14, 1fr)',
                  alignItems: 'center', borderBottom: '1px solid var(--border)',
                  minHeight: 44, cursor: 'pointer',
                }}
              >
                <div style={{
                  padding: '8px 14px', fontSize: '0.84rem', fontWeight: 600,
                  color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {task.title}
                </div>

                <div style={{
                  gridColumn: `2 / span 14`, display: 'grid', gridTemplateColumns: 'repeat(14, 1fr)',
                  height: '100%', alignItems: 'center', position: 'relative',
                }}>
                  {days.map((_, i) => (
                    <div key={i} style={{ height: '100%', borderLeft: '1px solid var(--border)' }} />
                  ))}

                  <div
                    title={`${task.title} (${task.status}) - Due: ${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'N/A'}`}
                    style={{
                      position: 'absolute',
                      left: `calc(${((colStart - 1) / 14) * 100}% + 4px)`,
                      width: `calc(${(span / 14) * 100}% - 8px)`,
                      height: 24, borderRadius: 6,
                      background: barColor,
                      color: 'white', fontSize: '0.72rem', fontWeight: 700,
                      display: 'flex', alignItems: 'center', padding: '0 8px',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}
                  >
                    {task.title}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function ProjectDetails() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { list: projects } = useSelector(s => s.projects);
  const { list: tasks } = useSelector(s => s.tasks);
  const { user } = useSelector(s => s.auth);

  const [view, setView]               = useState('Board');
  const [showModal, setShowModal]     = useState(false);
  const [showReport, setShowReport]   = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [drawerTaskId, setDrawerTaskId] = useState(null);

  const [form, setForm]               = useState({ title: '', description: '', priority: 'Medium', status: 'Todo', dueDate: '', assignedTo: '' });
  const [creating, setCreating]       = useState(false);
  const [search, setSearch]           = useState('');
  const [users, setUsers]             = useState([]);

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 0, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/projects')} style={{ padding: '6px 8px' }}>
            <ArrowLeft size={16} />
          </button>
          <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{project?.name || project?.title || 'Project'}</div>
          <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
          <div className="tab-group" style={{ background: 'transparent', border: 'none', gap: 4 }}>
            {['Board', 'List', 'Timeline'].map(v => (
              <button key={v} className={`tab ${view === v ? 'active' : ''}`} onClick={() => setView(v)} style={{ padding: '5px 14px' }}>{v}</button>
            ))}
          </div>
        </div>

        <div className="search-box" style={{ minWidth: 180 }}>
          <Search size={14} />
          <input placeholder="Search tasks..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <button className="btn btn-secondary btn-sm" onClick={() => setShowMembers(true)}>
          <Users size={14} /> Members ({project?.members?.length || 0})
        </button>

        <button className="btn btn-secondary btn-sm" onClick={() => setShowReport(true)}>
          <FileText size={14} /> Report
        </button>

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
                    <div key={task._id} className="kanban-card" onClick={() => setDrawerTaskId(task._id)} style={{ cursor: 'pointer' }}>
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
      {view === 'List' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>TASK</th><th>STATUS</th><th>PRIORITY</th><th>DUE DATE</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(task => (
                <tr key={task._id} onClick={() => setDrawerTaskId(task._id)} style={{ cursor: 'pointer' }}>
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

      {/* Timeline Gantt View */}
      {view === 'Timeline' && (
        <GanttView tasks={filtered} onTaskClick={setDrawerTaskId} />
      )}

      {/* Task Drawer */}
      {drawerTaskId && (
        <TaskDrawer taskId={drawerTaskId} onClose={() => setDrawerTaskId(null)} />
      )}

      {/* Executive Report Modal */}
      {showReport && (
        <ProjectReportModal
          project={project}
          tasks={projectTasks}
          onClose={() => setShowReport(false)}
        />
      )}

      {/* Project Members Modal */}
      {showMembers && project && (
        <ProjectMembersModal
          project={project}
          onMembersUpdated={() => dispatch(fetchProjects())}
          onClose={() => setShowMembers(false)}
        />
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
