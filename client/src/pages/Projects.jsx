import React, { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import ReactDOM from 'react-dom';
import { fetchProjects, createProject, deleteProject } from '../redux/slices/projectsSlice';
import { Plus, Search, Calendar, MoreHorizontal, Trash2, Settings, FolderOpen } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_TABS = ['All Projects', 'Ongoing', 'Completed', 'Archived'];

function priorityBadge(p) {
  if (!p) return null;
  const cls = p === 'High' ? 'badge-red' : p === 'Medium' ? 'badge-yellow' : 'badge-green';
  return <span className={`badge ${cls}`}>{p}</span>;
}

/* ── Portal Dropdown ─────────────────────────────────────────────────────────
   Renders into document.body so it is NEVER clipped by any overflow:hidden.
   Keeps refs to BOTH the anchor button AND the menu div so outside-click
   logic doesn't fire when clicking items inside the menu. */
function PortalMenu({ anchorRef, onClose, children }) {
  const menuRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      // Flip upward if not enough room below
      const estimatedH = 100;
      const spaceBelow = window.innerHeight - rect.bottom;
      const top = spaceBelow < estimatedH + 8 ? rect.top - estimatedH - 6 : rect.bottom + 6;
      setPos({ top, left: rect.right });
    }

    const handleClose = (e) => {
      // Ignore clicks inside the anchor button OR inside the menu portal itself
      const insideAnchor = anchorRef.current && anchorRef.current.contains(e.target);
      const insideMenu   = menuRef.current   && menuRef.current.contains(e.target);
      if (!insideAnchor && !insideMenu) onClose();
    };

    // Use 'click' (not 'mousedown') so menu item onClick fires first
    document.addEventListener('click', handleClose, true);
    return () => document.removeEventListener('click', handleClose, true);
  }, []);

  return ReactDOM.createPortal(
    <div
      ref={menuRef}
      style={{
        position:     'fixed',
        top:          pos.top,
        left:         pos.left,
        transform:    'translateX(-100%)',
        background:   'var(--surface)',
        border:       '1px solid var(--border)',
        borderRadius: 10,
        padding:      6,
        minWidth:     170,
        boxShadow:    '0 8px 24px rgba(0,0,0,0.2)',
        zIndex:       9999,
      }}
    >
      {children}
    </div>,
    document.body
  );
}

