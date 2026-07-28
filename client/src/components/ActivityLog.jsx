import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const AVATAR_COLORS = ['#6366F1', '#22C55E', '#F59E0B', '#E5484D', '#8B5CF6', '#14B8A6'];

function avatarColor(name = '') {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// Map action field → human-readable label and color
function actionMeta(entry) {
  const { action, field, from, to } = entry;

  if (field === 'status')   return { verb: action, detail: `${from} → ${to}`, color: '#3B82F6', emoji: '🔄' };
  if (field === 'priority') return { verb: action, detail: `${from} → ${to}`, color: '#F59E0B', emoji: '🚩' };
  if (field === 'dueDate')  return { verb: action, detail: to || '—',          color: '#6366F1', emoji: '📅' };
  if (field === 'title')    return { verb: action, detail: '',                  color: '#6B7280', emoji: '✏️' };
  if (field === 'description') return { verb: action, detail: '',              color: '#6B7280', emoji: '📝' };
  if (field === 'assignedTo')  return { verb: action, detail: '',              color: '#22C55E', emoji: '👤' };
  if (field === 'comments') return { verb: action, detail: '',                 color: '#8B5CF6', emoji: '💬' };
  if (field === 'attachments') return { verb: action, detail: to || from,      color: '#14B8A6', emoji: '📎' };
  return { verb: action, detail: '', color: '#6B7280', emoji: '📌' };
}

export default function ActivityLog({ entries = [], defaultExpanded = false }) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const sorted = [...entries].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return (
    <div>
      {/* Collapsible header */}
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, width: '100%',
          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          marginBottom: expanded ? 14 : 0,
        }}
      >
        <div style={{
          fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-3)',
          textTransform: 'uppercase', letterSpacing: '0.06em', flex: 1, textAlign: 'left',
        }}>
          Activity ({entries.length})
        </div>
        {expanded
          ? <ChevronUp  size={14} style={{ color: 'var(--text-3)' }} />
          : <ChevronDown size={14} style={{ color: 'var(--text-3)' }} />
        }
      </button>

      {expanded && (
        <div style={{
          maxHeight: 300, overflowY: 'auto',
          display: 'flex', flexDirection: 'column', gap: 0,
        }}>
          {sorted.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: '0.82rem', padding: '12px 0' }}>
              No activity yet
            </div>
          ) : (
            sorted.map((entry, i) => {
              const name = entry.actor?.name || 'Someone';
              const meta = actionMeta(entry);
              const isLast = i === sorted.length - 1;

              return (
                <div key={entry._id || i} style={{ display: 'flex', gap: 10, paddingBottom: isLast ? 0 : 14, position: 'relative' }}>
                  {/* Timeline line */}
                  {!isLast && (
                    <div style={{
                      position: 'absolute', left: 13, top: 26,
                      width: 2, bottom: 0,
                      background: 'var(--border)',
                    }} />
                  )}

                  {/* Avatar */}
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: avatarColor(name),
                    color: 'white', fontSize: '0.6rem', fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, zIndex: 1,
                    border: '2px solid var(--surface)',
                  }}>
                    {getInitials(name)}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, paddingTop: 2 }}>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-1)', lineHeight: 1.4 }}>
                      <span style={{ fontWeight: 600 }}>{name}</span>
                      {' '}
                      <span style={{ color: 'var(--text-2)' }}>{meta.verb}</span>
                      {' '}
                      <span style={{ fontSize: '0.9em' }}>{meta.emoji}</span>
                      {meta.detail && (
                        <span style={{
                          display: 'inline-block', marginLeft: 6,
                          background: meta.color + '18', color: meta.color,
                          borderRadius: 4, padding: '1px 6px', fontSize: '0.75rem', fontWeight: 500,
                        }}>
                          {meta.detail}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: 2 }}>
                      {timeAgo(entry.createdAt)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
