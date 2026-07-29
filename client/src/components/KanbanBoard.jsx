import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateTask } from '../redux/slices/tasksSlice';
import toast from 'react-hot-toast';

const COLUMNS = [
  { id: 'todo',        label: 'Todo',        color: '#6B7280', bg: '#6B728015' },
  { id: 'in-progress', label: 'In Progress', color: '#3B82F6', bg: '#3B82F615' },
  { id: 'completed',   label: 'Completed',   color: '#22C55E', bg: '#22C55E15' },
  { id: 'blocked',     label: 'Blocked',     color: '#E5484D', bg: '#E5484D15' },
];

const PRIORITY_COLORS = {
  low: '#22C55E', medium: '#F59E0B', high: '#E5484D', critical: '#7C3AED',
};

function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function formatDate(d) {
  if (!d) return null;
  const date = new Date(d);
  const now = new Date();
  const diffDays = Math.round((date - now) / 86400000);
  if (diffDays < 0) return { label: 'Overdue', color: '#E5484D' };
  if (diffDays === 0) return { label: 'Today', color: '#F59E0B' };
  if (diffDays === 1) return { label: 'Tomorrow', color: '#F59E0B' };
  return {
    label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    color: 'var(--text-3)',
  };
}

function TaskCard({ task, onDragStart, onClick }) {
  const dueDateInfo = formatDate(task.dueDate);
  const priorityColor = PRIORITY_COLORS[task.priority] || '#6B7280';

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: '12px 14px',
        cursor: 'grab',
        transition: 'box-shadow 0.15s, transform 0.15s',
        userSelect: 'none',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)';
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
      onDragEnd={e => {
        e.currentTarget.style.opacity = '1';
      }}
    >
      {/* Priority stripe */}
      <div style={{
        height: 3, borderRadius: 2,
        background: priorityColor,
        marginBottom: 10, opacity: 0.8,
      }} />

      {/* Title */}
      <div style={{
        fontWeight: 600, fontSize: '0.875rem',
        color: 'var(--text-1)', marginBottom: 8,
        lineHeight: 1.35,
      }}>
        {task.title}
      </div>

      {/* Project tag */}
      {task.projectId?.title && (
        <div style={{
          fontSize: '0.72rem', color: 'var(--text-3)',
          marginBottom: 10, overflow: 'hidden',
          textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          📁 {task.projectId.title}
        </div>
      )}

      {/* Tags */}
      {task.tags && task.tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
          {task.tags.map(t => (
            <span
              key={t.name}
              style={{
                fontSize: '0.65rem', fontWeight: 700,
                color: t.color || 'var(--accent)',
                background: (t.color || 'var(--accent)') + '20',
                padding: '1px 6px', borderRadius: 4,
              }}
            >
              {t.name}
            </span>
          ))}
        </div>
      )}

      {/* Footer: assignee + subtasks + due date */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
        {task.assignedTo ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 22, height: 22, borderRadius: '50%',
              background: 'var(--accent)', color: 'white',
              fontSize: '0.58rem', fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              {getInitials(task.assignedTo.name || '')}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-2)' }}>
              {task.assignedTo.name?.split(' ')[0]}
            </span>
          </div>
        ) : (
          <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>Unassigned</div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {task.subtasks && task.subtasks.length > 0 && (
            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-3)' }}>
              ☑ {task.subtasks.filter(s => s.completed).length}/{task.subtasks.length}
            </span>
          )}

          {dueDateInfo && (
            <span style={{
              fontSize: '0.72rem', fontWeight: 600,
              color: dueDateInfo.color,
              background: dueDateInfo.color + '18',
              padding: '2px 6px', borderRadius: 4,
            }}>
              {dueDateInfo.label}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function KanbanBoard({ onTaskClick }) {
  const dispatch = useDispatch();
  const { list: tasks } = useSelector(s => s.tasks);
  const [dragTaskId, setDragTaskId] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);

  const handleDragStart = (taskId) => {
    setDragTaskId(taskId);
  };

  const handleDragOver = (e, colId) => {
    e.preventDefault();
    setDragOverCol(colId);
  };

  const handleDrop = async (e, colId) => {
    e.preventDefault();
    setDragOverCol(null);
    if (!dragTaskId) return;

    const task = tasks.find(t => t._id === dragTaskId);
    if (!task || task.status === colId) { setDragTaskId(null); return; }

    try {
      await dispatch(updateTask({ id: dragTaskId, data: { status: colId } })).unwrap();
    } catch {
      toast.error('Failed to move task');
    }
    setDragTaskId(null);
  };

  const handleDragLeave = () => {
    setDragOverCol(null);
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 16,
      alignItems: 'start',
    }}>
      {COLUMNS.map(col => {
        const colTasks = tasks.filter(t => t.status === col.id);
        const isOver = dragOverCol === col.id;

        return (
          <div
            key={col.id}
            onDragOver={e => handleDragOver(e, col.id)}
            onDrop={e => handleDrop(e, col.id)}
            onDragLeave={handleDragLeave}
            style={{
              background: isOver ? col.bg : 'var(--bg)',
              border: `2px dashed ${isOver ? col.color : 'var(--border)'}`,
              borderRadius: 14,
              padding: '12px 10px',
              minHeight: 400,
              transition: 'background 0.15s, border-color 0.15s',
            }}
          >
            {/* Column header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: 14, padding: '0 4px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: col.color,
                }} />
                <span style={{
                  fontWeight: 700, fontSize: '0.85rem',
                  color: 'var(--text-1)',
                }}>
                  {col.label}
                </span>
              </div>
              <span style={{
                background: col.color + '20',
                color: col.color,
                fontWeight: 700, fontSize: '0.72rem',
                padding: '2px 8px', borderRadius: 10,
              }}>
                {colTasks.length}
              </span>
            </div>

            {/* Task cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {colTasks.length === 0 ? (
                <div style={{
                  textAlign: 'center', padding: '32px 16px',
                  color: 'var(--text-3)', fontSize: '0.8rem',
                  borderRadius: 8,
                }}>
                  {isOver ? '📥 Drop here' : 'No tasks'}
                </div>
              ) : (
                colTasks.map(task => (
                  <div
                    key={task._id}
                    style={{ opacity: dragTaskId === task._id ? 0.4 : 1, transition: 'opacity 0.15s' }}
                  >
                    <TaskCard
                      task={task}
                      onDragStart={() => handleDragStart(task._id)}
                      onClick={() => onTaskClick && onTaskClick(task._id)}
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
