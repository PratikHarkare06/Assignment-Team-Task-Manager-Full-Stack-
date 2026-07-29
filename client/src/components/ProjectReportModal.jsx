import React, { useRef } from 'react';
import { Printer, X, CheckCircle2, Clock, AlertTriangle, FileText } from 'lucide-react';

export default function ProjectReportModal({ project, tasks = [], onClose }) {
  const printRef = useRef(null);

  const completed = tasks.filter(t => (t.status || '').toLowerCase() === 'completed').length;
  const inProgress = tasks.filter(t => (t.status || '').toLowerCase() === 'in-progress' || (t.status || '').toLowerCase() === 'in progress').length;
  const blocked = tasks.filter(t => (t.status || '').toLowerCase() === 'blocked').length;
  const total = tasks.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const totalLogged = tasks.reduce((sum, t) => sum + (t.loggedHours || 0), 0);
  const totalEstimated = tasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>${project?.name || project?.title || 'Project'} — Status Report</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; color: #111827; }
            h1 { font-size: 22px; font-weight: 800; margin-bottom: 4px; }
            .sub { color: #6B7280; font-size: 13px; margin-bottom: 24px; }
            .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
            .stat { background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 12px; }
            .stat-val { font-size: 20px; font-weight: 700; }
            .stat-lbl { font-size: 11px; color: #6B7280; margin-top: 2px; text-transform: uppercase; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th { text-align: left; padding: 8px; border-bottom: 2px solid #E5E7EB; font-size: 11px; color: #6B7280; }
            td { padding: 8px; border-bottom: 1px solid #F3F4F6; font-size: 13px; }
            .badge { padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 600; display: inline-block; }
            .completed { background: #DCFCE7; color: #166534; }
            .in-progress { background: #DBEAFE; color: #1E40AF; }
            .blocked { background: #FEE2E2; color: #991B1B; }
            .todo { background: #F3F4F6; color: #374151; }
          </style>
        </head>
        <body>
          ${content.innerHTML}
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 760, width: '90%' }}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={18} /> Project Executive Report
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button className="btn btn-primary btn-sm" onClick={handlePrint}>
              <Printer size={14} /> Print / Save PDF
            </button>
            <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={16} /></button>
          </div>
        </div>

        {/* Printable Content */}
        <div className="modal-body" ref={printRef}>
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-1)' }}>
              {project?.name || project?.title || 'Project'} — Status Report
            </h2>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-3)', marginTop: 4 }}>
              Generated on {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} · Status: {project?.status || 'Active'}
            </div>
          </div>

          {/* Stats Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
            <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: 12 }}>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-1)' }}>{pct}%</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', textTransform: 'uppercase', fontWeight: 700, marginTop: 2 }}>Completion Rate</div>
            </div>
            <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: 12 }}>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#22C55E' }}>{completed}/{total}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', textTransform: 'uppercase', fontWeight: 700, marginTop: 2 }}>Completed Tasks</div>
            </div>
            <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: 12 }}>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#3B82F6' }}>{inProgress}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', textTransform: 'uppercase', fontWeight: 700, marginTop: 2 }}>In Progress</div>
            </div>
            <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: 12 }}>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--accent)' }}>{totalLogged}h</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', textTransform: 'uppercase', fontWeight: 700, marginTop: 2 }}>Logged Hours</div>
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-2)', marginBottom: 6 }}>
              <span>Overall Progress</span>
              <span><strong>{completed}</strong> of <strong>{total}</strong> tasks completed ({pct}%)</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${pct}%`, background: '#22C55E' }} />
            </div>
          </div>

          {/* Task Breakdown Table */}
          <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 10, color: 'var(--text-1)' }}>
            Task Breakdown ({tasks.length})
          </div>
          <table className="data-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>TASK TITLE</th>
                <th>STATUS</th>
                <th>PRIORITY</th>
                <th>ASSIGNEE</th>
                <th>DUE DATE</th>
                <th>LOGGED</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map(t => (
                <tr key={t._id}>
                  <td style={{ fontWeight: 500 }}>{t.title}</td>
                  <td>
                    <span className={`badge ${
                      (t.status || '').toLowerCase() === 'completed' ? 'badge-green' :
                      (t.status || '').toLowerCase() === 'in-progress' || (t.status || '').toLowerCase() === 'in progress' ? 'badge-blue' :
                      (t.status || '').toLowerCase() === 'blocked' ? 'badge-red' : 'badge-gray'
                    }`}>
                      {t.status || 'Todo'}
                    </span>
                  </td>
                  <td style={{ textTransform: 'capitalize' }}>{t.priority || 'medium'}</td>
                  <td>{t.assignedTo?.name || 'Unassigned'}</td>
                  <td>{t.dueDate ? new Date(t.dueDate).toLocaleDateString() : '—'}</td>
                  <td>{t.loggedHours || 0}h</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