/* ── Project Card ──────────────────────────────────────────────────────────── */
function ProjectCard({ project, onDelete, onOpen }) {
  const [menu, setMenu] = useState(false);
  const btnRef = useRef(null);
  const members = project.members || [];
  const colors  = ['#6366F1', '#22C55E', '#F59E0B', '#E5484D', '#8B5CF6'];

  // Stable progress based on id so it doesn't flicker
  const progress = project.progress ?? 40;

  return (
    <div
      className="card"
      style={{ cursor: 'pointer', transition: 'box-shadow .15s' }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-md)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'var(--shadow)'}
      onClick={() => onOpen(project._id)}
    >
      {/* Top row: priority badge + three-dots */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        {priorityBadge(project.priority) || <span />}

        {/* Stop click from bubbling so card navigate doesn't fire */}
        <div onClick={e => e.stopPropagation()}>
          <button
            ref={btnRef}
            className="btn btn-ghost btn-sm"
            style={{ padding: '4px 6px', borderRadius: 6 }}
            onClick={() => setMenu(m => !m)}
          >
            <MoreHorizontal size={15} />
          </button>

          {menu && (
            <PortalMenu anchorRef={btnRef} onClose={() => setMenu(false)}>
              <button
                className="dropdown-item"
                onClick={() => { setMenu(false); onOpen(project._id); }}
              >
                <Settings size={13} /> Open Project
              </button>
              <button
                className="dropdown-item danger"
                onClick={() => { setMenu(false); onDelete(project._id); }}
              >
                <Trash2 size={13} /> Delete
              </button>
            </PortalMenu>
          )}
        </div>
      </div>

      {/* Name */}
      <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 6, color: 'var(--text-1)' }}>
        {project.title || project.name}
      </div>

      {/* Description */}
      <div style={{ fontSize: '0.82rem', color: 'var(--text-2)', marginBottom: 16, lineHeight: 1.5, minHeight: 36 }}>
        {project.description || 'No description provided.'}
      </div>

      {/* Progress */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-2)' }}>Progress</span>
          <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>{progress}%</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Footer: members + deadline */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="overlap-avatars">
          {members.slice(0, 3).map((m, i) => (
            <div key={i} className="avatar avatar-sm" style={{ background: colors[i % colors.length], fontSize: '0.6rem' }}>
              {(m.name || m.email || 'M').slice(0, 2).toUpperCase()}
            </div>
          ))}
          {members.length === 0 && (
            <div className="avatar avatar-sm" style={{ background: '#6366F1', fontSize: '0.6rem' }}>ME</div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.78rem', color: 'var(--text-3)' }}>
          <Calendar size={12} />
          {project.deadline
            ? new Date(project.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            : 'No deadline'}
        </div>
      </div>
    </div>
  );
}

/* ── Projects Page ─────────────────────────────────────────────────────────── */
export default function Projects() {
  const dispatch  = useDispatch();
  const navigate  = useNavigate();
  const { list: projects, loading } = useSelector(s => s.projects);
  const { user }  = useSelector(s => s.auth);
  const isAdmin   = user?.role === 'admin';

  const [search,     setSearch]     = useState('');
  const [activeTab,  setActiveTab]  = useState('All Projects');
  const [showModal,  setShowModal]  = useState(false);
  const [form,       setForm]       = useState({ title: '', description: '', priority: 'Medium', dueDate: '' });
  const [creating,   setCreating]   = useState(false);

  useEffect(() => { dispatch(fetchProjects()); }, [dispatch]);

  const filtered = (projects || []).filter(p => {
    const matchSearch = (p.title || p.name || '').toLowerCase().includes(search.toLowerCase());
    if (activeTab === 'Ongoing')   return matchSearch && p.status !== 'completed' && p.status !== 'archived';
    if (activeTab === 'Completed') return matchSearch && p.status === 'completed';
    if (activeTab === 'Archived')  return matchSearch && p.status === 'archived';
    return matchSearch;
  });

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await dispatch(createProject(form)).unwrap();
      toast.success('Project created!');
      setShowModal(false);
      setForm({ title: '', description: '', priority: 'Medium', dueDate: '' });
    } catch (err) { toast.error(err || 'Failed to create project'); }
    finally { setCreating(false); }
  };

  const handleDelete = async (id) => {
    toast(
      (t) => (
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          Delete project and all its tasks?
          <button
            style={{ background: '#E5484D', color: 'white', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontWeight: 600 }}
            onClick={async () => {
              toast.dismiss(t.id);
              try { await dispatch(deleteProject(id)).unwrap(); toast.success('Project deleted'); }
              catch { toast.error('Failed to delete'); }
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

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-title">Project Directory</div>
          <div className="page-sub">Manage and track your active workspace projects</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="search-box" style={{ minWidth: 220 }}>
            <Search size={14} />
            <input
              placeholder="Search projects..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button id="new-project-btn" className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={15} /> New Project
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div className="tab-group">
          {STATUS_TABS.map(t => (
            <button key={t} className={`tab ${activeTab === t ? 'active' : ''}`} onClick={() => setActiveTab(t)}>{t}</button>
          ))}
        </div>
        <select className="form-select" style={{ width: 180 }}>
          <option>Recently Updated</option>
          <option>Name A–Z</option>
          <option>Priority</option>
        </select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="empty-state"><div className="spinner" style={{ margin: '0 auto' }} /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <FolderOpen size={40} style={{ margin: '0 auto' }} />
          <h3>No projects found</h3>
          <p>{isAdmin ? 'Create your first project to get started.' : "You haven't been added to any projects yet."}</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
          {filtered.map(p => (
            <ProjectCard key={p._id} project={p} onDelete={handleDelete} onOpen={id => navigate(`/projects/${id}`)} />
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">New Project</div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Project Name *</label>
                  <input className="form-input" placeholder="e.g. Mobile App Redesign"
                    value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-textarea" placeholder="What is this project about?"
                    value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Priority</label>
                    <select className="form-select" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                      <option>High</option><option>Medium</option><option>Low</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Deadline</label>
                    <input className="form-input" type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={creating}>{creating ? 'Creating…' : 'Create Project'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
