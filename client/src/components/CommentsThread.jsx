import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addComment, deleteComment } from '../redux/slices/tasksSlice';
import { Send, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

const AVATAR_COLORS = ['#6366F1', '#22C55E', '#F59E0B', '#E5484D', '#8B5CF6', '#14B8A6'];
function avatarColor(name = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function CommentsThread({ taskId, comments = [], currentUser }) {
  const dispatch = useDispatch();
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const bottomRef = useRef(null);

  // Auto-scroll to bottom when new comment arrives
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments.length]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    setSubmitting(true);
    try {
      await dispatch(addComment({ taskId, body: body.trim() })).unwrap();
      setBody('');
    } catch (err) {
      toast.error(err || 'Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId) => {
    try {
      await dispatch(deleteComment({ taskId, commentId })).unwrap();
    } catch (err) {
      toast.error(err || 'Failed to delete comment');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Header */}
      <div style={{
        fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-3)',
        textTransform: 'uppercase', letterSpacing: '0.06em',
        marginBottom: 14,
      }}>
        Comments ({comments.length})
      </div>

      {/* Comments list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 20, maxHeight: 320, overflowY: 'auto' }}>
        {comments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-3)', fontSize: '0.85rem' }}>
            No comments yet. Be the first to comment!
          </div>
        ) : (
          comments.map((c) => {
            const name = c.author?.name || 'Unknown';
            const isOwn = c.author?._id === currentUser?._id || c.author === currentUser?._id;
            return (
              <div key={c._id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                {/* Avatar */}
                <div style={{
                  width: 30, height: 30, borderRadius: '50%',
                  background: avatarColor(name),
                  color: 'white', fontSize: '0.65rem', fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {getInitials(name)}
                </div>

                {/* Bubble */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-1)' }}>{name}</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>{timeAgo(c.createdAt)}</span>
                    {isOwn && (
                      <button
                        onClick={() => handleDelete(c._id)}
                        style={{
                          marginLeft: 'auto', background: 'none', border: 'none',
                          color: 'var(--text-3)', cursor: 'pointer', padding: 2,
                          display: 'flex', alignItems: 'center', borderRadius: 4,
                          transition: 'color 0.15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = '#E5484D'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}
                        title="Delete comment"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                  <div style={{
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    borderRadius: '0 10px 10px 10px',
                    padding: '8px 12px',
                    fontSize: '0.85rem',
                    color: 'var(--text-1)',
                    lineHeight: 1.5,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}>
                    {c.body}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e); }
          }}
          placeholder="Write a comment… (Enter to send, Shift+Enter for new line)"
          rows={2}
          style={{
            flex: 1,
            padding: '8px 12px',
            borderRadius: 10,
            border: '1px solid var(--border)',
            background: 'var(--bg)',
            color: 'var(--text-1)',
            fontSize: '0.85rem',
            resize: 'none',
            outline: 'none',
            fontFamily: 'inherit',
            lineHeight: 1.5,
            transition: 'border-color 0.15s',
          }}
          onFocus={e => e.target.style.borderColor = 'var(--accent)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        />
        <button
          type="submit"
          disabled={submitting || !body.trim()}
          style={{
            width: 38, height: 38,
            borderRadius: 10,
            border: 'none',
            background: submitting || !body.trim() ? 'var(--border)' : 'var(--accent)',
            color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: submitting || !body.trim() ? 'not-allowed' : 'pointer',
            flexShrink: 0,
            transition: 'background 0.15s, transform 0.1s',
          }}
          onMouseEnter={e => { if (!submitting && body.trim()) e.currentTarget.style.transform = 'scale(1.05)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
        >
          <Send size={15} />
        </button>
      </form>
    </div>
  );
}
