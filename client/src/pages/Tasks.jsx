import React, { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import ReactDOM from 'react-dom';
import { fetchTasks, createTask, updateTask, deleteTask } from '../redux/slices/tasksSlice';
import { fetchProjects } from '../redux/slices/projectsSlice';
import { Plus, Search, Download, MoreHorizontal, Trash2, CheckCircle, LayoutList, LayoutGrid, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import TaskDrawer from '../components/TaskDrawer';
import KanbanBoard from '../components/KanbanBoard';

/* ── Smart Portal Menu ─────────────────────────────────────────────────────── */
function SmartMenu({ anchorRef, onClose, children }) {
  const [style, setStyle] = useState({ visibility: 'hidden' });
  const menuRef = useRef(null);

  useEffect(() => {
    const btn  = anchorRef.current;
    const menu = menuRef.current;
    if (!btn || !menu) return;

    const btnRect    = btn.getBoundingClientRect();
    const menuH      = menu.offsetHeight || 200;
    const spaceBelow = window.innerHeight - btnRect.bottom;
    const openUp     = spaceBelow < menuH + 8;

    setStyle({
      position:     'fixed',
      left:         btnRect.right,
      transform:    'translateX(-100%)',
      top:          openUp ? btnRect.top - menuH - 6 : btnRect.bottom + 6,
      background:   'var(--surface)',
      border:       '1px solid var(--border)',
      borderRadius: 10,
      padding:      6,
      minWidth:     180,
      boxShadow:    '0 8px 24px rgba(0,0,0,0.2)',
      zIndex:       9999,
    });

    const handleOutside = (e) => {
      const insideBtn  = btn  && btn.contains(e.target);
      const insideMenu = menu && menu.contains(e.target);
      if (!insideBtn && !insideMenu) onClose();
    };
    document.addEventListener('click', handleOutside, true);
    return () => document.removeEventListener('click', handleOutside, true);
  }, []);

  return ReactDOM.createPortal(
    <div ref={menuRef} style={style}>{children}</div>,
    document.body
  );
}

const STATUSES   = ['Todo', 'In Progress', 'Completed', 'Blocked'];
const PRIORITIES = ['High', 'Medium', 'Low'];

const PRIORITY_WEIGHTS = { critical: 4, high: 3, medium: 2, low: 1 };
const STATUS_WEIGHTS = { todo: 1, 'in-progress': 2, blocked: 3, completed: 4 };

function getStatusBadge(s) {
  if (!s) return null;
  const map = { 'todo': 'badge-gray', 'in progress': 'badge-blue', 'completed': 'badge-green', 'blocked': 'badge-red', 'in-progress': 'badge-blue' };
  const cls = map[s?.toLowerCase()] || 'badge-gray';
  return <span className={`badge ${cls}`}>{s}</span>;
}

function getPriorityDot(p) {
  const cls = p === 'High' || p === 'high' ? 'dot-red' : (p === 'Medium' || p === 'medium') ? 'dot-yellow' : 'dot-green';
  return <span className={`dot ${cls}`} />;
}

const COLORS = ['#6366F1', '#22C55E', '#F59E0B', '#E5484D', '#8B5CF6'];

export default function Tasks() {
  const dispatch = useDispatch();
  const { list: tasks, loading } = useSelector(s => s.tasks);
  const { list: projects }       = useSelector(s => s.projects);
  const { user }                  = useSelector(s => s.auth);
  const isAdmin = user?.role === 'admin';

  const [view, setView]                   = useState('table'); // 'table' | 'board'
  const [search, setSearch]               = useState('');
  const [filterStatus, setFilterStatus]   = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [sortField, setSortField]         = useState('createdAt');
  const [sortOrder, setSortOrder]         = useState('desc');
  const [currentPage, setCurrentPage]     = useState(1);
  const pageSize = 10;

  const [showModal, setShowModal]         = useState(false);
  const [form, setForm]                   = useState({ title: '', description: '', priority: 'Medium', status: 'Todo', dueDate: '', projectId: '', assignedTo: '' });
  const [creating, setCreating]           = useState(false);
  const [menuId, setMenuId]               = useState(null);
  const [users, setUsers]                 = useState([]);
  const [drawerTaskId, setDrawerTaskId]   = useState(null);
  const menuBtnRefs                        = useRef({});

  useEffect(() => {
    dispatch(fetchTasks());
    dispatch(fetchProjects());
    api.get('/users').then(res => {
      if (res.data?.users) setUsers(res.data.users);
    }).catch(() => {});
  }, [dispatch]);

  // Handle Sort Toggle
  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  const getSortIcon = (field) => {
    if (sortField !== field) return ' ↕';
    return sortOrder === 'asc' ? ' ↑' : ' ↓';
  };

  // Filter
  const filtered = (tasks || []).filter(t => {
    const matchSearch   = t.title?.toLowerCase().includes(search.toLowerCase());
    const matchStatus   = !filterStatus   || t.status?.toLowerCase() === filterStatus.toLowerCase();
    const matchPriority = !filterPriority || t.priority?.toLowerCase() === filterPriority.toLowerCase();
    return matchSearch && matchStatus && matchPriority;
  });

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    let valA, valB;
    if (sortField === 'title') {
      valA = a.title?.toLowerCase() || '';
      valB = b.title?.toLowerCase() || '';
    } else if (sortField === 'status') {
      valA = STATUS_WEIGHTS[a.status?.toLowerCase()] || 0;
      valB = STATUS_WEIGHTS[b.status?.toLowerCase()] || 0;
    } else if (sortField === 'priority') {
      valA = PRIORITY_WEIGHTS[a.priority?.toLowerCase()] || 0;
      valB = PRIORITY_WEIGHTS[b.priority?.toLowerCase()] || 0;
    } else if (sortField === 'dueDate') {
      valA = a.dueDate ? new Date(a.dueDate).getTime() : 0;
      valB = b.dueDate ? new Date(b.dueDate).getTime() : 0;
    } else { // createdAt
      valA = new Date(a.createdAt || 0).getTime();
      valB = new Date(b.createdAt || 0).getTime();
    }

    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // Paginate
  const totalPages = Math.ceil(sorted.length / pageSize) || 1;
  const paginatedTasks = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await dispatch(createTask(form)).unwrap();
      toast.success('Task created!');
      setShowModal(false);
      setForm({ title: '', description: '', priority: 'Medium', status: 'Todo', dueDate: '', projectId: '', assignedTo: '' });
    } catch (err) { toast.error(err || 'Failed'); }
    finally { setCreating(false); }
  };

  const handleStatusChange = async (task, newStatus) => {
    try {
      await dispatch(updateTask({ id: task._id, data: { status: newStatus } })).unwrap();
    } catch { toast.error('Update failed'); }
  };

  const handleDelete = async (id) => {
    toast(
      (t) => (
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          Delete this task?
          <button
            style={{ background: '#E5484D', color: 'white', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontWeight: 600 }}
            onClick={async () => {
              toast.dismiss(t.id);
              try {
                await dispatch(deleteTask(id)).unwrap();
                toast.success('Task deleted');
              } catch { toast.error('Delete failed'); }
            }}
          >Delete</button>
          <button
            style={{ background: 'transparent', border: '1px solid #ccc', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}
            onClick={() => toast.dismiss(t.id)}
          >Cancel</button>
        </span>
      ),
      { duration: 8000 }
    );
  };

  const exportCSV = () => {
    const rows = [['Task ID', 'Task Name', 'Status', 'Priority', 'Due Date']];
    sorted.forEach((t, i) => rows.push([`T-${i + 101}`, t.title, t.status, t.priority, t.dueDate || '—']));
    const csv  = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'tasks.csv'; a.click();
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-title">All Tasks</div>
          <div className="page-sub">Manage and track all project activities in one place</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={exportCSV}><Download size={14} /> Export CSV</button>
          <button id="create-task-btn" className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={15} /> Create Task
          </button>
        </div>
      </div>

      {/* Filters + View Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <select className="form-select" style={{ width: 140 }} value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1); }}>
          <option value="">Status ▾</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="form-select" style={{ width: 140 }} value={filterPriority} onChange={e => { setFilterPriority(e.target.value); setCurrentPage(1); }}>
          <option value="">Priority ▾</option>
          {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <div className="search-box" style={{ flex: 1 }}>
          <Search size={14} />
          <input placeholder="Search tasks, IDs, or members..." value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1); }} />
        </div>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
          {view === 'table' ? `Showing ${paginatedTasks.length} of ${sorted.length} tasks` : `${tasks.length} tasks`}
        </span>

        {/* View toggle */}
        <div style={{
          display: 'flex', background: 'var(--bg)',
          border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden',
        }}>
          <button
            onClick={() => setView('table')}
            title="Table view"
            style={{
              padding: '6px 12px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
              background: view === 'table' ? 'var(--accent)' : 'transparent',
              color: view === 'table' ? 'white' : 'var(--text-2)',
              fontSize: '0.8rem', fontWeight: 600, transition: 'background 0.15s',
            }}
          >
            <LayoutList size={14} /> List
          </button>
          <button
            onClick={() => setView('board')}
            title="Kanban board"
            style={{
              padding: '6px 12px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
              background: view === 'board' ? 'var(--accent)' : 'transparent',
              color: view === 'board' ? 'white' : 'var(--text-2)',
              fontSize: '0.8rem', fontWeight: 600, transition: 'background 0.15s',
            }}
          >
            <LayoutGrid size={14} /> Board
          </button>
        </div>
      </div>

      {/* ── Board View ── */}
      {view === 'board' && (
        <KanbanBoard onTaskClick={id => setDrawerTaskId(id)} />
      )}

      {/* ── Table View ── */}
      {view === 'table' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
          ) : sorted.length === 0 ? (
            <div className="empty-state">
              <CheckCircle size={36} style={{ margin: '0 auto' }} />
              <h3>No tasks found</h3>
              <p>Try adjusting your filters or create a new task.</p>
            </div>
          ) : (
            <>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ cursor: 'pointer' }} onClick={() => handleSort('createdAt')}>TASK ID{getSortIcon('createdAt')}</th>
                    <th style={{ cursor: 'pointer' }} onClick={() => handleSort('title')}>TASK NAME{getSortIcon('title')}</th>
                    <th style={{ cursor: 'pointer' }} onClick={() => handleSort('status')}>STATUS{getSortIcon('status')}</th>
                    <th style={{ cursor: 'pointer' }} onClick={() => handleSort('priority')}>PRIORITY{getSortIcon('priority')}</th>
                    <th>ASSIGNEE</th>
                    <th style={{ cursor: 'pointer' }} onClick={() => handleSort('dueDate')}>DUE DATE{getSortIcon('dueDate')}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTasks.map((task, i) => {
                    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'Completed' && task.status !== 'completed';
                    const displayIndex = (currentPage - 1) * pageSize + i + 1;
                    return (
                      <tr
                        key={task._id}
                        onClick={(e) => {
                          if (e.target.closest('button')) return;
                          setDrawerTaskId(task._id);
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        <td style={{ color: 'var(--text-3)', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>T-{100 + displayIndex}</td>
                        <td style={{ fontWeight: 500, maxWidth: 240 }}>
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
                            {task.tags && task.tags.map(t => (
                              <span key={t.name} style={{ fontSize: '0.65rem', fontWeight: 600, color: t.color || 'var(--accent)', background: (t.color || 'var(--accent)') + '18', padding: '1px 5px', borderRadius: 4 }}>
                                {t.name}
                              </span>
                            ))}
                            {task.subtasks?.length > 0 && (
                              <span style={{ fontSize: '0.68rem', color: 'var(--text-3)', fontWeight: 500 }}>
                                ☑ {task.subtasks.filter(s => s.completed).length}/{task.subtasks.length}
                              </span>
                            )}
                            {task.comments?.length > 0 && (
                              <span style={{ fontSize: '0.68rem', color: 'var(--text-3)' }}>
                                💬 {task.comments.length}
                              </span>
                            )}
                          </div>
                        </td>
                        <td>{getStatusBadge(task.status)}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {getPriorityDot(task.priority)}
                            <span style={{ fontSize: '0.83rem', textTransform: 'capitalize' }}>{task.priority}</span>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div className="avatar avatar-sm" style={{ background: COLORS[i % COLORS.length], fontSize: '0.6rem' }}>
                              {(task.assignedTo?.name || task.assignedTo?.email || 'U').slice(0, 2).toUpperCase()}
                            </div>
                            <span style={{ fontSize: '0.83rem' }}>{task.assignedTo?.name || 'Unassigned'}</span>
                          </div>
                        </td>
                        <td className={isOverdue ? 'overdue' : ''} style={{ fontSize: '0.83rem' }}>
                          {task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                        </td>
                        <td>
                          <div style={{ position: 'relative' }}>
                            <button
                              ref={el => { menuBtnRefs.current[task._id] = el; }}
                              className="btn btn-ghost btn-sm"
                              style={{ padding: '4px 6px' }}
                              onClick={e => { e.stopPropagation(); setMenuId(menuId === task._id ? null : task._id); }}
                            >
                              <MoreHorizontal size={15} />
                            </button>
                            {menuId === task._id && (
                              <SmartMenu
                                anchorRef={{ current: menuBtnRefs.current[task._id] }}
                                onClose={() => setMenuId(null)}
                              >
                                <button className="dropdown-item" onClick={() => { setMenuId(null); setDrawerTaskId(task._id); }}>
                                  📋 View Details
                                </button>
                                {STATUSES.map(s => (
                                  <button
                                    key={s}
                                    className="dropdown-item"
                                    onClick={() => { setMenuId(null); handleStatusChange(task, s); }}
                                  >
                                    → {s}
                                  </button>
                                ))}
                                <button
                                  className="dropdown-item danger"
                                  onClick={() => { setMenuId(null); handleDelete(task._id); }}
                                >
                                  <Trash2 size={12} /> Delete
                                </button>
                              </SmartMenu>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 16px', borderTop: '1px solid var(--border)',
                }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>
                    Page {currentPage} of {totalPages}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    >
                      <ChevronLeft size={14} /> Prev
                    </button>
                    {Array.from({ length: totalPages }, (_, idx) => (
                      <button
                        key={idx + 1}
                        className={`btn btn-sm ${currentPage === idx + 1 ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => setCurrentPage(idx + 1)}
                        style={{ minWidth: 28, padding: '2px 8px' }}
                      >
                        {idx + 1}
                      </button>
                    ))}
                    <button
                      className="btn btn-secondary btn-sm"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    >
                      Next <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Task Detail Drawer */}
      {drawerTaskId && (
        <TaskDrawer
          taskId={drawerTaskId}
          onClose={() => setDrawerTaskId(null)}
        />
      )}

      {/* Create Task Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Create Task</div>
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
                  <textarea className="form-textarea" placeholder="Task description..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
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
                      {STATUSES.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Project</label>
                    <select className="form-select" value={form.projectId} onChange={e => setForm({ ...form, projectId: e.target.value })} required>
                      <option value="">Select project</option>
                      {(projects || []).map(p => <option key={p._id} value={p._id}>{p.title || p.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Assignee</label>
                    <select className="form-select" value={form.assignedTo} onChange={e => setForm({ ...form, assignedTo: e.target.value })}>
                      <option value="">Unassigned</option>
                      {users.map(u => <option key={u._id} value={u._id}>{u.name || u.email}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ gridColumn: '1/-1' }}>
                    <label className="form-label">Due Date</label>
                    <input className="form-input" type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={creating}>{creating ? 'Creating…' : 'Create Task'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
